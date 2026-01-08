### 📄 **OpenSpec Proposal: Analisis & Perbaikan Error Inisialisasi Database pada Aplikasi Desktop Offline-First (Electron + React + SQLite + Umzug)**

#### **1. Latar Belakang**

Aplikasi desktop berbasis ElectronJS dan React dikembangkan dengan pendekatan **offline-first**, menggunakan **SQLite sebagai database lokal** dan **Umzug untuk manajemen migrasi database**.  
Saat pengguna menginstal aplikasi hasil build (executable), muncul error berikut:

> **Database Initialization Error**  
> _Failed to initialize database: Unexpected token 'export'_

Error ini menghambat proses pertama kali aplikasi berjalan di mesin pengguna, sehingga fitur inti tidak dapat diakses.

#### **2. Tujuan**

- Mengidentifikasi akar penyebab error `Unexpected token 'export'`.
- Memastikan sistem migrasi database berjalan lancar di lingkungan produksi (Electron packaged app).
- Menyediakan solusi yang stabil, maintainable, dan kompatibel dengan arsitektur offline-first saat ini.

#### **3. Ruang Lingkup Analisis**

- Struktur dan sintaks file migrasi Umzug (`.js`)
- Konfigurasi modul (`package.json`: `type: "module"` vs CommonJS)
- Proses build & bundling (Vite/Webpack) terhadap file migrasi
- Lingkungan eksekusi Node.js dalam Electron (main vs renderer process)
- Kompatibilitas Umzug dengan ES Modules di konteks Electron

#### **4. Hipotesis Awal**

Error terjadi karena:

- File migrasi menggunakan sintaks ES Modules (`export default`),
- Namun dijalankan di lingkungan Node.js (dalam Electron) yang mengharapkan CommonJS (`module.exports`),
- Dan/atau file migrasi ikut dikompilasi atau tidak dikopi dengan benar ke folder build.

#### **5. Aktivitas yang Direncanakan**

| No  | Aktivitas                                                   | Output                                                   |
| --- | ----------------------------------------------------------- | -------------------------------------------------------- |
| 1   | Audit seluruh file migrasi (`migrations/*.js`)              | Daftar file yang menggunakan `export`                    |
| 2   | Periksa `package.json` untuk `type: "module"`               | Konfirmasi mode modul proyek                             |
| 3   | Verifikasi proses build: apakah file migrasi dikopi mentah? | Konfigurasi bundler (Vite/Webpack) diperbarui jika perlu |
| 4   | Ubah semua file migrasi ke sintaks CommonJS                 | File migrasi yang kompatibel dengan Node.js di Electron  |
| 5   | Uji lokal (development & production build)                  | Bukti bahwa error tidak muncul di build terbaru          |
| 6   | Dokumentasi panduan migrasi & best practice                 | Panduan internal untuk pengembang                        |

#### **6. Kriteria Keberhasilan**

- [ ] Aplikasi berhasil melakukan inisialisasi database saat pertama kali dijalankan dari installer.
- [ ] Tidak ada error sintaks (`Unexpected token 'export'`) di log aplikasi (baik dev maupun prod).
- [ ] Semua migrasi berjalan sesuai urutan dan tabel dibuat dengan benar.
- [ ] Proses build otomatis menyalin file migrasi tanpa transformasi.

#### **7. Dampak Jika Tidak Diperbaiki**

- Aplikasi tidak bisa digunakan di lingkungan produksi (pada end-user).
- Pengalaman pengguna rusak sejak pertama kali membuka aplikasi.
- Potensi kehilangan data atau kegagalan fitur inti (CRUD offline).

#### **8. Estimasi Waktu**

- Analisis & perbaikan: **1–2 jam**
- Pengujian lintas platform (Windows/macOS/Linux): **1 jam**
- Dokumentasi: **30 menit**

#### **9. Teknologi Terkait**

- ElectronJS (v25+)
- React (18+)
- SQLite3 / better-sqlite3
- Umzug (v3+)
- Vite atau Webpack (tergantung setup)
- Node.js (versi sesuai Electron)

#### **10. Catatan Tambahan**

- Solusi harus **offline-first friendly**: tidak bergantung pada internet atau transpilasi runtime.
- Hindari penggunaan `type: "module"` selama belum diperlukan secara eksplisit.
- File migrasi **tidak boleh dikompilasi** — harus tetap sebagai file `.js` mentah dan dapat dibaca langsung oleh Node.js.
