/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Migration: Add Sync Logs Table
 * Created: 2026-01-10
 *
 * Creates the sync_logs table for tracking synchronization operations
 * between Electron app and ERP Cloud.
 */

/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.up = async function ({ db }: any) {
  // Create sync_logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sync_id TEXT UNIQUE NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      action TEXT NOT NULL,
      direction TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      payload TEXT,
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      scheduled_at DATETIME,
      started_at DATETIME,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for performance
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_id ON sync_logs(sync_id)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_sync_logs_entity ON sync_logs(entity_type, entity_id)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_sync_logs_direction ON sync_logs(direction)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at)`
  );

  console.log("[Migration] Created sync_logs table");
};

/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.down = async function ({ db }: any) {
  db.exec(`DROP INDEX IF EXISTS idx_sync_logs_created_at`);
  db.exec(`DROP INDEX IF EXISTS idx_sync_logs_direction`);
  db.exec(`DROP INDEX IF EXISTS idx_sync_logs_entity`);
  db.exec(`DROP INDEX IF EXISTS idx_sync_logs_status`);
  db.exec(`DROP INDEX IF EXISTS idx_sync_logs_sync_id`);
  db.exec(`DROP TABLE IF EXISTS sync_logs`);

  console.log("[Migration] Dropped sync_logs table");
};
