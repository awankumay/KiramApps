var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { app, safeStorage, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path$1 from "node:path";
import path from "path";
import { createRequire } from "module";
import fs from "fs";
import { EventEmitter } from "events";
import { createHash } from "crypto";
const require$5 = createRequire(import.meta.url);
const BetterSqlite3 = require$5("better-sqlite3");
function initAuthDatabase(db) {
  try {
    const tableInfo = db.pragma("table_info(auth_sessions)");
    if (tableInfo && tableInfo.length > 0) {
      console.log("Dropping existing auth_sessions table for schema migration");
      db.exec("DROP TABLE IF EXISTS auth_sessions");
    }
  } catch (error) {
  }
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
  try {
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
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
  initRBACDatabase(db);
}
function initRBACDatabase(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
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
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id INTEGER NOT NULL,
      role_id INTEGER NOT NULL,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, role_id),
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
    );
  `);
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
  seedRBACData(db);
}
function seedRBACData(db) {
  const roles = [
    {
      code: "SUPERADMIN",
      name: "Super Administrator",
      description: "Full system access"
    },
    {
      code: "CHECKER",
      name: "Checker",
      description: "Transaction input and verification"
    },
    {
      code: "LOADER",
      name: "Operator Loader",
      description: "Loader operation only"
    }
  ];
  const permissions = [
    {
      code: "VIEW_DASHBOARD",
      name: "View Dashboard",
      description: "Access dashboard"
    },
    {
      code: "CREATE_TRANSACTION",
      name: "Create Transaction",
      description: "Create new transactions"
    },
    {
      code: "VIEW_TRANSACTION",
      name: "View Transaction",
      description: "View transaction details"
    },
    {
      code: "VERIFY_PAYMENT",
      name: "Verify Payment",
      description: "Verify payment submissions"
    },
    {
      code: "VIEW_LOADER_QUEUE",
      name: "View Loader Queue",
      description: "View loader assignment queue"
    },
    {
      code: "UPDATE_LOADER_STATUS",
      name: "Update Loader Status",
      description: "Update loader assignment status"
    },
    {
      code: "MANAGE_USERS",
      name: "Manage Users",
      description: "Create, edit, delete users"
    },
    {
      code: "MANAGE_ROLES",
      name: "Manage Roles",
      description: "Manage roles and permissions"
    },
    {
      code: "VIEW_REPORTS",
      name: "View Reports",
      description: "Access system reports"
    }
  ];
  const rolePermissions = {
    SUPERADMIN: permissions.map((p) => p.code),
    // All permissions
    CHECKER: [
      "VIEW_DASHBOARD",
      "CREATE_TRANSACTION",
      "VIEW_TRANSACTION",
      "VERIFY_PAYMENT"
    ],
    LOADER: ["VIEW_DASHBOARD", "VIEW_LOADER_QUEUE", "UPDATE_LOADER_STATUS"]
  };
  const userRoles = [
    { userId: 1, roleCode: "SUPERADMIN" },
    // emilys
    { userId: 2, roleCode: "CHECKER" },
    // michaelw
    { userId: 3, roleCode: "LOADER" }
    // sophiab
  ];
  const insertRole = db.prepare(`
    INSERT OR IGNORE INTO roles (code, name, description) VALUES (?, ?, ?)
  `);
  for (const role of roles) {
    insertRole.run(role.code, role.name, role.description);
  }
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
  const getRoleId = db.prepare(`SELECT id FROM roles WHERE code = ?`);
  const getPermissionId = db.prepare(
    `SELECT id FROM permissions WHERE code = ?`
  );
  const insertRolePermission = db.prepare(`
    INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)
  `);
  for (const [roleCode, permissionCodes] of Object.entries(rolePermissions)) {
    const roleRow = getRoleId.get(roleCode);
    if (!roleRow) continue;
    for (const permCode of permissionCodes) {
      const permRow = getPermissionId.get(permCode);
      if (!permRow) continue;
      insertRolePermission.run(roleRow.id, permRow.id);
    }
  }
  const insertUserRole = db.prepare(`
    INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)
  `);
  for (const { userId, roleCode } of userRoles) {
    const roleRow = getRoleId.get(roleCode);
    if (!roleRow) continue;
    insertUserRole.run(userId, roleRow.id);
  }
  const testUsers = [
    {
      id: 1,
      username: "emilys",
      email: "emily.johnson@x.dummyjson.com",
      firstName: "Emily",
      lastName: "Johnson",
      status: "active"
    },
    {
      id: 2,
      username: "michaelw",
      email: "michael.williams@x.dummyjson.com",
      firstName: "Michael",
      lastName: "Williams",
      status: "active"
    },
    {
      id: 3,
      username: "sophiab",
      email: "sophia.brown@x.dummyjson.com",
      firstName: "Sophia",
      lastName: "Brown",
      status: "active"
    },
    {
      id: 4,
      username: "jamesd",
      email: "james.davis@x.dummyjson.com",
      firstName: "James",
      lastName: "Davis",
      status: "inactive"
    },
    {
      id: 5,
      username: "emmaw",
      email: "emma.wilson@x.dummyjson.com",
      firstName: "Emma",
      lastName: "Wilson",
      status: "active"
    }
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
function getDatabasePath() {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "app-data.db");
}
function createDatabase() {
  const dbPath = getDatabasePath();
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`Created database directory: ${dbDir}`);
  }
  console.log(`Database path: ${dbPath}`);
  const dbExists = fs.existsSync(dbPath);
  console.log(`Database exists: ${dbExists}`);
  const db = new BetterSqlite3(dbPath);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  initAuthDatabase(db);
  console.log("Database initialized successfully");
  return db;
}
const require$4 = createRequire(import.meta.url);
require$4("better-sqlite3");
class TokenStorage {
  constructor(db) {
    __publicField(this, "db");
    this.db = db;
  }
  /**
   * Store a new authentication session with encrypted tokens
   */
  async storeSession(session) {
    try {
      const accessTokenEncrypted = safeStorage.encryptString(
        session.accessToken
      );
      const refreshTokenEncrypted = safeStorage.encryptString(
        session.refreshToken
      );
      const tokenExpiry = new Date(
        Date.now() + session.expiresIn * 1e3
      ).toISOString();
      console.log(
        `Storing session for user ${session.userId} (${session.username})`
      );
      const deactivateStmt = this.db.prepare(
        "UPDATE auth_sessions SET is_active = 0 WHERE user_id = ?"
      );
      const deactivateResult = deactivateStmt.run(session.userId);
      console.log(`Deactivated ${deactivateResult.changes} existing sessions`);
      const insertStmt = this.db.prepare(`
        INSERT INTO auth_sessions (
          user_id, username, email, first_name, last_name,
          access_token_encrypted, refresh_token_encrypted, token_expiry
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertResult = insertStmt.run(
        session.userId,
        session.username,
        session.email || null,
        session.firstName || null,
        session.lastName || null,
        accessTokenEncrypted,
        refreshTokenEncrypted,
        tokenExpiry
      );
      console.log(
        `Session stored successfully with ID: ${insertResult.lastInsertRowid}`
      );
    } catch (error) {
      console.error("Failed to store session:", error);
      throw new Error(
        `Failed to store session: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  /**
   * Retrieve the active authentication session with decrypted tokens
   */
  async getActiveSession() {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          id, user_id as userId, username, email, first_name as firstName, 
          last_name as lastName, access_token_encrypted, refresh_token_encrypted,
          token_expiry as tokenExpiry, is_active as isActive,
          created_at as createdAt, last_refreshed_at as lastRefreshedAt
        FROM auth_sessions 
        WHERE is_active = 1 
        ORDER BY created_at DESC 
        LIMIT 1
      `);
      const row = stmt.get();
      if (!row) {
        return null;
      }
      const accessToken = safeStorage.decryptString(row.access_token_encrypted);
      const refreshToken = safeStorage.decryptString(
        row.refresh_token_encrypted
      );
      return {
        id: row.id,
        userId: row.userId,
        username: row.username,
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
        tokenExpiry: row.tokenExpiry,
        isActive: Boolean(row.isActive),
        createdAt: row.createdAt,
        lastRefreshedAt: row.lastRefreshedAt,
        accessToken,
        refreshToken
      };
    } catch (error) {
      throw new Error(
        `Failed to retrieve session: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  /**
   * Update tokens for an existing session (used during token refresh)
   */
  async updateTokens(userId, accessToken, refreshToken, expiresIn) {
    try {
      const accessTokenEncrypted = safeStorage.encryptString(accessToken);
      const refreshTokenEncrypted = safeStorage.encryptString(refreshToken);
      const tokenExpiry = new Date(Date.now() + expiresIn * 1e3).toISOString();
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const stmt = this.db.prepare(`
        UPDATE auth_sessions 
        SET access_token_encrypted = ?,
            refresh_token_encrypted = ?,
            token_expiry = ?,
            last_refreshed_at = ?
        WHERE user_id = ? AND is_active = 1
      `);
      stmt.run(
        accessTokenEncrypted,
        refreshTokenEncrypted,
        tokenExpiry,
        now,
        userId
      );
    } catch (error) {
      throw new Error(
        `Failed to update tokens: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  /**
   * Clear active session (logout)
   */
  async clearSession(userId) {
    try {
      if (userId) {
        const stmt = this.db.prepare(
          "UPDATE auth_sessions SET is_active = 0 WHERE user_id = ?"
        );
        stmt.run(userId);
      } else {
        const stmt = this.db.prepare(
          "UPDATE auth_sessions SET is_active = 0 WHERE is_active = 1"
        );
        stmt.run();
      }
    } catch (error) {
      throw new Error(
        `Failed to clear session: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  /**
   * Check if token is expired
   */
  isTokenExpired(tokenExpiry) {
    return new Date(tokenExpiry) <= /* @__PURE__ */ new Date();
  }
}
const require$3 = createRequire(import.meta.url);
require$3("better-sqlite3");
class AuditLogger {
  constructor(db) {
    __publicField(this, "db");
    this.db = db;
  }
  /**
   * Log a login attempt
   */
  async logLogin(event) {
    await this.logEvent({
      ...event,
      eventType: "LOGIN"
    });
  }
  /**
   * Log a logout event
   */
  async logLogout(event) {
    await this.logEvent({
      ...event,
      eventType: "LOGOUT"
    });
  }
  /**
   * Log a token refresh event
   */
  async logRefresh(event) {
    await this.logEvent({
      ...event,
      eventType: "REFRESH"
    });
  }
  /**
   * Log a validation failure
   */
  async logValidationFailure(event) {
    await this.logEvent({
      ...event,
      eventType: "VALIDATION_FAILURE"
    });
  }
  /**
   * Log an authentication event
   */
  async logEvent(event) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO auth_events (
          event_type, user_id, username, success, 
          error_message, ip_address, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        event.eventType,
        event.userId || null,
        event.username || null,
        event.success ? 1 : 0,
        event.errorMessage || null,
        event.ipAddress || null,
        event.userAgent || null
      );
    } catch (error) {
      console.error("Failed to log auth event:", error);
    }
  }
  /**
   * Get recent authentication events
   */
  async getRecentEvents(limit = 100) {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          id, event_type as eventType, user_id as userId, username,
          success, error_message as errorMessage, ip_address as ipAddress,
          user_agent as userAgent, created_at as createdAt
        FROM auth_events 
        ORDER BY created_at DESC 
        LIMIT ?
      `);
      const rows = stmt.all(limit);
      return rows.map((row) => ({
        id: row.id,
        eventType: row.eventType,
        userId: row.userId,
        username: row.username,
        success: Boolean(row.success),
        errorMessage: row.errorMessage,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        createdAt: row.createdAt
      }));
    } catch (error) {
      console.error("Failed to retrieve auth events:", error);
      return [];
    }
  }
  /**
   * Get events for a specific user
   */
  async getUserEvents(userId, limit = 50) {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          id, event_type as eventType, user_id as userId, username,
          success, error_message as errorMessage, ip_address as ipAddress,
          user_agent as userAgent, created_at as createdAt
        FROM auth_events 
        WHERE user_id = ?
        ORDER BY created_at DESC 
        LIMIT ?
      `);
      const rows = stmt.all(userId, limit);
      return rows.map((row) => ({
        id: row.id,
        eventType: row.eventType,
        userId: row.userId,
        username: row.username,
        success: Boolean(row.success),
        errorMessage: row.errorMessage,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        createdAt: row.createdAt
      }));
    } catch (error) {
      console.error("Failed to retrieve user events:", error);
      return [];
    }
  }
}
class NetworkError extends Error {
  constructor(message) {
    super(message);
    this.name = "NetworkError";
  }
}
class AuthenticationError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AuthenticationError";
  }
}
class DummyJSONClient {
  constructor() {
    __publicField(this, "baseUrl", "https://dummyjson.com");
    __publicField(this, "timeout", 5e3);
  }
  // 5 seconds
  /**
   * Login with username and password
   */
  async login(username, password) {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": `KiramSuratMasuk/Electron`
          },
          body: JSON.stringify({
            username,
            password,
            expiresInMins: 60
            // Token expires in 60 minutes
          })
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new AuthenticationError(
          errorData.message || "Authentication failed",
          response.status
        );
      }
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new NetworkError(
        `Login failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  /**
   * Get current user profile using access token
   */
  async getCurrentUser(accessToken) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": `KiramSuratMasuk/Electron`
        }
      });
      if (!response.ok) {
        throw new AuthenticationError(
          "Failed to get user profile",
          response.status
        );
      }
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new NetworkError(
        `Get user failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken) {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/auth/refresh`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": `KiramSuratMasuk/Electron`
          },
          body: JSON.stringify({
            refreshToken,
            expiresInMins: 60
          })
        }
      );
      if (!response.ok) {
        throw new AuthenticationError("Token refresh failed", response.status);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new NetworkError(
        `Token refresh failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  /**
   * Fetch with timeout support
   */
  async fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new NetworkError("Request timeout");
      }
      throw error;
    }
  }
}
class NetworkStatus extends EventEmitter {
  constructor() {
    super();
    __publicField(this, "_isOnline", true);
    __publicField(this, "checkInterval", null);
    __publicField(this, "pingUrl", "https://dummyjson.com");
    this.startMonitoring();
  }
  /**
   * Check if network is currently online
   */
  async isOnline() {
    try {
      const response = await fetch(this.pingUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(3e3)
        // 3 second timeout
      });
      const online = response.ok;
      this.updateStatus(online);
      return online;
    } catch (error) {
      this.updateStatus(false);
      return false;
    }
  }
  /**
   * Get current online status (from cache, doesn't ping)
   */
  getStatus() {
    return this._isOnline;
  }
  /**
   * Start monitoring network status
   */
  startMonitoring() {
    this.isOnline();
    this.checkInterval = setInterval(() => {
      this.isOnline();
    }, 3e4);
  }
  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
  /**
   * Update status and emit event if changed
   */
  updateStatus(online) {
    if (this._isOnline !== online) {
      this._isOnline = online;
      this.emit("status-changed", online);
      if (online) {
        this.emit("online");
      } else {
        this.emit("offline");
      }
    }
  }
}
const require$2 = createRequire(import.meta.url);
require$2("better-sqlite3");
function hashPassword(password) {
  return createHash("sha256").update(password).digest("hex");
}
class RBACManager {
  // 5 minutes
  constructor(db) {
    __publicField(this, "db");
    __publicField(this, "cache", /* @__PURE__ */ new Map());
    __publicField(this, "cacheTTL", 5 * 60 * 1e3);
    this.db = db;
  }
  /**
   * Get all roles assigned to a user
   */
  getUserRoles(userId) {
    const cached = this.getCachedData(userId);
    if (cached) {
      return cached.roles;
    }
    const stmt = this.db.prepare(`
      SELECT r.code
      FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = ?
    `);
    const rows = stmt.all(userId);
    const roles = rows.map((row) => row.code);
    this.updateCache(userId, roles);
    return roles;
  }
  /**
   * Get all permissions for a user (aggregated from all roles)
   */
  getUserPermissions(userId) {
    const cached = this.getCachedData(userId);
    if (cached) {
      return cached.permissions;
    }
    const stmt = this.db.prepare(`
      SELECT DISTINCT p.code
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = ?
    `);
    const rows = stmt.all(userId);
    const permissions = rows.map((row) => row.code);
    this.updateCache(userId);
    return permissions;
  }
  /**
   * Check if a user has a specific permission
   */
  checkPermission(userId, permissionCode) {
    const permissions = this.getUserPermissions(userId);
    return permissions.includes(permissionCode);
  }
  /**
   * Check if a user has any of the specified permissions
   */
  hasAnyPermission(userId, permissionCodes) {
    const permissions = this.getUserPermissions(userId);
    return permissionCodes.some((code) => permissions.includes(code));
  }
  /**
   * Check if a user has all of the specified permissions
   */
  hasAllPermissions(userId, permissionCodes) {
    const permissions = this.getUserPermissions(userId);
    return permissionCodes.every((code) => permissions.includes(code));
  }
  /**
   * Get all available roles
   */
  getAllRoles() {
    const stmt = this.db.prepare(`
      SELECT id, code, name, description FROM roles ORDER BY id
    `);
    return stmt.all();
  }
  /**
   * Get all available permissions
   */
  getAllPermissions() {
    const stmt = this.db.prepare(`
      SELECT id, code, name, description FROM permissions ORDER BY id
    `);
    return stmt.all();
  }
  /**
   * Get permissions for a specific role
   */
  getRolePermissions(roleCode) {
    const stmt = this.db.prepare(`
      SELECT p.code
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN roles r ON rp.role_id = r.id
      WHERE r.code = ?
    `);
    const rows = stmt.all(roleCode);
    return rows.map((row) => row.code);
  }
  /**
   * Assign a role to a user
   */
  assignRole(userId, roleCode) {
    try {
      const getRoleId = this.db.prepare(`SELECT id FROM roles WHERE code = ?`);
      const roleRow = getRoleId.get(roleCode);
      if (!roleRow) {
        console.error(`Role not found: ${roleCode}`);
        return false;
      }
      const insertStmt = this.db.prepare(`
        INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)
      `);
      insertStmt.run(userId, roleRow.id);
      this.invalidateCache(userId);
      return true;
    } catch (error) {
      console.error("Failed to assign role:", error);
      return false;
    }
  }
  /**
   * Remove a role from a user
   */
  removeRole(userId, roleCode) {
    try {
      const getRoleId = this.db.prepare(`SELECT id FROM roles WHERE code = ?`);
      const roleRow = getRoleId.get(roleCode);
      if (!roleRow) {
        return false;
      }
      const deleteStmt = this.db.prepare(`
        DELETE FROM user_roles WHERE user_id = ? AND role_id = ?
      `);
      deleteStmt.run(userId, roleRow.id);
      this.invalidateCache(userId);
      return true;
    } catch (error) {
      console.error("Failed to remove role:", error);
      return false;
    }
  }
  // ============================================
  // User Management CRUD Operations
  // ============================================
  /**
   * Get all users with their roles
   */
  getAllUsers() {
    const stmt = this.db.prepare(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.first_name as firstName,
        u.last_name as lastName,
        u.status,
        u.created_at as createdAt
      FROM users u
      ORDER BY u.id
    `);
    const users = stmt.all();
    return users.map((user) => ({
      ...user,
      roles: this.getUserRoles(user.id)
    }));
  }
  /**
   * Get a single user by ID
   */
  getUserById(userId) {
    const stmt = this.db.prepare(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.first_name as firstName,
        u.last_name as lastName,
        u.status,
        u.created_at as createdAt
      FROM users u
      WHERE u.id = ?
    `);
    const user = stmt.get(userId);
    if (!user) return null;
    return {
      ...user,
      roles: this.getUserRoles(userId)
    };
  }
  /**
   * Create a new user
   */
  createUser(data) {
    const passwordHash = hashPassword(data.password);
    const insertStmt = this.db.prepare(`
      INSERT INTO users (username, email, password_hash, first_name, last_name, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    const result = insertStmt.run(
      data.username,
      data.email,
      passwordHash,
      data.firstName,
      data.lastName,
      data.status || "active"
    );
    const userId = result.lastInsertRowid;
    if (data.roles && data.roles.length > 0) {
      for (const roleCode of data.roles) {
        this.assignRole(userId, roleCode);
      }
    }
    return this.getUserById(userId);
  }
  /**
   * Update an existing user
   */
  updateUser(userId, data) {
    const user = this.getUserById(userId);
    if (!user) return null;
    const updateStmt = this.db.prepare(`
      UPDATE users
      SET username = ?,
          email = ?,
          first_name = ?,
          last_name = ?,
          status = ?
      WHERE id = ?
    `);
    updateStmt.run(
      data.username ?? user.username,
      data.email ?? user.email,
      data.firstName ?? user.firstName,
      data.lastName ?? user.lastName,
      data.status ?? user.status,
      userId
    );
    if (data.roles !== void 0) {
      const deleteRolesStmt = this.db.prepare(
        `DELETE FROM user_roles WHERE user_id = ?`
      );
      deleteRolesStmt.run(userId);
      for (const roleCode of data.roles) {
        this.assignRole(userId, roleCode);
      }
    }
    this.invalidateCache(userId);
    return this.getUserById(userId);
  }
  /**
   * Delete a user
   */
  deleteUser(userId) {
    try {
      const deleteRolesStmt = this.db.prepare(
        `DELETE FROM user_roles WHERE user_id = ?`
      );
      deleteRolesStmt.run(userId);
      const deleteUserStmt = this.db.prepare(`DELETE FROM users WHERE id = ?`);
      const result = deleteUserStmt.run(userId);
      this.invalidateCache(userId);
      return result.changes > 0;
    } catch (error) {
      console.error("Failed to delete user:", error);
      return false;
    }
  }
  /**
   * Toggle user status (active/inactive)
   */
  toggleUserStatus(userId) {
    const user = this.getUserById(userId);
    if (!user) return null;
    const newStatus = user.status === "active" ? "inactive" : "active";
    const stmt = this.db.prepare(`UPDATE users SET status = ? WHERE id = ?`);
    stmt.run(newStatus, userId);
    return this.getUserById(userId);
  }
  /**
   * Invalidate cache for a specific user
   */
  invalidateCache(userId) {
    this.cache.delete(userId);
  }
  /**
   * Clear entire cache
   */
  clearCache() {
    this.cache.clear();
  }
  /**
   * Get cached data for a user if still valid
   */
  getCachedData(userId) {
    const cached = this.cache.get(userId);
    if (!cached) return null;
    if (Date.now() - cached.cachedAt > this.cacheTTL) {
      this.cache.delete(userId);
      return null;
    }
    return cached;
  }
  /**
   * Update cache for a user
   */
  updateCache(userId, roles) {
    if (!roles) {
      const roleStmt = this.db.prepare(`
        SELECT r.code
        FROM roles r
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = ?
      `);
      const roleRows = roleStmt.all(userId);
      roles = roleRows.map((row) => row.code);
    }
    const permStmt = this.db.prepare(`
      SELECT DISTINCT p.code
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = ?
    `);
    const permRows = permStmt.all(userId);
    const permissions = permRows.map((row) => row.code);
    this.cache.set(userId, {
      roles,
      permissions,
      cachedAt: Date.now()
    });
  }
}
const require$1 = createRequire(import.meta.url);
require$1("better-sqlite3");
class AuthManager {
  constructor(db) {
    __publicField(this, "tokenStorage");
    __publicField(this, "auditLogger");
    __publicField(this, "apiClient");
    __publicField(this, "networkStatus");
    __publicField(this, "rbacManager");
    __publicField(this, "db");
    this.db = db;
    this.tokenStorage = new TokenStorage(db);
    this.auditLogger = new AuditLogger(db);
    this.apiClient = new DummyJSONClient();
    this.networkStatus = new NetworkStatus();
    this.rbacManager = new RBACManager(db);
  }
  /**
   * Get RBAC manager for permission checks
   */
  getRBACManager() {
    return this.rbacManager;
  }
  /**
   * Login with username and password
   * Tries DummyJSON API first, falls back to local SQLite authentication
   */
  async login(username, password) {
    try {
      const isOnline = await this.networkStatus.isOnline();
      if (isOnline) {
        try {
          const response = await this.apiClient.login(username, password);
          await this.tokenStorage.storeSession({
            userId: response.id,
            username: response.username,
            email: response.email,
            firstName: response.firstName,
            lastName: response.lastName,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            expiresIn: 3600
            // 60 minutes in seconds
          });
          await this.auditLogger.logLogin({
            userId: response.id,
            username: response.username,
            success: true
          });
          const session = await this.tokenStorage.getActiveSession();
          if (!session) {
            throw new Error("Session not found after login");
          }
          const roles = this.rbacManager.getUserRoles(response.id);
          const permissions = this.rbacManager.getUserPermissions(response.id);
          return {
            user: {
              id: response.id,
              username: response.username,
              email: response.email,
              firstName: response.firstName,
              lastName: response.lastName,
              roles,
              permissions
            },
            expiresAt: session.tokenExpiry
          };
        } catch (apiError) {
          console.log("API login failed, trying local authentication");
          return this.loginLocal(username, password);
        }
      } else {
        console.log("Offline, trying local authentication");
        return this.loginLocal(username, password);
      }
    } catch (error) {
      await this.auditLogger.logLogin({
        username,
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error"
      });
      throw error;
    }
  }
  /**
   * Login with local SQLite database
   * Used as fallback when DummyJSON API is unavailable
   */
  async loginLocal(username, password) {
    try {
      const passwordHash = createHash("sha256").update(password).digest("hex");
      const stmt = this.db.prepare(`
        SELECT id, username, email, first_name as firstName, last_name as lastName, status
        FROM users
        WHERE username = ? AND password_hash = ? AND status = 'active'
      `);
      const user = stmt.get(username, passwordHash);
      if (!user) {
        await this.auditLogger.logLogin({
          username,
          success: false,
          errorMessage: "Invalid username or password"
        });
        throw new Error("Invalid username or password");
      }
      const dummyAccessToken = `local_token_${user.id}_${Date.now()}`;
      const dummyRefreshToken = `local_refresh_${user.id}_${Date.now()}`;
      await this.tokenStorage.storeSession({
        userId: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        accessToken: dummyAccessToken,
        refreshToken: dummyRefreshToken,
        expiresIn: 3600 * 24
        // 24 hours for local auth
      });
      await this.auditLogger.logLogin({
        userId: user.id,
        username: user.username,
        success: true
      });
      const session = await this.tokenStorage.getActiveSession();
      if (!session) {
        throw new Error("Session not found after local login");
      }
      const roles = this.rbacManager.getUserRoles(user.id);
      const permissions = this.rbacManager.getUserPermissions(user.id);
      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles,
          permissions
        },
        expiresAt: session.tokenExpiry
      };
    } catch (error) {
      await this.auditLogger.logLogin({
        username,
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error"
      });
      throw error;
    }
  }
  /**
   * Logout current user
   */
  async logout() {
    try {
      const session = await this.tokenStorage.getActiveSession();
      if (session) {
        await this.tokenStorage.clearSession(session.userId);
        await this.auditLogger.logLogout({
          userId: session.userId,
          username: session.username,
          success: true
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  }
  /**
   * Get current authenticated user with roles
   * Works offline if session exists
   */
  async getCurrentUser() {
    try {
      const session = await this.tokenStorage.getActiveSession();
      if (!session) {
        return null;
      }
      if (this.tokenStorage.isTokenExpired(session.tokenExpiry)) {
        const isOnline = await this.networkStatus.isOnline();
        if (isOnline) {
          try {
            await this.refreshTokenIfNeeded();
            const refreshedSession = await this.tokenStorage.getActiveSession();
            if (!refreshedSession) {
              return null;
            }
            const roles2 = this.rbacManager.getUserRoles(
              refreshedSession.userId
            );
            const permissions2 = this.rbacManager.getUserPermissions(
              refreshedSession.userId
            );
            return {
              id: refreshedSession.userId,
              username: refreshedSession.username,
              email: refreshedSession.email || "",
              firstName: refreshedSession.firstName || "",
              lastName: refreshedSession.lastName || "",
              roles: roles2,
              permissions: permissions2
            };
          } catch (error) {
            await this.tokenStorage.clearSession(session.userId);
            return null;
          }
        } else {
          const tokenExpiry = new Date(session.tokenExpiry);
          const gracePeriodExpiry = new Date(
            tokenExpiry.getTime() + 24 * 60 * 60 * 1e3
          );
          if (/* @__PURE__ */ new Date() > gracePeriodExpiry) {
            await this.tokenStorage.clearSession(session.userId);
            return null;
          }
          console.log("Token expired but within offline grace period");
        }
      }
      const roles = this.rbacManager.getUserRoles(session.userId);
      const permissions = this.rbacManager.getUserPermissions(session.userId);
      return {
        id: session.userId,
        username: session.username,
        email: session.email || "",
        firstName: session.firstName || "",
        lastName: session.lastName || "",
        roles,
        permissions
      };
    } catch (error) {
      console.error("Get current user error:", error);
      return null;
    }
  }
  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    const user = await this.getCurrentUser();
    return user !== null;
  }
  /**
   * Refresh token if needed
   * Called automatically when token is expired and network is available
   */
  async refreshTokenIfNeeded() {
    try {
      const session = await this.tokenStorage.getActiveSession();
      if (!session) {
        return;
      }
      const tokenExpiry = new Date(session.tokenExpiry);
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1e3);
      if (tokenExpiry > fiveMinutesFromNow) {
        return;
      }
      const isOnline = await this.networkStatus.isOnline();
      if (!isOnline) {
        console.log("Cannot refresh token: offline");
        return;
      }
      const response = await this.apiClient.refreshToken(session.refreshToken);
      await this.tokenStorage.updateTokens(
        session.userId,
        response.accessToken,
        response.refreshToken,
        3600
        // 60 minutes
      );
      await this.auditLogger.logRefresh({
        userId: session.userId,
        username: session.username,
        success: true
      });
      console.log("Token refreshed successfully");
    } catch (error) {
      const session = await this.tokenStorage.getActiveSession();
      if (session) {
        await this.auditLogger.logRefresh({
          userId: session.userId,
          username: session.username,
          success: false,
          errorMessage: error instanceof Error ? error.message : "Unknown error"
        });
      }
      throw error;
    }
  }
  /**
   * Manual token refresh (can be called by UI)
   */
  async refreshToken() {
    await this.refreshTokenIfNeeded();
  }
  /**
   * Get network status
   */
  isOnline() {
    return this.networkStatus.isOnline();
  }
  /**
   * Cleanup resources
   */
  cleanup() {
    this.networkStatus.stopMonitoring();
  }
}
const __dirname$1 = path$1.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path$1.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path$1.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path$1.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path$1.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
let authManager;
function createWindow() {
  win = new BrowserWindow({
    icon: path$1.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path$1.join(__dirname$1, "preload.mjs")
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path$1.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (authManager) {
      authManager.cleanup();
    }
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
function initializeAuth() {
  const db = createDatabase();
  authManager = new AuthManager(db);
}
function setupAuthHandlers() {
  ipcMain.handle(
    "auth:login",
    async (_event, username, password) => {
      try {
        const result = await authManager.login(username, password);
        return { success: true, data: result };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Login failed"
        };
      }
    }
  );
  ipcMain.handle("auth:logout", async () => {
    try {
      await authManager.logout();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Logout failed"
      };
    }
  });
  ipcMain.handle("auth:getCurrentUser", async () => {
    try {
      const user = await authManager.getCurrentUser();
      return { success: true, data: user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get user"
      };
    }
  });
  ipcMain.handle("auth:checkAuthStatus", async () => {
    try {
      const isAuthenticated = await authManager.isAuthenticated();
      return { success: true, data: { isAuthenticated } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to check auth status"
      };
    }
  });
  ipcMain.handle("auth:refreshToken", async () => {
    try {
      await authManager.refreshToken();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Token refresh failed"
      };
    }
  });
  ipcMain.handle("auth:isOnline", async () => {
    try {
      const isOnline = await authManager.isOnline();
      return { success: true, data: { isOnline } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to check online status"
      };
    }
  });
  ipcMain.handle("auth:getPermissions", async () => {
    try {
      const user = await authManager.getCurrentUser();
      if (!user) {
        return { success: false, error: "Not authenticated" };
      }
      return { success: true, data: user.permissions };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get permissions"
      };
    }
  });
  ipcMain.handle("auth:getRoles", async () => {
    try {
      const user = await authManager.getCurrentUser();
      if (!user) {
        return { success: false, error: "Not authenticated" };
      }
      return { success: true, data: user.roles };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get roles"
      };
    }
  });
  ipcMain.handle(
    "auth:checkPermission",
    async (_event, permissionCode) => {
      try {
        const user = await authManager.getCurrentUser();
        if (!user) {
          return { success: false, error: "Not authenticated" };
        }
        const hasPermission = user.permissions.includes(permissionCode);
        return { success: true, data: hasPermission };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to check permission"
        };
      }
    }
  );
  ipcMain.handle("rbac:getAllRoles", async () => {
    try {
      const rbacManager = authManager.getRBACManager();
      const roles = rbacManager.getAllRoles();
      return { success: true, data: roles };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get roles"
      };
    }
  });
  ipcMain.handle("rbac:getAllPermissions", async () => {
    try {
      const rbacManager = authManager.getRBACManager();
      const permissions = rbacManager.getAllPermissions();
      return { success: true, data: permissions };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get permissions"
      };
    }
  });
  ipcMain.handle("users:getAll", async () => {
    try {
      const rbacManager = authManager.getRBACManager();
      const users = rbacManager.getAllUsers();
      return { success: true, data: users };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get users"
      };
    }
  });
  ipcMain.handle("users:getById", async (_event, userId) => {
    try {
      const rbacManager = authManager.getRBACManager();
      const user = rbacManager.getUserById(userId);
      if (!user) {
        return { success: false, error: "User not found" };
      }
      return { success: true, data: user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get user"
      };
    }
  });
  ipcMain.handle(
    "users:create",
    async (_event, userData) => {
      try {
        const rbacManager = authManager.getRBACManager();
        const user = rbacManager.createUser(userData);
        return { success: true, data: user };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to create user"
        };
      }
    }
  );
  ipcMain.handle(
    "users:update",
    async (_event, userId, userData) => {
      try {
        const rbacManager = authManager.getRBACManager();
        const user = rbacManager.updateUser(userId, userData);
        if (!user) {
          return { success: false, error: "User not found" };
        }
        return { success: true, data: user };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to update user"
        };
      }
    }
  );
  ipcMain.handle("users:delete", async (_event, userId) => {
    try {
      const rbacManager = authManager.getRBACManager();
      const success = rbacManager.deleteUser(userId);
      if (!success) {
        return { success: false, error: "Failed to delete user" };
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete user"
      };
    }
  });
  ipcMain.handle("users:toggleStatus", async (_event, userId) => {
    try {
      const rbacManager = authManager.getRBACManager();
      const user = rbacManager.toggleUserStatus(userId);
      if (!user) {
        return { success: false, error: "User not found" };
      }
      return { success: true, data: user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to toggle user status"
      };
    }
  });
}
app.whenReady().then(() => {
  initializeAuth();
  setupAuthHandlers();
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
