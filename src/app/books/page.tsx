'use client';

import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { BookCard } from '@/components/features/book-card';
import { BookCover } from '@/components/features/book-cover';
import { useAppState, useToast, useRole } from '@/lib/context';
import { getSupabaseClient } from '@/lib/supabase';
import {
  Search, Plus, Grid3x3, List, Edit2, Trash2, Eye,
  BookOpen, Star, MapPin
} from 'lucide-react';
import Link from 'next/link';

export default function BooksPage() {
  const { books, addBook, updateBook, deleteBook } = useAppState();
  const { toast } = useToast();
  const { currentRole } = useRole();
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [publisherFilter, setPublisherFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    isbn: '',
    bookCode: '',
    publisher: '',
    publicationYear: String(new Date().getFullYear()),
    category: 'Fiksi',
    description: '',
    coverFile: null as File | null,
    totalStock: '1',
    shelfLocation: '',
    isDigital: false,
    digitalFile: null as File | null,
    pageCount: '',
  });
  const itemsPerPage = 12;

  const uploadDigitalFile = async (file: File) => {
    if (file.type !== 'application/pdf' || file.size > 50 * 1024 * 1024) {
      throw new Error('File e-book harus PDF dengan ukuran maksimal 50 MB.');
    }
    const path = `${crypto.randomUUID()}.pdf`;
    const { error } = await getSupabaseClient().storage.from('ebooks').upload(path, file, {
      contentType: 'application/pdf',
      upsert: false,
    });
    if (error) throw error;
    return path;
  };

  const uploadBookCover = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024) {
      throw new Error('Sampul harus berupa gambar JPG, PNG, atau WebP dengan ukuran maksimal 3 MB.');
    }
    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${crypto.randomUUID()}.${extension}`;
    const { error } = await getSupabaseClient().storage.from('book-covers').upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;
    return path;
  };

  const getStoredCoverPath = (coverImage: string) => {
    const marker = '/storage/v1/object/public/book-covers/';
    const markerIndex = coverImage.indexOf(marker);
    if (markerIndex >= 0) {
      return decodeURIComponent(coverImage.slice(markerIndex + marker.length).split('?')[0]);
    }
    return !/^[a-z][a-z\d+.-]*:/i.test(coverImage) && !coverImage.startsWith('/')
      ? coverImage
      : undefined;
  };

  const categories = useMemo(() => {
    const cats = Array.from(new Set(books.map(b => b.category)));
    return ['all', ...cats];
  }, [books]);
  const publishers = useMemo(() => {
    return ['all', ...Array.from(new Set(books.map(book => book.publisher).filter(Boolean)))];
  }, [books]);

  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      const matchSearch = !search ||
        book.title.toLowerCase().includes(search.toLowerCase()) ||
        book.author.toLowerCase().includes(search.toLowerCase()) ||
        book.isbn.toLowerCase().includes(search.toLowerCase()) ||
        book.bookCode.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === 'all' || book.category === categoryFilter;
      const matchPublisher = publisherFilter === 'all' || book.publisher === publisherFilter;
      const matchAvailability =
        availabilityFilter === 'all' ||
        (availabilityFilter === 'available' && book.availableStock > 0) ||
        (availabilityFilter === 'unavailable' && book.availableStock === 0);
      return matchSearch && matchCategory && matchPublisher && matchAvailability;
    });
  }, [books, search, categoryFilter, publisherFilter, availabilityFilter]);

  const totalPages = Math.ceil(filteredBooks.length / itemsPerPage);
  const paginatedBooks = filteredBooks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDelete = async () => {
    if (selectedBook) {
      try {
        const book = books.find(item => item.id === selectedBook);
        await deleteBook(selectedBook);
        const coverPath = book ? getStoredCoverPath(book.coverImage) : undefined;
        if (coverPath) {
          const { error: cleanupError } = await getSupabaseClient().storage.from('book-covers').remove([coverPath]);
          if (cleanupError) toast('error', 'Buku dihapus, tetapi sampul gagal dihapus', cleanupError.message);
        }
        if (book?.digitalFileUrl && !/^https?:\/\//i.test(book.digitalFileUrl)) {
          const { error: cleanupError } = await getSupabaseClient().storage.from('ebooks').remove([book.digitalFileUrl]);
          if (cleanupError) toast('error', 'Buku dihapus, tetapi file PDF gagal dihapus', cleanupError.message);
        }
        toast('success', 'Buku berhasil dihapus');
        setShowDeleteModal(false);
        setSelectedBook(null);
      } catch (error) {
        toast('error', 'Gagal menghapus buku', error instanceof Error ? error.message : 'Coba lagi.');
      }
    }
  };

  const handleAddBook = async () => {
    const stock = Number(bookForm.totalStock);
    const publicationYear = Number(bookForm.publicationYear);
    const pageCount = Number(bookForm.pageCount);
    if (!bookForm.title.trim() || !bookForm.author.trim() || !bookForm.bookCode.trim() || !Number.isInteger(stock) || stock < 0 || !Number.isInteger(publicationYear) || publicationYear < 1) {
      toast('error', 'Data buku belum valid', 'Isi judul, penulis, kode buku, tahun, dan stok dengan benar.');
      return;
    }

    let uploadedPath: string | undefined;
    let uploadedCoverPath: string | undefined;
    try {
      if (bookForm.isDigital && (!Number.isInteger(pageCount) || pageCount < 1)) {
        throw new Error('Jumlah halaman e-book harus diisi dengan angka positif.');
      }
      if (bookForm.isDigital && !bookForm.digitalFile) {
        throw new Error('Pilih file PDF untuk e-book.');
      }
      if (bookForm.coverFile) uploadedCoverPath = await uploadBookCover(bookForm.coverFile);
      if (bookForm.isDigital && bookForm.digitalFile) {
        uploadedPath = await uploadDigitalFile(bookForm.digitalFile);
      }
      await addBook({
        title: bookForm.title.trim(),
        author: bookForm.author.trim(),
        isbn: bookForm.isbn.trim(),
        bookCode: bookForm.bookCode.trim(),
        publisher: bookForm.publisher.trim(),
        publicationYear,
        category: bookForm.category,
        description: bookForm.description.trim(),
        coverImage: uploadedCoverPath ?? '',
        totalStock: stock,
        availableStock: stock,
        shelfLocation: bookForm.shelfLocation.trim(),
        isDigital: bookForm.isDigital,
        digitalFileUrl: uploadedPath,
        pageCount: bookForm.isDigital ? pageCount : undefined,
        rating: 0,
        reviewCount: 0,
      });
      toast('success', 'Buku berhasil ditambahkan');
      setShowAddModal(false);
      setBookForm({
        title: '',
        author: '',
        isbn: '',
        bookCode: '',
        publisher: '',
        publicationYear: String(new Date().getFullYear()),
        category: 'Fiksi',
        description: '',
        coverFile: null,
        totalStock: '1',
        shelfLocation: '',
        isDigital: false,
        digitalFile: null,
        pageCount: '',
      });
    } catch (error) {
      const cleanupErrors: string[] = [];
      if (uploadedPath) {
        const { error: cleanupError } = await getSupabaseClient().storage.from('ebooks').remove([uploadedPath]);
        if (cleanupError) cleanupErrors.push(cleanupError.message);
      }
      if (uploadedCoverPath) {
        const { error: cleanupError } = await getSupabaseClient().storage.from('book-covers').remove([uploadedCoverPath]);
        if (cleanupError) cleanupErrors.push(cleanupError.message);
      }
      if (cleanupErrors.length) {
        toast('error', 'Gagal menyimpan buku dan membersihkan file', cleanupErrors.join(' '));
        return;
      }
      toast('error', 'Gagal menambahkan buku', error instanceof Error ? error.message : 'Coba lagi.');
    }
  };

  const handleEditBook = async () => {
    const book = books.find(item => item.id === selectedBook);
    const stock = Number(bookForm.totalStock);
    const publicationYear = Number(bookForm.publicationYear);
    const pageCount = Number(bookForm.pageCount);
    if (!book) return;
    if (!bookForm.title.trim() || !bookForm.author.trim() || !bookForm.bookCode.trim() ||
      !Number.isInteger(stock) || stock < 0 || !Number.isInteger(publicationYear) || publicationYear < 1) {
      toast('error', 'Data buku belum valid', 'Periksa judul, penulis, kode, tahun terbit, dan stok.');
      return;
    }

    const borrowedStock = book.totalStock - book.availableStock;
    if (stock < borrowedStock) {
      toast('error', 'Stok tidak valid', `${borrowedStock} eksemplar sedang dipinjam; total stok tidak boleh kurang dari jumlah itu.`);
      return;
    }

    let uploadedPath: string | undefined;
    let uploadedCoverPath: string | undefined;
    try {
      if (bookForm.isDigital && (!Number.isInteger(pageCount) || pageCount < 1)) {
        throw new Error('Jumlah halaman e-book harus diisi dengan angka positif.');
      }
      if (bookForm.isDigital && !bookForm.digitalFile && !book.digitalFileUrl) {
        throw new Error('Pilih file PDF untuk e-book.');
      }
      if (bookForm.coverFile) uploadedCoverPath = await uploadBookCover(bookForm.coverFile);
      if (bookForm.isDigital && bookForm.digitalFile) {
        uploadedPath = await uploadDigitalFile(bookForm.digitalFile);
      }
      await updateBook(book.id, {
        title: bookForm.title.trim(),
        author: bookForm.author.trim(),
        isbn: bookForm.isbn.trim(),
        bookCode: bookForm.bookCode.trim(),
        publisher: bookForm.publisher.trim(),
        publicationYear,
        category: bookForm.category,
        description: bookForm.description.trim(),
        coverImage: uploadedCoverPath ?? getStoredCoverPath(book.coverImage) ?? book.coverImage,
        totalStock: stock,
        availableStock: stock - borrowedStock,
        shelfLocation: bookForm.shelfLocation.trim(),
        isDigital: bookForm.isDigital,
        digitalFileUrl: uploadedPath ?? (bookForm.isDigital ? book.digitalFileUrl : undefined),
        pageCount: bookForm.isDigital ? pageCount : undefined,
      });
      const oldCoverPath = getStoredCoverPath(book.coverImage);
      if (oldCoverPath && uploadedCoverPath) {
        const { error: cleanupError } = await getSupabaseClient().storage.from('book-covers').remove([oldCoverPath]);
        if (cleanupError) toast('error', 'Buku diperbarui, tetapi sampul lama gagal dihapus', cleanupError.message);
      }
      if (book.digitalFileUrl && !/^https?:\/\//i.test(book.digitalFileUrl) && (uploadedPath || !bookForm.isDigital)) {
        const { error: cleanupError } = await getSupabaseClient().storage.from('ebooks').remove([book.digitalFileUrl]);
        if (cleanupError) toast('error', 'Buku diperbarui, tetapi file PDF lama gagal dihapus', cleanupError.message);
      }
      toast('success', 'Data buku berhasil diperbarui');
      setShowEditModal(false);
      setSelectedBook(null);
    } catch (error) {
      const cleanupErrors: string[] = [];
      if (uploadedPath) {
        const { error: cleanupError } = await getSupabaseClient().storage.from('ebooks').remove([uploadedPath]);
        if (cleanupError) cleanupErrors.push(cleanupError.message);
      }
      if (uploadedCoverPath) {
        const { error: cleanupError } = await getSupabaseClient().storage.from('book-covers').remove([uploadedCoverPath]);
        if (cleanupError) cleanupErrors.push(cleanupError.message);
      }
      if (cleanupErrors.length) {
        toast('error', 'Gagal menyimpan perubahan dan membersihkan file', cleanupErrors.join(' '));
        return;
      }
      toast('error', 'Gagal memperbarui buku', error instanceof Error ? error.message : 'Coba lagi.');
    }
  };

  const openEditModal = (bookId: string) => {
    const book = books.find(item => item.id === bookId);
    if (!book) return;
    setSelectedBook(bookId);
    setBookForm({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      bookCode: book.bookCode,
      publisher: book.publisher,
      publicationYear: String(book.publicationYear),
      category: book.category,
      description: book.description,
      coverFile: null,
      totalStock: String(book.totalStock),
      shelfLocation: book.shelfLocation,
      isDigital: book.isDigital,
      digitalFile: null,
      pageCount: book.pageCount === undefined ? '' : String(book.pageCount),
    });
    setShowEditModal(true);
  };

  const bookToDelete = books.find(b => b.id === selectedBook);

  return (
    <AppLayout
      breadcrumbs={[{ label: 'Katalog Buku' }]}
      title="Katalog Buku"
      description={`${books.length} buku dalam koleksi perpustakaan`}
      actions={
        (currentRole === 'admin' || currentRole === 'librarian' || currentRole === 'staff') && (
          <Button onClick={() => setShowAddModal(true)} icon={<Plus className="w-4 h-4" />}>
            Tambah Buku
          </Button>
        )
      }
    >
      {/* Filters */}
      <Card padding="sm" className="mb-6">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Cari judul, penulis, ISBN, atau kode buku..."
              icon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <Select
            options={categories.map(c => ({ value: c, label: c === 'all' ? 'Semua Kategori' : c }))}
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
            className="lg:w-48"
          />
          <Select
            options={publishers.map(publisher => ({ value: publisher, label: publisher === 'all' ? 'Semua Penerbit' : publisher }))}
            value={publisherFilter}
            onChange={(e) => { setPublisherFilter(e.target.value); setCurrentPage(1); }}
            className="lg:w-48"
          />
          <Select
            options={[
              { value: 'all', label: 'Semua Status' },
              { value: 'available', label: 'Tersedia' },
              { value: 'unavailable', label: 'Habis' },
            ]}
            value={availabilityFilter}
            onChange={(e) => { setAvailabilityFilter(e.target.value); setCurrentPage(1); }}
            className="lg:w-48"
          />
          <div className="flex gap-1 border border-slate-300 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded ${viewMode === 'table' ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Content */}
      {filteredBooks.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BookOpen className="w-8 h-8" />}
            title="Tidak ada buku ditemukan"
            description="Coba ubah filter atau kata kunci pencarian Anda"
          />
        </Card>
      ) : viewMode === 'grid' ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
            {paginatedBooks.map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
          <Card padding="sm">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </Card>
        </>
      ) : (
        <Card padding="none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Buku</TableHead>
                <TableHead>ISBN</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead>Stok</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBooks.map(book => (
                <TableRow key={book.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <BookCover src={book.coverImage} alt={book.title} className="w-10 h-14 rounded object-cover" />
                      <div>
                        <p className="font-medium text-slate-900 line-clamp-1">{book.title}</p>
                        <p className="text-xs text-slate-500">{book.author}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-slate-100 px-2 py-1 rounded">{book.isbn}</code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{book.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-slate-600">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="text-sm">{book.shelfLocation}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={book.availableStock > 0 ? 'success' : 'danger'}>
                      {book.availableStock}/{book.totalStock}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-medium">{book.rating}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/books/${book.id}`}>
                        <button className="p-1.5 rounded hover:bg-slate-100 text-slate-600">
                          <Eye className="w-4 h-4" />
                        </button>
                      </Link>
                      {(currentRole === 'admin' || currentRole === 'librarian' || currentRole === 'staff') && (
                        <>
                          <button
                            onClick={() => openEditModal(book.id)}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setSelectedBook(book.id); setShowDeleteModal(true); }}
                            className="p-1.5 rounded hover:bg-red-50 text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </TableCell>
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

      {/* Add Book Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Tambah Buku Baru"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Batal</Button>
            <Button onClick={() => void handleAddBook()}>Simpan</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input label="Judul Buku" placeholder="Masukkan judul buku" required value={bookForm.title} onChange={event => setBookForm(previous => ({ ...previous, title: event.target.value }))} />
          </div>
          <Input label="Penulis" placeholder="Nama penulis" required value={bookForm.author} onChange={event => setBookForm(previous => ({ ...previous, author: event.target.value }))} />
          <Input label="ISBN" placeholder="978-xxx-xxx-xxx" value={bookForm.isbn} onChange={event => setBookForm(previous => ({ ...previous, isbn: event.target.value }))} />
          <Input label="Penerbit" placeholder="Nama penerbit" value={bookForm.publisher} onChange={event => setBookForm(previous => ({ ...previous, publisher: event.target.value }))} />
          <Input label="Tahun Terbit" type="number" min="1" required value={bookForm.publicationYear} onChange={event => setBookForm(previous => ({ ...previous, publicationYear: event.target.value }))} />
          <Select
            label="Kategori"
            value={bookForm.category}
            onChange={event => setBookForm(previous => ({ ...previous, category: event.target.value }))}
            options={Array.from(new Set(['Fiksi', 'Nonfiksi', 'Sains', 'Sejarah', ...categories.filter(c => c !== 'all')])).map(category => ({ value: category, label: category }))}
          />
          <Input label="Lokasi Rak" placeholder="A-1-1" value={bookForm.shelfLocation} onChange={event => setBookForm(previous => ({ ...previous, shelfLocation: event.target.value }))} />
          <Input label="Total Stok" type="number" min="0" required value={bookForm.totalStock} onChange={event => setBookForm(previous => ({ ...previous, totalStock: event.target.value }))} />
          <Input label="Kode Buku" placeholder="BK-XXX" required value={bookForm.bookCode} onChange={event => setBookForm(previous => ({ ...previous, bookCode: event.target.value }))} />
          <label className="md:col-span-2 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={bookForm.isDigital} onChange={event => setBookForm(previous => ({ ...previous, isDigital: event.target.checked, digitalFile: event.target.checked ? previous.digitalFile : null }))} className="rounded" />
            Buku memiliki versi e-book PDF
          </label>
          {bookForm.isDigital && (
            <>
              <Input label="Jumlah Halaman" type="number" min="1" required value={bookForm.pageCount} onChange={event => setBookForm(previous => ({ ...previous, pageCount: event.target.value }))} />
              <label className="block text-sm font-medium text-slate-700">
                File PDF (maksimal 50 MB) {bookForm.digitalFile && <span className="font-normal text-slate-500">— {bookForm.digitalFile.name}</span>}
                <input type="file" accept="application/pdf,.pdf" onChange={event => setBookForm(previous => ({ ...previous, digitalFile: event.target.files?.[0] ?? null }))} className="mt-1.5 block w-full text-sm" />
              </label>
            </>
          )}
          <label className="md:col-span-2 block text-sm font-medium text-slate-700">
            Foto sampul buku (opsional, JPG/PNG/WebP maks. 3 MB)
            {bookForm.coverFile && <span className="ml-1 font-normal text-slate-500">— {bookForm.coverFile.name}</span>}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={event => setBookForm(previous => ({ ...previous, coverFile: event.target.files?.[0] ?? null }))}
              className="mt-1.5 block w-full text-sm"
            />
          </label>
          <div className="md:col-span-2">
            <Textarea label="Deskripsi" placeholder="Deskripsi buku" value={bookForm.description} onChange={event => setBookForm(previous => ({ ...previous, description: event.target.value }))} />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Data Buku"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Batal</Button>
            <Button onClick={() => void handleEditBook()}>Simpan Perubahan</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input label="Judul Buku" required value={bookForm.title} onChange={event => setBookForm(previous => ({ ...previous, title: event.target.value }))} />
          </div>
          <Input label="Penulis" required value={bookForm.author} onChange={event => setBookForm(previous => ({ ...previous, author: event.target.value }))} />
          <Input label="ISBN" value={bookForm.isbn} onChange={event => setBookForm(previous => ({ ...previous, isbn: event.target.value }))} />
          <Input label="Penerbit" value={bookForm.publisher} onChange={event => setBookForm(previous => ({ ...previous, publisher: event.target.value }))} />
          <Input label="Tahun Terbit" type="number" min="1" required value={bookForm.publicationYear} onChange={event => setBookForm(previous => ({ ...previous, publicationYear: event.target.value }))} />
          <Select
            label="Kategori"
            value={bookForm.category}
            onChange={event => setBookForm(previous => ({ ...previous, category: event.target.value }))}
            options={Array.from(new Set(['Fiksi', 'Nonfiksi', 'Sains', 'Sejarah', ...categories.filter(category => category !== 'all')])).map(category => ({ value: category, label: category }))}
          />
          <Input label="Lokasi Rak" value={bookForm.shelfLocation} onChange={event => setBookForm(previous => ({ ...previous, shelfLocation: event.target.value }))} />
          <Input label="Total Stok" type="number" min="0" required value={bookForm.totalStock} onChange={event => setBookForm(previous => ({ ...previous, totalStock: event.target.value }))} />
          <Input label="Kode Buku" required value={bookForm.bookCode} onChange={event => setBookForm(previous => ({ ...previous, bookCode: event.target.value }))} />
          <label className="md:col-span-2 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={bookForm.isDigital} onChange={event => setBookForm(previous => ({ ...previous, isDigital: event.target.checked, digitalFile: event.target.checked ? previous.digitalFile : null }))} className="rounded" />
            Buku memiliki versi e-book PDF
          </label>
          {bookForm.isDigital && (
            <>
              <Input label="Jumlah Halaman" type="number" min="1" required value={bookForm.pageCount} onChange={event => setBookForm(previous => ({ ...previous, pageCount: event.target.value }))} />
              <label className="block text-sm font-medium text-slate-700">
                Ganti file PDF (kosongkan untuk mempertahankan file saat ini)
                {bookForm.digitalFile && <span className="block font-normal text-slate-500">{bookForm.digitalFile.name}</span>}
                <input type="file" accept="application/pdf,.pdf" onChange={event => setBookForm(previous => ({ ...previous, digitalFile: event.target.files?.[0] ?? null }))} className="mt-1.5 block w-full text-sm" />
              </label>
            </>
          )}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Ganti foto sampul (opsional, JPG/PNG/WebP maks. 3 MB)
              {bookForm.coverFile && <span className="ml-1 font-normal text-slate-500">— {bookForm.coverFile.name}</span>}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={event => setBookForm(previous => ({ ...previous, coverFile: event.target.files?.[0] ?? null }))}
                className="mt-1.5 block w-full text-sm"
              />
            </label>
            <div className="mt-3">
              <BookCover
                src={books.find(book => book.id === selectedBook)?.coverImage}
                alt="Sampul buku saat ini"
                className="h-28 w-20 rounded object-cover"
              />
            </div>
            <Textarea className="mt-4" label="Deskripsi" value={bookForm.description} onChange={event => setBookForm(previous => ({ ...previous, description: event.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Konfirmasi Hapus"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Batal</Button>
            <Button variant="danger" onClick={handleDelete}>Hapus</Button>
          </>
        }
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-slate-900 font-medium">Apakah Anda yakin ingin menghapus buku ini?</p>
            <p className="text-sm text-slate-500 mt-1">
              Buku &quot;{bookToDelete?.title}&quot; akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}