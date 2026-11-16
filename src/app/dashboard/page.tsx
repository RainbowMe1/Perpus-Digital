'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { StatCard } from '@/components/features/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAppState, useRole } from '@/lib/context';
import { formatShortDate, getStatusVariant, getStatusLabel, formatCurrency, getLocalDateInputValue } from '@/lib/utils';
import {
  BookOpen, Users, ArrowLeftRight, AlertTriangle, Library, TrendingUp,
  Calendar, Clock, ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export default function DashboardPage() {
  const { books, members, transactions, totalMemberCount, totalMemberCountError } = useAppState();
  const { currentRole } = useRole();
  const isLibraryStaff = currentRole === 'admin' || currentRole === 'librarian' || currentRole === 'staff';
  const today = getLocalDateInputValue();
  const isOverdue = (transaction: typeof transactions[number]) =>
    transaction.status === 'overdue' ||
    (transaction.status !== 'returned' && transaction.dueDate < today);
  const stats = {
    totalBooks: books.reduce((total, book) => total + book.totalStock, 0),
    availableBooks: books.reduce((total, book) => total + book.availableStock, 0),
    borrowedBooks: transactions.filter(transaction => transaction.status !== 'returned')
      .reduce((total, transaction) => total + transaction.books.length, 0),
    totalMembers: totalMemberCount ?? (isLibraryStaff ? members.length : null),
    activeLoans: transactions.filter(transaction => transaction.status !== 'returned').length,
    overdueBooks: transactions.filter(isOverdue)
      .reduce((total, transaction) => total + transaction.books.length, 0),
    transactionsToday: transactions.filter(transaction =>
      transaction.borrowingDate === today || transaction.returnDate === today
    ).length,
  };
  const monthlyTransactions = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return {
      month: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(date),
      borrowing: transactions.filter(transaction => transaction.borrowingDate.startsWith(key)).length,
      returns: transactions.filter(transaction => transaction.returnDate?.startsWith(key)).length,
    };
  });
  const categoryColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
  const categoryCounts = new Map<string, number>();
  for (const book of books) categoryCounts.set(book.category, (categoryCounts.get(book.category) ?? 0) + book.totalStock);
  const popularCategories = Array.from(categoryCounts.entries())
    .map(([name, count], index) => ({ name, count, color: categoryColors[index % categoryColors.length] }))
    .sort((a, b) => b.count - a.count);
  const borrowedBookCounts = new Map<string, { title: string; count: number }>();
  for (const transaction of transactions) {
    for (const book of transaction.books) {
      const current = borrowedBookCounts.get(book.bookId) ?? { title: book.title, count: 0 };
      borrowedBookCounts.set(book.bookId, { ...current, count: current.count + 1 });
    }
  }
  const mostBorrowedBooks = Array.from(borrowedBookCounts.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  const maxBorrowCount = mostBorrowedBooks[0]?.count ?? 1;

  const recentBorrowing = transactions
    .filter(t => t.status !== 'returned')
    .slice(0, 5);

  const recentReturns = transactions
    .filter(t => t.status === 'returned')
    .slice(0, 5);

  const overdueTransactions = transactions.filter(isOverdue);

  return (
    <AppLayout
      breadcrumbs={[{ label: 'Dashboard' }]}
      title="Dashboard"
      description={isLibraryStaff
        ? 'Selamat datang kembali! Berikut ringkasan perpustakaan hari ini.'
        : 'Ringkasan katalog dan aktivitas peminjaman akun anggota ini.'}
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Buku"
          value={stats.totalBooks.toLocaleString('id-ID')}
          icon={BookOpen}
          color="blue"
        />
        <StatCard
          label="Total Anggota"
          value={stats.totalMembers?.toLocaleString('id-ID') ?? '—'}
          icon={Users}
          color="emerald"
        />
        <StatCard
          label={isLibraryStaff ? 'Peminjaman Aktif' : 'Peminjaman Aktif Saya'}
          value={stats.activeLoans}
          icon={ArrowLeftRight}
          color="purple"
        />
        <StatCard
          label={isLibraryStaff ? 'Buku Terlambat' : 'Buku Saya Terlambat'}
          value={stats.overdueBooks}
          icon={AlertTriangle}
          color="red"
        />
      </div>
      {totalMemberCountError && (
        <p role="status" className="mb-6 text-sm text-amber-700">
          Jumlah total anggota belum tersedia. Pastikan migrasi <code>supabase/stage5.sql</code> sudah dijalankan di Supabase.
        </p>
      )}

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Buku Tersedia</p>
              <p className="text-lg font-bold text-slate-900">{stats.availableBooks}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Transaksi Hari Ini</p>
              <p className="text-lg font-bold text-slate-900">{stats.transactionsToday}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Library className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Buku Dipinjam</p>
              <p className="text-lg font-bold text-slate-900">{stats.borrowedBooks}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Kategori Populer</p>
              <p className="text-lg font-bold text-slate-900">Fiksi</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Monthly Transactions Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{isLibraryStaff ? 'Statistik Transaksi Bulanan' : 'Aktivitas Peminjaman Saya'}</CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  {isLibraryStaff
                    ? 'Peminjaman dan pengembalian 6 bulan terakhir'
                    : 'Riwayat akun ini selama 6 bulan terakhir'}
                </p>
              </div>
              <Badge variant="info">6 Bulan</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTransactions}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="borrowing"
                  name="Peminjaman"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="returns"
                  name="Pengembalian"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Popular Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Kategori Populer</CardTitle>
            <p className="text-sm text-slate-500 mt-1">Distribusi buku per kategori</p>
          </CardHeader>
          <CardContent>
            {popularCategories.length > 0 ? <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={popularCategories}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {popularCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer> : <p className="py-8 text-center text-sm text-slate-500">Belum ada data koleksi.</p>}
            <div className="space-y-2 mt-4">
              {popularCategories.slice(0, 4).map((cat) => (
                <div key={cat.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-slate-700">{cat.name}</span>
                  </div>
                  <span className="font-medium text-slate-900">{cat.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Most Borrowed Books */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{isLibraryStaff ? 'Buku Paling Banyak Dipinjam' : 'Buku yang Pernah Saya Pinjam'}</CardTitle>
              <Link href="/books" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
                Lihat semua <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mostBorrowedBooks.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Belum ada transaksi peminjaman.</p>}
              {mostBorrowedBooks.map((book, index) => (
                <div key={book.title} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{book.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-600 rounded-full"
                          style={{ width: `${(book.count / maxBorrowCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 font-medium">{book.count}x</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Overdue Transactions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{isLibraryStaff ? 'Peminjaman Terlambat' : 'Peminjaman Saya yang Terlambat'}</CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  {isLibraryStaff
                    ? `${overdueTransactions.length} transaksi perlu ditindaklanjuti`
                    : `${overdueTransactions.length} transaksi akun ini terlambat`}
                </p>
              </div>
              <Badge variant="danger">{overdueTransactions.length} Terlambat</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {overdueTransactions.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-sm text-slate-600">Tidak ada peminjaman terlambat</p>
              </div>
            ) : (
              <div className="space-y-3">
                {overdueTransactions.map((trx) => (
                  <div key={trx.id} className="flex items-start gap-3 p-3 rounded-lg border border-red-100 bg-red-50/50">
                    <Avatar name={trx.memberName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{trx.memberName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{trx.transactionId}</p>
                      <p className="text-xs text-red-600 mt-1">
                        {trx.books.length} buku â€¢ Jatuh tempo {formatShortDate(trx.dueDate)}
                      </p>
                    </div>
                    <Link href={`/borrowing`}>
                      <Button size="sm" variant="outline">Detail</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Borrowing */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{isLibraryStaff ? 'Peminjaman Terbaru' : 'Peminjaman Terbaru Saya'}</CardTitle>
              <Link href="/borrowing" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
                Lihat semua <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentBorrowing.map((trx) => (
                <div key={trx.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <Avatar name={trx.memberName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{trx.memberName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {trx.books.length} buku â€¢ {formatShortDate(trx.borrowingDate)}
                    </p>
                  </div>
                  <Badge variant={getStatusVariant(isOverdue(trx) ? 'overdue' : trx.status)}>{getStatusLabel(isOverdue(trx) ? 'overdue' : trx.status)}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Returns */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{isLibraryStaff ? 'Pengembalian Terbaru' : 'Pengembalian Terbaru Saya'}</CardTitle>
              <Link href="/returns" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
                Lihat semua <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentReturns.map((trx) => (
                <div key={trx.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <Avatar name={trx.memberName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{trx.memberName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {trx.books.length} buku â€¢ {formatShortDate(trx.returnDate || trx.borrowingDate)}
                    </p>
                    {trx.fine && trx.fine > 0 && (
                      <p className="text-xs text-red-600 mt-0.5">Denda: {formatCurrency(trx.fine)}</p>
                    )}
                  </div>
                  <Badge variant={getStatusVariant(isOverdue(trx) ? 'overdue' : trx.status)}>{getStatusLabel(isOverdue(trx) ? 'overdue' : trx.status)}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}