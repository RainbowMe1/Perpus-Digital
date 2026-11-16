'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppState, useToast } from '@/lib/context';
import { timeAgo } from '@/lib/utils';
import { Bell, AlertTriangle, Clock, Calendar, CheckCircle, Megaphone, CheckCheck } from 'lucide-react';
import Link from 'next/link';

export default function NotificationsPage() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAppState();
  const { toast } = useToast();

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = async (id: string) => {
    try {
      await markNotificationRead(id);
    } catch (error) {
      toast('error', 'Gagal memperbarui notifikasi', error instanceof Error ? error.message : 'Coba lagi.');
    }
  };

  const markAllRead = async () => {
    try {
      await markAllNotificationsRead();
      toast('success', 'Semua notifikasi ditandai dibaca');
    } catch (error) {
      toast('error', 'Gagal memperbarui notifikasi', error instanceof Error ? error.message : 'Coba lagi.');
    }
  };

  const iconMap = {
    due_date: <Clock className="w-5 h-5 text-amber-600" />,
    overdue: <AlertTriangle className="w-5 h-5 text-red-600" />,
    reservation: <Calendar className="w-5 h-5 text-blue-600" />,
    borrowing: <CheckCircle className="w-5 h-5 text-emerald-600" />,
    return: <CheckCircle className="w-5 h-5 text-emerald-600" />,
    announcement: <Megaphone className="w-5 h-5 text-purple-600" />,
  };

  const bgMap = {
    due_date: 'bg-amber-100',
    overdue: 'bg-red-100',
    reservation: 'bg-blue-100',
    borrowing: 'bg-emerald-100',
    return: 'bg-emerald-100',
    announcement: 'bg-purple-100',
  };

  return (
    <AppLayout
      breadcrumbs={[{ label: 'Notifikasi' }]}
      title="Notifikasi"
      description={`${unreadCount} notifikasi belum dibaca`}
      actions={
        unreadCount > 0 && (
          <Button variant="outline" onClick={() => void markAllRead()} icon={<CheckCheck className="w-4 h-4" />}>
            Tandai Semua Dibaca
          </Button>
        )
      }
    >
      <Card padding="none">
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Tidak ada notifikasi</h3>
            <p className="text-sm text-slate-500">Anda akan menerima notifikasi di sini</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map(notif => (
              <Link
                key={notif.id}
                href={notif.link || '/notifications'}
                onClick={() => void markRead(notif.id)}
                className={`block p-4 hover:bg-slate-50 transition-colors ${!notif.read ? 'bg-blue-50/30' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${bgMap[notif.type]}`}>
                    {iconMap[notif.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${!notif.read ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {notif.title}
                      </p>
                      {!notif.read && <span className="w-2 h-2 rounded-full bg-primary-600 flex-shrink-0 mt-2" />}
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5">{notif.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{timeAgo(notif.timestamp)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </AppLayout>
  );
}