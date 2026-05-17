# Fitur Lengkap M-GYM Management System

Berikut adalah rangkuman lengkap dari seluruh fitur yang beroperasi di dalam sistem M-GYM:

### 1. Sistem Autentikasi (Login)
Multi-role Access : Akses aman yang membedakan antara sesi Admin (pengelola) dan Member (anggota).

### 2. Manajemen Member (Member Management)
CRUD Member : Pendaftaran member baru, edit data, dan pengaturan masa aktif.
Integrasi Paket Gym : Penentuan otomatis "Paket" yang dipilih saat mendaftarkan member.
Manajemen Foto : Fitur unggah/ganti foto profil untuk setiap member.
Kontak Instan WhatsApp : Tombol obrolan instan (WA) dari tabel daftar member.

### 3. Portal Member & Kartu Digital (Digital ID)
Member Dashboard : Halaman khusus di mana member bisa melihat status keanggotaan mereka (Aktif/Tidak, Tanggal Berakhir, Nama Paket).

Kartu Member Digital : ID Card dengan QR Code Unik yang dibuat langsung oleh sistem (Bisa dirender di server lokal).
Save Card : Member dapat mengunduh kartu digital mereka ke perangkat (HP/Komputer) sebagai gambar (PNG) untuk di-scan secara fisik.
Update Profil : Member bisa memperbarui nomor telepon, email, dan alamat mereka secara mandiri.

### 4. Sistem Kehadiran & Scanner (Attendance System)
QR Scanner : Pemindai QR melalui kamera (Webcam/Kamera HP) untuk proses Check-in dan Check-out secara otomatis.
Manual Check-In/Out : Tombol interaktif langsung di tabel Members untuk melakukan presensi manual jika kamera bermasalah (Tombol hijau untuk Check-In, kuning untuk Check-Out).
Visitor History : Tabel riwayat pengunjung lengkap dengan jam masuk, jam keluar, dan kalkulasi total durasi mereka berada di gym secara real-time.

### 5. Sistem Keuangan & Tagihan (Billing & Finance)
Pemantauan Tagihan (Near Expiry & Overdue) : Dasbor yang memisahkan siapa saja member yang masa aktifnya segera habis (≤ 5 Hari) dan siapa yang sudah jatuh tempo.
Tombol "Tagih" (WhatsApp) : Tombol yang otomatis me-redirect ke WhatsApp member untuk mengirim peringatan tagihan.
Pembayaran 1-Klik : Tombol Dibayar yang akan secara otomatis memperpanjang masa aktif sebesar 1 bulan dan merekam data pembayaran.
Payment History : Riwayat semua transaksi yang masuk, tercatat dengan nominal sesuai Harga Paket Gym yang diambil, beserta keterangan spesifik jam dan tanggal pembayaran.
Tombol "Kirim Lunas" : Mengirim bukti pembayaran (kwitansi) otomatis ke WhatsApp member.

### 6. Master Data Manajemen (Admin)
Gym Packages (Paket Gym) : Mengelola daftar produk langganan (Contoh: Paket Bulanan Rp 150.000, Paket Harian Rp 20.000).
Discounts (Diskon) : Fitur untuk membuat kupon diskon (Berdasarkan Nominal tetap atau Persentase).

### 7. Sistem Template Pesan (Message Templates)
Kategori Template : Sistem untuk merangkai teks pesan auto-filled berdasarkan tipe aksi:
- Tagihan : Untuk peringatan penagihan Overdue/Near Expiry.
- Lunas : Untuk kwitansi pembayaran berhasil.
- Umum : Untuk info promosi atau broadcast lainnya.

Dynamic Variables : Menyematkan kode seperti {{nama}}, {{tanggal}}, {{nominal}}, atau {{jatuh_tempo}} yang otomatis digantikan dengan data asli milik member bersangkutan pada obrolan WhatsApp.

### 8. Tampilan & UI/UX (Antarmuka)
Desain Modern : Menggunakan Tailwind CSS v4 dengan pemanfaatan elemen Glassmorphism (kaca blur) dan animasi yang halus (micro-interactions).
Dark Mode Toggle : Fitur Mode Gelap menyeluruh berbasis state dan local-storage yang adaptif mengubah komponen interface secara mulus.
