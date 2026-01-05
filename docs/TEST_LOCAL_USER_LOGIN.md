# Testing Local User Login

## Overview

This document provides instructions for testing the local user login functionality that was added to support users created through the Users Management page.

## Background

Previously, the system only supported login via DummyJSON API. Users created locally in the SQLite database could not log in. This has been fixed by adding a fallback authentication mechanism that:

1. Tries DummyJSON API first if online
2. Falls back to local SQLite authentication if:
   - API login fails, OR
   - System is offline

## Test Scenarios

### Scenario 1: Create and Login with Local User (Online)

**Steps:**

1. Login as Superadmin (emilys/emilyspass)
2. Navigate to Users Management page
3. Create a new user:
   - Username: `testuser`
   - Email: `test@example.com`
   - Password: `Test123!`
   - First Name: `Test`
   - Last Name: `User`
   - Role: `CHECKER`
4. Logout
5. Try to login with `testuser` / `Test123!`

**Expected Result:**

- Login succeeds
- User is redirected to Checker dashboard
- User has correct permissions (CREATE_TRANSACTION, VERIFY_PAYMENT, etc.)

### Scenario 2: Local User Login (Offline)

**Steps:**

1. Create a local user as in Scenario 1
2. Disconnect internet
3. Login with the local user credentials

**Expected Result:**

- Login succeeds using local authentication
- User can access the application offline
- All features work normally

### Scenario 3: DummyJSON User Still Works

**Steps:**

1. Login with DummyJSON test user:
   - Username: `emilys`
   - Password: `emilyspass`

**Expected Result:**

- Login succeeds via DummyJSON API
- User has SUPERADMIN role
- All features accessible

### Scenario 4: Invalid Credentials

**Steps:**

1. Try to login with wrong password for a local user

**Expected Result:**

- Login fails
- Error message: "Invalid username or password"
- Audit log records failed attempt

### Scenario 5: Inactive User Cannot Login

**Steps:**

1. Create a local user
2. Toggle user status to "inactive"
3. Try to login with that user

**Expected Result:**

- Login fails
- Error message: "Invalid username or password"
- Audit log records failed attempt

## Database Verification

To verify local users are stored correctly:

```bash
# View all users
sqlite3 app-data.db "SELECT id, username, email, status FROM users;"

# View user roles
sqlite3 app-data.db "
SELECT u.username, r.code as role
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id;
"

# View auth events (login attempts)
sqlite3 app-data.db "
SELECT event_type, username, success, error_message, created_at
FROM auth_events
ORDER BY created_at DESC
LIMIT 10;
"
```

## Technical Implementation

### Login Flow

The login process now follows this logic:

```
1. User submits credentials
   ↓
2. Check network status
   ↓
3a. If ONLINE:
   ├─ Try DummyJSON API login
   │  ├─ Success → Store session, load roles/permissions
   │  └─ Fail → Try local authentication
   └─ If OFFLINE:
      └─ Try local authentication
         ↓
4b. Local Authentication:
   ├─ Hash password (SHA-256)
   ├─ Query users table
   ├─ Verify username + password_hash + status='active'
   ├─ Create session with dummy tokens
   └─ Load roles/permissions from RBAC tables
```

### Key Changes

**File:** `electron/auth/AuthManager.ts`

- Added `loginLocal()` method for SQLite-based authentication
- Modified `login()` to try API first, fallback to local
- Added password hashing using SHA-256 (consistent with RBACManager)
- Local sessions use dummy tokens with 24-hour expiry

### Password Hashing

Local user passwords are hashed using SHA-256:

```typescript
const passwordHash = createHash("sha256").update(password).digest("hex");
```

This is consistent with the hashing used in `RBACManager.createUser()`.

## Troubleshooting

### Issue: Local user cannot login

**Check:**

1. User status is 'active':
   ```sql
   SELECT username, status FROM users WHERE username = 'testuser';
   ```
2. Password hash matches:
   ```sql
   SELECT username, password_hash FROM users WHERE username = 'testuser';
   ```
3. User has role assigned:
   ```sql
   SELECT u.username, r.code
   FROM users u
   LEFT JOIN user_roles ur ON u.id = ur.user_id
   LEFT JOIN roles r ON ur.role_id = r.id
   WHERE u.username = 'testuser';
   ```

### Issue: Audit log shows failed attempts

**Check auth_events table:**

```sql
SELECT * FROM auth_events WHERE username = 'testuser' ORDER BY created_at DESC;
```

## Security Considerations

### Current Implementation

- SHA-256 password hashing (basic, not recommended for production)
- Dummy tokens for local sessions (not real JWT tokens)
- 24-hour session expiry for local auth

### Recommendations for Production

1. Use bcrypt or argon2 for password hashing
2. Implement proper JWT token generation for local sessions
3. Add rate limiting for login attempts
4. Implement account lockout after failed attempts
5. Add password complexity requirements
6. Implement password reset functionality

## Next Steps

- [ ] Add comprehensive unit tests for local authentication
- [ ] Implement proper JWT token generation for local sessions
- [ ] Add password reset functionality
- [ ] Implement account lockout after failed attempts
- [ ] Add two-factor authentication support
