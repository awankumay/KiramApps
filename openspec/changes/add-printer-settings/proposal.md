# Change: Add Printer Settings and Integration

## Why

Aplikasi POS desktop (ElectronJS) memerlukan kemampuan untuk mencetak receipt/struk transaksi. Saat ini tidak ada fitur printing sama sekali. Pengguna perlu dapat:

- Memilih printer yang terinstall di Windows untuk mencetak struk
- Menggunakan mode PDF sebagai fallback saat printer fisik belum tersedia
- Mengatur dan menyimpan konfigurasi printer secara persisten
- Melakukan uji coba print untuk memvalidasi konfigurasi

Tanpa fitur ini, sistem tidak dapat menghasilkan bukti transaksi fisik yang diperlukan untuk operasional POS.

## What Changes

- Menambahkan form Printer Settings di menu Settings
- Menambahkan deteksi printer yang terinstall di Windows menggunakan Electron's `webContents.getPrinters()` API
- Menambahkan dropdown untuk memilih target printer
- Menambahkan toggle mode "Print to PDF" untuk uji coba
- Menambahkan persistent storage untuk konfigurasi printer (menggunakan electron-store atau file JSON)
- Menambahkan tombol "Cetak Uji Coba" untuk validasi konfigurasi
- Menambahkan IPC handlers di Electron main process:
  - `get-printers` - Mengambil daftar printer yang terinstall
  - `get-printer-config` - Mengambil konfigurasi printer yang tersimpan
  - `save-printer-config` - Menyimpan konfigurasi printer
  - `print-test` - Mencetak test receipt
- Menambahkan UI React untuk Printer Settings form dengan shadcn-ui components
- Menambahkan notifikasi toast untuk feedback sukses/error

## Impact

- **Affected specs:**
  - `printer-settings` (new capability)
- **Affected code:**
  - `electron/main.ts` - IPC handlers untuk printer operations
  - `electron/preload.ts` - Context bridge untuk printer IPC
  - `src/Features/Settings/` - New PrinterSettings component
  - `src/Shared/Types/` - TypeScript types untuk PrinterConfig
- **Dependencies:**
  - `electron-store` (optional, atau gunakan fs untuk JSON file)
  - Tidak ada dependensi eksternal untuk printer detection (menggunakan Electron native API)
- **Breaking changes:** None
- **Migration:** Tidak diperlukan (fitur baru)
