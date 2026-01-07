import { app } from "electron";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const BetterSqlite3 = require("better-sqlite3");
let dbInstance = null;
/**
 * Get database path based on environment
 */
export function getDatabasePath() {
    // In Electron main process
    if (app) {
        const userDataPath = app.getPath("userData");
        return path.join(userDataPath, "app-data.db");
    }
    // Fallback for CLI scripts (outside Electron context)
    const platform = process.platform;
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
 * Get database instance (singleton pattern)
 */
export function getDatabase() {
    if (!dbInstance) {
        const dbPath = getDatabasePath();
        // Ensure directory exists
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        const db = new BetterSqlite3(dbPath);
        // Enable foreign keys and WAL mode for better performance
        db.pragma("foreign_keys = ON");
        db.pragma("journal_mode = WAL");
        console.log(`Database opened: ${dbPath}`);
        dbInstance = db;
    }
    return dbInstance;
}
/**
 * Close database connection
 */
export function closeDatabase() {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
        console.log("Database connection closed");
    }
}
/**
 * Create new database connection (for CLI scripts)
 */
export function createDatabase(dbPath) {
    const path = dbPath || getDatabasePath();
    // Ensure directory exists
    const dbDir = require("path").dirname(path);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    const db = new BetterSqlite3(path);
    // Enable foreign keys and WAL mode
    db.pragma("foreign_keys = ON");
    db.pragma("journal_mode = WAL");
    return db;
}
