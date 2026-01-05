# **OpenSpec: Aplikasi Surat Masuk Digital – Desktop UI & Auto-Update**

**Versi:** 1.0  
**Tanggal:** 03 Januari 2026  
**Penyusun:** Kiramana  
**Klien:** Internal / Operasional Lapangan

---

## 1. **Latar Belakang**

Proses pencatatan kedatangan unit (truck) di lapangan masih manual dan rentan terhadap keterlambatan pelaporan, terutama karena **kondisi jaringan internet yang tidak stabil**. Diperlukan aplikasi desktop Windows (.exe) yang:

- Bisa dioperasikan **100% offline**
- Memiliki antarmuka pengguna yang sederhana dan intuitif
- Menyimpan data lokal secara andal
- Memungkinkan pembaruan versi aplikasi **tanpa intervensi teknis di lapangan**

---

## 2. **Tujuan**

Mengembangkan aplikasi desktop **offline-first** untuk input Surat Masuk Unit dengan fitur:

- **UI Form Digital** yang mencakup seluruh field operasional
- **Penyimpanan data lokal** menggunakan SQLite
- **CRUD offline** penuh (Create, Read, Update, Delete)
- **Mekanisme pembaruan otomatis** melalui tombol “Download & Install” yang memicu instalasi versi terbaru

> ⚠️ **Catatan**: Backend Laravel API **tidak termasuk dalam scope ini**. Fokus murni pada aplikasi desktop dan mekanisme update lokal.

---

## 3. **Lingkup Fungsional**

### 3.1. Desktop UI (React + Electron)

- Antarmuka berbasis form dengan field:
  - Truck, Tujuan, Jenis Material, Jumlah
  - Keterangan, Sopir (Order), Pengawas (Checker)
  - Tanggal & Waktu Masuk/Keluar
- Validasi input real-time (wajib isi, format angka, dll)
- Tampilan daftar entri Surat Masuk yang telah disimpan
- Navigasi sederhana: Input Baru ↔ Daftar Data

### 3.2. Penyimpanan Offline (SQLite)

- Semua data disimpan secara lokal di direktori `AppData` pengguna Windows
- Tidak memerlukan instalasi database eksternal
- Data tetap aman meskipun aplikasi ditutup atau komputer restart

### 3.3. Pembaruan Aplikasi (Auto-Updater)

- Aplikasi mengecek keberadaan versi baru dari **server distribusi** (misal: GitHub Releases, S3, atau server internal)
- Jika tersedia versi baru, muncul notifikasi atau tombol “Download Update”
- Pengguna klik tombol → aplikasi:
  1. Mendownload file update (.exe) di latar belakang
  2. Memverifikasi integritas
  3. Menawarkan “Restart & Install”
- Setelah restart, versi baru langsung aktif — **tanpa perlu uninstall/manual install**

> 🔐 _Update hanya dilakukan jika pengguna menyetujui (opt-in), bukan silent update._

---

## 4. **Arsitektur Teknis**

| Komponen           | Teknologi                                         |
| ------------------ | ------------------------------------------------- |
| Aplikasi Desktop   | ElectronJS                                        |
| Antarmuka Pengguna | React (Vite atau Create React App)                |
| Database Lokal     | SQLite (via better-sqlite3)                       |
| Penyimpanan Data   | Direktori `AppData\Roaming` (Windows)             |
| Auto-Updater       | `electron-updater` + `electron-builder`           |
| Format Distribusi  | Installer Windows (.exe)                          |
| Server Update      | GitHub Releases / S3 / Server Internal (opsional) |

---

## 5. **Alur Pembaruan Aplikasi**

1. Pengguna membuka aplikasi.
2. Klik tombol **“Cek Update”** (opsional: cek otomatis saat startup).
3. Aplikasi menghubungi endpoint versi (misal: `https://updates.yourapp.com/latest.yml`).
4. Jika versi baru tersedia:
   - Tampilkan tombol **“Download Update”**
5. Setelah selesai download:
   - Tampilkan tombol **“Restart & Install”**
6. Setelah restart → aplikasi berjalan di versi terbaru.

> 🔄 Seluruh proses **tidak menghapus data pengguna** (database SQLite tetap utuh).

---

## 6. **Kebutuhan Non-Fungsional**

- **Platform**: Windows 10/11 (target .exe)
- **Ukuran aplikasi**: ≤ 50 MB (termasuk runtime Electron)
- **Offline-first**: 100% berfungsi tanpa internet
- **Self-contained**: Tidak perlu instalasi dependensi (Node.js, Python, dll)
- **Update aman**: Signature verification (opsional, bisa diaktifkan nanti)
- **UI responsif**: Cocok untuk layar tablet/monitor kecil di lapangan

---

## 7. **Luar Lingkup (Out of Scope)**

- Integrasi dengan CCTV/IPTV _(ditunda ke fase berikutnya)_
- Sinkronisasi ke Laravel API _(dikerjakan setelah UI & offline CRUD stabil)_
- Manajemen pengguna/role _(versi awal single-user)_

---

## 8. **Estimasi Pengembangan (Fase 1: UI + Offline CRUD + Auto-Update)**

| Aktivitas                         | Durasi            |
| --------------------------------- | ----------------- |
| Setup project & arsitektur        | 1 hari            |
| Desain & implementasi UI form     | 3 hari            |
| Implementasi SQLite CRUD lokal    | 2 hari            |
| Pengujian offline & validasi data | 1 hari            |
| Integrasi auto-updater            | 2 hari            |
| Build installer Windows (.exe)    | 1 hari            |
| Uji coba deploy di mesin uji      | 1 hari            |
| **Total**                         | **11 hari kerja** |

---

## 9. **Dampak Operasional**

- Operator lapangan bisa input data **tanpa menunggu internet**
- Tim IT tidak perlu datang ke lokasi untuk **update aplikasi**
- Data tetap tersedia secara lokal meskipun perangkat **offline berhari-hari**
- Transisi ke sistem digital **tanpa gangguan operasional**

---
