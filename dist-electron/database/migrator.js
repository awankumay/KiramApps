"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationRunner = void 0;
exports.createMigrator = createMigrator;
exports.generateMigrationFile = generateMigrationFile;
const umzug_1 = require("umzug");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const url_1 = require("url");
const electron_1 = require("electron");
/**
 * Resolve migrations directory path for both dev and production
 */
function resolveMigrationsPath(migrationsPath) {
    // If absolute path and exists, use it
    if (path.isAbsolute(migrationsPath) && fs.existsSync(migrationsPath)) {
        return migrationsPath;
    }
    // In production (packaged app), migrations are in resources
    if (electron_1.app.isPackaged) {
        // Try unpacked asar first
        const unpackedPath = path.join(process.resourcesPath, "app.asar.unpacked", "dist-electron", "migrations");
        if (fs.existsSync(unpackedPath)) {
            console.log("[Migration] Using unpacked migrations:", unpackedPath);
            return unpackedPath;
        }
        // Try regular resources path
        const resourcesPath = path.join(process.resourcesPath, "dist-electron", "migrations");
        if (fs.existsSync(resourcesPath)) {
            console.log("[Migration] Using resources migrations:", resourcesPath);
            return resourcesPath;
        }
        // Try app path
        const appPath = path.join(electron_1.app.getAppPath(), "dist-electron", "migrations");
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
    throw new Error(`Migrations directory not found. Tried: ${migrationsPath}, ${process.resourcesPath}, ${electron_1.app.getAppPath()}`);
}
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
function createMigrator(db, migrationsPath) {
    const resolvedPath = resolveMigrationsPath(migrationsPath);
    console.log("[Migration] Using migrations directory:", resolvedPath);
    return new umzug_1.Umzug({
        migrations: {
            glob: ["*.js", { cwd: resolvedPath }],
            resolve: ({ name, path: migrationPath, context }) => {
                return {
                    name,
                    up: async () => {
                        try {
                            console.log(`[Migration] Running ${name}`);
                            // Use dynamic import with file URL for ES modules
                            const fileUrl = (0, url_1.pathToFileURL)(migrationPath).href;
                            const migration = await Promise.resolve(`${fileUrl}`).then(s => __importStar(require(s)));
                            return await migration.up(context);
                        }
                        catch (error) {
                            console.error(`[Migration] Failed to run migration ${name}:`, error);
                            throw error;
                        }
                    },
                    down: async () => {
                        try {
                            const fileUrl = (0, url_1.pathToFileURL)(migrationPath).href;
                            const migration = await Promise.resolve(`${fileUrl}`).then(s => __importStar(require(s)));
                            return await migration.down(context);
                        }
                        catch (error) {
                            console.error(`[Migration] Failed to rollback migration ${name}:`, error);
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
class MigrationRunner {
    constructor(db, migrationsPath) {
        this.db = db;
        this.migrationsPath = resolveMigrationsPath(migrationsPath);
        console.log("[MigrationRunner] Using migrations directory:", this.migrationsPath);
    }
    createMigrator() {
        return new umzug_1.Umzug({
            migrations: {
                glob: ["*.js", { cwd: this.migrationsPath }],
                resolve: ({ name, path: migrationPath, context }) => {
                    return {
                        name,
                        up: async () => {
                            try {
                                // Use dynamic import with file URL for ES modules
                                const fileUrl = (0, url_1.pathToFileURL)(migrationPath).href;
                                const migration = await Promise.resolve(`${fileUrl}`).then(s => __importStar(require(s)));
                                return await migration.up(context);
                            }
                            catch (error) {
                                console.error(`Failed to run migration ${name}:`, error);
                                throw error;
                            }
                        },
                        down: async () => {
                            try {
                                const fileUrl = (0, url_1.pathToFileURL)(migrationPath).href;
                                const migration = await Promise.resolve(`${fileUrl}`).then(s => __importStar(require(s)));
                                return await migration.down(context);
                            }
                            catch (error) {
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
exports.MigrationRunner = MigrationRunner;
/**
 * Generate migration file
 */
function generateMigrationFile(migrationsPath, name) {
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
