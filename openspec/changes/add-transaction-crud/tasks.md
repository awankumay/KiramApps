# Tasks: Add Transaction CRUD Management

## Implementation Tasks

### Phase 1: Database Schema & Migration

- [x] Create migration `20260107000001_add_transaction_tables.ts`

  - [x] Create `transaction_types` table
  - [x] Create `payment_methods` table
  - [x] Create `transactions` table with foreign keys
  - [x] Create `transaction_items` table
  - [x] Create `payments` table
  - [x] Create `transaction_status_logs` table
  - [x] Add indexes for performance

- [x] Create migration `20260107000002_seed_transaction_reference_data.ts`
  - [x] Seed transaction_types: PENJUALAN, PENGIRIMAN
  - [x] Seed payment_methods: CASH, TRANSFER, QRIS

### Phase 2: Backend Logic (TransactionManager)

- [x] Create `electron/auth/TransactionManager.ts`

  - [x] Define interfaces (TransactionData, CreateTransactionData, etc.)
  - [x] Implement `getAllTransactions(filters)` with JOIN queries
  - [x] Implement `getTransactionById(id)` with items
  - [x] Implement `generateInvoiceNumber()` with date-based format
  - [x] Implement `createTransaction(data, userId)` with transaction wrapping
  - [x] Implement `updateTransaction(id, data, userId)`
  - [x] Implement `deleteTransaction(id)` - only for CREATED status
  - [x] Implement `searchTransactions(query)`

- [x] Add status management methods

  - [x] Implement `updateTransactionStatus(id, status, userId, note)`
  - [x] Implement status transition validation
  - [x] Implement `getStatusHistory(transactionId)`

- [x] Add payment methods

  - [x] Implement `addPayment(transactionId, data, verifiedBy)`
  - [x] Implement `getPayments(transactionId)`
  - [x] Implement auto-update `payment_status` logic

- [x] Add statistics methods
  - [x] Implement `getDailyStats(date?)`
  - [x] Implement `getTodayTransactions()`

### Phase 3: IPC Handlers & Preload

- [x] Update `electron/main.ts` with IPC handlers

  - [x] `transactions:getAll`
  - [x] `transactions:getById`
  - [x] `transactions:create`
  - [x] `transactions:update`
  - [x] `transactions:delete`
  - [x] `transactions:search`
  - [x] `transactions:updateStatus`
  - [x] `transactions:getStatusHistory`
  - [x] `transactions:addPayment`
  - [x] `transactions:getPayments`
  - [x] `transactions:getDailyStats`
  - [x] `transactionTypes:getAll`
  - [x] `paymentMethods:getAll`

- [x] Update `electron/preload.ts` with API methods
  - [x] Add `transactions` API group
  - [x] Add `transactionTypes` API group
  - [x] Add `paymentMethods` API group

### Phase 4: Type Definitions

- [x] Update `src/Shared/Types/Electron.d.ts`

  - [x] Add `PaymentStatus` type
  - [x] Add `TransactionStatus` type
  - [x] Add `TransactionTypeData` interface
  - [x] Add `PaymentMethodData` interface
  - [x] Add `TransactionData` interface
  - [x] Add `TransactionItemData` interface
  - [x] Add `CreateTransactionData` interface
  - [x] Add `UpdateTransactionData` interface
  - [x] Add `PaymentData` interface
  - [x] Add `CreatePaymentData` interface
  - [x] Add `TransactionStatusLogData` interface
  - [x] Add `TransactionFilters` interface
  - [x] Add `DailyStats` interface
  - [x] Add API type definitions for window.api

- [x] Update `src/Shared/Types/RBAC.ts`

  - [x] Add `CREATE_TRANSACTION` permission
  - [x] Add `VIEW_TRANSACTION` permission
  - [x] Add `EDIT_TRANSACTION` permission
  - [x] Add `DELETE_TRANSACTION` permission
  - [x] Add `MANAGE_TRANSACTION_STATUS` permission
  - [x] Add `VERIFY_PAYMENT` permission

- [x] Update permission seeding in database
  - [x] Add new permissions to seed data
  - [x] Assign permissions to CHECKER role
  - [x] Assign permissions to LOADER role
  - [x] Assign permissions to SUPERADMIN role

### Phase 5: UI Components - TransactionListPage

- [x] Refactor `src/Features/Checker/TransactionListPage.tsx`
  - [x] Remove mock data
  - [x] Add `useEffect` untuk fetch transactions dari API
  - [x] Add `useCallback` untuk fetch dengan filters
  - [x] Implement real stats dari `getDailyStats()`
  - [x] Add filter by status dropdown
  - [x] Add filter by date range
  - [x] Add filter by customer
  - [x] Update status badge dengan semua status values
  - [x] Add View detail button navigation
  - [x] Add loading skeleton
  - [x] Add error handling dengan toast
  - [x] Add pagination (if needed)

### Phase 6: UI Components - Combobox with Inline Create

- [x] Create `src/Features/Checker/Components/CustomerCombobox.tsx`

  - [x] Props: value, onChange, disabled
  - [x] Implement debounced search (300ms)
  - [x] Fetch matching customers dengan `customers.search(query)`
  - [x] Display customer list dropdown
  - [x] Show "+" opsi ketika tidak ada exact match: `+ Tambah Customer Baru: [query]`
  - [x] Handle inline create: `customers.create({ name: query, category: 'PERSONAL' })`
  - [x] Return newly created customer via onChange
  - [x] Loading state saat create
  - [x] Toast notification setelah create

- [x] Create `src/Features/Checker/Components/VehicleCombobox.tsx`

  - [x] Props: value, customerId, onChange, disabled
  - [x] Disabled state jika customerId belum dipilih
  - [x] Implement debounced search (300ms)
  - [x] Fetch vehicles filtered by customer_id
  - [x] Auto-uppercase plate number input
  - [x] Show "+" opsi ketika tidak ada exact match: `+ Tambah Kendaraan Baru: [PLAT]`
  - [x] Handle inline create: `vehicles.create({ plate_number: query, customer_id: customerId })`
  - [x] Return newly created vehicle via onChange
  - [x] Loading state saat create
  - [x] Toast notification setelah create

- [ ] (Optional) Create/Update `src/Shared/Components/UI/Combobox.tsx`
  - [ ] Reusable base combobox component
  - [ ] Support for custom "create" option
  - [ ] Keyboard navigation support

### Phase 7: UI Components - CreateTransactionPage

- [x] Refactor `src/Features/Checker/CreateTransactionPage.tsx`
  - [x] Replace Customer dropdown dengan `CustomerCombobox`
  - [x] Replace Vehicle dropdown dengan `VehicleCombobox`
  - [x] Pass customerId ke VehicleCombobox untuk filtering
  - [x] Reset vehicle saat customer berubah
  - [x] Fetch transaction types dari `transactionTypes.getAll()`
  - [x] Fetch active items dari `items.getActive()`
  - [x] Auto-fill price dari items data
  - [x] Implement Zod validation schema
  - [x] Submit ke `transactions.create()`
  - [x] Redirect ke list/detail setelah success
  - [x] Add loading state untuk submit
  - [x] Add error handling

### Phase 8: New UI Components - Detail & Dialogs

- [x] Create `src/Features/Checker/TransactionDetailPage.tsx`

  - [x] Fetch transaction dengan items
  - [x] Display customer, vehicle info
  - [x] Display items table
  - [x] Display status dengan history
  - [x] Display payments dengan total
  - [x] Add action buttons (Edit, Update Status, Add Payment)
  - [x] Permission-based visibility

- [x] Create `src/Features/Checker/Components/PaymentDialog.tsx`

  - [x] Payment method select dropdown
  - [x] Amount input dengan validation
  - [x] Submit payment ke API
  - [x] Show remaining amount

- [x] Create `src/Features/Checker/Components/StatusUpdateDialog.tsx`

  - [x] Status select berdasarkan valid transitions
  - [x] Optional note input
  - [x] Submit status update ke API

- [x] Create `src/Features/Checker/Components/TransactionStatusBadge.tsx`

  - [x] Color mapping untuk setiap status
  - [x] Label mapping (Indonesian)

### Phase 9: Routing & Navigation

- [x] Update `src/App.tsx`

  - [x] Import TransactionDetailPage
  - [x] Add route `/checker/transactions/:id`
  - [ ] Add route `/checker/transactions/:id/edit` (optional)

- [x] Update `src/Features/Auth/Routes/RouteConfig.ts`

  - [x] Add transaction detail route config
  - [x] Set permission requirements

### Phase 10: Validation & Testing

- [ ] Create Zod schemas in `src/Features/Checker/Schemas/`

  - [ ] `createTransactionSchema.ts`
  - [ ] `createPaymentSchema.ts`

- [ ] Manual testing checklist
- [x] Create transaction dengan semua fields
- [x] **Customer Combobox**: search existing customer
- [x] **Customer Combobox**: inline create new customer
- [x] **Vehicle Combobox**: filter by selected customer
- [x] **Vehicle Combobox**: inline create new vehicle
- [x] **Vehicle Combobox**: disabled when no customer selected
- [x] **Vehicle reset**: saat customer berubah
- [x] Items auto-price
- [x] Total calculation
- [ ] Status progression: CREATED → QUEUED → LOADING → DONE → CHECKED_OUT
- [x] Payment input dan verification
- [x] Payment status auto-update ke PAID (CASH = auto PAID)
- [ ] Filter dan search functionality
- [ ] Permission access control per role
- [ ] Error handling scenarios

### Additional Fixes Applied

- [x] Fix CustomerCombobox: show search results first, then create option
- [x] Fix VehicleCombobox: show search results first, then create option with auto-uppercase
- [x] Fix ItemsManager.getActiveItems(): add missing `price` column in SQL query
- [x] Fix Combobox styling: use theme-aware colors (bg-popover, bg-muted, hover:bg-accent)
- [x] Add Payment Method selection in Summary card (default: CASH id=1)
- [x] Add paymentMethodId to CreateTransactionData interface
- [x] Auto-set payment_status to PAID when CASH payment method is selected
- [x] Auto-create payment record when CASH is selected

## Dependencies

- Existing: Customer CRUD, Vehicle CRUD, Items CRUD, User/RBAC
- Shadcn/ui components: Dialog, Select, Table, Badge, Card
- Existing hooks pattern

## Parallel Work Opportunities

Berikut task yang bisa dikerjakan parallel:

- Phase 1 (Migration) + Phase 4 (Types) - independent
- Phase 2 (Backend) setelah Phase 1 selesai
- Phase 5-7 (UI) bisa parallel setelah Phase 3 selesai

## Notes

- Restart aplikasi diperlukan setelah migration
- Test dengan role berbeda untuk verify RBAC
- Invoice number harus unique per hari
- Price disimpan saat create, tidak reference ke items table
