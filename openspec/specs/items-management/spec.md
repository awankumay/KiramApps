# items-management Specification

## Purpose
TBD - created by archiving change add-items-crud. Update Purpose after archive.
## Requirements
### Requirement: Create Item

The system SHALL allow users with MANAGE_ITEMS permission to create new items with name, unit, price, and status.

**Priority**: High

#### Scenario: User creates new item with valid data

**Given**:

- User memiliki permission `MANAGE_ITEMS`
- User berada di halaman Manajemen Item
- User klik tombol "Tambah Item"

**When**:

- User mengisi form dengan:
  - Nama: "Pasir" (valid, minimal 2 karakter)
  - Satuan: "m³" (dari opsi: pcs, liter, kg, m³)
  - Harga: 150000 (valid, lebih dari 0)
  - Status: "Aktif"
- User klik tombol "Simpan"

**Then**:

- Item baru berhasil dibuat
- Item muncul di daftar items
- Toast success ditampilkan: "Item berhasil ditambahkan"
- Item tersimpan di database dengan semua field terisi

#### Scenario: User creates item with invalid data

**Given**:

- User memiliki permission `MANAGE_ITEMS`
- User berada di halaman Manajemen Item
- User klik tombol "Tambah Item"

**When**:

- User mengisi form dengan:
  - Nama: "" (kosong)
  - Satuan: tidak dipilih
  - Harga: 0 (tidak valid)

**Then**:

- Tombol "Simpan" disabled
- Error message ditampilkan untuk field yang tidak valid
- Item tidak dibuat
- Toast error ditampilkan jika user mencoba submit

### Requirement: Read Items

The system SHALL allow users with MANAGE_ITEMS permission to view and search items with filtering capabilities.

**Priority**: High

#### Scenario: User views all items

**Given**:

- User memiliki permission `MANAGE_ITEMS`
- User berada di halaman Manajemen Item

**When**:

- Halaman dimuat

**Then**:

- Semua items ditampilkan dalam tabel
- Tabel menampilkan kolom: Nama Item, Satuan, Harga, Status
- Stats ditampilkan: Total Item, Item Aktif, Item Nonaktif
- Loading state ditampilkan saat data sedang dimuat

#### Scenario: User searches for items

**Given**:

- User memiliki permission `MANAGE_ITEMS`
- User berada di halaman Manajemen Item
- Terdapat beberapa items di sistem

**When**:

- User mengetik query di search box: "Pasir"

**Then**:

- Hanya items yang mengandung "Pasir" ditampilkan
- Search tidak case-sensitive
- Search berdasarkan nama dan satuan
- Jika tidak ada hasil, pesan "Tidak ada item yang cocok dengan pencarian" ditampilkan

#### Scenario: User views active items only

**Given**:

- User memiliki permission `MANAGE_ITEMS`
- Terdapat items aktif dan nonaktif di sistem

**When**:

- User mengakses API `items:getActive`

**Then**:

- Hanya items dengan `is_active = true` dikembalikan
- Items nonaktif tidak disertakan

### Requirement: Update Item

The system SHALL allow users with MANAGE_ITEMS permission to update item information and track price changes in history.

**Priority**: High

#### Scenario: User updates item information

**Given**:

- User memiliki permission `MANAGE_ITEMS`
- Item "Pasir" ada di sistem dengan harga Rp 150.000
- User ID: 1

**When**:

- User klik menu "Edit" pada item "Pasir"
- User mengubah:
  - Nama: "Pasir Hitam"
  - Satuan: "m³" (tetap sama)
  - Harga: 175000 (diubah dari 150.000)
  - Status: "Aktif" (tetap sama)
- User klik tombol "Simpan Perubahan"

**Then**:

- Item berhasil diperbarui
- Data item di tabel diperbarui
- Toast success ditampilkan: "Item berhasil diperbarui"
- **Price history tercatat**:
  - old_price: 150000
  - new_price: 175000
  - changed_by: 1 (User ID)
  - changed_at: timestamp saat update

#### Scenario: User updates item price

**Given**:

- User memiliki permission `MANAGE_ITEMS`
- Item "Batu Split" ada dengan harga Rp 250.000
- Terdapat 5 riwayat harga sebelumnya

**When**:

- User mengubah harga menjadi Rp 300.000
- User menyimpan perubahan

**Then**:

- Item price diperbarui
- Entri baru ditambahkan ke `item_price_history`
- Riwayat harga sekarang berjumlah 6
- User dapat melihat riwayat harga dari dialog "Riwayat Harga"

### Requirement: Delete Item

The system SHALL allow users with MANAGE_ITEMS permission to delete items from the system.

**Priority**: High

#### Scenario: User deletes item

**Given**:

- User memiliki permission `MANAGE_ITEMS`
- Item "Batu Kali" ada di sistem
- Item tidak memiliki transaksi terkait (opsional)

**When**:

- User klik menu "Hapus" pada item "Batu Kali"
- User mengkonfirmasi penghapusan di dialog

**Then**:

- Dialog konfirmasi ditampilkan: "Anda yakin ingin menghapus item Batu Kali?"
- Item berhasil dihapus dari database
- Item tidak lagi muncul di daftar
- Toast success ditampilkan: "Item berhasil dihapus"
- Stats diperbarui (total item berkurang)

#### Scenario: User cancels delete

**Given**:

- User memiliki permission `MANAGE_ITEMS`
- User klik menu "Hapus" pada item

**When**:

- User klik tombol "Batal" di dialog konfirmasi

**Then**:

- Dialog ditutup
- Item tidak dihapus
- Tidak ada toast ditampilkan

### Requirement: Toggle Item Status

The system SHALL allow users with MANAGE_ITEMS permission to activate or deactivate items.

**Priority**: Medium

#### Scenario: User deactivates item

**Given**:

- User memiliki permission `MANAGE_ITEMS`
- Item "Pasir" aktif (is_active = true)

**When**:

- User klik menu "Nonaktifkan" pada item "Pasir"

**Then**:

- Item status berubah menjadi nonaktif
- Badge status berubah menjadi "Nonaktif" (abu-abu)
- Toast success ditampilkan: "Status item diperbarui - Pasir sekarang nonaktif"
- Item masih ada di database, hanya status yang berubah

#### Scenario: User activates item

**Given**:

- User memiliki permission `MANAGE_ITEMS`
- Item "Batu Split" nonaktif (is_active = false)

**When**:

- User klik menu "Aktifkan" pada item "Batu Split"

**Then**:

- Item status berubah menjadi aktif
- Badge status berubah menjadi "Aktif" (hijau)
- Toast success ditampilkan: "Status item diperbarui - Batu Split sekarang aktif"

### Requirement: View Price History

The system SHALL allow users with MANAGE_ITEMS permission to view the price change history for items.

**Priority**: Medium

#### Scenario: User views price history for item

**Given**:

- User memiliki permission `MANAGE_ITEMS`
- Item "Pasir" memiliki 3 riwayat perubahan harga

**When**:

- User klik menu "Riwayat Harga" pada item "Pasir"

**Then**:

- Dialog riwayat harga dibuka
- Tabel menampilkan semua perubahan harga:
  - Tanggal perubahan
  - Harga lama
  - Harga baru
  - Diubah oleh (User ID atau "-" jika tidak ada)
- Riwayat diurutkan dari yang terbaru ke terlama
- Loading state ditampilkan saat data sedang dimuat

#### Scenario: User views price history for new item

**Given**:

- User memiliki permission `MANAGE_ITEMS`
- Item baru "Batu Kali" baru saja dibuat

**When**:

- User klik menu "Riwayat Harga" pada item "Batu Kali"

**Then**:

- Dialog riwayat harga dibuka
- Pesan ditampilkan: "Belum ada riwayat perubahan harga"
- Tabel tidak menampilkan data

### Requirement: Access Control

The system SHALL enforce MANAGE_ITEMS permission for accessing item management features.

**Priority**: High

#### Scenario: User without MANAGE_ITEMS permission accesses items page

**Given**:

- User login dengan role "CHECKER"
- Role CHECKER tidak memiliki permission `MANAGE_ITEMS`

**When**:

- User mencoba mengakses route `/superadmin/items`

**Then**:

- User di-redirect ke halaman landing page role mereka
- Pesan "Unauthorized" ditampilkan
- User tidak dapat melihat halaman Items

#### Scenario: Superadmin accesses items page

**Given**:

- User login dengan role "SUPERADMIN"
- Role SUPERADMIN memiliki permission `MANAGE_ITEMS`

**When**:

- User mengakses route `/superadmin/items`

**Then**:

- Halaman Items ditampilkan
- Semua fitur CRUD dapat diakses
- User dapat create, read, update, delete items

### Requirement: Unit Selection

The system SHALL provide predefined unit options for items.

**Priority**: Low

#### Scenario: User selects unit for item

**Given**:

- User sedang membuat atau mengedit item
- Form satuan tersedia

**When**:

- User membuka dropdown satuan

**Then**:

- Opsi satuan ditampilkan:
  - Pcs (Pieces)
  - Liter
  - Kg (Kilogram)
  - m³ (Meter Kubik)
- User memilih salah satu opsi
- Nilai satuan disimpan ke database

### Requirement: Database Migration

The system SHALL automatically migrate database schema and seed dummy data for items functionality.

**Priority**: High

#### Scenario: Database migration adds price column

**Given**:

- Tabel `items` sudah ada tanpa kolom `price`
- Aplikasi di-update dengan schema baru

**When**:

- Aplikasi dimulai

**Then**:

- Migration berjalan otomatis
- Kolom `price` ditambahkan ke tabel `items`
- Nilai default: 0
- Log "Migration: Added price column to items table" ditampilkan
- Aplikasi berjalan normal tanpa error

#### Scenario: Dummy data seeding

**Given**:

- Tabel `items` kosong atau tidak memiliki dummy data

**When**:

- Aplikasi dimulai

**Then**:

- Dummy data di-seed ke database:
  - Pasir, m³, Rp 150.000
  - Batu Split, m³, Rp 250.000
  - Batu Kali, m³, Rp 200.000
- Log "Dummy items data seeded" ditampilkan
- Items tersedia untuk digunakan

