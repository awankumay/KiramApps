export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface AuthResult {
  user: User;
  expiresAt: string;
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
        getCurrentUser: () => Promise<ApiResponse<User | null>>;
        checkAuthStatus: () => Promise<
          ApiResponse<{ isAuthenticated: boolean }>
        >;
        refreshToken: () => Promise<ApiResponse<void>>;
        isOnline: () => Promise<ApiResponse<{ isOnline: boolean }>>;
      };
    };
  }
}

export {};
