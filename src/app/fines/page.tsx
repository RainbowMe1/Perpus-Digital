'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Tabs } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useAppState, useRole, useToast } from '@/lib/context';
import { formatCurrency, formatShortDate, getStatusVariant, getStatusLabel } from '@/lib/utils';
import { DollarSign, Check, Settings } from 'lucide-react';

export default function FinesPage() {
  const { fines, librarySettings, updateLibrarySettings, setFineStatus } = useAppState();
  const { currentRole } = useRole();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('records');
  const [showPayModal, setShowPayModal] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [finePerDay, setFinePerDay] = useState(librarySettings?.finePerDay ?? 1000);
  const [maxFine, setMaxFine] = useState(librarySettings?.maxFine ?? 50000);
  const [automaticFines, setAutomaticFines] = useState(librarySettings?.automaticFines ?? true);
  const [saving, setSaving] = useState(false);
  const isStaff = currentRole === 'admin' || currentRole === 'librarian' || currentRole === 'staff';
  const isAdmin = currentRole === 'admin';

  const stats = {
    total: fines.reduce((sum, fine) => sum + fine.fineAmount, 0),
    paid: fines.filter(fine => fine.status === 'paid').reduce((sum, fine) => sum + fine.fineAmount, 0),
    unpaid: fines.filter(fine => fine.status === 'unpaid').reduce((sum, fine) => sum + fine.fineAmount, 0),
  };

  const openSettings = () => {
    if (!librarySettings) {
      toast('error', 'Pengaturan belum tersedia', 'Pastikan migrasi Supabase Tahap 2 sudah dijalankan.');
      return;
    }
    setFinePerDay(librarySettings.finePerDay);
    setMaxFine(librarySettings.maxFine ?? 50000);
    setAutomaticFines(librarySettings.automaticFines ?? true);
    setShowSettingsModal(true);
  };

  const handlePay = async (id: string) => {
    setSaving(true);
    try {
      await setFineStatus(id, 'paid');
      toast('success', 'Pembayaran denda dicatat');
      setShowPayModal(null);
    } catch (error) {
      toast('error', 'Gagal mencatat pembayaran', error instanceof Error ? error.message : 'Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingsSave = async () => {
    if (!librarySettings || !Number.isFinite(finePerDay) || finePerDay < 0 ||
      !Number.isFinite(maxFine) || maxFine < 0) {
      toast('error', 'Konfigurasi tidak valid', 'Nilai denda harus berupa angka nol atau lebih.');
      return;
    }
    setSaving(true);
    try {
      await updateLibrarySettings({
        ...librarySettings,
        finePerDay,
        maxFine,
        automaticFines,
      });
      toast('success', 'Konfigurasi denda disimpan');
      setShowSettingsModal(false);
    } catch (error) {
      toast('error', 'Gagal menyimpan konfigurasi', error instanceof Error ? error.message : 'Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout
      breadcrumbs={[{ label: 'Denda' }]}
      title={isStaff ? 'Manajemen Denda' : 'Denda Saya'}
      description={isStaff
        ? 'Kelola denda keterlambatan pengembalian'
        : 'Denda yang terkait dengan transaksi akun anggota ini.'}
      actions={isAdmin ? (
        <Button variant="outline" onClick={openSettings} icon={<Settings className="w-4 h-4" />}>
          Konfigurasi
        </Button>
      ) : undefined}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Denda', amount: stats.total, style: 'bg-blue-100 text-blue-600' },
          { label: 'Sudah Dibayar', amount: stats.paid, style: 'bg-emerald-100 text-emerald-600' },
          { label: 'Belum Dibayar', amount: stats.unpaid, style: 'bg-red-100 text-red-600' },
        ].map(stat => (
          <Card key={stat.label} padding="sm">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.style}`}>
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{stat.label}</p>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(stat.amount)}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card padding="none">
        <Tabs
          tabs={[
            { id: 'records', label: 'Catatan Denda' },
            { id: 'unpaid', label: 'Belum Dibayar', count: fines.filter(fine => fine.status === 'unpaid').length },
            { id: 'paid', label: 'Lunas', count: fines.filter(fine => fine.status === 'paid').length },
            { id: 'waived', label: 'Dihapus', count: fines.filter(fine => fine.status === 'waived').length },
          ]}
          defaultTab={activeTab}
          onChange={setActiveTab}
        />
        <div className="p-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Anggota</TableHead>
                <TableHead>ID Transaksi</TableHead>
                <TableHead>Buku</TableHead>
                <TableHead>Terlambat</TableHead>
                <TableHead>Nominal</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fines
                .filter(fine => activeTab === 'records' || fine.status === activeTab)
                .map(fine => (
                  <TableRow key={fine.id}>
                    <TableCell className="font-medium text-slate-900">{fine.memberName}</TableCell>
                    <TableCell><code className="text-xs bg-slate-100 px-2 py-1 rounded">{fine.transactionId}</code></TableCell>
                    <TableCell>{fine.bookTitle}</TableCell>
                    <TableCell>{fine.overdueDays} hari</TableCell>
                    <TableCell className="font-medium">{formatCurrency(fine.fineAmount)}</TableCell>
                    <TableCell>{formatShortDate(fine.issuedDate)}</TableCell>
                    <TableCell><Badge variant={getStatusVariant(fine.status)}>{getStatusLabel(fine.status)}</Badge></TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        {isStaff && fine.status === 'unpaid' && (
                          <Button size="sm" onClick={() => setShowPayModal(fine.id)}>
                            <Check className="w-3.5 h-3.5" /> Catat Pembayaran
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          {fines.filter(fine => activeTab === 'records' || fine.status === activeTab).length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">Tidak ada catatan denda.</p>
          )}
        </div>
      </Card>

      <Modal
        isOpen={showPayModal !== null}
        onClose={() => setShowPayModal(null)}
        title="Konfirmasi Pembayaran"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowPayModal(null)}>Batal</Button>
            <Button loading={saving} onClick={() => showPayModal && void handlePay(showPayModal)}>Konfirmasi</Button>
          </>
        }
      >
        {showPayModal && (() => {
          const fine = fines.find(item => item.id === showPayModal);
          if (!fine) return null;
          return (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Konfirmasi pencatatan pembayaran manual untuk {fine.memberName}?</p>
              <div className="flex justify-between text-sm"><span>Buku</span><span className="font-medium">{fine.bookTitle}</span></div>
              <div className="flex justify-between text-sm"><span>Keterlambatan</span><span className="font-medium">{fine.overdueDays} hari</span></div>
              <div className="flex justify-between text-sm border-t pt-3"><span>Total Denda</span><span className="font-bold">{formatCurrency(fine.fineAmount)}</span></div>
            </div>
          );
        })()}
      </Modal>

      <Modal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="Konfigurasi Denda"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowSettingsModal(false)}>Batal</Button>
            <Button loading={saving} onClick={() => void handleSettingsSave()}>Simpan</Button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Denda per Hari (Rp)
            <input type="number" min="0" value={finePerDay} onChange={event => setFinePerDay(Number(event.target.value))} className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Maksimal Denda (Rp)
            <input type="number" min="0" value={maxFine} onChange={event => setMaxFine(Number(event.target.value))} className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={automaticFines} onChange={event => setAutomaticFines(event.target.checked)} className="rounded" />
            <span className="text-sm text-slate-700">Aktifkan denda otomatis saat pengembalian</span>
          </label>
        </div>
      </Modal>
    </AppLayout>
  );
}
