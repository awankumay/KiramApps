import { ReactNode } from "react";
import { useAuth } from "../Contexts/AuthContext";

interface PermissionGuardProps {
  /** Single permission to check */
  permission?: string;
  /** Multiple permissions to check */
  permissions?: string[];
  /** Mode for multiple permissions: 'all' requires all, 'any' requires at least one */
  mode?: "all" | "any";
  /** Fallback content when unauthorized (default: null) */
  fallback?: ReactNode;
  /** Children to render when authorized */
  children: ReactNode;
}

/**
 * Component that conditionally renders children based on user permissions
 *
 * @example
 * // Single permission
 * <PermissionGuard permission="CREATE_TRANSACTION">
 *   <CreateButton />
 * </PermissionGuard>
 *
 * @example
 * // Multiple permissions (all required)
 * <PermissionGuard permissions={["VIEW_TRANSACTION", "CREATE_TRANSACTION"]} mode="all">
 *   <TransactionPanel />
 * </PermissionGuard>
 *
 * @example
 * // Any permission sufficient
 * <PermissionGuard permissions={["MANAGE_USERS", "MANAGE_ROLES"]} mode="any">
 *   <AdminSection />
 * </PermissionGuard>
 *
 * @example
 * // With fallback
 * <PermissionGuard permission="VIEW_REPORTS" fallback={<ContactAdmin />}>
 *   <ReportsPage />
 * </PermissionGuard>
 */
export function PermissionGuard({
  permission,
  permissions,
  mode = "all",
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  let isAuthorized = false;

  if (permission) {
    // Single permission check
    isAuthorized = hasPermission(permission);
  } else if (permissions && permissions.length > 0) {
    // Multiple permissions check
    isAuthorized =
      mode === "any"
        ? hasAnyPermission(permissions)
        : hasAllPermissions(permissions);
  } else {
    // No permissions specified, allow access
    isAuthorized = true;
  }

  return isAuthorized ? <>{children}</> : <>{fallback}</>;
}

interface RoleGuardProps {
  /** Role to check */
  role: string;
  /** Fallback content when unauthorized (default: null) */
  fallback?: ReactNode;
  /** Children to render when authorized */
  children: ReactNode;
}

/**
 * Component that conditionally renders children based on user role
 */
export function RoleGuard({ role, fallback = null, children }: RoleGuardProps) {
  const { hasRole } = useAuth();

  return hasRole(role) ? <>{children}</> : <>{fallback}</>;
}
