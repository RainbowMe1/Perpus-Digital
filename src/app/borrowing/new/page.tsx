'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { BookCover } from '@/components/features/book-cover';
import { BarcodeScanner } from '@/components/features/barcode-scanner';
import { useAppState, useRole, useToast } from '@/lib/context';
import { getLocalDateInputValue } from '@/lib/utils';
import { ArrowLeft, Search, Check, X, Scan } from 'lucide-react';

export default function NewBorrowingPage() {
  const router = useRouter();
  const { members, books, addTransaction, librarySettings } = useAppState();
  const { currentRole } = useRole();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [scanMember, setScanMember] = useState(false);
  const [bookSearch, setBookSearch] = useState('');
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [scanBook, setScanBook] = useState(false);
  const [borrowDate, setBorrowDate] = useState(() => getLocalDateInputValue());
  const [dueDate, setDueDate] = useState(() => {
    const due = new Date();
    due.setDate(due.getDate() + 14);
    return getLocalDateInputValue(due);
  });
  const maxBooksPerMember = librarySettings?.maxBooksPerMember ?? 3;
  const maxBorrowDays = librarySettings?.maxBorrowDays ?? 14;
  const isStaff = currentRole === 'admin' || currentRole === 'librarian' || currentRole === 'staff';

  useEffect(() => {
    const due = new Date(`${borrowDate}T00:00:00`);
    due.setDate(due.getDate() + maxBorrowDays);
    setDueDate(getLocalDateInputValue(due));
  }, [borrowDate, maxBorrowDays]);

  const member = members.find(m => m.id === selectedMember);
  const filteredMembers = members.filter(m =>
    m.status === 'active' &&
    (!memberSearch || m.fullName.toLowerCase().includes(memberSearch.toLowerCase()) || m.memberNumber.toLowerCase().includes(memberSearch.toLowerCase()))
  );
  const filteredBooks = books.filter(b =>
    b.availableStock > 0 &&
    !selectedBooks.includes(b.id) &&
    (!bookSearch || b.title.toLowerCase().includes(bookSearch.toLowerCase()) ||
      b.author.toLowerCase().includes(bookSearch.toLowerCase()) ||
      b.bookCode.toLowerCase().includes(bookSearch.toLowerCase()) ||
      b.isbn.toLowerCase().includes(bookSearch.toLowerCase()))
  );

  const toggleBook = (bookId: string) => {
    if (selectedBooks.includes(bookId)) {
      setSelectedBooks(selectedBooks.filter(id => id !== bookId));
    } else if (selectedBooks.length < maxBooksPerMember && (!member || member.activeLoans + selectedBooks.length < maxBooksPerMember)) {
      setSelectedBooks([...selectedBooks, bookId]);
    }
  };

  const selectScannedMember = (code: string) => {
    const scannedMember = members.find(item =>
      item.memberNumber.toLowerCase() === code.trim().toLowerCase()
    );
    if (!scannedMember || scannedMember.status !== 'active') {
      toast('warning', 'Kartu anggota tidak ditemukan atau tidak aktif', code);
      return;
    }
    setSelectedMember(scannedMember.id);
    setStep(2);
    setScanMember(false);
    toast('success', 'Anggota dipilih', scannedMember.fullName);
  };

  const selectScannedBook = (code: string) => {
    const scannedBook = books.find(item =>
      item.bookCode.toLowerCase() === code.trim().toLowerCase()
    );
    if (!scannedBook) {
      toast('warning', 'Kode buku tidak ditemukan', code);
      return;
    }
    if (scannedBook.availableStock < 1) {
      toast('warning', 'Buku sedang tidak tersedia', scannedBook.title);
      return;
    }
    if (selectedBooks.includes(scannedBook.id)) {
      toast('info', 'Buku sudah dipilih', scannedBook.title);
      return;
    }
    if (selectedBooks.length >= maxBooksPerMember ||
      (member && member.activeLoans + selectedBooks.length >= maxBooksPerMember)) {
      toast('warning', 'Batas jumlah buku tercapai');
      return;
    }
    setSelectedBooks(previous => [...previous, scannedBook.id]);
    toast('success', 'Buku ditambahkan', scannedBook.title);
  };

  const handleSubmit = async () => {
    if (!member || selectedBooks.length === 0) return;
    if (member.activeLoans + selectedBooks.length > maxBooksPerMember) {
      toast('error', 'Batas peminjaman terlampaui', `Anggota hanya dapat meminjam maksimal ${maxBooksPerMember} buku.`);
      return;
    }
    const latestDueDate = new Date(`${borrowDate}T00:00:00`);
    latestDueDate.setDate(latestDueDate.getDate() + maxBorrowDays);
    if (!borrowDate || !dueDate || dueDate <= borrowDate || dueDate > getLocalDateInputValue(latestDueDate)) {
      toast('error', 'Tanggal peminjaman tidak valid', `Jatuh tempo maksimal ${maxBorrowDays} hari setelah tanggal pinjam.`);
      return;
    }
    try {
      await addTransaction({
      memberId: member.id,
      books: selectedBooks.map(id => {
        const b = books.find(x => x.id === id)!;
        return { bookId: b.id, title: b.title, bookCode: b.bookCode, coverImage: b.coverImage };
      }),
      borrowingDate: borrowDate,
      dueDate: dueDate,
      });
      toast('success', 'Peminjaman berhasil dicatat', `${selectedBooks.length} buku dipinjam oleh ${member.fullName}`);
      router.push('/borrowing');
    } catch (error) {
      toast('error', 'Gagal mencatat peminjaman', error instanceof Error ? error.message : 'Coba lagi.');
    }
  };

  if (!isStaff) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Peminjaman', href: '/borrowing' }, { label: 'Akses Ditolak' }]} title="Akses Ditolak">
        <Card><p className="text-sm text-slate-600">Pencatatan peminjaman tersedia untuk admin, pustakawan, dan staf perpustakaan.</p></Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      breadcrumbs={[
        { label: 'Peminjaman', href: '/borrowing' },
        { label: 'Peminjaman Baru' }
      ]}
      title="Peminjaman Baru"
      description="Catat transaksi peminjaman buku baru"
      actions={
        <Button variant="ghost" onClick={() => router.back()} icon={<ArrowLeft className="w-4 h-4" />}>
          Batal
        </Button>
      }
    >
      {/* Step Indicator */}
      <Card padding="sm" className="mb-6">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: 'Pilih Anggota' },
            { num: 2, label: 'Pilih Buku' },
            { num: 3, label: 'Detail & Konfirmasi' },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step >= s.num ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <span className={`text-sm font-medium hidden sm:block ${step >= s.num ? 'text-slate-900' : 'text-slate-500'}`}>
                  {s.label}
                </span>
              </div>
              {i < 2 && <div className={`flex-1 h-0.5 mx-2 ${step > s.num ? 'bg-primary-600' : 'bg-slate-200'}`} />}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {step === 1 && (
            <Card>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Pilih Anggota</h3>
              <Input
                placeholder="Cari nama atau nomor anggota..."
                icon={<Search className="w-4 h-4" />}
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="mb-4"
              />
              <Button variant="outline" className="mb-4" onClick={() => setScanMember(previous => !previous)}>
                <Scan className="w-4 h-4" />{scanMember ? 'Tutup scanner kartu' : 'Scan kartu anggota'}
              </Button>
              {scanMember && (
                <div className="mb-4">
                  <BarcodeScanner
                    onDetected={selectScannedMember}
                    onError={error => toast('error', 'Tidak dapat membuka kamera', error.message)}
                  />
                </div>
              )}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredMembers.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedMember(m.id); setStep(2); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                      selectedMember === m.id ? 'border-primary-600 bg-primary-50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Avatar name={m.fullName} size="sm" />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{m.fullName}</p>
                      <p className="text-xs text-slate-500">{m.memberNumber} â€¢ {m.classOrDepartment}</p>
                    </div>
                    <Badge variant={m.category === 'student' ? 'info' : 'warning'}>
                      {m.category === 'student' ? 'Siswa' : m.category === 'teacher' ? 'Guru' : 'Staf'}
                    </Badge>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Pilih Buku</h3>
                <Badge variant="info">{selectedBooks.length}/{maxBooksPerMember} buku dipilih</Badge>
              </div>
              <Input
                placeholder="Cari judul atau penulis..."
                icon={<Search className="w-4 h-4" />}
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
                className="mb-4"
              />
              <Button variant="outline" className="mb-4" onClick={() => setScanBook(previous => !previous)}>
                <Scan className="w-4 h-4" />{scanBook ? 'Tutup scanner buku' : 'Scan barcode buku'}
              </Button>
              {scanBook && (
                <div className="mb-4">
                  <BarcodeScanner
                    onDetected={selectScannedBook}
                    onError={error => toast('error', 'Tidak dapat membuka kamera', error.message)}
                  />
                </div>
              )}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredBooks.map(b => {
                  const isSelected = selectedBooks.includes(b.id);
                  return (
                    <button
                      key={b.id}
                      onClick={() => toggleBook(b.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                        isSelected ? 'border-primary-600 bg-primary-50' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <BookCover src={b.coverImage} alt={b.title} className="w-10 h-14 rounded object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{b.title}</p>
                        <p className="text-xs text-slate-500">{b.author} â€¢ {b.category}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={b.availableStock > 0 ? 'success' : 'danger'}>
                          {b.availableStock} tersedia
                        </Badge>
                        {isSelected && <Check className="w-4 h-4 text-primary-600 mt-2 ml-auto" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={() => setStep(1)}>Kembali</Button>
                <Button onClick={() => setStep(3)} disabled={selectedBooks.length === 0}>
                  Lanjutkan
                </Button>
              </div>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Detail Peminjaman</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal Pinjam</label>
                  <input
                    type="date"
                    value={borrowDate}
                    onChange={(e) => setBorrowDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Jatuh Tempo</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={() => setStep(2)}>Kembali</Button>
                <Button onClick={() => void handleSubmit()}>Konfirmasi Peminjaman</Button>
              </div>
            </Card>
          )}
        </div>

        {/* Summary Sidebar */}
        <Card>
          <h3 className="font-semibold text-slate-900 mb-4">Ringkasan</h3>
          {member ? (
            <div className="p-3 rounded-lg bg-slate-50 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Avatar name={member.fullName} size="sm" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{member.fullName}</p>
                  <p className="text-xs text-slate-500">{member.memberNumber}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Peminjaman aktif: {member.activeLoans}/{maxBooksPerMember}
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-slate-50 mb-4 text-center text-sm text-slate-500">
              Belum ada anggota dipilih
            </div>
          )}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Buku Dipilih ({selectedBooks.length}):</p>
            {selectedBooks.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">Belum ada buku dipilih</p>
            ) : (
              selectedBooks.map(id => {
                const b = books.find(x => x.id === id);
                if (!b) return null;
                return (
                  <div key={id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                    <BookCover src={b.coverImage} alt={b.title} className="w-8 h-10 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">{b.title}</p>
                      <p className="text-xs text-slate-500">{b.bookCode}</p>
                    </div>
                    <button onClick={() => toggleBook(id)} className="text-red-500 hover:text-red-700">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}