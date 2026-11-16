'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { useAppState, useRole, useToast } from '@/lib/context';
import { Procurement } from '@/lib/types';
import { formatShortDate, formatCurrency, getStatusVariant, getStatusLabel, getLocalDateInputValue } from '@/lib/utils';
import { Package, Plus, Edit2, PackageCheck } from 'lucide-react';

const emptyForm = {
  bookTitle: '',
  author: '',
  source: 'purchase' as Procurement['source'],
  quantity: '1',
  acquisitionDate: getLocalDateInputValue(),
  cost: '',
};

export default function ProcurementPage() {
  const { books, procurements, addProcurement, updateProcurement, receiveProcurement } = useAppState();
  const { currentRole } = useRole();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [receiving, setReceiving] = useState<Procurement | null>(null);
  const [targetBookId, setTargetBookId] = useState('');
  const [saving, setSaving] = useState(false);
  const isStaff = currentRole === 'admin' || currentRole === 'librarian' || currentRole === 'staff';

  const stats = {
    total: procurements.length,
    pending: procurements.filter(item => item.status === 'pending').length,
    totalCost: procurements.reduce((sum, item) => sum + (item.cost || 0), 0),
  };

  const openNewModal = () => {
    setEditingId(null);
    setForm({ ...emptyForm, acquisitionDate: getLocalDateInputValue() });
    setShowModal(true);
  };

  const openEditModal = (item: Procurement) => {
    setEditingId(item.id);
    setForm({
      bookTitle: item.bookTitle,
      author: item.author,
      source: item.source,
      quantity: String(item.quantity),
      acquisitionDate: item.acquisitionDate,
      cost: item.cost === undefined ? '' : String(item.cost),
    });
    setShowModal(true);
  };

  const openReceiveModal = (item: Procurement) => {
    const matchingBook = books.find(book => !book.isDigital &&
      book.title.trim().toLocaleLowerCase() === item.bookTitle.trim().toLocaleLowerCase() &&
      book.author.trim().toLocaleLowerCase() === item.author.trim().toLocaleLowerCase()
    );
    setReceiving(item);
    setTargetBookId(matchingBook?.id ?? '');
  };

  const handleReceive = async () => {
    if (!receiving) return;
    setSaving(true);
    try {
      await receiveProcurement(receiving.id, targetBookId || undefined);
      toast('success', 'Pengadaan diterima', 'Jumlah stok buku berhasil diperbarui.');
      setReceiving(null);
    } catch (error) {
      toast('error', 'Gagal menerima pengadaan', error instanceof Error ? error.message : 'Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const quantity = Number(form.quantity);
    const cost = form.cost.trim() ? Number(form.cost) : undefined;
    if (!form.bookTitle.trim() || !form.author.trim() || !Number.isInteger(quantity) || quantity <= 0 ||
      !form.acquisitionDate || (cost !== undefined && (!Number.isFinite(cost) || cost < 0))) {
      toast('error', 'Data pengadaan tidak valid', 'Periksa judul, penulis, jumlah, tanggal, dan biaya.');
      return;
    }

    setSaving(true);
    try {
      const updates = {
        bookTitle: form.bookTitle.trim(),
        author: form.author.trim(),
        source: form.source,
        quantity,
        acquisitionDate: form.acquisitionDate,
        cost,
      };
      if (editingId) {
        await updateProcurement(editingId, updates);
      } else {
        await addProcurement(updates);
      }
      toast('success', editingId ? 'Pengadaan diperbarui' : 'Pengadaan berhasil dicatat');
      setShowModal(false);
      setEditingId(null);
    } catch (error) {
      toast('error', 'Gagal menyimpan pengadaan', error instanceof Error ? error.message : 'Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout
      breadcrumbs={[{ label: 'Pengadaan' }]}
      title="Pengadaan Buku"
      description="Kelola catatan pengadaan dan akuisisi buku"
      actions={isStaff ? (
        <Button onClick={openNewModal} icon={<Plus className="w-4 h-4" />}>Catat Pengadaan</Button>
      ) : undefined}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card padding="sm"><p className="text-xs text-slate-500">Total Pengadaan</p><p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p></Card>
        <Card padding="sm"><p className="text-xs text-slate-500">Menunggu</p><p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</p></Card>
        <Card padding="sm"><p className="text-xs text-slate-500">Total Biaya</p><p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(stats.totalCost)}</p></Card>
      </div>

      <Card padding="none">
        {procurements.length === 0 ? (
          <div className="p-6"><EmptyState icon={<Package className="w-8 h-8" />} title="Belum ada pengadaan" description="Catatan pengadaan yang ditambahkan akan muncul di sini." /></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Judul Buku</TableHead><TableHead>Penulis</TableHead><TableHead>Sumber</TableHead>
                  <TableHead>Jumlah</TableHead><TableHead>Tanggal</TableHead><TableHead>Biaya</TableHead>
                  <TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {procurements.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-slate-900">{item.bookTitle}</TableCell>
                    <TableCell>{item.author}</TableCell>
                    <TableCell><Badge variant={item.source === 'purchase' ? 'info' : item.source === 'donation' ? 'success' : 'warning'}>{item.source === 'purchase' ? 'Pembelian' : item.source === 'donation' ? 'Hibah' : 'Pertukaran'}</Badge></TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatShortDate(item.acquisitionDate)}</TableCell>
                    <TableCell>{item.cost ? formatCurrency(item.cost) : '-'}</TableCell>
                    <TableCell><Badge variant={getStatusVariant(item.status)}>{getStatusLabel(item.status)}</Badge></TableCell>
                    <TableCell>
                      {isStaff && <div className="flex justify-end gap-1">
                        {!item.stockReceived && <Button size="sm" variant="ghost" aria-label="Terima pengadaan dan tambahkan ke stok" onClick={() => openReceiveModal(item)}><PackageCheck className="w-4 h-4" /></Button>}
                        {item.status === 'pending' && !item.stockReceived && <Button size="sm" variant="ghost" aria-label="Edit pengadaan" onClick={() => openEditModal(item)}><Edit2 className="w-4 h-4" /></Button>}
                      </div>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Pengadaan' : 'Catat Pengadaan Baru'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>Batal</Button>
            <Button loading={saving} onClick={() => void handleSave()}>Simpan</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><Input label="Judul Buku" placeholder="Masukkan judul buku" required value={form.bookTitle} onChange={event => setForm(previous => ({ ...previous, bookTitle: event.target.value }))} /></div>
          <Input label="Penulis" placeholder="Nama penulis" required value={form.author} onChange={event => setForm(previous => ({ ...previous, author: event.target.value }))} />
          <Select label="Sumber" value={form.source} onChange={event => {
            const value = event.target.value;
            if (value === 'purchase' || value === 'donation' || value === 'exchange') setForm(previous => ({ ...previous, source: value }));
          }} options={[{ value: 'purchase', label: 'Pembelian' }, { value: 'donation', label: 'Hibah' }, { value: 'exchange', label: 'Pertukaran' }]} />
          <Input label="Jumlah" type="number" min="1" required value={form.quantity} onChange={event => setForm(previous => ({ ...previous, quantity: event.target.value }))} />
          <Input label="Biaya (Rp)" type="number" min="0" value={form.cost} onChange={event => setForm(previous => ({ ...previous, cost: event.target.value }))} />
          <Input label="Tanggal" type="date" required value={form.acquisitionDate} onChange={event => setForm(previous => ({ ...previous, acquisitionDate: event.target.value }))} />
        </div>
      </Modal>

      <Modal
        isOpen={receiving !== null}
        onClose={() => setReceiving(null)}
        title="Terima Pengadaan"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setReceiving(null)}>Batal</Button>
            <Button loading={saving} onClick={() => void handleReceive()}>Terima & Tambahkan ke Stok</Button>
          </>
        }
      >
        {receiving && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {receiving.bookTitle} — {receiving.author}, {receiving.quantity} eksemplar.
              Penerimaan hanya dapat diproses satu kali.
            </p>
            <Select
              label="Buku tujuan"
              value={targetBookId}
              onChange={event => setTargetBookId(event.target.value)}
              options={[
                { value: '', label: 'Buat entri buku baru dari pengadaan' },
                ...books.filter(book => !book.isDigital).map(book => ({ value: book.id, label: `${book.title} — ${book.author} (stok ${book.availableStock})` })),
              ]}
            />
            <p className="text-xs text-slate-500">
              Pilih buku yang sudah ada untuk menambah stoknya. Jika membuat buku baru,
              kode inventaris akan dibuat otomatis; detail katalog dapat dilengkapi di Manajemen Buku.
            </p>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
