/**
 * RBAC Type Definitions
 * Role-Based Access Control types for use in both main and renderer processes
 */

// Role codes
export enum Role {
  SUPERADMIN = "SUPERADMIN",
  CHECKER = "CHECKER",
  LOADER = "LOADER",
}

// Permission codes
export enum Permission {
  VIEW_DASHBOARD = "VIEW_DASHBOARD",
  CREATE_TRANSACTION = "CREATE_TRANSACTION",
  VIEW_TRANSACTION = "VIEW_TRANSACTION",
  EDIT_TRANSACTION = "EDIT_TRANSACTION",
  DELETE_TRANSACTION = "DELETE_TRANSACTION",
  MANAGE_TRANSACTION_STATUS = "MANAGE_TRANSACTION_STATUS",
  MANAGE_TRANSACTION_TYPES = "MANAGE_TRANSACTION_TYPES",
  MANAGE_PAYMENT_METHODS = "MANAGE_PAYMENT_METHODS",
  MANAGE_LOADERS = "MANAGE_LOADERS",
  VERIFY_PAYMENT = "VERIFY_PAYMENT",
  VIEW_LOADER_QUEUE = "VIEW_LOADER_QUEUE",
  UPDATE_LOADER_STATUS = "UPDATE_LOADER_STATUS",
  MANAGE_USERS = "MANAGE_USERS",
  MANAGE_ROLES = "MANAGE_ROLES",
  MANAGE_ITEMS = "MANAGE_ITEMS",
  VIEW_REPORTS = "VIEW_REPORTS",
  MANAGE_CUSTOMERS = "MANAGE_CUSTOMERS",
  MANAGE_VEHICLES = "MANAGE_VEHICLES",
  MANAGE_SETTINGS = "MANAGE_SETTINGS",
  MANAGE_SYNC = "MANAGE_SYNC",
}

// Role definitions with metadata
export interface RoleDefinition {
  id: number;
  code: Role;
  name: string;
  description: string;
}

// Permission definitions with metadata
export interface PermissionDefinition {
  id: number;
  code: Permission;
  name: string;
  description: string;
}

// Role-permission mapping
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPERADMIN]: Object.values(Permission), // All permissions
  [Role.CHECKER]: [
    Permission.VIEW_DASHBOARD,
    Permission.CREATE_TRANSACTION,
    Permission.VIEW_TRANSACTION,
    Permission.EDIT_TRANSACTION,
    Permission.DELETE_TRANSACTION,
    Permission.MANAGE_TRANSACTION_STATUS,
    Permission.VERIFY_PAYMENT,
  ],
  [Role.LOADER]: [
    Permission.VIEW_LOADER_QUEUE,
    Permission.UPDATE_LOADER_STATUS,
  ],
};

// Landing pages per role
export const ROLE_LANDING_PAGES: Record<Role, string> = {
  [Role.SUPERADMIN]: "/dashboard",
  [Role.CHECKER]: "/checker/transactions/create",
  [Role.LOADER]: "/loader/queue",
};

// User with roles interface
export interface UserWithRoles {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Role[];
  permissions: Permission[];
}

// Auth result with roles
export interface AuthResultWithRoles {
  user: UserWithRoles;
  expiresAt: string;
}
