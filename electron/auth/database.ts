import path from "path";
import { app } from "electron";
import { createRequire } from "module";
import fs from "fs";

// Use createRequire for CommonJS modules like better-sqlite3
const require = createRequire(import.meta.url);
const BetterSqlite3 = require("better-sqlite3");

// TypeScript type for better-sqlite3 Database
type DatabaseInstance = ReturnType<typeof BetterSqlite3>;

/**
 * Initialize authentication database with required schema
 * Creates auth_sessions and auth_events tables if they don't exist
 */
export function initAuthDatabase(db: DatabaseInstance): void {
  // Drop old table if it has UNIQUE constraint (for migration)
  // Simple approach: just drop and recreate if table exists
  try {
    const tableInfo = db.pragma("table_info(auth_sessions)");
    if (tableInfo && tableInfo.length > 0) {
      console.log("Dropping existing auth_sessions table for schema migration");
      db.exec("DROP TABLE IF EXISTS auth_sessions");
    }
  } catch (error) {
    // Table doesn't exist, that's fine
  }

  // Create auth_sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      email TEXT,
      first_name TEXT,
      last_name TEXT,
      access_token_encrypted BLOB NOT NULL,
      refresh_token_encrypted BLOB NOT NULL,
      token_expiry DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_refreshed_at DATETIME,
      is_active INTEGER DEFAULT 1
    );
  `);

  // Create auth_events table for audit logging
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      user_id INTEGER,
      username TEXT,
      success INTEGER NOT NULL,
      error_message TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id 
    ON auth_sessions(user_id);
    
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_is_active 
    ON auth_sessions(is_active);
    
    CREATE INDEX IF NOT EXISTS idx_auth_events_user_id 
    ON auth_events(user_id);
    
    CREATE INDEX IF NOT EXISTS idx_auth_events_created_at 
    ON auth_events(created_at);
  `);
}

/**
 * Get database file path in user's AppData directory
 */
export function getDatabasePath(): string {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "app-data.db");
}

/**
 * Initialize and return database connection
 */
export function createDatabase(): DatabaseInstance {
  const dbPath = getDatabasePath();

  // Ensure directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`Created database directory: ${dbDir}`);
  }

  console.log(`Database path: ${dbPath}`);

  // Check if database already exists
  const dbExists = fs.existsSync(dbPath);
  console.log(`Database exists: ${dbExists}`);

  const db = new BetterSqlite3(dbPath);

  // Enable foreign keys and WAL mode for better performance
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");

  // Initialize auth schema
  initAuthDatabase(db);

  console.log("Database initialized successfully");

  return db;
}
