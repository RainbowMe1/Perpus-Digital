'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card } from '@/components/ui/card';
import { BookCover } from '@/components/features/book-cover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { useAppState } from '@/lib/context';
import { Search, BookOpen, Clock, Play } from 'lucide-react';
import Link from 'next/link';

export default function DigitalLibraryPage() {
  const { books, readingProgress } = useAppState();
  const [activeTab, setActiveTab] = useState('catalog');
  const [search, setSearch] = useState('');
  const digitalBooks = books.filter(book => book.isDigital);
  const filteredBooks = digitalBooks.filter(book =>
    !search || book.title.toLowerCase().includes(search.toLowerCase()) ||
    book.author.toLowerCase().includes(search.toLowerCase())
  );
  const readingHistory = digitalBooks
    .filter(book => (readingProgress[book.id] ?? 0) > 0)
    .sort((a, b) => (readingProgress[b.id] ?? 0) - (readingProgress[a.id] ?? 0));
  const progressPercent = (bookId: string, pageCount?: number) =>
    pageCount ? Math.min(100, Math.round(((readingProgress[bookId] ?? 0) / pageCount) * 100)) : 0;

  return (
    <AppLayout breadcrumbs={[{ label: 'Perpustakaan Digital' }]} title="Perpustakaan Digital" description="Koleksi e-book dan bahan digital">
      <Card padding="none">
        <Tabs
          tabs={[
            { id: 'catalog', label: 'Katalog E-Book', count: digitalBooks.length },
            { id: 'shelf', label: 'Rak Saya', count: readingHistory.length },
            { id: 'history', label: 'Riwayat Baca', count: readingHistory.length },
          ]}
          defaultTab={activeTab}
          onChange={setActiveTab}
        />
        <div className="p-6">
          {activeTab === 'catalog' && (
            <>
              <Input placeholder="Cari e-book..." icon={<Search className="w-4 h-4" />} value={search} onChange={event => setSearch(event.target.value)} className="mb-6" />
              {filteredBooks.length === 0 ? (
                <EmptyState icon={<BookOpen className="w-8 h-8" />} title="Tidak ada e-book ditemukan" description={digitalBooks.length === 0 ? 'Belum ada file e-book yang ditambahkan oleh pustakawan.' : 'Coba ubah kata kunci pencarian.'} />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredBooks.map(book => (
                    <Link key={book.id} href={`/digital-library/${book.id}`} className="group">
                      <div className="aspect-[3/4] rounded-lg overflow-hidden bg-slate-100 relative mb-2">
                        <BookCover src={book.coverImage} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute top-2 right-2"><Badge variant="info">E-Book</Badge></div>
                      </div>
                      <h3 className="font-medium text-slate-900 line-clamp-1 group-hover:text-primary-600 transition-colors">{book.title}</h3>
                      <p className="text-xs text-slate-500 line-clamp-1">{book.author}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400"><BookOpen className="w-3 h-3" /><span>{book.pageCount ?? '-'} hal</span></div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
          {activeTab === 'shelf' && (
            readingHistory.length === 0 ? (
              <EmptyState icon={<BookOpen className="w-8 h-8" />} title="Rak baca masih kosong" description="Buku yang mulai Anda baca akan tampil di sini." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {readingHistory.map(book => (
                  <Card key={book.id} padding="sm">
                    <div className="flex gap-3">
                      <BookCover src={book.coverImage} alt={book.title} className="w-16 h-20 rounded object-cover" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-900 line-clamp-1">{book.title}</h3>
                        <p className="text-xs text-slate-500 line-clamp-1">{book.author}</p>
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs mb-1"><span className="text-slate-500">Progress</span><span className="font-medium text-slate-900">{progressPercent(book.id, book.pageCount)}%</span></div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-primary-600 rounded-full" style={{ width: `${progressPercent(book.id, book.pageCount)}%` }} /></div>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">Halaman {readingProgress[book.id]} dari {book.pageCount ?? '-'}</p>
                      </div>
                    </div>
                    <Link href={`/reader/${book.id}`}><Button size="sm" className="w-full mt-3"><Play className="w-3 h-3" /> Lanjutkan Membaca</Button></Link>
                  </Card>
                ))}
              </div>
            )
          )}
          {activeTab === 'history' && (
            readingHistory.length === 0 ? (
              <EmptyState icon={<Clock className="w-8 h-8" />} title="Belum ada riwayat baca" description="Progres baca e-book Anda akan tersimpan di sini." />
            ) : (
              <div className="space-y-3">
                {readingHistory.map(book => (
                  <div key={book.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                    <BookCover src={book.coverImage} alt={book.title} className="w-12 h-16 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-900 truncate">{book.title}</h3>
                      <p className="text-xs text-slate-500">{book.author}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500"><span>{book.pageCount ?? '-'} halaman</span><span>Halaman terakhir: {readingProgress[book.id]}</span></div>
                    </div>
                    <Link href={`/reader/${book.id}`}><Button size="sm" variant="ghost">Baca</Button></Link>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </Card>
    </AppLayout>
  );
}
