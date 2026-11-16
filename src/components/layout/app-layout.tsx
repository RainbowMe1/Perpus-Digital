'use client';

import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { Breadcrumb } from './breadcrumb';
import { ReactNode } from 'react';
import { useAppState } from '@/lib/context';
import { Button } from '@/components/ui/button';

interface AppLayoutProps {
  children: ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export function AppLayout({ children, breadcrumbs, title, description, actions }: AppLayoutProps) {
  const { dataLoading, dataError, refreshData } = useAppState();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="min-w-0 flex-1 overflow-x-hidden p-3 sm:p-4 lg:p-6">
          {dataLoading && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Memuat data perpustakaan...
            </div>
          )}
          {dataError && (
            <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <span>Gagal memuat data: {dataError}</span>
              <Button size="sm" variant="outline" onClick={() => void refreshData()}>Coba lagi</Button>
            </div>
          )}
          {breadcrumbs && (
            <div className="mb-4">
              <Breadcrumb items={breadcrumbs} />
            </div>
          )}
          {(title || actions) && (
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                {title && <h1 className="text-2xl font-bold text-slate-900">{title}</h1>}
                {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
              </div>
              {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}