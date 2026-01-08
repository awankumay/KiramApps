import { createRequire } from "module";

// Use createRequire for CommonJS modules like better-sqlite3
const require = createRequire(import.meta.url);
const BetterSqlite3 = require("better-sqlite3");

type DatabaseInstance = ReturnType<typeof BetterSqlite3>;

interface AuthEventRow {
  id: number;
  eventType:
    | "LOGIN"
    | "LOGOUT"
    | "REFRESH"
    | "VALIDATION_FAILURE"
    | "TOKEN_EXPIRED";
  userId: number | null;
  username: string | null;
  success: number;
  errorMessage: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuthEvent {
  eventType:
    | "LOGIN"
    | "LOGOUT"
    | "REFRESH"
    | "VALIDATION_FAILURE"
    | "TOKEN_EXPIRED";
  userId?: number;
  username?: string;
  success: boolean;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface StoredAuthEvent extends AuthEvent {
  id: number;
  createdAt: string;
}

/**
 * AuditLogger handles logging of all authentication events
 * Provides audit trail for security and debugging
 */
export class AuditLogger {
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  /**
   * Log a login attempt
   */
  async logLogin(event: Omit<AuthEvent, "eventType">): Promise<void> {
    await this.logEvent({
      ...event,
      eventType: "LOGIN",
    });
  }

  /**
   * Log a logout event
   */
  async logLogout(event: Omit<AuthEvent, "eventType">): Promise<void> {
    await this.logEvent({
      ...event,
      eventType: "LOGOUT",
    });
  }

  /**
   * Log a token refresh event
   */
  async logRefresh(event: Omit<AuthEvent, "eventType">): Promise<void> {
    await this.logEvent({
      ...event,
      eventType: "REFRESH",
    });
  }

  /**
   * Log a validation failure
   */
  async logValidationFailure(
    event: Omit<AuthEvent, "eventType">
  ): Promise<void> {
    await this.logEvent({
      ...event,
      eventType: "VALIDATION_FAILURE",
    });
  }

  /**
   * Log an authentication event
   */
  private async logEvent(event: AuthEvent): Promise<void> {
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
      // Log errors but don't throw - audit logging shouldn't break auth flow
      console.error("Failed to log auth event:", error);
    }
  }

  /**
   * Get recent authentication events
   */
  async getRecentEvents(limit: number = 100): Promise<StoredAuthEvent[]> {
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

      const rows = stmt.all(limit) as AuthEventRow[];

      return rows.map((row) => ({
        id: row.id,
        eventType: row.eventType,
        userId: row.userId ?? undefined,
        username: row.username ?? undefined,
        success: Boolean(row.success),
        errorMessage: row.errorMessage ?? undefined,
        ipAddress: row.ipAddress ?? undefined,
        userAgent: row.userAgent ?? undefined,
        createdAt: row.createdAt,
      }));
    } catch (error) {
      console.error("Failed to retrieve auth events:", error);
      return [];
    }
  }

  /**
   * Get events for a specific user
   */
  async getUserEvents(
    userId: number,
    limit: number = 50
  ): Promise<StoredAuthEvent[]> {
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

      const rows = stmt.all(userId, limit) as AuthEventRow[];

      return rows.map((row) => ({
        id: row.id,
        eventType: row.eventType,
        userId: row.userId ?? undefined,
        username: row.username ?? undefined,
        success: Boolean(row.success),
        errorMessage: row.errorMessage ?? undefined,
        ipAddress: row.ipAddress ?? undefined,
        userAgent: row.userAgent ?? undefined,
        createdAt: row.createdAt,
      }));
    } catch (error) {
      console.error("Failed to retrieve user events:", error);
      return [];
    }
  }
}
