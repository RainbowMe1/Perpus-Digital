'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card } from '@/components/ui/card';
import { BookCover } from '@/components/features/book-cover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useAppState, useToast } from '@/lib/context';
import { Heart, Trash2, BookOpen, CalendarPlus } from 'lucide-react';
import Link from 'next/link';

export default function WishlistPage() {
  const { books, wishlistBookIds, removeFromWishlist, addReservation } = useAppState();
  const { toast } = useToast();
  const [reservingBookId, setReservingBookId] = useState<string | null>(null);
  const wishlist = books.filter(book => wishlistBookIds.includes(book.id));

  const handleRemove = async (bookId: string) => {
    try {
      await removeFromWishlist(bookId);
      toast('success', 'Buku dihapus dari wishlist');
    } catch (error) {
      toast('error', 'Gagal menghapus dari wishlist', error instanceof Error ? error.message : 'Coba lagi.');
    }
  };

  const handleReserve = async (bookId: string) => {
    setReservingBookId(bookId);
    try {
      await addReservation(bookId);
      toast('success', 'Reservasi berhasil dibuat');
    } catch (error) {
      toast('error', 'Gagal membuat reservasi', error instanceof Error ? error.message : 'Coba lagi.');
    } finally {
      setReservingBookId(null);
    }
  };

  return (
    <AppLayout
      breadcrumbs={[{ label: 'Wishlist' }]}
      title="Wishlist Saya"
      description={`${wishlist.length} buku dalam wishlist`}
    >
      {wishlist.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Heart className="w-8 h-8" />}
            title="Wishlist kosong"
            description="Tambahkan buku favorit Anda ke wishlist"
            action={<Link href="/books"><Button icon={<BookOpen className="w-4 h-4" />}>Jelajahi Katalog</Button></Link>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wishlist.map(book => (
            <Card key={book.id} padding="sm">
              <div className="flex gap-3">
                <Link href={`/books/${book.id}`}>
                  <BookCover src={book.coverImage} alt={book.title} className="w-20 h-28 rounded object-cover hover:scale-105 transition-transform cursor-pointer" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Badge variant="outline" className="mb-1">{book.category}</Badge>
                  <Link href={`/books/${book.id}`}>
                    <h3 className="font-medium text-slate-900 line-clamp-2 hover:text-primary-600 cursor-pointer">{book.title}</h3>
                  </Link>
                  <p className="text-xs text-slate-500 mt-1">{book.author}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <Badge variant={book.availableStock > 0 ? 'success' : 'danger'}>
                      {book.availableStock > 0 ? `${book.availableStock} tersedia` : 'Habis'}
                    </Badge>
                  </div>
                  <div className="flex gap-1 mt-3">
                    {book.availableStock === 0 ? (
                      <Button size="sm" variant="outline" className="flex-1" loading={reservingBookId === book.id} onClick={() => void handleReserve(book.id)}>
                        <CalendarPlus className="w-3.5 h-3.5" /> Reservasi
                      </Button>
                    ) : (
                      <Link href={`/books/${book.id}`} className="flex-1">
                        <Button size="sm" variant="outline" className="w-full">
                          <BookOpen className="w-3.5 h-3.5" /> Detail Buku
                        </Button>
                      </Link>
                    )}
                    <Button size="sm" variant="ghost" aria-label="Hapus dari wishlist" onClick={() => void handleRemove(book.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
