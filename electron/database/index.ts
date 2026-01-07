import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import type { Database } from "better-sqlite3";
import { MigrationRunner } from "./migrator";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const BetterSqlite3 = require("better-sqlite3");

// Re-export types
export { MigrationRunner } from "./migrator";
export type { MigrationContext } from "./migrator";
export {
  getDatabase,
  closeDatabase,
  getDatabasePath,
  createDatabase,
} from "./sequelize";

/**
 * Get database path for CLI scripts (outside Electron context)
 */
export function getCliDatabasePath(): string {
  const platform = os.platform();
  let appDataPath: string;

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
 * Create database instance for CLI scripts
 */
export function createCliDatabase(): Database {
  const dbPath = getCliDatabasePath();

  // Ensure directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new BetterSqlite3(dbPath);

  // Enable foreign keys and WAL mode
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");

  return db;
}

/**
 * Get migrations path
 */
export function getMigrationsPath(): string {
  // In production (built app), migrations are in dist-electron/migrations
  // In development, they are in electron/migrations
  const devPath = path.join(process.cwd(), "electron", "migrations");
  const prodPath = path.join(process.cwd(), "dist-electron", "migrations");

  if (fs.existsSync(prodPath)) {
    return prodPath;
  }
  return devPath;
}

/**
 * Run all pending migrations
 */
export async function runMigrations(db: Database): Promise<void> {
  const migrationsPath = getMigrationsPath();
  const migrationRunner = new MigrationRunner(db, migrationsPath);

  await migrationRunner.runPendingMigrations();
}

/**
 * Get migration status
 */
export async function getMigrationStatus(
  db: Database
): Promise<{ applied: string[]; pending: string[] }> {
  const migrationsPath = getMigrationsPath();
  const migrationRunner = new MigrationRunner(db, migrationsPath);

  return migrationRunner.getMigrationStatus();
}
