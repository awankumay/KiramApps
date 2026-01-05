# Implementation Tasks: DummyJSON Authentication

**Change ID:** `add-dummyjson-authentication`  
**Estimated Duration:** 7 working days  
**Last Updated:** 2026-01-03

## Task Overview

This document breaks down the authentication implementation into ordered, verifiable tasks. Each task delivers user-visible progress and includes validation steps.

---

## Prerequisites

- [x] Confirm `better-sqlite3` is installed and working
- [x] Verify Electron safeStorage API availability on Windows 10/11
- [x] Ensure network access to https://dummyjson.com for testing
- [x] Review `proposal.md`, `design.md`, and `specs/authentication/spec.md`

---

## Phase 1: Database Foundation (Day 1)

### Task 1.1: Create Authentication Database Schema

**Estimated Time:** 2 hours
**Depends On:** None

- [x] Create SQL migration script for `auth_sessions` table
- [x] Create SQL migration script for `auth_events` table
- [x] Add appropriate indexes (user_id, is_active, created_at)
- [x] Create database initialization function in main process
- [x] Add database migration runner on app startup

**Validation:**

```bash
# Run app and verify tables exist
sqlite3 app-data.db ".schema auth_sessions"
sqlite3 app-data.db ".schema auth_events"
```

**Acceptance:** Database schema created and initialized on app startup

---

### Task 1.2: Create Token Storage Module

**Estimated Time:** 3 hours
**Depends On:** Task 1.1

- [x] Create `electron/auth/TokenStorage.ts` class
- [x] Implement `storeSession()` method with encryption
- [x] Implement `getActiveSession()` method with decryption
- [x] Implement `updateTokens()` method for refresh
- [x] Implement `clearSession()` method for logout
- [x] Add error handling for encryption/decryption failures

**Validation:**

```typescript
// Unit test or manual test in main.ts
const storage = new TokenStorage(db);
await storage.storeSession({
  userId: 1,
  username: "test",
  accessToken: "abc123",
  refreshToken: "xyz789",
  expiresIn: 3600,
});
const session = await storage.getActiveSession();
console.log(session.username); // 'test'
```

**Acceptance:** Tokens can be stored encrypted and retrieved decrypted

---

### Task 1.3: Create Audit Logger

**Estimated Time:** 2 hours
**Depends On:** Task 1.1

- [x] Create `electron/auth/AuditLogger.ts` class
- [x] Implement `logLogin()` method
- [x] Implement `logLogout()` method
- [x] Implement `logRefresh()` method
- [x] Implement `logValidationFailure()` method
- [x] Add query method `getRecentEvents(limit)`

**Validation:**

```typescript
const logger = new AuditLogger(db);
await logger.logLogin({ userId: 1, username: "test", success: true });
const events = await logger.getRecentEvents(10);
console.log(events.length); // Should be 1
```

**Acceptance:** Authentication events are logged to database

---

## Phase 2: API Client (Day 2)

### Task 2.1: Create DummyJSON HTTP Client

**Estimated Time:** 3 hours
**Depends On:** None (can run parallel with Phase 1)

- [x] Create `electron/auth/DummyJSONClient.ts` class
- [x] Implement `login(username, password)` method
- [x] Implement `getCurrentUser(accessToken)` method
- [x] Implement `refreshToken(refreshToken)` method
- [x] Add proper error handling (NetworkError, AuthenticationError)
- [x] Add request timeout (5 seconds)
- [x] Add user-agent header with Electron version

**Validation:**

```typescript
const client = new DummyJSONClient();
const response = await client.login("emilys", "emilyspass");
console.log(response.accessToken); // Should be valid JWT string
```

**Acceptance:** Can successfully authenticate with DummyJSON API

---

### Task 2.2: Create Network Status Detector

**Estimated Time:** 2 hours
**Depends On:** None

- [x] Create `electron/auth/NetworkStatus.ts` utility
- [x] Implement `isOnline()` check using `net` module
- [x] Add event emitter for online/offline events
- [x] Handle transition between online and offline states
- [x] Add connection test to known endpoint (ping DummyJSON)

**Validation:**

```typescript
const netStatus = new NetworkStatus();
console.log(await netStatus.isOnline()); // true or false
netStatus.on("status-changed", (online) => {
  console.log("Network:", online ? "ONLINE" : "OFFLINE");
});
```

**Acceptance:** Can reliably detect network availability

---

## Phase 3: Authentication Manager (Day 3-4)

### Task 3.1: Create Core AuthManager Class

**Estimated Time:** 4 hours
**Depends On:** Task 1.2, Task 2.1, Task 2.2

- [x] Create `electron/auth/AuthManager.ts` class
- [x] Initialize dependencies (TokenStorage, DummyJSONClient, AuditLogger)
- [x] Implement `login(username, password)` orchestration method
- [x] Implement `logout()` method
- [x] Implement `getCurrentUser()` method
- [x] Implement `isAuthenticated()` method
- [x] Add proper error handling and logging

**Validation:**

```typescript
const authManager = new AuthManager(db);
const user = await authManager.login("emilys", "emilyspass");
console.log(user.username); // 'emilys'
console.log(await authManager.isAuthenticated()); // true
await authManager.logout();
console.log(await authManager.isAuthenticated()); // false
```

**Acceptance:** Complete authentication lifecycle works (login → session → logout)

---

### Task 3.2: Implement Token Refresh Logic

**Estimated Time:** 3 hours
**Depends On:** Task 3.1

- [x] Add `refreshTokenIfNeeded()` private method
- [x] Implement token expiry detection
- [x] Add automatic refresh on API calls if expired
- [x] Handle refresh failure (clear session, force re-login)
- [x] Add offline handling (skip refresh if no network)
- [x] Update session timestamps on successful refresh

**Validation:**

```typescript
// Manually expire token in database
await db.exec(
  "UPDATE auth_sessions SET token_expiry = datetime('now', '-1 hour')"
);
// Make authenticated request - should auto-refresh
const user = await authManager.getCurrentUser();
console.log(user.username); // Should still work
```

**Acceptance:** Expired tokens automatically refresh when online

---

### Task 3.3: Implement Offline Authentication

**Estimated Time:** 2 hours
**Depends On:** Task 3.1

- [x] Modify `getCurrentUser()` to work offline
- [x] Implement local token validation (check expiry timestamp)
- [x] Add graceful handling of expired tokens offline
- [x] Cache user profile for offline access
- [x] Mark sessions for refresh when back online

**Validation:**

```bash
# Login online first
# Then disable network
# Restart app
# App should still show user as authenticated
```

**Acceptance:** User remains authenticated offline after initial login

---

## Phase 4: IPC Bridge (Day 4)

### Task 4.1: Create Secure IPC Handlers

**Estimated Time:** 3 hours
**Depends On:** Task 3.1

- [x] Add IPC handler `auth:login` in `electron/main.ts`
- [x] Add IPC handler `auth:logout`
- [x] Add IPC handler `auth:getCurrentUser`
- [x] Add IPC handler `auth:checkAuthStatus`
- [x] Ensure handlers never return tokens to renderer
- [x] Add error handling and validation

**Validation:**

```typescript
// In main.ts
ipcMain.handle("auth:login", async (event, username, password) => {
  return await authManager.login(username, password);
});
// Should return user profile without tokens
```

**Acceptance:** IPC handlers expose auth methods securely

---

### Task 4.2: Setup Context Bridge in Preload

**Estimated Time:** 2 hours
**Depends On:** Task 4.1

- [x] Update `electron/preload.ts` with auth API
- [x] Expose `window.api.auth.login(username, password)`
- [x] Expose `window.api.auth.logout()`
- [x] Expose `window.api.auth.getCurrentUser()`
- [x] Expose `window.api.auth.checkAuthStatus()`
- [x] Add TypeScript types for exposed API

**Validation:**

```typescript
// In renderer DevTools console
const user = await window.api.auth.login("emilys", "emilyspass");
console.log(user.username); // 'emilys'
```

**Acceptance:** Renderer can call auth methods via contextBridge

---

## Phase 5: React UI Components (Day 5-6)

### Task 5.1: Create Auth Context Provider

**Estimated Time:** 2 hours
**Depends On:** Task 4.2

- [x] Create `src/contexts/AuthContext.tsx`
- [x] Implement React context with user state
- [x] Add `login`, `logout`, `isAuthenticated` methods
- [x] Load current user on mount
- [x] Provide context to entire app tree

**Validation:**

```typescript
// In src/main.tsx
<AuthProvider>
  <App />
</AuthProvider>
```

**Acceptance:** Auth state available throughout React app

---

### Task 5.2: Create Login Form Component

**Estimated Time:** 4 hours
**Depends On:** Task 5.1

- [x] Create `src/components/LoginForm.tsx`
- [x] Add username and password input fields (using shadcn-ui)
- [x] Add form validation (required fields)
- [x] Add submit handler calling `auth.login()`
- [x] Add loading state during authentication
- [x] Add error message display
- [x] Ensure keyboard accessibility (tab order, Enter to submit)
- [x] Style with Tailwind CSS matching app design

**Validation:**

```bash
# Run app
# Enter valid credentials
# Should successfully log in and navigate to main app
# Enter invalid credentials
# Should show error message
```

**Acceptance:** User can log in via intuitive UI

---

### Task 5.3: Create Login Screen Component

**Estimated Time:** 2 hours
**Depends On:** Task 5.2

- [x] Create `src/pages/LoginScreen.tsx`
- [x] Add app branding/logo
- [x] Embed LoginForm component
- [x] Add responsive layout (center on screen)
- [x] Add version number in footer

**Validation:**

```bash
# Run app without existing session
# Should show full login screen
```

**Acceptance:** Complete login screen renders properly

---

### Task 5.4: Create Protected Route Guard

**Estimated Time:** 2 hours
**Depends On:** Task 5.1

- [x] Create `src/components/ProtectedRoute.tsx` or similar guard
- [x] Check authentication status on route access
- [x] Redirect to login if not authenticated
- [x] Show main app if authenticated
- [x] Handle loading state during auth check

**Validation:**

```typescript
// Pseudo code structure
{
  isAuthenticated ? <MainApp /> : <LoginScreen />;
}
```

**Acceptance:** Unauthenticated users see login, authenticated users see app

---

### Task 5.5: Add User Profile Header

**Estimated Time:** 3 hours
**Depends On:** Task 5.1

- [x] Create `src/components/UserProfileHeader.tsx`
- [x] Display current username
- [x] Display email (if available)
- [x] Add logout button (using shadcn-ui Button component)
- [x] Handle logout click (call `auth.logout()`)
- [x] Add confirmation dialog for logout (optional but recommended)
- [x] Style to match application header

**Validation:**

```bash
# Login and navigate to main app
# Header should show username and logout button
# Click logout
# Should return to login screen
```

**Acceptance:** User can see profile and logout from any screen

---

## Phase 6: Integration & Testing (Day 6-7)

### Task 6.1: End-to-End Flow Testing

**Estimated Time:** 3 hours
**Depends On:** All previous tasks

- [x] Test: Fresh install → Login → Should work
- [x] Test: Login → Close app → Reopen → Still logged in
- [x] Test: Login → Disable network → Restart app → Still logged in
- [x] Test: Invalid credentials → Clear error message
- [x] Test: No network on login → Clear error message
- [x] Test: Wait 61 minutes → Token refresh on next action
- [x] Test: Logout → Session cleared from database
- [x] Document any issues found

**Acceptance:** All manual test cases pass

---

### Task 6.2: Error Handling Verification

**Estimated Time:** 2 hours
**Depends On:** Task 6.1

- [x] Test network timeout scenarios
- [x] Test malformed API responses
- [x] Test database corruption (delete/corrupt db file)
- [x] Test concurrent login attempts
- [x] Verify all errors show user-friendly messages
- [x] Verify no sensitive data in error logs

**Acceptance:** All error scenarios handled gracefully

---

### Task 6.3: Performance Validation

**Estimated Time:** 2 hours
**Depends On:** Task 6.1

- [x] Measure offline auth check time (target: <50ms)
- [x] Measure login time with good network (target: <2s)
- [x] Measure session load on app startup (target: <100ms)
- [x] Measure token refresh time (target: <1s)
- [x] Document actual performance metrics
- [x] Optimize if any targets not met

**Acceptance:** All performance benchmarks met

---

### Task 6.4: Security Audit

**Estimated Time:** 2 hours
**Depends On:** Task 6.1

- [x] Verify tokens encrypted in SQLite (check with hex editor)
- [x] Verify tokens never in renderer DevTools
- [x] Verify no tokens in application logs
- [x] Verify HTTPS only (no HTTP fallback)
- [x] Verify password not stored anywhere
- [x] Test token extraction attack scenarios
- [x] Document security validation results

**Acceptance:** All security requirements verified

---

## Phase 7: Documentation (Day 7)

### Task 7.1: User Documentation

**Estimated Time:** 2 hours
**Depends On:** Task 6.1

- [x] Document login procedure for operators
- [x] Document what to do if internet unavailable
- [x] Document what to do if login fails
- [x] Document logout process
- [x] Add screenshots of login screen
- [x] Create quick reference card

**Acceptance:** Clear user-facing documentation exists

---

### Task 7.2: Developer Documentation

**Estimated Time:** 2 hours
**Depends On:** All tasks

- [x] Document AuthManager API
- [x] Document IPC communication flow
- [x] Document how to swap to Laravel backend
- [x] Add code comments to complex sections
- [x] Document environment variables (if any)
- [x] Create troubleshooting guide

**Acceptance:** Developers can understand and maintain auth system

---

### Task 7.3: Testing Credentials Documentation

**Estimated Time:** 1 hour
**Depends On:** None

- [x] Document DummyJSON test credentials
- [x] List available test users
- [x] Document test user limitations
- [x] Add link to DummyJSON docs
- [x] Document how to add more test users (if needed)

**Acceptance:** Team knows how to test authentication

---

## Validation Checklist

Before marking the change as complete, verify:

- [x] All tasks above completed with checkmarks
- [x] Manual test cases from `proposal.md` pass
- [x] All requirements in `specs/authentication/spec.md` satisfied
- [x] No tokens visible in renderer process
- [x] Offline functionality works as expected
- [x] Error messages are user-friendly
- [x] Performance benchmarks met
- [x] Security audit passed
- [x] Documentation complete
- [x] Code reviewed (if team workflow requires)
- [x] No console errors during normal operation
- [x] Works on Windows 10 and Windows 11

---

## Known Dependencies

### Can Run in Parallel

- Phase 1 (Database) and Phase 2 (API Client) are independent
- UI components (Phase 5) can start once IPC bridge is ready (Phase 4)

### Sequential Dependencies

- Phase 3 requires Phase 1 and Phase 2
- Phase 4 requires Phase 3
- Phase 5 requires Phase 4
- Phase 6 requires all previous phases

---

## Risk Mitigation

### If DummyJSON is down during development:

1. Implement mock auth service locally
2. Use hardcoded test responses
3. Continue with offline functionality development

### If Windows safeStorage fails:

1. Fallback to basic encryption (not recommended for production)
2. Document limitation
3. Test on multiple Windows versions

### If SQLite issues arise:

1. Ensure better-sqlite3 compiled correctly for Electron
2. Check Node.js native module compatibility
3. Rebuild with electron-rebuild if needed

---

## Post-Implementation

After all tasks complete:

1. Run `openspec validate add-dummyjson-authentication --strict`
2. Request code review (if applicable)
3. Obtain approval from stakeholders
4. Prepare for Laravel backend integration (Phase 2)
5. Archive change proposal when deployed

---

## Notes

- Each task should be committed separately with descriptive commit message
- Update this checklist as tasks are completed
- Add any discovered subtasks or issues as they arise
- Estimated times are guidelines, adjust based on actual progress
