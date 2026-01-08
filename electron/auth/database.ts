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

  // Initialize Items schema
  initItemsDatabase(db);

  // Initialize Customer & Vehicle schema
  initCustomerVehicleDatabase(db);
}

/**
 * Initialize Items database schema
 * Creates items table for item management
 */
export function initItemsDatabase(db: DatabaseInstance): void {
  // Create items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration: Add price column if it doesn't exist (for existing databases)
  try {
    const tableInfo = db.prepare("PRAGMA table_info(items)").all() as Array<{
      name: string;
    }>;
    const hasPriceColumn = tableInfo.some((col) => col.name === "price");
    if (!hasPriceColumn) {
      db.exec(`ALTER TABLE items ADD COLUMN price REAL NOT NULL DEFAULT 0;`);
      console.log("Migration: Added price column to items table");
    }
  } catch (error) {
    console.error("Migration error:", error);
  }

  // Create price history table for tracking price changes
  db.exec(`
    CREATE TABLE IF NOT EXISTS item_price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      old_price REAL,
      new_price REAL NOT NULL,
      changed_by INTEGER,
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    );
  `);

  // Create indexes for items table
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_items_name
    ON items(name);
    
    CREATE INDEX IF NOT EXISTS idx_items_is_active
    ON items(is_active);
  `);

  // Create indexes for price history table
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_price_history_item_id
    ON item_price_history(item_id);
    
    CREATE INDEX IF NOT EXISTS idx_price_history_changed_at
    ON item_price_history(changed_at);
  `);

  // Seed dummy items
  seedItemsData(db);

  console.log("Items database schema initialized");
}

/**
 * Initialize Customer & Vehicle database schema
 * Creates customers and vehicles tables for customer and vehicle management
 */
export function initCustomerVehicleDatabase(db: DatabaseInstance): void {
  // Create customers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('PERSONAL', 'COMPANY')),
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create vehicles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plate_number TEXT NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
    );
  `);

  // Create indexes for customers table
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_customers_name
    ON customers(name);
    
    CREATE INDEX IF NOT EXISTS idx_customers_category
    ON customers(category);
    
    CREATE INDEX IF NOT EXISTS idx_customers_is_active
    ON customers(is_active);
  `);

  // Create indexes for vehicles table
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_vehicles_plate_number
    ON vehicles(plate_number);
    
    CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id
    ON vehicles(customer_id);
    
    CREATE INDEX IF NOT EXISTS idx_vehicles_is_active
    ON vehicles(is_active);
  `);

  // Seed dummy customer and vehicle data
  seedCustomerVehicleData(db);

  console.log("Customer & Vehicle database schema initialized");
}

/**
 * Seed dummy customer and vehicle data
 */
function seedCustomerVehicleData(db: DatabaseInstance): void {
  const dummyCustomers = [
    { name: "PT Logistics Indonesia", category: "COMPANY" },
    { name: "PT Transport Jaya", category: "COMPANY" },
    { name: "Budi Santoso", category: "PERSONAL" },
    { name: "Ahmad Hidayat", category: "PERSONAL" },
  ];

  const dummyVehicles = [
    { plateNumber: "B 1234 ABC", customerIndex: 0 },
    { plateNumber: "B 5678 XYZ", customerIndex: 0 },
    { plateNumber: "B 9012 DEF", customerIndex: 1 },
    { plateNumber: "B 3456 GHI", customerIndex: 2 },
    { plateNumber: "B 7890 JKL", customerIndex: 3 },
  ];

  // Insert customers
  const insertCustomer = db.prepare(`
    INSERT OR IGNORE INTO customers (name, category, is_active)
    VALUES (?, ?, 1)
  `);

  const customerIds: number[] = [];
  for (const customer of dummyCustomers) {
    const result = insertCustomer.run(customer.name, customer.category);
    customerIds.push(result.lastInsertRowid as number);
  }

  // Insert vehicles
  const insertVehicle = db.prepare(`
    INSERT OR IGNORE INTO vehicles (plate_number, customer_id, is_active)
    VALUES (?, ?, 1)
  `);

  for (const vehicle of dummyVehicles) {
    const customerId = customerIds[vehicle.customerIndex];
    if (customerId) {
      insertVehicle.run(vehicle.plateNumber, customerId);
    }
  }

  console.log("Dummy customer and vehicle data seeded");
}

/**
 * Seed dummy items data
 */
function seedItemsData(db: DatabaseInstance): void {
  const dummyItems = [
    { name: "Pasir", unit: "m³", price: 150000 },
    { name: "Batu Split", unit: "m³", price: 250000 },
    { name: "Batu Kali", unit: "m³", price: 200000 },
  ];

  const insertItem = db.prepare(`
    INSERT OR IGNORE INTO items (name, unit, price, is_active)
    VALUES (?, ?, ?, 1)
  `);

  for (const item of dummyItems) {
    insertItem.run(item.name, item.unit, item.price);
  }

  console.log("Dummy items data seeded");
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
      code: "MANAGE_ITEMS",
      name: "Manage Items",
      description: "Create, edit, delete items",
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

  // Note: Migrations are now handled by Sequelize+Umzug
  // Run `npm run db:migrate` to apply migrations
  // The schema should already be created by the migration system

  console.log("Database initialized successfully");

  return db;
}
