# M-GYM (Gym Management System) v2

M-GYM adalah sistem manajemen komprehensif untuk operasional pusat kebugaran (Gym). Aplikasi ini dibangun dengan performa tinggi dan keamanan standar industri, yang dibagi menjadi Backend (Golang) dan Frontend (React + Vite).

## Fitur Utama

### 1. Multi-Role Authentication
- **Admin**: Akses penuh ke seluruh fitur (Dashboard, Members, Scanner, Billing, Templates, Discounts).
- **Member**: Portal khusus member untuk melihat masa aktif langganan, update profil (Telepon, Email, Alamat, Foto), dan mengunduh Kartu Digital (QR Code).

### 2. Manajemen Member & Kehadiran
- Pendaftaran member baru dengan generate QR Code unik otomatis.
- Check-in & Check-out menggunakan QR Code scanner.
- Riwayat kehadiran member (real-time).
- Download Kartu Member Digital langsung dari portal member.

### 3. Billing & Keuangan
- Monitoring status langganan member (Near Expiry & Overdue).
- Fitur **Tagih via WhatsApp** dengan satu klik (mengarahkan otomatis ke web WA dengan template pesan yang memuat nama dan sisa hari).
- Perpanjangan otomatis masa aktif 1 bulan penuh ketika Admin klik tombol **Dibayar**.

### 4. Pengaturan Template Pesan & Diskon
- Buat dan kelola template pesan peringatan tagihan dinamis untuk WhatsApp.
- Manajemen opsi diskon (Tipe Nominal atau Persentase) untuk mendukung strategi marketing gym Anda.

---

## Persyaratan Sistem

Pastikan Anda telah menginstal utilitas berikut sebelum menjalankan aplikasi:
1. **Node.js** (v18 atau lebih baru) - Untuk menjalankan Frontend.
2. **Go** (v1.20 atau lebih baru) - Untuk menjalankan Backend.
3. **MySQL Server** - Sistem basis data relasional.

---

## Cara Menjalankan Aplikasi

### 1. Setup Database MySQL
1. Buka MySQL / MariaDB (bisa menggunakan XAMPP atau Workbench).
2. Buat database baru bernama `mgym`:
   ```sql
   CREATE DATABASE mgym;
   ```

### 2. Setup Backend (Golang)
1. Buka terminal dan arahkan ke folder `backend`:
   ```bash
   cd backend
   ```
2. Buka atau buat file `.env` dan pastikan konfigurasinya sesuai (terutama user dan password MySQL Anda):
   ```env
   PORT=3000
   DB_USER=root
   DB_PASS=
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_NAME=mgym
   JWT_SECRET=supersecretgymkey
   ```
3. Unduh semua modul yang diperlukan:
   ```bash
   go mod tidy
   ```
4. Jalankan backend:
   ```bash
   go run main.go
   ```
   *Server backend akan berjalan di `http://localhost:3000` dan secara otomatis melakukan setup database.*

### 3. Setup Frontend (React)
1. Buka terminal baru dan arahkan ke folder `frontend`:
   ```bash
   cd frontend
   ```
2. Instal semua dependensi React:
   ```bash
   npm install
   ```
3. Jalankan server frontend:
   ```bash
   npm run dev
   ```
   *Frontend akan berjalan di browser, klik link yang muncul di terminal (misal: `http://localhost:5173`).*

---

## Cara Akses & Panduan Pengguna

### Login Sebagai Admin (Default)
Saat Anda menjalankan backend pertama kali, akun Admin *default* akan dibuat secara otomatis. Gunakan ini untuk masuk ke dashboard utama:
- **Role**: Pilih tab `Admin`
- **Username**: `admin`
- **Password**: `admin123`

### Mengelola Member
1. Dari dashboard Admin, pergi ke menu **Members**.
2. Klik tombol **Add New Member** untuk mendaftarkan anggota baru.
3. Anda harus memasukkan *Initial Password*. Password ini yang akan digunakan oleh member tersebut untuk login.

### Login Sebagai Member
Member yang telah didaftarkan dapat mengakses portal khusus mereka:
- **Role**: Pilih tab `Member`
- **Phone Number**: (Nomor telepon yang didaftarkan, misal: `62812345678`)
- **Password**: (Password awal yang diberikan Admin saat registrasi)

*Di dalam portal, member dapat mengunggah foto profil, mengubah kontak, dan mengunduh ID Card Digital.*

### Melakukan Penagihan WhatsApp
1. Di akun Admin, masuk ke menu **Billing**.
2. Anda akan melihat member yang hampir habis masa aktifnya atau sudah lewat (Overdue).
3. Klik tombol **Tagih**. Aplikasi akan otomatis membuka Tab WhatsApp Web/App dengan nomor tujuan dan pesan template yang sudah di-generate otomatis.

---
**M-GYM v2 Development**
