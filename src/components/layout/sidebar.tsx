'use client';

import { cn } from '@/lib/utils';
import {
  LayoutDashboard, BookOpen, Users, ArrowLeftRight, ArrowRightLeft,
  BarChart3, Tablet, Calendar, Bell, QrCode, Heart, Star,
  Package, DollarSign, Settings, ChevronLeft, Library, X,
  BookMarked, RefreshCw, UserRoundCheck
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAppState, useRole } from '@/lib/context';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Katalog Buku', href: '/books', icon: BookOpen },
  { label: 'Anggota', href: '/members', icon: Users },
  { label: 'Peminjaman', href: '/borrowing', icon: ArrowLeftRight },
  { label: 'Pengembalian', href: '/returns', icon: ArrowRightLeft, roles: ['admin', 'librarian', 'staff'] },
  { label: 'Laporan', href: '/reports', icon: BarChart3, roles: ['admin', 'librarian', 'staff'] },
  { label: 'Perpustakaan Digital', href: '/digital-library', icon: Tablet },
  { label: 'Reservasi', href: '/reservations', icon: Calendar },
  { label: 'Perpanjangan', href: '/extensions', icon: RefreshCw },
  { label: 'Notifikasi', href: '/notifications', icon: Bell },
  { label: 'Barcode & QR', href: '/barcode', icon: QrCode, roles: ['admin', 'librarian', 'staff'] },
  { label: 'Wishlist', href: '/wishlist', icon: Heart },
  { label: 'Ulasan', href: '/reviews', icon: Star },
  { label: 'Pengadaan', href: '/procurement', icon: Package, roles: ['admin', 'librarian', 'staff'] },
  { label: 'Denda', href: '/fines', icon: DollarSign },
  { label: 'Pengaturan', href: '/settings', icon: Settings, roles: ['admin', 'librarian', 'staff'] },
  { label: 'Persetujuan Akun', href: '/admin/approvals', icon: UserRoundCheck, roles: ['admin'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { currentRole } = useRole();
  const { notifications } = useAppState();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const unreadCount = notifications.filter(notification => !notification.read).length;

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const filteredItems = navItems.filter(item =>
    !item.roles || (currentRole !== null && item.roles.includes(currentRole))
  );

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/';
    return pathname.startsWith(href);
  };

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-navy-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Library className="w-6 h-6 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-white font-bold text-lg truncate">EduLibrary</h1>
              <p className="text-navy-300 text-xs truncate">Digital Library System</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group relative',
                active
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-navy-200 hover:bg-navy-700 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="text-sm font-medium flex-1 truncate">{item.label}</span>
                  {item.href === '/notifications' && unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full flex-shrink-0">
                      {unreadCount}
                    </span>
                  )}
                </>
              )}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-navy-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-navy-700">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex w-full items-center justify-center p-2 rounded-lg text-navy-300 hover:bg-navy-700 hover:text-white transition-colors"
        >
          <ChevronLeft className={cn('w-5 h-5 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Buka navigasi"
        aria-expanded={mobileOpen}
        aria-controls="mobile-sidebar"
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-slate-200"
      >
        <BookMarked className="w-5 h-5 text-slate-700" />
      </button>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div id="mobile-sidebar" className="absolute left-0 top-0 bottom-0 w-72 bg-navy-900">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Tutup navigasi"
              className="absolute top-4 right-4 p-1 text-navy-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden lg:flex flex-col h-screen bg-navy-900 border-r border-navy-700 sticky top-0 transition-all duration-300',
        collapsed ? 'w-20' : 'w-64'
      )}>
        <SidebarContent />
      </aside>
    </>
  );
}