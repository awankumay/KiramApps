/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Migration: alter_add_is_active
 * Created: 2026-01-08
 *
 * Adds is_active column to transaction_types and payment_methods tables
 */
/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.up = async function ({ db }: any) {
  console.log("[Migration 20260108082106] Starting migration...");

  // Log foreign keys status
  const fkStatus = db.pragma("foreign_keys", { simple: true });
  console.log("[Migration 20260108082106] Foreign keys status:", fkStatus);

  // Check if child tables exist and have data
  try {
    const paymentsCount = db
      .prepare("SELECT COUNT(*) as count FROM payments")
      .get() as { count: number };
    console.log(
      "[Migration 20260108082106] Payments table exists with",
      paymentsCount.count,
      "rows"
    );
  } catch (e) {
    console.log(
      "[Migration 20260108082106] Payments table does not exist or error:",
      (e as Error).message
    );
  }

  try {
    const transactionsCount = db
      .prepare("SELECT COUNT(*) as count FROM transactions")
      .get() as { count: number };
    console.log(
      "[Migration 20260108082106] Transactions table exists with",
      transactionsCount.count,
      "rows"
    );
  } catch (e) {
    console.log(
      "[Migration 20260108082106] Transactions table does not exist or error:",
      (e as Error).message
    );
  }

  // Check parent tables
  try {
    const paymentMethodsCount = db
      .prepare("SELECT COUNT(*) as count FROM payment_methods")
      .get() as { count: number };
    console.log(
      "[Migration 20260108082106] payment_methods has",
      paymentMethodsCount.count,
      "rows"
    );
  } catch (e) {
    console.log(
      "[Migration 20260108082106] payment_methods error:",
      (e as Error).message
    );
  }

  try {
    const transactionTypesCount = db
      .prepare("SELECT COUNT(*) as count FROM transaction_types")
      .get() as { count: number };
    console.log(
      "[Migration 20260108082106] transaction_types has",
      transactionTypesCount.count,
      "rows"
    );
  } catch (e) {
    console.log(
      "[Migration 20260108082106] transaction_types error:",
      (e as Error).message
    );
  }

  // Create payment_methods_new with is_active column
  console.log("[Migration 20260108082106] Creating payment_methods_new...");
  db.exec(`
    CREATE TABLE payment_methods_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log(
    "[Migration 20260108082106] payment_methods_new created successfully"
  );

  // Insert existing data into payment_methods_new
  console.log(
    "[Migration 20260108082106] Inserting data into payment_methods_new..."
  );
  db.exec(`
    INSERT INTO payment_methods_new (id, name, is_active, created_at)
    SELECT id, name, 1, created_at FROM payment_methods;
  `);
  console.log(
    "[Migration 20260108082106] Data inserted into payment_methods_new"
  );

  // Disable foreign keys temporarily to allow dropping payment_methods table
  const previousFkStatus = db.pragma("foreign_keys", { simple: true });
  console.log(
    "[Migration 20260108082106] Current foreign_keys status:",
    previousFkStatus
  );
  db.pragma("foreign_keys = OFF");
  console.log("[Migration 20260108082106] Foreign keys disabled temporarily");

  // Remove old payment_methods table
  console.log(
    "[Migration 20260108082106] Dropping old payment_methods table..."
  );
  try {
    db.exec(`DROP TABLE payment_methods;`);
    console.log(
      "[Migration 20260108082106] Old payment_methods dropped successfully"
    );
  } catch (e) {
    console.error(
      "[Migration 20260108082106] ERROR dropping payment_methods:",
      (e as Error).message
    );
    throw e;
  }

  // Rename new table to payment_methods
  console.log(
    "[Migration 20260108082106] Renaming payment_methods_new to payment_methods..."
  );
  db.exec(`ALTER TABLE payment_methods_new RENAME TO payment_methods;`);
  console.log(
    "[Migration 20260108082106] payment_methods renamed successfully"
  );

  // Restore foreign keys status
  if (previousFkStatus) {
    db.pragma("foreign_keys = ON");
    console.log("[Migration 20260108082106] Foreign keys restored");
  }

  // Create transaction_types_new with is_active column
  console.log("[Migration 20260108082106] Creating transaction_types_new...");
  db.exec(`
    CREATE TABLE transaction_types_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log(
    "[Migration 20260108082106] transaction_types_new created successfully"
  );

  // Insert existing data into transaction_types_new
  console.log(
    "[Migration 20260108082106] Inserting data into transaction_types_new..."
  );
  db.exec(`
    INSERT INTO transaction_types_new (id, name, is_active, created_at)
    SELECT id, name, 1, created_at FROM transaction_types;
  `);
  console.log(
    "[Migration 20260108082106] Data inserted into transaction_types_new"
  );

  // Disable foreign keys temporarily to allow dropping transaction_types table
  const previousFkStatus2 = db.pragma("foreign_keys", { simple: true });
  console.log(
    "[Migration 20260108082106] Current foreign_keys status:",
    previousFkStatus2
  );
  db.pragma("foreign_keys = OFF");
  console.log("[Migration 20260108082106] Foreign keys disabled temporarily");

  // Remove old transaction_types table
  console.log(
    "[Migration 20260108082106] Dropping old transaction_types table..."
  );
  try {
    db.exec(`DROP TABLE transaction_types;`);
    console.log(
      "[Migration 20260108082106] Old transaction_types dropped successfully"
    );
  } catch (e) {
    console.error(
      "[Migration 20260108082106] ERROR dropping transaction_types:",
      (e as Error).message
    );
    throw e;
  }

  // Rename new table to transaction_types
  console.log(
    "[Migration 20260108082106] Renaming transaction_types_new to transaction_types..."
  );
  db.exec(`ALTER TABLE transaction_types_new RENAME TO transaction_types;`);
  console.log(
    "[Migration 20260108082106] transaction_types renamed successfully"
  );

  // Restore foreign keys status
  if (previousFkStatus2) {
    db.pragma("foreign_keys = ON");
    console.log("[Migration 20260108082106] Foreign keys restored");
  }

  console.log("[Migration 20260108082106] Migration completed successfully!");
};

/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.down = async function ({ db }: any) {
  // SQLite doesn't support ALTER TABLE DROP COLUMN directly
  // We need to recreate the table without the is_active column

  // Recreate payment_methods without is_active
  db.exec(`
    CREATE TABLE payment_methods_old (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
    INSERT INTO payment_methods_old (id, name, created_at)
    SELECT id, name, created_at FROM payment_methods;
  `);

  // Disable foreign keys temporarily to allow dropping payment_methods table
  const previousFkStatus = db.pragma("foreign_keys", { simple: true });
  db.pragma("foreign_keys = OFF");

  db.exec(`DROP TABLE payment_methods;`);

  db.exec(`ALTER TABLE payment_methods_old RENAME TO payment_methods;`);

  // Restore foreign keys status
  if (previousFkStatus) {
    db.pragma("foreign_keys = ON");
  }

  // Recreate transaction_types without is_active
  db.exec(`
    CREATE TABLE transaction_types_old (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
    INSERT INTO transaction_types_old (id, name, created_at)
    SELECT id, name, created_at FROM transaction_types;
  `);

  // Disable foreign keys temporarily to allow dropping transaction_types table
  const previousFkStatus2 = db.pragma("foreign_keys", { simple: true });
  db.pragma("foreign_keys = OFF");

  db.exec(`DROP TABLE transaction_types;`);

  db.exec(`ALTER TABLE transaction_types_old RENAME TO transaction_types;`);

  // Restore foreign keys status
  if (previousFkStatus2) {
    db.pragma("foreign_keys = ON");
  }
};
