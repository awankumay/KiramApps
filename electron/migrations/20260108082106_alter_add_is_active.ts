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
  // Create payment_methods_new with is_active column
  db.exec(`
    CREATE TABLE payment_methods_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert existing data into payment_methods_new
  db.exec(`
    INSERT INTO payment_methods_new (id, name, is_active, created_at)
    SELECT id, name, 1, created_at FROM payment_methods;
  `);

  // Remove old payment_methods table
  db.exec(`DROP TABLE payment_methods;`);

  // Rename new table to payment_methods
  db.exec(`ALTER TABLE payment_methods_new RENAME TO payment_methods;`);

  // Create transaction_types_new with is_active column
  db.exec(`
    CREATE TABLE transaction_types_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert existing data into transaction_types_new
  db.exec(`
    INSERT INTO transaction_types_new (id, name, is_active, created_at)
    SELECT id, name, 1, created_at FROM transaction_types;
  `);

  // Remove old transaction_types table
  db.exec(`DROP TABLE transaction_types;`);

  // Rename new table to transaction_types
  db.exec(`ALTER TABLE transaction_types_new RENAME TO transaction_types;`);
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

  db.exec(`DROP TABLE payment_methods;`);

  db.exec(`ALTER TABLE payment_methods_old RENAME TO payment_methods;`);

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

  db.exec(`DROP TABLE transaction_types;`);

  db.exec(`ALTER TABLE transaction_types_old RENAME TO transaction_types;`);
};
