'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { Card } from '@/components/ui/card';
import { BookCover } from '@/components/features/book-cover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppState, useToast } from '@/lib/context';
import { getEbookUrl } from '@/lib/ebooks';
import { ArrowLeft, BookOpen, Download, Play, FileText, Clock } from 'lucide-react';
import Link from 'next/link';

export default function DigitalBookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { books } = useAppState();
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const book = books.find(item => item.id === params.id && item.isDigital);

  const downloadPdf = async () => {
    if (!book?.digitalFileUrl) {
      toast('error', 'File e-book belum tersedia');
      return;
    }
    setDownloading(true);
    try {
      const url = await getEbookUrl(book.digitalFileUrl, true);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${book.title}.pdf`;
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (error) {
      toast('error', 'Gagal membuka file e-book', error instanceof Error ? error.message : 'Coba lagi.');
    } finally {
      setDownloading(false);
    }
  };

  if (!book) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Perpustakaan Digital', href: '/digital-library' }, { label: 'Tidak Ditemukan' }]}>
        <Card><div className="text-center py-12"><BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-4" /><h2 className="text-lg font-semibold text-slate-900 mb-2">E-Book Tidak Ditemukan</h2><Button variant="outline" onClick={() => router.push('/digital-library')}>Kembali</Button></div></Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      breadcrumbs={[{ label: 'Perpustakaan Digital', href: '/digital-library' }, { label: book.title }]}
      actions={<Button variant="ghost" onClick={() => router.back()} icon={<ArrowLeft className="w-4 h-4" />}>Kembali</Button>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card padding="none" className="overflow-hidden">
          <div className="aspect-[3/4] bg-slate-100"><BookCover src={book.coverImage} alt={book.title} className="w-full h-full object-cover" /></div>
        </Card>
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <Badge variant="info" className="mb-2">E-Book PDF</Badge>
            <h1 className="text-2xl font-bold text-slate-900">{book.title}</h1>
            <p className="text-slate-600 mt-1">oleh {book.author}</p>
            <p className="text-slate-700 mt-4 leading-relaxed">{book.description}</p>
            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-200">
              <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-slate-400" /><div><p className="text-xs text-slate-500">Format</p><p className="text-sm font-medium text-slate-900">PDF</p></div></div>
              <div className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-slate-400" /><div><p className="text-xs text-slate-500">Halaman</p><p className="text-sm font-medium text-slate-900">{book.pageCount ?? 'Tidak diketahui'}</p></div></div>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /><div><p className="text-xs text-slate-500">Penerbit</p><p className="text-sm font-medium text-slate-900">{book.publisher || '-'}</p></div></div>
            </div>
            {!book.digitalFileUrl && <p className="mt-4 text-sm text-amber-700">File PDF belum diunggah untuk buku ini.</p>}
            <div className="flex flex-wrap gap-2 mt-6">
              {book.digitalFileUrl && <Link href={`/reader/${book.id}`}><Button icon={<Play className="w-4 h-4" />}>Baca Sekarang</Button></Link>}
              <Button variant="outline" disabled={!book.digitalFileUrl} loading={downloading} onClick={() => void downloadPdf()} icon={<Download className="w-4 h-4" />}>Download PDF</Button>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
