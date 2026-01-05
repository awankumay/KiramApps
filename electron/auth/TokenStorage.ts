import { safeStorage } from "electron";
import { createRequire } from "module";

// Use createRequire for CommonJS modules like better-sqlite3
const require = createRequire(import.meta.url);
const BetterSqlite3 = require("better-sqlite3");

type DatabaseInstance = ReturnType<typeof BetterSqlite3>;

export interface AuthSession {
  id?: number;
  userId: number;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds from now
  createdAt?: string;
  lastRefreshedAt?: string;
}

export interface StoredSession {
  id: number;
  userId: number;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  tokenExpiry: string;
  isActive: boolean;
  createdAt: string;
  lastRefreshedAt?: string;
}

/**
 * TokenStorage handles secure storage and retrieval of authentication tokens
 * Uses Electron's safeStorage API (Windows DPAPI) for encryption
 */
export class TokenStorage {
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  /**
   * Store a new authentication session with encrypted tokens
   */
  async storeSession(session: AuthSession): Promise<void> {
    try {
      // Encrypt tokens using Electron safeStorage (Windows DPAPI)
      const accessTokenEncrypted = safeStorage.encryptString(
        session.accessToken
      );
      const refreshTokenEncrypted = safeStorage.encryptString(
        session.refreshToken
      );

      // Calculate token expiry timestamp
      const tokenExpiry = new Date(
        Date.now() + session.expiresIn * 1000
      ).toISOString();

      console.log(
        `Storing session for user ${session.userId} (${session.username})`
      );

      // Deactivate any existing sessions for this user
      const deactivateStmt = this.db.prepare(
        "UPDATE auth_sessions SET is_active = 0 WHERE user_id = ?"
      );
      const deactivateResult = deactivateStmt.run(session.userId);
      console.log(`Deactivated ${deactivateResult.changes} existing sessions`);

      // Insert new session
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
        `Failed to store session: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Retrieve the active authentication session with decrypted tokens
   */
  async getActiveSession(): Promise<
    (StoredSession & { accessToken: string; refreshToken: string }) | null
  > {
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

      const row = stmt.get() as any;

      if (!row) {
        return null;
      }

      // Decrypt tokens
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
        refreshToken,
      };
    } catch (error) {
      throw new Error(
        `Failed to retrieve session: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Update tokens for an existing session (used during token refresh)
   */
  async updateTokens(
    userId: number,
    accessToken: string,
    refreshToken: string,
    expiresIn: number
  ): Promise<void> {
    try {
      const accessTokenEncrypted = safeStorage.encryptString(accessToken);
      const refreshTokenEncrypted = safeStorage.encryptString(refreshToken);
      const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();
      const now = new Date().toISOString();

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
        `Failed to update tokens: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Clear active session (logout)
   */
  async clearSession(userId?: number): Promise<void> {
    try {
      if (userId) {
        const stmt = this.db.prepare(
          "UPDATE auth_sessions SET is_active = 0 WHERE user_id = ?"
        );
        stmt.run(userId);
      } else {
        // Clear all active sessions
        const stmt = this.db.prepare(
          "UPDATE auth_sessions SET is_active = 0 WHERE is_active = 1"
        );
        stmt.run();
      }
    } catch (error) {
      throw new Error(
        `Failed to clear session: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(tokenExpiry: string): boolean {
    return new Date(tokenExpiry) <= new Date();
  }
}
