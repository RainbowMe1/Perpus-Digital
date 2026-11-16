'use client';

import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Tabs } from '@/components/ui/tabs';
import { useAppState } from '@/lib/context';
import { formatDate, getStatusVariant } from '@/lib/utils';
import { ArrowLeft, Mail, Phone, Calendar, BookOpen, CreditCard, User } from 'lucide-react';
import { useState } from 'react';

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { members, transactions } = useAppState();
  const [activeTab, setActiveTab] = useState('overview');

  const member = members.find(m => m.id === params.id);

  if (!member) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Anggota', href: '/members' }, { label: 'Tidak Ditemukan' }]}>
        <Card>
          <div className="text-center py-12">
            <User className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Anggota Tidak Ditemukan</h2>
            <Button variant="outline" onClick={() => router.push('/members')}>Kembali</Button>
          </div>
        </Card>
      </AppLayout>
    );
  }

  const memberTransactions = transactions.filter(t => t.memberId === member.id);
  const activeLoans = memberTransactions.filter(t =>
    t.status === 'active' || t.status === 'overdue' || t.status === 'extended'
  );
  const returnedLoans = memberTransactions.filter(t => t.status === 'returned');

  return (
    <AppLayout
      breadcrumbs={[{ label: 'Anggota', href: '/members' }, { label: member.fullName }]}
      actions={
        <Button variant="ghost" onClick={() => router.back()} icon={<ArrowLeft className="w-4 h-4" />}>
          Kembali
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <div className="text-center">
            <Avatar name={member.fullName} size="xl" className="mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900">{member.fullName}</h2>
            <p className="text-sm text-slate-500 mt-1">{member.classOrDepartment}</p>
            <Badge variant={getStatusVariant(member.status)} className="mt-3">
              {member.status === 'active' ? 'Aktif' : member.status === 'suspended' ? 'Ditangguhkan' : 'Tidak Aktif'}
            </Badge>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200 space-y-3">
            <div className="flex items-center gap-3">
              <CreditCard className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Nomor Anggota</p>
                <p className="text-sm font-medium text-slate-900">{member.memberNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="text-sm font-medium text-slate-900">{member.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Telepon</p>
                <p className="text-sm font-medium text-slate-900">{member.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Terdaftar Sejak</p>
                <p className="text-sm font-medium text-slate-900">{formatDate(member.registrationDate)}</p>
              </div>
            </div>
          </div>

          {/* Member Card Preview */}
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 text-white">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs opacity-80">EduLibrary</p>
                <p className="text-sm font-bold">Kartu Anggota</p>
              </div>
              <BookOpen className="w-6 h-6 opacity-80" />
            </div>
            <p className="text-lg font-bold">{member.fullName}</p>
            <p className="text-xs opacity-80 mt-1">{member.memberNumber}</p>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/20">
              <div>
                <p className="text-xs opacity-80">Kategori</p>
                <p className="text-sm font-medium capitalize">{member.category}</p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-80">Berlaku</p>
                <p className="text-sm font-medium">
                  {formatDate(new Date(new Date(member.registrationDate).setFullYear(
                    new Date(member.registrationDate).getFullYear() + 1
                  )).toISOString().slice(0, 10))}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats & Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Card padding="sm">
              <div className="text-center">
                <p className="text-xs text-slate-500">Peminjaman Aktif</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{activeLoans.length}</p>
              </div>
            </Card>
            <Card padding="sm">
              <div className="text-center">
                <p className="text-xs text-slate-500">Total Dipinjam</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{member.totalBorrowed}</p>
              </div>
            </Card>
            <Card padding="sm">
              <div className="text-center">
                <p className="text-xs text-slate-500">Dikembalikan</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{returnedLoans.length}</p>
              </div>
            </Card>
          </div>

          <Card padding="none">
            <Tabs
              tabs={[
                { id: 'overview', label: 'Ikhtisar' },
                { id: 'active', label: 'Peminjaman Aktif', count: activeLoans.length },
                { id: 'history', label: 'Riwayat', count: returnedLoans.length },
              ]}
              defaultTab={activeTab}
              onChange={setActiveTab}
            />
            <div className="p-6">
              {activeTab === 'overview' && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Aktivitas Terbaru</h3>
                  {memberTransactions.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">Belum ada aktivitas</p>
                  ) : (
                    <div className="space-y-2">
                      {memberTransactions.slice(0, 5).map(trx => (
                        <div key={trx.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50">
                          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-primary-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {trx.books.map(b => b.title).join(', ')}
                            </p>
                            <p className="text-xs text-slate-500">
                              {trx.transactionId} â€¢ {formatDate(trx.borrowingDate)}
                            </p>
                          </div>
                          <Badge variant={getStatusVariant(trx.status)}>
                            {trx.status === 'active' ? 'Aktif' : trx.status === 'overdue' ? 'Terlambat' : trx.status === 'extended' ? 'Diperpanjang' : 'Dikembalikan'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'active' && (
                <div className="space-y-2">
                  {activeLoans.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">Tidak ada peminjaman aktif</p>
                  ) : (
                    activeLoans.map(trx => (
                      <div key={trx.id} className="p-4 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-slate-900">{trx.transactionId}</p>
                          <Badge variant={getStatusVariant(trx.status)}>
                            {trx.status === 'overdue' ? 'Terlambat' : trx.status === 'extended' ? 'Diperpanjang' : 'Aktif'}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          {trx.books.map(book => (
                            <div key={book.bookId} className="flex items-center gap-2 text-sm text-slate-600">
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>{book.title}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                          <span>Dipinjam: {formatDate(trx.borrowingDate)}</span>
                          <span>Jatuh tempo: {formatDate(trx.dueDate)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              {activeTab === 'history' && (
                <div className="space-y-2">
                  {returnedLoans.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">Belum ada riwayat</p>
                  ) : (
                    returnedLoans.map(trx => (
                      <div key={trx.id} className="p-4 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-slate-900">{trx.transactionId}</p>
                          <Badge variant="info">Dikembalikan</Badge>
                        </div>
                        <div className="space-y-1">
                          {trx.books.map(book => (
                            <div key={book.bookId} className="flex items-center gap-2 text-sm text-slate-600">
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>{book.title}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                          <span>Dipinjam: {formatDate(trx.borrowingDate)}</span>
                          <span>Dikembalikan: {formatDate(trx.returnDate || trx.borrowingDate)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}