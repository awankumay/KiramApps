import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { fileURLToPath } from "url";
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
  // Get the directory where the compiled JS is running
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  // In packaged app with asar:
  // - Files in asar: app.asar/dist-electron/
  // - Unpacked migrations: app.asar.unpacked/dist-electron/migrations/

  // Try unpacked path first (for production packaged app)
  const unpackedPath = __dirname.replace("app.asar", "app.asar.unpacked");
  const prodUnpackedMigrationsPath = path.join(unpackedPath, "migrations");

  // Try regular path alongside compiled JS (works in dev and some prod cases)
  const prodPath = path.join(__dirname, "migrations");

  // Development paths
  const devPath = path.join(process.cwd(), "dist-electron", "migrations");
  const devPath2 = path.join(process.cwd(), "electron", "migrations");

  console.log("[Migration] Checking paths:");
  console.log(`  1. Unpacked (prod): ${prodUnpackedMigrationsPath}`);
  console.log(`  2. Regular (prod/dev): ${prodPath}`);
  console.log(`  3. Dev built: ${devPath}`);
  console.log(`  4. Dev source: ${devPath2}`);

  // Try unpacked path first (production with asar)
  if (fs.existsSync(prodUnpackedMigrationsPath)) {
    console.log(
      `[Migration] Using unpacked migrations: ${prodUnpackedMigrationsPath}`
    );
    return prodUnpackedMigrationsPath;
  }

  // Try production path (non-asar or dev mode)
  if (fs.existsSync(prodPath)) {
    console.log(`[Migration] Using regular path: ${prodPath}`);
    return prodPath;
  }

  // Try development built path
  if (fs.existsSync(devPath)) {
    console.log(`[Migration] Using dev-built path: ${devPath}`);
    return devPath;
  }

  // Fallback to source path
  console.log(`[Migration] Using dev-source path: ${devPath2}`);
  return devPath2;
}

/**
 * Run all pending migrations
 */
export async function runMigrations(db: Database): Promise<void> {
  const migrationsPath = getMigrationsPath();
  console.log(`[Migration] Using migrations path: ${migrationsPath}`);

  // Check if migrations directory exists and has files
  if (fs.existsSync(migrationsPath)) {
    const files = fs.readdirSync(migrationsPath);
    console.log(
      `[Migration] Found ${files.length} files in migrations directory:`,
      files
    );
  } else {
    console.error(
      `[Migration] Migrations path does not exist: ${migrationsPath}`
    );
    throw new Error(`Migrations directory not found: ${migrationsPath}`);
  }

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
