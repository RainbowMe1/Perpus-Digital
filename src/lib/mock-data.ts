import { Book, Member, BorrowingTransaction, Reservation, Notification, Review, Fine, Procurement, DigitalBook, DashboardStats, MonthlyTransaction, PopularCategory, User, LibrarySettings } from './types';

export const mockUsers: User[] = [
  { id: 'u1', name: 'Admin Utama', email: 'admin@library.edu', role: 'admin' },
  { id: 'u2', name: 'Siti Rahayu', email: 'librarian@library.edu', role: 'librarian' },
  { id: 'u3', name: 'Ahmad Fauzi', email: 'ahmad@student.edu', role: 'student', memberNumber: 'STU-2024-001' },
];

export const mockBooks: Book[] = [
  {
    id: 'b1', title: 'Laskar Pelangi', author: 'Andrea Hirata', isbn: '978-602-03-0701-8',
    bookCode: 'BK-001', publisher: 'Bentang Pustaka', publicationYear: 2005,
    category: 'Fiksi', description: 'Novel inspiratif tentang perjuangan anak-anak Belitung dalam meraih pendidikan. Kisah yang menyentuh hati tentang semangat belajar dan persahabatan.',
    coverImage: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400',
    totalStock: 8, availableStock: 5, shelfLocation: 'A-1-3', isDigital: true,
    pageCount: 529, rating: 4.8, reviewCount: 124
  },
  {
    id: 'b2', title: 'Bumi Manusia', author: 'Pramoedya Ananta Toer', isbn: '978-979-97312-3-8',
    bookCode: 'BK-002', publisher: 'Hasta Mitra', publicationYear: 1980,
    category: 'Fiksi Sejarah', description: 'Tetralogi Buru bagian pertama, mengisahkan Minke di era kolonial Belanda. Karya sastra klasik Indonesia yang mendunia.',
    coverImage: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400',
    totalStock: 6, availableStock: 3, shelfLocation: 'A-1-4', isDigital: true,
    pageCount: 535, rating: 4.9, reviewCount: 203
  },
  {
    id: 'b3', title: 'Filosofi Teras', author: 'Henry Manampiring', isbn: '978-602-291-587-2',
    bookCode: 'BK-003', publisher: 'Kompas', publicationYear: 2018,
    category: 'Self-Help', description: 'Buku filsafat Stoa yang relevan dengan kehidupan modern. Panduan praktis untuk hidup lebih tenang dan bijaksana.',
    coverImage: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
    totalStock: 10, availableStock: 7, shelfLocation: 'B-2-1', isDigital: true,
    pageCount: 346, rating: 4.6, reviewCount: 89
  },
  {
    id: 'b4', title: 'Atomic Habits', author: 'James Clear', isbn: '978-0-7352-1129-8',
    bookCode: 'BK-004', publisher: 'Gramedia', publicationYear: 2019,
    category: 'Self-Help', description: 'Panduan praktis membangun kebiasaan baik dan menghilangkan kebiasaan buruk. Perubahan kecil, hasil luar biasa.',
    coverImage: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400',
    totalStock: 12, availableStock: 4, shelfLocation: 'B-2-2', isDigital: true,
    pageCount: 320, rating: 4.7, reviewCount: 156
  },
  {
    id: 'b5', title: 'Sapiens', author: 'Yuval Noah Harari', isbn: '978-0-06-231609-7',
    bookCode: 'BK-005', publisher: 'Gramedia', publicationYear: 2017,
    category: 'Sejarah', description: 'Sejarah singkat umat manusia dari zaman batu hingga era digital. Perspektif baru tentang evolusi manusia.',
    coverImage: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400',
    totalStock: 5, availableStock: 2, shelfLocation: 'C-3-1', isDigital: false,
    pageCount: 464, rating: 4.5, reviewCount: 98
  },
  {
    id: 'b6', title: 'Pulang', author: 'Tere Liye', isbn: '978-602-03-3456-7',
    bookCode: 'BK-006', publisher: 'Republika', publicationYear: 2015,
    category: 'Fiksi', description: 'Kisah Bujang yang penuh dengan aksi dan petualangan. Novel yang menggabungkan aksi dan nilai-nilai kehidupan.',
    coverImage: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400',
    totalStock: 7, availableStock: 6, shelfLocation: 'A-2-1', isDigital: true,
    pageCount: 408, rating: 4.4, reviewCount: 67
  },
  {
    id: 'b7', title: 'Matematika Dasar', author: 'Prof. Dr. Sudrajat', isbn: '978-602-123-456-7',
    bookCode: 'BK-007', publisher: 'Erlangga', publicationYear: 2020,
    category: 'Pendidikan', description: 'Buku teks matematika untuk tingkat SMA. Membahas konsep dasar hingga lanjutan dengan contoh soal.',
    coverImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400',
    totalStock: 15, availableStock: 12, shelfLocation: 'D-1-1', isDigital: false,
    pageCount: 280, rating: 4.2, reviewCount: 34
  },
  {
    id: 'b8', title: 'Fisika Modern', author: 'Dr. Bambang Sutopo', isbn: '978-602-234-567-8',
    bookCode: 'BK-008', publisher: 'Erlangga', publicationYear: 2021,
    category: 'Sains', description: 'Pengantar fisika modern untuk mahasiswa. Membahas relativitas, mekanika kuantum, dan fisika nuklir.',
    coverImage: 'https://images.unsplash.com/photo-1532012197265-9d179a990aa6?w=400',
    totalStock: 8, availableStock: 5, shelfLocation: 'D-2-1', isDigital: true,
    pageCount: 350, rating: 4.3, reviewCount: 45
  },
  {
    id: 'b9', title: 'Sejarah Indonesia', author: 'Prof. Marwati Djoened', isbn: '978-602-345-678-9',
    bookCode: 'BK-009', publisher: 'Balai Pustaka', publicationYear: 2019,
    category: 'Sejarah', description: 'Buku komprehensif tentang sejarah Indonesia dari masa pra-sejarah hingga reformasi.',
    coverImage: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400',
    totalStock: 6, availableStock: 4, shelfLocation: 'C-3-2', isDigital: false,
    pageCount: 520, rating: 4.5, reviewCount: 56
  },
  {
    id: 'b10', title: 'Pemrograman Web', author: 'Ir. Hendra', isbn: '978-602-456-789-0',
    bookCode: 'BK-010', publisher: 'Informatika', publicationYear: 2022,
    category: 'Teknologi', description: 'Panduan lengkap pemrograman web modern dengan HTML, CSS, JavaScript, dan framework populer.',
    coverImage: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=400',
    totalStock: 10, availableStock: 8, shelfLocation: 'E-1-1', isDigital: true,
    pageCount: 450, rating: 4.6, reviewCount: 78
  },
  {
    id: 'b11', title: 'Bahasa Indonesia Kreatif', author: 'Dr. Ratna', isbn: '978-602-567-890-1',
    bookCode: 'BK-011', publisher: 'Gramedia', publicationYear: 2021,
    category: 'Pendidikan', description: 'Buku pelajaran bahasa Indonesia yang kreatif dan interaktif untuk siswa SMA.',
    coverImage: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400',
    totalStock: 20, availableStock: 15, shelfLocation: 'D-1-2', isDigital: false,
    pageCount: 240, rating: 4.1, reviewCount: 28
  },
  {
    id: 'b12', title: 'The Psychology of Money', author: 'Morgan Housel', isbn: '978-0-85719-768-2',
    bookCode: 'BK-012', publisher: 'Gramedia', publicationYear: 2020,
    category: 'Keuangan', description: 'Pelajaran tentang kekayaan dan keuangan. Pemahaman psikologi di balik keputusan finansial.',
    coverImage: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400',
    totalStock: 9, availableStock: 3, shelfLocation: 'B-3-1', isDigital: true,
    pageCount: 256, rating: 4.8, reviewCount: 142
  },
];

export const mockMembers: Member[] = [
  {
    id: 'm1', fullName: 'Ahmad Fauzi', memberNumber: 'STU-2024-001',
    category: 'student', classOrDepartment: 'XII IPA 1',
    email: 'ahmad@student.edu', phone: '081234567890',
    registrationDate: '2024-01-15', status: 'active',
    activeLoans: 2, totalBorrowed: 15
  },
  {
    id: 'm2', fullName: 'Siti Nurhaliza', memberNumber: 'STU-2024-002',
    category: 'student', classOrDepartment: 'XI IPS 2',
    email: 'siti@student.edu', phone: '081234567891',
    registrationDate: '2024-01-20', status: 'active',
    activeLoans: 1, totalBorrowed: 8
  },
  {
    id: 'm3', fullName: 'Budi Santoso', memberNumber: 'TCH-2024-001',
    category: 'teacher', classOrDepartment: 'Matematika',
    email: 'budi@teacher.edu', phone: '081234567892',
    registrationDate: '2023-08-10', status: 'active',
    activeLoans: 3, totalBorrowed: 25
  },
  {
    id: 'm4', fullName: 'Dewi Lestari', memberNumber: 'STU-2024-003',
    category: 'student', classOrDepartment: 'X IPA 3',
    email: 'dewi@student.edu', phone: '081234567893',
    registrationDate: '2024-02-01', status: 'active',
    activeLoans: 0, totalBorrowed: 5
  },
  {
    id: 'm5', fullName: 'Rudi Hermawan', memberNumber: 'STF-2024-001',
    category: 'staff', classOrDepartment: 'Administrasi',
    email: 'rudi@staff.edu', phone: '081234567894',
    registrationDate: '2023-07-01', status: 'active',
    activeLoans: 1, totalBorrowed: 12
  },
  {
    id: 'm6', fullName: 'Maya Sari', memberNumber: 'STU-2024-004',
    category: 'student', classOrDepartment: 'XII IPS 1',
    email: 'maya@student.edu', phone: '081234567895',
    registrationDate: '2024-02-15', status: 'active',
    activeLoans: 2, totalBorrowed: 10
  },
  {
    id: 'm7', fullName: 'Agus Wijaya', memberNumber: 'TCH-2024-002',
    category: 'teacher', classOrDepartment: 'Bahasa Indonesia',
    email: 'agus@teacher.edu', phone: '081234567896',
    registrationDate: '2023-08-15', status: 'active',
    activeLoans: 0, totalBorrowed: 18
  },
  {
    id: 'm8', fullName: 'Rina Kartika', memberNumber: 'STU-2024-005',
    category: 'student', classOrDepartment: 'XI IPA 1',
    email: 'rina@student.edu', phone: '081234567897',
    registrationDate: '2024-03-01', status: 'suspended',
    activeLoans: 0, totalBorrowed: 3
  },
];

export const mockTransactions: BorrowingTransaction[] = [
  {
    id: 't1', transactionId: 'TRX-2026-001',
    memberId: 'm1', memberName: 'Ahmad Fauzi', memberNumber: 'STU-2024-001',
    books: [
      { bookId: 'b1', title: 'Laskar Pelangi', bookCode: 'BK-001', coverImage: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400' },
      { bookId: 'b3', title: 'Filosofi Teras', bookCode: 'BK-003', coverImage: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400' }
    ],
    borrowingDate: '2026-11-07', dueDate: '2026-11-21', status: 'active'
  },
  {
    id: 't2', transactionId: 'TRX-2026-002',
    memberId: 'm2', memberName: 'Siti Nurhaliza', memberNumber: 'STU-2024-002',
    books: [
      { bookId: 'b4', title: 'Atomic Habits', bookCode: 'BK-004', coverImage: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400' }
    ],
    borrowingDate: '2026-11-05', dueDate: '2026-11-19', status: 'active'
  },
  {
    id: 't3', transactionId: 'TRX-2026-003',
    memberId: 'm3', memberName: 'Budi Santoso', memberNumber: 'TCH-2024-001',
    books: [
      { bookId: 'b5', title: 'Sapiens', bookCode: 'BK-005', coverImage: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400' },
      { bookId: 'b9', title: 'Sejarah Indonesia', bookCode: 'BK-009', coverImage: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400' },
      { bookId: 'b12', title: 'The Psychology of Money', bookCode: 'BK-012', coverImage: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400' }
    ],
    borrowingDate: '2026-10-25', dueDate: '2026-11-08', status: 'overdue'
  },
  {
    id: 't4', transactionId: 'TRX-2026-004',
    memberId: 'm6', memberName: 'Maya Sari', memberNumber: 'STU-2024-004',
    books: [
      { bookId: 'b2', title: 'Bumi Manusia', bookCode: 'BK-002', coverImage: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400' },
      { bookId: 'b6', title: 'Pulang', bookCode: 'BK-006', coverImage: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400' }
    ],
    borrowingDate: '2026-11-01', dueDate: '2026-11-15', status: 'active'
  },
  {
    id: 't5', transactionId: 'TRX-2026-005',
    memberId: 'm1', memberName: 'Ahmad Fauzi', memberNumber: 'STU-2024-001',
    books: [
      { bookId: 'b10', title: 'Pemrograman Web', bookCode: 'BK-010', coverImage: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=400' }
    ],
    borrowingDate: '2026-10-15', dueDate: '2026-10-29', status: 'returned',
    returnDate: '2026-10-28'
  },
  {
    id: 't6', transactionId: 'TRX-2026-006',
    memberId: 'm5', memberName: 'Rudi Hermawan', memberNumber: 'STF-2024-001',
    books: [
      { bookId: 'b8', title: 'Fisika Modern', bookCode: 'BK-008', coverImage: 'https://images.unsplash.com/photo-1532012197265-9d179a990aa6?w=400' }
    ],
    borrowingDate: '2026-11-10', dueDate: '2026-11-24', status: 'active'
  },
  {
    id: 't7', transactionId: 'TRX-2026-007',
    memberId: 'm2', memberName: 'Siti Nurhaliza', memberNumber: 'STU-2024-002',
    books: [
      { bookId: 'b7', title: 'Matematika Dasar', bookCode: 'BK-007', coverImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400' }
    ],
    borrowingDate: '2026-10-20', dueDate: '2026-11-03', status: 'returned',
    returnDate: '2026-11-05', fine: 2000
  },
  {
    id: 't8', transactionId: 'TRX-2026-008',
    memberId: 'm6', memberName: 'Maya Sari', memberNumber: 'STU-2024-004',
    books: [
      { bookId: 'b11', title: 'Bahasa Indonesia Kreatif', bookCode: 'BK-011', coverImage: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400' }
    ],
    borrowingDate: '2026-11-12', dueDate: '2026-11-26', status: 'active'
  },
];

export const mockReservations: Reservation[] = [
  { id: 'r1', memberId: 'm4', memberName: 'Dewi Lestari', bookId: 'b5', bookTitle: 'Sapiens', reservationDate: '2026-11-10', status: 'pending', queuePosition: 1 },
  { id: 'r2', memberId: 'm2', memberName: 'Siti Nurhaliza', bookId: 'b12', bookTitle: 'The Psychology of Money', reservationDate: '2026-11-08', status: 'ready', queuePosition: 1 },
  { id: 'r3', memberId: 'm1', memberName: 'Ahmad Fauzi', bookId: 'b4', bookTitle: 'Atomic Habits', reservationDate: '2026-11-05', status: 'fulfilled' },
  { id: 'r4', memberId: 'm7', memberName: 'Agus Wijaya', bookId: 'b5', bookTitle: 'Sapiens', reservationDate: '2026-11-11', status: 'pending', queuePosition: 2 },
];

export const mockNotifications: Notification[] = [
  { id: 'n1', type: 'overdue', title: 'Buku Terlambat', message: 'Buku "Sapiens" milik Budi Santoso telah melewati batas waktu pengembalian.', timestamp: '2026-11-14T08:00:00', read: false, link: '/borrowing' },
  { id: 'n2', type: 'due_date', title: 'Pengingat Jatuh Tempo', message: 'Buku "Bumi Manusia" akan jatuh tempo dalam 1 hari.', timestamp: '2026-11-14T07:30:00', read: false, link: '/borrowing' },
  { id: 'n3', type: 'reservation', title: 'Reservasi Siap', message: 'Buku "The Psychology of Money" yang Anda reservasi sudah tersedia.', timestamp: '2026-11-13T14:00:00', read: true, link: '/reservations' },
  { id: 'n4', type: 'return', title: 'Pengembalian Berhasil', message: 'Buku "Pemrograman Web" telah berhasil dikembalikan.', timestamp: '2026-11-13T10:00:00', read: true, link: '/returns' },
  { id: 'n5', type: 'announcement', title: 'Pengumuman Perpustakaan', message: 'Perpustakaan akan tutup pada hari Senin untuk inventarisasi.', timestamp: '2026-11-12T09:00:00', read: true },
  { id: 'n6', type: 'borrowing', title: 'Peminjaman Baru', message: 'Anda telah meminjam 2 buku baru. Silakan cek detail peminjaman.', timestamp: '2026-11-07T11:00:00', read: true, link: '/borrowing' },
];

export const mockReviews: Review[] = [
  { id: 'rv1', bookId: 'b1', memberId: 'm1', memberName: 'Ahmad Fauzi', rating: 5, comment: 'Buku yang sangat inspiratif! Cerita perjuangan anak-anak Belitung membuat saya termotivasi.', createdAt: '2026-10-15' },
  { id: 'rv2', bookId: 'b1', memberId: 'm2', memberName: 'Siti Nurhaliza', rating: 5, comment: 'Salah satu novel terbaik yang pernah saya baca. Sangat menyentuh hati.', createdAt: '2026-10-20' },
  { id: 'rv3', bookId: 'b2', memberId: 'm3', memberName: 'Budi Santoso', rating: 5, comment: 'Karya sastra yang luar biasa. Pram berhasil menggambarkan kondisi kolonial dengan sangat detail.', createdAt: '2026-11-01' },
  { id: 'rv4', bookId: 'b3', memberId: 'm1', memberName: 'Ahmad Fauzi', rating: 4, comment: 'Filsafat Stoa yang dikemas dengan bahasa modern dan mudah dipahami.', createdAt: '2026-11-05' },
  { id: 'rv5', bookId: 'b4', memberId: 'm6', memberName: 'Maya Sari', rating: 5, comment: 'Perubahan kecil yang konsisten menghasilkan perubahan besar. Buku wajib baca!', createdAt: '2026-11-08' },
  { id: 'rv6', bookId: 'b12', memberId: 'm3', memberName: 'Budi Santoso', rating: 5, comment: 'Pemikiran yang segar tentang uang dan kekayaan. Sangat relevan.', createdAt: '2026-11-10' },
];

export const mockFines: Fine[] = [
  { id: 'f1', memberId: 'm2', memberName: 'Siti Nurhaliza', transactionId: 'TRX-2026-007', bookTitle: 'Matematika Dasar', overdueDays: 2, fineAmount: 2000, status: 'paid', issuedDate: '2026-11-05', paidDate: '2026-11-05' },
  { id: 'f2', memberId: 'm3', memberName: 'Budi Santoso', transactionId: 'TRX-2026-003', bookTitle: 'Sapiens', overdueDays: 6, fineAmount: 6000, status: 'unpaid', issuedDate: '2026-11-09' },
  { id: 'f3', memberId: 'm3', memberName: 'Budi Santoso', transactionId: 'TRX-2026-003', bookTitle: 'Sejarah Indonesia', overdueDays: 6, fineAmount: 6000, status: 'unpaid', issuedDate: '2026-11-09' },
  { id: 'f4', memberId: 'm3', memberName: 'Budi Santoso', transactionId: 'TRX-2026-003', bookTitle: 'The Psychology of Money', overdueDays: 6, fineAmount: 6000, status: 'unpaid', issuedDate: '2026-11-09' },
];

export const mockProcurements: Procurement[] = [
  { id: 'p1', bookTitle: 'Clean Code', author: 'Robert C. Martin', source: 'purchase', quantity: 5, acquisitionDate: '2026-11-01', status: 'received', stockReceived: true, cost: 750000 },
  { id: 'p2', bookTitle: 'Design Patterns', author: 'Erich Gamma', source: 'purchase', quantity: 3, acquisitionDate: '2026-10-25', status: 'processed', stockReceived: true, cost: 450000 },
  { id: 'p3', bookTitle: 'Kumpulan Puisi Chairil Anwar', author: 'Chairil Anwar', source: 'donation', quantity: 10, acquisitionDate: '2026-10-20', status: 'processed', stockReceived: true },
  { id: 'p4', bookTitle: 'The Pragmatic Programmer', author: 'David Thomas', source: 'purchase', quantity: 4, acquisitionDate: '2026-11-12', status: 'pending', stockReceived: false, cost: 520000 },
  { id: 'p5', bookTitle: 'Introduction to Algorithms', author: 'Thomas H. Cormen', source: 'exchange', quantity: 2, acquisitionDate: '2026-11-05', status: 'received', stockReceived: true },
];

export const mockDigitalBooks: DigitalBook[] = [
  { id: 'db1', bookId: 'b1', title: 'Laskar Pelangi', author: 'Andrea Hirata', coverImage: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400', pageCount: 529, fileSize: '12.5 MB', format: 'PDF', readingProgress: 65, lastRead: '2026-11-10' },
  { id: 'db2', bookId: 'b2', title: 'Bumi Manusia', author: 'Pramoedya Ananta Toer', coverImage: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400', pageCount: 535, fileSize: '14.2 MB', format: 'PDF', readingProgress: 30, lastRead: '2026-11-08' },
  { id: 'db3', bookId: 'b3', title: 'Filosofi Teras', author: 'Henry Manampiring', coverImage: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400', pageCount: 346, fileSize: '8.7 MB', format: 'PDF', readingProgress: 100, lastRead: '2026-10-30' },
  { id: 'db4', bookId: 'b4', title: 'Atomic Habits', author: 'James Clear', coverImage: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400', pageCount: 320, fileSize: '9.1 MB', format: 'PDF', readingProgress: 45, lastRead: '2026-11-12' },
];

export const mockDashboardStats: DashboardStats = {
  totalBooks: 1248,
  availableBooks: 986,
  borrowedBooks: 262,
  totalMembers: 458,
  activeLoans: 187,
  overdueBooks: 12,
  transactionsToday: 24
};

export const mockMonthlyTransactions: MonthlyTransaction[] = [
  { month: 'Jun', borrowing: 145, returns: 132 },
  { month: 'Jul', borrowing: 98, returns: 112 },
  { month: 'Aug', borrowing: 167, returns: 154 },
  { month: 'Sep', borrowing: 189, returns: 176 },
  { month: 'Oct', borrowing: 203, returns: 195 },
  { month: 'Nov', borrowing: 187, returns: 165 },
];

export const mockPopularCategories: PopularCategory[] = [
  { name: 'Fiksi', count: 342, color: '#3b82f6' },
  { name: 'Pendidikan', count: 289, color: '#10b981' },
  { name: 'Sains', count: 198, color: '#f59e0b' },
  { name: 'Sejarah', count: 156, color: '#8b5cf6' },
  { name: 'Teknologi', count: 134, color: '#ec4899' },
  { name: 'Self-Help', count: 129, color: '#06b6d4' },
];

export const mockMostBorrowedBooks = [
  { title: 'Laskar Pelangi', count: 87 },
  { title: 'Bumi Manusia', count: 72 },
  { title: 'Atomic Habits', count: 65 },
  { title: 'Filosofi Teras', count: 58 },
  { title: 'The Psychology of Money', count: 52 },
];

export const mockSettings: LibrarySettings = {
  libraryName: 'Perpustakaan SMA Negeri 1',
  libraryAddress: 'Jl. Pendidikan No. 123, Jakarta',
  libraryPhone: '(021) 1234-5678',
  libraryEmail: 'library@sma1.edu',
  maxBorrowDays: 14,
  maxBooksPerMember: 3,
  finePerDay: 1000,
  allowExtensions: true,
  maxExtensions: 2,
};