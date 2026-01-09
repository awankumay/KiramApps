import { Umzug } from "umzug";
import type { Database } from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";
// import { pathToFileURL } from "url";
import { app } from "electron";

/**
 * Resolve migrations directory path for both dev and production
 */
function resolveMigrationsPath(migrationsPath: string): string {
  // If absolute path and exists, use it
  if (path.isAbsolute(migrationsPath) && fs.existsSync(migrationsPath)) {
    return migrationsPath;
  }

  // In production (packaged app), migrations are in resources
  if (app.isPackaged) {
    // Try unpacked asar first
    const unpackedPath = path.join(
      process.resourcesPath,
      "app.asar.unpacked",
      "dist-electron",
      "migrations"
    );
    if (fs.existsSync(unpackedPath)) {
      console.log("[Migration] Using unpacked migrations:", unpackedPath);
      return unpackedPath;
    }

    // Try regular resources path
    const resourcesPath = path.join(
      process.resourcesPath,
      "dist-electron",
      "migrations"
    );
    if (fs.existsSync(resourcesPath)) {
      console.log("[Migration] Using resources migrations:", resourcesPath);
      return resourcesPath;
    }

    // Try app path
    const appPath = path.join(app.getAppPath(), "dist-electron", "migrations");
    if (fs.existsSync(appPath)) {
      console.log("[Migration] Using app migrations:", appPath);
      return appPath;
    }
  }

  // Development mode - use provided path
  const devPath = path.isAbsolute(migrationsPath)
    ? migrationsPath
    : path.resolve(migrationsPath);
  if (fs.existsSync(devPath)) {
    console.log("[Migration] Using dev migrations:", devPath);
    return devPath;
  }

  throw new Error(
    `Migrations directory not found. Tried: ${migrationsPath}, ${
      process.resourcesPath
    }, ${app.getAppPath()}`
  );
}

/**
 * Migration context - provides database instance to migrations
 */
export interface MigrationContext {
  db: Database;
}

/**
 * Custom storage adapter for Umzug using better-sqlite3
 * Stores migration history in schema_migrations table
 */
class BetterSqlite3Storage {
  private db: Database;
  private tableName: string;

  constructor(db: Database, tableName = "schema_migrations") {
    this.db = db;
    this.tableName = tableName;
    this.ensureTable();
  }

  private ensureTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        name TEXT PRIMARY KEY,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async logMigration(params: { name: string }): Promise<void> {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO ${this.tableName} (name) VALUES (?)`
    );
    stmt.run(params.name);
  }

  async unlogMigration(params: { name: string }): Promise<void> {
    const stmt = this.db.prepare(
      `DELETE FROM ${this.tableName} WHERE name = ?`
    );
    stmt.run(params.name);
  }

  async executed(): Promise<string[]> {
    const stmt = this.db.prepare(
      `SELECT name FROM ${this.tableName} ORDER BY name`
    );
    const rows = stmt.all() as Array<{ name: string }>;
    return rows.map((row) => row.name);
  }
}

/**
 * Create Umzug instance for managing migrations with better-sqlite3
 */
export function createMigrator(
  db: Database,
  migrationsPath: string
): Umzug<MigrationContext> {
  const resolvedPath = resolveMigrationsPath(migrationsPath);
  console.log("[Migration] Using migrations directory:", resolvedPath);

  return new Umzug({
    migrations: {
      glob: ["*.js", { cwd: resolvedPath }],
      resolve: ({ name, path: migrationPath, context }) => {
        return {
          name,
          up: async () => {
            try {
              console.log(`[Migration] Running ${name}`);
              // Use require for CommonJS modules (production compatibility)
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const migration = require(migrationPath!);
              return await migration.up(context);
            } catch (error) {
              console.error(
                `[Migration] Failed to run migration ${name}:`,
                error
              );
              throw error;
            }
          },
          down: async () => {
            try {
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const migration = require(migrationPath!);
              return await migration.down(context);
            } catch (error) {
              console.error(
                `[Migration] Failed to rollback migration ${name}:`,
                error
              );
              throw error;
            }
          },
        };
      },
    },
    context: { db },
    storage: new BetterSqlite3Storage(db),
    logger: console,
  });
}

/**
 * MigrationRunner class - Umzug wrapper with utility methods
 */
export class MigrationRunner {
  private db: Database;
  private migrationsPath: string;

  constructor(db: Database, migrationsPath: string) {
    this.db = db;
    this.migrationsPath = resolveMigrationsPath(migrationsPath);
    console.log(
      "[MigrationRunner] Using migrations directory:",
      this.migrationsPath
    );
  }

  private createMigrator(): Umzug<MigrationContext> {
    return new Umzug({
      migrations: {
        glob: ["*.js", { cwd: this.migrationsPath }],
        resolve: ({ name, path: migrationPath, context }) => {
          return {
            name,
            up: async () => {
              try {
                // Use require for CommonJS modules (production compatibility)
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const migration = require(migrationPath!);
                return await migration.up(context);
              } catch (error) {
                console.error(`Failed to run migration ${name}:`, error);
                throw error;
              }
            },
            down: async () => {
              try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const migration = require(migrationPath!);
                return await migration.down(context);
              } catch (error) {
                console.error(`Failed to rollback migration ${name}:`, error);
                throw error;
              }
            },
          };
        },
      },
      context: { db: this.db },
      storage: new BetterSqlite3Storage(this.db),
      logger: console,
    });
  }

  /**
   * Run all pending migrations
   */
  async runPendingMigrations(): Promise<void> {
    const umzug = this.createMigrator();
    const pending = await umzug.pending();

    if (pending.length === 0) {
      console.log("No pending migrations found");
      return;
    }

    console.log(`Found ${pending.length} pending migrations`);

    for (const migration of pending) {
      console.log(`Running migration: ${migration.name}`);
    }

    await umzug.up();
    console.log("All migrations completed successfully");
  }

  /**
   * Run specific migration
   */
  async runMigration(migrationName: string): Promise<void> {
    const umzug = this.createMigrator();
    await umzug.up({ to: migrationName });
  }

  /**
   * Rollback last migration
   */
  async rollbackLast(): Promise<void> {
    const umzug = this.createMigrator();
    await umzug.down();
  }

  /**
   * Rollback to specific migration
   */
  async rollbackTo(migrationName: string): Promise<void> {
    const umzug = this.createMigrator();
    await umzug.down({ to: migrationName });
  }

  /**
   * Rollback all migrations
   */
  async rollbackAll(): Promise<void> {
    const umzug = this.createMigrator();
    await umzug.down({ to: 0 });
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<{
    applied: string[];
    pending: string[];
  }> {
    const umzug = this.createMigrator();
    const executed = await umzug.executed();
    const pending = await umzug.pending();

    return {
      applied: executed.map((m) => m.name),
      pending: pending.map((m) => m.name),
    };
  }
}

/**
 * Generate migration file
 */
export function generateMigrationFile(
  migrationsPath: string,
  name: string
): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "")
    .slice(0, 14);

  const filename = `${timestamp}_${name}.ts`;
  const filePath = path.join(migrationsPath, filename);

  const template = `import type { MigrationContext } from "../database/migrator";

/**
 * Migration: ${name}
 * Created: ${new Date().toISOString().split("T")[0]}
 */
export async function up({ db }: MigrationContext): Promise<void> {
  // Add your migration logic here
  // Example:
  // db.exec(\`
  //   CREATE TABLE IF NOT EXISTS example (
  //     id INTEGER PRIMARY KEY AUTOINCREMENT,
  //     name TEXT NOT NULL,
  //     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  //   )
  // \`);
}

export async function down({ db }: MigrationContext): Promise<void> {
  // Add your rollback logic here
  // Example:
  // db.exec('DROP TABLE IF EXISTS example');
}
`;

  fs.writeFileSync(filePath, template);
  return filePath;
}
