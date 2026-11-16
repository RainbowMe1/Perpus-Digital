'use client';

import { useState, useMemo, useEffect } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { BookCover } from '@/components/features/book-cover';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { useAppState, useRole } from '@/lib/context';
import { formatShortDate, getStatusVariant, getStatusLabel, calculateOverdueDays, getLocalDateInputValue } from '@/lib/utils';
import { Search, Plus, Eye, ArrowLeftRight } from 'lucide-react';
import Link from 'next/link';

export default function BorrowingPage() {
  const { transactions } = useAppState();
  const { currentRole } = useRole();
  const isLibraryStaff = currentRole === 'admin' || currentRole === 'librarian' || currentRole === 'staff';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const itemsPerPage = 10;
  const today = getLocalDateInputValue();
  useEffect(() => {
    const initialSearch = new URLSearchParams(window.location.search).get('search');
    if (initialSearch) setSearch(initialSearch);
  }, []);
  const effectiveStatus = (transaction: typeof transactions[number]) =>
    transaction.status !== 'returned' && transaction.dueDate < today ? 'overdue' : transaction.status;

  const filteredTransactions = useMemo(() => {
    return transactions.filter(trx => {
      const matchSearch = !search ||
        trx.transactionId.toLowerCase().includes(search.toLowerCase()) ||
        trx.memberName.toLowerCase().includes(search.toLowerCase()) ||
        trx.memberNumber.toLowerCase().includes(search.toLowerCase()) ||
        trx.books.some(book =>
          book.title.toLowerCase().includes(search.toLowerCase()) ||
          book.bookCode.toLowerCase().includes(search.toLowerCase())
        );
      const currentStatus = trx.status !== 'returned' && trx.dueDate < today ? 'overdue' : trx.status;
      const matchStatus = statusFilter === 'all' || currentStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [transactions, search, statusFilter, today]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = {
    active: transactions.filter(t => t.status !== 'returned' && effectiveStatus(t) !== 'overdue').length,
    overdue: transactions.filter(t => effectiveStatus(t) === 'overdue').length,
    returned: transactions.filter(t => t.status === 'returned').length,
  };

  return (
    <AppLayout
      breadcrumbs={[{ label: 'Peminjaman' }]}
      title={isLibraryStaff ? 'Manajemen Peminjaman' : 'Riwayat Peminjaman Saya'}
      description={isLibraryStaff
        ? 'Kelola semua transaksi peminjaman buku'
        : 'Hanya transaksi yang tercatat atas profil anggota akun ini yang ditampilkan.'}
      actions={
        isLibraryStaff && (
          <Link href="/borrowing/new">
            <Button icon={<Plus className="w-4 h-4" />}>Peminjaman Baru</Button>
          </Link>
        )
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Aktif</p>
              <p className="text-lg font-bold text-slate-900">{stats.active}</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Terlambat</p>
              <p className="text-lg font-bold text-slate-900">{stats.overdue}</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Dikembalikan</p>
              <p className="text-lg font-bold text-slate-900">{stats.returned}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card padding="sm" className="mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Cari ID transaksi, nama, atau nomor anggota..."
              icon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <Select
            options={[
              { value: 'all', label: 'Semua Status' },
              { value: 'active', label: 'Aktif' },
              { value: 'overdue', label: 'Terlambat' },
              { value: 'returned', label: 'Dikembalikan' },
              { value: 'extended', label: 'Diperpanjang' },
            ]}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="md:w-48"
          />
        </div>
      </Card>

      {/* Table */}
      {filteredTransactions.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ArrowLeftRight className="w-8 h-8" />}
            title={isLibraryStaff ? 'Tidak ada transaksi ditemukan' : 'Belum ada riwayat peminjaman'}
            description={isLibraryStaff
              ? 'Coba ubah filter atau kata kunci pencarian Anda'
              : 'Peminjaman yang dicatat untuk profil anggota akun ini akan muncul di sini.'}
          />
        </Card>
      ) : (
        <Card padding="none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Transaksi</TableHead>
                <TableHead>Anggota</TableHead>
                <TableHead>Buku</TableHead>
                <TableHead>Tgl Pinjam</TableHead>
                <TableHead>Jatuh Tempo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.map(trx => {
                const status = effectiveStatus(trx);
                const overdueDays = status === 'overdue' ? calculateOverdueDays(trx.dueDate) : 0;
                return (
                  <TableRow key={trx.id}>
                    <TableCell>
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded">{trx.transactionId}</code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar name={trx.memberName} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{trx.memberName}</p>
                          <p className="text-xs text-slate-500">{trx.memberNumber}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex -space-x-2">
                        {trx.books.slice(0, 3).map(book => (
                          <BookCover
                            key={book.bookId}
                            src={book.coverImage}
                            alt={book.title}
                            className="w-8 h-10 rounded border-2 border-white object-cover"
                            title={book.title}
                          />
                        ))}
                        {trx.books.length > 3 && (
                          <div className="w-8 h-10 rounded border-2 border-white bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                            +{trx.books.length - 3}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{trx.books.length} buku</p>
                    </TableCell>
                    <TableCell className="text-slate-600">{formatShortDate(trx.borrowingDate)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-slate-600">{formatShortDate(trx.dueDate)}</p>
                        {overdueDays > 0 && (
                          <p className="text-xs text-red-600 font-medium">+{overdueDays} hari</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(status)}>
                        {getStatusLabel(status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => setSelectedTransactionId(trx.id)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="p-4 border-t border-slate-200">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </Card>
      )}
      <Modal
        isOpen={selectedTransactionId !== null}
        onClose={() => setSelectedTransactionId(null)}
        title="Detail Transaksi"
      >
        {(() => {
          const transaction = transactions.find(item => item.id === selectedTransactionId);
          if (!transaction) return null;
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-slate-500">ID Transaksi</p><p className="font-medium">{transaction.transactionId}</p></div>
                <div><p className="text-slate-500">Anggota</p><p className="font-medium">{transaction.memberName}</p></div>
                <div><p className="text-slate-500">Tanggal Pinjam</p><p className="font-medium">{formatShortDate(transaction.borrowingDate)}</p></div>
                <div><p className="text-slate-500">Jatuh Tempo</p><p className="font-medium">{formatShortDate(transaction.dueDate)}</p></div>
                {transaction.returnDate && <div><p className="text-slate-500">Tanggal Kembali</p><p className="font-medium">{formatShortDate(transaction.returnDate)}</p></div>}
                <div><p className="text-slate-500">Status</p><Badge variant={getStatusVariant(effectiveStatus(transaction))}>{getStatusLabel(effectiveStatus(transaction))}</Badge></div>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-2">Buku</p>
                <ul className="space-y-2">{transaction.books.map(book => <li key={book.bookId} className="text-sm text-slate-700">{book.title} <span className="text-xs text-slate-500">({book.bookCode})</span></li>)}</ul>
              </div>
            </div>
          );
        })()}
      </Modal>
    </AppLayout>
  );
}