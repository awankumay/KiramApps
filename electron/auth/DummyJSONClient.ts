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
 * DummyJSONClient handles HTTP communication with DummyJSON Auth API
 * Provides methods for login, token refresh, and user profile retrieval
 */
export class DummyJSONClient {
  private readonly baseUrl = "https://dummyjson.com";
  private readonly timeout = 5000; // 5 seconds

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
            "User-Agent": `KiramSuratMasuk/Electron`,
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
          "User-Agent": `KiramSuratMasuk/Electron`,
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
            "User-Agent": `KiramSuratMasuk/Electron`,
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
}
