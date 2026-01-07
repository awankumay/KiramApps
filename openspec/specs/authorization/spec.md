# authorization Specification

## Purpose
TBD - created by archiving change add-user-management-rbac. Update Purpose after archive.
## Requirements
### Requirement: Permission Resolution

The system SHALL resolve a user's effective permissions by aggregating permissions from all assigned roles.

**Priority:** Must Have  
**ID:** AUTHZ-001

#### Scenario: Resolve permissions for single-role user

**Given** a user has role CHECKER assigned  
**And** CHECKER role has permissions: VIEW_DASHBOARD, CREATE_TRANSACTION, VIEW_TRANSACTION, VERIFY_PAYMENT  
**When** the system resolves the user's permissions  
**Then** the system shall return exactly those 4 permissions  
**And** the permissions shall be retrieved from local SQLite database

#### Scenario: Resolve permissions for multi-role user

**Given** a user has both CHECKER and LOADER roles assigned  
**When** the system resolves the user's permissions  
**Then** the system shall return the UNION of permissions from both roles  
**And** duplicate permissions shall appear only once  
**And** the result shall include: VIEW_DASHBOARD, CREATE_TRANSACTION, VIEW_TRANSACTION, VERIFY_PAYMENT, VIEW_LOADER_QUEUE, UPDATE_LOADER_STATUS

#### Scenario: Resolve permissions for user without roles

**Given** a user has no roles assigned  
**When** the system resolves the user's permissions  
**Then** the system shall return an empty permission set  
**And** the user shall be denied access to all protected resources

---

### Requirement: Backend Permission Checking

The system SHALL validate permissions in the main process before executing sensitive IPC operations.

**Priority:** Must Have  
**ID:** AUTHZ-002

#### Scenario: IPC call with valid permission

**Given** the user is authenticated with role CHECKER  
**And** CHECKER has CREATE_TRANSACTION permission  
**When** the renderer process calls `transactions:create` IPC handler  
**Then** the main process shall verify the user has CREATE_TRANSACTION permission  
**And** the main process shall execute the operation  
**And** the result shall be returned to the renderer

#### Scenario: IPC call without required permission

**Given** the user is authenticated with role LOADER  
**And** LOADER does NOT have CREATE_TRANSACTION permission  
**When** the renderer process calls `transactions:create` IPC handler  
**Then** the main process shall verify the user lacks CREATE_TRANSACTION permission  
**And** the main process shall return error: `{ error: 'UNAUTHORIZED', message: 'Permission denied: CREATE_TRANSACTION' }`  
**And** the operation shall NOT be executed  
**And** the system shall log the unauthorized attempt to audit log

#### Scenario: Permission check while offline

**Given** the user logged in while online  
**And** roles and permissions are cached locally  
**And** the application is now offline  
**When** an IPC handler checks permission  
**Then** the system shall use locally cached permission data  
**And** the permission check shall succeed without network access

---

### Requirement: Permission Loading on Authentication

The system SHALL load user roles and permissions immediately after successful authentication.

**Priority:** Must Have  
**ID:** AUTHZ-003

#### Scenario: Load permissions after login

**Given** the user successfully authenticates via DummyJSON API  
**And** user_roles table contains role assignment for this user  
**When** the login process completes  
**Then** the system shall query user_roles to get assigned roles  
**And** the system shall query role_permissions to get all permissions  
**And** the system shall cache roles and permissions in memory  
**And** the AuthResult shall include roles and permissions arrays

#### Scenario: Load permissions for user not in user_roles

**Given** the user successfully authenticates via DummyJSON API  
**And** user_roles table does NOT contain entries for this user  
**When** the login process completes  
**Then** the system shall return empty roles array  
**And** the system shall return empty permissions array  
**And** the user shall see a message: "No roles assigned. Contact administrator."

#### Scenario: Session restoration with cached permissions

**Given** the user previously logged in and has a valid local session  
**And** roles and permissions were cached during login  
**When** the application restarts  
**Then** the system shall restore roles and permissions from session cache  
**And** the user shall not need to re-authenticate for permission data

---

### Requirement: Frontend Permission Context

The system SHALL provide a React context for accessing user permissions throughout the application.

**Priority:** Must Have  
**ID:** AUTHZ-004

#### Scenario: Access permissions in React component

**Given** the user is authenticated  
**And** AuthorizationContext is provided at app root  
**When** a component uses useAuthorization hook  
**Then** the hook shall return:

- `permissions`: string[] of permission codes
- `roles`: string[] of role codes
- `hasPermission(code)`: function returning boolean
- `hasAnyPermission(codes[])`: function returning boolean
- `isLoading`: boolean for loading state

#### Scenario: Permission check with hasPermission

**Given** the user has permissions: VIEW_DASHBOARD, CREATE_TRANSACTION  
**When** a component calls `hasPermission('CREATE_TRANSACTION')`  
**Then** the function shall return `true`  
**When** a component calls `hasPermission('MANAGE_USERS')`  
**Then** the function shall return `false`

---

### Requirement: Permission Guard Component

The system SHALL provide a PermissionGuard component for conditionally rendering UI based on permissions.

**Priority:** Must Have  
**ID:** AUTHZ-005

#### Scenario: Render children when permitted

**Given** the user has CREATE_TRANSACTION permission  
**When** the component renders:

```tsx
<PermissionGuard permission="CREATE_TRANSACTION">
  <CreateButton />
</PermissionGuard>
```

**Then** the CreateButton shall be rendered

#### Scenario: Hide children when not permitted

**Given** the user does NOT have MANAGE_USERS permission  
**When** the component renders:

```tsx
<PermissionGuard permission="MANAGE_USERS">
  <AdminPanel />
</PermissionGuard>
```

**Then** the AdminPanel shall NOT be rendered  
**And** nothing shall be rendered (null) by default

#### Scenario: Render fallback when not permitted

**Given** the user does NOT have MANAGE_USERS permission  
**When** the component renders:

```tsx
<PermissionGuard permission="MANAGE_USERS" fallback={<ContactAdmin />}>
  <AdminPanel />
</PermissionGuard>
```

**Then** the ContactAdmin component shall be rendered

#### Scenario: Check multiple permissions with any mode

**Given** the user has VIEW_TRANSACTION but not CREATE_TRANSACTION  
**When** the component renders:

```tsx
<PermissionGuard
  permissions={["VIEW_TRANSACTION", "CREATE_TRANSACTION"]}
  mode="any"
>
  <TransactionSection />
</PermissionGuard>
```

**Then** the TransactionSection shall be rendered (any permission matches)

#### Scenario: Check multiple permissions with all mode

**Given** the user has VIEW_TRANSACTION but not CREATE_TRANSACTION  
**When** the component renders:

```tsx
<PermissionGuard
  permissions={["VIEW_TRANSACTION", "CREATE_TRANSACTION"]}
  mode="all"
>
  <TransactionSection />
</PermissionGuard>
```

**Then** the TransactionSection shall NOT be rendered (all permissions required)

---

### Requirement: Route Protection

The system SHALL protect routes based on required permissions, redirecting unauthorized users.

**Priority:** Must Have  
**ID:** AUTHZ-006

#### Scenario: Access protected route with permission

**Given** the user has CREATE_TRANSACTION permission  
**And** route /transactions/create requires CREATE_TRANSACTION  
**When** the user navigates to /transactions/create  
**Then** the system shall render the CreateTransaction page  
**And** no redirect shall occur

#### Scenario: Access protected route without permission

**Given** the user has role LOADER (no CREATE_TRANSACTION permission)  
**And** route /transactions/create requires CREATE_TRANSACTION  
**When** the user navigates to /transactions/create  
**Then** the system shall NOT render the CreateTransaction page  
**And** the system shall redirect to /unauthorized  
**And** the Unauthorized page shall display:

- Message: "You don't have permission to access this page"
- Current user's role(s)
- "Go Back" or "Go to Dashboard" button

#### Scenario: Access route during permission loading

**Given** the user is authenticated  
**And** permissions are being loaded from IPC  
**When** the user navigates to a protected route  
**Then** the system shall show a loading indicator  
**And** the system shall NOT redirect until loading completes

---

### Requirement: Navigation Filtering

The system SHALL filter navigation menu items based on user permissions.

**Priority:** Should Have  
**ID:** AUTHZ-007

#### Scenario: Filter navigation for Checker role

**Given** the user has role CHECKER with permissions: VIEW_DASHBOARD, CREATE_TRANSACTION, VIEW_TRANSACTION, VERIFY_PAYMENT  
**When** the navigation menu renders  
**Then** the menu shall show:

- Dashboard
- Transactions submenu (Create, List)
- Payments (Verify)  
  **And** the menu shall NOT show:
- Users Management
- Roles & Permissions
- Loader Queue
- Reports

#### Scenario: Filter navigation for Superadmin role

**Given** the user has role SUPERADMIN with all permissions  
**When** the navigation menu renders  
**Then** the menu shall show all menu items  
**And** no items shall be hidden

---

### Requirement: Authorization Audit Logging

The system SHALL log authorization failures to the audit log for security monitoring.

**Priority:** Should Have  
**ID:** AUTHZ-008

#### Scenario: Log unauthorized IPC attempt

**Given** a user attempts an IPC call without required permission  
**When** the permission check fails  
**Then** the system shall log to auth_events table:

- event_type: 'AUTHORIZATION_FAILED'
- user_id: current user ID
- details: { permission: 'PERMISSION_CODE', action: 'ipc_handler_name' }
- timestamp: current timestamp

#### Scenario: Log unauthorized route access attempt

**Given** a user navigates to a protected route without permission  
**When** the route guard blocks access  
**Then** the system shall log to auth_events table:

- event_type: 'ROUTE_ACCESS_DENIED'
- user_id: current user ID
- details: { route: '/path', required_permissions: [...] }

