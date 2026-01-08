#!/usr/bin/env node
/* eslint-env node */

import { Umzug } from "umzug";
import path from "path";
import fs from "fs";
import os from "os";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const BetterSqlite3 = require("better-sqlite3");

/**
 * Get database path (same logic as Electron app)
 */
function getDatabasePath() {
  const platform = os.platform();
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
 * Get migrations path - use compiled JS files from dist-electron
 */
function getMigrationsPath() {
  return path.join(process.cwd(), "dist-electron", "migrations");
}

/**
 * Custom storage adapter for Umzug using better-sqlite3
 */
class BetterSqlite3Storage {
  constructor(db, tableName = "schema_migrations") {
    this.db = db;
    this.tableName = tableName;
    this.ensureTable();
  }

  ensureTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        name TEXT PRIMARY KEY,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async logMigration(params) {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO ${this.tableName} (name) VALUES (?)`
    );
    stmt.run(params.name);
  }

  async unlogMigration(params) {
    const stmt = this.db.prepare(
      `DELETE FROM ${this.tableName} WHERE name = ?`
    );
    stmt.run(params.name);
  }

  async executed() {
    const stmt = this.db.prepare(
      `SELECT name FROM ${this.tableName} ORDER BY name`
    );
    const rows = stmt.all();
    return rows.map((row) => row.name);
  }
}

/**
 * Create Umzug instance
 */
function createMigrator(db) {
  const migrationsPath = getMigrationsPath();

  return new Umzug({
    migrations: {
      glob: ["*_*.js", { cwd: migrationsPath }],
      resolve: ({ name, path: migrationPath, context }) => {
        const migration = require(migrationPath);
        return {
          name,
          up: async () => migration.up(context),
          down: async () => migration.down(context),
        };
      },
    },
    context: { db },
    storage: new BetterSqlite3Storage(db),
    logger: console,
  });
}

async function main() {
  const dbPath = getDatabasePath();
  console.log(`🚀 Running pending migrations...`);
  console.log(`Database path: ${dbPath}`);

  // Ensure directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new BetterSqlite3(dbPath);

  // Enable foreign keys and WAL mode
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");

  try {
    console.log(`✅ Database connection established`);

    const umzug = createMigrator(db);
    const pending = await umzug.pending();

    if (pending.length === 0) {
      console.log("No pending migrations found");
    } else {
      console.log(`Found ${pending.length} pending migrations`);
      await umzug.up();
      console.log("✅ All migrations completed successfully");
    }
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
