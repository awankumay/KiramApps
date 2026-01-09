#!/usr/bin/env node
/* eslint-env node */

const { Umzug } = require("umzug");
const path = require("path");
const fs = require("fs");
const os = require("os");
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
    logger: undefined, // Disable default logging for status check
  });
}

async function main() {
  const dbPath = getDatabasePath();
  console.log(`\n📊 Migration Status`);
  console.log(`==================`);
  console.log(`Database: ${dbPath}`);

  if (!fs.existsSync(dbPath)) {
    console.log(`\n❌ Database file does not exist`);
    console.log(
      `Run "npm run migration:run" to create database and run migrations\n`
    );
    return;
  }

  const db = new BetterSqlite3(dbPath);

  // Enable foreign keys
  db.pragma("foreign_keys = ON");

  try {
    const umzug = createMigrator(db);
    const executed = await umzug.executed();
    const pending = await umzug.pending();

    if (executed.length === 0) {
      console.log(`\n❌ No migrations have been applied`);
    } else {
      console.log(`\n✅ Applied migrations (${executed.length}):`);
      executed.forEach((m) => {
        console.log(`   - ${m.name}`);
      });
    }

    if (pending.length === 0) {
      console.log(`✅ No pending migrations`);
    } else {
      console.log(`\n⏳ Pending migrations (${pending.length}):`);
      pending.forEach((m) => {
        console.log(`   - ${m.name}`);
      });
    }

    console.log("");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
