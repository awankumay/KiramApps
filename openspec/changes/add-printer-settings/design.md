# Design: Printer Settings and Integration

## Context

Aplikasi POS desktop berjalan di Windows 10/11 menggunakan ElectronJS. Printer yang digunakan biasanya adalah thermal printer (EPSON, STAR) yang sudah terinstall di sistem operasi Windows. Pengguna perlu mengkonfigurasi printer untuk mencetak receipt/struk transaksi.

**Constraints:**

- Platform hanya Windows 10/11
- Offline-first - tidak ada ketergantungan pada layanan eksternal untuk printing
- Printer sudah terinstall di Windows (tidak perlu install printer dari dalam aplikasi)
- Konfigurasi harus persisten setelah aplikasi restart

## Goals / Non-Goals

**Goals:**

- Mendeteksi semua printer yang terinstall di Windows
- Memungkinkan pengguna memilih printer target
- Mendukung mode PDF sebagai fallback untuk testing
- Menyimpan konfigurasi printer secara persisten
- Melakukan test print untuk validasi konfigurasi
- Memberikan feedback yang jelas kepada pengguna

**Non-Goals:**

- Menginstall printer baru dari dalam aplikasi
- Custom ESC/POS commands (disimpan untuk fase berikutnya)
- Konfigurasi paper size/encoding (akan ditambahkan nanti)
- Network/cloud printer discovery di luar yang sudah tersedia di Windows
- Multi-language printer names handling (asumsikan UTF-8 compatible)

## Decisions

### 1. Printer Detection

**Decision:** Menggunakan Electron's `webContents.getPrinters()` API

**Rationale:**

- API native Electron yang tersedia di Windows
- Tidak memerlukan library eksternal
- Menggunakan OS-level printer enumeration
- Menyediakan informasi printer lengkap (name, status, description)

**Alternatives considered:**

- `node-printer` library: Memerlukan native compilation, kompleksitas tambahan
- Windows `wmic` command: Tidak cross-platform, fragile
- **Selected:** Electron native API (paling sederhana dan reliable)

### 2. Persistent Storage

**Decision:** Menggunakan `electron-store` untuk menyimpan konfigurasi printer

**Rationale:**

- Simple API untuk read/write config
- Otomatis menyimpan ke file JSON di AppData
- Type-safe dengan TypeScript
- Sudah digunakan di banyak project Electron

**Alternatives considered:**

- Manual `fs` dengan JSON file: Lebih verbose, harus handle file I/O manual
- SQLite database: Overkill untuk config sederhana
- localStorage: Tidak tersedia di main process
- **Selected:** electron-store (balance antara simplicity dan reliability)

**Fallback:** Jika electron-store tidak dapat digunakan, gunakan manual fs dengan file JSON di `app.getPath('userData')/printer-config.json`

### 3. IPC Communication Pattern

**Decision:** Menggunakan `ipcRenderer.invoke()` untuk request-response dan `ipcRenderer.send()` untuk async operations

**Rationale:**

- `invoke()` untuk operasi yang butuh return value (get-printers, get-config)
- `send()` untuk operasi async yang tidak butuh return (save-config, print-test)
- Mengikuti pattern yang sudah ada di project (lihat AuthManager, TransactionManager)

**IPC Handlers yang akan dibuat:**

```typescript
// Main process
ipcMain.handle("get-printers", async () => {
  return mainWindow.webContents.getPrinters();
});

ipcMain.handle("get-printer-config", async () => {
  return store.get("printerConfig");
});

ipcMain.handle("save-printer-config", async (_, config: PrinterConfig) => {
  store.set("printerConfig", config);
  return { success: true };
});

ipcMain.on("print-test", async (_, config: PrinterConfig) => {
  // Implement print logic
});
```

### 4. Print Test Implementation

**Decision:** Menggunakan Electron's `webContents.print()` API untuk test print

**Rationale:**

- Native API yang tersedia di Electron
- Mendukung print ke printer fisik dan PDF
- Tidak memerlukan library eksternal
- Konsisten dengan printer detection API

**PDF Mode:**

- Set `printToPDF: true` dalam options
- Simpan file ke `app.getPath('downloads')/print-test-{timestamp}.pdf`

**Physical Printer Mode:**

- Set `deviceName` ke printer yang dipilih
- Gunakan default print settings

### 5. UI Component Structure

**Decision:** Menggunakan shadcn-ui components untuk form

**Rationale:**

- Konsisten dengan UI yang sudah ada di project
- Components yang tersedia: Select, Checkbox, Button, Card, Label
- Accessible dan customizable
- Styling dengan Tailwind CSS

**Component hierarchy:**

```
PrinterSettingsPage
  └── Card
      ├── CardHeader (Title)
      ├── CardContent
      │   ├── Form
      │   │   ├── Label + Select (Printer dropdown)
      │   │   ├── Checkbox (PDF mode toggle)
      │   │   └── Button (Print test)
      └── CardFooter (Status messages)
```

### 6. Error Handling and Feedback

**Decision:** Menggunakan Sonner toast untuk notifikasi

**Rationale:**

- Sudah digunakan di project (lihat project.md)
- Non-blocking feedback
- Support success/error states
- Simple API

**Error scenarios:**

- Printer tidak ditemukan: "Printer tidak tersedia"
- Print gagal: "Gagal mencetak, periksa koneksi printer"
- Config gagal disimpan: "Gagal menyimpan konfigurasi"
- Sukses: "Konfigurasi tersimpan", "Test print berhasil"

## Data Models

### PrinterConfig Interface

```typescript
interface PrinterConfig {
  printerName?: string; // Nama printer yang dipilih
  usePDF?: boolean; // Flag untuk PDF mode
  lastUpdated?: string; // Timestamp ISO 8601
}

interface Printer {
  name: string; // Nama printer
  description?: string; // Deskripsi printer
  status?: string; // Status: 'idle', 'offline', dll
  isDefault?: boolean; // Apakah printer default
}
```

### Storage Schema (electron-store)

```json
{
  "printerConfig": {
    "printerName": "EPSON TM-T20II",
    "usePDF": false,
    "lastUpdated": "2026-01-12T03:30:00.000Z"
  }
}
```

## Risks / Trade-offs

### Risk 1: Printer API tidak tersedia di semua OS

**Risk:** `webContents.getPrinters()` mungkin tidak tersedia atau berperilaku berbeda di non-Windows OS

**Mitigation:**

- Project saat ini hanya menargetkan Windows 10/11
- Tambahkan error handling untuk kasus API tidak tersedia
- Log error untuk debugging

### Risk 2: Printer tidak merespons saat test print

**Risk:** User mungkin memilih printer yang offline atau tidak tersambung

**Mitigation:**

- Tampilkan status printer jika tersedia dari API
- Berikan feedback error yang jelas
- Sediakan mode PDF sebagai fallback

### Risk 3: Config file corruption

**Risk:** File config mungkin corrupt jika aplikasi crash saat menyimpan

**Mitigation:**

- electron-store memiliki atomic write
- Tambahkan default config jika file corrupt
- Validasi config saat load

### Trade-off 1: electron-store vs manual fs

**Trade-off:** electron-store lebih simple tapi menambah dependency; manual fs lebih control tapi lebih verbose

**Decision:** electron-store (prioritize simplicity)

### Trade-off 2: Auto-save vs manual save button

**Trade-off:** Auto-save lebih UX-friendly tapi mungkin menyimpan config yang belum valid; manual save lebih kontrol tapi extra click

**Decision:** Auto-save dengan validation (prioritize UX)

## Migration Plan

**Phase 1: Initial Setup**

1. Install electron-store dependency
2. Create IPC handlers in main process
3. Add context bridge in preload
4. Create TypeScript types

**Phase 2: UI Implementation**

1. Create PrinterSettings component
2. Implement printer detection on mount
3. Implement form with auto-save
4. Add print test functionality

**Phase 3: Testing**

1. Test with physical printer
2. Test PDF mode
3. Test config persistence
4. Test error scenarios

**Rollback:**

- Jika ada masalah, hapus IPC handlers dan PrinterSettings component
- Config file tidak mempengaruhi core functionality

## Open Questions

1. **Apakah perlu menyimpan multiple printer profiles?**

   - Saat ini hanya single printer config
   - Future: support multiple profiles untuk berbagai jenis receipt

2. **Apakah perlu custom paper size settings?**

   - Saat ini gunakan default printer settings
   - Future: tambahkan opsi untuk 58mm, 80mm, dll

3. **Apakah perlu encoding settings untuk karakter khusus?**

   - Saat ini asumsikan UTF-8 compatible
   - Future: tambahkan opsi encoding untuk thermal printer

4. **Apakah perlu print preview sebelum print?**
   - Saat ini langsung print tanpa preview
   - Future: tambahkan preview dialog untuk user approval

## Implementation Notes

- Pastikan IPC handlers di-register sebelum window dibuat
- Gunakan error boundaries di React component
- Validasi config sebelum save (printer name harus ada di list detected printers)
- Tambahkan loading state saat fetching printers
- Disable dropdown saat PDF mode aktif
- Gunakan timestamp yang unik untuk nama file PDF test
