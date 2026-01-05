import { TokenStorage } from "./TokenStorage";
import { AuditLogger } from "./AuditLogger";
import { DummyJSONClient } from "./DummyJSONClient";
import { NetworkStatus } from "./NetworkStatus";
import { RBACManager } from "./RBACManager";
import { createRequire } from "module";
import { createHash } from "crypto";

// Use createRequire for CommonJS modules like better-sqlite3
const require = createRequire(import.meta.url);
const BetterSqlite3 = require("better-sqlite3");

type DatabaseInstance = ReturnType<typeof BetterSqlite3>;

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface UserWithRoles extends User {
  roles: string[];
  permissions: string[];
}

export interface AuthResult {
  user: UserWithRoles;
  expiresAt: string;
}

/**
 * AuthManager orchestrates authentication flow
 * Coordinates between TokenStorage, DummyJSONClient, AuditLogger, and RBACManager
 */
export class AuthManager {
  private tokenStorage: TokenStorage;
  private auditLogger: AuditLogger;
  private apiClient: DummyJSONClient;
  private networkStatus: NetworkStatus;
  private rbacManager: RBACManager;
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
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
  getRBACManager(): RBACManager {
    return this.rbacManager;
  }

  /**
   * Login with username and password
   * Tries DummyJSON API first, falls back to local SQLite authentication
   */
  async login(username: string, password: string): Promise<AuthResult> {
    try {
      // Try DummyJSON API first if online
      const isOnline = await this.networkStatus.isOnline();

      if (isOnline) {
        try {
          const response = await this.apiClient.login(username, password);

          // Store session
          await this.tokenStorage.storeSession({
            userId: response.id,
            username: response.username,
            email: response.email,
            firstName: response.firstName,
            lastName: response.lastName,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            expiresIn: 3600, // 60 minutes in seconds
          });

          // Log successful login
          await this.auditLogger.logLogin({
            userId: response.id,
            username: response.username,
            success: true,
          });

          const session = await this.tokenStorage.getActiveSession();
          if (!session) {
            throw new Error("Session not found after login");
          }

          // Load user roles and permissions
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
              permissions,
            },
            expiresAt: session.tokenExpiry,
          };
        } catch (apiError) {
          // API login failed, try local authentication
          console.log("API login failed, trying local authentication");
          return this.loginLocal(username, password);
        }
      } else {
        // Offline, try local authentication
        console.log("Offline, trying local authentication");
        return this.loginLocal(username, password);
      }
    } catch (error) {
      // Log failed login
      await this.auditLogger.logLogin({
        username,
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  }

  /**
   * Login with local SQLite database
   * Used as fallback when DummyJSON API is unavailable
   */
  private async loginLocal(
    username: string,
    password: string
  ): Promise<AuthResult> {
    try {
      // Hash the password (same as RBACManager)
      const passwordHash = createHash("sha256").update(password).digest("hex");

      // Find user in local database
      const stmt = this.db.prepare(`
        SELECT id, username, email, first_name as firstName, last_name as lastName, status
        FROM users
        WHERE username = ? AND password_hash = ? AND status = 'active'
      `);

      const user = stmt.get(username, passwordHash) as
        | {
            id: number;
            username: string;
            email: string;
            firstName: string;
            lastName: string;
            status: string;
          }
        | undefined;

      if (!user) {
        await this.auditLogger.logLogin({
          username,
          success: false,
          errorMessage: "Invalid username or password",
        });
        throw new Error("Invalid username or password");
      }

      // Create session with dummy tokens (local auth doesn't use real tokens)
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
        expiresIn: 3600 * 24, // 24 hours for local auth
      });

      // Log successful local login
      await this.auditLogger.logLogin({
        userId: user.id,
        username: user.username,
        success: true,
      });

      const session = await this.tokenStorage.getActiveSession();
      if (!session) {
        throw new Error("Session not found after local login");
      }

      // Load user roles and permissions
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
          permissions,
        },
        expiresAt: session.tokenExpiry,
      };
    } catch (error) {
      // Log failed local login
      await this.auditLogger.logLogin({
        username,
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      const session = await this.tokenStorage.getActiveSession();

      if (session) {
        await this.tokenStorage.clearSession(session.userId);

        await this.auditLogger.logLogout({
          userId: session.userId,
          username: session.username,
          success: true,
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
  async getCurrentUser(): Promise<UserWithRoles | null> {
    try {
      const session = await this.tokenStorage.getActiveSession();

      if (!session) {
        return null;
      }

      // Check if token is expired
      if (this.tokenStorage.isTokenExpired(session.tokenExpiry)) {
        // Try to refresh if online
        const isOnline = await this.networkStatus.isOnline();

        if (isOnline) {
          try {
            await this.refreshTokenIfNeeded();
            const refreshedSession = await this.tokenStorage.getActiveSession();

            if (!refreshedSession) {
              return null;
            }

            // Load roles and permissions
            const roles = this.rbacManager.getUserRoles(
              refreshedSession.userId
            );
            const permissions = this.rbacManager.getUserPermissions(
              refreshedSession.userId
            );

            return {
              id: refreshedSession.userId,
              username: refreshedSession.username,
              email: refreshedSession.email || "",
              firstName: refreshedSession.firstName || "",
              lastName: refreshedSession.lastName || "",
              roles,
              permissions,
            };
          } catch (error) {
            // Refresh failed, clear session
            await this.tokenStorage.clearSession(session.userId);
            return null;
          }
        } else {
          // Offline with expired token - allow grace period of 24 hours
          const tokenExpiry = new Date(session.tokenExpiry);
          const gracePeriodExpiry = new Date(
            tokenExpiry.getTime() + 24 * 60 * 60 * 1000
          );

          if (new Date() > gracePeriodExpiry) {
            // Grace period expired
            await this.tokenStorage.clearSession(session.userId);
            return null;
          }

          // Within grace period, allow offline access
          console.log("Token expired but within offline grace period");
        }
      }

      // Load roles and permissions
      const roles = this.rbacManager.getUserRoles(session.userId);
      const permissions = this.rbacManager.getUserPermissions(session.userId);

      return {
        id: session.userId,
        username: session.username,
        email: session.email || "",
        firstName: session.firstName || "",
        lastName: session.lastName || "",
        roles,
        permissions,
      };
    } catch (error) {
      console.error("Get current user error:", error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  }

  /**
   * Refresh token if needed
   * Called automatically when token is expired and network is available
   */
  private async refreshTokenIfNeeded(): Promise<void> {
    try {
      const session = await this.tokenStorage.getActiveSession();

      if (!session) {
        return;
      }

      // Check if token will expire soon (within 5 minutes)
      const tokenExpiry = new Date(session.tokenExpiry);
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

      if (tokenExpiry > fiveMinutesFromNow) {
        // Token still valid, no need to refresh
        return;
      }

      // Check if online
      const isOnline = await this.networkStatus.isOnline();
      if (!isOnline) {
        console.log("Cannot refresh token: offline");
        return;
      }

      // Refresh the token
      const response = await this.apiClient.refreshToken(session.refreshToken);

      // Update stored tokens
      await this.tokenStorage.updateTokens(
        session.userId,
        response.accessToken,
        response.refreshToken,
        3600 // 60 minutes
      );

      // Log successful refresh
      await this.auditLogger.logRefresh({
        userId: session.userId,
        username: session.username,
        success: true,
      });

      console.log("Token refreshed successfully");
    } catch (error) {
      const session = await this.tokenStorage.getActiveSession();

      // Log failed refresh
      if (session) {
        await this.auditLogger.logRefresh({
          userId: session.userId,
          username: session.username,
          success: false,
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
        });
      }

      throw error;
    }
  }

  /**
   * Manual token refresh (can be called by UI)
   */
  async refreshToken(): Promise<void> {
    await this.refreshTokenIfNeeded();
  }

  /**
   * Get network status
   */
  isOnline(): Promise<boolean> {
    return this.networkStatus.isOnline();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.networkStatus.stopMonitoring();
  }
}
