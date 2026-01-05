import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import type { UserWithRoles } from "@Shared/Types/Electron";

interface AuthContextType {
  user: UserWithRoles | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // Auth methods
  login: (
    username: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  // RBAC helpers
  permissions: string[];
  roles: string[];
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserWithRoles | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load current user on mount
  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      setIsLoading(true);
      const response = await window.api.auth.getCurrentUser();

      if (response.success && response.data) {
        setUser(response.data);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to load current user:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await window.api.auth.login(username, password);

      if (response.success && response.data) {
        setUser(response.data.user);
        return { success: true };
      } else {
        return {
          success: false,
          error: response.error || "Login failed",
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Login failed",
      };
    }
  };

  const logout = async () => {
    try {
      await window.api.auth.logout();
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
      // Clear user anyway
      setUser(null);
    }
  };

  const refreshUser = async () => {
    await loadCurrentUser();
  };

  // RBAC helper functions
  const permissions = user?.permissions ?? [];
  const roles = user?.roles ?? [];

  const hasPermission = useCallback(
    (permission: string) => {
      return permissions.includes(permission);
    },
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (perms: string[]) => {
      return perms.some((p) => permissions.includes(p));
    },
    [permissions]
  );

  const hasAllPermissions = useCallback(
    (perms: string[]) => {
      return perms.every((p) => permissions.includes(p));
    },
    [permissions]
  );

  const hasRole = useCallback(
    (role: string) => {
      return roles.includes(role);
    },
    [roles]
  );

  const value: AuthContextType = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    logout,
    refreshUser,
    // RBAC
    permissions,
    roles,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
