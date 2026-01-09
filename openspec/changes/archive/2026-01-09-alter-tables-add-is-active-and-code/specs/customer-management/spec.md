## ADDED Requirements

### Requirement: Customer Code Field

The system SHALL store a unique code for each customer to enable identification and reference.

**Priority**: High

#### Scenario: Customer table includes code column

**Given**:

- Database schema sudah diperbarui
- Migration `20260108082436_alter_add_code_customers` sudah dijalankan

**When**:

- Sistem mengakses tabel `customers`

**Then**:

- Kolom `code` ada di tabel `customers`
- Kolom `code` bertipe `TEXT`
- Kolom `code` memiliki constraint `UNIQUE`
- Customer dapat diidentifikasi menggunakan `code` selain `id`

#### Scenario: Customer code is unique

**Given**:

- Customer dengan code "CUST001" sudah ada di sistem

**When**:

- User mencoba membuat customer baru dengan code "CUST001"

**Then**:

- Error ditampilkan: "Code customer sudah digunakan"
- Customer baru tidak dibuat
- Uniqueness constraint pada kolom `code` dipatuhi

#### Scenario: Migration rollback removes code column

**Given**:

- Kolom `code` sudah ada di tabel `customers`
- Migration `20260108082436_alter_add_code_customers` di-rollback

**When**:

- Migration down dijalankan

**Then**:

- Kolom `code` dihapus dari tabel `customers`
- Data customer lain tetap terjaga
- Tabel `customers` kembali ke struktur sebelum migration
