# authentication Specification

## Purpose
TBD - created by archiving change add-dummyjson-authentication. Update Purpose after archive.
## Requirements
### Requirement: User Login

The system SHALL enable users to authenticate using username and password credentials through DummyJSON API, and SHALL load user roles and permissions after successful authentication.

**Priority:** Must Have  
**ID:** AUTH-001

#### Scenario: Successful login with valid credentials

**Given** the application is running and network is available  
**And** the user is on the login screen  
**When** the user enters valid username "emilys" and password "emilyspass"  
**And** the user clicks the "Login" button  
**Then** the system shall send authentication request to DummyJSON API  
**And** the system shall receive access token and refresh token  
**And** the system shall encrypt and store tokens in local SQLite database  
**And** the system shall store user profile (id, username, email, name)  
**And** the system shall query user_roles table for assigned roles  
**And** the system shall query role_permissions to resolve permissions  
**And** the system shall cache roles and permissions in session  
**And** the AuthResult shall include roles: string[] and permissions: string[]  
**And** the user shall be redirected to role-appropriate landing page  
**And** the authentication state shall persist across application restarts

#### Scenario: Failed login with invalid credentials

**Given** the application is running and network is available  
**And** the user is on the login screen  
**When** the user enters invalid username or password  
**And** the user clicks the "Login" button  
**Then** the system shall receive authentication error from DummyJSON API  
**And** the system shall display clear error message "Invalid username or password"  
**And** the user shall remain on the login screen  
**And** the password field shall be cleared  
**And** no tokens or user data shall be stored locally

#### Scenario: Login attempt without network connection

**Given** the application is running and network is not available  
**And** the user is on the login screen  
**And** no previous session exists in local storage  
**When** the user enters any credentials  
**And** the user clicks the "Login" button  
**Then** the system shall detect network unavailability  
**And** the system shall display error message "Cannot connect to server. Please check your internet connection."  
**And** the user shall remain on the login screen with retry option

#### Scenario: Login with valid credentials but no role assignments

**Given** the application is running and network is available  
**And** the user enters valid credentials  
**And** user_roles table has no entries for this user  
**When** the login completes successfully  
**Then** the system shall return empty roles array  
**And** the system shall return empty permissions array  
**And** the user shall be redirected to a "No Access" page  
**And** the page shall display: "No roles assigned. Please contact your administrator."

---

### Requirement: Offline Session Persistence

The system MUST maintain user authentication state offline after initial login, including cached roles and permissions.

**Priority:** Must Have  
**ID:** AUTH-002

#### Scenario: App restart with valid offline session

**Given** the user has previously logged in successfully  
**And** the session tokens are stored in local database  
**And** the access token has not expired  
**And** roles and permissions were cached during login  
**And** the application is restarted without network connection  
**When** the application loads  
**Then** the system shall retrieve session from local SQLite database  
**And** the system shall decrypt stored tokens using Electron safeStorage  
**And** the system shall validate token expiry timestamp  
**And** the system shall load user profile from local cache  
**And** the system shall restore cached roles and permissions  
**And** the user shall be automatically authenticated  
**And** the user shall access main application without re-login  
**And** RBAC enforcement shall work using cached permissions

#### Scenario: Offline validation with expired token

**Given** the user has previously logged in  
**And** the access token has expired (>60 minutes old)  
**And** the application is offline (no network)  
**When** the application loads or user attempts authenticated action  
**Then** the system shall detect token expiry from stored timestamp  
**And** the system shall use cached user identity (acceptable for offline-first)  
**And** the system shall use cached roles and permissions for authorization  
**And** the user shall continue working with cached session  
**And** the system shall mark session for refresh when online  
**And** the application shall remain fully functional

#### Scenario: Session data corruption

**Given** the user has previously logged in  
**And** the local database contains corrupted session data  
**When** the application attempts to load session  
**Then** the system shall detect data corruption or decryption failure  
**And** the system shall clear invalid session data  
**And** the system shall log error to audit log  
**And** the user shall be redirected to login screen  
**And** the system shall display message "Session expired. Please log in again."

---

### Requirement: Token Encryption and Storage

Authentication tokens MUST be encrypted at rest using OS-level encryption and stored securely in local SQLite database, never exposed to renderer process.

**Priority:** Must Have  
**ID:** AUTH-003

#### Scenario: Token storage after successful login

**Given** the user successfully authenticates with DummyJSON API  
**And** the system receives accessToken and refreshToken  
**When** the system stores tokens  
**Then** the system shall encrypt tokens using Electron safeStorage API  
**And** on Windows, safeStorage shall use Windows DPAPI encryption  
**And** the system shall store encrypted tokens as BLOB in `auth_sessions` table  
**And** the system shall store token expiry timestamp as DATETIME  
**And** the system shall mark session as active (is_active = 1)  
**And** plain text tokens shall never be written to disk  
**And** tokens shall never be accessible to renderer process

#### Scenario: Token retrieval for authenticated request

**Given** the application needs to make authenticated API request  
**And** valid session exists in database  
**When** the main process retrieves token  
**Then** the system shall query active session from `auth_sessions` table  
**And** the system shall decrypt access token using safeStorage  
**And** the system shall return decrypted token to request handler  
**And** the token shall remain in main process memory only  
**And** the token shall never be sent to renderer process  
**And** the system shall validate token is not expired before use

#### Scenario: Multiple concurrent token requests

**Given** the application makes multiple simultaneous authenticated requests  
**And** valid session exists  
**When** multiple components request authentication token  
**Then** the system shall handle concurrent database reads safely  
**And** the system shall decrypt token only once per request  
**And** the system shall not cache decrypted tokens in memory  
**And** each request shall complete with valid token  
**And** no race conditions shall occur in token retrieval

---

### Requirement: Automatic Token Refresh

The system SHALL automatically refresh expired access tokens using stored refresh token when network is available.

**Priority:** Should Have  
**ID:** AUTH-004

#### Scenario: Token refresh on API call with expired access token

**Given** the user is authenticated  
**And** the access token has expired  
**And** the refresh token is still valid  
**And** network connection is available  
**When** the application makes authenticated API request  
**And** the request fails with 401 Unauthorized  
**Then** the system shall detect token expiry from response  
**And** the system shall retrieve refresh token from secure storage  
**And** the system shall call DummyJSON refresh endpoint with refresh token  
**And** the system shall receive new access token and refresh token  
**And** the system shall encrypt and update tokens in database  
**And** the system shall update `last_refreshed_at` timestamp  
**And** the system shall retry original API request with new token  
**And** the operation shall complete successfully  
**And** the user shall not see any error or interruption

#### Scenario: Token refresh failure due to invalid refresh token

**Given** the user is authenticated  
**And** both access token and refresh token have expired  
**And** network connection is available  
**When** the system attempts to refresh token  
**And** the refresh request fails with 401 or 403  
**Then** the system shall clear invalid session from database  
**And** the system shall update authentication state to logged out  
**And** the system shall redirect user to login screen  
**And** the system shall display message "Session expired. Please log in again."  
**And** the system shall log authentication event to audit log

#### Scenario: Token refresh attempt while offline

**Given** the user is authenticated  
**And** the access token has expired  
**And** network connection is not available  
**When** the system detects expired token  
**Then** the system shall NOT attempt network request  
**And** the system shall continue with cached user session  
**And** the system shall mark session for refresh when online  
**And** the user shall continue working offline without interruption

---

### Requirement: Secure IPC Communication

Authentication operations MUST communicate securely between renderer and main process through Electron IPC with contextBridge isolation.

**Priority:** Must Have  
**ID:** AUTH-005

#### Scenario: Login request from renderer to main process

**Given** the user enters credentials in login form  
**And** the renderer process needs to authenticate  
**When** the renderer calls `window.api.auth.login(username, password)`  
**Then** the call shall be proxied through contextBridge in preload script  
**And** the IPC message shall be sent to main process handler `auth:login`  
**And** credentials shall be transmitted securely over IPC  
**And** no credentials shall be logged or exposed in DevTools  
**And** the main process shall perform authentication logic  
**And** the main process shall return user profile (without tokens) to renderer  
**And** tokens shall never be sent to renderer process

#### Scenario: Get current user from renderer

**Given** the renderer needs to display current user information  
**When** the renderer calls `window.api.auth.getCurrentUser()`  
**Then** the call shall be proxied through contextBridge  
**And** the main process shall retrieve active session from database  
**And** the main process shall return user profile object (id, username, email, name)  
**And** tokens shall not be included in response  
**And** if no session exists, null shall be returned  
**And** the operation shall complete in less than 50ms

#### Scenario: Logout request

**Given** the user is authenticated  
**And** the user clicks logout button  
**When** the renderer calls `window.api.auth.logout()`  
**Then** the call shall be proxied through contextBridge  
**And** the main process shall mark session as inactive in database  
**And** the main process shall clear in-memory token cache (if any)  
**And** the main process shall log logout event to audit log  
**And** the main process shall return success confirmation  
**And** the renderer shall clear user state  
**And** the renderer shall redirect to login screen

---

### Requirement: Authentication UI Components

The application MUST provide intuitive login user interface with proper validation, error handling, and accessibility.

**Priority:** Must Have  
**ID:** AUTH-006

#### Scenario: Display login form on unauthenticated access

**Given** the application starts  
**And** no valid session exists  
**When** the application loads  
**Then** the system shall display login screen  
**And** the login form shall contain username input field  
**And** the login form shall contain password input field (type="password")  
**And** the login form shall contain "Login" submit button  
**And** the form shall be keyboard accessible (tab navigation)  
**And** the form shall support Enter key to submit  
**And** the login button shall be disabled while request is in progress

#### Scenario: Form validation before submission

**Given** the user is on login screen  
**When** the user clicks "Login" button  
**And** username field is empty  
**Then** the system shall prevent form submission  
**And** the system shall display validation error "Username is required"  
**And** the username field shall be highlighted with error state  
**When** the user clicks "Login" button  
**And** password field is empty  
**Then** the system shall prevent form submission  
**And** the system shall display validation error "Password is required"  
**And** the password field shall be highlighted with error state

#### Scenario: Display loading state during authentication

**Given** the user has submitted valid login form  
**When** authentication request is in progress  
**Then** the "Login" button shall display loading indicator  
**And** the button shall be disabled to prevent duplicate submissions  
**And** username and password fields shall be disabled  
**And** the loading state shall be visible until response received  
**And** if request takes >2 seconds, progress message shall be shown

#### Scenario: Display authenticated user in application header

**Given** the user is successfully authenticated  
**And** the main application screen is displayed  
**When** the application renders header component  
**Then** the header shall display current username  
**And** the header shall display user email (if available)  
**And** the header shall display "Logout" button  
**And** the user information shall be retrieved via `getCurrentUser()`  
**And** logout button shall be clearly visible and accessible

---

### Requirement: Authentication Audit Logging

The system SHALL maintain audit log of all authentication events for security monitoring and troubleshooting.

**Priority:** Should Have  
**ID:** AUTH-007

#### Scenario: Log successful login event

**Given** the user successfully logs in  
**When** authentication completes  
**Then** the system shall insert record to `auth_events` table  
**And** event_type shall be 'login'  
**And** user_id and username shall be recorded  
**And** success shall be 1 (true)  
**And** timestamp shall be current datetime  
**And** ip_address shall be recorded (if available)  
**And** user_agent shall be recorded (Electron version info)

#### Scenario: Log failed login attempt

**Given** the user attempts login with invalid credentials  
**When** authentication fails  
**Then** the system shall insert record to `auth_events` table  
**And** event_type shall be 'login'  
**And** username shall be recorded (but not password)  
**And** success shall be 0 (false)  
**And** error_message shall describe failure reason  
**And** timestamp shall be current datetime  
**And** no sensitive information shall be logged

#### Scenario: Log token refresh events

**Given** the system performs automatic token refresh  
**When** refresh completes (success or failure)  
**Then** the system shall insert record to `auth_events` table  
**And** event_type shall be 'refresh'  
**And** user_id shall be recorded  
**And** success flag shall indicate refresh result  
**And** error_message shall be recorded on failure  
**And** timestamp shall be current datetime

#### Scenario: Log logout events

**Given** the user logs out  
**When** logout completes  
**Then** the system shall insert record to `auth_events` table  
**And** event_type shall be 'logout'  
**And** user_id and username shall be recorded  
**And** success shall be 1 (always succeeds)  
**And** timestamp shall be current datetime

---

### Requirement: Role Information in Session

The system SHALL include user roles and permissions in the session data returned to the renderer process.

**Priority:** Must Have  
**ID:** AUTH-010

#### Scenario: Get current user with roles

**Given** the user is authenticated  
**When** the renderer process calls `auth:get-user` IPC  
**Then** the response shall include:

- user: { id, username, email, firstName, lastName }
- roles: string[] (role codes)
- permissions: string[] (permission codes)
- expiresAt: string (ISO timestamp)

#### Scenario: Get permissions only

**Given** the user is authenticated  
**When** the renderer process calls `auth:get-permissions` IPC  
**Then** the response shall return string[] of permission codes  
**And** the response shall be derived from cached session data

#### Scenario: Check single permission

**Given** the user is authenticated  
**When** the renderer process calls `auth:check-permission` with permission code  
**Then** the response shall return boolean indicating if user has permission  
**And** the check shall use locally cached permissions

