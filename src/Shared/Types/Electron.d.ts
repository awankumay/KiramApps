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

export interface AuthResult {
  user: UserWithRoles;
  expiresAt: string;
}

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

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

declare global {
  interface Window {
    api: {
      auth: {
        login: (
          username: string,
          password: string
        ) => Promise<ApiResponse<AuthResult>>;
        logout: () => Promise<ApiResponse<void>>;
        getCurrentUser: () => Promise<ApiResponse<UserWithRoles | null>>;
        checkAuthStatus: () => Promise<
          ApiResponse<{ isAuthenticated: boolean }>
        >;
        refreshToken: () => Promise<ApiResponse<void>>;
        isOnline: () => Promise<ApiResponse<{ isOnline: boolean }>>;
        // RBAC methods
        getPermissions: () => Promise<ApiResponse<string[]>>;
        getRoles: () => Promise<ApiResponse<string[]>>;
        checkPermission: (
          permissionCode: string
        ) => Promise<ApiResponse<boolean>>;
      };
      rbac: {
        getAllRoles: () => Promise<ApiResponse<RoleData[]>>;
        getAllPermissions: () => Promise<ApiResponse<PermissionData[]>>;
      };
      users: {
        getAll: () => Promise<ApiResponse<UserData[]>>;
        getById: (userId: number) => Promise<ApiResponse<UserData>>;
        create: (userData: CreateUserData) => Promise<ApiResponse<UserData>>;
        update: (
          userId: number,
          userData: UpdateUserData
        ) => Promise<ApiResponse<UserData>>;
        delete: (userId: number) => Promise<ApiResponse<void>>;
        toggleStatus: (userId: number) => Promise<ApiResponse<UserData>>;
      };
    };
  }
}

export {};
