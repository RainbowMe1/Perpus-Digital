'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { useRole } from '@/lib/context';

export default function SignupPage() {
  const router = useRouter();
  const { refreshProfile } = useRole();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState<'student' | 'teacher' | 'staff'>('student');
  const [classOrDepartment, setClassOrDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setConfirmationMessage('');
    setLoading(true);
    try {
      const { data, error } = await getSupabaseClient().auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            member_category: category,
            class_or_department: classOrDepartment,
            phone,
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (error) throw error;
      if (data.session) {
        await refreshProfile();
        router.replace('/pending-approval');
      } else {
        setConfirmationMessage('Pendaftaran diterima. Verifikasi email Anda; setelah itu admin akan meninjau permintaan akun.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Pendaftaran gagal. Coba lagi.';
      setErrorMessage(/rate limit|too many requests/i.test(message)
        ? 'Supabase sedang membatasi pengiriman email pendaftaran. Minta staf membuat akun dari tab Anggota, atau coba lagi nanti.'
        : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Buat akun</h1>
            <p className="text-sm text-slate-500">Akun harus disetujui admin sebelum dapat digunakan</p>
          </div>
        </div>

        {!isSupabaseConfigured() ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Konfigurasi Supabase terlebih dahulu melalui `.env.local` dan jalankan `supabase/schema.sql`.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Nama lengkap" required value={fullName} onChange={event => setFullName(event.target.value)} />
            <Input label="Email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} />
            <Select
              label="Kategori anggota"
              value={category}
              onChange={event => {
                const value = event.target.value;
                if (value === 'student' || value === 'teacher' || value === 'staff') setCategory(value);
              }}
              options={[
                { value: 'student', label: 'Siswa' },
                { value: 'teacher', label: 'Guru' },
                { value: 'staff', label: 'Staf' },
              ]}
            />
            <p className="text-xs text-slate-500">
              Akun staf memperoleh akses operasional perpustakaan setelah disetujui admin.
            </p>
            <Input label="Kelas / departemen" required value={classOrDepartment} onChange={event => setClassOrDepartment(event.target.value)} />
            <Input label="Nomor telepon" type="tel" required value={phone} onChange={event => setPhone(event.target.value)} />
            <Input label="Kata sandi (minimal 6 karakter)" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={event => setPassword(event.target.value)} />
            {errorMessage && <p role="alert" className="text-sm text-red-600">{errorMessage}</p>}
            {confirmationMessage && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{confirmationMessage}</p>}
            <Button type="submit" className="w-full" loading={loading}>Kirim permintaan akun</Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-600">
          Sudah memiliki akun?{' '}
          <Link href="/login" className="font-medium text-primary-700 hover:text-primary-800">Masuk</Link>
        </p>
      </section>
    </main>
  );
}
