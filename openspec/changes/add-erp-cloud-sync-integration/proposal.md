# Change: Add ERP Cloud Sync Integration

## Why

Aplikasi kiram-site saat ini menggunakan konfigurasi **hardcoded** untuk API endpoint ERP Cloud (`http://localhost:8000/api` di `ERPClient.ts`). Sebelumnya Auth sudah diintegrasikan dari DummyJSON ke ERP Cloud (Development), namun data sync yang direncanakan pada `erp-cloud-sync-plan.md` belum diimplementasikan. Kita memerlukan:

1. **Konfigurasi dinamis** untuk endpoint ERP Cloud yang dapat diatur melalui UI Settings atau database configuration
2. **Implementasi Data Sync** sesuai dengan plan yang sudah dibuat untuk sinkronisasi data antara Electron (SQLite) dan ERP Cloud (Laravel)
3. **Flexibility** untuk switch antar environment (Development, Staging, Production)

## What Changes

### 1. ERP Cloud Settings Configuration

- **Buat tabel `app_settings`** di SQLite untuk menyimpan konfigurasi aplikasi
- **Tambah UI Settings** di panel Superadmin untuk mengatur endpoint ERP Cloud
- **Refactor `ERPClient.ts`** agar membaca endpoint dari database/configuration
- **Tambah validasi koneksi** (test connection) sebelum menyimpan konfigurasi

### 2. Data Sync Service Implementation

- **Buat `SyncService.ts`** untuk mengelola push/pull data ke ERP Cloud
- **Buat `SyncManager.ts`** untuk orchestrasi sync dengan retry queue dan offline handling
- **Implementasi sync untuk entities**:
  - Customers (bidirectional sync)
  - Transactions (unidirectional: Electron → ERP)
  - Transaction Items (unidirectional)
  - Transaction Vehicles (unidirectional)
  - Transaction Payments (unidirectional)
  - Payment Verification (bidirectional sync)
  - Loader Queue (unidirectional)
- **Tambah tabel `sync_logs`** untuk tracking sync operations

### 3. Sync UI Components

- **Tambah Sync Status indicator** di navigation/header
- **Buat Sync Dashboard** untuk monitoring sync status dan logs
- **Tambah manual sync trigger** button

## Impact

- **Affected specs:**

  - `authentication` - Modifikasi ERPClient untuk dynamic configuration
  - Buat spec baru: `erp-cloud-sync`
  - Buat spec baru: `app-settings`

- **Affected code:**
  - `electron/auth/ERPClient.ts` - Refactor untuk dynamic baseUrl
  - `electron/database/` - Tambah schema dan migration baru
  - `electron/auth/` - Tambah SyncService, SyncManager
  - `src/Features/Superadmin/` - Tambah Settings UI
  - `src/Features/Sync/` - Buat feature baru untuk sync dashboard
  - `src/Shared/Components/` - Tambah sync status indicator

## Dependencies

- ERP Cloud API endpoints sudah tersedia (sesuai `ERP_CLOUD_SYNC_API.md`)
- Auth API sudah berfungsi (sesuai `AUTH_API_DOCUMENTATION.md`)

## Risks

- **Konflik data sync** - Mitigasi: Implementasi conflict resolution strategy (last-write-wins atau timestamp-based)
- **Performance impact** - Mitigasi: Batch sync dan throttling
- **Network reliability** - Mitigasi: Offline-first approach dengan retry queue

## Open Questions

1. Apakah perlu multi-tenant support untuk konfigurasi ERP Cloud yang berbeda per user/role?
2. Interval default untuk auto-sync (5 menit, 10 menit, atau on-demand saja)?
3. Apakah perlu sync encryption untuk sensitive data?

## Implementation Notes

### Issue 1: HTTP 422 - Invalid Sync Payload (Resolved)

**Problem:** Saat push customer baru ke ERP, mendapat error HTTP 422.

**Root Cause:**

- Payload sync mengirim field `id` dari database lokal
- ERP Cloud mengharapkan auto-generate ID sendiri untuk record baru
- Field `id` tidak boleh ada dalam payload untuk action `create`

**Solution:**

```typescript
// ❌ WRONG - Mengirim id untuk create action
data: {
  id: customer.id,  // Don't send this!
  code: customer.code,
  name: customer.name,
  ...
}

// ✅ CORRECT - Tidak mengirim id untuk create action
data: {
  code: customer.code,
  name: customer.name,
  category: customer.category,
  is_active: Boolean(customer.is_active),
}
```

**Files Changed:**

- `electron/auth/SyncManager.ts`: Method `pushInitialCustomers()`, `pushInitialItems()`, `pushInitialVehicles()`

---

### Issue 2: Foreign Key Constraint on Pull Sync (Resolved)

**Problem:** Error `SQLITE_CONSTRAINT_TRIGGER` saat apply customer changes dari pull.

**Root Cause:**

```sql
-- Tables vehicles dan transactions memiliki FK ke customers
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
```

Menggunakan `INSERT OR REPLACE` akan:

1. DELETE record lama (jika ada)
2. INSERT record baru

Tapi DELETE gagal karena ada FK constraint `ON DELETE RESTRICT`.

**Solution:** Gunakan UPDATE untuk existing records, INSERT hanya untuk new records:

```typescript
// ❌ WRONG - INSERT OR REPLACE akan trigger DELETE
const stmt = this.db.prepare(`
  INSERT OR REPLACE INTO customers (...)
  VALUES (?, ?, ...)
`);

// ✅ CORRECT - UPDATE untuk existing, INSERT untuk new
if (existing) {
  this.db.prepare(`UPDATE customers SET ... WHERE id = ?`).run(...);
} else {
  this.db.prepare(`INSERT INTO customers (...) VALUES (...)`).run(...);
}
```

**Files Changed:**

- `electron/auth/SyncManager.ts`: Method `applyCustomerChange()`

### Issue 3: Duplicate Transaction Items Sync (Resolved)

**Problem:** Saat create transaksi baru, transaction items disinkronisasi dua kali ke ERP Cloud, menyebabkan duplicate items.

**Root Cause:**

Di [`electron/main.ts`](electron/main.ts:1160-1210), ketika transaction dibuat, kode melakukan sync dua kali:

1. **Sync Transaction dengan Items (Nested Sync)** - Baris 1163-1190:

   - Mengirim transaction dengan items di dalam payload
   - Entity type: `transaction`

2. **Sync Transaction Items Secara Individual (Backup Sync)** - Baris 1192-1210:
   - Mengirim setiap item secara terpisah
   - Entity type: `transaction_item`

Karena kedua sync ini dijalankan bersamaan, ERP Cloud menerima data items dua kali → menyebabkan duplicate items.

**Solution:**

Hapus sync individual untuk `transaction_item` (baris 1192-1210) dan gunakan hanya sync `transaction` dengan nested items. ERP Cloud akan menangani items dari payload transaction.

**Files Changed:**

- `electron/main.ts`: Method `transactions:create` IPC handler (baris 1160-1192)
  - Menghapus loop sync individual untuk transaction items
  - Menambahkan logging untuk tracking sync transaction
  - Menambahkan komentar yang jelas bahwa items di-handle oleh ERP Cloud dari payload transaction

**Additional Improvements:**

- Menambahkan logging detail di `queueSyncOperation()` untuk mempermudah tracking
- Menambahkan logging di `SyncManager.queueSync()` untuk monitoring queue
- Menambahkan logging di `SyncService.push()` untuk debugging payload yang dikirim

---

### Sync Testing Status

**✅ Tested Successfully:**

- Manual customer creation via Postman API → Success
- Settings UI untuk konfigurasi ERP endpoint
- Sync logs tracking di SQLite database
- Build dan deployment process

**🔄 Need Further Testing:**

- End-to-end sync: Electron → ERP Cloud (after fixes)
- Pull sync: ERP Cloud → Electron
- Bidirectional sync conflict resolution
- Batch sync performance dengan data besar
- Retry mechanism untuk failed syncs
- Offline-to-online transition handling
