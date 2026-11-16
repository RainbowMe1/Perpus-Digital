'use client';

import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { Card } from '@/components/ui/card';
import { BookCover } from '@/components/features/book-cover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';
import { Avatar } from '@/components/ui/avatar';
import { useAppState, useRole, useToast } from '@/lib/context';
import { formatDate } from '@/lib/utils';
import {
  ArrowLeft, Star, BookOpen, MapPin, Calendar, Hash,
  Building2, Heart, Share2, Download, Bookmark, CalendarPlus
} from 'lucide-react';
import { useState } from 'react';

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { books, reviews, wishlistBookIds, addToWishlist, removeFromWishlist, addReservation } = useAppState();
  const { currentRole } = useRole();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('details');
  const [savingAction, setSavingAction] = useState(false);
  const isStaff = currentRole === 'admin' || currentRole === 'librarian' || currentRole === 'staff';

  const book = books.find(b => b.id === params.id);

  if (!book) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Katalog Buku', href: '/books' }, { label: 'Tidak Ditemukan' }]}>
        <Card>
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Buku Tidak Ditemukan</h2>
            <Button variant="outline" onClick={() => router.push('/books')}>Kembali ke Katalog</Button>
          </div>
        </Card>
      </AppLayout>
    );
  }

  const wishlisted = book ? wishlistBookIds.includes(book.id) : false;
  const relatedReviews = book ? reviews.filter(review => review.bookId === book.id) : [];

  const toggleWishlist = async () => {
    if (!book) return;
    setSavingAction(true);
    try {
      if (wishlisted) {
        await removeFromWishlist(book.id);
        toast('success', 'Dihapus dari wishlist');
      } else {
        await addToWishlist(book.id);
        toast('success', 'Ditambahkan ke wishlist');
      }
    } catch (error) {
      toast('error', 'Gagal memperbarui wishlist', error instanceof Error ? error.message : 'Coba lagi.');
    } finally {
      setSavingAction(false);
    }
  };

  const reserveBook = async () => {
    if (!book) return;
    setSavingAction(true);
    try {
      await addReservation(book.id);
      toast('success', 'Reservasi berhasil dibuat');
    } catch (error) {
      toast('error', 'Gagal membuat reservasi', error instanceof Error ? error.message : 'Coba lagi.');
    } finally {
      setSavingAction(false);
    }
  };

  const shareBook = async () => {
    if (!book) return;
    try {
      if (navigator.share) await navigator.share({ title: book.title, url: window.location.href });
      else {
        await navigator.clipboard.writeText(window.location.href);
        toast('success', 'Tautan buku disalin');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      toast('error', 'Gagal membagikan buku', error instanceof Error ? error.message : 'Coba lagi.');
    }
  };

  return (
    <AppLayout
      breadcrumbs={[
        { label: 'Katalog Buku', href: '/books' },
        { label: book.title }
      ]}
      actions={
        <Button variant="ghost" onClick={() => router.back()} icon={<ArrowLeft className="w-4 h-4" />}>
          Kembali
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Cover */}
        <Card padding="none" className="overflow-hidden">
          <div className="aspect-[3/4] bg-slate-100">
            <BookCover src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
          </div>
        </Card>

        {/* Info */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <Badge variant="outline" className="mb-2">{book.category}</Badge>
                <h1 className="text-2xl font-bold text-slate-900">{book.title}</h1>
                <p className="text-slate-600 mt-1">oleh {book.author}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                <span className="text-lg font-bold text-slate-900">{book.rating}</span>
                <span className="text-sm text-slate-500">({book.reviewCount})</span>
              </div>
            </div>

            <p className="text-slate-700 leading-relaxed">{book.description}</p>

            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">ISBN</p>
                  <p className="text-sm font-medium text-slate-900">{book.isbn}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Penerbit</p>
                  <p className="text-sm font-medium text-slate-900">{book.publisher}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Tahun Terbit</p>
                  <p className="text-sm font-medium text-slate-900">{book.publicationYear}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Lokasi Rak</p>
                  <p className="text-sm font-medium text-slate-900">{book.shelfLocation}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Stok</p>
                  <p className="text-sm font-medium text-slate-900">
                    {book.availableStock} tersedia dari {book.totalStock}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Kode Buku</p>
                  <p className="text-sm font-medium text-slate-900">{book.bookCode}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-6">
              {isStaff && book.availableStock > 0 && (
                <Button onClick={() => router.push('/borrowing/new')}>
                  <BookOpen className="w-4 h-4" /> Proses Peminjaman
                </Button>
              )}
              {book.availableStock === 0 && (
                <Button loading={savingAction} onClick={() => void reserveBook()}>
                  <CalendarPlus className="w-4 h-4" /> Reservasi Buku
                </Button>
              )}
              {book.isDigital && (
                <Button variant="outline" onClick={() => router.push(`/reader/${book.id}`)}>
                  <Download className="w-4 h-4" /> Baca Digital
                </Button>
              )}
              <Button
                variant="outline"
                loading={savingAction}
                onClick={() => void toggleWishlist()}
              >
                <Heart className={`w-4 h-4 ${wishlisted ? 'fill-red-500 text-red-500' : ''}`} />
                Wishlist
              </Button>
              <Button variant="outline" onClick={() => void shareBook()}>
                <Share2 className="w-4 h-4" />
                Bagikan
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Card padding="none">
        <Tabs
          tabs={[
            { id: 'details', label: 'Detail' },
            { id: 'reviews', label: 'Ulasan', count: book.reviewCount },
            { id: 'related', label: 'Buku Terkait' },
          ]}
          defaultTab={activeTab}
          onChange={setActiveTab}
        />
        <div className="p-6">
          {activeTab === 'details' && (
            <div className="prose max-w-none">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Tentang Buku Ini</h3>
              <p className="text-slate-700 leading-relaxed">{book.description}</p>
              <p className="text-slate-700 leading-relaxed mt-4">
                Buku ini merupakan salah satu koleksi penting di perpustakaan kami. Dengan rating {book.rating} dari {book.reviewCount} ulasan,
                buku ini sangat direkomendasikan untuk dibaca. Tersedia dalam format fisik di rak {book.shelfLocation}
                {book.isDigital && ' dan juga dalam format digital yang dapat dibaca melalui perpustakaan digital kami'}.
              </p>
            </div>
          )}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              {relatedReviews.length === 0 && <p className="text-sm text-slate-500">Belum ada ulasan untuk buku ini.</p>}
              {relatedReviews.map(review => (
                <div key={review.id} className="flex gap-3 p-4 rounded-lg border border-slate-200">
                  <Avatar name={review.memberName} size="sm" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-slate-900">{review.memberName}</p>
                      <p className="text-xs text-slate-500">{formatDate(review.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-slate-700">{review.comment}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'related' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {books.filter(b => b.category === book.category && b.id !== book.id).slice(0, 4).map(b => (
                <div key={b.id} className="cursor-pointer group" onClick={() => router.push(`/books/${b.id}`)}>
                  <div className="aspect-[3/4] rounded-lg overflow-hidden bg-slate-100 mb-2">
                    <BookCover src={b.coverImage} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                  <p className="text-sm font-medium text-slate-900 line-clamp-1">{b.title}</p>
                  <p className="text-xs text-slate-500">{b.author}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </AppLayout>
  );
}