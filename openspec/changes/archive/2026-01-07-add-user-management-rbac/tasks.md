# Implementation Tasks: User Management and Role-Based Access Control

**Change ID:** `add-user-management-rbac`  
**Estimated Duration:** 8 working days  
**Last Updated:** 2026-01-05

## Task Overview

This document breaks down the RBAC implementation into ordered, verifiable tasks. Each task delivers user-visible progress and includes validation steps.

---

## Prerequisites

- [x] Confirm `add-dummyjson-authentication` change is implemented
- [x] Verify existing auth tables (`auth_sessions`, `auth_events`) are working
- [x] Review `proposal.md`, `design.md`, and spec delta files
- [x] Ensure shadcn-ui components are available

---

## Phase 1: Database Foundation (Day 1)

### Task 1.1: Create RBAC Database Schema

**Estimated Time:** 2 hours  
**Depends On:** None

- [x] Create SQL migration for `roles` table
- [x] Create SQL migration for `permissions` table
- [x] Create SQL migration for `role_permissions` table
- [x] Create SQL migration for `user_roles` table
- [x] Add appropriate indexes (role_id, permission_id, user_id)
- [x] Integrate migrations into existing database initialization

**Validation:**

```bash
sqlite3 app-data.db ".schema roles"
sqlite3 app-data.db ".schema permissions"
sqlite3 app-data.db ".schema role_permissions"
sqlite3 app-data.db ".schema user_roles"
```

**Acceptance:** All 4 tables created with proper foreign keys ✅

---

### Task 1.2: Seed Default Roles and Permissions

**Estimated Time:** 2 hours  
**Depends On:** Task 1.1

- [x] Create seed script for default roles (SUPERADMIN, CHECKER, LOADER)
- [x] Create seed script for all 9 permissions
- [x] Create seed script for role-permission mappings
- [x] Add seed execution to database initialization
- [x] Ensure idempotent seeding (no duplicates on restart)

**Validation:**

```sql
SELECT r.code, GROUP_CONCAT(p.code) as permissions
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
GROUP BY r.id;
```

**Acceptance:** All roles exist with correct permission mappings ✅

---

### Task 1.3: Seed Test User Role Assignments

**Estimated Time:** 1 hour  
**Depends On:** Task 1.2

- [x] Map DummyJSON test users to local roles:
  - emilys (id: 1) → SUPERADMIN
  - michaelw (id: 2) → CHECKER
  - sophiab (id: 3) → LOADER
- [x] Create user_roles entries for test users
- [x] Document test user credentials in README or docs

**Validation:**

```sql
SELECT ur.user_id, r.code as role
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id;
```

**Acceptance:** Test users have role assignments ✅

---

## Phase 2: Backend RBAC Module (Day 2-3)

### Task 2.1: Create RBACManager Class

**Estimated Time:** 3 hours  
**Depends On:** Task 1.2

- [x] Create `electron/auth/RBACManager.ts`
- [x] Implement `getUserRoles(userId): Promise<Role[]>`
- [x] Implement `getUserPermissions(userId): Promise<Permission[]>`
- [x] Implement `checkPermission(userId, permissionCode): Promise<boolean>`
- [x] Implement `hasAnyPermission(userId, permissions[]): Promise<boolean>`
- [x] Add in-memory caching for performance
- [x] Add cache invalidation method

**Validation:**

```typescript
const rbac = new RBACManager(db);
const roles = await rbac.getUserRoles(1); // Should return ['SUPERADMIN']
const canCreate = await rbac.checkPermission(1, "CREATE_TRANSACTION"); // true
```

**Acceptance:** RBACManager correctly resolves user permissions ✅

---

### Task 2.2: Create RBAC Type Definitions

**Estimated Time:** 1 hour  
**Depends On:** None (can parallel with 2.1)

- [x] Create `src/Shared/Types/RBAC.ts` with:
  - `Role` enum (SUPERADMIN, CHECKER, LOADER)
  - `Permission` enum (all 9 permissions)
  - `RolePermissionMap` type
  - `UserWithRoles` interface
- [x] Export types for use in main and renderer processes

**Acceptance:** Type definitions compile without errors ✅

---

### Task 2.3: Extend AuthManager with Role Loading

**Estimated Time:** 2 hours  
**Depends On:** Task 2.1

- [x] Modify `AuthManager.login()` to load user roles after authentication
- [x] Modify `AuthManager.getCurrentUser()` to include roles and permissions
- [x] Update `AuthResult` interface to include roles
- [x] Update `getSession()` to return roles from cache
- [x] Add role refresh on explicit request

**Validation:**

```typescript
const result = await authManager.login("emilys", "emilyspass");
console.log(result.user.roles); // ['SUPERADMIN']
console.log(result.user.permissions); // ['VIEW_DASHBOARD', 'CREATE_TRANSACTION', ...]
```

**Acceptance:** Login returns user with roles and permissions ✅

---

### Task 2.4: Add RBAC IPC Handlers

**Estimated Time:** 2 hours  
**Depends On:** Task 2.3

- [x] Add IPC handler: `auth:get-permissions` - Returns current user permissions
- [x] Add IPC handler: `auth:check-permission` - Validates single permission
- [x] Add IPC handler: `auth:get-roles` - Returns current user roles
- [x] Expose handlers via contextBridge in preload
- [x] Add TypeScript types for IPC API

**Validation:**

```typescript
// In renderer process
const permissions = await window.electronAPI.getPermissions();
const canView = await window.electronAPI.checkPermission("VIEW_DASHBOARD");
```

**Acceptance:** IPC handlers work from renderer process ✅

---

## Phase 3: Frontend Authorization Layer (Day 4-5)

### Task 3.1: Create AuthorizationContext

**Estimated Time:** 2 hours  
**Depends On:** Task 2.4

- [x] Create `src/Features/Auth/Contexts/AuthorizationContext.tsx`
- [x] Load permissions on mount via IPC
- [x] Provide `permissions` array in context
- [x] Provide `hasPermission(code)` helper function
- [x] Provide `hasAnyPermission(codes[])` helper function
- [x] Handle loading and error states

**Note:** Integrated into existing AuthContext.tsx instead of separate context

**Validation:**

```tsx
const { permissions, hasPermission } = useAuthorization();
console.log(hasPermission("VIEW_DASHBOARD")); // true/false
```

**Acceptance:** Context provides permission checking in React components ✅

---

### Task 3.2: Create usePermission Hook

**Estimated Time:** 1 hour  
**Depends On:** Task 3.1

- [x] Create `src/Features/Auth/Hooks/UsePermission.ts`
- [x] Implement `usePermission(code): boolean`
- [x] Implement `usePermissions(codes[]): boolean[]`
- [x] Memoize results for performance

**Validation:**

```tsx
const canCreateTransaction = usePermission("CREATE_TRANSACTION");
if (canCreateTransaction) {
  /* render button */
}
```

**Acceptance:** Hook returns correct boolean for permission check ✅

---

### Task 3.3: Create PermissionGuard Component

**Estimated Time:** 2 hours  
**Depends On:** Task 3.1

- [x] Create `src/Features/Auth/Components/PermissionGuard.tsx`
- [x] Accept `permission` or `permissions` prop
- [x] Accept `fallback` prop (default: null)
- [x] Accept `mode` prop ('all' | 'any', default: 'all')
- [x] Render children only if authorized
- [x] Show fallback if unauthorized

**Validation:**

```tsx
<PermissionGuard permission="CREATE_TRANSACTION">
  <CreateTransactionButton />
</PermissionGuard>
```

**Acceptance:** Component conditionally renders based on permission ✅

---

### Task 3.4: Create UnauthorizedPage Component

**Estimated Time:** 1 hour  
**Depends On:** None (can parallel)

- [x] Create `src/Features/Auth/Components/UnauthorizedPage.tsx`
- [x] Display "Unauthorized Access" message
- [x] Show user's current role
- [x] Provide "Go Back" button
- [x] Style consistently with app design

**Acceptance:** Clean unauthorized access message displays ✅

---

### Task 3.5: Implement Route Guards

**Estimated Time:** 3 hours  
**Depends On:** Task 3.1, Task 3.4

- [x] Create `src/Features/Auth/Components/ProtectedRoute.tsx`
- [x] Accept `permissions` prop for required permissions
- [x] Redirect to UnauthorizedPage if not permitted
- [x] Integrate with React Router
- [x] Support async permission loading

**Validation:**

```tsx
<Route
  path="/transactions/create"
  element={
    <ProtectedRoute permissions={["CREATE_TRANSACTION"]}>
      <CreateTransactionPage />
    </ProtectedRoute>
  }
/>
```

**Acceptance:** Routes properly block unauthorized access ✅

---

## Phase 4: Role-Based Landing Pages (Day 5-6)

### Task 4.1: Configure Role-Based Routing

**Estimated Time:** 2 hours  
**Depends On:** Task 3.5

- [x] Define route-to-permission mappings
- [x] Implement landing page redirect based on role:
  - SUPERADMIN → `/superadmin`
  - CHECKER → `/checker/transactions`
  - LOADER → `/loader/queue`
- [x] Add route constants file (`src/Features/Auth/Routes/RouteConfig.ts`)
- [x] Update main App router configuration

**Acceptance:** Users land on role-appropriate page after login ✅

---

### Task 4.2: Create Navigation Menu with Filtering

**Estimated Time:** 2 hours  
**Depends On:** Task 3.2

- [x] Create navigation configuration with permission requirements
- [x] Filter menu items based on user permissions
- [x] Hide unauthorized menu sections
- [x] Show role indicator in header/sidebar

**File Created:** `src/Shared/Components/AppNavigation.tsx`

**Validation:**

- Checker sees: Dashboard, Transactions, Payments
- Loader sees: Dashboard, Loader Queue
- Superadmin sees: All menu items

**Acceptance:** Navigation only shows authorized items ✅

---

## Phase 5: Dummy Role Pages (Day 6-8)

### Task 5.1: Create Superadmin Pages

**Estimated Time:** 3 hours  
**Depends On:** Phase 4

- [x] Create `src/Features/Superadmin/` folder structure
- [x] Create Dashboard page (extend existing or new)
- [x] Create Users Management page (table + CRUD placeholders)
- [x] Create Roles & Permissions page (view-only for now)
- [x] Create Reports page (placeholder)
- [x] Add routes with permission guards

**Acceptance:** Superadmin can access all 4 pages ✅

---

### Task 5.1.1: Implement Users Management CRUD Operations

**Estimated Time:** 4 hours  
**Depends On:** Task 5.1

- [x] Add `users` table to database schema
- [x] Add user CRUD methods to RBACManager (`getAllUsers`, `getUserById`, `createUser`, `updateUser`, `deleteUser`, `toggleUserStatus`)
- [x] Add user management IPC handlers in main.ts (`users:getAll`, `users:getById`, `users:create`, `users:update`, `users:delete`, `users:toggleStatus`)
- [x] Expose user management API via preload.ts
- [x] Update TypeScript types in Electron.d.ts (UserData, CreateUserData, UpdateUserData)
- [x] Implement UsersPage.tsx with full CRUD:
  - [x] Fetch users from database on mount
  - [x] Create user dialog with form validation
  - [x] Edit user dialog with pre-populated form
  - [x] Delete user confirmation dialog
  - [x] Toggle user status (active/inactive)
  - [x] Role assignment with checkboxes
  - [x] Search/filter functionality
  - [x] Toast notifications for feedback
  - [x] Loading and error states

**Acceptance:** Full CRUD operations working for user management ✅

---

### Task 5.1.2: Fix Local User Login Issue

**Estimated Time:** 3 hours
**Depends On:** Task 5.1.1

- [x] Identify root cause: AuthManager only uses DummyJSON API, no local auth fallback
- [x] Add `loginLocal()` method to AuthManager for SQLite-based authentication
- [x] Modify `login()` to try API first, fallback to local auth
- [x] Add password hashing using SHA-256 (consistent with RBACManager)
- [x] Implement session creation with dummy tokens for local auth
- [x] Add proper audit logging for local login attempts
- [x] Create test documentation for local user login scenarios
- [x] Test local user login functionality

**Validation:**

1. Create a local user via Users Management page
2. Logout and login with local user credentials
3. Verify user can access features based on assigned role
4. Test offline login with local user
5. Verify audit logs record login attempts

**Acceptance:** Local users can successfully login and access the application ✅

---

### Task 5.2: Create Checker Pages

**Estimated Time:** 3 hours  
**Depends On:** Phase 4

- [x] Create `src/Features/Checker/` folder structure
- [x] Create Transaction List page
- [x] Create Create Transaction page
- [x] Create Payment Verification page
- [x] Add routes with permission guards

**Acceptance:** Checker can access transaction/payment pages only ✅

---

### Task 5.3: Create Operator Loader Pages

**Estimated Time:** 3 hours  
**Depends On:** Phase 4

- [x] Create `src/Features/Loader/` folder structure
- [x] Create Loader Queue page
- [x] Create Loader Assignment Detail page
- [x] Add Update Status functionality (ON_PROGRESS / DONE)
- [x] Add routes with permission guards

**Acceptance:** Loader can access loader pages only ✅

---

## Phase 6: Integration Testing (Day 8)

### Task 6.1: Cross-Role Access Testing

**Estimated Time:** 2 hours
**Depends On:** Phase 5

- [x] Test Checker trying to access `/loader/*` (should fail)
- [x] Test Loader trying to access `/transactions/*` (should fail)
- [x] Test Superadmin accessing all routes (should succeed)
- [x] Test unauthorized route shows UnauthorizedPage
- [x] Verify audit logs for access attempts

**Acceptance:** All cross-role access correctly blocked

---

### Task 6.2: Offline Permission Testing

**Estimated Time:** 2 hours  
**Depends On:** Task 6.1

- [ ] Login as Checker while online
- [ ] Disconnect network
- [ ] Verify permissions still work offline
- [ ] Verify role-based routing works offline
- [ ] Verify menu filtering works offline

**Acceptance:** RBAC fully functional offline after initial login

---

### Task 6.3: Documentation Update

**Estimated Time:** 1 hour  
**Depends On:** Task 6.2

- [ ] Update AUTH_USER_GUIDE.md with role information
- [ ] Add RBAC section to AUTH_DEVELOPER_GUIDE.md
- [ ] Update TEST_CREDENTIALS.md with role assignments
- [ ] Add permission reference table

**Acceptance:** Documentation covers RBAC usage

---

## Completion Checklist

- [x] All database tables created and seeded
- [x] RBACManager fully functional
- [x] AuthManager extended with roles
- [x] IPC handlers exposed via preload
- [x] AuthorizationContext available in React (integrated into AuthContext)
- [x] PermissionGuard component working
- [x] Route guards implemented
- [x] Role-based landing pages functional
- [x] All dummy pages created
- [x] User Management CRUD implemented (Create, Read, Update, Delete, Toggle Status)
- [x] Local user login issue fixed (now supports both API and local auth)
- [x] Fixed Loader role routing issue - removed VIEW_DASHBOARD permission from LOADER role and added ProtectedRoute to /dashboard
- [x] Fixed automatic redirect to role-based landing page after login - added canAccessRouteForRoles helper to prevent unauthorized route access
- [ ] Cross-role access properly blocked (needs testing)
- [ ] Offline permissions verified (needs testing)
- [ ] Documentation updated (pending)
