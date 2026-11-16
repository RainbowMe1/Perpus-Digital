'use client';

import { Bell, Search, User, LogOut, ChevronDown, Library, BookOpen, Shield, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole, useAppState, useToast } from '@/lib/context';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function Topbar() {
  const router = useRouter();
  const { currentUser, currentRole, signOut } = useRole();
  const { notifications, books, members, transactions } = useAppState();
  const { toast } = useToast();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;
  const query = globalSearch.trim().toLowerCase();
  const searchResults = query ? [
    ...books
      .filter(book => [book.title, book.author, book.isbn, book.bookCode].some(value => value.toLowerCase().includes(query)))
      .slice(0, 4)
      .map(book => ({ label: book.title, detail: `Buku · ${book.author}`, href: `/books/${book.id}` })),
    ...members
      .filter(member => [member.fullName, member.memberNumber, member.email].some(value => value.toLowerCase().includes(query)))
      .slice(0, 3)
      .map(member => ({ label: member.fullName, detail: `Anggota · ${member.memberNumber}`, href: `/members/${member.id}` })),
    ...transactions
      .filter(transaction => [
        transaction.transactionId,
        transaction.memberName,
        transaction.memberNumber,
        ...transaction.books.flatMap(book => [book.title, book.bookCode]),
      ].some(value => value.toLowerCase().includes(query)))
      .slice(0, 3)
      .map(transaction => ({
        label: transaction.transactionId,
        detail: `Peminjaman · ${transaction.memberName}`,
        href: `/borrowing?search=${encodeURIComponent(transaction.transactionId)}`,
      })),
  ].slice(0, 8) : [];

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (searchResults[0]) {
      router.push(searchResults[0].href);
      setSearchOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roleConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
    admin: { label: 'Administrator', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Shield },
    librarian: { label: 'Pustakawan', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: BookOpen },
    student: { label: 'Siswa', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: GraduationCap },
    teacher: { label: 'Guru', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: GraduationCap },
    staff: { label: 'Staf Perpustakaan', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: User },
  };

  const currentRoleConfig = currentRole ? roleConfig[currentRole] : roleConfig.student;

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-40 flex items-center pl-14 pr-3 sm:pr-4 lg:px-6 gap-2 sm:gap-4">
      {/* Search */}
      <div className="min-w-0 flex-1 max-w-xl">
        <form className="relative" onSubmit={submitSearch}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari buku, anggota, transaksi..."
            role="combobox"
            value={globalSearch}
            onFocus={() => setSearchOpen(true)}
            onChange={event => {
              setGlobalSearch(event.target.value);
              setSearchOpen(true);
            }}
            onKeyDown={event => {
              if (event.key === 'Escape') setSearchOpen(false);
            }}
            aria-label="Cari buku, anggota, atau transaksi"
            aria-expanded={searchOpen && query.length > 0}
            aria-controls="global-search-results"
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-colors"
          />
          {searchOpen && query && (
            <div id="global-search-results" role="listbox" className="absolute left-0 right-0 top-full mt-2 max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg z-50">
              {searchResults.length ? searchResults.map((result, index) => (
                <Link
                  key={`${result.href}-${index}`}
                  href={result.href}
                  role="option"
                  onClick={() => {
                    setSearchOpen(false);
                    setGlobalSearch('');
                  }}
                  className="block px-4 py-2.5 hover:bg-slate-50"
                >
                  <span className="block truncate text-sm font-medium text-slate-900">{result.label}</span>
                  <span className="block truncate text-xs text-slate-500">{result.detail}</span>
                </Link>
              )) : <p className="px-4 py-3 text-sm text-slate-500">Tidak ada hasil yang cocok.</p>}
            </div>
          )}
        </form>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Badge variant="info" className="hidden md:inline-flex">{currentRoleConfig.label}</Badge>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-5 h-5 text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                {unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="fixed right-2 top-20 z-[60] w-80 max-w-[calc(100vw-1rem)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg max-h-96">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Notifikasi</h3>
                <Link href="/notifications" onClick={() => setNotifOpen(false)} className="text-xs text-primary-600 hover:text-primary-700">
                  Lihat semua
                </Link>
              </div>
              <div className="overflow-y-auto max-h-80">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-500">Belum ada notifikasi.</p>
                ) : notifications.slice(0, 5).map((notif) => (
                  <Link
                    key={notif.id}
                    href={notif.link || '/notifications'}
                    onClick={() => setNotifOpen(false)}
                    className={cn(
                      'block px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors',
                      !notif.read && 'bg-blue-50/50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {!notif.read && <span className="w-2 h-2 rounded-full bg-primary-600 mt-2 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{notif.title}</p>
                        <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{notif.message}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Avatar src={currentUser?.avatar} name={currentUser?.name ?? ''} size="sm" />
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-slate-900 leading-tight">{currentUser?.name}</p>
              <p className="text-xs text-slate-500 leading-tight">{currentUser?.email}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-900">{currentUser?.name}</p>
                <p className="text-xs text-slate-500">{currentUser?.email}</p>
                <Badge variant="info" className="mt-2">{currentRoleConfig.label}</Badge>
              </div>
              <Link href="/settings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <User className="w-4 h-4" />
                Profil Saya
              </Link>
              <Link href="/settings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <Library className="w-4 h-4" />
                Pengaturan
              </Link>
              <div className="border-t border-slate-100 my-1" />
              <button
                onClick={async () => {
                  try {
                    await signOut();
                  } catch (error) {
                    toast('error', 'Gagal keluar', error instanceof Error ? error.message : 'Coba lagi.');
                  }
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}