# Tasks: Add Items CRUD Management

## Implementation Tasks

### Phase 1: Database & Backend

- [x] Update `electron/auth/database.ts` dengan schema items dan item_price_history
- [x] Tambahkan migration untuk kolom price
- [x] Seeding dummy data (Pasir, Batu Split, Batu Kali)
- [x] Buat `electron/auth/ItemsManager.ts` dengan semua CRUD methods
- [x] Tambahkan price history tracking di updateItem
- [x] Update `electron/main.ts` dengan IPC handlers untuk items
- [x] Update `electron/preload.ts` dengan API items

### Phase 2: Type Definitions

- [x] Update `src/Shared/Types/Electron.d.ts` dengan ItemData, CreateItemData, UpdateItemData, PriceHistoryData
- [x] Update API window types untuk mendukung items API
- [x] Update `src/Shared/Types/RBAC.ts` dengan permission MANAGE_ITEMS
- [x] Update database seeding dengan permission MANAGE_ITEMS

### Phase 3: Routing & Navigation

- [x] Import ItemsPage di `src/App.tsx`
- [x] Tambah route `/superadmin/items` dengan permission MANAGE_ITEMS
- [x] Update `src/Features/Auth/Routes/RouteConfig.ts` dengan route config items
- [x] Tambah items ke navigation group Superadmin

### Phase 4: UI Components

- [x] Buat `src/Features/Superadmin/ItemsPage.tsx`
- [x] Implementasi dashboard stats (total, active, inactive)
- [x] Implementasi search functionality
- [x] Implementasi table dengan kolom: nama, satuan, harga, status
- [x] Implementasi create dialog dengan form validation
- [x] Implementasi edit dialog
- [x] Implementasi delete confirmation dialog
- [x] Implementasi price history dialog
- [x] Implementasi toast notifications
- [x] Implementasi loading states dan error handling

### Phase 5: Unit Options

- [x] Define UNIT_OPTIONS: pcs, liter, kg, m³
- [x] Implementasi select dropdown untuk satuan
- [x] Update form validation untuk satuan

### Phase 6: Testing

- [ ] Test create item dengan semua satuan options
- [ ] Test update item dan verify price history tercatat
- [ ] Test delete item
- [ ] Test toggle status
- [ ] Test search functionality
- [ ] Test permission access control
- [ ] Test price history dialog
- [ ] Verify dummy data ter-seed dengan benar
- [ ] Test migration untuk existing database

## Dependencies

- Tidak ada dependencies baru yang dibutuhkan
- Menggunakan existing shadcn/ui components
- Menggunakan existing patterns dari UsersPage

## Notes

- Pastikan untuk restart aplikasi setelah perubahan database
- Migration akan berjalan otomatis saat aplikasi dimulai
- Dummy data hanya akan di-seed jika belum ada
