# Cross-Platform Auth API Documentation

## Overview

This API provides authentication endpoints for cross-platform applications, including Electron first-offline apps. The API is designed to be compatible with DummyJSON payload structure for easy migration from development/mock APIs.

## Base URL

```
{APP_URL}/api
```

## Authentication

The API uses token-based authentication with Laravel Sanctum. Protected endpoints require an `Authorization` header with a Bearer token.

```
Authorization: Bearer {accessToken}
```

## Endpoints

### 1. Login

Authenticate user and receive access/refresh tokens.

**Endpoint:** `POST /api/auth/login`

**Rate Limit:** 5 attempts per minute per IP

**Request Body:**

```json
{
  "username": "string (required) - Email or username",
  "password": "string (required) - User password",
  "expiresInMins": "integer (optional) - Custom access token expiry (1-1440 minutes)"
}
```

**Success Response (200):**

```json
{
  "id": 1,
  "username": "emilys",
  "email": "emily@example.com",
  "firstName": "Emily",
  "lastName": "Johnson",
  "gender": "female",
  "image": "https://example.com/avatar.png",
  "accessToken": "1|abc123...",
  "refreshToken": "xyz789...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "refreshExpiresIn": 2592000
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid credentials or inactive user
- `422 Unprocessable Entity` - Validation errors
- `429 Too Many Requests` - Rate limit exceeded

---

### 2. Refresh Token

Obtain new access token using refresh token.

**Endpoint:** `POST /api/auth/refresh`

**Rate Limit:** 10 attempts per minute per IP

**Request Body:**

```json
{
  "refreshToken": "string (required) - The refresh token",
  "expiresInMins": "integer (optional) - Custom access token expiry (1-1440 minutes)"
}
```

**Success Response (200):**

```json
{
  "accessToken": "2|def456...",
  "refreshToken": "new-refresh-token...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "refreshExpiresIn": 2592000
}
```

**Note:** Token rotation is implemented - the old refresh token is invalidated and a new one is returned.

**Error Responses:**

- `401 Unauthorized` - Invalid or expired refresh token
- `422 Unprocessable Entity` - Validation errors
- `429 Too Many Requests` - Rate limit exceeded

---

### 3. Get Current User

Get the authenticated user's profile.

**Endpoint:** `GET /api/auth/me`

**Authentication:** Required

**Success Response (200):**

```json
{
  "id": 1,
  "username": "emilys",
  "email": "emily@example.com",
  "firstName": "Emily",
  "lastName": "Johnson",
  "gender": "female",
  "image": "https://example.com/avatar.png"
}
```

**Error Responses:**

- `401 Unauthorized` - Not authenticated

---

### 4. Logout

Revoke tokens and end session.

**Endpoint:** `POST /api/auth/logout`

**Authentication:** Required

**Request Body:**

```json
{
  "refreshToken": "string (optional) - Specific refresh token to revoke",
  "revokeAll": "boolean (optional) - Revoke all tokens (logout from all devices)"
}
```

**Success Response (200):**

```json
{
  "message": "Successfully logged out"
}
```

**Error Responses:**

- `401 Unauthorized` - Not authenticated

---

## Environment Variables

Configure the following variables in your `.env` file:

| Variable                   | Default   | Description                          |
| -------------------------- | --------- | ------------------------------------ |
| `JWT_SECRET`               | `APP_KEY` | Secret key for token signing         |
| `JWT_ACCESS_TOKEN_EXPIRY`  | `60`      | Access token expiry in minutes       |
| `JWT_REFRESH_TOKEN_EXPIRY` | `30`      | Refresh token expiry in days         |
| `CORS_ALLOWED_ORIGINS`     | `*`       | Comma-separated allowed CORS origins |

---

## DummyJSON Compatibility

This API is designed to be compatible with DummyJSON's auth endpoints. The response payload uses camelCase naming to match DummyJSON format:

| DummyJSON Field | Our Field      |
| --------------- | -------------- |
| `id`            | `id`           |
| `username`      | `username`     |
| `email`         | `email`        |
| `firstName`     | `firstName`    |
| `lastName`      | `lastName`     |
| `gender`        | `gender`       |
| `image`         | `image`        |
| `accessToken`   | `accessToken`  |
| `refreshToken`  | `refreshToken` |

**Migration from DummyJSON:**

Simply replace the base URL from `https://dummyjson.com` to your Laravel API URL.

---

## Electron App Integration

### CORS Configuration

The API is configured to allow cross-origin requests. For production, set specific origins:

```env
CORS_ALLOWED_ORIGINS=electron://localhost,http://localhost:3000
```

### Offline-First Support

- Access tokens expire after 60 minutes (configurable)
- Refresh tokens last 30 days (configurable)
- Store tokens locally for offline use
- Refresh tokens when the app comes online

### Token Storage (Electron)

```javascript
// Store tokens securely
const { safeStorage } = require("electron");

// After login
const encryptedAccess = safeStorage.encryptString(accessToken);
const encryptedRefresh = safeStorage.encryptString(refreshToken);
// Save to file or store

// Before API calls
const accessToken = safeStorage.decryptString(encryptedAccess);
```

---

## Error Handling

All error responses follow this format:

```json
{
  "message": "Error description"
}
```

Validation errors include field-specific messages:

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "username": ["The username field is required."],
    "password": ["The password field is required."]
  }
}
```

---

## Migration Process

### Database Migrations

Run the following migrations to add the required tables and columns:

```bash
php artisan migrate
```

This will:

1. Add `username`, `first_name`, `last_name`, `gender`, `image`, `status` columns to `users` table
2. Create `refresh_tokens` table

### Existing Users

For existing users:

- `username` will be `null` (API will use `email` for authentication)
- `first_name` and `last_name` will be `null` (API will generate from `name` field)
- `status` defaults to `active`

---

## Activity Logging

All auth events are logged using the application's activity logger:

- `LOGIN` - Successful login
- `LOGOUT` - User logout
- `REFRESH` - Token refresh
- `FAILED_LOGIN` - Failed login attempt
- `FAILED_REFRESH` - Failed token refresh

Logs include: `user_id`, `ip_address`, `user_agent`, `timestamp`
