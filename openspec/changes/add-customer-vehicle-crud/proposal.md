# Change: Add Customer and Vehicle CRUD Management

## Why

Sistem memerlukan kemampuan untuk mengelola data pelanggan (Customers) dan kendaraan (Vehicles) secara lengkap. Berdasarkan ERD yang sudah dibuat, kedua entitas ini adalah komponen kritis dalam alur transaksi - customer adalah pemilik kendaraan dan pembuat transaksi, sedangkan vehicle digunakan dalam transaksi. Tanpa fitur CRUD untuk kedua entitas ini, sistem tidak dapat beroperasi sepenuhnya.

## What Changes

- Menambahkan fitur CRUD lengkap untuk Customer management (Create, Read, Update, Delete)
- Menambahkan fitur CRUD lengkap untuk Vehicle management (Create, Read, Update, Delete)
- Menambahkan validasi data untuk field-field penting (plate number harus unique)
- Menambahkan relasi antara Customer dan Vehicle (one-to-many)
- Menambahkan UI pages untuk Customer dan Vehicle management
- Menambahkan database schema untuk CUSTOMERS dan VEHICLES tables
- Menambahkan IPC handlers untuk operasi CRUD di Electron main process
- Menambahkan fitur soft delete (is_active flag)
- Menambahkan filter dan search functionality

## Impact

- **Affected specs:**
  - `customer-management` (new capability)
  - `vehicle-management` (new capability)
- **Affected code:**
  - `electron/` - IPC handlers untuk Customer dan Vehicle CRUD
  - `electron/auth/database.ts` - Database schema dan migrations
  - `src/Features/` - New feature directories untuk Customer dan Vehicle
  - `src/Shared/Types/` - TypeScript type definitions untuk Customer dan Vehicle
- **Dependencies:**
  - Tidak ada dependensi baru yang diperlukan
  - Menggunakan existing infrastructure (SQLite, shadcn-ui, TanStack Table)
