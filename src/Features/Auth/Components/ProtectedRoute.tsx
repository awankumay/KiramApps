import { ReactNode } from "react";
import { useAuth } from "../Contexts/AuthContext";
import { UnauthorizedPage } from "./UnauthorizedPage";

interface ProtectedRouteProps {
  /** Required permissions to access this route */
  permissions?: string[];
  /** Mode for permission checking: 'all' or 'any' */
  mode?: "all" | "any";
  /** Required roles to access this route */
  roles?: string[];
  /** Children to render when authorized */
  children: ReactNode;
}

/**
 * Component that protects routes based on permissions or roles
 * Renders UnauthorizedPage if user doesn't have required access
 *
 * @example
 * <Route
 *   path="/transactions/create"
 *   element={
 *     <ProtectedRoute permissions={["CREATE_TRANSACTION"]}>
 *       <CreateTransactionPage />
 *     </ProtectedRoute>
 *   }
 * />
 */
export function ProtectedRoute({
  permissions,
  mode = "all",
  roles,
  children,
}: ProtectedRouteProps) {
  const {
    isAuthenticated,
    isLoading,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
  } = useAuth();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memeriksa izin akses...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, this should be handled by parent auth check
  if (!isAuthenticated) {
    return <UnauthorizedPage message="Silakan login terlebih dahulu." />;
  }

  // Check permissions if specified
  if (permissions && permissions.length > 0) {
    const hasRequiredPermissions =
      mode === "any"
        ? hasAnyPermission(permissions)
        : hasAllPermissions(permissions);

    if (!hasRequiredPermissions) {
      return <UnauthorizedPage />;
    }
  }

  // Check roles if specified
  if (roles && roles.length > 0) {
    const hasRequiredRole = roles.some((role) => hasRole(role));
    if (!hasRequiredRole) {
      return <UnauthorizedPage />;
    }
  }

  // Authorized - render children
  return <>{children}</>;
}
