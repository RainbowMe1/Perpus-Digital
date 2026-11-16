export type UserRole = 'admin' | 'librarian' | 'student' | 'teacher' | 'staff';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  memberNumber?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  bookCode: string;
  publisher: string;
  publicationYear: number;
  category: string;
  description: string;
  coverImage: string;
  totalStock: number;
  availableStock: number;
  shelfLocation: string;
  isDigital: boolean;
  digitalFileUrl?: string;
  pageCount?: number;
  rating: number;
  reviewCount: number;
}

export interface Member {
  id: string;
  userId?: string;
  fullName: string;
  memberNumber: string;
  category: 'student' | 'teacher' | 'staff';
  classOrDepartment: string;
  email: string;
  phone: string;
  registrationDate: string;
  status: 'active' | 'inactive' | 'suspended';
  avatar?: string;
  activeLoans: number;
  totalBorrowed: number;
}

export interface MemberDirectoryEntry {
  id: string;
  fullName: string;
  memberNumber: string;
  category: 'student' | 'teacher' | 'staff';
}

export interface BorrowingTransaction {
  id: string;
  transactionId: string;
  memberId: string;
  memberName: string;
  memberNumber: string;
  books: BorrowedBook[];
  borrowingDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'active' | 'returned' | 'overdue' | 'extended';
  extendedDays?: number;
  fine?: number;
}

export interface BorrowedBook {
  bookId: string;
  title: string;
  bookCode: string;
  coverImage: string;
}

export interface Reservation {
  id: string;
  memberId: string;
  memberName: string;
  bookId: string;
  bookTitle: string;
  reservationDate: string;
  status: 'pending' | 'ready' | 'fulfilled' | 'cancelled';
  queuePosition?: number;
}

export interface Notification {
  id: string;
  type: 'due_date' | 'overdue' | 'reservation' | 'borrowing' | 'return' | 'announcement';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface Review {
  id: string;
  bookId: string;
  memberId: string;
  memberName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Fine {
  id: string;
  memberId: string;
  memberName: string;
  transactionId: string;
  bookTitle: string;
  overdueDays: number;
  fineAmount: number;
  status: 'unpaid' | 'paid' | 'waived';
  issuedDate: string;
  paidDate?: string;
}

export interface Procurement {
  id: string;
  bookId?: string;
  stockReceived: boolean;
  bookTitle: string;
  author: string;
  source: 'purchase' | 'donation' | 'exchange';
  quantity: number;
  acquisitionDate: string;
  status: 'pending' | 'received' | 'processed';
  cost?: number;
}

export interface DigitalBook {
  id: string;
  bookId: string;
  title: string;
  author: string;
  coverImage: string;
  pageCount: number;
  fileSize: string;
  format: string;
  readingProgress?: number;
  lastRead?: string;
}

export interface DashboardStats {
  totalBooks: number;
  availableBooks: number;
  borrowedBooks: number;
  totalMembers: number;
  activeLoans: number;
  overdueBooks: number;
  transactionsToday: number;
}

export interface MonthlyTransaction {
  month: string;
  borrowing: number;
  returns: number;
}

export interface PopularCategory {
  name: string;
  count: number;
  color: string;
}

export interface LibrarySettings {
  libraryName: string;
  libraryAddress: string;
  libraryPhone: string;
  libraryEmail: string;
  maxBorrowDays: number;
  maxBooksPerMember: number;
  finePerDay: number;
  maxFine?: number;
  automaticFines?: boolean;
  allowExtensions: boolean;
  maxExtensions: number;
  notificationPreferences?: Record<string, boolean>;
}