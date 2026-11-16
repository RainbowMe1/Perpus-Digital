'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { useAppState, useRole, useToast } from '@/lib/context';
import { formatShortDate, getLocalDateInputValue } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';

export default function ExtensionsPage() {
  const { transactions, updateTransaction, librarySettings } = useAppState();
  const { currentRole } = useRole();
  const { toast } = useToast();
  const [selectedTrx, setSelectedTrx] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const isStaff = currentRole === 'admin' || currentRole === 'librarian' || currentRole === 'staff';
  const maxExtensions = librarySettings?.maxExtensions ?? 0;
  const eligibleTransactions = transactions.filter(transaction =>
    isStaff && librarySettings?.allowExtensions &&
    (transaction.status === 'active' || transaction.status === 'extended') &&
    transaction.dueDate >= getLocalDateInputValue() &&
    (transaction.extendedDays ?? 0) < maxExtensions * 7
  );

  const trx = transactions.find(t => t.id === selectedTrx);

  const handleExtend = async () => {
    if (!trx) return;
    const newDueDate = new Date(`${trx.dueDate}T00:00:00`);
    newDueDate.setDate(newDueDate.getDate() + 7);
    const dueDate = getLocalDateInputValue(newDueDate);
    try {
      await updateTransaction(trx.id, {
        dueDate,
        status: 'extended',
        extendedDays: (trx.extendedDays ?? 0) + 7,
      });
      toast('success', 'Peminjaman berhasil diperpanjang', `Jatuh tempo baru: ${formatShortDate(dueDate)}`);
      setShowModal(false);
      setSelectedTrx(null);
    } catch (error) {
      toast('error', 'Gagal memperpanjang peminjaman', error instanceof Error ? error.message : 'Coba lagi.');
    }
  };

  return (
    <AppLayout
      breadcrumbs={[{ label: 'Perpanjangan' }]}
      title="Perpanjangan Peminjaman"
      description="Perpanjang masa peminjaman buku"
    >
      {eligibleTransactions.length === 0 ? (
        <Card>
          <EmptyState
            icon={<RefreshCw className="w-8 h-8" />}
            title="Tidak ada peminjaman yang bisa diperpanjang"
            description={!isStaff ? 'Hanya petugas perpustakaan yang dapat memproses perpanjangan.' : 'Perpanjangan mungkin dinonaktifkan, batas sudah tercapai, atau tidak ada transaksi yang memenuhi syarat.'}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {eligibleTransactions.map(t => (
            <Card key={t.id} padding="sm">
              <div className="flex items-center gap-2 mb-3">
                <Avatar name={t.memberName} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{t.memberName}</p>
                  <p className="text-xs text-slate-500">{t.transactionId}</p>
                </div>
              </div>
              <div className="space-y-1 mb-3">
                {t.books.map(b => (
                  <p key={b.bookId} className="text-xs text-slate-600 truncate">â€¢ {b.title}</p>
                ))}
              </div>
              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 mb-3">
                <p>Jatuh tempo saat ini: <span className="font-medium text-slate-900">{formatShortDate(t.dueDate)}</span></p>
              </div>
              <Button size="sm" className="w-full" onClick={() => { setSelectedTrx(t.id); setShowModal(true); }}>
                <RefreshCw className="w-3.5 h-3.5" /> Perpanjang 7 Hari
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Konfirmasi Perpanjangan"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>Batal</Button>
            <Button onClick={() => void handleExtend()}>Perpanjang</Button>
          </>
        }
      >
        {trx && (
          <div>
            <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-slate-50">
              <Avatar name={trx.memberName} />
              <div>
                <p className="font-medium text-slate-900">{trx.memberName}</p>
                <p className="text-xs text-slate-500">{trx.transactionId}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Jatuh tempo saat ini</span>
                <span className="font-medium text-slate-900">{formatShortDate(trx.dueDate)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Perpanjangan</span>
                <span className="font-medium text-emerald-600">+7 hari</span>
              </div>
              <div className="flex justify-between text-sm pt-3 border-t border-slate-200">
                <span className="text-slate-600">Jatuh tempo baru</span>
                <span className="font-bold text-primary-600">
                  {formatShortDate(new Date(new Date(trx.dueDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}