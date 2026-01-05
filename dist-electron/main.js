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
const require$4 = createRequire(import.meta.url);
const BetterSqlite3 = require$4("better-sqlite3");
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
const require$3 = createRequire(import.meta.url);
require$3("better-sqlite3");
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
const require$2 = createRequire(import.meta.url);
require$2("better-sqlite3");
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
const require$1 = createRequire(import.meta.url);
require$1("better-sqlite3");
class AuthManager {
  constructor(db) {
    __publicField(this, "tokenStorage");
    __publicField(this, "auditLogger");
    __publicField(this, "apiClient");
    __publicField(this, "networkStatus");
    this.tokenStorage = new TokenStorage(db);
    this.auditLogger = new AuditLogger(db);
    this.apiClient = new DummyJSONClient();
    this.networkStatus = new NetworkStatus();
  }
  /**
   * Login with username and password
   * Requires internet connection
   */
  async login(username, password) {
    try {
      const isOnline = await this.networkStatus.isOnline();
      if (!isOnline) {
        await this.auditLogger.logLogin({
          username,
          success: false,
          errorMessage: "No internet connection"
        });
        throw new NetworkError("Cannot login: No internet connection");
      }
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
      return {
        user: {
          id: response.id,
          username: response.username,
          email: response.email,
          firstName: response.firstName,
          lastName: response.lastName
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
   * Get current authenticated user
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
            return {
              id: refreshedSession.userId,
              username: refreshedSession.username,
              email: refreshedSession.email || "",
              firstName: refreshedSession.firstName || "",
              lastName: refreshedSession.lastName || ""
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
      return {
        id: session.userId,
        username: session.username,
        email: session.email || "",
        firstName: session.firstName || "",
        lastName: session.lastName || ""
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
