'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Clock3, X } from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useRole, useToast } from '@/lib/context';
import { getSupabaseClient } from '@/lib/supabase';

type PendingProfile = {
  id: string;
  full_name: string;
  email: string;
  member_category: 'student' | 'teacher' | 'staff';
  class_or_department: string;
  phone: string;
  created_at: string;
};

export default function AccountApprovalsPage() {
  const { currentRole } = useRole();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<PendingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    const { data, error } = await getSupabaseClient()
      .from('profiles')
      .select('id, full_name, email, member_category, class_or_department, phone, created_at')
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      setErrorMessage(error.message);
    } else {
      setProfiles(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (currentRole === 'admin') void loadProfiles();
  }, [currentRole, loadProfiles]);

  const setApproval = async (profile: PendingProfile, approvalStatus: 'approved' | 'rejected') => {
    setSavingId(profile.id);
    setErrorMessage('');
    const { error } = await getSupabaseClient()
      .from('profiles')
      .update({ approval_status: approvalStatus })
      .eq('id', profile.id);

    if (error) {
      setErrorMessage(error.message);
      toast('error', 'Gagal memperbarui persetujuan', error.message);
    } else {
      setProfiles(previous => previous.filter(item => item.id !== profile.id));
      toast('success', approvalStatus === 'approved' ? 'Akun disetujui' : 'Permintaan ditolak', profile.full_name);
    }
    setSavingId(null);
  };

  return (
    <AppLayout
      breadcrumbs={[{ label: 'Persetujuan Akun' }]}
      title="Persetujuan Akun"
      description="Tinjau permintaan pendaftaran sebelum pengguna dapat masuk."
    >
      {currentRole !== 'admin' ? (
        <Card><p className="text-sm text-red-700">Halaman ini hanya dapat diakses admin.</p></Card>
      ) : (
        <Card>
          {errorMessage && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>}
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">Memuat permintaan akun...</p>
          ) : profiles.length === 0 ? (
            <EmptyState
              icon={<Clock3 className="h-8 w-8" />}
              title="Tidak ada permintaan tertunda"
              description="Pendaftaran baru akan muncul di sini untuk ditinjau."
            />
          ) : (
            <div className="space-y-3">
              {profiles.map(profile => (
                <div key={profile.id} className="flex flex-col gap-4 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center">
                  <Avatar name={profile.full_name} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{profile.full_name}</p>
                    <p className="text-sm text-slate-600">{profile.email}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {profile.member_category} · {profile.class_or_department} · {profile.phone}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Daftar: {new Date(profile.created_at).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => void setApproval(profile, 'approved')}
                      loading={savingId === profile.id}
                      icon={<Check className="h-4 w-4" />}
                    >
                      Setujui
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={savingId !== null}
                      onClick={() => void setApproval(profile, 'rejected')}
                      icon={<X className="h-4 w-4" />}
                    >
                      Tolak
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </AppLayout>
  );
}
