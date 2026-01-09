# loader-management Specification

## Purpose
TBD - created by archiving change add-crud-ui-for-reference-data. Update Purpose after archive.
## Requirements
### Requirement: Loaders Management

The system SHALL provide a complete CRUD interface for managing loader equipment, accessible only to SUPERADMIN users.

#### Scenario: List all loaders

- **WHEN** SUPERADMIN accesses the Loaders page
- **THEN** the system SHALL display a table with all loaders
- **AND** SHALL show columns for name, status, and creation date
- **AND** SHALL provide search functionality
- **AND** SHALL provide filter by status (active/inactive)

#### Scenario: Create loader

- **WHEN** SUPERADMIN creates a new loader with valid name
- **THEN** the system SHALL create the loader record
- **AND** SHALL set `is_active` to TRUE by default
- **AND** SHALL return the created loader data

#### Scenario: Update loader

- **WHEN** SUPERADMIN updates an existing loader
- **THEN** the system SHALL update the loader record
- **AND** SHALL return the updated loader data

#### Scenario: Delete loader

- **WHEN** SUPERADMIN deletes a loader
- **THEN** the system SHALL remove the record from the database
- **AND** SHALL return a success confirmation

#### Scenario: Toggle loader status

- **WHEN** SUPERADMIN toggles the status of a loader
- **THEN** the system SHALL flip the `is_active` value
- **AND** SHALL update the record
- **AND** SHALL return the updated loader data

### Requirement: Loader Data Structure

Loader data SHALL include the following fields:

- `id` (INTEGER PRIMARY KEY) - Unique identifier
- `name` (TEXT NOT NULL) - Loader equipment name
- `is_active` (BOOLEAN DEFAULT TRUE) - Active status
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP) - Creation timestamp

#### Scenario: Loader data includes all required fields

- **WHEN** creating or retrieving loader data
- **THEN** the system SHALL include all required fields (id, name, is_active, created_at)
- **AND** SHALL ensure name is not null
- **AND** SHALL set is_active to TRUE by default if not specified

### Requirement: Loader Form Fields

The loader create/edit form SHALL include input fields for name and status.

#### Scenario: Loader form includes all fields

- **WHEN** opening the create or edit loader dialog
- **THEN** the system SHALL display an input field for `name`
- **AND** SHALL display a select dropdown for `is_active` status
- **AND** SHALL validate that name field is not empty

### Requirement: Loader Statistics

The system SHALL display statistics for loaders including total count, active count, and inactive count.

#### Scenario: Display loader statistics

- **WHEN** viewing the Loaders page
- **THEN** the system SHALL display a card showing total loaders
- **AND** SHALL display a card showing active loaders
- **AND** SHALL display a card showing inactive loaders

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

