# Change: Add Print Templates System

## Why

Aplikasi POS memerlukan sistem template untuk mencetak berbagai jenis dokumen dengan format yang berbeda. Saat ini hanya ada template test receipt sederhana. Diperlukan sistem template yang lebih lengkap untuk:

- **Template Receipt**: Struk transaksi penjualan untuk pelanggan
- **Template Surat Kirim**: Dokumen pengiriman barang dengan detail truck, jenis material, jumlah, dan keterangan

Sistem template ini harus:

- Fleksibel untuk menambah template baru di masa depan
- Mendukung data dinamis (transaksi, customer, user, dll)
- Dapat digunakan untuk print fisik maupun PDF
- Memiliki preview sebelum print

## What Changes

### 1. Template System Architecture

- Menambahkan `TemplateManager` untuk mengelola template
- Setiap template adalah fungsi yang menerima data dan mengembalikan HTML
- Template disimpan dalam file terpisah untuk maintainability
- Template dapat di-preview sebelum di-print

### 2. Template Receipt (Enhanced)

Template struk transaksi dengan informasi lengkap:

- Header: Nama toko, alamat, telepon
- Info transaksi: Tanggal, waktu, nomor transaksi
- Info customer: Nama customer, kendaraan (plat nomor)
- Daftar item: Nama item, jumlah, harga satuan, subtotal
- Summary: Subtotal, pajak (jika ada), total
- Info pembayaran: Metode pembayaran, jumlah bayar, kembalian
- Footer: Kasir, terima kasih, barcode/QR (opsional)

### 3. Template Surat Kirim (New)

Template dokumen pengiriman berdasarkan gambar yang diberikan:

- **Paper Size**: A5 Landscape (210mm x 148mm)
- **Margin**: None (Browser print setting: Margin = None)
- Header: "CV. KIRAMANA SURAT KIRIM"
- Info truck: Nomor/nama truck
- Info tujuan: Nama/lokasi tujuan
- Tabel item:
  - Kolom: NO, JENIS MATERIAL, JUMLAH, KETERANGAN
  - Rows untuk data pengiriman
- Footer:
  - Tanggal
  - Signature: Sopir dan Pengawas

### 4. Template Management UI

- Dropdown untuk memilih template saat print
- Preview template dengan sample data
- Option untuk customize template per user/role (future)

### 5. Integration dengan PrinterManager

- Update `PrinterManager.printTest()` untuk menerima template type
- Tambah method `PrinterManager.print(templateType, data)`
- Support untuk print dari berbagai fitur (transaction, loader, dll)

## Impact

- **Affected specs:**
  - `printer-settings` (existing - update print method)
  - `print-templates` (new capability)
  - `transaction` (akan menggunakan template receipt)
  - `loader` (akan menggunakan template surat kirim)
- **Affected code:**

  - `electron/auth/PrinterManager.ts` - Update print methods
  - `electron/auth/TemplateManager.ts` (new) - Template management
  - `electron/templates/` (new) - Template HTML files
  - `src/Features/Transaction/` - Integration untuk print receipt
  - `src/Features/Loader/` - Integration untuk print surat kirim
  - `src/Shared/Types/PrintTemplate.ts` (new) - Template types

- **Dependencies:**

  - Tidak ada dependency eksternal baru
  - Memanfaatkan API Electron yang sudah ada

- **Breaking changes:**

  - None - Backward compatible dengan test print yang ada

- **Migration:**
  - Tidak diperlukan - Fitur baru yang tidak mempengaruhi data existing

## Implementation Notes

### Phase 1: Core Template System

1. Create TemplateManager class
2. Create base template interfaces
3. Implement Receipt template (enhanced)
4. Implement Surat Kirim template

### Phase 2: Integration

1. Update PrinterManager untuk support templates
2. Add template preview functionality
3. Integrate dengan Transaction feature
4. Integrate dengan Loader feature

### Phase 3: Testing & Polish

1. Test print dengan berbagai data
2. Test di berbagai printer (thermal, laser)
3. Validate template layout dan formatting
4. Add error handling dan validation

## Future Enhancements

- Template customization via UI
- Custom logo upload
- Multi-language support
- Template versioning
- Export template as PDF without print
