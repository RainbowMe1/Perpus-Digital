-- Original demo books for testing barcode, QR, borrowing, and reservations.
-- Run in the Supabase SQL Editor. Re-running this script will not reset stock.

insert into public.books (
  title,
  author,
  isbn,
  book_code,
  publisher,
  publication_year,
  category,
  description,
  cover_image,
  total_stock,
  available_stock,
  shelf_location,
  is_digital,
  digital_file_url,
  page_count,
  rating,
  review_count
)
values
  (
    'Komet di Atas Teluk Sagara',
    'Nara Wening',
    '',
    'TEST-BK-001',
    'Penerbit Langit Kecil',
    2024,
    'Fiksi',
    'Cerita orisinal tentang seorang penjaga mercusuar muda yang memetakan hujan meteor di pesisir.',
    '/book-cover-placeholder.svg',
    3,
    3,
    'UJI-A-01',
    false,
    null,
    null,
    0,
    0
  ),
  (
    'Atlas Rasa dan Arah Angin',
    'Raka Samudra',
    '',
    'TEST-BK-002',
    'Penerbit Langit Kecil',
    2023,
    'Sains',
    'Buku pengantar orisinal tentang cuaca, arah angin, dan cara membaca peta sederhana.',
    '/book-cover-placeholder.svg',
    2,
    2,
    'UJI-A-02',
    false,
    null,
    null,
    0,
    0
  ),
  (
    'Taman yang Menyimpan Hujan',
    'Mira Arunika',
    '',
    'TEST-BK-003',
    'Penerbit Aksara Embun',
    2025,
    'Fiksi',
    'Novel orisinal tentang taman kota yang hanya muncul setelah hujan pertama di bulan kemarau.',
    '/book-cover-placeholder.svg',
    1,
    1,
    'UJI-B-01',
    false,
    null,
    null,
    0,
    0
  ),
  (
    'Pulau Kecil Tanpa Penunjuk Utara',
    'Dira Purnama',
    '',
    'TEST-BK-004',
    'Penerbit Aksara Embun',
    2022,
    'Petualangan',
    'Judul uji tanpa stok untuk mencoba alur reservasi buku yang sedang tidak tersedia.',
    '/book-cover-placeholder.svg',
    0,
    0,
    'UJI-B-02',
    false,
    null,
    null,
    0,
    0
  )
on conflict (book_code) do update
  set cover_image = excluded.cover_image;

update public.transaction_books tb
set cover_image = b.cover_image
from public.books b
where tb.book_id = b.id
  and b.book_code like 'TEST-BK-%'
  and tb.cover_image = '';
