import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export function getLocalDateInputValue(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function calculateOverdueDays(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  const diff = today.getTime() - due.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days > 0 ? days : 0;
}

export function calculateFine(overdueDays: number, finePerDay: number = 1000): number {
  return overdueDays * finePerDay;
}

export function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  const variants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
    active: 'success',
    returned: 'info',
    overdue: 'danger',
    extended: 'warning',
    pending: 'default',
    ready: 'success',
    fulfilled: 'info',
    cancelled: 'default',
    paid: 'success',
    unpaid: 'danger',
    waived: 'default',
    received: 'success',
    processed: 'info',
    suspended: 'danger',
    inactive: 'default',
  };
  return variants[status] || 'default';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Aktif',
    returned: 'Dikembalikan',
    overdue: 'Terlambat',
    extended: 'Diperpanjang',
    pending: 'Menunggu',
    ready: 'Siap',
    fulfilled: 'Selesai',
    cancelled: 'Dibatalkan',
    paid: 'Lunas',
    unpaid: 'Belum Bayar',
    waived: 'Dimaafkan',
    received: 'Diterima',
    processed: 'Diproses',
    suspended: 'Ditangguhkan',
    inactive: 'Tidak Aktif',
  };
  return labels[status] || status;
}

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  if (days < 7) return `${days} hari lalu`;
  return formatShortDate(dateString);
}