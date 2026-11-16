'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Clock3, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRole } from '@/lib/context';

export default function PendingApprovalPage() {
  const { authStatus, signOut, refreshProfile } = useRole();
  const rejected = authStatus === 'rejected';
  const [errorMessage, setErrorMessage] = useState('');
  const [checking, setChecking] = useState(false);

  const handleCheckStatus = async () => {
    setChecking(true);
    setErrorMessage('');
    try {
      await refreshProfile();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal memeriksa status akun.');
    } finally {
      setChecking(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal keluar. Coba lagi.');
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${rejected ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
          <Clock3 className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">{rejected ? 'Permintaan akun ditolak' : 'Menunggu persetujuan admin'}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {rejected
            ? 'Akun ini belum disetujui. Hubungi admin perpustakaan jika Anda merasa ini keliru.'
            : 'Pendaftaran berhasil. Anda dapat masuk setelah admin menyetujui akun Anda.'}
        </p>
        {errorMessage && <p role="alert" className="mt-3 text-sm text-red-600">{errorMessage}</p>}
        <div className="mt-6 flex justify-center gap-3">
          {!rejected && <Button variant="outline" onClick={() => void handleCheckStatus()} loading={checking}>Cek status</Button>}
          <Button variant="outline" onClick={handleSignOut} icon={<LogOut className="h-4 w-4" />}>Keluar</Button>
          {rejected && <Link href="/signup"><Button>Daftar ulang</Button></Link>}
        </div>
      </section>
    </main>
  );
}
