# Change: Update Transaction Form to Clear After Submit

## Why

Saat ini, setelah checker berhasil membuat transaksi baru melalui form Create Transaction, sistem secara otomatis me-redirect user ke halaman daftar transaksi (TransactionListPage). Hal ini mengharuskan checker untuk kembali ke form create transaction jika ingin memasukkan transaksi berikutnya, yang tidak efisien untuk workflow checker yang perlu memproses banyak transaksi secara berurutan.

## What Changes

- Mengubah behavior form Create Transaction agar setelah berhasil submit, form di-reset ke kondisi awal (clear semua field) tanpa me-redirect ke halaman daftar transaksi
- Menampilkan notifikasi sukses yang memberikan feedback bahwa transaksi telah berhasil dibuat
- Checker dapat langsung memasukkan transaksi berikutnya tanpa perlu navigasi tambahan
- Form tetap menampilkan hanya tipe transaksi dan metode pembayaran yang aktif (is_active = 1)

## Impact

- Affected specs: `transaction-management`
- Affected code: `src/Features/Checker/CreateTransactionPage.tsx`
- User experience: Checker workflow menjadi lebih efisien untuk pemrosesan transaksi berurutan
