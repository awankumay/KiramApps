import type { MigrationContext } from "../database/migrator";

/**
 * Migration: Add Transaction Tables
 * Created: 2026-01-07
 *
 * Adds tables for transaction management including:
 * - transaction_types: Reference table for transaction types
 * - payment_methods: Reference table for payment methods
 * - transactions: Main transaction table
 * - transaction_items: Items in each transaction
 * - payments: Payment records for transactions
 * - transaction_status_logs: Status change history
 */
export async function up({ db }: MigrationContext): Promise<void> {
  // Create transaction_types table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transaction_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create payment_methods table
  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_methods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create transactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      transaction_type_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      vehicle_id INTEGER NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK(payment_status IN ('UNPAID', 'PAID')),
      transaction_status TEXT NOT NULL DEFAULT 'CREATED' CHECK(transaction_status IN ('CREATED', 'QUEUED', 'LOADING', 'DONE', 'CHECKED_OUT')),
      created_by INTEGER NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_type_id) REFERENCES transaction_types(id) ON DELETE RESTRICT,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
    )
  `);

  // Create transaction_items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transaction_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      qty INTEGER NOT NULL CHECK(qty > 0),
      price REAL NOT NULL CHECK(price >= 0),
      subtotal REAL NOT NULL CHECK(subtotal >= 0),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT
    )
  `);

  // Create payments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      payment_method_id INTEGER NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      status TEXT NOT NULL DEFAULT 'PAID' CHECK(status IN ('PENDING', 'PAID')),
      paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      verified_by INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT,
      FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Create transaction_status_logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transaction_status_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('CREATED', 'QUEUED', 'LOADING', 'DONE', 'CHECKED_OUT')),
      changed_by INTEGER NOT NULL,
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      note TEXT,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT
    )
  `);

  // Create indexes for performance
  // Transaction indexes
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_transactions_invoice_number ON transactions(invoice_number)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_transactions_vehicle_id ON transactions(vehicle_id)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_transactions_transaction_type_id ON transactions(transaction_type_id)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_transactions_payment_status ON transactions(payment_status)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_transactions_transaction_status ON transactions(transaction_status)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON transactions(created_by)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)`
  );

  // Transaction items indexes
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON transaction_items(transaction_id)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_transaction_items_item_id ON transaction_items(item_id)`
  );

  // Payments indexes
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_payments_payment_method_id ON payments(payment_method_id)`
  );
  db.exec(`CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)`);
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at)`
  );

  // Transaction status logs indexes
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_transaction_status_logs_transaction_id ON transaction_status_logs(transaction_id)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_transaction_status_logs_changed_by ON transaction_status_logs(changed_by)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_transaction_status_logs_changed_at ON transaction_status_logs(changed_at)`
  );
}

export async function down({ db }: MigrationContext): Promise<void> {
  // Drop tables in reverse order (due to foreign key constraints)
  db.exec(`DROP TABLE IF EXISTS transaction_status_logs`);
  db.exec(`DROP TABLE IF EXISTS payments`);
  db.exec(`DROP TABLE IF EXISTS transaction_items`);
  db.exec(`DROP TABLE IF EXISTS transactions`);
  db.exec(`DROP TABLE IF EXISTS payment_methods`);
  db.exec(`DROP TABLE IF EXISTS transaction_types`);
}
