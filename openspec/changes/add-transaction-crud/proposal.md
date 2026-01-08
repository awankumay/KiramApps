# Proposal: Add Transaction CRUD Management

## Overview

Menambahkan fitur CRUD lengkap untuk manajemen Transaksi, menggantikan dummy data yang ada pada `CreateTransactionPage.tsx` dan `TransactionListPage.tsx` dengan integrasi ke database SQLite. Fitur ini akan menghubungkan data Customer, Vehicle, dan Items yang sudah ada.

## Why

Sistem saat ini memiliki UI untuk transaksi dengan data dummy (mock). Untuk mendukung workflow operasional yang lengkap (Gate In → Checker → Loader → Gate Out), diperlukan:

- Manajemen transaksi yang tersimpan di database lokal
- Integrasi dengan data Customer, Vehicle, dan Items yang sudah ada
- Tracking status transaksi (CREATED → QUEUED → LOADING → DONE → CHECKED_OUT)
- Tracking status pembayaran (UNPAID → PAID)
- Pencatatan item transaksi dengan kalkulasi harga otomatis
- Audit trail untuk siapa yang membuat transaksi

## What Changes

### 1. Database Schema

**Migration Files**: `electron/migrations/`

Menambahkan tabel sesuai ERD:

#### Core Tables:

- **`transaction_types`**: id, name
  - Seed: PENJUALAN, PENGIRIMAN, dll
- **`payment_methods`**: id, name
  - Seed: CASH, TRANSFER, QRIS
- **`transactions`**:
  - id, invoice_number (unique), transaction_type_id (FK), customer_id (FK), vehicle_id (FK), total_amount, payment_status, transaction_status, created_by (FK), created_at
- **`transaction_items`**:
  - id, transaction_id (FK), item_id (FK), qty, price, subtotal
- **`payments`**:
  - id, transaction_id (FK), payment_method_id (FK), amount, status, paid_at, verified_by (FK)
- **`transaction_status_logs`**:
  - id, transaction_id (FK), status, changed_by (FK), changed_at, note

### 2. Backend Logic

**File**: `electron/auth/TransactionManager.ts`

Membuat `TransactionManager` class dengan methods:

#### Transaction CRUD:

- `getAllTransactions(filters)` - List transaksi dengan filter (date, status, customer)
- `getTransactionById(id)` - Detail transaksi dengan items
- `createTransaction(data, userId)` - Create transaksi baru dengan items
- `updateTransaction(id, data, userId)` - Update transaksi (sebelum status LOADING)
- `deleteTransaction(id)` - Soft delete / hapus draft transaksi
- `searchTransactions(query)` - Cari berdasarkan invoice, customer, vehicle

#### Status Management:

- `updateTransactionStatus(id, newStatus, userId, note?)` - Ubah status dengan logging
- `getStatusHistory(transactionId)` - Lihat riwayat status

#### Payment Processing:

- `addPayment(transactionId, data, verifiedBy)` - Catat pembayaran
- `getPayments(transactionId)` - List pembayaran untuk transaksi
- `updatePaymentStatus(transactionId)` - Auto-update payment_status jika lunas

#### Invoice Generation:

- `generateInvoiceNumber()` - Generate nomor invoice unik (format: INV-YYYYMMDD-XXXX)

#### Statistics:

- `getDailyStats(date)` - Statistik harian (total, pending, verified, completed)
- `getTodayTransactions()` - Transaksi hari ini

### 3. IPC Handlers

**File**: `electron/main.ts`

Menambahkan IPC handlers:

```
transactions:getAll
transactions:getById
transactions:create
transactions:update
transactions:delete
transactions:search
transactions:updateStatus
transactions:getStatusHistory
transactions:addPayment
transactions:getPayments
transactions:getDailyStats
transactionTypes:getAll
paymentMethods:getAll
```

### 4. Type Definitions

**File**: `src/Shared/Types/Electron.d.ts`

Menambahkan TypeScript interfaces:

```typescript
// Enums
type PaymentStatus = "UNPAID" | "PAID";
type TransactionStatus =
  | "CREATED"
  | "QUEUED"
  | "LOADING"
  | "DONE"
  | "CHECKED_OUT";

// Data Types
interface TransactionTypeData {
  id: number;
  name: string;
}
interface PaymentMethodData {
  id: number;
  name: string;
}

interface TransactionData {
  id: number;
  invoiceNumber: string;
  transactionTypeId: number;
  transactionTypeName?: string;
  customerId: number;
  customerName?: string;
  vehicleId: number;
  vehiclePlate?: string;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  transactionStatus: TransactionStatus;
  createdBy: number;
  createdByName?: string;
  createdAt: string;
  items?: TransactionItemData[];
}

interface TransactionItemData {
  id: number;
  transactionId: number;
  itemId: number;
  itemName?: string;
  itemUnit?: string;
  qty: number;
  price: number;
  subtotal: number;
}

interface CreateTransactionData {
  transactionTypeId: number;
  customerId: number;
  vehicleId: number;
  items: { itemId: number; qty: number; price: number }[];
  notes?: string;
}

interface PaymentData {
  id: number;
  transactionId: number;
  paymentMethodId: number;
  paymentMethodName?: string;
  amount: number;
  status: "PENDING" | "PAID";
  paidAt?: string;
  verifiedBy?: number;
}

interface TransactionStatusLogData {
  id: number;
  transactionId: number;
  status: TransactionStatus;
  changedBy: number;
  changedByName?: string;
  changedAt: string;
  note?: string;
}
```

### 5. Permission System

**File**: `src/Shared/Types/RBAC.ts`

Menambahkan permissions:

- `CREATE_TRANSACTION` - Buat transaksi baru
- `VIEW_TRANSACTION` - Lihat daftar dan detail transaksi
- `EDIT_TRANSACTION` - Edit transaksi (status CREATED/QUEUED only)
- `DELETE_TRANSACTION` - Hapus transaksi draft
- `MANAGE_TRANSACTION_STATUS` - Ubah status transaksi
- `VERIFY_PAYMENT` - Verifikasi pembayaran

Role mapping:

- **CHECKER**: CREATE_TRANSACTION, VIEW_TRANSACTION, EDIT_TRANSACTION, MANAGE_TRANSACTION_STATUS, VERIFY_PAYMENT
- **LOADER**: VIEW_TRANSACTION, MANAGE_TRANSACTION_STATUS (untuk status LOADING)
- **SUPERADMIN**: Semua permission

### 6. UI Components Update

**Files**:

- `src/Features/Checker/TransactionListPage.tsx` - Integrasi data real
- `src/Features/Checker/CreateTransactionPage.tsx` - Integrasi dengan API

#### TransactionListPage.tsx:

- Fetch transaksi dari API bukan mock data
- Filter berdasarkan status, tanggal, customer
- Badge status dengan warna sesuai state
- Quick action: View detail, Update status, Add payment
- Pagination untuk data banyak
- Realtime stats dari database

#### CreateTransactionPage.tsx:

- **Combobox Customer** - Input dengan autocomplete:
  - Ketik untuk search customer existing
  - Jika tidak ditemukan, tampilkan opsi "+ Tambah Customer Baru: [input]"
  - Klik opsi tersebut untuk auto-create customer (kategori default: PERSONAL)
  - Customer baru langsung terpilih tanpa navigasi ke menu terpisah
- **Combobox Vehicle** - Input dengan autocomplete:
  - Ketik nomor plat untuk search vehicle existing (filter by selected customer)
  - Jika tidak ditemukan, tampilkan opsi "+ Tambah Kendaraan Baru: [plat]"
  - Klik opsi tersebut untuk auto-create vehicle terkait customer yang dipilih
  - Vehicle baru langsung terpilih
- Dropdown Items dari `window.api.items.getActive()`
- Auto-calculate subtotal dan total
- Validasi form dengan Zod
- Submit ke `window.api.transactions.create()`

### 7. New Components

**Files**:

- `src/Features/Checker/TransactionDetailPage.tsx` - Detail dengan status history
- `src/Features/Checker/Components/PaymentDialog.tsx` - Dialog input pembayaran
- `src/Features/Checker/Components/StatusUpdateDialog.tsx` - Dialog ubah status
- `src/Features/Checker/Components/TransactionItemsTable.tsx` - Table items reusable
- `src/Shared/Components/UI/Combobox.tsx` - Combobox dengan autocomplete (jika belum ada)
- `src/Features/Checker/Components/CustomerCombobox.tsx` - Combobox Customer dengan inline create
- `src/Features/Checker/Components/VehicleCombobox.tsx` - Combobox Vehicle dengan inline create

### 8. Routing Update

**Files**:

- `src/App.tsx`
- `src/Features/Auth/Routes/RouteConfig.ts`

Routes:

- `/checker/transactions` - List transaksi (existing, update)
- `/checker/transactions/create` - Buat transaksi (existing, update)
- `/checker/transactions/:id` - Detail transaksi (new)
- `/checker/transactions/:id/edit` - Edit transaksi (new)

## Impact Assessment

### Breaking Changes

- **None** - Fitur baru tanpa mengubah behavior existing

### Database

- Migration baru untuk tabel transactions, transaction_items, payments, transaction_status_logs
- Seed data untuk transaction_types dan payment_methods

### Dependencies on Existing Features

- ✅ Customer CRUD - Sudah ada
- ✅ Vehicle CRUD - Sudah ada
- ✅ Items CRUD - Sudah ada
- ✅ User & RBAC - Sudah ada

### Integration Points

- **Customer Combobox**: Search existing + inline create dengan default kategori PERSONAL
- **Vehicle Combobox**: Search existing (filtered by customer) + inline create terkait customer
- Items price ambil dari tabel items
- User ID dari AuthContext untuk created_by

## Risks & Mitigations

| Risk                        | Impact | Mitigation                                    |
| --------------------------- | ------ | --------------------------------------------- |
| Data integrity transaksi    | High   | Foreign key constraints, transaction wrapping |
| Invoice number duplicate    | Medium | Unique constraint + auto-increment counter    |
| Price mismatch dengan items | Medium | Store price saat create, bukan reference      |
| Complex status workflow     | Medium | Status log untuk audit, validasi transisi     |

## Out of Scope

Fitur berikut **tidak termasuk** dalam proposal ini:

- Gate logs (QR/LPR/RFID scanning) - Proposal terpisah
- Loader assignments - Proposal terpisah
- Fraud detection flags - Proposal terpisah
- Offline sync layer - Sudah ada proposal terpisah
- Print invoice/receipt - Proposal terpisah
- Price list dengan tier qty - Phase 2

## Success Criteria

1. ✅ Dapat create transaksi dengan customer, vehicle, items
2. ✅ Invoice number auto-generated dan unique
3. ✅ Kalkulasi total otomatis dari items
4. ✅ Dapat update status transaksi dengan logging
5. ✅ Dapat input dan track pembayaran
6. ✅ Status payment otomatis update jika lunas
7. ✅ Permission RBAC berfungsi sesuai role
8. ✅ Filter dan search berfungsi
9. ✅ Tidak ada data dummy, semua dari database
