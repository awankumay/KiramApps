# Design: Print Templates System

## Context

Aplikasi POS memerlukan berbagai jenis dokumen cetak:

1. **Receipt**: Untuk transaksi penjualan (thermal printer 80mm)
2. **Surat Kirim**: Untuk dokumen pengiriman barang (A5 paper)

Setiap template memiliki format dan data yang berbeda, sehingga diperlukan sistem yang fleksibel.

**Constraints:**

- Template harus bisa di-print ke thermal printer (80mm) dan printer A5
- Template harus support dynamic data dari database
- HTML-based untuk flexibilitas styling
- Harus cepat (real-time printing)

## Goals / Non-Goals

**Goals:**

- Sistem template yang extensible untuk tipe dokumen baru
- Template Receipt untuk transaksi penjualan
- Template Surat Kirim untuk loader/pengiriman
- Preview template sebelum print
- Support print fisik dan PDF

**Non-Goals:**

- WYSIWYG template editor (future)
- Cloud-based template sharing
- ESC/POS direct commands (gunakan HTML)
- Dynamic template loading dari API

## Decisions

### 1. Template Architecture

**Decision:** Function-based templates dengan HTML string generation

**Rationale:**

- Simple dan type-safe dengan TypeScript
- Tidak perlu template engine eksternal
- Easy to debug dan maintain
- Bisa di-version control dengan baik

```typescript
interface TemplateData {
  [key: string]: any;
}

interface Template {
  name: string;
  type: "receipt" | "surat-kirim";
  paperSize: "80mm" | "A4" | "A5";
  generate: (data: TemplateData) => string;
}
```

**Alternatives considered:**

- Handlebars/Mustache: Overhead untuk simple case
- React components: Kompleks untuk Electron printing
- **Selected:** Pure TypeScript functions

### 2. Template Storage

**Decision:** Template code dalam TypeScript files, bukan database

**Rationale:**

- Easy version control
- Type safety
- No runtime template compilation
- Better IDE support

Structure:

```
electron/templates/
  ├── receipt-template.ts
  ├── surat-kirim-template.ts
  └── index.ts (exports)
```

### 3. Receipt Template Structure

**Decision:** Thermal printer optimized (80mm width)

Layout:

```
================================
     KIRAM APPS POS
   Alamat Toko Lengkap
      Telp: xxx-xxx
================================
Date: DD/MM/YYYY  Time: HH:MM
No. Trx: TRX-20260112-001
Kasir: Nama Kasir
--------------------------------
Customer: Nama Customer
Kendaraan: B 1234 XYZ
--------------------------------
Item Name              Qty  Hrg
  @ Rp. 10,000
  Subtotal        Rp 100,000

Item Name 2            Qty  Hrg
  @ Rp. 20,000
  Subtotal        Rp 200,000
--------------------------------
Subtotal         Rp. 300,000
Pajak (0%)       Rp.       0
================================
TOTAL            Rp. 300,000
================================
Bayar            Rp. 300,000
Kembalian        Rp.       0
--------------------------------
Metode: Tunai
--------------------------------
   Terima Kasih
   Atas Kunjungan Anda
================================
```

### 4. Surat Kirim Template Structure

**Decision:** A5 Landscape paper format dengan table layout

**Rationale:**

- A5 Landscape (210mm x 148mm) memberikan lebar lebih untuk tabel material
- Margin: None untuk maksimalkan area cetak
- Browser Print Settings: Paper Size = A5 Landscape, Margin = None

Layout sesuai gambar:

```
CV. KIRAMANA
SURAT KIRIM

TRUCK: [Truck Name/Number]    TUJUAN: [Destination]

+----+------------------+--------+-------------+
| NO | JENIS MATERIAL   | JUMLAH | KETERANGAN  |
+----+------------------+--------+-------------+
| 1  |                  |        |             |
|    |                  |        |             |
+----+------------------+--------+-------------+
| 2  |                  |        |             |
|    |                  |        |             |
+----+------------------+--------+-------------+

TANGGAL: .........................

(..................)  (..................)
    SOPIR                 PENGAWAS
```

### 5. Data Structure

**Receipt Data:**

```typescript
interface ReceiptData {
  transaction: {
    id: string;
    date: Date;
    transactionType: string;
  };
  customer: {
    name: string;
    vehicle: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    price: number;
    subtotal: number;
  }>;
  payment: {
    subtotal: number;
    tax: number;
    total: number;
    paid: number;
    change: number;
    method: string;
  };
  cashier: string;
  store: {
    name: string;
    address: string;
    phone: string;
  };
}
```

**Surat Kirim Data:**

```typescript
interface SuratKirimData {
  truck: string;
  destination: string;
  items: Array<{
    no: number;
    material: string;
    quantity: string;
    notes: string;
  }>;
  date: Date;
  driver: string;
  supervisor: string;
}
```

### 6. Template Manager Implementation

```typescript
class TemplateManager {
  private templates: Map<string, Template>;

  constructor() {
    this.templates = new Map();
    this.registerDefaultTemplates();
  }

  registerTemplate(id: string, template: Template): void;
  getTemplate(id: string): Template | undefined;
  generateHTML(templateId: string, data: TemplateData): string;
  previewTemplate(templateId: string, sampleData: TemplateData): string;
}
```

### 7. Integration dengan PrinterManager

Update PrinterManager untuk support templates:

```typescript
class PrinterManager {
  private templateManager: TemplateManager;

  async print(
    templateId: string,
    data: TemplateData,
    config: PrinterConfig
  ): Promise<PrintTestResult>;

  async printReceipt(
    receiptData: ReceiptData,
    config: PrinterConfig
  ): Promise<PrintTestResult>;

  async printSuratKirim(
    suratKirimData: SuratKirimData,
    config: PrinterConfig
  ): Promise<PrintTestResult>;
}
```

## CSS Considerations

### Receipt (80mm thermal)

- Max width: 280px (80mm)
- Font: Courier New, monospace
- Font size: 10-12px
- No images (unless QR code)
- Black & white only

### Surat Kirim (A5 Landscape)

- Standard A5 Landscape: 210mm x 148mm
- Margins: None (using @page { margin: 0; })
- Container padding: 1cm for content spacing
- Font: Arial or similar
- Table borders: 1px solid black
- Print-friendly (black & white)
- Browser Print Setting: Margin = None

## Error Handling

1. **Missing Data**: Provide default values atau placeholder
2. **Invalid Template ID**: Return error dengan list available templates
3. **Print Failure**: Log error, show user-friendly message
4. **Large Data**: Implement pagination untuk receipt dengan banyak item

## Testing Strategy

1. **Unit Tests**: Template generation dengan berbagai data
2. **Integration Tests**: Print workflow end-to-end
3. **Manual Tests**:
   - Print ke thermal printer 80mm
   - Print ke printer A5
   - PDF generation
   - Preview functionality

## Performance Considerations

- Template generation harus < 100ms
- Cache generated HTML untuk preview
- Lazy load templates (hanya load yang dibutuhkan)
- Minimize HTML size untuk faster printing
