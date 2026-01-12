## Context

Aplikasi kiram-site adalah offline-first desktop application (Electron + React) yang mengelola transaksi di lokasi lapangan. Saat ini:

1. **Auth sudah terintegrasi** dengan ERP Cloud (Laravel 12) menggantikan DummyJSON
2. **ERPClient.ts menggunakan hardcoded URL** (`http://localhost:8000/api`)
3. **Data sync belum diimplementasikan** sesuai plan di `erp-cloud-sync-plan.md`

### Stakeholders

- **Field Operators** - Butuh sync data ke cloud untuk backup dan reporting
- **Admin/Superadmin** - Butuh konfigurasi endpoint untuk different environments
- **IT Team** - Butuh flexibility untuk deploy ke berbagai environment

### Constraints

- Harus tetap **offline-first** - sync hanya terjadi ketika online
- SQLite sebagai primary data store
- Tidak boleh mengganggu workflow existing (auth, transactions)

## Goals / Non-Goals

### Goals

- ✅ Membuat konfigurasi ERP endpoint dapat diubah tanpa recompile
- ✅ Implementasi data sync sesuai `erp-cloud-sync-plan.md`
- ✅ Tracking sync status dan logs
- ✅ UI Settings untuk admin konfigurasi
- ✅ Retry mechanism untuk failed syncs

### Non-Goals

- ❌ Real-time sync (WebSocket) - cukup polling/manual
- ❌ Multi-tenant configuration per user
- ❌ End-to-end encryption untuk sync data
- ❌ Bidirectional sync untuk transactions (tetap one-way)

## Decisions

### 1. Configuration Storage: SQLite Table

**Decision**: Simpan konfigurasi di tabel `app_settings` di SQLite

**Alternatives considered:**

- **Environment variables** - Tidak praktis untuk end-user configuration
- **JSON config file** - Bisa, tapi tidak terintegrasi dengan UI
- **Electron Store** - Tidak terenkripsi, terpisah dari database

**Rationale**: SQLite sudah digunakan, terintegrasi dengan migration system, dan bisa diakses dari UI dengan pattern yang sama.

### 2. Sync Architecture: Service Layer Pattern

**Decision**: Gunakan Service Layer dengan `SyncService` + `SyncManager`

```
┌─────────────────────────────────────────────────────────────┐
│                     SyncManager                              │
│  (Orchestration: Queue, Retry, Scheduling, Online Status)   │
└───────────────┬─────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────┐
│                      SyncService                             │
│  (API calls: push, pull, batch, status)                     │
└───────────────┬─────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────┐
│                      ERPClient                               │
│  (HTTP layer: fetch, timeout, error handling)               │
└─────────────────────────────────────────────────────────────┘
```

**Rationale**: Separation of concerns, testable, reusable.

### 3. Sync Strategy: Push-Pull with Timestamps

**Decision**:

- **Push**: Kirim data ke ERP saat create/update/delete di lokal
- **Pull**: Ambil perubahan dari ERP berdasarkan `since` timestamp
- **Conflict Resolution**: Last-write-wins (menggunakan `updated_at`)

**Rationale**: Sederhana, sesuai dengan offline-first approach.

### 4. ERPClient Refactor Strategy

**Decision**: Refactor `ERPClient` untuk:

1. Accept `baseUrl` via constructor parameter
2. Load from `SettingsManager` jika tidak diberikan parameter
3. Fallback ke default URL jika settings kosong

```typescript
class ERPClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl =
      baseUrl || SettingsManager.get("erp_api_url") || DEFAULT_ERP_URL;
  }
}
```

**Rationale**: Backward compatible, flexible, testable.

## Data Model

### app_settings Table

```sql
CREATE TABLE app_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  type TEXT DEFAULT 'string', -- string, number, boolean, json
  category TEXT DEFAULT 'general',
  description TEXT,
  is_encrypted INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Initial settings
INSERT INTO app_settings (key, value, type, category, description) VALUES
('erp_api_url', 'http://localhost:8000/api', 'string', 'sync', 'ERP Cloud API Base URL'),
('sync_enabled', '1', 'boolean', 'sync', 'Enable/disable auto sync'),
('sync_interval_minutes', '10', 'number', 'sync', 'Auto sync interval in minutes'),
('sync_on_startup', '1', 'boolean', 'sync', 'Sync on application startup'),
('sync_batch_size', '50', 'number', 'sync', 'Maximum records per sync batch');
```

### sync_logs Table

```sql
CREATE TABLE sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_id TEXT UNIQUE NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  action TEXT NOT NULL, -- create, update, delete
  direction TEXT NOT NULL, -- push, pull
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  payload TEXT, -- JSON data
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  scheduled_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sync_logs_status ON sync_logs(status);
CREATE INDEX idx_sync_logs_entity ON sync_logs(entity_type, entity_id);
CREATE INDEX idx_sync_logs_direction ON sync_logs(direction);
```

## UI Components

### Settings Page (`/superadmin/settings`)

```
┌─────────────────────────────────────────────────────────────┐
│  ⚙️ Application Settings                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ERP Cloud Configuration                                     │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  API Base URL:    [http://localhost:8000/api          ]     │
│                   [🔗 Test Connection]                       │
│                                                              │
│  Connection Status: ● Connected (latency: 45ms)             │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Sync Settings                                               │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Enable Auto Sync:  [✓]                                     │
│  Sync Interval:     [10] minutes                            │
│  Sync on Startup:   [✓]                                     │
│  Batch Size:        [50] records                            │
│                                                              │
│                              [Cancel]  [Save Settings]       │
└─────────────────────────────────────────────────────────────┘
```

### Sync Status Indicator (Header/Navigation)

```
┌──────────────────────────────────────────────┐
│  🔄 Sync: ● Online (Last: 2 min ago)        │
│     Pending: 5 | Failed: 0                   │
└──────────────────────────────────────────────┘
```

### Sync Dashboard (`/superadmin/sync`)

- Summary statistics (total syncs, success rate, last sync time)
- Entity-wise sync status table
- Failed syncs list with retry option
- Manual sync trigger per entity type

## Risks / Trade-offs

| Risk                        | Impact | Mitigation                                 |
| --------------------------- | ------ | ------------------------------------------ |
| Data loss saat sync gagal   | High   | Retry queue + local backup di sync_logs    |
| Konflik data (conflict)     | Medium | Timestamp-based resolution, log conflicts  |
| Performance degradation     | Medium | Batch sync, throttling, background process |
| Security (API key exposure) | Medium | Enkripsi sensitive settings di database    |

## Migration Plan

### Phase 1: Database Schema

1. Buat migration untuk `app_settings` table
2. Buat migration untuk `sync_logs` table
3. Seed initial settings

### Phase 2: Backend Services

1. Buat `SettingsManager.ts`
2. Refactor `ERPClient.ts`
3. Buat `SyncService.ts`
4. Buat `SyncManager.ts`

### Phase 3: UI Components

1. Buat Settings page
2. Buat Sync Dashboard
3. Tambah Sync Status indicator

### Phase 4: Integration & Testing

1. Integrasi dengan existing managers (CustomerManager, TransactionManager, dll)
2. Testing offline/online scenarios
3. Performance testing dengan batch data

### Rollback Plan

- Jika gagal: Restore hardcoded URL di ERPClient
- sync_logs dan app_settings table bisa di-drop tanpa impact ke data utama

## Open Questions

1. **Auto-sync interval** - Default 10 menit, apakah cukup?
2. **Sync priority** - Entity mana yang harus di-sync duluan?
3. **Conflict notification** - Perlu UI notification untuk conflict resolution?
