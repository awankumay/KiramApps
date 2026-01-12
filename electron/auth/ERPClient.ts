import { SettingsManager, DEFAULT_ERP_API_URL } from "./SettingsManager";
import type { Database } from "better-sqlite3";

export interface LoginResponse {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  gender: string;
  image: string;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  gender: string;
  image: string;
}

export interface ConnectionTestResult {
  success: boolean;
  latencyMs: number;
  message: string;
  serverVersion?: string;
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

export class AuthenticationError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = "AuthenticationError";
  }
}

/**
 * ERPClient handles HTTP communication with ERP Cloud API
 * Provides methods for login, token refresh, user profile retrieval, and connection testing
 *
 * The baseUrl can be configured via:
 * 1. Constructor parameter (highest priority)
 * 2. SettingsManager from database
 * 3. Default fallback URL
 */
export class ERPClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private static instance: ERPClient | null = null;
  private static settingsManager: SettingsManager | null = null;

  /**
   * Create ERPClient instance
   * @param baseUrl - Optional base URL, if not provided will load from settings or use default
   * @param timeout - Request timeout in milliseconds (default: 5000)
   */
  constructor(baseUrl?: string, timeout = 5000) {
    this.baseUrl = baseUrl || this.loadBaseUrl();
    this.timeout = timeout;
  }

  /**
   * Load base URL from settings or use default
   */
  private loadBaseUrl(): string {
    if (ERPClient.settingsManager) {
      return ERPClient.settingsManager.getErpApiUrl();
    }
    return DEFAULT_ERP_API_URL;
  }

  /**
   * Initialize SettingsManager for ERPClient
   * Should be called once during app initialization
   */
  static initializeSettings(db: Database): void {
    ERPClient.settingsManager = new SettingsManager(db);
  }

  /**
   * Get the configured SettingsManager
   */
  static getSettingsManager(): SettingsManager | null {
    return ERPClient.settingsManager;
  }

  /**
   * Get or create default ERPClient instance
   * Uses settings from database if available
   */
  static getDefault(): ERPClient {
    if (!ERPClient.instance) {
      ERPClient.instance = new ERPClient();
    }
    return ERPClient.instance;
  }

  /**
   * Reset the default instance (useful when settings change)
   */
  static resetInstance(): void {
    ERPClient.instance = null;
  }

  /**
   * Get the current base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Login with username and password
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": `KiramApps/Electron`,
          },
          body: JSON.stringify({
            username,
            password,
            expiresInMins: 60, // Token expires in 60 minutes
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new AuthenticationError(
          errorData.message || "Authentication failed",
          response.status
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new NetworkError(
        `Login failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get current user profile using access token
   */
  async getCurrentUser(accessToken: string): Promise<UserProfile> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": `KiramApps/Electron`,
        },
      });

      if (!response.ok) {
        throw new AuthenticationError(
          "Failed to get user profile",
          response.status
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new NetworkError(
        `Get user failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<RefreshResponse> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/auth/refresh`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": `KiramApps/Electron`,
          },
          body: JSON.stringify({
            refreshToken,
            expiresInMins: 60,
          }),
        }
      );

      if (!response.ok) {
        throw new AuthenticationError("Token refresh failed", response.status);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new NetworkError(
        `Token refresh failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Fetch with timeout support
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new NetworkError("Request timeout");
      }
      throw error;
    }
  }

  /**
   * Test connection to ERP Cloud API
   * Attempts to reach the health check or base endpoint
   */
  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      // Try health check endpoint first, fallback to base URL
      const endpoints = [`${this.baseUrl}/health`, `${this.baseUrl}`];

      for (const endpoint of endpoints) {
        try {
          const response = await this.fetchWithTimeout(endpoint, {
            method: "GET",
            headers: {
              "User-Agent": "KiramApps/Electron",
            },
          });

          const latencyMs = Date.now() - startTime;

          if (response.ok) {
            let serverVersion: string | undefined;
            try {
              const data = await response.json();
              serverVersion = data.version || data.app_version;
            } catch {
              // Response might not be JSON
            }

            return {
              success: true,
              latencyMs,
              message: "Connection successful",
              serverVersion,
            };
          }

          // If response is not ok but we got a response, server is reachable
          if (response.status < 500) {
            return {
              success: true,
              latencyMs,
              message: `Server reachable (status: ${response.status})`,
            };
          }
        } catch {
          // Try next endpoint
          continue;
        }
      }

      return {
        success: false,
        latencyMs: Date.now() - startTime,
        message: "Could not reach server",
      };
    } catch (error) {
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        message: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }

  /**
   * Static method to test connection to a specific URL
   */
  static async testConnectionTo(
    url: string,
    timeout = 5000
  ): Promise<ConnectionTestResult> {
    const client = new ERPClient(url, timeout);
    return client.testConnection();
  }
}
