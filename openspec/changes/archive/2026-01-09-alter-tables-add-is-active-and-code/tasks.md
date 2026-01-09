## 1. Implement Rollback Logic for Migration Files

- [x] 1.1 Implement rollback untuk `electron/migrations/20260108082106_alter_add_is_active.ts`

  - Gunakan pendekatan recreate table untuk menghapus kolom `is_active` dari `transaction_types`
  - Gunakan pendekatan recreate table untuk menghapus kolom `is_active` dari `payment_methods`
  - Gunakan pendekatan recreate table untuk menghapus kolom `is_active` dari `loaders`
  - Pastikan data existing tetap terjaga

- [x] 1.2 Implement rollback untuk `electron/migrations/20260108082436_alter_add_code_customers.ts`
  - Gunakan pendekatan recreate table untuk menghapus kolom `code` dari `customers`
  - Pastikan data existing tetap terjaga
  - Fixed: Migration up juga menggunakan recreate table karena SQLite tidak support ADD COLUMN dengan UNIQUE constraint

## 2. Test Migration Rollback

- [x] 2.1 Jalankan migration up untuk memastikan kolom berhasil ditambahkan
- [x] 2.2 Verifikasi kolom `is_active` ada di tabel `transaction_types`, `payment_methods`, dan `loaders`
- [x] 2.3 Verifikasi kolom `code` ada di tabel `customers`
- [ ] 2.4 Jalankan migration down untuk memastikan rollback berhasil
- [ ] 2.5 Verifikasi kolom berhasil dihapus setelah rollback

## 3. Update Manager Classes (if needed)

- [x] 3.1 Review dan update `CustomerManager.ts` untuk menggunakan kolom `code`
  - **Finding**: Kolom `code` BELUM diimplementasikan di CustomerManager
  - **Required**: Perlu tambah field `code` di create(), update(), getById(), getAll(), dan type definitions
  - **Status**: **Butuh implementasi terpisah** (diluar scope migration rollback)
- [x] 3.2 Review dan update `TransactionManager.ts` untuk memfilter `transaction_types` dan `payment_methods` berdasarkan `is_active`
  - **Finding**: `getTransactionTypes()` dan `getPaymentMethods()` TIDAK memfilter berdasarkan `is_active`
  - **Required**: Tambah `WHERE is_active = 1` di kedua method tersebut
  - **Status**: **Butuh implementasi terpisah** (diluar scope migration rollback)
- [x] 3.3 Review dan update manager loader untuk memfilter `loaders` berdasarkan `is_active`
  - **Finding**: **LoaderManager class TIDAK ada** (table `loaders` ada tapi belum ada manager class)
  - **Required**: Perlu buat LoaderManager class dari scratch dengan CRUD operations
  - **Status**: **Butuh implementasi terpisah** (diluar scope migration rollback)

## 4. Test Production Build

- [x] 4.1 Verify migrations compile correctly with CommonJS module format
- [x] 4.2 Verify migration scripts (.cjs) work with CommonJS requires
- [x] 4.3 Test npm run db:fresh in development - all 10 migrations pass
- [x] 4.4 Run npm run build to create production package
- [x] 4.5 Test production application database initialization
- [x] 4.6 Verify no "Unexpected token 'export'" or "module is not defined" errors in production

## 5. Fix Module System Consistency (Additional Work)

- [x] 4.1 Identify inconsistency between old migrations (module.exports) and new migrations (export async)
- [x] 4.2 Attempted ES Module conversion - worked in development but failed in production with "Unexpected token 'export'" error
- [x] 4.3 Reverted to CommonJS pattern as per archived fix-db-init-esm-error proposal
- [x] 4.4 Converted all 10 migration source files to use CommonJS (module.exports) syntax
- [x] 4.5 Updated tsconfig.migrations.json to compile with "module": "CommonJS"
- [x] 4.6 Renamed migration scripts to .cjs extension (migration-run.cjs, migration-status.cjs)
- [x] 4.7 Converted migration scripts from ES Module imports to CommonJS requires
- [x] 4.8 Created package.json in dist-electron/migrations with `"type": "commonjs"` to override root package.json
- [x] 4.9 Updated copy-migrations.js to create package.json in migrations folder during build
- [x] 4.10 Added eslint-disable @typescript-eslint/no-var-requires to .cjs files
- [x] 4.11 Test complete db:fresh rebuild - all 10 migrations succeeded with CommonJS pattern

**Note**: Production Electron builds require CommonJS (module.exports + require) for migrations. Cannot use ES Modules (export + import) in packaged applications even if they work in development. The root package.json has `"type": "module"`, so compiled .js files in dist-electron/migrations need their own package.json with `"type": "commonjs"` to be loaded correctly by Node.js.
