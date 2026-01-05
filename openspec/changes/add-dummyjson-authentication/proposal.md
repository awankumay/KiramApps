# Change: Add DummyJSON Authentication

**Change ID:** `add-dummyjson-authentication`  
**Status:** Draft  
**Created:** 2026-01-03  
**Author:** AI Assistant

## Why

The Surat Masuk Digital application needs user authentication to identify operators, establish audit trails, and test integration patterns before connecting to production Laravel backend. Using DummyJSON as a testing backend allows us to validate the complete authentication flow while maintaining strict offline-first functionality for field operators.

## What Changes

- Add SQLite tables `auth_sessions` and `auth_events` for local session storage and audit logging
- Implement `AuthManager` class in main process for authentication orchestration
- Create `DummyJSONClient` for HTTP communication with DummyJSON Auth API
- Add secure token encryption using Electron `safeStorage` (Windows DPAPI)
- Implement IPC handlers and contextBridge for secure renderer-main communication
- Create React login UI with form validation and error handling
- Add authentication context provider for app-wide auth state
- Support offline authentication after initial online login
- Implement automatic token refresh when online

## Impact

- **Affected specs:** Authentication (new capability)
- **Affected code:**
  - `electron/main.ts` - IPC handlers and AuthManager initialization
  - `electron/preload.ts` - contextBridge API exposure
  - `electron/auth/*` - New authentication modules (AuthManager, TokenStorage, DummyJSONClient, AuditLogger)
  - `src/contexts/AuthContext.tsx` - New React context
  - `src/components/LoginForm.tsx` - New login UI
  - `src/pages/LoginScreen.tsx` - New login screen
  - `src/components/UserProfileHeader.tsx` - New header component
- **New dependencies:** Uses existing `better-sqlite3` (already planned), no additional packages
- **Database changes:** Add 2 new tables with proper encryption
- **Breaking changes:** None (new feature, no existing functionality affected)

---

## Problem Statement

The Surat Masuk Digital application currently lacks user authentication and authorization mechanisms. While the application is designed as offline-first for field operators at remote locations, we need to:

1. **Establish authentication patterns** before backend integration
2. **Test end-to-end auth flows** (login, token management, session handling)
3. **Prepare for future Laravel API integration** by building proper token handling
4. **Enable secure offline operation** after initial authentication

Without authentication, the application cannot:

- Identify which operator created/modified records
- Provide audit trails for data changes
- Prepare for future multi-user scenarios
- Test integration patterns before production backend is ready

## Proposed Solution

Implement a **hybrid authentication system** that uses DummyJSON API for initial development and testing, while maintaining full offline-first functionality:

### Architecture Overview

```
┌─────────────────┐
│   React UI      │
│   (Renderer)    │
└────────┬────────┘
         │
    ┌────▼─────┐
    │ IPC API  │
    └────┬─────┘
         │
┌────────▼──────────┐
│  Main Process     │
│  ┌──────────────┐ │
│  │ Auth Manager │ │
│  └──────┬───────┘ │
│         │         │
│  ┌──────▼───────┐ │
│  │   SQLite     │ │ ← Stores tokens, user info, offline auth
│  └──────────────┘ │
│         │         │
│  ┌──────▼───────┐ │
│  │ DummyJSON    │ │ ← External API (online only)
│  │     API      │ │
│  └──────────────┘ │
└───────────────────┘
```

### Key Components

1. **Online Authentication (DummyJSON)**

   - Initial login via `https://dummyjson.com/auth/login`
   - Receive `accessToken` and `refreshToken`
   - Store user profile (id, username, email)

2. **Offline Persistence (SQLite)**

   - Store encrypted tokens in local database
   - Cache user session and profile data
   - Enable authentication checks without internet

3. **Token Management**

   - Auto-refresh tokens when online
   - Validate tokens locally when offline
   - Handle token expiration gracefully

4. **Secure IPC Bridge**
   - Expose auth methods via Electron contextBridge
   - Keep sensitive operations in main process
   - Never expose tokens to renderer process directly

### Offline-First Guarantees

- **After first login:** User can work completely offline
- **Token validation:** Cached locally with expiry timestamps
- **Session persistence:** Survives app restarts and power outages
- **Data attribution:** All records tagged with authenticated user ID
- **Graceful degradation:** If token expired offline, user continues with cached identity

## Impact Assessment

### User Experience

- **Positive:** Users identify themselves before data entry
- **Positive:** Audit trail shows who created/modified records
- **Neutral:** One-time login required (session persists)
- **Risk:** If initial login fails (no internet), operator cannot start

### Technical Impact

- **New dependency:** None (uses built-in fetch API)
- **Database changes:** Add `auth_sessions` and `auth_tokens` tables
- **Code changes:**
  - New `AuthManager` class in main process
  - New IPC handlers for auth operations
  - New React context for auth state
  - Login UI component

### Performance

- **Minimal impact:** Auth checks are local SQLite queries (<1ms)
- **Network:** Only on initial login and token refresh (when online)
- **Storage:** ~5KB per user session

### Security

- **Tokens stored encrypted** in SQLite (using Windows DPAPI or similar)
- **No token exposure** to renderer process
- **DummyJSON is testing only** - will be replaced with real backend
- **Local auth bypass possible** - acceptable for Phase 1 (single user)

## Risks and Mitigation

### Risk 1: Network Required for First Login

**Impact:** High - User cannot start if no internet on first run  
**Mitigation:**

- Provide clear error message with retry option
- Document installation procedure (login with internet first)
- Future: Add "offline activation code" mechanism

### Risk 2: DummyJSON Downtime

**Impact:** Medium - Cannot test auth during development  
**Mitigation:**

- Mock auth service for local development
- Implement retry logic with exponential backoff
- Cache test credentials for offline development

### Risk 3: Token Security

**Impact:** Medium - Local storage could be compromised  
**Mitigation:**

- Use OS-level encryption (Windows DPAPI)
- Document that Phase 1 is single-user, single-device
- Plan for future: hardware tokens, biometric auth

### Risk 4: Migration to Laravel Backend

**Impact:** Low - Need to swap auth endpoints  
**Mitigation:**

- Abstract auth provider interface
- Keep DummyJSON logic in separate module
- Use environment variables for API endpoints

## Success Criteria

1. **Functional Requirements:**

   - [ ] User can log in with DummyJSON credentials
   - [ ] Tokens stored securely in SQLite
   - [ ] App works fully offline after first login
   - [ ] Session persists across app restarts
   - [ ] Token refresh works when online

2. **Non-Functional Requirements:**

   - [ ] Auth check completes in <50ms (offline)
   - [ ] Login UI loads in <100ms
   - [ ] No tokens visible in renderer DevTools
   - [ ] Encrypted storage verified on Windows 10/11

3. **Testing Requirements:**
   - [ ] Manual test: Login → Close app → Reopen → Still logged in
   - [ ] Manual test: Disable network → App still works
   - [ ] Manual test: Wrong credentials → Clear error message
   - [ ] Manual test: Token expiry → Auto-refresh when online

## Alternatives Considered

### Alternative 1: Skip Auth for Phase 1

**Rejected:** Cannot test integration patterns, no audit trail

### Alternative 2: Local-Only Auth (No Backend)

**Rejected:** Doesn't prepare for Laravel integration

### Alternative 3: Built-in Test Users (Hardcoded)

**Rejected:** Doesn't test real HTTP auth flows

## Dependencies

- **OpenSpec Changes:** None (this is first auth implementation)
- **External APIs:** DummyJSON Auth API (https://dummyjson.com/docs/auth)
- **New Packages:**
  - `better-sqlite3` (already planned for data storage)
  - No additional packages needed

## Timeline

**Estimated Duration:** 7 working days (from auth-dummyjson.md estimate)

- Days 1-2: Setup API client and auth manager in main process
- Days 3-5: Implement login flow, token storage, IPC bridge
- Day 6: Integration testing and offline verification
- Day 7: Documentation and cleanup

## Open Questions

1. **Which DummyJSON test user should we use by default?**

   - Suggestion: `emilys` / `emilyspass` (from documentation)

2. **Should we allow "Remember Me" option?**

   - Suggestion: Yes, default enabled (offline-first requires persistence)

3. **How to handle token encryption on Windows?**

   - Suggestion: Use `safeStorage` API from Electron (uses Windows DPAPI)

4. **Should we show user profile in UI after login?**
   - Suggestion: Yes, simple header with username and logout button

## Approval

This proposal requires approval before implementation begins.

**Reviewed by:** _Andika_  
**Approved by:** _Andika_  
**Approval Date:** _03/01/2025_
