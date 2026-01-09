"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Migration: add_loaders_schema
 * Created: 2026-01-09
 */
/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.up = async function ({ db }) {
    // Add your migration logic here
    // Create loaders table as an example
    db.exec(`
    CREATE TABLE IF NOT EXISTS loaders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
};
/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.down = async function ({ db }) {
    // Add your rollback logic here
    // Drop loaders table
    db.exec(`DROP TABLE IF EXISTS loaders;`);
};
