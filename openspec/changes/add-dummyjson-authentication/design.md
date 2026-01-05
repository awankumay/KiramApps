# Design Document: DummyJSON Authentication

**Change ID:** `add-dummyjson-authentication`  
**Last Updated:** 2026-01-03

## Architecture Overview

This design document details the technical architecture for implementing authentication in the Surat Masuk Digital application using DummyJSON as a testing backend while maintaining strict offline-first principles.

## Design Principles

1. **Offline-First:** Authentication must not block offline usage after initial setup
2. **Security by Design:** Tokens never exposed to renderer, encrypted at rest
3. **Separation of Concerns:** Auth logic isolated in main process
4. **Future-Proof:** Easy swap from DummyJSON to Laravel backend
5. **Simplicity:** Minimal dependencies, straightforward implementation

---

## System Architecture

### Component Diagram

```
┌───────────────────────────────────────────────────────────┐
│                    Renderer Process                        │
│  ┌──────────────────────────────────────────────────┐    │
│  │            Login Component (React)                │    │
│  │  - Username/Password Form                         │    │
│  │  - Validation & Error Display                     │    │
│  └────────────────────┬─────────────────────────────┘    │
│                       │                                    │
│  ┌────────────────────▼─────────────────────────────┐    │
│  │          Auth Context (React)                     │    │
│  │  - Current user state                             │    │
│  │  - isAuthenticated flag                           │    │
│  │  - Login/Logout methods                           │    │
│  └────────────────────┬─────────────────────────────┘    │
│                       │                                    │
└───────────────────────┼────────────────────────────────────┘
                        │ IPC (contextBridge)
┌───────────────────────▼────────────────────────────────────┐
│                    Main Process                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │              IPC Handlers                         │    │
│  │  - auth:login                                     │    │
│  │  - auth:logout                                    │    │
│  │  - auth:getCurrentUser                            │    │
│  │  - auth:refreshToken                              │    │
│  └────────────────────┬─────────────────────────────┘    │
│                       │                                    │
│  ┌────────────────────▼─────────────────────────────┐    │
│  │           AuthManager (Core Logic)                │    │
│  │  - Login orchestration                            │    │
│  │  - Token lifecycle management                     │    │
│  │  - Session validation                             │    │
│  │  - Offline/Online mode switching                  │    │
│  └──────┬─────────────────────────┬──────────────────┘    │
│         │                         │                        │
│  ┌──────▼──────────┐     ┌───────▼───────────┐          │
│  │  TokenStorage   │     │  DummyJSONClient  │          │
│  │  (SQLite)       │     │  (HTTP Client)    │          │
│  │  - Encrypted    │     │  - Fetch API      │          │
│  │  - Local cache  │     │  - Online only    │          │
│  └─────────────────┘     └───────────────────┘          │
└────────────────────────────────────────────────────────────┘
```

---

## Data Model

### SQLite Schema

#### Table: `auth_sessions`

Stores active user sessions with token metadata.

```sql
CREATE TABLE IF NOT EXISTS auth_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  username TEXT NOT NULL,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  access_token_encrypted BLOB NOT NULL,
  refresh_token_encrypted BLOB NOT NULL,
  token_expiry DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_refreshed_at DATETIME,
  is_active INTEGER DEFAULT 1,
  UNIQUE(user_id)
);
```

#### Table: `auth_events`

Audit log for authentication events.

```sql
CREATE TABLE IF NOT EXISTS auth_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL, -- 'login', 'logout', 'refresh', 'validation_failed'
  user_id INTEGER,
  username TEXT,
  success INTEGER NOT NULL, -- 0 or 1
  error_message TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Encryption Strategy

**Token Encryption:** Use Electron's `safeStorage` API

- **Windows:** Uses DPAPI (Data Protection API)
- **Encryption at rest:** Tokens stored as encrypted blobs
- **Decryption:** Only in main process, never exposed to renderer

**Example:**

```typescript
import { safeStorage } from "electron";

function encryptToken(token: string): Buffer {
  return safeStorage.encryptString(token);
}

function decryptToken(encrypted: Buffer): string {
  return safeStorage.decryptString(encrypted);
}
```

---

## API Integration

### DummyJSON Endpoints

#### 1. Login

```http
POST https://dummyjson.com/auth/login
Content-Type: application/json

{
  "username": "emilys",
  "password": "emilyspass",
  "expiresInMins": 60
}
```

**Response:**

```json
{
  "id": 1,
  "username": "emilys",
  "email": "emily.johnson@x.dummyjson.com",
  "firstName": "Emily",
  "lastName": "Johnson",
  "gender": "female",
  "image": "https://dummyjson.com/icon/emilys/128",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 2. Get Current User

```http
GET https://dummyjson.com/auth/me
Authorization: Bearer {accessToken}
```

#### 3. Refresh Token

```http
POST https://dummyjson.com/auth/refresh
Content-Type: application/json

{
  "refreshToken": "{refreshToken}",
  "expiresInMins": 60
}
```

### API Client Implementation

```typescript
// electron/auth/DummyJSONClient.ts
export class DummyJSONClient {
  private baseUrl = "https://dummyjson.com";

  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, expiresInMins: 60 }),
    });

    if (!response.ok) {
      throw new Error("Authentication failed");
    }

    return response.json();
  }

  async getCurrentUser(accessToken: string): Promise<UserProfile> {
    const response = await fetch(`${this.baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user profile");
    }

    return response.json();
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const response = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken, expiresInMins: 60 }),
    });

    if (!response.ok) {
      throw new Error("Token refresh failed");
    }

    return response.json();
  }
}
```

---

## Authentication Flow

### 1. Initial Login Flow

```
┌──────┐                ┌─────────┐               ┌──────────┐          ┌────────────┐
│ User │                │   UI    │               │   Main   │          │ DummyJSON  │
└──┬───┘                └────┬────┘               └────┬─────┘          └─────┬──────┘
   │                         │                         │                      │
   │  1. Enter credentials   │                         │                      │
   ├────────────────────────>│                         │                      │
   │                         │                         │                      │
   │                         │  2. IPC: auth:login     │                      │
   │                         ├────────────────────────>│                      │
   │                         │                         │                      │
   │                         │                         │  3. POST /auth/login │
   │                         │                         ├─────────────────────>│
   │                         │                         │                      │
   │                         │                         │  4. Access+Refresh   │
   │                         │                         │<─────────────────────┤
   │                         │                         │                      │
   │                         │                         │  5. Encrypt & Store  │
   │                         │                         │      in SQLite       │
   │                         │                         ├──────────┐           │
   │                         │                         │          │           │
   │                         │                         │<─────────┘           │
   │                         │                         │                      │
   │                         │  6. User profile        │                      │
   │                         │<────────────────────────┤                      │
   │                         │                         │                      │
   │  7. Navigate to app     │                         │                      │
   │<────────────────────────┤                         │                      │
```

### 2. Offline Authentication Check

```
┌──────┐                ┌─────────┐               ┌──────────┐
│ User │                │   UI    │               │   Main   │
└──┬───┘                └────┬────┘               └────┬─────┘
   │                         │                         │
   │  1. App starts          │                         │
   ├────────────────────────>│                         │
   │                         │                         │
   │                         │  2. IPC: auth:getCurrentUser
   │                         ├────────────────────────>│
   │                         │                         │
   │                         │                         │  3. Query SQLite
   │                         │                         │     for active session
   │                         │                         ├──────────┐
   │                         │                         │          │
   │                         │                         │<─────────┘
   │                         │                         │
   │                         │  4. Check token expiry  │
   │                         │     (offline validation)│
   │                         │                         ├──────────┐
   │                         │                         │          │
   │                         │                         │<─────────┘
   │                         │                         │
   │                         │  5. Return user or null │
   │                         │<────────────────────────┤
   │                         │                         │
   │  6. Show main app       │                         │
   │     or login screen     │                         │
   │<────────────────────────┤                         │
```

### 3. Token Refresh Flow (Online)

```
┌─────────┐               ┌──────────┐          ┌────────────┐
│   UI    │               │   Main   │          │ DummyJSON  │
└────┬────┘               └────┬─────┘          └─────┬──────┘
     │                         │                      │
     │  1. API call with       │                      │
     │     expired token       │                      │
     ├────────────────────────>│                      │
     │                         │                      │
     │                         │  2. Detect 401       │
     │                         ├──────────┐           │
     │                         │          │           │
     │                         │<─────────┘           │
     │                         │                      │
     │                         │  3. POST /auth/refresh
     │                         │     with refreshToken│
     │                         ├─────────────────────>│
     │                         │                      │
     │                         │  4. New accessToken  │
     │                         │<─────────────────────┤
     │                         │                      │
     │                         │  5. Update SQLite    │
     │                         ├──────────┐           │
     │                         │          │           │
     │                         │<─────────┘           │
     │                         │                      │
     │                         │  6. Retry original   │
     │                         │     request          │
     │                         │─────────────────────>│
     │                         │                      │
     │  7. Success response    │                      │
     │<────────────────────────┤                      │
```

---

## Security Considerations

### Threat Model

| Threat                         | Mitigation                                                       |
| ------------------------------ | ---------------------------------------------------------------- |
| **Token theft from disk**      | Encrypted storage using OS-level encryption (DPAPI)              |
| **Token exposure in renderer** | Tokens never sent to renderer, kept in main process              |
| **Man-in-the-middle**          | HTTPS only for all API calls                                     |
| **XSS attacks**                | No token in localStorage/sessionStorage, contextBridge isolation |
| **Local database access**      | File-level encryption, Windows user-level access control         |
| **Replay attacks**             | Token expiry enforced, short-lived access tokens (60 min)        |

### Best Practices

1. **Never log tokens:** Sanitize all logs and error messages
2. **Use HTTPS only:** No fallback to HTTP
3. **Validate token format:** Check JWT structure before storing
4. **Expire sessions:** Default 60-minute access token lifetime
5. **Logout on suspicion:** Clear tokens if any validation fails

---

## Error Handling

### Error Categories

#### 1. Network Errors

```typescript
class NetworkError extends Error {
  constructor(message: string) {
    super(`Network error: ${message}`);
    this.name = "NetworkError";
  }
}
```

**User Message:** "Cannot connect to server. Please check your internet connection."

#### 2. Authentication Errors

```typescript
class AuthenticationError extends Error {
  constructor(message: string) {
    super(`Authentication failed: ${message}`);
    this.name = "AuthenticationError";
  }
}
```

**User Message:** "Invalid username or password. Please try again."

#### 3. Token Errors

```typescript
class TokenError extends Error {
  constructor(message: string) {
    super(`Token error: ${message}`);
    this.name = "TokenError";
  }
}
```

**User Message:** "Session expired. Please log in again."

### Offline Handling

```typescript
async function handleAuthRequest(request: AuthRequest): Promise<AuthResponse> {
  try {
    // Try online authentication
    return await authenticateOnline(request);
  } catch (error) {
    if (error instanceof NetworkError) {
      // Fall back to offline validation
      return await validateOffline(request);
    }
    throw error;
  }
}
```

---

## Migration Strategy

### Phase 1: DummyJSON (Current)

- Use DummyJSON for all auth operations
- Full offline capability after initial login
- Test and validate auth patterns

### Phase 2: Laravel Backend (Future)

- Swap `DummyJSONClient` with `LaravelAuthClient`
- Keep same interfaces and IPC handlers
- Update API endpoints in configuration
- No changes to UI or state management

**Configuration Abstraction:**

```typescript
// electron/auth/config.ts
export const authConfig = {
  apiBaseUrl: process.env.AUTH_API_URL || "https://dummyjson.com",
  endpoints: {
    login: "/auth/login",
    me: "/auth/me",
    refresh: "/auth/refresh",
  },
};
```

---

## Testing Strategy

### Unit Tests

- Token encryption/decryption
- Token expiry calculation
- Session validation logic
- Error handling paths

### Integration Tests

- Login with valid credentials
- Login with invalid credentials
- Token refresh on expiry
- Offline authentication after login

### Manual Test Cases

| Test Case                     | Steps                                                        | Expected Result                                 |
| ----------------------------- | ------------------------------------------------------------ | ----------------------------------------------- |
| **TC-1: First Login**         | 1. Start app<br>2. Enter valid credentials<br>3. Click login | User logged in, redirected to main app          |
| **TC-2: Offline Session**     | 1. Login online<br>2. Disable network<br>3. Restart app      | User still authenticated, app fully functional  |
| **TC-3: Token Refresh**       | 1. Login<br>2. Wait 61 minutes<br>3. Make API call           | Token refreshed automatically, request succeeds |
| **TC-4: Invalid Credentials** | 1. Enter wrong password<br>2. Click login                    | Clear error message, stay on login screen       |
| **TC-5: Session Persistence** | 1. Login<br>2. Close app<br>3. Restart app                   | User still logged in, no re-login needed        |

---

## Performance Considerations

### Benchmarks

| Operation               | Target | Notes                           |
| ----------------------- | ------ | ------------------------------- |
| Auth check (offline)    | <50ms  | SQLite query + token validation |
| Login (online)          | <2s    | Network dependent               |
| Token refresh           | <1s    | Network dependent               |
| Session load on startup | <100ms | SQLite read + decryption        |

### Optimization Strategies

1. **Lazy token refresh:** Only refresh when making API calls
2. **Cache user profile:** Avoid redundant GET /auth/me calls
3. **Connection pooling:** Reuse SQLite connections
4. **Debounce auth checks:** Prevent redundant validations

---

## Open Technical Questions

1. **Should we implement automatic token refresh in background?**

   - **Consideration:** Prevents token expiry but uses battery/network
   - **Recommendation:** Only refresh on-demand (when making API calls)

2. **How long should offline sessions remain valid?**

   - **Consideration:** Balance security vs convenience
   - **Recommendation:** 30 days for offline-first use case

3. **Should we support multiple user accounts on same device?**

   - **Consideration:** Phase 1 is single-user
   - **Recommendation:** Design for single user now, add multi-user in Phase 2

4. **How to handle database schema migrations?**
   - **Consideration:** Auth schema may evolve
   - **Recommendation:** Use simple version tracking in SQLite

---

## References

- [DummyJSON Auth Documentation](https://dummyjson.com/docs/auth)
- [Electron safeStorage API](https://www.electronjs.org/docs/latest/api/safe-storage)
- [Windows DPAPI](https://learn.microsoft.com/en-us/windows/win32/api/dpapi/)
- [SQLite Encryption Extensions](https://www.sqlite.org/see/doc/trunk/www/index.wiki)
