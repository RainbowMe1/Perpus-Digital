'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs } from '@/components/ui/tabs';
import { Avatar } from '@/components/ui/avatar';
import { useAppState, useRole, useToast } from '@/lib/context';
import { LibrarySettings } from '@/lib/types';
import { Building2, BookOpen, Bell, Database, Download, ImagePlus, Save, UserRound } from 'lucide-react';

const defaultPreferences: Record<string, boolean> = {
  emailDueReminder: true,
  emailOverdue: true,
  emailBorrowing: true,
  emailReturn: true,
  appAnnouncement: true,
  appReservation: true,
  appNewBooks: false,
};

export default function SettingsPage() {
  const {
    books, members, transactions, reservations, reviews, fines, procurements,
    librarySettings, updateLibrarySettings, updateMyProfile, updateMyProfileAvatar, refreshData,
  } = useAppState();
  const { currentRole, currentUser } = useRole();
  const { toast } = useToast();
  const isAdmin = currentRole === 'admin';
  const ownMember = members.find(member => member.userId === currentUser?.id);
  const [activeTab, setActiveTab] = useState('account');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [classOrDepartment, setClassOrDepartment] = useState('');
  const [settings, setSettings] = useState<LibrarySettings | null>(null);
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [saving, setSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>();

  useEffect(() => {
    setFullName(currentUser?.name ?? '');
    setPhone(ownMember?.phone ?? '');
    setClassOrDepartment(ownMember?.classOrDepartment ?? '');
  }, [currentUser, ownMember]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(undefined);
      return;
    }
    const previewUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [avatarFile]);

  useEffect(() => {
    if (!librarySettings) return;
    setSettings(librarySettings);
    setPreferences({ ...defaultPreferences, ...librarySettings.notificationPreferences });
  }, [librarySettings]);

  const saveAccount = async () => {
    if (!fullName.trim() || !phone.trim() || !classOrDepartment.trim()) {
      toast('error', 'Profil belum lengkap', 'Nama, telepon, dan kelas/departemen wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      await updateMyProfile(fullName.trim(), phone.trim(), classOrDepartment.trim());
      await refreshData();
      toast('success', 'Profil akun berhasil diperbarui');
    } catch (error) {
      toast('error', 'Gagal memperbarui profil', error instanceof Error ? error.message : 'Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setAvatarFile(file);
    event.target.value = '';
  };

  const saveAvatar = async () => {
    if (!avatarFile) return;
    setAvatarSaving(true);
    try {
      await updateMyProfileAvatar(avatarFile);
      setAvatarFile(null);
      toast('success', 'Foto profil berhasil diperbarui');
    } catch (error) {
      toast('error', 'Gagal memperbarui foto profil', error instanceof Error ? error.message : 'Coba lagi.');
    } finally {
      setAvatarSaving(false);
    }
  };

  const saveSettings = async () => {
    if (!settings || !settings.libraryName.trim() || !settings.libraryEmail.trim() ||
      !Number.isInteger(settings.maxBorrowDays) || settings.maxBorrowDays < 1 ||
      !Number.isInteger(settings.maxBooksPerMember) || settings.maxBooksPerMember < 1 ||
      !Number.isInteger(settings.maxExtensions) || settings.maxExtensions < 0 ||
      !Number.isFinite(settings.finePerDay) || settings.finePerDay < 0) {
      toast('error', 'Pengaturan tidak valid', 'Periksa nama, email, aturan pinjaman, dan nilai denda.');
      return;
    }
    setSaving(true);
    try {
      await updateLibrarySettings({ ...settings, notificationPreferences: preferences });
      toast('success', 'Pengaturan perpustakaan tersimpan');
    } catch (error) {
      toast('error', 'Gagal menyimpan pengaturan', error instanceof Error ? error.message : 'Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const downloadExport = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      books,
      members,
      transactions,
      reservations,
      reviews,
      fines,
      procurements,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `digital-library-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'account', label: 'Profil Akun', icon: <UserRound className="w-4 h-4" /> },
    ...(isAdmin ? [
      { id: 'library', label: 'Profil Perpustakaan', icon: <Building2 className="w-4 h-4" /> },
      { id: 'borrowing', label: 'Aturan Peminjaman', icon: <BookOpen className="w-4 h-4" /> },
      { id: 'notifications', label: 'Notifikasi', icon: <Bell className="w-4 h-4" /> },
      { id: 'backup', label: 'Ekspor Data', icon: <Database className="w-4 h-4" /> },
    ] : []),
  ];

  return (
    <AppLayout breadcrumbs={[{ label: 'Pengaturan' }]} title="Pengaturan" description="Kelola profil akun dan konfigurasi perpustakaan">
      <Card padding="none">
        <Tabs tabs={tabs} defaultTab={activeTab} onChange={setActiveTab} />
        <div className="p-6">
          {activeTab === 'account' && (
            <div className="max-w-2xl space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <Avatar src={avatarPreview ?? currentUser?.avatar} name={currentUser?.name ?? ''} size="lg" />
                <div className="min-w-0 flex-1">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <ImagePlus className="h-4 w-4" />
                    Pilih foto
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleAvatarChange}
                      className="sr-only"
                    />
                  </label>
                  <p className="mt-1 text-xs text-slate-500">JPG, PNG, atau WebP. Maksimal 3 MB.</p>
                  {avatarFile && <p className="mt-1 truncate text-xs text-slate-600">{avatarFile.name}</p>}
                </div>
                {avatarFile && (
                  <Button loading={avatarSaving} onClick={() => void saveAvatar()}>Simpan Foto</Button>
                )}
              </div>
              <Input label="Nama Lengkap" required value={fullName} onChange={event => setFullName(event.target.value)} />
              <Input label="Email" type="email" value={currentUser?.email ?? ''} disabled />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Telepon" required value={phone} onChange={event => setPhone(event.target.value)} />
                <Input label="Kelas / Departemen" required value={classOrDepartment} onChange={event => setClassOrDepartment(event.target.value)} />
              </div>
              <Button loading={saving} onClick={() => void saveAccount()} icon={<Save className="w-4 h-4" />}>Simpan Profil</Button>
            </div>
          )}

          {isAdmin && settings && activeTab === 'library' && (
            <div className="max-w-2xl space-y-4">
              <Input label="Nama Perpustakaan" value={settings.libraryName} onChange={event => setSettings({ ...settings, libraryName: event.target.value })} />
              <Input label="Alamat" value={settings.libraryAddress} onChange={event => setSettings({ ...settings, libraryAddress: event.target.value })} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Telepon" value={settings.libraryPhone} onChange={event => setSettings({ ...settings, libraryPhone: event.target.value })} />
                <Input label="Email" type="email" value={settings.libraryEmail} onChange={event => setSettings({ ...settings, libraryEmail: event.target.value })} />
              </div>
              <Button loading={saving} onClick={() => void saveSettings()} icon={<Save className="w-4 h-4" />}>Simpan Perubahan</Button>
            </div>
          )}

          {isAdmin && settings && activeTab === 'borrowing' && (
            <div className="max-w-2xl space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Durasi Peminjaman (hari)" type="number" min="1" value={settings.maxBorrowDays} onChange={event => setSettings({ ...settings, maxBorrowDays: Number(event.target.value) })} />
                <Input label="Maksimal Buku per Anggota" type="number" min="1" value={settings.maxBooksPerMember} onChange={event => setSettings({ ...settings, maxBooksPerMember: Number(event.target.value) })} />
                <Input label="Denda per Hari (Rp)" type="number" min="0" value={settings.finePerDay} onChange={event => setSettings({ ...settings, finePerDay: Number(event.target.value) })} />
                <Input label="Maksimal Perpanjangan" type="number" min="0" value={settings.maxExtensions} onChange={event => setSettings({ ...settings, maxExtensions: Number(event.target.value) })} />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={settings.allowExtensions} onChange={event => setSettings({ ...settings, allowExtensions: event.target.checked })} className="rounded" />
                Izinkan perpanjangan peminjaman
              </label>
              <Button loading={saving} onClick={() => void saveSettings()} icon={<Save className="w-4 h-4" />}>Simpan Perubahan</Button>
            </div>
          )}

          {isAdmin && settings && activeTab === 'notifications' && (
            <div className="max-w-2xl space-y-4">
              {[
                ['emailDueReminder', 'Pengingat jatuh tempo'],
                ['emailOverdue', 'Notifikasi keterlambatan'],
                ['emailBorrowing', 'Konfirmasi peminjaman'],
                ['emailReturn', 'Konfirmasi pengembalian'],
                ['appAnnouncement', 'Pengumuman perpustakaan'],
                ['appReservation', 'Reservasi siap diambil'],
                ['appNewBooks', 'Buku baru tersedia'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <input type="checkbox" checked={preferences[key]} onChange={event => setPreferences(previous => ({ ...previous, [key]: event.target.checked }))} className="rounded" />
                  <span className="text-sm text-slate-700">{label}</span>
                </label>
              ))}
              <p className="text-xs text-slate-500">Preferensi ini menyimpan konfigurasi notifikasi. Pengiriman email memerlukan penyedia email yang dikonfigurasi terpisah.</p>
              <Button loading={saving} onClick={() => void saveSettings()} icon={<Save className="w-4 h-4" />}>Simpan Perubahan</Button>
            </div>
          )}

          {isAdmin && activeTab === 'backup' && (
            <div className="max-w-2xl space-y-4">
              <p className="text-sm text-slate-600">Ekspor file JSON lokal dari data yang dapat diakses akun ini. Ini bukan backup database penuh dan tidak mencakup file Storage atau data autentikasi.</p>
              <Button onClick={downloadExport} icon={<Download className="w-4 h-4" />}>Unduh Ekspor Data</Button>
              <p className="text-xs text-slate-500">Restore dinonaktifkan di aplikasi karena penggantian data produksi memerlukan prosedur backup dan pemulihan database yang aman.</p>
            </div>
          )}

          {isAdmin && !settings && activeTab !== 'account' && activeTab !== 'backup' && (
            <p className="text-sm text-amber-700">Pengaturan belum tersedia. Jalankan migrasi Supabase Tahap 2, lalu muat ulang halaman.</p>
          )}
        </div>
      </Card>
    </AppLayout>
  );
}
