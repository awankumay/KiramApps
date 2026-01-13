"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Migration: alter_add_code_customers
 * Created: 2026-01-08
 */
/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.up = async function ({ db }) {
    // SQLite doesn't support ADD COLUMN with UNIQUE constraint directly
    // We need to recreate the table with the new column
    // Create new table with code column
    db.exec(`
    CREATE TABLE customers_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('PERSONAL', 'COMPANY')),
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // Copy existing data
    db.exec(`
    INSERT INTO customers_new (id, name, category, is_active, created_at)
    SELECT id, name, category, is_active, created_at FROM customers
  `);
    // Disable foreign keys temporarily to allow dropping customers table
    const previousFkStatus = db.pragma("foreign_keys", { simple: true });
    db.pragma("foreign_keys = OFF");
    // Drop old table
    db.exec(`DROP TABLE customers`);
    // Rename new table
    db.exec(`ALTER TABLE customers_new RENAME TO customers`);
    // Restore foreign keys status
    if (previousFkStatus) {
        db.pragma("foreign_keys = ON");
    }
    // Recreate indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_customers_category ON customers(category)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active)`);
};
/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.down = async function ({ db }) {
    // SQLite doesn't support ALTER TABLE DROP COLUMN directly
    // We need to recreate the table without the code column
    // Recreate customers table without code
    db.exec(`
    CREATE TABLE customers_backup (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('PERSONAL', 'COMPANY')),
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    db.exec(`
    INSERT INTO customers_backup (id, name, category, is_active, created_at)
    SELECT id, name, category, is_active, created_at FROM customers
  `);
    // Disable foreign keys temporarily to allow dropping customers table
    const previousFkStatus = db.pragma("foreign_keys", { simple: true });
    db.pragma("foreign_keys = OFF");
    db.exec(`DROP TABLE customers`);
    db.exec(`ALTER TABLE customers_backup RENAME TO customers`);
    // Restore foreign keys status
    if (previousFkStatus) {
        db.pragma("foreign_keys = ON");
    }
    // Recreate indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_customers_category ON customers(category)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active)`);
};
