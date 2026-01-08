import { useMemo } from "react";
import { useAuth } from "../Contexts/AuthContext";

/**
 * Hook to check if the current user has a specific permission
 */
export function usePermission(permission: string): boolean {
  const { hasPermission } = useAuth();
  return useMemo(() => hasPermission(permission), [hasPermission, permission]);
}

/**
 * Hook to check multiple permissions at once
 * Returns an array of booleans corresponding to each permission
 */
export function usePermissions(permissions: string[]): boolean[] {
  const { hasPermission } = useAuth();
  return useMemo(
    () => permissions.map((p) => hasPermission(p)),
    [hasPermission, permissions]
  );
}

/**
 * Hook to check if user has any of the specified permissions
 */
export function useHasAnyPermission(permissions: string[]): boolean {
  const { hasAnyPermission } = useAuth();
  return useMemo(
    () => hasAnyPermission(permissions),
    [hasAnyPermission, permissions]
  );
}

/**
 * Hook to check if user has all of the specified permissions
 */
export function useHasAllPermissions(permissions: string[]): boolean {
  const { hasAllPermissions } = useAuth();
  return useMemo(
    () => hasAllPermissions(permissions),
    [hasAllPermissions, permissions]
  );
}

/**
 * Hook to check if user has a specific role
 */
export function useRole(role: string): boolean {
  const { hasRole } = useAuth();
  return useMemo(() => hasRole(role), [hasRole, role]);
}
