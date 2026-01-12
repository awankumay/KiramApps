import type {
  Template,
  ReceiptData,
  ReceiptItem,
} from "../../src/Shared/Types/PrintTemplate";

/**
 * Receipt Template
 * Optimized for 80mm thermal printers
 */

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(timeString: string): string {
  const date = new Date(timeString);
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function generateItemsHTML(items: ReceiptItem[]): string {
  return items
    .map(
      (item) => `
    <div class="item">
      <div class="item-name">${item.name}</div>
      <div class="item-detail">
        <span>${item.quantity} x ${formatCurrency(item.unitPrice)}</span>
        <span class="item-subtotal">${formatCurrency(item.subtotal)}</span>
      </div>
    </div>
  `
    )
    .join("");
}

function generateReceiptHTML(data: ReceiptData): string {
  const storeName = data.storeName || "KIRAM APPS POS";
  const storeAddress = data.storeAddress || "";
  const storePhone = data.storePhone || "";
  const customerName = data.customerName || "Walk-in Customer";
  const vehiclePlate = data.vehiclePlate || "-";
  const cashierName = data.cashierName || "Kasir";
  const notes = data.notes || "Terima Kasih\nAtas Kunjungan Anda";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt - ${data.transactionNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.4;
      width: 80mm;
      padding: 2mm;
    }
    
    .header {
      text-align: center;
      border-bottom: 1px dashed #000;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    
    .store-name {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 4px;
    }
    
    .store-info {
      font-size: 10px;
    }
    
    .divider {
      border-top: 1px dashed #000;
      margin: 8px 0;
    }
    
    .section {
      margin-bottom: 8px;
    }
    
    .row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    
    .label {
      font-weight: normal;
    }
    
    .item {
      margin-bottom: 6px;
    }
    
    .item-name {
      font-weight: bold;
      margin-bottom: 2px;
    }
    
    .item-detail {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
    }
    
    .item-subtotal {
      font-weight: bold;
    }
    
    .summary {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px dashed #000;
    }
    
    .total-row {
      font-size: 14px;
      font-weight: bold;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 4px 0;
      margin: 4px 0;
    }
    
    .footer {
      text-align: center;
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px dashed #000;
      font-size: 11px;
    }
    
    .notes {
      white-space: pre-line;
      margin-top: 8px;
    }
    
    @media print {
      body {
        width: 80mm;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="store-name">${storeName}</div>
    ${storeAddress ? `<div class="store-info">${storeAddress}</div>` : ""}
    ${storePhone ? `<div class="store-info">Telp: ${storePhone}</div>` : ""}
  </div>
  
  <div class="section">
    <div class="row">
      <span class="label">Tanggal:</span>
      <span>${formatDate(data.date)}</span>
    </div>
    <div class="row">
      <span class="label">Waktu:</span>
      <span>${formatTime(data.time)}</span>
    </div>
    <div class="row">
      <span class="label">No. Transaksi:</span>
      <span>${data.transactionNumber}</span>
    </div>
    <div class="row">
      <span class="label">Kasir:</span>
      <span>${cashierName}</span>
    </div>
  </div>
  
  <div class="divider"></div>
  
  <div class="section">
    <div class="row">
      <span class="label">Customer:</span>
      <span>${customerName}</span>
    </div>
    <div class="row">
      <span class="label">Kendaraan:</span>
      <span>${vehiclePlate}</span>
    </div>
  </div>
  
  <div class="divider"></div>
  
  <div class="section">
    ${generateItemsHTML(data.items)}
  </div>
  
  <div class="summary">
    <div class="row">
      <span class="label">Subtotal:</span>
      <span>${formatCurrency(data.subtotal)}</span>
    </div>
    ${
      data.tax
        ? `
    <div class="row">
      <span class="label">Pajak:</span>
      <span>${formatCurrency(data.tax)}</span>
    </div>
    `
        : ""
    }
    <div class="row total-row">
      <span>TOTAL:</span>
      <span>${formatCurrency(data.total)}</span>
    </div>
  </div>
  
  <div class="section">
    <div class="row">
      <span class="label">Bayar:</span>
      <span>${formatCurrency(data.amountPaid)}</span>
    </div>
    <div class="row">
      <span class="label">Kembalian:</span>
      <span>${formatCurrency(data.change)}</span>
    </div>
    <div class="row">
      <span class="label">Metode:</span>
      <span>${data.paymentMethod}</span>
    </div>
  </div>
  
  <div class="footer">
    <div class="notes">${notes}</div>
  </div>
</body>
</html>
  `.trim();
}

export const receiptTemplate: Template<ReceiptData> = {
  id: "receipt",
  name: "Receipt Transaksi",
  description: "Template struk transaksi untuk thermal printer 80mm",
  paperSize: "80mm",
  generate: generateReceiptHTML,
};
