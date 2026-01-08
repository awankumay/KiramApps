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
exports.createDatabase = exports.getDatabasePath = exports.closeDatabase = exports.getDatabase = exports.MigrationRunner = void 0;
exports.getCliDatabasePath = getCliDatabasePath;
exports.createCliDatabase = createCliDatabase;
exports.getMigrationsPath = getMigrationsPath;
exports.runMigrations = runMigrations;
exports.getMigrationStatus = getMigrationStatus;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const url_1 = require("url");
const migrator_1 = require("./migrator");
const module_1 = require("module");
const require = (0, module_1.createRequire)(import.meta.url);
const BetterSqlite3 = require("better-sqlite3");
// Re-export types
var migrator_2 = require("./migrator");
Object.defineProperty(exports, "MigrationRunner", { enumerable: true, get: function () { return migrator_2.MigrationRunner; } });
var sequelize_1 = require("./sequelize");
Object.defineProperty(exports, "getDatabase", { enumerable: true, get: function () { return sequelize_1.getDatabase; } });
Object.defineProperty(exports, "closeDatabase", { enumerable: true, get: function () { return sequelize_1.closeDatabase; } });
Object.defineProperty(exports, "getDatabasePath", { enumerable: true, get: function () { return sequelize_1.getDatabasePath; } });
Object.defineProperty(exports, "createDatabase", { enumerable: true, get: function () { return sequelize_1.createDatabase; } });
/**
 * Get database path for CLI scripts (outside Electron context)
 */
function getCliDatabasePath() {
    const platform = os.platform();
    let appDataPath;
    if (platform === "win32") {
        appDataPath =
            process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    }
    else if (platform === "darwin") {
        appDataPath = path.join(os.homedir(), "Library", "Application Support");
    }
    else {
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
function createCliDatabase() {
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
function getMigrationsPath() {
    // Get the directory where the compiled JS is running
    const __dirname = path.dirname((0, url_1.fileURLToPath)(import.meta.url));
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
        console.log(`[Migration] ✓ Using unpacked migrations: ${prodUnpackedMigrationsPath}`);
        return prodUnpackedMigrationsPath;
    }
    // Try production path (non-asar or dev mode)
    if (fs.existsSync(prodPath)) {
        console.log(`[Migration] ✓ Using regular path: ${prodPath}`);
        return prodPath;
    }
    // Try development built path
    if (fs.existsSync(devPath)) {
        console.log(`[Migration] ✓ Using dev-built path: ${devPath}`);
        return devPath;
    }
    // Fallback to source path
    console.log(`[Migration] ✓ Using dev-source path: ${devPath2}`);
    return devPath2;
}
/**
 * Run all pending migrations
 */
async function runMigrations(db) {
    const migrationsPath = getMigrationsPath();
    console.log(`[Migration] Using migrations path: ${migrationsPath}`);
    // Check if migrations directory exists and has files
    if (fs.existsSync(migrationsPath)) {
        const files = fs.readdirSync(migrationsPath);
        console.log(`[Migration] Found ${files.length} files in migrations directory:`, files);
    }
    else {
        console.error(`[Migration] Migrations path does not exist: ${migrationsPath}`);
        throw new Error(`Migrations directory not found: ${migrationsPath}`);
    }
    const migrationRunner = new migrator_1.MigrationRunner(db, migrationsPath);
    await migrationRunner.runPendingMigrations();
}
/**
 * Get migration status
 */
async function getMigrationStatus(db) {
    const migrationsPath = getMigrationsPath();
    const migrationRunner = new migrator_1.MigrationRunner(db, migrationsPath);
    return migrationRunner.getMigrationStatus();
}
