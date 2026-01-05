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

  // Create users table for local user management
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration: Add password_hash column if it doesn't exist (for existing databases)
  try {
    const tableInfo = db.prepare("PRAGMA table_info(users)").all() as Array<{
      name: string;
    }>;
    const hasPasswordHash = tableInfo.some(
      (col) => col.name === "password_hash"
    );
    if (!hasPasswordHash) {
      db.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT;`);
      console.log("Migration: Added password_hash column to users table");
    }
  } catch (error) {
    console.error("Migration error:", error);
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_username 
    ON users(username);
    
    CREATE INDEX IF NOT EXISTS idx_users_email 
    ON users(email);
    
    CREATE INDEX IF NOT EXISTS idx_users_status 
    ON users(status);
  `);

  // Initialize RBAC schema
  initRBACDatabase(db);
}

/**
 * Initialize RBAC database schema
 * Creates roles, permissions, role_permissions, and user_roles tables
 */
export function initRBACDatabase(db: DatabaseInstance): void {
  // Create roles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create permissions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create role_permissions junction table
  db.exec(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id INTEGER NOT NULL,
      permission_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (role_id, permission_id),
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    );
  `);

  // Create user_roles junction table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id INTEGER NOT NULL,
      role_id INTEGER NOT NULL,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, role_id),
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
    );
  `);

  // Create indexes for RBAC tables
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id 
    ON role_permissions(role_id);
    
    CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id 
    ON role_permissions(permission_id);
    
    CREATE INDEX IF NOT EXISTS idx_user_roles_user_id 
    ON user_roles(user_id);
    
    CREATE INDEX IF NOT EXISTS idx_user_roles_role_id 
    ON user_roles(role_id);
  `);

  // Seed default roles and permissions
  seedRBACData(db);
}

/**
 * Seed default RBAC data (roles, permissions, mappings)
 * Idempotent - safe to call multiple times
 */
function seedRBACData(db: DatabaseInstance): void {
  // Define default roles
  const roles = [
    {
      code: "SUPERADMIN",
      name: "Super Administrator",
      description: "Full system access",
    },
    {
      code: "CHECKER",
      name: "Checker",
      description: "Transaction input and verification",
    },
    {
      code: "LOADER",
      name: "Operator Loader",
      description: "Loader operation only",
    },
  ];

  // Define default permissions
  const permissions = [
    {
      code: "VIEW_DASHBOARD",
      name: "View Dashboard",
      description: "Access dashboard",
    },
    {
      code: "CREATE_TRANSACTION",
      name: "Create Transaction",
      description: "Create new transactions",
    },
    {
      code: "VIEW_TRANSACTION",
      name: "View Transaction",
      description: "View transaction details",
    },
    {
      code: "VERIFY_PAYMENT",
      name: "Verify Payment",
      description: "Verify payment submissions",
    },
    {
      code: "VIEW_LOADER_QUEUE",
      name: "View Loader Queue",
      description: "View loader assignment queue",
    },
    {
      code: "UPDATE_LOADER_STATUS",
      name: "Update Loader Status",
      description: "Update loader assignment status",
    },
    {
      code: "MANAGE_USERS",
      name: "Manage Users",
      description: "Create, edit, delete users",
    },
    {
      code: "MANAGE_ROLES",
      name: "Manage Roles",
      description: "Manage roles and permissions",
    },
    {
      code: "VIEW_REPORTS",
      name: "View Reports",
      description: "Access system reports",
    },
  ];

  // Role-permission mappings
  const rolePermissions: Record<string, string[]> = {
    SUPERADMIN: permissions.map((p) => p.code), // All permissions
    CHECKER: [
      "VIEW_DASHBOARD",
      "CREATE_TRANSACTION",
      "VIEW_TRANSACTION",
      "VERIFY_PAYMENT",
    ],
    LOADER: ["VIEW_DASHBOARD", "VIEW_LOADER_QUEUE", "UPDATE_LOADER_STATUS"],
  };

  // Test user role assignments (DummyJSON user IDs)
  const userRoles = [
    { userId: 1, roleCode: "SUPERADMIN" }, // emilys
    { userId: 2, roleCode: "CHECKER" }, // michaelw
    { userId: 3, roleCode: "LOADER" }, // sophiab
  ];

  // Insert roles (ignore if exists)
  const insertRole = db.prepare(`
    INSERT OR IGNORE INTO roles (code, name, description) VALUES (?, ?, ?)
  `);
  for (const role of roles) {
    insertRole.run(role.code, role.name, role.description);
  }

  // Insert permissions (ignore if exists)
  const insertPermission = db.prepare(`
    INSERT OR IGNORE INTO permissions (code, name, description) VALUES (?, ?, ?)
  `);
  for (const permission of permissions) {
    insertPermission.run(
      permission.code,
      permission.name,
      permission.description
    );
  }

  // Insert role-permission mappings
  const getRoleId = db.prepare(`SELECT id FROM roles WHERE code = ?`);
  const getPermissionId = db.prepare(
    `SELECT id FROM permissions WHERE code = ?`
  );
  const insertRolePermission = db.prepare(`
    INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)
  `);

  for (const [roleCode, permissionCodes] of Object.entries(rolePermissions)) {
    const roleRow = getRoleId.get(roleCode) as { id: number } | undefined;
    if (!roleRow) continue;

    for (const permCode of permissionCodes) {
      const permRow = getPermissionId.get(permCode) as
        | { id: number }
        | undefined;
      if (!permRow) continue;

      insertRolePermission.run(roleRow.id, permRow.id);
    }
  }

  // Insert test user role assignments
  const insertUserRole = db.prepare(`
    INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)
  `);

  for (const { userId, roleCode } of userRoles) {
    const roleRow = getRoleId.get(roleCode) as { id: number } | undefined;
    if (!roleRow) continue;

    insertUserRole.run(userId, roleRow.id);
  }

  // Seed test users to match DummyJSON accounts
  const testUsers = [
    {
      id: 1,
      username: "emilys",
      email: "emily.johnson@x.dummyjson.com",
      firstName: "Emily",
      lastName: "Johnson",
      status: "active",
    },
    {
      id: 2,
      username: "michaelw",
      email: "michael.williams@x.dummyjson.com",
      firstName: "Michael",
      lastName: "Williams",
      status: "active",
    },
    {
      id: 3,
      username: "sophiab",
      email: "sophia.brown@x.dummyjson.com",
      firstName: "Sophia",
      lastName: "Brown",
      status: "active",
    },
    {
      id: 4,
      username: "jamesd",
      email: "james.davis@x.dummyjson.com",
      firstName: "James",
      lastName: "Davis",
      status: "inactive",
    },
    {
      id: 5,
      username: "emmaw",
      email: "emma.wilson@x.dummyjson.com",
      firstName: "Emma",
      lastName: "Wilson",
      status: "active",
    },
  ];

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, username, email, first_name, last_name, status) VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const user of testUsers) {
    insertUser.run(
      user.id,
      user.username,
      user.email,
      user.firstName,
      user.lastName,
      user.status
    );
  }

  console.log("RBAC data seeded successfully");
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
