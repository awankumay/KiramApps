## 1. Implementasi Perubahan Form Create Transaction

- [x] 1.1 Hapus redirect ke halaman daftar transaksi setelah berhasil submit
- [x] 1.2 Tambahkan fungsi untuk reset semua field form ke kondisi awal
- [x] 1.3 Update fungsi handleSubmit untuk memanggil fungsi reset form setelah berhasil create transaction
- [x] 1.4 Pastikan notifikasi sukses tetap ditampilkan menggunakan toast/alert
- [x] 1.5 Verifikasi bahwa filter is_active = 1 tetap diterapkan pada tipe transaksi dan metode pembayaran
- [x] 1.6 Test manual untuk memastikan form benar-benar bersih dan siap untuk input transaksi berikutnya

## 2. Validasi dan Testing

- [x] 2.1 Test scenario: Submit transaksi berhasil → form ter-reset → input transaksi baru
- [x] 2.2 Test scenario: Validasi form masih berfungsi dengan benar setelah reset
- [x] 2.3 Test scenario: Filter is_active = 1 tetap bekerja pada dropdown tipe transaksi dan metode pembayaran
- [x] 2.4 Test scenario: Customer dan Vehicle combobox ter-reset dengan benar
- [x] 2.5 Test scenario: Items list ter-reset ke satu baris kosong
- [x] 2.6 Test scenario: Notes field ter-reset ke kosong

## 3. Dokumentasi

- [x] 3.1 Update komentar di CreateTransactionPage.tsx untuk merefleksikan behavior baru
- [x] 3.2 Pastikan tidak ada referensi ke redirect yang masih relevan
