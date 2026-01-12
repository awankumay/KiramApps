/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Migration: Add App Settings Table
 * Created: 2026-01-10
 *
 * Creates the app_settings table for storing application configuration
 * including ERP Cloud endpoint and sync settings.
 */

/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.up = async function ({ db }: any) {
  // Create app_settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      type TEXT DEFAULT 'string',
      category TEXT DEFAULT 'general',
      description TEXT,
      is_encrypted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for fast lookup
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_app_settings_category ON app_settings(category)`
  );

  console.log("[Migration] Created app_settings table");
};

/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.down = async function ({ db }: any) {
  db.exec(`DROP INDEX IF EXISTS idx_app_settings_category`);
  db.exec(`DROP INDEX IF EXISTS idx_app_settings_key`);
  db.exec(`DROP TABLE IF EXISTS app_settings`);

  console.log("[Migration] Dropped app_settings table");
};
