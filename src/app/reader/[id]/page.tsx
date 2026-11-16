'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppState } from '@/lib/context';
import { getEbookUrl } from '@/lib/ebooks';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, X, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ReaderPage() {
  const params = useParams();
  const router = useRouter();
  const { books, readingProgress, saveReadingProgress } = useAppState();
  const book = books.find(item => item.id === params.id && item.isDigital);
  const bookId = book?.id;
  const ebookFilePath = book?.digitalFileUrl;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [darkMode, setDarkMode] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [progressStatus, setProgressStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [progressError, setProgressError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setFileUrl(null);
    setFileError(null);
    setPdfDocument(null);
    if (!ebookFilePath) {
      setFileError('File PDF belum tersedia untuk e-book ini.');
      return () => { active = false; };
    }
    void getEbookUrl(ebookFilePath)
      .then(url => { if (active) setFileUrl(url); })
      .catch(error => {
        if (active) setFileError(error instanceof Error ? error.message : 'Gagal membuka file e-book.');
      });
    return () => { active = false; };
  }, [ebookFilePath]);

  useEffect(() => {
    if (!fileUrl) return;
    let active = true;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    setFileError(null);
    setPdfDocument(null);

    void import('pdfjs-dist')
      .then(pdfjs => {
        if (!active) return null;
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
        loadingTask = pdfjs.getDocument(fileUrl);
        return loadingTask.promise;
      })
      .then(document => {
        if (active && document) setPdfDocument(document);
      })
      .catch(error => {
        if (active) setFileError(error instanceof Error ? error.message : 'Gagal membaca file PDF.');
      });

    return () => {
      active = false;
      if (loadingTask) void loadingTask.destroy();
    };
  }, [fileUrl]);

  useEffect(() => {
    if (bookId) setCurrentPage(readingProgress[bookId] ?? 1);
  }, [bookId, readingProgress]);

  const pageCount = pdfDocument?.numPages ?? book?.pageCount ?? 0;
  const progress = pageCount > 0 ? Math.min(100, Math.round((currentPage / pageCount) * 100)) : 0;

  useEffect(() => {
    if (pdfDocument) {
      setCurrentPage(page => Math.min(Math.max(1, page), pdfDocument.numPages));
    }
  }, [pdfDocument]);

  useEffect(() => {
    if (!pdfDocument || !canvasRef.current || !readerRef.current) return;
    let active = true;
    let renderTask: RenderTask | null = null;
    setRendering(true);

    const renderPage = async () => {
      const page = await pdfDocument.getPage(currentPage);
      if (!active || !canvasRef.current || !readerRef.current) return;

      const initialViewport = page.getViewport({ scale: 1 });
      const containerWidth = Math.max(320, readerRef.current.clientWidth);
      const scale = Math.min(1.6, containerWidth / initialViewport.width);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Browser tidak dapat menampilkan halaman PDF.');

      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      renderTask = page.render({
        canvasContext: context,
        viewport,
        transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
      });
      await renderTask.promise;
      if (active) setRendering(false);
    };

    void renderPage().catch(error => {
      if (active && !(error instanceof Error && error.name === 'RenderingCancelledException')) {
        setFileError(error instanceof Error ? error.message : 'Gagal menampilkan halaman PDF.');
        setRendering(false);
      }
    });

    return () => {
      active = false;
      renderTask?.cancel();
    };
  }, [currentPage, pdfDocument]);

  useEffect(() => {
    if (!pdfDocument || !bookId || !Number.isInteger(currentPage) || currentPage < 1) return;
    let active = true;
    setProgressStatus('saving');
    setProgressError(null);
    const timeout = window.setTimeout(() => {
      void saveReadingProgress(bookId, currentPage)
        .then(() => { if (active) setProgressStatus('saved'); })
        .catch(error => {
          if (!active) return;
          setProgressStatus('error');
          setProgressError(error instanceof Error ? error.message : 'Coba muat ulang halaman dan simpan kembali.');
        });
    }, 500);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [bookId, currentPage, pdfDocument, saveReadingProgress]);

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center"><h2 className="text-lg font-semibold text-slate-900 mb-2">E-Book Tidak Ditemukan</h2><button onClick={() => router.push('/digital-library')} className="text-primary-600 hover:text-primary-700">Kembali ke Perpustakaan Digital</button></div>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen flex flex-col', darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900')}>
      <header className={cn('h-14 border-b flex items-center px-4 gap-2', darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200')}>
        <button aria-label="Tutup e-reader" onClick={() => router.push(`/digital-library/${book.id}`)} className={cn('p-2 rounded-lg', darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100')}><X className="w-5 h-5" /></button>
        <div className="flex-1 min-w-0"><p className="font-medium truncate">{book.title}</p><p className={cn('text-xs', darkMode ? 'text-slate-400' : 'text-slate-500')}>{book.author}</p></div>
        <button aria-label="Ubah tema" onClick={() => setDarkMode(!darkMode)} className={cn('p-2 rounded-lg', darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100')}>{darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
      </header>

      <main className="flex-1 p-3 md:p-6">
        {fileError ? (
          <div className="max-w-2xl mx-auto mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{fileError}</div>
        ) : !pdfDocument ? (
          <div className="h-full min-h-[50vh] flex items-center justify-center text-sm text-slate-500">Memuat file e-book...</div>
        ) : (
          <div ref={readerRef} className="mx-auto flex min-h-[50vh] justify-center overflow-auto">
            <canvas key={currentPage} ref={canvasRef} aria-label={`Halaman ${currentPage} dari ${book.title}`} className="max-w-full self-start bg-white shadow-lg" />
          </div>
        )}
        {rendering && !fileError && <p className="mt-2 text-center text-xs text-slate-500">Memuat halaman {currentPage}...</p>}
      </main>

      <div className={cn('h-1', darkMode ? 'bg-slate-800' : 'bg-slate-200')}><div className="h-full bg-primary-600 transition-all" style={{ width: `${progress}%` }} /></div>
      <footer className={cn('min-h-14 border-t flex flex-wrap items-center justify-between gap-2 px-4 py-2', darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200')}>
        <button aria-label="Halaman sebelumnya" onClick={() => setCurrentPage(page => Math.max(1, page - 1))} disabled={currentPage <= 1} className={cn('p-2 rounded-lg disabled:opacity-50', darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100')}><ChevronLeft className="w-5 h-5" /></button>
        <div className="flex items-center gap-2">
          <label htmlFor="reader-page" className="text-sm">Halaman</label>
          <input
            id="reader-page"
            type="number"
            min="1"
            max={pageCount || undefined}
            value={currentPage}
            onChange={event => {
              const page = Number(event.target.value);
              if (Number.isInteger(page) && page >= 1 && (!pageCount || page <= pageCount)) setCurrentPage(page);
            }}
            className="w-20 rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
          />
          <span className="text-sm">/ {pageCount || '?'}</span>
          <span aria-live="polite" className={cn('text-xs', progressStatus === 'error' ? 'text-red-600' : darkMode ? 'text-slate-400' : 'text-slate-500')}>
            {progressStatus === 'saving' ? 'Menyimpan progres...' : progressStatus === 'saved' ? 'Progres tersimpan' : progressError}
          </span>
        </div>
        <button aria-label="Halaman berikutnya" onClick={() => setCurrentPage(page => pageCount > 0 ? Math.min(pageCount, page + 1) : page + 1)} disabled={pageCount > 0 && currentPage >= pageCount} className={cn('p-2 rounded-lg disabled:opacity-50', darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100')}><ChevronRight className="w-5 h-5" /></button>
      </footer>
    </div>
  );
}
