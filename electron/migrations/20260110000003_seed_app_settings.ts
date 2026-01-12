/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Migration: Seed App Settings
 * Created: 2026-01-10
 *
 * Seeds initial application settings for ERP Cloud configuration
 * and sync behavior.
 */

/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.up = async function ({ db }: any) {
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO app_settings (key, value, type, category, description)
    VALUES (?, ?, ?, ?, ?)
  `);

  const settings = [
    // ERP Cloud Configuration
    [
      "erp_api_url",
      "http://localhost:8000/api",
      "string",
      "sync",
      "ERP Cloud API Base URL",
    ],
    ["sync_enabled", "1", "boolean", "sync", "Enable/disable auto sync"],
    [
      "sync_interval_minutes",
      "10",
      "number",
      "sync",
      "Auto sync interval in minutes",
    ],
    ["sync_on_startup", "1", "boolean", "sync", "Sync on application startup"],
    [
      "sync_batch_size",
      "50",
      "number",
      "sync",
      "Maximum records per sync batch",
    ],
    [
      "sync_retry_max",
      "5",
      "number",
      "sync",
      "Maximum retry attempts for failed syncs",
    ],
    [
      "sync_timeout_seconds",
      "30",
      "number",
      "sync",
      "Timeout for sync API calls in seconds",
    ],

    // Application Settings
    ["app_name", "KiramApps", "string", "general", "Application display name"],
    ["app_version", "1.0.0", "string", "general", "Application version"],
  ];

  const insertMany = db.transaction(() => {
    for (const setting of settings) {
      insertStmt.run(...setting);
    }
  });

  insertMany();

  console.log("[Migration] Seeded app_settings with initial values");
};

/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.down = async function ({ db }: any) {
  const deleteStmt = db.prepare(`DELETE FROM app_settings WHERE key = ?`);

  const keys = [
    "erp_api_url",
    "sync_enabled",
    "sync_interval_minutes",
    "sync_on_startup",
    "sync_batch_size",
    "sync_retry_max",
    "sync_timeout_seconds",
    "app_name",
    "app_version",
  ];

  const deleteMany = db.transaction(() => {
    for (const key of keys) {
      deleteStmt.run(key);
    }
  });

  deleteMany();

  console.log("[Migration] Removed seeded app_settings");
};
