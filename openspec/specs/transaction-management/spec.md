# transaction-management Specification

## Purpose

TBD - created by archiving change add-crud-ui-for-reference-data. Update Purpose after archive.
## Requirements
### Requirement: Transaction Types Management

The system SHALL provide a complete CRUD interface for managing transaction types, accessible only to SUPERADMIN users.

#### Scenario: List all transaction types

- **WHEN** SUPERADMIN accesses the Transaction Types page
- **THEN** the system SHALL display a table with all transaction types
- **AND** SHALL show columns for name, status, and creation date
- **AND** SHALL provide search functionality
- **AND** SHALL provide filter by status (active/inactive)

#### Scenario: Create transaction type

- **WHEN** SUPERADMIN creates a new transaction type with valid name
- **THEN** the system SHALL create the transaction type record
- **AND** SHALL set `is_active` to TRUE by default
- **AND** SHALL return the created transaction type data

#### Scenario: Update transaction type

- **WHEN** SUPERADMIN updates an existing transaction type
- **THEN** the system SHALL update the transaction type record
- **AND** SHALL return the updated transaction type data

#### Scenario: Delete transaction type

- **WHEN** SUPERADMIN deletes a transaction type
- **THEN** the system SHALL remove the record from the database
- **AND** SHALL return a success confirmation

#### Scenario: Toggle transaction type status

- **WHEN** SUPERADMIN toggles the status of a transaction type
- **THEN** the system SHALL flip the `is_active` value
- **AND** SHALL update the record
- **AND** SHALL return the updated transaction type data

### Requirement: Transaction Type Data Structure

Transaction type data SHALL include the following fields:

- `id` (INTEGER PRIMARY KEY) - Unique identifier
- `name` (TEXT NOT NULL) - Transaction type name
- `is_active` (BOOLEAN DEFAULT TRUE) - Active status
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP) - Creation timestamp

#### Scenario: Transaction type data includes all required fields

- **WHEN** creating or retrieving transaction type data
- **THEN** the system SHALL include all required fields (id, name, is_active, created_at)
- **AND** SHALL ensure name is not null
- **AND** SHALL set is_active to TRUE by default if not specified

### Requirement: Transaction Type Form Fields

The transaction type create/edit form SHALL include input fields for name and status.

#### Scenario: Transaction type form includes all fields

- **WHEN** opening the create or edit transaction type dialog
- **THEN** the system SHALL display an input field for `name`
- **AND** SHALL display a select dropdown for `is_active` status
- **AND** SHALL validate that name field is not empty

### Requirement: Transaction Type Statistics

The system SHALL display statistics for transaction types including total count, active count, and inactive count.

#### Scenario: Display transaction type statistics

- **WHEN** viewing the Transaction Types page
- **THEN** the system SHALL display a card showing total transaction types
- **AND** SHALL display a card showing active transaction types
- **AND** SHALL display a card showing inactive transaction types

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

### Requirement: Transaction Creation Form Behavior

The system SHALL provide a form for creating new transactions that allows checkers to efficiently process multiple transactions in sequence without navigation.

#### Scenario: Transaction form resets after successful submission

**Given**:

- Checker berada di halaman Create Transaction
- Form terisi dengan data transaksi (customer, vehicle, items, payment method, dll)

**When**:

- Checker mengklik tombol "Simpan Transaksi"
- Data transaksi valid dan berhasil disimpan ke database

**Then**:

- Form di-reset ke kondisi awal (semua field kosong)
- Customer combobox kembali ke kondisi tidak ada yang dipilih
- Vehicle combobox kembali ke kondisi tidak ada yang dipilih
- Tipe transaksi kembali ke nilai default
- Metode pembayaran kembali ke nilai default
- Items list ter-reset ke satu baris kosong
- Notes field ter-reset ke kosong
- Sistem menampilkan notifikasi sukses (toast/alert) bahwa transaksi berhasil dibuat
- Checker tetap berada di halaman Create Transaction
- Checker dapat langsung memasukkan transaksi berikutnya

#### Scenario: Transaction form validation still works after reset

**Given**:

- Form baru saja di-reset setelah submit transaksi berhasil
- Semua field dalam kondisi kosong

**When**:

- Checker mencoba mengklik tombol "Simpan Transaksi" tanpa mengisi field yang wajib

**Then**:

- Validasi form tetap berfungsi
- Alert/peringatan ditampilkan untuk field yang belum diisi
- Transaksi tidak disimpan sampai semua field wajib terisi

#### Scenario: Active transaction types and payment methods are filtered in create form

**Given**:

- Terdapat 5 transaction types di database
- 3 transaction types aktif (is_active = 1)
- 2 transaction types nonaktif (is_active = 0)
- Terdapat 4 payment methods di database
- 3 payment methods aktif (is_active = 1)
- 1 payment method nonaktif (is_active = 0)

**When**:

- Checker mengakses form Create Transaction
- Form di-reset setelah submit transaksi berhasil

**Then**:

- Dropdown tipe transaksi hanya menampilkan 3 transaction types yang aktif
- Dropdown metode pembayaran hanya menampilkan 3 payment methods yang aktif
- Transaction types dan payment methods nonaktif tidak tersedia sebagai opsi
- Filter is_active = 1 diterapkan secara konsisten

