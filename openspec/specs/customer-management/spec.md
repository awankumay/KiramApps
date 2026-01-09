# customer-management Specification

## Purpose
TBD - created by archiving change add-crud-ui-for-reference-data. Update Purpose after archive.
## Requirements
### Requirement: Customer Management

The system SHALL provide a complete CRUD interface for managing customers, accessible only to SUPERADMIN users.

#### Scenario: List all customers

- **WHEN** SUPERADMIN accesses the Customers page
- **THEN** the system SHALL display a table with all customers
- **AND** SHALL show columns for name, category, status, and creation date
- **AND** SHALL provide search functionality
- **AND** SHALL provide filter by status (active/inactive)

#### Scenario: Create customer

- **WHEN** SUPERADMIN creates a new customer with valid name and category
- **THEN** the system SHALL create the customer record
- **AND** SHALL set `is_active` to TRUE by default
- **AND** SHALL return the created customer data

#### Scenario: Update customer

- **WHEN** SUPERADMIN updates an existing customer
- **THEN** the system SHALL update the customer record
- **AND** SHALL update the `updated_at` timestamp
- **AND** SHALL return the updated customer data

#### Scenario: Delete customer

- **WHEN** SUPERADMIN deletes a customer
- **THEN** the system SHALL remove the customer record from the database
- **AND** SHALL return a success confirmation

#### Scenario: Toggle customer status

- **WHEN** SUPERADMIN toggles the status of a customer
- **THEN** the system SHALL flip the `is_active` value
- **AND** SHALL update the record
- **AND** SHALL return the updated customer data

### Requirement: Customer Data Structure

Customer data SHALL include the following fields:

- `id` (INTEGER PRIMARY KEY) - Unique identifier
- `name` (TEXT NOT NULL) - Customer name
- `category` (TEXT NOT NULL) - Customer category (PERSONAL or COMPANY)
- `is_active` (BOOLEAN DEFAULT TRUE) - Active status
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP) - Creation timestamp
- `updated_at` (DATETIME DEFAULT CURRENT_TIMESTAMP) - Last update timestamp

#### Scenario: Customer data includes all required fields

- **WHEN** creating or retrieving customer data
- **THEN** the system SHALL include all required fields (id, name, category, is_active, created_at, updated_at)
- **AND** SHALL ensure name and category are not null
- **AND** SHALL set is_active to TRUE by default if not specified

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

