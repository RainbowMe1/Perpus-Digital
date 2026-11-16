'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { BookCover } from '@/components/features/book-cover';
import { Star, BookOpen } from 'lucide-react';
import { Book } from '@/lib/types';

interface BookCardProps {
  book: Book;
}

export function BookCard({ book }: BookCardProps) {
  return (
    <Link href={`/books/${book.id}`} className="group block">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
        <div className="aspect-[3/4] bg-slate-100 relative overflow-hidden">
          <BookCover
            src={book.coverImage}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {book.isDigital && (
            <div className="absolute top-2 right-2">
              <Badge variant="info">Digital</Badge>
            </div>
          )}
          {book.availableStock === 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Badge variant="danger">Habis</Badge>
            </div>
          )}
        </div>
        <div className="p-4">
          <p className="text-xs text-slate-500 mb-1">{book.category}</p>
          <h3 className="font-semibold text-slate-900 line-clamp-1 group-hover:text-primary-600 transition-colors">
            {book.title}
          </h3>
          <p className="text-sm text-slate-600 mt-1 line-clamp-1">{book.author}</p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-xs font-medium text-slate-700">{book.rating}</span>
              <span className="text-xs text-slate-400">({book.reviewCount})</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{book.availableStock}/{book.totalStock}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}