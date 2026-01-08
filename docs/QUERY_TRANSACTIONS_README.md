# Query Transactions Script

Script untuk melakukan query ke tabel transactions menggunakan SQLite.

## Lokasi Database

Database SQLite berlokasi di:

- **Windows**: `%APPDATA%\kiram-site\app-data.db`
- **macOS**: `~/Library/Application Support/kiram-site/app-data.db`
- **Linux**: `~/.config/kiram-site/app-data.db`

## Cara Penggunaan

### Format Dasar

```bash
node scripts/query-transactions.js [query-type] [parameter]
```

### Tipe Query yang Tersedia

#### 1. **all** - Semua Transaksi

Menampilkan semua transaksi dengan pagination (default 20).

```bash
# Menampilkan 20 transaksi terakhir
node scripts/query-transactions.js all

# Menampilkan 50 transaksi terakhir
node scripts/query-transactions.js all 50
```

#### 2. **today** - Transaksi Hari Ini

Menampilkan semua transaksi yang dibuat hari ini.

```bash
node scripts/query-transactions.js today
```

#### 3. **unpaid** - Transaksi Belum Lunas

Menampilkan semua transaksi dengan status pembayaran UNPAID.

```bash
node scripts/query-transactions.js unpaid
```

#### 4. **paid** - Transaksi Sudah Lunas

Menampilkan semua transaksi dengan status pembayaran PAID.

```bash
node scripts/query-transactions.js paid
```

#### 5. **by-status** - Filter Berdasarkan Status Transaksi

Menampilkan transaksi berdasarkan status transaksi.

```bash
node scripts/query-transactions.js by-status CREATED
node scripts/query-transactions.js by-status QUEUED
node scripts/query-transactions.js by-status LOADING
node scripts/query-transactions.js by-status DONE
node scripts/query-transactions.js by-status CHECKED_OUT
```

Status Transaksi:

- `CREATED` - Transaksi baru dibuat
- `QUEUED` - Transaksi dalam antrian
- `LOADING` - Transaksi sedang dimuat
- `DONE` - Transaksi selesai
- `CHECKED_OUT` - Transaksi sudah checkout

#### 6. **by-customer** - Filter Berdasarkan Customer

Menampilkan transaksi berdasarkan nama customer (pencarian partial).

```bash
node scripts/query-transactions.js by-customer "John Doe"
node scripts/query-transactions.js by-customer "Budi"
```

#### 7. **search** - Cari Transaksi

Mencari transaksi berdasarkan:

- Nomor invoice
- Nama customer
- Plat nomor kendaraan

```bash
node scripts/query-transactions.js search "INV-20260107"
node scripts/query-transactions.js search "B 1234 ABC"
node scripts/query-transactions.js search "John"
```

#### 8. **stats** - Statistik Hari Ini

Menampilkan statistik transaksi hari ini.

```bash
node scripts/query-transactions.js stats
```

Output:

- Total transaksi
- Jumlah per status transaksi (Created, Queued, Loading, Done, Checked Out)
- Jumlah per status pembayaran (Paid, Unpaid)
- Total nilai transaksi

#### 9. **detail** - Detail Transaksi Lengkap

Menampilkan detail lengkap transaksi termasuk items dan payments.

```bash
node scripts/query-transactions.js detail 1
node scripts/query-transactions.js detail 5
```

Output:

- Informasi transaksi (invoice, customer, kendaraan, total, status)
- Daftar items (nama, qty, harga, subtotal)
- Riwayat pembayaran (metode, jumlah, status verifikasi)

## Contoh Penggunaan

### Melihat semua transaksi hari ini

```bash
node scripts/query-transactions.js today
```

### Mencari transaksi yang belum lunas

```bash
node scripts/query-transactions.js unpaid
```

### Melihat transaksi dengan status LOADING

```bash
node scripts/query-transactions.js by-status LOADING
```

### Mencari transaksi customer tertentu

```bash
node scripts/query-transactions.js by-customer "Ahmad"
```

### Melihat detail transaksi tertentu

```bash
node scripts/query-transactions.js detail 10
```

### Melihat statistik hari ini

```bash
node scripts/query-transactions.js stats
```

## Error Handling

Jika database tidak ditemukan, script akan menampilkan error:

```
Database tidak ditemukan: [path]
Pastikan aplikasi sudah dijalankan minimal sekali untuk membuat database.
```

Solusi: Jalankan aplikasi Electron minimal sekali untuk membuat database.

## Struktur Tabel Transactions

### Kolom Utama

- `id` - Primary key
- `invoice_number` - Nomor invoice (unique)
- `transaction_type_id` - ID tipe transaksi
- `customer_id` - ID customer
- `vehicle_id` - ID kendaraan
- `total_amount` - Total nilai transaksi
- `payment_status` - Status pembayaran (UNPAID/PAID)
- `transaction_status` - Status transaksi (CREATED/QUEUED/LOADING/DONE/CHECKED_OUT)
- `created_by` - ID user yang membuat transaksi
- `notes` - Catatan tambahan
- `created_at` - Tanggal pembuatan
- `updated_at` - Tanggal update terakhir

### Tabel Terkait

- `transaction_types` - Referensi tipe transaksi
- `payment_methods` - Referensi metode pembayaran
- `transaction_items` - Items dalam transaksi
- `payments` - Pembayaran untuk transaksi
- `transaction_status_logs` - Riwayat perubahan status

## Tips

1. **Pagination**: Gunakan parameter limit untuk membatasi hasil query

   ```bash
   node scripts/query-transactions.js all 100
   ```

2. **Search**: Gunakan query `search` untuk mencari cepat berdasarkan invoice, customer, atau plat nomor

3. **Detail**: Gunakan query `detail` untuk melihat informasi lengkap termasuk items dan payments

4. **Stats**: Gunakan query `stats` untuk melihat ringkasan aktivitas hari ini

## Troubleshooting

### Database tidak ditemukan

- Pastikan aplikasi Electron sudah dijalankan minimal sekali
- Cek apakah path database sesuai dengan sistem operasi Anda

### Permission denied

- Pastikan Anda memiliki akses read ke direktori database
- Di Windows, jalankan terminal sebagai administrator jika perlu

### Data kosong

- Pastikan migration sudah dijalankan
- Cek apakah ada data seed yang perlu dijalankan
