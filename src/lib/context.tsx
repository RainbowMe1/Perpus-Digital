'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import {
  UserRole, User, Book, Member, BorrowingTransaction, Notification,
  Reservation, Review, Fine, Procurement, LibrarySettings, MemberDirectoryEntry,
} from './types';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import type { Database } from './database.types';

const DEFAULT_BOOK_COVER = '/book-cover-placeholder.svg';

function getAvatarUrl(path?: string | null) {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  const publicUrl = getSupabaseClient().storage.from('avatars').getPublicUrl(path).data.publicUrl;
  return `${publicUrl}?v=${Date.now()}`;
}

// ============================================================================
// AUTH CONTEXT
// ============================================================================
export type AuthStatus = 'loading' | 'unconfigured' | 'signed_out' | 'pending' | 'rejected' | 'approved' | 'error';

interface RoleContextType {
  currentUser: User | null;
  currentRole: UserRole | null;
  authStatus: AuthStatus;
  authError: string | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthStatus('unconfigured');
      return;
    }

    const supabase = getSupabaseClient();
    let activeRequest = 0;
    let mounted = true;

    const loadProfile = async (authUser: { id: string; email?: string }) => {
      const request = ++activeRequest;
      setAuthStatus('loading');
      setAuthError(null);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, approval_status, avatar_url')
        .eq('id', authUser.id)
        .maybeSingle();

      if (!mounted || request !== activeRequest) return;
      if (error) {
        setCurrentUser(null);
        setAuthStatus('error');
        setAuthError(error.message);
        return;
      }
      if (!data) {
        setCurrentUser(null);
        setAuthStatus('error');
        setAuthError('Profil akun tidak ditemukan. Jalankan SQL Supabase yang disediakan lalu coba lagi.');
        return;
      }

      setCurrentUser({
        id: data.id,
        name: data.full_name,
        email: data.email || authUser.email || '',
        role: data.role,
        avatar: getAvatarUrl(data.avatar_url),
      });
      setAuthStatus(data.approval_status === 'approved' ? 'approved' : data.approval_status);
    };

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setAuthStatus('error');
        setAuthError(error.message);
        return;
      }
      if (data.session) {
        void loadProfile(data.session.user);
      } else {
        setCurrentUser(null);
        setAuthStatus('signed_out');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        activeRequest += 1;
        setCurrentUser(null);
        setAuthError(null);
        setAuthStatus('signed_out');
        return;
      }
      setTimeout(() => void loadProfile(session.user), 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    const { data, error } = await getSupabaseClient().auth.getUser();
    if (error) throw error;
    if (!data.user) {
      setCurrentUser(null);
      setAuthStatus('signed_out');
      return;
    }

    const { data: profile, error: profileError } = await getSupabaseClient()
      .from('profiles')
      .select('id, full_name, email, role, approval_status, avatar_url')
      .eq('id', data.user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) throw new Error('Profil akun tidak ditemukan.');
    setCurrentUser({
      id: profile.id,
      name: profile.full_name,
      email: profile.email,
      role: profile.role,
      avatar: getAvatarUrl(profile.avatar_url),
    });
    setAuthStatus(profile.approval_status === 'approved' ? 'approved' : profile.approval_status);
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) throw error;
  }, []);

  return (
    <RoleContext.Provider value={{
      currentUser,
      currentRole: currentUser?.role ?? null,
      authStatus,
      authError,
      signOut,
      refreshProfile,
    }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) throw new Error('useRole must be used within RoleProvider');
  return context;
}

// ============================================================================
// TOAST CONTEXT
// ============================================================================
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  toast: (type: ToastType, title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icons = {
    success: 'âœ“',
    error: 'âœ•',
    warning: 'âš ',
    info: 'â„¹',
  };
  const colors = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    error: 'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
  };

  return (
    <div className={`pointer-events-auto border rounded-lg shadow-lg p-4 flex items-start gap-3 animate-slide-in ${colors[toast.type]}`}>
      <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center font-bold text-sm flex-shrink-0">
        {icons[toast.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{toast.title}</p>
        {toast.message && <p className="text-xs opacity-80 mt-0.5">{toast.message}</p>}
      </div>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 flex-shrink-0">
        âœ•
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}

// ============================================================================
// APP STATE CONTEXT (Supabase CRUD)
// ============================================================================
interface AppStateContextType {
  books: Book[];
  members: Member[];
  memberDirectory: MemberDirectoryEntry[];
  memberDirectoryError: string | null;
  transactions: BorrowingTransaction[];
  notifications: Notification[];
  reservations: Reservation[];
  reviews: Review[];
  fines: Fine[];
  procurements: Procurement[];
  wishlistBookIds: string[];
  librarySettings: LibrarySettings | null;
  readingProgress: Record<string, number>;
  totalMemberCount: number | null;
  totalMemberCountError: string | null;
  dataLoading: boolean;
  dataError: string | null;
  refreshData: () => Promise<void>;
  addBook: (book: Omit<Book, 'id'>) => Promise<void>;
  updateBook: (id: string, book: Partial<Book>) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  addMember: (member: Pick<Member, 'fullName' | 'category' | 'classOrDepartment' | 'email' | 'phone'>) => Promise<void>;
  updateMember: (id: string, member: Partial<Member>) => Promise<void>;
  addTransaction: (transaction: Pick<BorrowingTransaction, 'memberId' | 'books' | 'borrowingDate' | 'dueDate'>) => Promise<void>;
  updateTransaction: (id: string, transaction: Partial<BorrowingTransaction>) => Promise<void>;
  returnTransaction: (id: string, returnDate: string, fine?: number) => Promise<void>;
  addReservation: (bookId: string) => Promise<void>;
  cancelReservation: (id: string) => Promise<void>;
  setReservationStatus: (id: string, status: 'ready' | 'fulfilled' | 'cancelled') => Promise<void>;
  addReview: (bookId: string, rating: number, comment: string) => Promise<void>;
  addToWishlist: (bookId: string) => Promise<void>;
  removeFromWishlist: (bookId: string) => Promise<void>;
  setFineStatus: (id: string, status: 'paid' | 'waived') => Promise<void>;
  addProcurement: (procurement: Omit<Procurement, 'id' | 'status' | 'bookId' | 'stockReceived'> & { status?: Procurement['status'] }) => Promise<void>;
  updateProcurement: (id: string, updates: Partial<Omit<Procurement, 'status' | 'bookId' | 'stockReceived'>>) => Promise<void>;
  receiveProcurement: (id: string, bookId?: string) => Promise<void>;
  updateLibrarySettings: (settings: LibrarySettings) => Promise<void>;
  updateMyProfile: (fullName: string, phone: string, classOrDepartment: string) => Promise<void>;
  updateMyProfileAvatar: (file: File) => Promise<void>;
  saveReadingProgress: (bookId: string, currentPage: number) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const AppStateContext = createContext<AppStateContextType | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { authStatus, currentUser, refreshProfile } = useRole();
  const [books, setBooks] = useState<Book[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberDirectory, setMemberDirectory] = useState<MemberDirectoryEntry[]>([]);
  const [memberDirectoryError, setMemberDirectoryError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<BorrowingTransaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [procurements, setProcurements] = useState<Procurement[]>([]);
  const [wishlistBookIds, setWishlistBookIds] = useState<string[]>([]);
  const [librarySettings, setLibrarySettings] = useState<LibrarySettings | null>(null);
  const [readingProgress, setReadingProgress] = useState<Record<string, number>>({});
  const [totalMemberCount, setTotalMemberCount] = useState<number | null>(null);
  const [totalMemberCountError, setTotalMemberCountError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    if (authStatus !== 'approved') return;
    setDataLoading(true);
    setDataError(null);

    try {
      const supabase = getSupabaseClient();
      const { error: dueNotificationError } = await supabase.rpc('refresh_my_due_notifications');
      if (dueNotificationError) throw dueNotificationError;
      const [
        booksResult,
        membersResult,
        transactionsResult,
        transactionBooksResult,
        reservationsResult,
        reviewsResult,
        wishlistResult,
        notificationsResult,
        finesResult,
        procurementsResult,
        settingsResult,
        readingProgressResult,
        totalMemberCountResult,
        memberDirectoryResult,
      ] = await Promise.all([
        supabase.from('books').select('*').order('title'),
        supabase.from('members').select('*').order('full_name'),
        supabase.from('transactions').select('*').order('created_at', { ascending: false }),
        supabase.from('transaction_books').select('*'),
        supabase.from('reservations').select('*').order('created_at', { ascending: false }),
        supabase.from('reviews').select('*').order('created_at', { ascending: false }),
        supabase.from('wishlists').select('book_id, member_id'),
        supabase.from('notifications').select('*').eq('user_id', currentUser!.id).order('created_at', { ascending: false }),
        supabase.from('fines').select('*').order('issued_date', { ascending: false }),
        supabase.from('procurements').select('*').order('created_at', { ascending: false }),
        supabase.from('library_settings').select('*').eq('singleton', true).maybeSingle(),
        supabase.from('reading_progress').select('book_id, current_page'),
        supabase.rpc('get_total_member_count'),
        supabase.rpc('get_member_directory'),
      ]);
      if (totalMemberCountResult.error) {
        setTotalMemberCount(null);
        setTotalMemberCountError(totalMemberCountResult.error.message);
      } else {
        setTotalMemberCount(Number(totalMemberCountResult.data));
        setTotalMemberCountError(null);
      }
      if (memberDirectoryResult.error) {
        setMemberDirectory([]);
        setMemberDirectoryError(memberDirectoryResult.error.message);
      } else {
        setMemberDirectory(memberDirectoryResult.data.map(member => ({
          id: member.id,
          fullName: member.full_name,
          memberNumber: member.member_number,
          category: member.category,
        })));
        setMemberDirectoryError(null);
      }
      const error = booksResult.error || membersResult.error || transactionsResult.error ||
        transactionBooksResult.error || reservationsResult.error || reviewsResult.error ||
        wishlistResult.error || notificationsResult.error || finesResult.error ||
        procurementsResult.error || settingsResult.error || readingProgressResult.error;
      if (error) throw error;

      const mappedBooks: Book[] = booksResult.data.map(book => ({
        id: book.id,
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        bookCode: book.book_code,
        publisher: book.publisher,
        publicationYear: book.publication_year,
        category: book.category,
        description: book.description,
        coverImage: book.cover_image?.trim() || DEFAULT_BOOK_COVER,
        totalStock: book.total_stock,
        availableStock: book.available_stock,
        shelfLocation: book.shelf_location,
        isDigital: book.is_digital,
        digitalFileUrl: book.digital_file_url ?? undefined,
        pageCount: book.page_count ?? undefined,
        rating: Number(book.rating),
        reviewCount: book.review_count,
      }));
      const mappedMembers: Member[] = membersResult.data.map(member => ({
        id: member.id,
        userId: member.user_id ?? undefined,
        fullName: member.full_name,
        memberNumber: member.member_number,
        category: member.category,
        classOrDepartment: member.class_or_department,
        email: member.email,
        phone: member.phone,
        registrationDate: member.registration_date,
        status: member.status,
        avatar: getAvatarUrl(member.avatar),
        activeLoans: member.active_loans,
        totalBorrowed: member.total_borrowed,
      }));
      const booksByTransaction = new Map<string, BorrowingTransaction['books']>();
      for (const book of transactionBooksResult.data) {
        const transactionBooks = booksByTransaction.get(book.transaction_id) ?? [];
        transactionBooks.push({
          bookId: book.book_id,
          title: book.title,
          bookCode: book.book_code,
          coverImage: book.cover_image?.trim() || DEFAULT_BOOK_COVER,
        });
        booksByTransaction.set(book.transaction_id, transactionBooks);
      }
      const mappedTransactions: BorrowingTransaction[] = transactionsResult.data.map(transaction => ({
        id: transaction.id,
        transactionId: transaction.transaction_id,
        memberId: transaction.member_id,
        memberName: transaction.member_name,
        memberNumber: transaction.member_number,
        books: booksByTransaction.get(transaction.id) ?? [],
        borrowingDate: transaction.borrowing_date,
        dueDate: transaction.due_date,
        returnDate: transaction.return_date ?? undefined,
        status: transaction.status,
        extendedDays: transaction.extended_days ?? undefined,
        fine: transaction.fine ?? undefined,
      }));
      const booksById = new Map(mappedBooks.map(book => [book.id, book]));
      const membersById = new Map(mappedMembers.map(member => [member.id, member]));
      const transactionsById = new Map(transactionsResult.data.map(transaction => [transaction.id, transaction]));
      const mappedReservations: Reservation[] = reservationsResult.data.map(reservation => ({
        id: reservation.id,
        memberId: reservation.member_id,
        memberName: membersById.get(reservation.member_id)?.fullName ?? 'Anggota',
        bookId: reservation.book_id,
        bookTitle: booksById.get(reservation.book_id)?.title ?? 'Buku',
        reservationDate: reservation.reservation_date,
        status: reservation.status,
        queuePosition: reservation.queue_position ?? undefined,
      }));
      const mappedReviews: Review[] = reviewsResult.data.map(review => ({
        id: review.id,
        bookId: review.book_id,
        memberId: review.member_id,
        memberName: review.member_name,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.created_at,
      }));
      const mappedNotifications: Notification[] = notificationsResult.data.map(notification => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        timestamp: notification.created_at,
        read: notification.read_at !== null,
        link: notification.link ?? undefined,
      }));
      const mappedFines: Fine[] = finesResult.data.map(fine => {
        const transaction = transactionsById.get(fine.transaction_id);
        const borrowedBooks = booksByTransaction.get(fine.transaction_id) ?? [];
        const overdueDays = transaction
          ? Math.max(0, Math.floor(
            (new Date(fine.issued_date).getTime() - new Date(transaction.due_date).getTime()) / 86400000
          ))
          : 0;
        return {
          id: fine.id,
          memberId: fine.member_id,
          memberName: membersById.get(fine.member_id)?.fullName ?? transaction?.member_name ?? 'Anggota',
          transactionId: transaction?.transaction_id ?? fine.transaction_id,
          bookTitle: borrowedBooks.map(book => book.title).join(', ') || 'Buku',
          overdueDays,
          fineAmount: Number(fine.fine_amount),
          status: fine.status,
          issuedDate: fine.issued_date,
          paidDate: fine.paid_date ?? undefined,
        };
      });
      const mappedProcurements: Procurement[] = procurementsResult.data.map(procurement => ({
        id: procurement.id,
        bookId: procurement.book_id ?? undefined,
        stockReceived: procurement.stock_received,
        bookTitle: procurement.book_title,
        author: procurement.author,
        source: procurement.source,
        quantity: procurement.quantity,
        acquisitionDate: procurement.acquisition_date,
        status: procurement.status,
        cost: procurement.cost === null ? undefined : Number(procurement.cost),
      }));
      const settings = settingsResult.data ? {
        libraryName: settingsResult.data.library_name,
        libraryAddress: settingsResult.data.library_address,
        libraryPhone: settingsResult.data.library_phone,
        libraryEmail: settingsResult.data.library_email,
        maxBorrowDays: settingsResult.data.max_borrow_days,
        maxBooksPerMember: settingsResult.data.max_books_per_member,
        finePerDay: Number(settingsResult.data.fine_per_day),
        maxFine: Number(settingsResult.data.max_fine),
        automaticFines: settingsResult.data.automatic_fines,
        allowExtensions: settingsResult.data.allow_extensions,
        maxExtensions: settingsResult.data.max_extensions,
        notificationPreferences: settingsResult.data.notification_preferences as Record<string, boolean>,
      } : null;
      const progress = Object.fromEntries(
        readingProgressResult.data.map(item => [item.book_id, item.current_page])
      );

      setBooks(mappedBooks);
      setMembers(mappedMembers);
      setTransactions(mappedTransactions);
      setReservations(mappedReservations);
      setReviews(mappedReviews);
      const currentMemberId = membersResult.data.find(member => member.user_id === currentUser?.id)?.id;
      setWishlistBookIds(wishlistResult.data
        .filter(item => item.member_id === currentMemberId)
        .map(item => item.book_id));
      setNotifications(mappedNotifications);
      setFines(mappedFines);
      setProcurements(mappedProcurements);
      setLibrarySettings(settings);
      setReadingProgress(progress);
    } catch (error) {
      setNotifications([]);
      setDataError(error instanceof Error ? error.message : 'Gagal memuat data dari Supabase.');
    } finally {
      setDataLoading(false);
    }
  }, [authStatus, currentUser]);

  useEffect(() => {
    if (authStatus === 'approved') {
      void refreshData();
    } else {
      setBooks([]);
      setMembers([]);
      setTransactions([]);
      setReservations([]);
      setReviews([]);
      setFines([]);
      setProcurements([]);
      setWishlistBookIds([]);
      setLibrarySettings(null);
      setReadingProgress({});
      setMemberDirectory([]);
      setMemberDirectoryError(null);
      setTotalMemberCount(null);
      setTotalMemberCountError(null);
      setNotifications([]);
      setDataLoading(false);
      setDataError(null);
    }
  }, [authStatus, refreshData]);

  const addBook = async (book: Omit<Book, 'id'>) => {
    const { data, error } = await getSupabaseClient().from('books').insert({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      book_code: book.bookCode,
      publisher: book.publisher,
      publication_year: book.publicationYear,
      category: book.category,
      description: book.description,
      cover_image: book.coverImage.trim() || DEFAULT_BOOK_COVER,
      total_stock: book.totalStock,
      available_stock: book.availableStock,
      shelf_location: book.shelfLocation,
      is_digital: book.isDigital,
      digital_file_url: book.digitalFileUrl ?? null,
      page_count: book.pageCount ?? null,
      rating: book.rating,
      review_count: book.reviewCount,
    }).select('id').single();
    if (error) throw error;
    setBooks(previous => [{ ...book, coverImage: book.coverImage.trim() || DEFAULT_BOOK_COVER, id: data.id }, ...previous]);
  };

  const updateBook = async (id: string, updates: Partial<Book>) => {
    const row: Database['public']['Tables']['books']['Update'] = {};
    if (updates.title !== undefined) row.title = updates.title;
    if (updates.author !== undefined) row.author = updates.author;
    if (updates.isbn !== undefined) row.isbn = updates.isbn;
    if (updates.bookCode !== undefined) row.book_code = updates.bookCode;
    if (updates.publisher !== undefined) row.publisher = updates.publisher;
    if (updates.publicationYear !== undefined) row.publication_year = updates.publicationYear;
    if (updates.category !== undefined) row.category = updates.category;
    if (updates.description !== undefined) row.description = updates.description;
    if (updates.coverImage !== undefined) row.cover_image = updates.coverImage.trim() || DEFAULT_BOOK_COVER;
    if (updates.totalStock !== undefined) row.total_stock = updates.totalStock;
    if (updates.availableStock !== undefined) row.available_stock = updates.availableStock;
    if (updates.shelfLocation !== undefined) row.shelf_location = updates.shelfLocation;
    if (updates.isDigital !== undefined) row.is_digital = updates.isDigital;
    if (updates.digitalFileUrl !== undefined) row.digital_file_url = updates.digitalFileUrl;
    else if (updates.isDigital === false) row.digital_file_url = null;
    if (updates.pageCount !== undefined) row.page_count = updates.pageCount;
    if (updates.rating !== undefined) row.rating = updates.rating;
    if (updates.reviewCount !== undefined) row.review_count = updates.reviewCount;
    const { error } = await getSupabaseClient().from('books').update(row).eq('id', id);
    if (error) throw error;
    setBooks(previous => previous.map(book => book.id === id
      ? { ...book, ...updates, coverImage: updates.coverImage?.trim() || book.coverImage || DEFAULT_BOOK_COVER }
      : book
    ));
  };

  const deleteBook = async (id: string) => {
    const { error } = await getSupabaseClient().from('books').delete().eq('id', id);
    if (error) throw error;
    setBooks(previous => previous.filter(book => book.id !== id));
  };

  const addMember = async (member: Pick<Member, 'fullName' | 'category' | 'classOrDepartment' | 'email' | 'phone'>) => {
    const { data, error } = await getSupabaseClient().from('members').insert({
      full_name: member.fullName,
      category: member.category,
      class_or_department: member.classOrDepartment,
      email: member.email,
      phone: member.phone,
    }).select('*').single();
    if (error) throw error;
    setMembers(previous => [{
      id: data.id,
      userId: data.user_id ?? undefined,
      fullName: data.full_name,
      memberNumber: data.member_number,
      category: data.category,
      classOrDepartment: data.class_or_department,
      email: data.email,
      phone: data.phone,
      registrationDate: data.registration_date,
      status: data.status,
      avatar: data.avatar ?? undefined,
      activeLoans: data.active_loans,
      totalBorrowed: data.total_borrowed,
    }, ...previous]);
  };

  const updateMember = async (id: string, updates: Partial<Member>) => {
    const member = members.find(item => item.id === id);
    if (!member) throw new Error('Anggota tidak ditemukan.');
    const updated = { ...member, ...updates };
    const { error } = await getSupabaseClient().rpc('update_member_details', {
      p_member_id: id,
      p_full_name: updated.fullName,
      p_email: updated.email,
      p_phone: updated.phone,
      p_class_or_department: updated.classOrDepartment,
      p_category: updated.category,
      p_status: updated.status,
    });
    if (error) throw error;
    await refreshData();
  };

  const addTransaction = async (transaction: Pick<BorrowingTransaction, 'memberId' | 'books' | 'borrowingDate' | 'dueDate'>) => {
    const { error } = await getSupabaseClient().rpc('create_borrowing', {
      p_member_id: transaction.memberId,
      p_book_ids: transaction.books.map(book => book.bookId),
      p_borrowing_date: transaction.borrowingDate,
      p_due_date: transaction.dueDate,
    });
    if (error) throw error;
    await refreshData();
  };

  const updateTransaction = async (id: string, updates: Partial<BorrowingTransaction>) => {
    if (updates.status !== 'extended') {
      throw new Error('Gunakan operasi transaksi yang sesuai untuk mengubah status peminjaman.');
    }
    const { error } = await getSupabaseClient().rpc('extend_borrowing', {
      p_transaction_id: id,
    });
    if (error) throw error;
    await refreshData();
  };

  const returnTransaction = async (id: string, returnDate: string, fine?: number) => {
    const { error } = await getSupabaseClient().rpc('return_borrowing', {
      p_transaction_id: id,
      p_return_date: returnDate,
      p_fine: fine ?? null,
    });
    if (error) throw error;
    await refreshData();
  };

  const addReservation = async (bookId: string) => {
    const { error } = await getSupabaseClient().rpc('create_reservation', { p_book_id: bookId });
    if (error) throw error;
    await refreshData();
  };

  const cancelReservation = async (id: string) => {
    const { error } = await getSupabaseClient().rpc('cancel_reservation', { p_reservation_id: id });
    if (error) throw error;
    await refreshData();
  };

  const setReservationStatus = async (id: string, status: 'ready' | 'fulfilled' | 'cancelled') => {
    const { error } = await getSupabaseClient().rpc('set_reservation_status', {
      p_reservation_id: id,
      p_status: status,
    });
    if (error) throw error;
    await refreshData();
  };

  const getCurrentMemberId = async () => {
    if (!currentUser) throw new Error('Sesi pengguna tidak ditemukan.');
    const { data, error } = await getSupabaseClient()
      .from('members')
      .select('id')
      .eq('user_id', currentUser.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Profil anggota tidak ditemukan.');
    return data.id;
  };

  const addReview = async (bookId: string, rating: number, comment: string) => {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('Rating harus antara 1 sampai 5.');
    if (!comment.trim()) throw new Error('Ulasan tidak boleh kosong.');
    const memberId = await getCurrentMemberId();
    const { error } = await getSupabaseClient().from('reviews').insert({
      book_id: bookId,
      member_id: memberId,
      rating,
      comment: comment.trim(),
    });
    if (error) throw error;
    await refreshData();
  };

  const addToWishlist = async (bookId: string) => {
    const memberId = await getCurrentMemberId();
    const { error } = await getSupabaseClient().from('wishlists').insert({
      member_id: memberId,
      book_id: bookId,
    });
    if (error) throw error;
    setWishlistBookIds(previous => previous.includes(bookId) ? previous : [...previous, bookId]);
  };

  const removeFromWishlist = async (bookId: string) => {
    const memberId = await getCurrentMemberId();
    const { error } = await getSupabaseClient()
      .from('wishlists')
      .delete()
      .eq('member_id', memberId)
      .eq('book_id', bookId);
    if (error) throw error;
    setWishlistBookIds(previous => previous.filter(id => id !== bookId));
  };

  const setFineStatus = async (id: string, status: 'paid' | 'waived') => {
    const { error } = await getSupabaseClient().rpc('set_fine_status', {
      p_fine_id: id,
      p_status: status,
    });
    if (error) throw error;
    await refreshData();
  };

  const addProcurement = async (procurement: Omit<Procurement, 'id' | 'status' | 'bookId' | 'stockReceived'> & { status?: Procurement['status'] }) => {
    const { data, error } = await getSupabaseClient().from('procurements').insert({
      book_title: procurement.bookTitle,
      author: procurement.author,
      source: procurement.source,
      quantity: procurement.quantity,
      acquisition_date: procurement.acquisitionDate,
      cost: procurement.cost ?? null,
      created_by: currentUser?.id ?? null,
    }).select('id').single();
    if (error) throw error;
    setProcurements(previous => [{
      ...procurement,
      id: data.id,
      status: procurement.status ?? 'pending',
      stockReceived: false,
    }, ...previous]);
  };

  const updateProcurement = async (id: string, updates: Partial<Omit<Procurement, 'status' | 'bookId' | 'stockReceived'>>) => {
    const existing = procurements.find(item => item.id === id);
    if (!existing) throw new Error('Catatan pengadaan tidak ditemukan.');
    if (existing.stockReceived || existing.status !== 'pending') {
      throw new Error('Pengadaan yang sudah diterima tidak dapat diedit.');
    }
    const row: Database['public']['Tables']['procurements']['Update'] = {};
    if (updates.bookTitle !== undefined) row.book_title = updates.bookTitle;
    if (updates.author !== undefined) row.author = updates.author;
    if (updates.source !== undefined) row.source = updates.source;
    if (updates.quantity !== undefined) row.quantity = updates.quantity;
    if (updates.acquisitionDate !== undefined) row.acquisition_date = updates.acquisitionDate;
    if (Object.prototype.hasOwnProperty.call(updates, 'cost')) row.cost = updates.cost ?? null;
    const { error } = await getSupabaseClient().from('procurements').update(row).eq('id', id);
    if (error) throw error;
    setProcurements(previous => previous.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const receiveProcurement = async (id: string, bookId?: string) => {
    const { error } = await getSupabaseClient().rpc('receive_procurement', {
      p_procurement_id: id,
      p_book_id: bookId ?? null,
    });
    if (error) throw error;
    await refreshData();
  };

  const updateLibrarySettings = async (settings: LibrarySettings) => {
    const { error } = await getSupabaseClient()
      .from('library_settings')
      .update({
        library_name: settings.libraryName,
        library_address: settings.libraryAddress,
        library_phone: settings.libraryPhone,
        library_email: settings.libraryEmail,
        max_borrow_days: settings.maxBorrowDays,
        max_books_per_member: settings.maxBooksPerMember,
        fine_per_day: settings.finePerDay,
        max_fine: settings.maxFine ?? 50000,
        automatic_fines: settings.automaticFines ?? true,
        allow_extensions: settings.allowExtensions,
        max_extensions: settings.maxExtensions,
        notification_preferences: settings.notificationPreferences ?? {},
        updated_by: currentUser?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('singleton', true);
    if (error) throw error;
    setLibrarySettings(settings);
  };

  const updateMyProfile = async (fullName: string, phone: string, classOrDepartment: string) => {
    const { error } = await getSupabaseClient().rpc('update_my_profile', {
      p_full_name: fullName,
      p_phone: phone,
      p_class_or_department: classOrDepartment,
    });
    if (error) throw error;
    await refreshProfile();
  };

  const updateMyProfileAvatar = async (file: File) => {
    if (!currentUser) throw new Error('Akun tidak ditemukan.');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      throw new Error('Gunakan gambar JPG, PNG, atau WebP.');
    }
    if (file.size > 3 * 1024 * 1024) throw new Error('Ukuran gambar maksimal 3 MB.');

    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const fileId = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const path = `${currentUser.id}/${fileId}.${extension}`;
    const supabase = getSupabaseClient();
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
      cacheControl: '0',
      contentType: file.type,
      upsert: true,
    });
    if (uploadError) throw uploadError;

    const { error } = await supabase.rpc('update_my_profile_avatar', { p_avatar_path: path });
    if (error) {
      const { error: cleanupError } = await supabase.storage.from('avatars').remove([path]);
      if (cleanupError) {
        throw new Error(`${error.message}. Foto yang gagal disimpan juga tidak berhasil dibersihkan: ${cleanupError.message}`);
      }
      throw error;
    }
    await Promise.all([refreshProfile(), refreshData()]);
  };

  const saveReadingProgress = useCallback(async (bookId: string, currentPage: number) => {
    const { error } = await getSupabaseClient().rpc('save_my_reading_progress', {
      p_book_id: bookId,
      p_current_page: currentPage,
    });
    if (error) throw error;
    setReadingProgress(previous => ({ ...previous, [bookId]: currentPage }));
  }, []);

  const markNotificationRead = async (id: string) => {
    const { error } = await getSupabaseClient().rpc('mark_my_notification_read', {
      p_notification_id: id,
    });
    if (error) throw error;
    setNotifications(previous => previous.map(notification =>
      notification.id === id ? { ...notification, read: true } : notification
    ));
  };

  const markAllNotificationsRead = async () => {
    const { error } = await getSupabaseClient().rpc('mark_all_my_notifications_read');
    if (error) throw error;
    setNotifications(previous => previous.map(notification => ({ ...notification, read: true })));
  };

  return (
    <AppStateContext.Provider value={{
      books, members, memberDirectory, memberDirectoryError, transactions, notifications, reservations, reviews, fines, procurements,
      wishlistBookIds, librarySettings, readingProgress, totalMemberCount, totalMemberCountError,
      dataLoading, dataError, refreshData,
      addBook, updateBook, deleteBook,
      addMember, updateMember,
      addTransaction, updateTransaction, returnTransaction,
      addReservation, cancelReservation, setReservationStatus, addReview,
      addToWishlist, removeFromWishlist, setFineStatus,
      addProcurement, updateProcurement, receiveProcurement, updateLibrarySettings, updateMyProfile, updateMyProfileAvatar, saveReadingProgress,
      markNotificationRead, markAllNotificationsRead,
    }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used within AppStateProvider');
  return context;
}