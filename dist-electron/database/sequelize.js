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
exports.getDatabasePath = getDatabasePath;
exports.getDatabase = getDatabase;
exports.closeDatabase = closeDatabase;
exports.createDatabase = createDatabase;
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const module_1 = require("module");
const require = (0, module_1.createRequire)(import.meta.url);
const BetterSqlite3 = require("better-sqlite3");
let dbInstance = null;
/**
 * Get database path based on environment
 */
function getDatabasePath() {
    // In Electron main process
    if (electron_1.app) {
        const userDataPath = electron_1.app.getPath("userData");
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
function getDatabase() {
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
function closeDatabase() {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
        console.log("Database connection closed");
    }
}
/**
 * Create new database connection (for CLI scripts)
 */
function createDatabase(dbPath) {
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
