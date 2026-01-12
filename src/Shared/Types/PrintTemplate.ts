/**
 * Print Template System Types
 * Defines interfaces for template-based printing
 */

// Template Types
export type TemplateType = "receipt" | "surat-kirim";
export type PaperSize =
  | "80mm"
  | "A4"
  | "A5"
  | "A4 portrait"
  | "A4 landscape"
  | "A5 portrait"
  | "A5 landscape"
  | "Letter"
  | "Letter portrait"
  | "Letter landscape"
  | "Legal"
  | "Legal portrait"
  | "Legal landscape";

// Base Template Interface
export interface Template<TData = TemplateData> {
  id: TemplateType;
  name: string;
  description: string;
  paperSize: PaperSize;
  generate: (data: TData) => string;
}

// Generic Template Data
export type TemplateData = Record<string, unknown>;

// Receipt Template Data
export interface ReceiptData {
  // Transaction Info
  transactionNumber: string;
  date: string;
  time: string;

  // Store Info
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;

  // Customer Info
  customerName?: string;
  vehiclePlate?: string;

  // Items
  items: ReceiptItem[];

  // Payment Summary
  subtotal: number;
  tax?: number;
  total: number;
  paymentMethod: string;
  amountPaid: number;
  change: number;

  // Footer
  cashierName?: string;
  notes?: string;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

// Surat Kirim Template Data
export interface SuratKirimData {
  // Header Info
  companyName?: string;

  // Truck & Destination
  truckName: string;
  destination: string;

  // Materials
  materials: SuratKirimMaterial[];

  // Footer
  date: string;
  driverName?: string;
  supervisorName?: string;
}

export interface SuratKirimMaterial {
  no: number;
  jenisMaterial: string;
  jumlah: string;
  keterangan?: string;
}

// Print Result
export interface PrintResult {
  success: boolean;
  message?: string;
  filePath?: string; // For PDF mode
}

// Template Preview Options
export interface TemplatePreviewOptions {
  templateId: TemplateType;
  data: TemplateData;
  zoom?: number;
}
