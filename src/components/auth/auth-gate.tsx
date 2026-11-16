'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useRole } from '@/lib/context';
import { Library } from 'lucide-react';

const publicPaths = ['/login', '/signup', '/pending-approval'];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { authStatus, authError } = useRole();
  const pathname = usePathname();
  const router = useRouter();
  const isPublicPath = publicPaths.includes(pathname);

  useEffect(() => {
    if (authStatus === 'approved' && isPublicPath) {
      router.replace('/dashboard');
    } else if (authStatus === 'pending' || authStatus === 'rejected') {
      if (pathname !== '/pending-approval') router.replace('/pending-approval');
    } else if (authStatus === 'signed_out') {
      if (pathname === '/pending-approval') router.replace('/login');
      else if (!isPublicPath) router.replace('/login');
    } else if (authStatus === 'unconfigured' && !isPublicPath) {
      router.replace('/login');
    }
  }, [authStatus, isPublicPath, pathname, router]);

  if (authStatus === 'loading') {
    return (
      <div role="status" aria-label="Memuat aplikasi" className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white">
            <Library className="h-6 w-6" />
          </div>
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-primary-600" />
          <span className="sr-only">Memuat akun</span>
        </div>
      </div>
    );
  }

  if (authStatus === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-lg rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Tidak dapat memeriksa akun</h1>
          <p className="mt-2 text-sm text-red-700">{authError}</p>
        </div>
      </div>
    );
  }

  if (authStatus === 'approved') return isPublicPath ? null : children;
  if (authStatus === 'pending' || authStatus === 'rejected') {
    return pathname === '/pending-approval' ? children : null;
  }
  if (authStatus === 'signed_out') {
    return pathname === '/login' || pathname === '/signup' ? children : null;
  }
  if (authStatus === 'unconfigured') {
    return pathname === '/login' || pathname === '/signup' ? children : null;
  }

  return null;
}
