# Tasks: Add ERP Cloud Sync Integration

## 1. Database Schema & Migrations

- [x] 1.1 Create migration `20260110000001_add_app_settings_table.ts`
  - Create `app_settings` table with columns: id, key, value, type, category, description, is_encrypted, created_at, updated_at
  - Add unique constraint on `key`
- [x] 1.2 Create migration `20260110000002_add_sync_logs_table.ts`

  - Create `sync_logs` table with sync tracking columns
  - Add indexes for performance

- [x] 1.3 Create migration `20260110000003_seed_app_settings.ts`
  - Seed initial ERP settings (erp_api_url, sync_enabled, sync_interval_minutes, etc.)

## 2. Backend Services (Electron)

- [x] 2.1 Create `electron/auth/SettingsManager.ts`

  - Implement CRUD operations for app_settings
  - Add type-safe getters for different setting types (string, number, boolean, json)
  - Add validation for setting values
  - Add cache layer for frequently accessed settings

- [x] 2.2 Refactor `electron/auth/ERPClient.ts`

  - Modify constructor to accept optional baseUrl parameter
  - Load baseUrl from SettingsManager if not provided
  - Add static method `ERPClient.getDefault()` for convenience
  - Add method `testConnection()` for validating endpoint

- [x] 2.3 Create `electron/auth/SyncService.ts`

  - Implement `push(entityType, action, data)` - Single record push
  - Implement `pushBatch(items[])` - Batch push
  - Implement `pull(entityType, since?)` - Pull changes from ERP
  - Implement `getStatus(syncId)` - Check sync status
  - Handle API errors and return structured responses

- [x] 2.4 Create `electron/auth/SyncManager.ts`

  - Implement sync queue management (add, remove, retry)
  - Implement scheduled sync with interval
  - Implement online/offline status handling
  - Implement entity-specific sync methods:
    - `syncCustomers()` - Bidirectional
    - `syncTransactions()` - Unidirectional (Electron → ERP)
    - `syncTransactionItems()` - Unidirectional
    - `syncTransactionVehicles()` - Unidirectional
    - `syncTransactionPayments()` - Unidirectional
    - `syncPaymentVerifications()` - Bidirectional
    - `syncLoaderQueue()` - Unidirectional
  - Implement `getSyncStats()` for dashboard
  - Implement `getSyncLogs(filters)` for history

- [x] 2.5 Register IPC handlers for sync operations
  - `settings:get`, `settings:set`, `settings:getAll`
  - `sync:push`, `sync:pull`, `sync:status`, `sync:stats`, `sync:logs`
  - `sync:start`, `sync:stop`, `sync:retry`
  - `sync:testConnection`

## 3. Frontend - Settings Feature

- [x] 3.1 Create `src/Features/Settings/` directory structure

  - Components/
  - Hooks/
  - Types/

- [x] 3.2 Create type definitions `src/Features/Settings/Types/Settings.ts`

  - `AppSetting` interface
  - `SyncSettings` interface
  - `ERPSettings` interface

- [x] 3.3 Create hook `src/Features/Settings/Hooks/UseSettings.ts`

  - Fetch and cache settings
  - Methods for updating settings
  - Test connection functionality

- [x] 3.4 Create `src/Features/Settings/Components/SettingsPage.tsx`

  - ERP Configuration section
  - Test Connection button with status indicator
  - Sync Settings section (enable, interval, batch size)
  - Save/Cancel buttons

- [x] 3.5 Create `src/Features/Settings/Components/ERPSettingsForm.tsx`

  - URL input with validation
  - Connection status display
  - Latency indicator
  - **Note:** Combined into SettingsPage.tsx

- [x] 3.6 Create `src/Features/Settings/Components/SyncSettingsForm.tsx`

  - Toggle for auto-sync
  - Interval selector
  - Batch size input
  - Sync on startup toggle
  - **Note:** Combined into SettingsPage.tsx

- [x] 3.7 Add Settings route to router
  - Route: `/superadmin/settings`
  - Permission: SUPERADMIN only

## 4. Frontend - Sync Dashboard Feature

- [x] 4.1 Create `src/Features/Sync/` directory structure

  - Components/
  - Hooks/
  - Types/

- [x] 4.2 Create type definitions `src/Features/Sync/Types/Sync.ts`

  - `SyncLog` interface
  - `SyncStats` interface
  - `SyncStatus` enum

- [x] 4.3 Create hook `src/Features/Sync/Hooks/UseSync.ts`

  - Fetch sync stats
  - Fetch sync logs with pagination/filters
  - Trigger manual sync
  - Retry failed syncs

- [x] 4.4 Create `src/Features/Sync/Components/SyncDashboardPage.tsx`

  - Stats summary cards
  - Entity sync status table
  - Recent sync logs list
  - Manual sync buttons

- [x] 4.5 Create `src/Features/Sync/Components/SyncStatsCards.tsx`

  - Total syncs count
  - Success rate percentage
  - Pending count
  - Failed count
  - Last sync timestamp
  - **Note:** Combined into SyncDashboardPage.tsx

- [x] 4.6 Create `src/Features/Sync/Components/SyncLogsTable.tsx`

  - Columns: timestamp, entity, action, direction, status, error
  - Filters: entity type, status, direction, date range
  - Retry button for failed items
  - **Note:** Combined into SyncDashboardPage.tsx

- [x] 4.7 Create `src/Features/Sync/Components/ManualSyncPanel.tsx`

  - Sync All button
  - Per-entity sync buttons
  - Progress indicator
  - **Note:** Combined into SyncDashboardPage.tsx

- [x] 4.8 Add Sync Dashboard route to router
  - Route: `/superadmin/sync`
  - Permission: SUPERADMIN only

## 5. Frontend - Sync Status Indicator

- [x] 5.1 Create `src/Shared/Components/SyncStatusIndicator.tsx`

  - Online/offline status dot
  - Last sync timestamp
  - Pending/failed count badges
  - Click to open sync dashboard

- [x] 5.2 Integrate SyncStatusIndicator into navigation

  - Add to AppNavigation or AppSidebarRBAC header
  - Show only when user is authenticated

- [x] 5.3 Create `src/Shared/Hooks/UseSyncStatus.ts`
  - Poll sync status at interval
  - Subscribe to online/offline events
  - Expose status, lastSync, pending, failed counts
  - **Note:** Integrated into SyncStatusIndicator.tsx component

## 6. Integration with Existing Managers

- [x] 6.1 Update `CustomerManager.ts`

  - Trigger sync on create/update/delete
  - Add `sync_id` and `synced_at` columns handling

- [x] 6.2 Update `TransactionManager.ts`

  - Trigger sync on create/status change
  - Include related items in sync payload

- [x] 6.3 Update `PaymentManager.ts`

  - Trigger sync on payment create
  - Trigger sync on verification status change

- [x] 6.4 Update `LoaderManager.ts`
  - Trigger sync on queue updates

## 7. Testing & Documentation

- [x] 7.1 Fix sync payload - Remove 'id' field for create actions
- [x] 7.2 Fix foreign key constraint in applyCustomerChange
- [ ] 7.3 Test end-to-end customer sync (Electron → ERP Cloud)
- [ ] 7.4 Test pull sync (ERP Cloud → Electron)
- [ ] 7.5 Test offline/online scenarios
- [ ] 7.6 Test sync retry mechanism
- [ ] 7.7 Test bidirectional sync conflict resolution
- [ ] 7.8 Write unit tests for SettingsManager
- [ ] 7.9 Write unit tests for SyncService
- [ ] 7.10 Write unit tests for SyncManager
- [ ] 7.11 Update README with sync configuration instructions
- [ ] 7.12 Document common sync issues and troubleshooting

## 8. Bug Fixes (Completed)

- [x] 8.1 Fix HTTP 422 error - Remove 'id' from sync payload for create actions
  - Fixed in: `pushInitialCustomers()`, `pushInitialItems()`, `pushInitialVehicles()`
- [x] 8.2 Fix FOREIGN KEY constraint error in pull sync
  - Changed `INSERT OR REPLACE` to conditional `UPDATE`/`INSERT` in `applyCustomerChange()`
- [x] 8.3 Fix TypeScript compilation errors
  - Add missing permission descriptions in RolesPage.tsx
  - Remove unused parameter in migration file
- [x] 8.4 Fix duplicate transaction items sync on create
  - Removed individual `transaction_item` sync that was causing duplicates
  - Fixed in: `electron/main.ts` transactions:create IPC handler (baris 1192-1210)
  - Now only syncs `transaction` with nested items - ERP Cloud handles items from transaction payload
- [x] 8.5 Add comprehensive logging for sync operations
  - Added logging in `queueSyncOperation()` with SyncID and status indicators
  - Added logging in `SyncManager.queueSync()` for queue monitoring
  - Added logging in `SyncService.push()` for payload debugging
  - All logs now show success (✓) or failure (✗) status

## 9. Navigation & Access Control

- [x] 9.1 Add "Settings" menu item to Superadmin navigation
- [x] 9.2 Add "Sync Dashboard" menu item to Superadmin navigation
- [x] 9.3 Add permissions for settings and sync features

---

## Summary

**Implementation Status:** ✅ Feature Complete (Testing Phase)

**Completed:**

- ✅ All database migrations and schema changes
- ✅ Backend services (SettingsManager, SyncService, SyncManager)
- ✅ IPC handlers for sync operations
- ✅ Frontend Settings and Sync Dashboard UI
- ✅ Sync status indicator in navigation
- ✅ Integration with existing managers
- ✅ Bug fixes for sync payload and FK constraints

**Remaining:**

- 🔄 End-to-end testing
- 🔄 Unit tests
- 🔄 Documentation updates

**Known Issues:**

- ✅ ~~HTTP 422 error when syncing customers~~ (Fixed: Removed `id` from create payload)
- ✅ ~~Foreign key constraint error on pull sync~~ (Fixed: Changed to UPDATE/INSERT pattern)
- ✅ ~~Duplicate transaction items sync on create~~ (Fixed: Removed individual transaction_item sync, now only syncs transaction with nested items)

**Next Steps:**

1. Restart Electron app untuk test sync dengan fixes terbaru
2. Clear sync_logs yang failed dan trigger sync ulang
3. Monitor sync_logs untuk memastikan sync berhasil
4. Test pull sync dari ERP ke Electron
5. Complete unit tests dan documentation
