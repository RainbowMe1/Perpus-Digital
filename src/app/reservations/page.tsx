'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Tabs } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { useAppState, useRole, useToast } from '@/lib/context';
import { formatShortDate, getStatusVariant, getStatusLabel } from '@/lib/utils';
import { Calendar, X, Check, Clock, Plus } from 'lucide-react';

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message.trim()
  ) {
    return error.message;
  }
  return 'Coba lagi.';
}

export default function ReservationsPage() {
  const { reservations, books, addReservation, cancelReservation, setReservationStatus } = useAppState();
  const { currentRole } = useRole();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [saving, setSaving] = useState(false);
  const isStaff = currentRole === 'admin' || currentRole === 'librarian' || currentRole === 'staff';
  const availableForReservation = books.filter(book => book.availableStock === 0);
  const isBookAvailable = (bookId: string) =>
    books.some(book => book.id === bookId && book.availableStock > 0);

  const filteredReservations = activeTab === 'all'
    ? reservations
    : reservations.filter(r => r.status === activeTab);

  const handleAdd = async () => {
    if (!selectedBookId) {
      toast('error', 'Pilih buku terlebih dahulu');
      return;
    }
    setSaving(true);
    try {
      await addReservation(selectedBookId);
      toast('success', 'Reservasi berhasil dibuat');
      setShowAddModal(false);
      setSelectedBookId('');
    } catch (error) {
      toast('error', 'Gagal membuat reservasi', getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const runReservationAction = async (id: string, action: 'cancelled' | 'ready' | 'fulfilled') => {
    try {
      if (action === 'cancelled') await cancelReservation(id);
      else await setReservationStatus(id, action);
      toast('success', action === 'cancelled' ? 'Reservasi dibatalkan' : action === 'ready' ? 'Reservasi ditandai siap' : 'Reservasi ditandai selesai');
    } catch (error) {
      toast('error', 'Gagal memperbarui reservasi', getErrorMessage(error));
    }
  };

  return (
    <AppLayout
      breadcrumbs={[{ label: 'Reservasi' }]}
      title={isStaff ? 'Manajemen Reservasi' : 'Reservasi Saya'}
      description={isStaff
        ? 'Kelola reservasi buku dari anggota'
        : 'Reservasi yang dibuat oleh akun anggota ini.'}
      actions={
        <Button
          onClick={() => setShowAddModal(true)}
          disabled={availableForReservation.length === 0}
          icon={<Plus className="w-4 h-4" />}
        >
          Reservasi Buku
        </Button>
      }
    >
      <Card padding="none">
        <Tabs
          tabs={[
            { id: 'all', label: 'Semua', count: reservations.length },
            { id: 'pending', label: 'Menunggu', count: reservations.filter(r => r.status === 'pending').length },
            { id: 'ready', label: 'Siap', count: reservations.filter(r => r.status === 'ready').length },
            { id: 'fulfilled', label: 'Selesai', count: reservations.filter(r => r.status === 'fulfilled').length },
            { id: 'cancelled', label: 'Dibatalkan', count: reservations.filter(r => r.status === 'cancelled').length },
          ]}
          defaultTab={activeTab}
          onChange={setActiveTab}
        />
        <div className="p-6">
          {filteredReservations.length === 0 ? (
            <EmptyState
              icon={<Calendar className="w-8 h-8" />}
              title="Tidak ada reservasi"
              description="Belum ada reservasi pada kategori ini"
            />
          ) : (
            <div className="space-y-3">
              {filteredReservations.map(res => (
                <div key={res.id} className="flex items-center gap-4 p-4 rounded-lg border border-slate-200">
                  <Avatar name={res.memberName} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{res.memberName}</p>
                    <p className="text-sm text-slate-600 truncate">{res.bookTitle}</p>
                    {isStaff && res.status === 'pending' && !isBookAvailable(res.bookId) && (
                      <p className="mt-1 text-xs text-amber-700">Buku belum tersedia untuk diambil.</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span>Reservasi: {formatShortDate(res.reservationDate)}</span>
                      {res.queuePosition && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Antrian #{res.queuePosition}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(res.status)}>{getStatusLabel(res.status)}</Badge>
                  <div className="flex gap-1">
                    {(res.status === 'pending' || res.status === 'ready') && (
                      <>
                        {isStaff && res.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!isBookAvailable(res.bookId)}
                            onClick={() => void runReservationAction(res.id, 'ready')}
                          >
                            <Check className="w-3.5 h-3.5" /> Siap
                          </Button>
                        )}
                        {isStaff && res.status === 'ready' && (
                          <Button size="sm" onClick={() => void runReservationAction(res.id, 'fulfilled')}>
                            Selesaikan
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => void runReservationAction(res.id, 'cancelled')}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Reservasi Buku"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Batal</Button>
            <Button loading={saving} onClick={() => void handleAdd()}>Buat Reservasi</Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-600">Buku yang dapat direservasi saat ini tidak tersedia di rak.</p>
        <Select
          label="Buku"
          value={selectedBookId}
          onChange={event => setSelectedBookId(event.target.value)}
          options={[
            { value: '', label: 'Pilih buku...' },
            ...availableForReservation.map(book => ({ value: book.id, label: `${book.title} — ${book.author}` })),
          ]}
        />
      </Modal>
    </AppLayout>
  );
}