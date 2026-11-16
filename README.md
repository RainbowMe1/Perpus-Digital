# EduLibrary - Digital Library Management System

Sistem Manajemen Perpustakaan Digital modern untuk sekolah, dibangun dengan Next.js 15, TypeScript, dan Tailwind CSS.

## ðŸš€ Fitur Utama

### Modul Lengkap
- **Dashboard** - Statistik dan analitik perpustakaan
- **Katalog Buku** - Manajemen koleksi buku dengan tampilan grid & table
- **Anggota** - Manajemen anggota (siswa, guru, staf)
- **Peminjaman** - Proses peminjaman buku dengan wizard 3 langkah
- **Pengembalian** - Proses pengembalian dengan kalkulasi denda otomatis
- **Laporan** - Laporan lengkap dengan grafik interaktif (Recharts)
- **Perpustakaan Digital** - Katalog e-book dengan e-reader built-in
- **E-Reader** - Pembaca digital dengan mode gelap, bookmark, dan kontrol font
- **Reservasi** - Sistem antrian reservasi buku
- **Perpanjangan** - Perpanjangan masa peminjaman
- **Notifikasi** - Pusat notifikasi real-time
- **Barcode & QR** - Generator dan scanner barcode
- **Wishlist** - Daftar buku favorit
- **Ulasan & Rating** - Sistem review dengan rating bintang
- **Pengadaan** - Manajemen akuisisi buku baru
- **Denda** - Manajemen denda keterlambatan
- **Pengaturan** - Konfigurasi sistem dan backup

### Multi-Role
- **Administrator** - Akses penuh ke semua fitur
- **Pustakawan** - Akses operasional harian
- **Siswa/Guru/Staf** - Akses sebagai anggota

### Fitur UI/UX
- Sidebar collapsible dengan navigasi responsif
- Top bar dengan search, notifikasi, dan profil pengguna
- Breadcrumb navigation
- Modal dialogs
- Toast notifications
- Tabs, pagination, dan filtering
- Tampilan grid dan table
- Empty states yang informatif
- Fully responsive (desktop, tablet, mobile)

## ðŸ› ï¸ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **Package Manager**: npm

## ðŸ“¦ Instalasi

### 1. Jalankan Script Generator

Script `create-project.ps1` akan membuat seluruh struktur proyek secara otomatis:

```powershell
.\create-project.ps1
```

### 2. Instal dependensi dan jalankan aplikasi

```powershell
cd digital-library
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

## ðŸ“ Struktur Proyek

```text
src/
â”œâ”€â”€ app/          # Halaman dan routing Next.js
â”œâ”€â”€ components/   # Komponen UI dan layout
â””â”€â”€ lib/          # Tipe, utilitas, konteks, dan data contoh
```

## ðŸ“ Catatan

Operasi utama menggunakan Supabase dengan Row Level Security. Grafik dan daftar
laporan dihitung dari transaksi yang dapat diakses akun yang sedang masuk.

## Supabase

1. Salin `.env.local.example` menjadi `.env.local`, lalu isi URL proyek dan
   anon/publishable key dari **Project Settings → API**.
2. Jika project masih kosong, jalankan `supabase/schema.sql` terlebih dahulu.
   Untuk project yang sudah memiliki tabel inti, jangan jalankan ulang file itu.
3. Jalankan `supabase/stage2.sql` di SQL Editor pada project existing. Migrasi
   ini menambahkan tabel/aturan fitur Tahap 2, RPC transaksi, RLS, dan bucket
   privat `ebooks`; periksa skema project sebelum menerapkan migrasi.
4. Jalankan `supabase/stage3.sql` setelah Tahap 2. Migrasi ini menambahkan
   penerimaan pengadaan yang memperbarui stok buku secara atomik.
5. Jalankan `supabase/stage4.sql` untuk menambahkan RPC yang menampilkan total
   anggota tanpa membuka data pribadi anggota lain.
6. Jalankan `supabase/stage5.sql` untuk mengaktifkan akses operasional staf,
   direktori anggota read-only, dan penyimpanan foto profil.
7. Di **Authentication → URL Configuration**, tambahkan URL aplikasi
   (misalnya `http://localhost:3000/login`) ke daftar URL redirect yang diizinkan.
8. Buat akun pertama lewat halaman **Daftar**, lalu jadikan akun tersebut admin
   melalui SQL Editor:

   ```sql
   update public.profiles
   set role = 'admin', approval_status = 'approved'
   where email = 'email-admin-anda@example.com';
   ```

Untuk project tes kosong, empat akun tes yang sudah disetujui dapat dibuat
dengan perintah ini di PowerShell:

```powershell
npm run create:test-accounts
```

Masukkan `service_role` key dan password tes melalui prompt tersembunyi. Skrip
membuat `edulibrary-test-admin@example.com`, `edulibrary-test-guru@example.com`,
`edulibrary-test-staf@example.com`, dan `edulibrary-test-siswa@example.com`;
semuanya memakai password tes yang sama. Gunakan hanya pada project tes.
Skrip menolak jika salah satu email sudah ada dan tidak mengubah akun yang ada.

E-book diunggah sebagai PDF melalui formulir buku dan disimpan pada bucket privat;
aplikasi membuat signed URL sementara saat membaca/mengunduh. E-reader mencatat
halaman yang dibuka dan menyimpan progres secara otomatis. Email notifikasi
memerlukan penyedia email yang dikonfigurasi terpisah. Ekspor pengaturan adalah
JSON lokal, bukan backup penuh database; restore belum tersedia.

## Deploy ke Vercel

1. Push proyek ke repository GitHub. File `.env.local` sudah dikecualikan oleh
   `.gitignore`; jangan commit atau membagikan file tersebut.
2. Di Vercel, pilih **Add New → Project**, lalu import repository GitHub itu.
   Vercel akan mendeteksi Next.js secara otomatis; gunakan `npm run build`.
3. Tambahkan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` pada
   **Project Settings → Environment Variables** untuk Production (dan Preview
   bila diperlukan). Gunakan URL proyek serta anon/publishable key dari Supabase;
   jangan masukkan `service_role` key.
4. Deploy. Setelah mendapat domain, tambahkan domain produksi ke Supabase pada
   **Authentication → URL Configuration** sebagai Site URL dan URL redirect
   yang diizinkan, misalnya `https://nama-proyek.vercel.app/login`.
5. Redeploy bila mengubah environment variable. Kamera scanner dapat dipakai di
   domain Vercel karena berjalan melalui HTTPS.

Gunakan hanya anon/publishable key di `.env.local`. Jangan pernah menaruh
`service_role` key di aplikasi browser atau membagikannya di chat. Akun baru
berstatus tertunda sampai admin menyetujuinya; peran admin/pustakawan diberikan
secara terpisah oleh admin.