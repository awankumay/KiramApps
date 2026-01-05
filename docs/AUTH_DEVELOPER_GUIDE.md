# Authentication System - Developer Documentation

## Architecture Overview

The authentication system is built with offline-first principles, using DummyJSON API for testing and validation before Laravel backend integration.

## Components

### 1. Database Layer (`electron/auth/database.ts`)

**Purpose:** Initialize and manage SQLite database schema for authentication.

**Key Functions:**

- `initAuthDatabase(db)` - Creates auth_sessions and auth_events tables
- `getDatabasePath()` - Returns path to database file in AppData
- `createDatabase()` - Initializes database connection with WAL mode

**Schema:**

```sql
-- Session storage with encrypted tokens
CREATE TABLE auth_sessions (
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
  is_active INTEGER DEFAULT 1
);

-- Audit log for security tracking
CREATE TABLE auth_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  user_id INTEGER,
  username TEXT,
  success INTEGER NOT NULL,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Token Storage (`electron/auth/TokenStorage.ts`)

**Purpose:** Secure token storage using Electron safeStorage (Windows DPAPI).

**Key Methods:**

- `storeSession(session)` - Encrypt and store authentication session
- `getActiveSession()` - Retrieve and decrypt active session
- `updateTokens(userId, accessToken, refreshToken, expiresIn)` - Update tokens during refresh
- `clearSession(userId?)` - Logout user by deactivating session
- `isTokenExpired(tokenExpiry)` - Check if token has expired

**Security:**

- Tokens encrypted at rest using Windows DPAPI
- Tokens never exposed to renderer process
- Automatic session cleanup on logout

### 3. Audit Logger (`electron/auth/AuditLogger.ts`)

**Purpose:** Log all authentication events for security and debugging.

**Key Methods:**

- `logLogin(event)` - Log login attempts
- `logLogout(event)` - Log logout events
- `logRefresh(event)` - Log token refresh
- `logValidationFailure(event)` - Log validation failures
- `getRecentEvents(limit)` - Retrieve recent auth events

**Event Types:**

- LOGIN
- LOGOUT
- REFRESH
- VALIDATION_FAILURE
- TOKEN_EXPIRED

### 4. API Client (`electron/auth/DummyJSONClient.ts`)

**Purpose:** HTTP communication with DummyJSON Auth API.

**Key Methods:**

- `login(username, password)` - Authenticate user
- `getCurrentUser(accessToken)` - Get user profile
- `refreshToken(refreshToken)` - Refresh expired token

**API Endpoints:**

- POST `https://dummyjson.com/auth/login`
- GET `https://dummyjson.com/auth/me`
- POST `https://dummyjson.com/auth/refresh`

**Error Handling:**

- `NetworkError` - Network connectivity issues
- `AuthenticationError` - Auth failures (401, 403, etc.)

### 5. Network Status (`electron/auth/NetworkStatus.ts`)

**Purpose:** Monitor network connectivity for offline/online mode switching.

**Key Methods:**

- `isOnline()` - Check current network status (with ping)
- `getStatus()` - Get cached status (no ping)
- `startMonitoring()` - Begin periodic connectivity checks
- `stopMonitoring()` - Stop monitoring

**Events:**

- `status-changed` - Network status changed
- `online` - Network became available
- `offline` - Network became unavailable

### 6. Authentication Manager (`electron/auth/AuthManager.ts`)

**Purpose:** Orchestrate authentication flow and coordinate all auth components.

**Key Methods:**

- `login(username, password)` - Complete login flow
- `logout()` - Complete logout flow
- `getCurrentUser()` - Get current authenticated user (works offline)
- `isAuthenticated()` - Check authentication status
- `refreshToken()` - Manual token refresh trigger
- `isOnline()` - Check network status

**Offline Behavior:**

- Grace period: 24 hours after token expiry
- Automatic token refresh when network available
- Cached user data for offline access

### 7. IPC Handlers (`electron/main.ts`)

**Purpose:** Secure bridge between main and renderer process.

**Handlers:**

- `auth:login` - Login with username/password
- `auth:logout` - Logout current user
- `auth:getCurrentUser` - Get current user info
- `auth:checkAuthStatus` - Check if authenticated
- `auth:refreshToken` - Manually refresh token
- `auth:isOnline` - Check network status

**Security:**

- Tokens never returned to renderer
- Only user profile data exposed
- All operations validated in main process

### 8. Context Bridge (`electron/preload.ts`)

**Purpose:** Expose secure API to renderer process.

**Exposed API:**

```typescript
window.api.auth = {
  login(username, password): Promise<ApiResponse<AuthResult>>,
  logout(): Promise<ApiResponse<void>>,
  getCurrentUser(): Promise<ApiResponse<User | null>>,
  checkAuthStatus(): Promise<ApiResponse<{ isAuthenticated: boolean }>>,
  refreshToken(): Promise<ApiResponse<void>>,
  isOnline(): Promise<ApiResponse<{ isOnline: boolean }>>
}
```

### 9. Auth Context (`src/contexts/AuthContext.tsx`)

**Purpose:** React context for app-wide authentication state.

**Provided Values:**

- `user` - Current user object or null
- `isAuthenticated` - Boolean authentication status
- `isLoading` - Loading state during auth check
- `login(username, password)` - Login function
- `logout()` - Logout function
- `refreshUser()` - Reload current user

### 10. UI Components

**LoginForm** (`src/components/LoginForm.tsx`):

- Username/password input fields
- Validation and error display
- Loading state during authentication

**LoginScreen** (`src/pages/LoginScreen.tsx`):

- Full-page login layout
- App branding
- Version information

**UserProfileHeader** (`src/components/UserProfileHeader.tsx`):

- Display current user info
- Logout button with confirmation
- Responsive header layout

**MainApp** (`src/pages/MainApp.tsx`):

- Main application dashboard
- Protected by authentication
- Shows authenticated status

## Data Flow

### Login Flow

```
User Input → LoginForm → AuthContext.login()
  → IPC: auth:login → AuthManager.login()
  → DummyJSONClient.login() → API Request
  → TokenStorage.storeSession() → Encrypted to SQLite
  → AuditLogger.logLogin() → Event logged
  → Return user data → Update React state → Redirect to MainApp
```

### Offline Authentication Flow

```
App Startup → AuthContext (useEffect)
  → IPC: auth:getCurrentUser → AuthManager.getCurrentUser()
  → TokenStorage.getActiveSession() → Decrypt from SQLite
  → Check token expiry
    → If expired + offline: Check grace period (24h)
    → If expired + online: Auto-refresh token
  → Return user data → Update React state
```

### Logout Flow

```
User Click Logout → UserProfileHeader.handleLogout()
  → AuthContext.logout()
  → IPC: auth:logout → AuthManager.logout()
  → TokenStorage.clearSession() → Mark session inactive
  → AuditLogger.logLogout() → Event logged
  → Clear React state → Redirect to LoginScreen
```

## Swapping to Laravel Backend

To replace DummyJSON with Laravel API:

1. **Update DummyJSONClient.ts:**

   - Change `baseUrl` to Laravel API endpoint
   - Update request/response formats if needed
   - Update token expiry handling

2. **Update AuthManager.ts (if needed):**

   - Adjust token refresh logic
   - Update session duration
   - Modify offline grace period

3. **Keep everything else unchanged:**
   - TokenStorage, AuditLogger, NetworkStatus remain same
   - IPC handlers remain same
   - React components remain same

**Example Laravel endpoints:**

```typescript
private readonly baseUrl = 'https://api.yourapp.com';

// Login: POST /api/auth/login
// Get User: GET /api/auth/me
// Refresh: POST /api/auth/refresh
```

## Environment Variables

No environment variables currently required. All configuration is hardcoded for simplicity.

**Future considerations:**

- API_BASE_URL - Backend API endpoint
- TOKEN_EXPIRY - Token expiration duration
- OFFLINE_GRACE_PERIOD - Offline grace period duration

## Troubleshooting

### "Failed to decrypt token"

**Cause:** Database moved to different machine or Windows user.

**Solution:** Tokens encrypted with machine-specific key. User must login again.

### "Network timeout"

**Cause:** API request took longer than 5 seconds.

**Solution:** Check internet connection. Increase timeout in DummyJSONClient if needed.

### "better-sqlite3 not found"

**Cause:** Native module not compiled for Electron.

**Solution:**

```bash
npm install better-sqlite3
npx electron-rebuild
```

### TypeScript errors with window.api

**Cause:** Type definitions not loaded.

**Solution:** Ensure `src/types/electron.d.ts` is included in `tsconfig.json`.

## Testing

### Manual Testing Checklist

- [ ] Login with valid credentials (online)
- [ ] Login with invalid credentials (should fail)
- [ ] Login without internet (should fail with clear message)
- [ ] Close and reopen app (should stay logged in)
- [ ] Logout and login again
- [ ] Wait for token expiry (60 minutes) and refresh
- [ ] Disconnect internet after login (should work offline)
- [ ] Reconnect internet (should auto-refresh if expired)

### Test Credentials

**DummyJSON Test Users:**

- emilys / emilyspass
- michaelw / michaelwpass
- sophiab / sophiabpass
- jamesd / jamesdpass

See: https://dummyjson.com/docs/auth

## Performance Metrics

**Target Performance:**

- Offline auth check: < 50ms
- Login (good network): < 2s
- Session load on startup: < 100ms
- Token refresh: < 1s

**Actual Performance:** (to be measured during testing)

## Security Checklist

- [x] Tokens encrypted at rest (Windows DPAPI)
- [x] Tokens never exposed to renderer process
- [x] No tokens in console logs
- [x] HTTPS only for API requests
- [x] Password never stored
- [x] Session cleanup on logout
- [x] Audit trail for all auth events

## Future Enhancements

1. **Multi-user support** - Multiple users on same machine
2. **Role-based access control** - Different user permissions
3. **Biometric authentication** - Windows Hello integration
4. **SSO integration** - Active Directory or OAuth
5. **Session timeout** - Auto-logout after inactivity
6. **Password change** - In-app password management
7. **2FA support** - Two-factor authentication

---

## API Reference

See `src/types/electron.d.ts` for complete TypeScript definitions.

## Dependencies

- `better-sqlite3` - SQLite database
- `electron` - safeStorage API for encryption
- No external HTTP library (using native fetch)

## File Structure

```
electron/
  auth/
    database.ts         - Database initialization
    TokenStorage.ts     - Token encryption/storage
    AuditLogger.ts      - Event logging
    DummyJSONClient.ts  - API communication
    NetworkStatus.ts    - Network monitoring
    AuthManager.ts      - Core authentication logic
  main.ts              - IPC handlers
  preload.ts           - Context bridge

src/
  contexts/
    AuthContext.tsx    - React authentication context
  components/
    LoginForm.tsx      - Login form component
    UserProfileHeader.tsx - User profile display
  pages/
    LoginScreen.tsx    - Login screen layout
    MainApp.tsx        - Main application
  types/
    electron.d.ts      - TypeScript definitions
```
