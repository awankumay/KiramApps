# Change: Alter Tables to Add is_active and code Columns

## Why

Database schema perlu diselaraskan dengan ERD terbaru yang ditentukan di `docs/erd/erd.dbml`. Saat ini beberapa tabel kekurangan kolom penting: `is_active` untuk tabel `transaction_types`, `payment_methods`, dan `loaders` untuk soft-delete capability, serta `code` untuk tabel `customers` untuk identifikasi unik customer. Migration sudah dibuat tetapi rollback logic belum diimplementasikan.

## What Changes

- Tambah kolom `is_active BOOLEAN DEFAULT 1` ke tabel:
  - `transaction_types`
  - `payment_methods`
  - `loaders`
- Tambah kolom `code TEXT UNIQUE` ke tabel `customers`
- Implementasi rollback logic untuk kedua migration karena SQLite tidak mendukung `ALTER TABLE DROP COLUMN` secara langsung

## Impact

- **Affected specs:**
  - `customer-management` - menambah kolom `code` untuk customer
  - `transaction-management` - menambah kolom `is_active` untuk transaction_types dan payment_methods
  - `loader-management` - menambah kolom `is_active` untuk loaders
- **Affected code:**
  - `electron/migrations/20260108082106_alter_add_is_active.ts` - perlu implementasi rollback
  - `electron/migrations/20260108082436_alter_add_code_customers.ts` - perlu implementasi rollback
  - Manager classes yang menggunakan tabel ini mungkin perlu update untuk memfilter berdasarkan `is_active`
