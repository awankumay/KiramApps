/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Migration: add_sync_columns_to_tables
 * Created: 2026-01-10
 *
 * Add synced_at and updated_at columns to tables for sync tracking
 */

/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.up = async function ({ db }: any) {
  // Helper function to check if column exists
  const columnExists = (tableName: string, columnName: string): boolean => {
    const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
    return tableInfo.some((col: any) => col.name === columnName);
  };

  // Add synced_at column to customers table if not exists
  if (!columnExists("customers", "synced_at")) {
    db.exec(`ALTER TABLE customers ADD COLUMN synced_at TEXT;`);
  }

  // Add updated_at column to customers table if not exists
  if (!columnExists("customers", "updated_at")) {
    db.exec(`ALTER TABLE customers ADD COLUMN updated_at TEXT;`);
  }

  // Add synced_at column to payments table if not exists
  if (!columnExists("payments", "synced_at")) {
    db.exec(`ALTER TABLE payments ADD COLUMN synced_at TEXT;`);
  }

  // Add synced_at column to transactions table if not exists
  if (!columnExists("transactions", "synced_at")) {
    db.exec(`ALTER TABLE transactions ADD COLUMN synced_at TEXT;`);
  }

  // Add synced_at column to loaders table if not exists
  if (!columnExists("loaders", "synced_at")) {
    db.exec(`ALTER TABLE loaders ADD COLUMN synced_at TEXT;`);
  }
};

/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.down = async function () {
  // SQLite doesn't support DROP COLUMN directly in older versions
  // We'll leave the columns as they don't affect functionality
  console.log(
    "Note: synced_at columns will remain in tables (SQLite limitation)"
  );
};
