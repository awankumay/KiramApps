## ADDED Requirements

### Requirement: Transaction Type Status Management

The system SHALL support soft-delete for transaction types using `is_active` column.

**Priority**: High

#### Scenario: Transaction type table includes is_active column

**Given**:

- Database schema sudah diperbarui
- Migration `20260108082106_alter_add_is_active` sudah dijalankan

**When**:

- Sistem mengakses tabel `transaction_types`

**Then**:

- Kolom `is_active` ada di tabel `transaction_types`
- Kolom `is_active` bertipe `BOOLEAN`
- Nilai default untuk `is_active` adalah `1` (true)
- Transaction type dapat dinonaktifkan tanpa menghapus data

#### Scenario: Active transaction types are filtered

**Given**:

- Terdapat 5 transaction types di sistem
- 3 transaction types aktif (is_active = 1)
- 2 transaction types nonaktif (is_active = 0)

**When**:

- User mengakses daftar transaction types

**Then**:

- Hanya transaction types dengan `is_active = 1` ditampilkan
- Transaction types nonaktif tidak muncul di daftar
- User dapat melihat semua transaction types termasuk yang nonaktif (opsional)

#### Scenario: Migration rollback removes is_active column from transaction_types

**Given**:

- Kolom `is_active` sudah ada di tabel `transaction_types`
- Migration `20260108082106_alter_add_is_active` di-rollback

**When**:

- Migration down dijalankan

**Then**:

- Kolom `is_active` dihapus dari tabel `transaction_types`
- Data transaction types lain tetap terjaga
- Tabel `transaction_types` kembali ke struktur sebelum migration

### Requirement: Payment Method Status Management

The system SHALL support soft-delete for payment methods using `is_active` column.

**Priority**: High

#### Scenario: Payment method table includes is_active column

**Given**:

- Database schema sudah diperbarui
- Migration `20260108082106_alter_add_is_active` sudah dijalankan

**When**:

- Sistem mengakses tabel `payment_methods`

**Then**:

- Kolom `is_active` ada di tabel `payment_methods`
- Kolom `is_active` bertipe `BOOLEAN`
- Nilai default untuk `is_active` adalah `1` (true)
- Payment method dapat dinonaktifkan tanpa menghapus data

#### Scenario: Active payment methods are filtered

**Given**:

- Terdapat 4 payment methods di sistem
- 3 payment methods aktif (is_active = 1)
- 1 payment method nonaktif (is_active = 0)

**When**:

- User membuat transaction baru dan memilih payment method

**Then**:

- Hanya payment methods dengan `is_active = 1` ditampilkan sebagai opsi
- Payment methods nonaktif tidak tersedia untuk dipilih
- User dapat melihat semua payment methods termasuk yang nonaktif di halaman manajemen (opsional)

#### Scenario: Migration rollback removes is_active column from payment_methods

**Given**:

- Kolom `is_active` sudah ada di tabel `payment_methods`
- Migration `20260108082106_alter_add_is_active` di-rollback

**When**:

- Migration down dijalankan

**Then**:

- Kolom `is_active` dihapus dari tabel `payment_methods`
- Data payment methods lain tetap terjaga
- Tabel `payment_methods` kembali ke struktur sebelum migration
