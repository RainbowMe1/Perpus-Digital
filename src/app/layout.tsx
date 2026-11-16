import type { Metadata } from 'next';
import { RoleProvider, ToastProvider, AppStateProvider } from '@/lib/context';
import { AuthGate } from '@/components/auth/auth-gate';
import './globals.css';

export const metadata: Metadata = {
  title: 'EduLibrary - Digital Library Management System',
  description: 'Sistem Manajemen Perpustakaan Digital untuk Sekolah',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <RoleProvider>
          <ToastProvider>
            <AuthGate>
              <AppStateProvider>
                {children}
              </AppStateProvider>
            </AuthGate>
          </ToastProvider>
        </RoleProvider>
      </body>
    </html>
  );
}