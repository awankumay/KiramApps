# Capability: Transaction Management

## Overview

Sistem manajemen transaksi untuk mencatat penjualan material kepada customer, termasuk tracking status, pembayaran, dan audit trail.

## ADDED Requirements

### Requirement: Transaction CRUD Operations

Sistem MUST menyediakan operasi CRUD lengkap untuk transaksi.

#### Scenario: Create new transaction

- **Given** user dengan permission `CREATE_TRANSACTION` login
- **And** minimal satu customer aktif tersedia
- **And** minimal satu vehicle milik customer tersedia
- **And** minimal satu item aktif tersedia
- **When** user mengisi form transaksi dengan customer, vehicle, dan items
- **Then** sistem generate invoice number format `INV-YYYYMMDD-XXXX`
- **And** sistem menyimpan transaksi dengan status `CREATED`
- **And** sistem menyimpan log status awal
- **And** user redirect ke halaman detail/list transaksi

#### Scenario: View transaction list

- **Given** user dengan permission `VIEW_TRANSACTION` login
- **When** user mengakses halaman daftar transaksi
- **Then** sistem menampilkan semua transaksi dengan kolom: Invoice, Customer, Vehicle, Total, Payment Status, Transaction Status, Tanggal
- **And** statistik harian ditampilkan (total, pending, completed)
- **And** user dapat filter berdasarkan status, tanggal, customer

#### Scenario: View transaction detail

- **Given** user dengan permission `VIEW_TRANSACTION` login
- **When** user klik transaksi dari list
- **Then** sistem menampilkan detail lengkap: header info, items table, payment history, status history
- **And** action buttons ditampilkan sesuai status dan permission

#### Scenario: Update transaction (draft only)

- **Given** user dengan permission `EDIT_TRANSACTION` login
- **And** transaksi dalam status `CREATED`
- **When** user mengedit data transaksi
- **Then** sistem menyimpan perubahan
- **And** items dapat ditambah/edit/hapus

#### Scenario: Delete transaction (draft only)

- **Given** user dengan permission `DELETE_TRANSACTION` login
- **And** transaksi dalam status `CREATED`
- **When** user menghapus transaksi
- **Then** sistem menghapus transaksi beserta items
- **And** transaksi tidak muncul di list

#### Scenario: Search transactions

- **Given** user dengan permission `VIEW_TRANSACTION` login
- **When** user memasukkan keyword pencarian
- **Then** sistem mencari berdasarkan invoice number, nama customer, atau plat kendaraan
- **And** hasil yang cocok ditampilkan

---

### Requirement: Transaction Status Management

Sistem MUST mendukung workflow status transaksi dengan logging.

#### Scenario: Update transaction status

- **Given** user dengan permission `MANAGE_TRANSACTION_STATUS` login
- **And** transaksi dalam status valid untuk transisi
- **When** user mengubah status transaksi
- **Then** sistem memvalidasi transisi status valid
- **And** sistem menyimpan status baru
- **And** sistem mencatat log: old_status, new_status, changed_by, timestamp, note

#### Scenario: Status workflow - CREATED to QUEUED

- **Given** transaksi dengan status `CREATED`
- **And** user role `CHECKER` atau `SUPERADMIN`
- **When** user mengubah status ke `QUEUED`
- **Then** status berubah menjadi `QUEUED`
- **And** transaksi siap untuk diproses loader

#### Scenario: Status workflow - QUEUED to LOADING

- **Given** transaksi dengan status `QUEUED`
- **And** user role `LOADER` atau `SUPERADMIN`
- **When** user mengubah status ke `LOADING`
- **Then** status berubah menjadi `LOADING`
- **And** proses loading dimulai

#### Scenario: Status workflow - LOADING to DONE

- **Given** transaksi dengan status `LOADING`
- **And** user role `LOADER` atau `SUPERADMIN`
- **When** user mengubah status ke `DONE`
- **Then** status berubah menjadi `DONE`
- **And** loading selesai, menunggu checkout

#### Scenario: Status workflow - DONE to CHECKED_OUT

- **Given** transaksi dengan status `DONE`
- **And** user role `CHECKER` atau `SUPERADMIN`
- **When** user mengubah status ke `CHECKED_OUT`
- **Then** status berubah menjadi `CHECKED_OUT`
- **And** transaksi complete

#### Scenario: View status history

- **Given** user dengan permission `VIEW_TRANSACTION` login
- **When** user melihat detail transaksi
- **Then** sistem menampilkan timeline status changes
- **And** setiap entry menunjukkan: status, changed_by, timestamp, note

---

### Requirement: Payment Processing

Sistem MUST mendukung pencatatan dan tracking pembayaran.

#### Scenario: Add payment to transaction

- **Given** user dengan permission `VERIFY_PAYMENT` login
- **And** transaksi dengan status bukan `CREATED`
- **When** user menambah pembayaran dengan method dan amount
- **Then** sistem menyimpan payment record
- **And** sistem mencatat verified_by dan timestamp

#### Scenario: Auto-update payment status to PAID

- **Given** transaksi dengan payment_status `UNPAID`
- **When** total pembayaran >= total_amount transaksi
- **Then** sistem otomatis update payment_status ke `PAID`

#### Scenario: View payment history

- **Given** user dengan permission `VIEW_TRANSACTION` login
- **When** user melihat detail transaksi
- **Then** sistem menampilkan semua pembayaran
- **And** total terbayar dan sisa ditampilkan

---

### Requirement: Transaction Items Management

Sistem MUST mendukung pengelolaan item dalam transaksi.

#### Scenario: Add item to transaction

- **Given** user membuat/edit transaksi
- **When** user memilih item dan memasukkan qty
- **Then** harga auto-fill dari master items
- **And** subtotal = qty × price dihitung otomatis
- **And** total transaksi di-update

#### Scenario: Multiple items in transaction

- **Given** user membuat transaksi
- **When** user menambah lebih dari satu item
- **Then** semua items ditampilkan dalam table
- **And** total = sum of all subtotals

#### Scenario: Price stored at transaction time

- **Given** user memilih item dengan harga Rp 100.000
- **When** transaksi disimpan
- **Then** harga Rp 100.000 disimpan di transaction_items
- **And** perubahan harga items di masa depan tidak mempengaruhi transaksi ini

---

### Requirement: Vehicle-Customer Relationship

Sistem MUST menerapkan relasi vehicle-customer dalam pembuatan transaksi.

#### Scenario: Filter vehicles by selected customer

- **Given** user memilih customer A
- **When** sistem menampilkan combobox vehicle
- **Then** hanya vehicle milik customer A yang ditampilkan dalam autocomplete
- **And** vehicle customer lain tidak ditampilkan

#### Scenario: Change customer resets vehicle

- **Given** user sudah memilih customer A dan vehicle
- **When** user mengubah ke customer B
- **Then** pilihan vehicle di-reset ke kosong
- **And** combobox vehicle menampilkan vehicle customer B

#### Scenario: Vehicle combobox disabled without customer

- **Given** user belum memilih customer
- **When** user mencoba menggunakan combobox vehicle
- **Then** combobox vehicle dalam state disabled
- **And** placeholder menampilkan "Pilih customer terlebih dahulu"

---

### Requirement: Customer Combobox with Inline Create

Sistem MUST menyediakan combobox customer dengan fitur autocomplete dan inline create.

#### Scenario: Search existing customer

- **Given** user berada di form create transaksi
- **When** user mengetik "PT. Sumber" di combobox customer
- **Then** sistem menampilkan daftar customer yang mengandung "PT. Sumber"
- **And** user dapat memilih dari daftar tersebut

#### Scenario: Inline create new customer

- **Given** user mengetik nama customer yang belum ada di database
- **When** tidak ada hasil yang cocok
- **Then** sistem menampilkan opsi "+ Tambah Customer Baru: [nama yang diketik]"
- **And** ketika user klik opsi tersebut
- **Then** sistem otomatis create customer baru dengan nama tersebut
- **And** kategori default = `PERSONAL`
- **And** is_active = true
- **And** customer baru langsung terpilih di form

#### Scenario: Customer created inline persists

- **Given** user membuat customer baru via inline create
- **When** transaksi selesai dibuat
- **Then** customer tersebut tersimpan permanen di database
- **And** dapat digunakan untuk transaksi berikutnya

---

### Requirement: Vehicle Combobox with Inline Create

Sistem MUST menyediakan combobox vehicle dengan fitur autocomplete dan inline create terikat customer.

#### Scenario: Search existing vehicle

- **Given** user sudah memilih customer A
- **And** customer A memiliki vehicle dengan plat "B 1234 ABC"
- **When** user mengetik "B 1234" di combobox vehicle
- **Then** sistem menampilkan vehicle dengan plat "B 1234 ABC"

#### Scenario: Inline create new vehicle

- **Given** user sudah memilih customer A
- **When** user mengetik plat kendaraan yang belum ada: "D 5678 XYZ"
- **And** tidak ada hasil yang cocok untuk customer A
- **Then** sistem menampilkan opsi "+ Tambah Kendaraan Baru: D 5678 XYZ"
- **And** ketika user klik opsi tersebut
- **Then** sistem otomatis create vehicle baru dengan plat tersebut
- **And** plate_number di-uppercase otomatis
- **And** customer_id = ID customer yang dipilih
- **And** is_active = true
- **And** vehicle baru langsung terpilih di form

#### Scenario: Vehicle inherits customer relationship

- **Given** user memilih customer A dan create vehicle baru via inline
- **When** vehicle berhasil dibuat
- **Then** vehicle tersebut terhubung ke customer A
- **And** muncul di daftar vehicle customer A untuk transaksi selanjutnya

---

### Requirement: Invoice Number Generation

Sistem MUST generate invoice number yang unique dan terformat.

#### Scenario: Generate invoice number

- **Given** tanggal hari ini 2026-01-07
- **And** belum ada transaksi hari ini
- **When** transaksi baru dibuat
- **Then** invoice number = `INV-20260107-0001`

#### Scenario: Sequential invoice number per day

- **Given** sudah ada transaksi `INV-20260107-0001`
- **When** transaksi baru dibuat di hari yang sama
- **Then** invoice number = `INV-20260107-0002`

#### Scenario: Reset counter on new day

- **Given** terakhir transaksi adalah `INV-20260107-0099`
- **When** transaksi baru dibuat pada 2026-01-08
- **Then** invoice number = `INV-20260108-0001`

---

### Requirement: Permission-Based Access

Akses fitur transaksi MUST sesuai dengan permission user.

#### Scenario: CHECKER role permissions

- **Given** user dengan role `CHECKER` login
- **Then** user dapat: CREATE_TRANSACTION, VIEW_TRANSACTION, EDIT_TRANSACTION, MANAGE_TRANSACTION_STATUS, VERIFY_PAYMENT
- **And** user tidak dapat: DELETE_TRANSACTION (superadmin only)

#### Scenario: LOADER role permissions

- **Given** user dengan role `LOADER` login
- **Then** user dapat: VIEW_TRANSACTION, MANAGE_TRANSACTION_STATUS (untuk LOADING workflow)
- **And** user tidak dapat: CREATE_TRANSACTION, EDIT_TRANSACTION, DELETE_TRANSACTION, VERIFY_PAYMENT

#### Scenario: SUPERADMIN role permissions

- **Given** user dengan role `SUPERADMIN` login
- **Then** user dapat semua permission transaksi

---

## Reference Data

### Transaction Types

- PENJUALAN - Penjualan material ke customer
- PENGIRIMAN - Pengiriman material ke lokasi

### Payment Methods

- CASH - Pembayaran tunai
- TRANSFER - Transfer bank
- QRIS - Pembayaran QRIS

### Transaction Status

- CREATED - Baru dibuat, dapat diedit/hapus
- QUEUED - Menunggu giliran loading
- LOADING - Sedang proses loading
- DONE - Loading selesai, menunggu checkout
- CHECKED_OUT - Transaksi selesai

### Payment Status

- UNPAID - Belum lunas
- PAID - Sudah lunas
