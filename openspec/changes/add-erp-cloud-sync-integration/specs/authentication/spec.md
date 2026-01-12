# Authentication Specification Changes

## MODIFIED Requirements

### Requirement: User Login

The system SHALL enable users to authenticate using username and password credentials through ERP Cloud API (configurable via app_settings), and SHALL load user roles and permissions after successful authentication.

**Priority:** Must Have  
**ID:** AUTH-001

#### Scenario: Successful login with valid credentials

**Given** the application is running and network is available  
**And** ERP Cloud API URL is configured in app_settings  
**And** the user is on the login screen  
**When** the user enters valid username and password  
**And** the user clicks the "Login" button  
**Then** the system shall send authentication request to configured ERP Cloud API  
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
**Then** the system shall receive authentication error from ERP Cloud API  
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

#### Scenario: Login with unconfigured ERP URL

**Given** the application is running  
**And** ERP Cloud API URL is not configured (empty or null)  
**When** the user attempts to login  
**Then** the system shall use default fallback URL (http://localhost:8000/api)  
**And** the login process shall proceed normally

---

## ADDED Requirements

### Requirement: Dynamic API Configuration

The system SHALL support dynamic configuration of ERP Cloud API endpoint through app_settings.

**Priority:** Must Have  
**ID:** AUTH-009

#### Scenario: ERPClient loads URL from settings

**Given** app_settings contains erp_api_url value  
**When** ERPClient is instantiated without explicit URL parameter  
**Then** ERPClient shall load baseUrl from app_settings  
**And** all API calls shall use the configured URL

#### Scenario: ERPClient accepts explicit URL parameter

**Given** ERPClient is instantiated with explicit URL parameter  
**When** API calls are made  
**Then** ERPClient shall use the provided URL  
**And** app_settings value shall be ignored

#### Scenario: Test ERP connection

**Given** admin is on settings page  
**And** ERP API URL is entered  
**When** admin clicks "Test Connection" button  
**Then** system shall attempt to call ERP health check endpoint  
**And** system shall display connection status (success/failure)  
**And** system shall display response latency if successful
