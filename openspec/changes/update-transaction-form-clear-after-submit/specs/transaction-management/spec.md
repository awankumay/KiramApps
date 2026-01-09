## MODIFIED Requirements

### Requirement: Transaction Creation Form Behavior

The system SHALL provide a form for creating new transactions that allows checkers to efficiently process multiple transactions in sequence without navigation.

#### Scenario: Transaction form resets after successful submission

**Given**:

- Checker berada di halaman Create Transaction
- Form terisi dengan data transaksi (customer, vehicle, items, payment method, dll)

**When**:

- Checker mengklik tombol "Simpan Transaksi"
- Data transaksi valid dan berhasil disimpan ke database

**Then**:

- Form di-reset ke kondisi awal (semua field kosong)
- Customer combobox kembali ke kondisi tidak ada yang dipilih
- Vehicle combobox kembali ke kondisi tidak ada yang dipilih
- Tipe transaksi kembali ke nilai default
- Metode pembayaran kembali ke nilai default
- Items list ter-reset ke satu baris kosong
- Notes field ter-reset ke kosong
- Sistem menampilkan notifikasi sukses (toast/alert) bahwa transaksi berhasil dibuat
- Checker tetap berada di halaman Create Transaction
- Checker dapat langsung memasukkan transaksi berikutnya

#### Scenario: Transaction form validation still works after reset

**Given**:

- Form baru saja di-reset setelah submit transaksi berhasil
- Semua field dalam kondisi kosong

**When**:

- Checker mencoba mengklik tombol "Simpan Transaksi" tanpa mengisi field yang wajib

**Then**:

- Validasi form tetap berfungsi
- Alert/peringatan ditampilkan untuk field yang belum diisi
- Transaksi tidak disimpan sampai semua field wajib terisi

#### Scenario: Active transaction types and payment methods are filtered in create form

**Given**:

- Terdapat 5 transaction types di database
- 3 transaction types aktif (is_active = 1)
- 2 transaction types nonaktif (is_active = 0)
- Terdapat 4 payment methods di database
- 3 payment methods aktif (is_active = 1)
- 1 payment method nonaktif (is_active = 0)

**When**:

- Checker mengakses form Create Transaction
- Form di-reset setelah submit transaksi berhasil

**Then**:

- Dropdown tipe transaksi hanya menampilkan 3 transaction types yang aktif
- Dropdown metode pembayaran hanya menampilkan 3 payment methods yang aktif
- Transaction types dan payment methods nonaktif tidak tersedia sebagai opsi
- Filter is_active = 1 diterapkan secara konsisten
