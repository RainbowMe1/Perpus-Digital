'use client';

import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { useAppState, useToast, useRole } from '@/lib/context';
import { getStatusVariant } from '@/lib/utils';
import type { Member, MemberDirectoryEntry } from '@/lib/types';
import { Search, Plus, Eye, Edit2, UserCheck, Users, GraduationCap } from 'lucide-react';
import Link from 'next/link';

function isDetailedMember(member: Member | MemberDirectoryEntry): member is Member {
  return 'email' in member;
}

export default function MembersPage() {
  const {
    members, memberDirectory, memberDirectoryError, addMember, updateMember,
    totalMemberCount, totalMemberCountError,
  } = useAppState();
  const { toast } = useToast();
  const { currentRole } = useRole();
  const isLibraryStaff = currentRole === 'admin' || currentRole === 'librarian' || currentRole === 'staff';
  const visibleMembers = isLibraryStaff ? members : memberDirectory;
  const displayedMemberCount = totalMemberCount ?? (isLibraryStaff ? members.length : null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const selectedMember = members.find(member => member.id === selectedMemberId);
  const [memberForm, setMemberForm] = useState({
    fullName: '',
    category: 'student' as 'student' | 'teacher' | 'staff',
    classOrDepartment: '',
    email: '',
    phone: '',
  });
  const itemsPerPage = 10;

  const handleAddMember = async () => {
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(memberForm.email.trim());
    if (!memberForm.fullName.trim() || !memberForm.classOrDepartment.trim() || !validEmail || !memberForm.phone.trim()) {
      toast('error', 'Data anggota belum lengkap', 'Lengkapi seluruh kolom sebelum menyimpan.');
      return;
    }

    try {
      await addMember({
        fullName: memberForm.fullName.trim(),
        category: memberForm.category,
        classOrDepartment: memberForm.classOrDepartment.trim(),
        email: memberForm.email.trim(),
        phone: memberForm.phone.trim(),
      });
      toast('success', 'Anggota berhasil ditambahkan');
      setShowAddModal(false);
      setMemberForm({ fullName: '', category: 'student', classOrDepartment: '', email: '', phone: '' });
    } catch (error) {
      toast('error', 'Gagal menambahkan anggota', error instanceof Error ? error.message : 'Coba lagi.');
    }
  };

  const openEditModal = (memberId: string) => {
    const member = members.find(item => item.id === memberId);
    if (!member) return;
    setSelectedMemberId(memberId);
    setMemberForm({
      fullName: member.fullName,
      category: member.category,
      classOrDepartment: member.classOrDepartment,
      email: member.email,
      phone: member.phone,
    });
    setEditStatus(member.status);
    setShowEditModal(true);
  };

  const [editStatus, setEditStatus] = useState<'active' | 'inactive' | 'suspended'>('active');

  const handleEditMember = async () => {
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(memberForm.email.trim());
    if (!selectedMemberId || !memberForm.fullName.trim() || !memberForm.classOrDepartment.trim() ||
      !validEmail || !memberForm.phone.trim()) {
      toast('error', 'Data anggota belum valid', 'Periksa nama, kelas/departemen, email, dan nomor telepon.');
      return;
    }

    try {
      await updateMember(selectedMemberId, {
        fullName: memberForm.fullName.trim(),
        category: memberForm.category,
        classOrDepartment: memberForm.classOrDepartment.trim(),
        email: memberForm.email.trim(),
        phone: memberForm.phone.trim(),
        status: editStatus,
      });
      toast('success', 'Data anggota berhasil diperbarui');
      setShowEditModal(false);
      setSelectedMemberId(null);
    } catch (error) {
      toast('error', 'Gagal memperbarui anggota', error instanceof Error ? error.message : 'Coba lagi.');
    }
  };

  const filteredMembers = useMemo(() => {
    return visibleMembers.filter(member => {
      const matchSearch = !search ||
        member.fullName.toLowerCase().includes(search.toLowerCase()) ||
        member.memberNumber.toLowerCase().includes(search.toLowerCase()) ||
        (isLibraryStaff && isDetailedMember(member) && member.email.toLowerCase().includes(search.toLowerCase()));
      const matchCategory = categoryFilter === 'all' || member.category === categoryFilter;
      const matchStatus = !isLibraryStaff || statusFilter === 'all' ||
        (isDetailedMember(member) && member.status === statusFilter);
      return matchSearch && matchCategory && matchStatus;
    });
  }, [visibleMembers, isLibraryStaff, search, categoryFilter, statusFilter]);

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = {
    total: members.length,
    students: members.filter(m => m.category === 'student').length,
    teachers: members.filter(m => m.category === 'teacher').length,
    staff: members.filter(m => m.category === 'staff').length,
  };

  return (
    <AppLayout
      breadcrumbs={[{ label: 'Anggota' }]}
      title={isLibraryStaff ? 'Manajemen Anggota' : 'Daftar Anggota'}
      description={isLibraryStaff
        ? `${members.length} anggota terdaftar`
        : `Total ${displayedMemberCount?.toLocaleString('id-ID') ?? '—'} anggota. Daftar ini hanya menampilkan informasi umum, tanpa kontak pribadi.`}
      actions={
        isLibraryStaff && (
          <Button onClick={() => setShowAddModal(true)} icon={<Plus className="w-4 h-4" />}>
            Tambah Anggota
          </Button>
        )
      }
    >
      {!isLibraryStaff && (totalMemberCountError || memberDirectoryError) && (
        <p role="status" className="mb-4 text-sm text-amber-700">
          Daftar anggota belum tersedia. Jalankan migrasi <code>supabase/stage5.sql</code> di Supabase SQL Editor.
        </p>
      )}
      {/* Stats */}
      {isLibraryStaff && <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Anggota</p>
              <p className="text-lg font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Siswa</p>
              <p className="text-lg font-bold text-slate-900">{stats.students}</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Guru</p>
              <p className="text-lg font-bold text-slate-900">{stats.teachers}</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Staf</p>
              <p className="text-lg font-bold text-slate-900">{stats.staff}</p>
            </div>
          </div>
        </Card>
      </div>}

      {/* Filters */}
      <Card padding="sm" className="mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder={isLibraryStaff ? 'Cari nama, nomor anggota, atau email...' : 'Cari nama atau nomor anggota...'}
              icon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <Select
            options={[
              { value: 'all', label: 'Semua Kategori' },
              { value: 'student', label: 'Siswa' },
              { value: 'teacher', label: 'Guru' },
              { value: 'staff', label: 'Staf' },
            ]}
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
            className="md:w-48"
          />
          {isLibraryStaff && (
            <Select
              options={[
                { value: 'all', label: 'Semua Status' },
                { value: 'active', label: 'Aktif' },
                { value: 'inactive', label: 'Tidak Aktif' },
                { value: 'suspended', label: 'Ditangguhkan' },
              ]}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="md:w-48"
            />
          )}
        </div>
      </Card>

      {/* Table */}
      {filteredMembers.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="w-8 h-8" />}
            title="Tidak ada anggota ditemukan"
            description={isLibraryStaff
              ? 'Coba ubah filter atau kata kunci pencarian Anda'
              : 'Coba ubah filter atau kata kunci pencarian Anda.'}
          />
        </Card>
      ) : (
        <Card padding="none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Anggota</TableHead>
                <TableHead>Nomor Anggota</TableHead>
                <TableHead>Kategori</TableHead>
                {isLibraryStaff && <TableHead>Kelas/Dept</TableHead>}
                {isLibraryStaff && <TableHead>Kontak</TableHead>}
                {isLibraryStaff && <TableHead>Peminjaman</TableHead>}
                {isLibraryStaff && <TableHead>Status</TableHead>}
                {isLibraryStaff && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMembers.map(member => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={member.fullName} size="sm" />
                      <div>
                        <p className="font-medium text-slate-900">{member.fullName}</p>
                        {isLibraryStaff && isDetailedMember(member) && <p className="text-xs text-slate-500">{member.email}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-slate-100 px-2 py-1 rounded">{member.memberNumber}</code>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.category === 'student' ? 'info' : member.category === 'teacher' ? 'warning' : 'default'}>
                      {member.category === 'student' ? 'Siswa' : member.category === 'teacher' ? 'Guru' : 'Staf'}
                    </Badge>
                  </TableCell>
                  {isLibraryStaff && isDetailedMember(member) && (
                    <TableCell className="text-slate-600">{member.classOrDepartment}</TableCell>
                  )}
                  {isLibraryStaff && isDetailedMember(member) && <TableCell><p className="text-sm text-slate-600">{member.phone}</p></TableCell>}
                  {isLibraryStaff && isDetailedMember(member) && <TableCell>
                    <div className="text-sm">
                      <p className="font-medium text-slate-900">{member.activeLoans} aktif</p>
                      <p className="text-xs text-slate-500">{member.totalBorrowed} total</p>
                    </div>
                  </TableCell>}
                  {isLibraryStaff && isDetailedMember(member) && <TableCell>
                    <Badge variant={getStatusVariant(member.status)}>
                      {member.status === 'active' ? 'Aktif' : member.status === 'suspended' ? 'Ditangguhkan' : 'Tidak Aktif'}
                    </Badge>
                  </TableCell>}
                  {isLibraryStaff && <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/members/${member.id}`}>
                        <button className="p-1.5 rounded hover:bg-slate-100 text-slate-600">
                          <Eye className="w-4 h-4" />
                        </button>
                      </Link>
                      {(currentRole === 'admin' || currentRole === 'librarian' || currentRole === 'staff') && (
                        <button
                          onClick={() => openEditModal(member.id)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-4 border-t border-slate-200">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </Card>
      )}

      {/* Add Member Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Tambah Anggota Baru"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Batal</Button>
            <Button onClick={() => void handleAddMember()}>Simpan</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input label="Nama Lengkap" placeholder="Masukkan nama lengkap" required value={memberForm.fullName} onChange={event => setMemberForm(previous => ({ ...previous, fullName: event.target.value }))} />
          </div>
          <Select
            label="Kategori"
            value={memberForm.category}
            onChange={event => {
              const value = event.target.value;
              if (value === 'student' || value === 'teacher' || value === 'staff') {
                setMemberForm(previous => ({ ...previous, category: value }));
              }
            }}
            options={[
              { value: 'student', label: 'Siswa' },
              { value: 'teacher', label: 'Guru' },
              { value: 'staff', label: 'Staf' },
            ]}
          />
          <Input label="Kelas / Departemen" placeholder="XII IPA 1" required value={memberForm.classOrDepartment} onChange={event => setMemberForm(previous => ({ ...previous, classOrDepartment: event.target.value }))} />
          <Input label="Email" type="email" placeholder="email@example.com" required value={memberForm.email} onChange={event => setMemberForm(previous => ({ ...previous, email: event.target.value }))} />
          <Input label="No. Telepon" placeholder="08xxxxxxxxxx" required value={memberForm.phone} onChange={event => setMemberForm(previous => ({ ...previous, phone: event.target.value }))} />
        </div>
      </Modal>
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Data Anggota"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Batal</Button>
            <Button onClick={() => void handleEditMember()}>Simpan Perubahan</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input label="Nama Lengkap" required value={memberForm.fullName} onChange={event => setMemberForm(previous => ({ ...previous, fullName: event.target.value }))} />
          </div>
          <Select
            label="Kategori"
            value={memberForm.category}
            onChange={event => {
              const value = event.target.value;
              if (value === 'student' || value === 'teacher' || value === 'staff') {
                setMemberForm(previous => ({ ...previous, category: value }));
              }
            }}
            options={[
              { value: 'student', label: 'Siswa' },
              { value: 'teacher', label: 'Guru' },
              { value: 'staff', label: 'Staf' },
            ]}
          />
          <Select
            label="Status Keanggotaan"
            value={editStatus}
            onChange={event => {
              const value = event.target.value;
              if (value === 'active' || value === 'inactive' || value === 'suspended') setEditStatus(value);
            }}
            options={[
              { value: 'active', label: 'Aktif' },
              { value: 'inactive', label: 'Tidak Aktif' },
              { value: 'suspended', label: 'Ditangguhkan' },
            ]}
          />
          <Input label="Kelas / Departemen" required value={memberForm.classOrDepartment} onChange={event => setMemberForm(previous => ({ ...previous, classOrDepartment: event.target.value }))} />
          <Input label="Email" type="email" required disabled={Boolean(selectedMember?.userId)} value={memberForm.email} onChange={event => setMemberForm(previous => ({ ...previous, email: event.target.value }))} />
          <Input label="No. Telepon" required value={memberForm.phone} onChange={event => setMemberForm(previous => ({ ...previous, phone: event.target.value }))} />
        </div>
      </Modal>
    </AppLayout>
  );
}