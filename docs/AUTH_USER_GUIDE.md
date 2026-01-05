# Authentication System - User Guide

## Panduan Penggunaan Sistem Autentikasi

### 1. Login

1. Saat membuka aplikasi pertama kali, Anda akan melihat layar login
2. Masukkan **Username** dan **Password** Anda
3. Klik tombol **Login**
4. Jika berhasil, Anda akan diarahkan ke halaman utama aplikasi

**Catatan:** Login memerlukan koneksi internet untuk verifikasi pertama kali.

### 2. Menggunakan Aplikasi Secara Offline

Setelah login berhasil:

- Aplikasi dapat digunakan **100% offline**
- Data login Anda tersimpan dengan aman di komputer
- Anda dapat menutup dan membuka aplikasi tanpa perlu login ulang
- Token autentikasi akan tetap valid selama 24 jam dalam mode offline

### 3. Jika Internet Tidak Tersedia

**Saat Login Pertama Kali:**

- Aplikasi akan menampilkan pesan error "Tidak dapat login: Tidak ada koneksi internet"
- Pastikan internet tersedia untuk login pertama kali
- Setelah berhasil login, internet tidak lagi diperlukan

**Saat Sudah Login:**

- Aplikasi tetap dapat digunakan secara normal
- Semua fitur akan berfungsi seperti biasa
- Token akan diperbarui otomatis saat internet kembali tersedia

### 4. Jika Login Gagal

**Kemungkinan Penyebab:**

1. Username atau password salah
2. Tidak ada koneksi internet
3. Server sedang tidak tersedia

**Solusi:**

- Periksa kembali username dan password yang dimasukkan
- Pastikan komputer terhubung ke internet
- Tunggu beberapa saat dan coba lagi

### 5. Logout

1. Klik tombol **Logout** di pojok kanan atas
2. Konfirmasi logout dengan mengklik **Logout** pada dialog konfirmasi
3. Anda akan kembali ke layar login
4. Data login akan dihapus dari komputer

### 6. Informasi Profil

Di pojok kanan atas, Anda dapat melihat:

- Nama lengkap Anda
- Username Anda (ditampilkan dengan format @username)

---

## Credentials untuk Testing

**Test Account:**

- Username: `emilys`
- Password: `emilyspass`

**Daftar Test Users Lainnya:**

- Username: `michaelw` | Password: `michaelwpass`
- Username: `sophiab` | Password: `sophiabpass`
- Username: `jamesd` | Password: `jamesdpass`

---

## Troubleshooting

### Problem: Tidak bisa login setelah restart aplikasi

**Solusi:**

- Ini normal jika token sudah expired (lebih dari 24 jam offline)
- Hubungkan internet dan login ulang
- Setelah login, aplikasi dapat digunakan offline lagi

### Problem: Aplikasi lambat saat startup

**Solusi:**

- Tunggu beberapa detik, aplikasi sedang memeriksa status autentikasi
- Jika terlalu lama, restart aplikasi

### Problem: Error "Failed to decrypt token"

**Solusi:**

- Database kemungkinan corrupted
- Hubungi administrator IT
- Backup data jika diperlukan, lalu reinstall aplikasi

---

## Keamanan

- **Password tidak pernah disimpan** di komputer
- Token dienkripsi menggunakan Windows DPAPI
- Token hanya dapat didekripsi di komputer yang sama
- Logout akan menghapus semua data autentikasi

---

## Kontak Support

Jika mengalami masalah yang tidak dapat diselesaikan:

- Hubungi tim IT support
- Laporkan error message yang muncul
- Screenshot layar error jika memungkinkan
