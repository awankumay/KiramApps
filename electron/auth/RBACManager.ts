import { createRequire } from "module";
import { createHash } from "crypto";

// Use createRequire for CommonJS modules like better-sqlite3
const require = createRequire(import.meta.url);
const BetterSqlite3 = require("better-sqlite3");

type DatabaseInstance = ReturnType<typeof BetterSqlite3>;

/**
 * Simple password hashing using SHA-256
 * For production, consider using bcrypt or argon2
 */
function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

// Role and Permission types (mirrored from shared types for main process)
export interface RoleData {
  id: number;
  code: string;
  name: string;
  description: string;
}

export interface PermissionData {
  id: number;
  code: string;
  name: string;
  description: string;
}

export interface UserData {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt?: string;
  roles: string[];
}

export interface CreateUserData {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  status?: string;
  roles?: string[];
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
  roles?: string[];
}

interface CachedUserPermissions {
  roles: string[];
  permissions: string[];
  cachedAt: number;
}

/**
 * RBACManager handles role-based access control in the main process
 * Manages permission checking, role resolution, and caching
 */
export class RBACManager {
  private db: DatabaseInstance;
  private cache: Map<number, CachedUserPermissions> = new Map();
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  /**
   * Get all roles assigned to a user
   */
  getUserRoles(userId: number): string[] {
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

    const rows = stmt.all(userId) as { code: string }[];
    const roles = rows.map((row) => row.code);

    // Update cache
    this.updateCache(userId, roles);

    return roles;
  }

  /**
   * Get all permissions for a user (aggregated from all roles)
   */
  getUserPermissions(userId: number): string[] {
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

    const rows = stmt.all(userId) as { code: string }[];
    const permissions = rows.map((row) => row.code);

    // Update cache with roles too
    this.updateCache(userId);

    return permissions;
  }

  /**
   * Check if a user has a specific permission
   */
  checkPermission(userId: number, permissionCode: string): boolean {
    const permissions = this.getUserPermissions(userId);
    return permissions.includes(permissionCode);
  }

  /**
   * Check if a user has any of the specified permissions
   */
  hasAnyPermission(userId: number, permissionCodes: string[]): boolean {
    const permissions = this.getUserPermissions(userId);
    return permissionCodes.some((code) => permissions.includes(code));
  }

  /**
   * Check if a user has all of the specified permissions
   */
  hasAllPermissions(userId: number, permissionCodes: string[]): boolean {
    const permissions = this.getUserPermissions(userId);
    return permissionCodes.every((code) => permissions.includes(code));
  }

  /**
   * Get all available roles
   */
  getAllRoles(): RoleData[] {
    const stmt = this.db.prepare(`
      SELECT id, code, name, description FROM roles ORDER BY id
    `);
    return stmt.all() as RoleData[];
  }

  /**
   * Get all available permissions
   */
  getAllPermissions(): PermissionData[] {
    const stmt = this.db.prepare(`
      SELECT id, code, name, description FROM permissions ORDER BY id
    `);
    return stmt.all() as PermissionData[];
  }

  /**
   * Get permissions for a specific role
   */
  getRolePermissions(roleCode: string): string[] {
    const stmt = this.db.prepare(`
      SELECT p.code
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN roles r ON rp.role_id = r.id
      WHERE r.code = ?
    `);

    const rows = stmt.all(roleCode) as { code: string }[];
    return rows.map((row) => row.code);
  }

  /**
   * Assign a role to a user
   */
  assignRole(userId: number, roleCode: string): boolean {
    try {
      const getRoleId = this.db.prepare(`SELECT id FROM roles WHERE code = ?`);
      const roleRow = getRoleId.get(roleCode) as { id: number } | undefined;

      if (!roleRow) {
        console.error(`Role not found: ${roleCode}`);
        return false;
      }

      const insertStmt = this.db.prepare(`
        INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)
      `);
      insertStmt.run(userId, roleRow.id);

      // Invalidate cache
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
  removeRole(userId: number, roleCode: string): boolean {
    try {
      const getRoleId = this.db.prepare(`SELECT id FROM roles WHERE code = ?`);
      const roleRow = getRoleId.get(roleCode) as { id: number } | undefined;

      if (!roleRow) {
        return false;
      }

      const deleteStmt = this.db.prepare(`
        DELETE FROM user_roles WHERE user_id = ? AND role_id = ?
      `);
      deleteStmt.run(userId, roleRow.id);

      // Invalidate cache
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
  getAllUsers(): UserData[] {
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

    const users = stmt.all() as UserData[];

    // Get roles for each user
    return users.map((user) => ({
      ...user,
      roles: this.getUserRoles(user.id),
    }));
  }

  /**
   * Get a single user by ID
   */
  getUserById(userId: number): UserData | null {
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

    const user = stmt.get(userId) as UserData | undefined;
    if (!user) return null;

    return {
      ...user,
      roles: this.getUserRoles(userId),
    };
  }

  /**
   * Create a new user
   */
  createUser(data: CreateUserData): UserData {
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

    const userId = result.lastInsertRowid as number;

    // Assign roles
    if (data.roles && data.roles.length > 0) {
      for (const roleCode of data.roles) {
        this.assignRole(userId, roleCode);
      }
    }

    return this.getUserById(userId)!;
  }

  /**
   * Update an existing user
   */
  updateUser(userId: number, data: UpdateUserData): UserData | null {
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

    // Update roles if provided
    if (data.roles !== undefined) {
      // Remove all existing roles
      const deleteRolesStmt = this.db.prepare(
        `DELETE FROM user_roles WHERE user_id = ?`
      );
      deleteRolesStmt.run(userId);

      // Assign new roles
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
  deleteUser(userId: number): boolean {
    try {
      // First remove user roles
      const deleteRolesStmt = this.db.prepare(
        `DELETE FROM user_roles WHERE user_id = ?`
      );
      deleteRolesStmt.run(userId);

      // Then delete the user
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
  toggleUserStatus(userId: number): UserData | null {
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
  invalidateCache(userId: number): void {
    this.cache.delete(userId);
  }

  /**
   * Clear entire cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cached data for a user if still valid
   */
  private getCachedData(userId: number): CachedUserPermissions | null {
    const cached = this.cache.get(userId);
    if (!cached) return null;

    // Check if cache is still valid
    if (Date.now() - cached.cachedAt > this.cacheTTL) {
      this.cache.delete(userId);
      return null;
    }

    return cached;
  }

  /**
   * Update cache for a user
   */
  private updateCache(userId: number, roles?: string[]): void {
    // Get roles if not provided
    if (!roles) {
      const roleStmt = this.db.prepare(`
        SELECT r.code
        FROM roles r
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = ?
      `);
      const roleRows = roleStmt.all(userId) as { code: string }[];
      roles = roleRows.map((row) => row.code);
    }

    // Get permissions
    const permStmt = this.db.prepare(`
      SELECT DISTINCT p.code
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = ?
    `);
    const permRows = permStmt.all(userId) as { code: string }[];
    const permissions = permRows.map((row) => row.code);

    this.cache.set(userId, {
      roles,
      permissions,
      cachedAt: Date.now(),
    });
  }
}
