'use client';

import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BookCoverProps {
  src?: string | null;
  alt: string;
  title?: string;
  className?: string;
}

export function BookCover({ src, alt, title, className }: BookCoverProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const source = src?.trim();

  if (!source || failedSrc === source) {
    return (
      <div
        role="img"
        aria-label={alt}
        title={title}
        className={cn(className, 'flex items-center justify-center bg-slate-100 text-slate-400')}
      >
        <BookOpen className="h-1/3 w-1/3" aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={source}
      alt={alt}
      title={title}
      className={className}
      onError={() => setFailedSrc(source)}
    />
  );
}
