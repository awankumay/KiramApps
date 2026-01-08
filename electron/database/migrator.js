import { Umzug } from "umzug";
import * as path from "path";
import * as fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
/**
 * Custom storage adapter for Umzug using better-sqlite3
 * Stores migration history in schema_migrations table
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
        const stmt = this.db.prepare(`INSERT OR REPLACE INTO ${this.tableName} (name) VALUES (?)`);
        stmt.run(params.name);
    }
    async unlogMigration(params) {
        const stmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE name = ?`);
        stmt.run(params.name);
    }
    async executed() {
        const stmt = this.db.prepare(`SELECT name FROM ${this.tableName} ORDER BY name`);
        const rows = stmt.all();
        return rows.map((row) => row.name);
    }
}
/**
 * Create Umzug instance for managing migrations with better-sqlite3
 */
export function createMigrator(db, migrationsPath) {
    return new Umzug({
        migrations: {
            glob: ["*.js", { cwd: migrationsPath }],
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
/**
 * MigrationRunner class - Umzug wrapper with utility methods
 */
export class MigrationRunner {
    constructor(db, migrationsPath) {
        this.db = db;
        this.migrationsPath = migrationsPath;
    }
    createMigrator() {
        return new Umzug({
            migrations: {
                glob: ["*.js", { cwd: this.migrationsPath }],
                resolve: ({ name, path: migrationPath, context }) => {
                    const migration = require(migrationPath);
                    return {
                        name,
                        up: async () => migration.up(context),
                        down: async () => migration.down(context),
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
    async runPendingMigrations() {
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
    async runMigration(migrationName) {
        const umzug = this.createMigrator();
        await umzug.up({ to: migrationName });
    }
    /**
     * Rollback last migration
     */
    async rollbackLast() {
        const umzug = this.createMigrator();
        await umzug.down();
    }
    /**
     * Rollback to specific migration
     */
    async rollbackTo(migrationName) {
        const umzug = this.createMigrator();
        await umzug.down({ to: migrationName });
    }
    /**
     * Rollback all migrations
     */
    async rollbackAll() {
        const umzug = this.createMigrator();
        await umzug.down({ to: 0 });
    }
    /**
     * Get migration status
     */
    async getMigrationStatus() {
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
export function generateMigrationFile(migrationsPath, name) {
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
