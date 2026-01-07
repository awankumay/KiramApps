# Proposal: Add Items CRUD Management

## Overview

Menambahkan fitur CRUD (Create, Read, Update, Delete) lengkap untuk manajemen Items sesuai ERD yang ada, termasuk tracking riwayat perubahan harga.

## Why

Sistem membutuhkan kemampuan untuk mengelola item-item yang ditransaksikan, termasuk:

- Manajemen daftar item (nama, satuan, harga)
- Tracking perubahan harga untuk audit
- Aktivasi/deaktivasi item
- Pencarian item berdasarkan nama dan satuan

## What Changes

### 1. Database Schema

**File**: `electron/auth/database.ts`

Menambahkan tabel `items` dan `item_price_history`:

- `items`: id, name, unit, price, is_active, created_at
- `item_price_history`: id, item_id, old_price, new_price, changed_by, changed_at
- Migration untuk menambahkan kolom `price` pada tabel yang sudah ada
- Seeding dummy data: Pasir (Rp 150.000/m³), Batu Split (Rp 250.000/m³), Batu Kali (Rp 200.000/m³)

### 2. Backend Logic

**File**: `electron/auth/ItemsManager.ts`

Membuat `ItemsManager` class dengan methods:

- `getAllItems()` - Retrieve all items
- `getItemById(id)` - Get single item
- `createItem(data)` - Create new item
- `updateItem(id, data, userId)` - Update item dengan price history tracking
- `deleteItem(id)` - Delete item
- `toggleItemStatus(id)` - Toggle active/inactive status
- `searchItems(query)` - Search by name
- `getActiveItems()` - Get active items only
- `getPriceHistory(itemId)` - Get price change history

### 3. IPC Handlers

**File**: `electron/main.ts`

Menambahkan IPC handlers:

- `items:getAll`
- `items:getById`
- `items:create`
- `items:update` (dengan userId untuk tracking)
- `items:delete`
- `items:toggleStatus`
- `items:search`
- `items:getActive`
- `items:getPriceHistory`

### 4. Type Definitions

**File**: `src/Shared/Types/Electron.d.ts`

Menambahkan TypeScript interfaces:

- `ItemData` - id, name, unit, price, isActive, createdAt
- `CreateItemData` - name, unit, price, isActive?
- `UpdateItemData` - name?, unit?, price?, isActive?
- `PriceHistoryData` - id, itemId, oldPrice, newPrice, changedBy, changedAt

### 5. Permission System

**File**: `src/Shared/Types/RBAC.ts`

Menambahkan permission:

- `MANAGE_ITEMS` - Create, edit, delete items

### 6. Routing & Navigation

**Files**:

- `src/App.tsx`
- `src/Features/Auth/Routes/RouteConfig.ts`

Menambahkan:

- Route `/superadmin/items` dengan permission `MANAGE_ITEMS`
- Navigation item di sidebar dengan icon Package

### 7. UI Components

**File**: `src/Features/Superadmin/ItemsPage.tsx`

Membuat React component dengan fitur:

- Dashboard stats (total, active, inactive items)
- Search by name and unit
- Table dengan kolom: nama, satuan, harga, status
- Create dialog dengan:
  - Input nama item
  - Select satuan (pcs, liter, kg, m³)
  - Input harga (Rp)
  - Select status (aktif/nonaktif)
- Edit dialog (sama dengan create)
- Delete confirmation dialog
- Price history dialog menampilkan:
  - Tanggal perubahan
  - Harga lama
  - Harga baru
  - User yang mengubah
- Toast notifications untuk semua operasi
- Loading states dan error handling

## Unit Options

Satuan yang tersedia:

- Pcs (Pieces)
- Liter
- Kg (Kilogram)
- m³ (Meter Kubik)

## Dependencies

- Tidak ada dependencies baru yang dibutuhkan
- Menggunakan UI components yang sudah ada (shadcn/ui)
- Menggunakan pattern yang sama dengan UsersPage

## Testing Strategy

1. Test create item dengan semua satuan
2. Test update item dan verify price history tercatat
3. Test delete item
4. Test toggle status
5. Test search functionality
6. Test permission access control
7. Test price history dialog

## Migration Notes

- Kolom `price` akan ditambahkan secara otomatis jika tabel sudah ada
- Tidak perlu menghapus database yang sudah ada
- Dummy data akan di-seed jika belum ada

## Success Criteria

- [ ] User dapat create item baru
- [ ] User dapat read/list semua items
- [ ] User dapat update item
- [ ] User dapat delete item
- [ ] User dapat toggle status item
- [ ] Price history tercatat saat harga diubah
- [ ] Search berfungsi dengan baik
- [ ] Permission MANAGE_ITEMS berfungsi
- [ ] UI responsive dan user-friendly
- [ ] Error handling dan feedback user adequate
