'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { BookCover } from '@/components/features/book-cover';
import { Modal } from '@/components/ui/modal';
import { BarcodeScanner } from '@/components/features/barcode-scanner';
import { useAppState, useRole, useToast } from '@/lib/context';
import { formatShortDate, calculateOverdueDays, formatCurrency, getStatusVariant, getLocalDateInputValue } from '@/lib/utils';
import { Search, ArrowRightLeft, Check, Scan } from 'lucide-react';
import Link from 'next/link';

export default function ReturnsPage() {
  const { transactions, librarySettings, returnTransaction } = useAppState();
  const { currentRole } = useRole();
  const { toast } = useToast();
  const isLibraryStaff = currentRole === 'admin' || currentRole === 'librarian' || currentRole === 'staff';
  const [search, setSearch] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [selectedTrx, setSelectedTrx] = useState<string | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);

  const activeTransactions = transactions.filter(transaction => transaction.status !== 'returned');
  const filteredTransactions = activeTransactions.filter(t =>
    !search ||
    t.transactionId.toLowerCase().includes(search.toLowerCase()) ||
    t.memberName.toLowerCase().includes(search.toLowerCase()) ||
    t.memberNumber.toLowerCase().includes(search.toLowerCase()) ||
    t.books.some(book =>
      book.title.toLowerCase().includes(search.toLowerCase()) ||
      book.bookCode.toLowerCase().includes(search.toLowerCase())
    )
  );

  const transaction = transactions.find(t => t.id === selectedTrx);
  const overdueDays = transaction ? calculateOverdueDays(transaction.dueDate) : 0;
  const fine = librarySettings?.automaticFines
    ? Math.min(overdueDays * librarySettings.finePerDay, librarySettings.maxFine ?? 50000)
    : 0;

  if (!isLibraryStaff) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Pengembalian' }]} title="Pengembalian">
        <Card>
          <div className="py-8 text-center">
            <ArrowRightLeft className="mx-auto mb-3 h-10 w-10 text-slate-400" />
            <h2 className="font-semibold text-slate-900">Pengembalian diproses pustakawan</h2>
            <p className="mt-2 text-sm text-slate-600">
              Akun anggota dapat melihat transaksi sendiri di riwayat peminjaman, tetapi tidak dapat mencatat pengembalian.
            </p>
            <Link href="/borrowing" className="mt-4 inline-block text-sm font-medium text-primary-600 hover:text-primary-700">
              Buka riwayat peminjaman
            </Link>
          </div>
        </Card>
      </AppLayout>
    );
  }

  const handleReturn = async () => {
    if (!transaction) return;
    try {
      await returnTransaction(transaction.id, getLocalDateInputValue(), fine > 0 ? fine : undefined);
      toast('success', 'Pengembalian berhasil dicatat',
        fine > 0 ? `Denda: ${formatCurrency(fine)}` : 'Transaksi pengembalian telah disimpan.');
      setShowReturnModal(false);
      setSelectedTrx(null);
    } catch (error) {
      toast('error', 'Gagal mencatat pengembalian', error instanceof Error ? error.message : 'Coba lagi.');
    }
  };

  return (
    <AppLayout
      breadcrumbs={[{ label: 'Pengembalian' }]}
      title="Pengembalian Buku"
      description="Proses pengembalian buku dari anggota"
    >
      <Card padding="sm" className="mb-6">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Input
              placeholder="Cari ID transaksi, nama, nomor anggota, atau kode buku..."
              icon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button variant="outline" onClick={() => setShowScanner(previous => !previous)}>
              <Scan className="w-4 h-4" />{showScanner ? 'Tutup scanner' : 'Scan'}
            </Button>
          </div>
          {showScanner && (
            <div className="max-w-md">
              <BarcodeScanner
                onDetected={code => {
                  setSearch(code);
                  const found = activeTransactions.some(transaction =>
                    transaction.transactionId.toLowerCase() === code.trim().toLowerCase() ||
                    transaction.memberNumber.toLowerCase() === code.trim().toLowerCase() ||
                    transaction.books.some(book => book.bookCode.toLowerCase() === code.trim().toLowerCase())
                  );
                  if (found) {
                    toast('info', 'Peminjaman ditemukan', 'Pilih transaksi yang sesuai untuk memproses pengembalian.');
                  } else {
                    toast('warning', 'Tidak ada peminjaman aktif untuk kode ini', code);
                  }
                }}
                onError={error => toast('error', 'Tidak dapat membuka kamera', error.message)}
              />
              <p className="mt-2 text-xs text-slate-500">
                Scan kode buku atau kartu anggota untuk menyaring transaksi aktif. Pengembalian diproses per transaksi.
              </p>
            </div>
          )}
        </div>
      </Card>

      {filteredTransactions.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <ArrowRightLeft className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Tidak ada peminjaman aktif</h3>
            <p className="text-sm text-slate-500">Semua buku telah dikembalikan</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTransactions.map(trx => {
            const days = calculateOverdueDays(trx.dueDate);
            return (
              <Card key={trx.id} padding="sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Avatar name={trx.memberName} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{trx.memberName}</p>
                      <p className="text-xs text-slate-500">{trx.memberNumber}</p>
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(trx.status)}>
                    {calculateOverdueDays(trx.dueDate) > 0 || trx.status === 'overdue' ? 'Terlambat' : trx.status === 'extended' ? 'Diperpanjang' : 'Aktif'}
                  </Badge>
                </div>
                <code className="text-xs bg-slate-100 px-2 py-1 rounded block mb-3">{trx.transactionId}</code>
                <div className="space-y-1 mb-3">
                  {trx.books.map(book => (
                    <div key={book.bookId} className="flex items-center gap-2 text-xs text-slate-600">
                      <BookCover src={book.coverImage} alt={book.title} className="w-6 h-8 rounded object-cover" />
                      <span className="truncate">{book.title}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 mb-3">
                  <p>Jatuh tempo: {formatShortDate(trx.dueDate)}</p>
                  {days > 0 && <p className="text-red-600 font-medium mt-1">Terlambat {days} hari</p>}
                </div>
                <Button size="sm" className="w-full" onClick={() => { setSelectedTrx(trx.id); setShowReturnModal(true); }}>
                  <Check className="w-4 h-4" />
                  Proses Pengembalian
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        title="Konfirmasi Pengembalian"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowReturnModal(false)}>Batal</Button>
            <Button onClick={handleReturn}>Konfirmasi</Button>
          </>
        }
      >
        {transaction && (
          <div>
            <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-slate-50">
              <Avatar name={transaction.memberName} />
              <div>
                <p className="font-medium text-slate-900">{transaction.memberName}</p>
                <p className="text-xs text-slate-500">{transaction.memberNumber}</p>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              {transaction.books.map(book => (
                <div key={book.bookId} className="flex items-center gap-2 p-2 rounded border border-slate-200">
                  <BookCover src={book.coverImage} alt={book.title} className="w-8 h-10 rounded object-cover" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{book.title}</p>
                    <p className="text-xs text-slate-500">{book.bookCode}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 rounded-lg bg-slate-50 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Tanggal Pengembalian</span>
                <span className="font-medium text-slate-900">{formatShortDate(getLocalDateInputValue())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Jatuh Tempo</span>
                <span className="font-medium text-slate-900">{formatShortDate(transaction.dueDate)}</span>
              </div>
              {overdueDays > 0 && librarySettings ? (
                <>
                  <div className="flex justify-between text-red-600">
                    <span>Keterlambatan</span>
                    <span className="font-medium">{overdueDays} hari</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="font-medium text-slate-900">Denda</span>
                    <span className="font-bold text-red-600">{formatCurrency(fine)}</span>
                  </div>
                </>
              ) : overdueDays > 0 ? (
                <p className="pt-2 border-t border-slate-200 text-xs text-amber-700">Konfigurasi denda tidak tersedia; server menghitung nominal sesuai kebijakan tersimpan.</p>
              ) : (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-200 text-emerald-600">
                  <Check className="w-4 h-4" />
                  <span className="font-medium">Tidak ada denda</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}