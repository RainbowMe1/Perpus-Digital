'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { useAppState, useToast } from '@/lib/context';
import { formatDate } from '@/lib/utils';
import { Star, Plus, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function ReviewsPage() {
  const { reviews, books, addReview } = useAppState();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [rating, setRating] = useState(5);
  const [bookId, setBookId] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredReviews = filter === 'all' ? reviews : reviews.filter(review => review.rating === Number(filter));
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const handleSubmit = async () => {
    if (!bookId || !comment.trim()) {
      toast('error', 'Ulasan belum lengkap', 'Pilih buku dan tulis ulasan terlebih dahulu.');
      return;
    }
    setSaving(true);
    try {
      await addReview(bookId, rating, comment);
      toast('success', 'Ulasan berhasil dikirim');
      setShowModal(false);
      setRating(5);
      setBookId('');
      setComment('');
    } catch (error) {
      toast('error', 'Gagal mengirim ulasan', error instanceof Error ? error.message : 'Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout
      breadcrumbs={[{ label: 'Ulasan' }]}
      title="Ulasan & Rating"
      description="Baca dan berikan ulasan untuk buku"
      actions={
        <Button onClick={() => setShowModal(true)} icon={<Plus className="w-4 h-4" />}>
          Tulis Ulasan
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <Card className="lg:col-span-1">
          <div className="text-center">
            <p className="text-4xl font-bold text-slate-900">{averageRating}</p>
            <div className="flex items-center justify-center gap-1 my-2">
              {[1, 2, 3, 4, 5].map(value => (
                <Star key={value} className={`w-5 h-5 ${value <= Math.round(Number(averageRating)) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
              ))}
            </div>
            <p className="text-sm text-slate-500">{reviews.length} ulasan</p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
            {[5, 4, 3, 2, 1].map(value => {
              const count = reviews.filter(review => review.rating === value).length;
              const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
              return (
                <div key={value} className="flex items-center gap-2 text-sm">
                  <span className="w-4 text-slate-600">{value}</span>
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400" style={{ width: `${percentage}%` }} />
                  </div>
                  <span className="text-xs text-slate-500 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>
        <div className="lg:col-span-3">
          <Card padding="sm" className="mb-4">
            <div className="flex gap-2 overflow-x-auto">
              {['all', '5', '4', '3', '2', '1'].map(value => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filter === value ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  {value === 'all' ? 'Semua' : `${value} Bintang`}
                </button>
              ))}
            </div>
          </Card>
          {filteredReviews.length === 0 ? (
            <Card>
              <EmptyState icon={<MessageSquare className="w-8 h-8" />} title="Belum ada ulasan" description="Ulasan buku akan tampil di sini." />
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredReviews.map(review => {
                const book = books.find(item => item.id === review.bookId);
                return (
                  <Card key={review.id} padding="sm">
                    <div className="flex items-start gap-3">
                      <Avatar name={review.memberName} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-slate-900">{review.memberName}</p>
                          <p className="text-xs text-slate-500">{formatDate(review.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map(value => (
                              <Star key={value} className={`w-3.5 h-3.5 ${value <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                            ))}
                          </div>
                          {book && <Link href={`/books/${book.id}`} className="text-xs text-primary-600 hover:text-primary-700">{book.title}</Link>}
                        </div>
                        <p className="text-sm text-slate-700 mt-2">{review.comment}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Tulis Ulasan"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>Batal</Button>
            <Button loading={saving} onClick={() => void handleSubmit()}>Kirim Ulasan</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Rating</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(value => (
                <button key={value} type="button" aria-label={`${value} bintang`} onClick={() => setRating(value)} className="hover:scale-110 transition-transform">
                  <Star className={`w-8 h-8 ${value <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                </button>
              ))}
            </div>
          </div>
          <Select
            label="Buku"
            value={bookId}
            onChange={event => setBookId(event.target.value)}
            options={[
              { value: '', label: 'Pilih buku...' },
              ...books.map(book => ({ value: book.id, label: book.title })),
            ]}
          />
          <Textarea label="Ulasan Anda" placeholder="Tulis ulasan Anda tentang buku ini..." rows={5} value={comment} onChange={event => setComment(event.target.value)} />
        </div>
      </Modal>
    </AppLayout>
  );
}
