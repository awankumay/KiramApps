#!/usr/bin/env node

/* eslint-disable */
/**
 * Script untuk melakukan query ke tabel transactions
 * Usage: node scripts/query-transactions.js [query-type]
 *
 * Query types:
 * - all: Semua transaksi
 * - today: Transaksi hari ini
 * - unpaid: Transaksi yang belum lunas
 * - paid: Transaksi yang sudah lunas
 * - by-status: Filter berdasarkan status transaksi
 * - by-customer: Filter berdasarkan customer
 * - search: Cari transaksi
 * - stats: Statistik hari ini
 */

const path = require("path");
const fs = require("fs");
const os = require("os");

// Import better-sqlite3
const Database = require("better-sqlite3");

/**
 * Get database path
 */
function getDatabasePath() {
  const platform = process.platform;
  let appDataPath;

  if (platform === "win32") {
    appDataPath =
      process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  } else if (platform === "darwin") {
    appDataPath = path.join(os.homedir(), "Library", "Application Support");
  } else {
    appDataPath = path.join(os.homedir(), ".config");
  }

  const dbDir = path.join(appDataPath, "kiram-site");

  // Ensure directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  return path.join(dbDir, "app-data.db");
}

/**
 * Create database connection
 */
function createDatabase() {
  const dbPath = getDatabasePath();

  if (!fs.existsSync(dbPath)) {
    console.error(`Database tidak ditemukan: ${dbPath}`);
    console.error(
      "Pastikan aplikasi sudah dijalankan minimal sekali untuk membuat database."
    );
    process.exit(1);
  }

  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");

  return db;
}

/**
 * Format currency
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Query semua transaksi
 */
function queryAllTransactions(db, limit = 20) {
  const query = `
    SELECT 
      t.id,
      t.invoice_number as invoiceNumber,
      tt.name as transactionTypeName,
      c.name as customerName,
      v.plate_number as vehiclePlate,
      t.total_amount as totalAmount,
      t.payment_status as paymentStatus,
      t.transaction_status as transactionStatus,
      u.first_name || ' ' || u.last_name as createdByName,
      t.created_at as createdAt
    FROM transactions t
    LEFT JOIN transaction_types tt ON t.transaction_type_id = tt.id
    LEFT JOIN customers c ON t.customer_id = c.id
    LEFT JOIN vehicles v ON t.vehicle_id = v.id
    LEFT JOIN users u ON t.created_by = u.id
    ORDER BY t.created_at DESC
    LIMIT ?
  `;

  const transactions = db.prepare(query).all(limit);

  console.log("\n=== SEMUA TRANSAKSI ===");
  console.log(`Total: ${transactions.length} transaksi\n`);

  transactions.forEach((t) => {
    console.log(`ID: ${t.id}`);
    console.log(`Invoice: ${t.invoiceNumber}`);
    console.log(`Tipe: ${t.transactionTypeName}`);
    console.log(`Customer: ${t.customerName}`);
    console.log(`Kendaraan: ${t.vehiclePlate}`);
    console.log(`Total: ${formatCurrency(t.totalAmount)}`);
    console.log(`Status Pembayaran: ${t.paymentStatus}`);
    console.log(`Status Transaksi: ${t.transactionStatus}`);
    console.log(`Dibuat oleh: ${t.createdByName}`);
    console.log(`Tanggal: ${formatDate(t.createdAt)}`);
    console.log("---");
  });
}

/**
 * Query transaksi hari ini
 */
function queryTodayTransactions(db) {
  const today = new Date().toISOString().slice(0, 10);

  const query = `
    SELECT 
      t.id,
      t.invoice_number as invoiceNumber,
      tt.name as transactionTypeName,
      c.name as customerName,
      v.plate_number as vehiclePlate,
      t.total_amount as totalAmount,
      t.payment_status as paymentStatus,
      t.transaction_status as transactionStatus,
      u.first_name || ' ' || u.last_name as createdByName,
      t.created_at as createdAt
    FROM transactions t
    LEFT JOIN transaction_types tt ON t.transaction_type_id = tt.id
    LEFT JOIN customers c ON t.customer_id = c.id
    LEFT JOIN vehicles v ON t.vehicle_id = v.id
    LEFT JOIN users u ON t.created_by = u.id
    WHERE DATE(t.created_at) = ?
    ORDER BY t.created_at DESC
  `;

  const transactions = db.prepare(query).all(today);

  console.log(`\n=== TRANSAKSI HARI INI (${today}) ===`);
  console.log(`Total: ${transactions.length} transaksi\n`);

  transactions.forEach((t) => {
    console.log(`ID: ${t.id} | Invoice: ${t.invoiceNumber}`);
    console.log(`  Customer: ${t.customerName} | Kendaraan: ${t.vehiclePlate}`);
    console.log(`  Total: ${formatCurrency(t.totalAmount)}`);
    console.log(`  Status: ${t.paymentStatus} | ${t.transactionStatus}`);
    console.log("---");
  });
}

/**
 * Query transaksi berdasarkan status pembayaran
 */
function queryByPaymentStatus(db, status) {
  const query = `
    SELECT 
      t.id,
      t.invoice_number as invoiceNumber,
      tt.name as transactionTypeName,
      c.name as customerName,
      v.plate_number as vehiclePlate,
      t.total_amount as totalAmount,
      t.payment_status as paymentStatus,
      t.transaction_status as transactionStatus,
      u.first_name || ' ' || u.last_name as createdByName,
      t.created_at as createdAt
    FROM transactions t
    LEFT JOIN transaction_types tt ON t.transaction_type_id = tt.id
    LEFT JOIN customers c ON t.customer_id = c.id
    LEFT JOIN vehicles v ON t.vehicle_id = v.id
    LEFT JOIN users u ON t.created_by = u.id
    WHERE t.payment_status = ?
    ORDER BY t.created_at DESC
  `;

  const transactions = db.prepare(query).all(status.toUpperCase());

  console.log(`\n=== TRANSAKSI ${status.toUpperCase()} ===`);
  console.log(`Total: ${transactions.length} transaksi\n`);

  transactions.forEach((t) => {
    console.log(`ID: ${t.id} | Invoice: ${t.invoiceNumber}`);
    console.log(`  Customer: ${t.customerName} | Kendaraan: ${t.vehiclePlate}`);
    console.log(`  Total: ${formatCurrency(t.totalAmount)}`);
    console.log(`  Status Transaksi: ${t.transactionStatus}`);
    console.log(`  Tanggal: ${formatDate(t.createdAt)}`);
    console.log("---");
  });
}

/**
 * Query transaksi berdasarkan status transaksi
 */
function queryByTransactionStatus(db, status) {
  const query = `
    SELECT 
      t.id,
      t.invoice_number as invoiceNumber,
      tt.name as transactionTypeName,
      c.name as customerName,
      v.plate_number as vehiclePlate,
      t.total_amount as totalAmount,
      t.payment_status as paymentStatus,
      t.transaction_status as transactionStatus,
      u.first_name || ' ' || u.last_name as createdByName,
      t.created_at as createdAt
    FROM transactions t
    LEFT JOIN transaction_types tt ON t.transaction_type_id = tt.id
    LEFT JOIN customers c ON t.customer_id = c.id
    LEFT JOIN vehicles v ON t.vehicle_id = v.id
    LEFT JOIN users u ON t.created_by = u.id
    WHERE t.transaction_status = ?
    ORDER BY t.created_at DESC
  `;

  const transactions = db.prepare(query).all(status.toUpperCase());

  console.log(`\n=== TRANSAKSI STATUS ${status.toUpperCase()} ===`);
  console.log(`Total: ${transactions.length} transaksi\n`);

  transactions.forEach((t) => {
    console.log(`ID: ${t.id} | Invoice: ${t.invoiceNumber}`);
    console.log(`  Customer: ${t.customerName} | Kendaraan: ${t.vehiclePlate}`);
    console.log(
      `  Total: ${formatCurrency(t.totalAmount)} | Pembayaran: ${
        t.paymentStatus
      }`
    );
    console.log(`  Tanggal: ${formatDate(t.createdAt)}`);
    console.log("---");
  });
}

/**
 * Query transaksi berdasarkan customer
 */
function queryByCustomer(db, customerName) {
  const query = `
    SELECT 
      t.id,
      t.invoice_number as invoiceNumber,
      tt.name as transactionTypeName,
      c.name as customerName,
      v.plate_number as vehiclePlate,
      t.total_amount as totalAmount,
      t.payment_status as paymentStatus,
      t.transaction_status as transactionStatus,
      u.first_name || ' ' || u.last_name as createdByName,
      t.created_at as createdAt
    FROM transactions t
    LEFT JOIN transaction_types tt ON t.transaction_type_id = tt.id
    LEFT JOIN customers c ON t.customer_id = c.id
    LEFT JOIN vehicles v ON t.vehicle_id = v.id
    LEFT JOIN users u ON t.created_by = u.id
    WHERE c.name LIKE ?
    ORDER BY t.created_at DESC
  `;

  const transactions = db.prepare(query).all(`%${customerName}%`);

  console.log(`\n=== TRANSAKSI CUSTOMER: ${customerName} ===`);
  console.log(`Total: ${transactions.length} transaksi\n`);

  transactions.forEach((t) => {
    console.log(`ID: ${t.id} | Invoice: ${t.invoiceNumber}`);
    console.log(
      `  Tipe: ${t.transactionTypeName} | Kendaraan: ${t.vehiclePlate}`
    );
    console.log(`  Total: ${formatCurrency(t.totalAmount)}`);
    console.log(`  Status: ${t.paymentStatus} | ${t.transactionStatus}`);
    console.log(`  Tanggal: ${formatDate(t.createdAt)}`);
    console.log("---");
  });
}

/**
 * Search transaksi
 */
function searchTransactions(db, searchTerm) {
  const query = `
    SELECT 
      t.id,
      t.invoice_number as invoiceNumber,
      tt.name as transactionTypeName,
      c.name as customerName,
      v.plate_number as vehiclePlate,
      t.total_amount as totalAmount,
      t.payment_status as paymentStatus,
      t.transaction_status as transactionStatus,
      u.first_name || ' ' || u.last_name as createdByName,
      t.created_at as createdAt
    FROM transactions t
    LEFT JOIN transaction_types tt ON t.transaction_type_id = tt.id
    LEFT JOIN customers c ON t.customer_id = c.id
    LEFT JOIN vehicles v ON t.vehicle_id = v.id
    LEFT JOIN users u ON t.created_by = u.id
    WHERE 
      t.invoice_number LIKE ? OR
      c.name LIKE ? OR
      v.plate_number LIKE ?
    ORDER BY t.created_at DESC
    LIMIT 50
  `;

  const pattern = `%${searchTerm}%`;
  const transactions = db.prepare(query).all(pattern, pattern, pattern);

  console.log(`\n=== HASIL PENCARIAN: "${searchTerm}" ===`);
  console.log(`Total: ${transactions.length} transaksi\n`);

  transactions.forEach((t) => {
    console.log(`ID: ${t.id} | Invoice: ${t.invoiceNumber}`);
    console.log(`  Customer: ${t.customerName} | Kendaraan: ${t.vehiclePlate}`);
    console.log(`  Total: ${formatCurrency(t.totalAmount)}`);
    console.log(`  Status: ${t.paymentStatus} | ${t.transactionStatus}`);
    console.log(`  Tanggal: ${formatDate(t.createdAt)}`);
    console.log("---");
  });
}

/**
 * Query statistik hari ini
 */
function queryTodayStats(db) {
  const today = new Date().toISOString().slice(0, 10);

  const statsQuery = `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN transaction_status = 'CREATED' THEN 1 ELSE 0 END) as created,
      SUM(CASE WHEN transaction_status = 'QUEUED' THEN 1 ELSE 0 END) as queued,
      SUM(CASE WHEN transaction_status = 'LOADING' THEN 1 ELSE 0 END) as loading,
      SUM(CASE WHEN transaction_status = 'DONE' THEN 1 ELSE 0 END) as done,
      SUM(CASE WHEN transaction_status = 'CHECKED_OUT' THEN 1 ELSE 0 END) as checkedOut,
      SUM(CASE WHEN payment_status = 'PAID' THEN 1 ELSE 0 END) as paid,
      SUM(CASE WHEN payment_status = 'UNPAID' THEN 1 ELSE 0 END) as unpaid,
      COALESCE(SUM(total_amount), 0) as totalAmount
    FROM transactions
    WHERE DATE(created_at) = ?
  `;

  const stats = db.prepare(statsQuery).get(today);

  console.log(`\n=== STATISTIK HARI INI (${today}) ===`);
  console.log(`Total Transaksi: ${stats.total}`);
  console.log(`\nStatus Transaksi:`);
  console.log(`  - Created: ${stats.created}`);
  console.log(`  - Queued: ${stats.queued}`);
  console.log(`  - Loading: ${stats.loading}`);
  console.log(`  - Done: ${stats.done}`);
  console.log(`  - Checked Out: ${stats.checkedOut}`);
  console.log(`\nStatus Pembayaran:`);
  console.log(`  - Paid: ${stats.paid}`);
  console.log(`  - Unpaid: ${stats.unpaid}`);
  console.log(`\nTotal Nilai: ${formatCurrency(stats.totalAmount)}`);
}

/**
 * Query detail transaksi dengan items
 */
function queryTransactionDetail(db, transactionId) {
  const transactionQuery = `
    SELECT 
      t.id,
      t.invoice_number as invoiceNumber,
      tt.name as transactionTypeName,
      c.name as customerName,
      v.plate_number as vehiclePlate,
      t.total_amount as totalAmount,
      t.payment_status as paymentStatus,
      t.transaction_status as transactionStatus,
      u.first_name || ' ' || u.last_name as createdByName,
      t.notes,
      t.created_at as createdAt,
      t.updated_at as updatedAt
    FROM transactions t
    LEFT JOIN transaction_types tt ON t.transaction_type_id = tt.id
    LEFT JOIN customers c ON t.customer_id = c.id
    LEFT JOIN vehicles v ON t.vehicle_id = v.id
    LEFT JOIN users u ON t.created_by = u.id
    WHERE t.id = ?
  `;

  const transaction = db.prepare(transactionQuery).get(transactionId);

  if (!transaction) {
    console.log(`\nTransaksi dengan ID ${transactionId} tidak ditemukan.`);
    return;
  }

  console.log("\n=== DETAIL TRANSAKSI ===");
  console.log(`ID: ${transaction.id}`);
  console.log(`Invoice: ${transaction.invoiceNumber}`);
  console.log(`Tipe: ${transaction.transactionTypeName}`);
  console.log(`Customer: ${transaction.customerName}`);
  console.log(`Kendaraan: ${transaction.vehiclePlate}`);
  console.log(`Total: ${formatCurrency(transaction.totalAmount)}`);
  console.log(`Status Pembayaran: ${transaction.paymentStatus}`);
  console.log(`Status Transaksi: ${transaction.transactionStatus}`);
  console.log(`Dibuat oleh: ${transaction.createdByName}`);
  console.log(`Catatan: ${transaction.notes || "-"}`);
  console.log(`Dibuat: ${formatDate(transaction.createdAt)}`);
  console.log(`Diupdate: ${formatDate(transaction.updatedAt)}`);

  // Get items
  const itemsQuery = `
    SELECT 
      ti.id,
      i.name as itemName,
      i.unit as itemUnit,
      ti.qty,
      ti.price,
      ti.subtotal
    FROM transaction_items ti
    LEFT JOIN items i ON ti.item_id = i.id
    WHERE ti.transaction_id = ?
    ORDER BY ti.id
  `;

  const items = db.prepare(itemsQuery).all(transactionId);

  console.log("\n--- ITEMS ---");
  items.forEach((item) => {
    console.log(`${item.itemName} (${item.itemUnit})`);
    console.log(
      `  Qty: ${item.qty} x ${formatCurrency(item.price)} = ${formatCurrency(
        item.subtotal
      )}`
    );
  });

  // Get payments
  const paymentsQuery = `
    SELECT 
      p.id,
      pm.name as paymentMethodName,
      p.amount,
      p.status,
      p.verification_status as verificationStatus,
      u.first_name || ' ' || u.last_name as verifiedByName,
      p.paid_at as paidAt,
      p.verified_at as verifiedAt,
      p.notes
    FROM payments p
    LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
    LEFT JOIN users u ON p.verified_by = u.id
    WHERE p.transaction_id = ?
    ORDER BY p.paid_at DESC
  `;

  const payments = db.prepare(paymentsQuery).all(transactionId);

  console.log("\n--- PEMBAYARAN ---");
  if (payments.length === 0) {
    console.log("Belum ada pembayaran");
  } else {
    payments.forEach((payment) => {
      console.log(`Metode: ${payment.paymentMethodName}`);
      console.log(`  Jumlah: ${formatCurrency(payment.amount)}`);
      console.log(
        `  Status: ${payment.status} | Verifikasi: ${payment.verificationStatus}`
      );
      if (payment.verifiedByName) {
        console.log(`  Diverifikasi oleh: ${payment.verifiedByName}`);
        console.log(`  Tanggal verifikasi: ${formatDate(payment.verifiedAt)}`);
      }
      console.log(`  Catatan: ${payment.notes || "-"}`);
      console.log("---");
    });
  }
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const queryType = args[0] || "all";
  const param = args[1];

  const db = createDatabase();

  try {
    switch (queryType) {
      case "all":
        queryAllTransactions(db, param ? parseInt(param) : 20);
        break;
      case "today":
        queryTodayTransactions(db);
        break;
      case "unpaid":
        queryByPaymentStatus(db, "UNPAID");
        break;
      case "paid":
        queryByPaymentStatus(db, "PAID");
        break;
      case "by-status":
        if (!param) {
          console.error("Error: Harap tentukan status transaksi");
          console.log(
            "Usage: node scripts/query-transactions.js by-status <STATUS>"
          );
          console.log("Status: CREATED, QUEUED, LOADING, DONE, CHECKED_OUT");
          process.exit(1);
        }
        queryByTransactionStatus(db, param);
        break;
      case "by-customer":
        if (!param) {
          console.error("Error: Harap tentukan nama customer");
          console.log(
            "Usage: node scripts/query-transactions.js by-customer <NAMA_CUSTOMER>"
          );
          process.exit(1);
        }
        queryByCustomer(db, param);
        break;
      case "search":
        if (!param) {
          console.error("Error: Harap tentukan kata kunci pencarian");
          console.log(
            "Usage: node scripts/query-transactions.js search <KATA_KUNCI>"
          );
          process.exit(1);
        }
        searchTransactions(db, param);
        break;
      case "stats":
        queryTodayStats(db);
        break;
      case "detail":
        if (!param) {
          console.error("Error: Harap tentukan ID transaksi");
          console.log(
            "Usage: node scripts/query-transactions.js detail <TRANSACTION_ID>"
          );
          process.exit(1);
        }
        queryTransactionDetail(db, parseInt(param));
        break;
      default:
        console.log("Query type tidak dikenali.");
        console.log("\nQuery types yang tersedia:");
        console.log("  all              - Semua transaksi (default 20)");
        console.log("  today            - Transaksi hari ini");
        console.log("  unpaid           - Transaksi yang belum lunas");
        console.log("  paid             - Transaksi yang sudah lunas");
        console.log("  by-status        - Filter berdasarkan status transaksi");
        console.log("  by-customer      - Filter berdasarkan customer");
        console.log("  search           - Cari transaksi");
        console.log("  stats            - Statistik hari ini");
        console.log(
          "  detail           - Detail transaksi lengkap dengan items dan payments"
        );
        console.log("\nExamples:");
        console.log("  node scripts/query-transactions.js all");
        console.log("  node scripts/query-transactions.js today");
        console.log("  node scripts/query-transactions.js unpaid");
        console.log("  node scripts/query-transactions.js by-status LOADING");
        console.log(
          '  node scripts/query-transactions.js by-customer "John Doe"'
        );
        console.log(
          '  node scripts/query-transactions.js search "INV-20260107"'
        );
        console.log("  node scripts/query-transactions.js stats");
        console.log("  node scripts/query-transactions.js detail 1");
    }
  } finally {
    db.close();
  }
}

// Run main function
main();
