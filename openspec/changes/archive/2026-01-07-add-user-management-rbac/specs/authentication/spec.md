# Capability: Authentication (Delta)

**Status:** Modified  
**Version:** 1.1.0  
**Owner:** Development Team  
**Last Updated:** 2026-01-05

## Overview

This delta modifies the existing Authentication capability to integrate role and permission loading after successful authentication.

---

## MODIFIED Requirements

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

## ADDED Requirements

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
