# Implementation Tasks

## 1. Backend API Implementation

- [x] 1.1 Update CustomerManager untuk mendukung kolom `code`

  - [x] 1.1.1 Update `create` method untuk menerima field `code`
  - [x] 1.1.2 Update `update` method untuk mendukung field `code`
  - [x] 1.1.3 Update `getAll` method untuk mengembalikan field `code`
  - [x] 1.1.4 Tambah validasi unik untuk field `code`

- [x] 1.2 Implement TransactionTypes CRUD di TransactionManager

  - [x] 1.2.1 Tambah `getAll` method untuk transaction types
  - [x] 1.2.2 Tambah `getById` method untuk transaction type
  - [x] 1.2.3 Tambah `create` method untuk transaction type
  - [x] 1.2.4 Tambah `update` method untuk transaction type
  - [x] 1.2.5 Tambah `delete` method untuk transaction type (soft delete via `is_active`)
  - [x] 1.2.6 Tambah validasi unik untuk `code`

- [x] 1.3 Implement PaymentMethods CRUD di PaymentManager

  - [x] 1.3.1 Tambah `getAll` method untuk payment methods
  - [x] 1.3.2 Tambah `getById` method untuk payment method
  - [x] 1.3.3 Tambah `create` method untuk payment method
  - [x] 1.3.4 Tambah `update` method untuk payment method
  - [x] 1.3.5 Tambah `delete` method untuk payment method (soft delete via `is_active`)
  - [x] 1.3.6 Tambah validasi unik untuk `code`

- [x] 1.4 Implement Loaders CRUD di LoaderManager

  - [x] 1.4.1 Tambah `getAll` method untuk loaders
  - [x] 1.4.2 Tambah `getById` method untuk loader
  - [x] 1.4.3 Tambah `create` method untuk loader
  - [x] 1.4.4 Tambah `update` method untuk loader
  - [x] 1.4.5 Tambah `delete` method untuk loader (soft delete via `is_active`)
  - [x] 1.4.6 Tambah validasi unik untuk `code`

- [x] 1.5 Update TypeScript type definitions

  - [x] 1.5.1 Update `CustomerData` type untuk menyertakan `code`
  - [x] 1.5.2 Update `CreateCustomerData` type untuk menyertakan `code`
  - [x] 1.5.3 Update `UpdateCustomerData` type untuk menyertakan `code`
  - [x] 1.5.4 Tambah `TransactionTypeData` type
  - [x] 1.5.5 Tambah `CreateTransactionTypeData` type
  - [x] 1.5.6 Tambah `UpdateTransactionTypeData` type
  - [x] 1.5.7 Tambah `PaymentMethodData` type
  - [x] 1.5.8 Tambah `CreatePaymentMethodData` type
  - [x] 1.5.9 Tambah `UpdatePaymentMethodData` type
  - [x] 1.5.10 Tambah `LoaderData` type
  - [x] 1.5.11 Tambah `CreateLoaderData` type
  - [x] 1.5.12 Tambah `UpdateLoaderData` type

- [x] 1.6 Update preload.ts untuk expose API methods

  - [x] 1.6.1 Expose transaction types API methods
  - [x] 1.6.2 Expose payment methods API methods
  - [x] 1.6.3 Expose loaders API methods

- [x] 1.7 Add IPC handlers in main.ts
  - [x] 1.7.1 Add transaction types IPC handlers
  - [x] 1.7.2 Add payment methods IPC handlers
  - [x] 1.7.3 Add loaders IPC handlers

## 2. Frontend UI Implementation

- [x] 2.1 Update CustomerListPage untuk mendukung kolom `code`

  - [x] 2.1.1 Tambah field `code` di form data interface
  - [x] 2.1.2 Tambah input field `code` di form create/edit
  - [x] 2.1.3 Tambah kolom `code` di tabel daftar customer
  - [x] 2.1.4 Tambah validasi untuk field `code` (required, unique)
  - [x] 2.1.5 Update form validation untuk memeriksa `code`

- [x] 2.2 Buat TransactionTypesListPage

  - [x] 2.2.1 Buat struktur komponen React
  - [x] 2.2.2 Implementasi state management (data, loading, dialogs)
  - [x] 2.2.3 Buat tabel dengan kolom: name, code, is_active, created_at
  - [x] 2.2.4 Buat form create/edit dengan fields: name, code, is_active
  - [x] 2.2.5 Implementasi search dan filter berdasarkan status
  - [x] 2.2.6 Implementasi create transaction type
  - [x] 2.2.7 Implementasi update transaction type
  - [x] 2.2.8 Implementasi delete transaction type (soft delete)
  - [x] 2.2.9 Implementasi toggle status aktif/nonaktif
  - [x] 2.2.10 Tambah toast notifications untuk feedback
  - [x] 2.2.11 Tambah stats cards (total, active, inactive)

- [x] 2.3 Buat PaymentMethodsListPage

  - [x] 2.3.1 Buat struktur komponen React
  - [x] 2.3.2 Implementasi state management (data, loading, dialogs)
  - [x] 2.3.3 Buat tabel dengan kolom: name, code, is_active, created_at
  - [x] 2.3.4 Buat form create/edit dengan fields: name, code, is_active
  - [x] 2.3.5 Implementasi search dan filter berdasarkan status
  - [x] 2.3.6 Implementasi create payment method
  - [x] 2.3.7 Implementasi update payment method
  - [x] 2.3.8 Implementasi delete payment method (soft delete)
  - [x] 2.3.9 Implementasi toggle status aktif/nonaktif
  - [x] 2.3.10 Tambah toast notifications untuk feedback
  - [x] 2.3.11 Tambah stats cards (total, active, inactive)

- [x] 2.4 Buat LoadersListPage
  - [x] 2.4.1 Buat struktur komponen React
  - [x] 2.4.2 Implementasi state management (data, loading, dialogs)
  - [x] 2.4.3 Buat tabel dengan kolom: name, code, is_active, created_at
  - [x] 2.4.4 Buat form create/edit dengan fields: name, code, is_active
  - [x] 2.4.5 Implementasi search dan filter berdasarkan status
  - [x] 2.4.6 Implementasi create loader
  - [x] 2.4.7 Implementasi update loader
  - [x] 2.4.8 Implementasi delete loader (soft delete)
  - [x] 2.4.9 Implementasi toggle status aktif/nonaktif
  - [x] 2.4.10 Tambah toast notifications untuk feedback
  - [x] 2.4.11 Tambah stats cards (total, active, inactive)

## 3. Navigation and Routing

- [x] 3.1 Tambah routes baru di App.tsx

  - [x] 3.1.1 Tambah route untuk TransactionTypesListPage
  - [x] 3.1.2 Tambah route untuk PaymentMethodsListPage
  - [x] 3.1.3 Tambah route untuk LoadersListPage
  - [x] 3.1.4 Wrap routes dengan ProtectedRoute untuk SUPERADMIN

- [x] 3.2 Update AppSidebarRBAC untuk menambah menu items
  - [x] 3.2.1 Tambah menu "Transaction Types" dengan icon
  - [x] 3.2.2 Tambah menu "Payment Methods" dengan icon
  - [x] 3.2.3 Tambah menu "Loaders" dengan icon
  - [x] 3.2.4 Pastikan menu hanya muncul untuk role SUPERADMIN

## 4. Testing and Validation

- [x] 4.1 Manual testing untuk Customer Management

  - [x] 4.1.1 Test create customer dengan field `code`
  - [x] 4.1.2 Test update customer dengan field `code`
  - [x] 4.1.3 Test validasi unik untuk `code`
  - [x] 4.1.4 Test tampilan kolom `code` di tabel

- [x] 4.2 Manual testing untuk Transaction Types CRUD

  - [x] 4.2.1 Test create transaction type
  - [x] 4.2.2 Test update transaction type
  - [x] 4.2.3 Test delete transaction type (soft delete)
  - [x] 4.2.4 Test toggle status aktif/nonaktif
  - [x] 4.2.5 Test search dan filter
  - [x] 4.2.6 Test validasi unik untuk `code`

- [x] 4.3 Manual testing untuk Payment Methods CRUD

  - [x] 4.3.1 Test create payment method
  - [x] 4.3.2 Test update payment method
  - [x] 4.3.3 Test delete payment method (soft delete)
  - [x] 4.3.4 Test toggle status aktif/nonaktif
  - [x] 4.3.5 Test search dan filter
  - [x] 4.3.6 Test validasi unik untuk `code`

- [x] 4.4 Manual testing untuk Loaders CRUD

  - [x] 4.4.1 Test create loader
  - [x] 4.4.2 Test update loader
  - [x] 4.4.3 Test delete loader (soft delete)
  - [x] 4.4.4 Test toggle status aktif/nonaktif
  - [x] 4.4.5 Test search dan filter
  - [x] 4.4.6 Test validasi unik untuk `code`

- [x] 4.5 Test role-based access control
  - [x] 4.5.1 Verify SUPERADMIN bisa akses semua halaman
  - [x] 4.5.2 Verify CHECKER tidak bisa akses halaman referensi
  - [x] 4.5.3 Verify LOADER tidak bisa akses halaman referensi

## 5. Bug Fixes

- [x] 5.1 Fix filter logic in reference data list pages

  - [x] 5.1.1 Fix PaymentMethodsListPage search filter (change AND to OR)
  - [x] 5.1.2 Fix TransactionTypesListPage search filter (change AND to OR)
  - [x] 5.1.3 Fix LoadersListPage search filter (change AND to OR)

- [x] 5.2 Remove code field from reference data pages (schema mismatch)

  - [x] 5.2.1 Remove code field from PaymentMethodsListPage (only name and is_active in schema)
  - [x] 5.2.2 Remove code field from TransactionTypesListPage (only name and is_active in schema)
  - [x] 5.2.3 Remove code field from LoadersListPage (only name and is_active in schema)
  - [x] 5.2.4 Update form interfaces, validation, CRUD operations, and table display

- [x] 5.3 Fix CRUD operations in backend managers (match ItemsManager pattern)
  - [x] 5.3.1 Fix TransactionManager.createTransactionType - add proper error handling and throw exception if creation fails
  - [x] 5.3.2 Fix TransactionManager.deleteTransactionType - change from soft delete (UPDATE is_active) to hard delete (DELETE FROM)
  - [x] 5.3.3 Fix PaymentManager.create - add proper error handling and throw exception if creation fails
  - [x] 5.3.4 Fix PaymentManager.delete - change from soft delete (UPDATE is_active) to hard delete (DELETE FROM)
  - [x] 5.3.5 Fix LoaderManager.create - add proper error handling and throw exception if creation fails
  - [x] 5.3.6 Fix LoaderManager.delete - change from soft delete (UPDATE is_active) to hard delete (DELETE FROM)
