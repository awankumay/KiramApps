## ADDED Requirements

### Requirement: Loader Status Management

The system SHALL support soft-delete for loaders using `is_active` column.

**Priority**: High

#### Scenario: Loader table includes is_active column

**Given**:

- Database schema sudah diperbarui
- Migration `20260108082106_alter_add_is_active` sudah dijalankan

**When**:

- Sistem mengakses tabel `loaders`

**Then**:

- Kolom `is_active` ada di tabel `loaders`
- Kolom `is_active` bertipe `BOOLEAN`
- Nilai default untuk `is_active` adalah `1` (true)
- Loader dapat dinonaktifkan tanpa menghapus data

#### Scenario: Active loaders are filtered

**Given**:

- Terdapat 5 loaders di sistem
- 4 loaders aktif (is_active = 1)
- 1 loader nonaktif (is_active = 0)

**When**:

- User mengakses daftar loaders untuk assignment

**Then**:

- Hanya loaders dengan `is_active = 1` ditampilkan sebagai opsi
- Loaders nonaktif tidak tersedia untuk assignment
- User dapat melihat semua loaders termasuk yang nonaktif di halaman manajemen (opsional)

#### Scenario: Loader assignment respects is_active status

**Given**:

- Loader "LOADER-001" nonaktif (is_active = 0)
- Transaction baru membutuhkan assignment loader

**When**:

- Sistem mencoba mengassign loader ke transaction

**Then**:

- Loader "LOADER-001" tidak muncul di daftar loader yang tersedia
- Hanya loaders aktif yang dapat di-assign
- Sistem mencegah assignment ke loader nonaktif

#### Scenario: Migration rollback removes is_active column from loaders

**Given**:

- Kolom `is_active` sudah ada di tabel `loaders`
- Migration `20260108082106_alter_add_is_active` di-rollback

**When**:

- Migration down dijalankan

**Then**:

- Kolom `is_active` dihapus dari tabel `loaders`
- Data loaders lain tetap terjaga
- Tabel `loaders` kembali ke struktur sebelum migration
