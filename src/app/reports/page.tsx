'use client';

import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useAppState } from '@/lib/context';
import { formatCurrency, formatShortDate, getStatusVariant, getStatusLabel, getLocalDateInputValue } from '@/lib/utils';
import { Download, Printer } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export default function ReportsPage() {
  const { transactions, books, members, fines } = useAppState();
  const [activeTab, setActiveTab] = useState('borrowing');
  const [period, setPeriod] = useState('month');

  const today = getLocalDateInputValue();
  const periodStart = useMemo(() => {
    const date = new Date(`${today}T00:00:00`);
    if (period === 'week') date.setDate(date.getDate() - 6);
    if (period === 'month') date.setDate(1);
    if (period === 'year') date.setMonth(0, 1);
    return period === 'all' ? '' : getLocalDateInputValue(date);
  }, [period, today]);
  const isInPeriod = (date: string | undefined) => Boolean(date && (!periodStart || date >= periodStart) && date <= today);
  const filteredTransactions = transactions.filter(transaction => isInPeriod(transaction.borrowingDate));
  const totalTransactions = filteredTransactions.length;
  const returnedTransactions = transactions.filter(transaction => transaction.returnDate && isInPeriod(transaction.returnDate));
  const overdueTransactions = transactions.filter(transaction =>
    transaction.status !== 'returned' && transaction.dueDate < today &&
    (!periodStart || transaction.dueDate >= periodStart)
  );
  const filteredFines = fines.filter(fine => isInPeriod(fine.issuedDate));
  const totalFines = filteredFines.reduce((sum, fine) => sum + fine.fineAmount, 0);
  const paidFines = filteredFines.filter(fine => fine.status === 'paid').reduce((sum, fine) => sum + fine.fineAmount, 0);
  const unpaidFines = filteredFines.filter(fine => fine.status === 'unpaid').reduce((sum, fine) => sum + fine.fineAmount, 0);
  const activeLoans = transactions.filter(transaction => transaction.status !== 'returned').length;
  const categoryData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const book of books) counts.set(book.category, (counts.get(book.category) ?? 0) + book.totalStock);
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [books]);
  const popularBooks = useMemo(() => {
    const counts = new Map<string, { title: string; count: number }>();
    for (const transaction of transactions) {
      for (const book of transaction.books) {
        const current = counts.get(book.bookId) ?? { title: book.title, count: 0 };
        counts.set(book.bookId, { ...current, count: current.count + 1 });
      }
    }
    return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [transactions]);
  const memberStatistics = useMemo(() => members.map(member => ({
    ...member,
    transactionCount: transactions.filter(transaction => transaction.memberId === member.id).length,
  })).sort((a, b) => b.transactionCount - a.transactionCount), [members, transactions]);
  const monthlyData = useMemo(() => {
    const start = new Date(`${today}T00:00:00`);
    start.setDate(1);
    start.setMonth(start.getMonth() - 5);
    return Array.from({ length: 6 }, (_, index) => {
      const month = new Date(start);
      month.setMonth(start.getMonth() + index);
      const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
      return {
        month: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(month),
        borrowing: filteredTransactions.filter(transaction => transaction.borrowingDate.startsWith(key)).length,
        returns: returnedTransactions.filter(transaction => transaction.returnDate?.startsWith(key)).length,
      };
    });
  }, [filteredTransactions, returnedTransactions, today]);
  const handleExport = () => {
    const report = activeTab === 'returns'
      ? {
        filename: 'pengembalian',
        headers: ['ID Transaksi', 'Anggota', 'Tanggal Pinjam', 'Tanggal Kembali', 'Denda'],
        rows: returnedTransactions.map(transaction => [transaction.transactionId, transaction.memberName, transaction.borrowingDate, transaction.returnDate ?? '', String(transaction.fine ?? 0)]),
      }
      : activeTab === 'fines'
        ? {
          filename: 'denda',
          headers: ['Anggota', 'Buku', 'Hari Terlambat', 'Nominal', 'Status'],
          rows: filteredFines.map(fine => [fine.memberName, fine.bookTitle, String(fine.overdueDays), String(fine.fineAmount), fine.status]),
        }
        : activeTab === 'overdue'
          ? {
            filename: 'keterlambatan',
            headers: ['ID Transaksi', 'Anggota', 'Buku', 'Jatuh Tempo'],
            rows: overdueTransactions.map(transaction => [transaction.transactionId, transaction.memberName, transaction.books.map(book => book.title).join('; '), transaction.dueDate]),
          }
            : activeTab === 'members'
              ? {
                filename: 'anggota',
                headers: ['Nama', 'Kategori', 'Kelas/Departemen', 'Status', 'Total Transaksi'],
                rows: memberStatistics.map(member => [member.fullName, member.category, member.classOrDepartment, member.status, String(member.transactionCount)]),
              }
          : {
            filename: 'peminjaman',
            headers: ['ID Transaksi', 'Anggota', 'Buku', 'Tanggal Pinjam', 'Jatuh Tempo', 'Tanggal Kembali', 'Status'],
            rows: filteredTransactions.map(transaction => [
              transaction.transactionId,
              transaction.memberName,
              transaction.books.map(book => book.title).join('; '),
              transaction.borrowingDate,
              transaction.dueDate,
              transaction.returnDate ?? '',
              transaction.status,
            ]),
          };
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [
      report.headers.map(escape).join(','),
      ...report.rows.map(row => row.map(escape).join(',')),
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `laporan-${report.filename}-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout
      breadcrumbs={[{ label: 'Laporan' }]}
      title="Laporan Perpustakaan"
      description="Analisis dan statistik perpustakaan"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>Cetak</Button>
          <Button icon={<Download className="w-4 h-4" />} onClick={handleExport}>Export CSV</Button>
        </div>
      }
    >
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card padding="sm">
          <p className="text-xs text-slate-500">Total Transaksi</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalTransactions}</p>
          <Badge variant="info" className="mt-2">{period === 'all' ? 'Semua waktu' : 'Sesuai periode'}</Badge>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-slate-500">Peminjaman Aktif</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{activeLoans}</p>
          <Badge variant="warning" className="mt-2">Saat ini</Badge>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-slate-500">Total Koleksi</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{books.length}</p>
          <Badge variant="success" className="mt-2">Buku</Badge>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-slate-500">Total Denda</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalFines)}</p>
          <Badge variant="danger" className="mt-2">Terkumpul</Badge>
        </Card>
      </div>

      {/* Filter */}
      <Card padding="sm" className="mb-6">
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
          <Select
            label="Periode"
            options={[
              { value: 'week', label: 'Minggu Ini' },
              { value: 'month', label: 'Bulan Ini' },
              { value: 'year', label: 'Tahun Ini' },
              { value: 'all', label: 'Semua Waktu' },
            ]}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="md:w-48"
          />
          <div className="flex-1" />
          <p className="text-sm text-slate-500">
          Periode mulai <span className="font-medium text-slate-900">{periodStart || 'awal data'}</span> sampai <span className="font-medium text-slate-900">{today}</span>
          </p>
        </div>
      </Card>

      {/* Tabs */}
      <Card padding="none">
        <Tabs
          tabs={[
            { id: 'borrowing', label: 'Laporan Peminjaman' },
            { id: 'returns', label: 'Laporan Pengembalian' },
            { id: 'overdue', label: 'Buku Terlambat' },
            { id: 'fines', label: 'Laporan Denda' },
            { id: 'popular', label: 'Buku Populer' },
            { id: 'members', label: 'Statistik Anggota' },
          ]}
          defaultTab={activeTab}
          onChange={setActiveTab}
        />
        <div className="p-6">
          {activeTab === 'borrowing' && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Tren Peminjaman Bulanan</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                    <Legend />
                    <Bar dataKey="borrowing" name="Peminjaman" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="returns" name="Pengembalian" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Transaksi</TableHead>
                    <TableHead>Anggota</TableHead>
                    <TableHead>Buku</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.slice(0, 8).map(trx => (
                    <TableRow key={trx.id}>
                      <TableCell><code className="text-xs bg-slate-100 px-2 py-1 rounded">{trx.transactionId}</code></TableCell>
                      <TableCell>{trx.memberName}</TableCell>
                      <TableCell>{trx.books.length} buku</TableCell>
                      <TableCell>{formatShortDate(trx.borrowingDate)}</TableCell>
                      <TableCell><Badge variant={getStatusVariant(trx.status)}>{getStatusLabel(trx.status)}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {activeTab === 'returns' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Transaksi</TableHead>
                  <TableHead>Anggota</TableHead>
                  <TableHead>Tgl Pinjam</TableHead>
                  <TableHead>Tgl Kembali</TableHead>
                  <TableHead>Denda</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returnedTransactions.map(trx => (
                  <TableRow key={trx.id}>
                    <TableCell><code className="text-xs bg-slate-100 px-2 py-1 rounded">{trx.transactionId}</code></TableCell>
                    <TableCell>{trx.memberName}</TableCell>
                    <TableCell>{formatShortDate(trx.borrowingDate)}</TableCell>
                    <TableCell>{formatShortDate(trx.returnDate || trx.borrowingDate)}</TableCell>
                    <TableCell>{trx.fine ? formatCurrency(trx.fine) : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {activeTab === 'overdue' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Transaksi</TableHead>
                  <TableHead>Anggota</TableHead>
                  <TableHead>Buku</TableHead>
                  <TableHead>Jatuh Tempo</TableHead>
                  <TableHead>Terlambat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueTransactions.map(trx => (
                  <TableRow key={trx.id}>
                    <TableCell><code className="text-xs bg-slate-100 px-2 py-1 rounded">{trx.transactionId}</code></TableCell>
                    <TableCell>{trx.memberName}</TableCell>
                    <TableCell>{trx.books.map(b => b.title).join(', ')}</TableCell>
                    <TableCell>{formatShortDate(trx.dueDate)}</TableCell>
                    <TableCell><Badge variant="danger">Terlambat</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {activeTab === 'fines' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card padding="sm">
                  <p className="text-xs text-slate-500">Total Denda</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(totalFines)}</p>
                </Card>
                <Card padding="sm">
                  <p className="text-xs text-slate-500">Denda Lunas</p>
                  <p className="text-xl font-bold text-emerald-600 mt-1">{formatCurrency(paidFines)}</p>
                </Card>
                <Card padding="sm">
                  <p className="text-xs text-slate-500">Denda Belum Bayar</p>
                  <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(unpaidFines)}</p>
                </Card>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Anggota</TableHead>
                    <TableHead>Buku</TableHead>
                    <TableHead>Hari Terlambat</TableHead>
                    <TableHead>Nominal</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFines.map(fine => (
                    <TableRow key={fine.id}>
                      <TableCell>{fine.memberName}</TableCell>
                      <TableCell>{fine.bookTitle}</TableCell>
                      <TableCell>{fine.overdueDays}</TableCell>
                      <TableCell>{formatCurrency(fine.fineAmount)}</TableCell>
                      <TableCell><Badge variant={getStatusVariant(fine.status)}>{getStatusLabel(fine.status)}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {activeTab === 'popular' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-slate-900 mb-4">Distribusi Kategori</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][i]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-4">Buku Paling Populer</h3>
                <div className="space-y-3">
                  {popularBooks.map((book, i) => (
                    <div key={book.title} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{book.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-600" style={{ width: `${(book.count / popularBooks[0].count) * 100}%` }} />
                          </div>
                          <span className="text-xs text-slate-500">{book.count}x</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card padding="sm"><p className="text-xs text-slate-500">Anggota Terdaftar</p><p className="text-xl font-bold mt-1">{members.length}</p></Card>
                <Card padding="sm"><p className="text-xs text-slate-500">Anggota Aktif</p><p className="text-xl font-bold mt-1">{members.filter(member => member.status === 'active').length}</p></Card>
                <Card padding="sm"><p className="text-xs text-slate-500">Transaksi Periode Ini</p><p className="text-xl font-bold mt-1">{filteredTransactions.length}</p></Card>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Anggota</TableHead><TableHead>Kategori</TableHead><TableHead>Kelas/Departemen</TableHead><TableHead>Total Transaksi</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>{memberStatistics.map(member => (
                  <TableRow key={member.id}>
                    <TableCell>{member.fullName}</TableCell><TableCell className="capitalize">{member.category}</TableCell><TableCell>{member.classOrDepartment}</TableCell><TableCell>{member.transactionCount}</TableCell><TableCell><Badge variant={getStatusVariant(member.status)}>{getStatusLabel(member.status)}</Badge></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>
          )}
        </div>
      </Card>
    </AppLayout>
  );
}