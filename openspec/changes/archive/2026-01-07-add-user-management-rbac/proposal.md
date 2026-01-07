# Change: Add User Management and Role-Based Access Control

**Change ID:** `add-user-management-rbac`  
**Status:** Draft  
**Created:** 2026-01-05  
**Author:** AI Assistant

## Why

The Surat Masuk Digital application is an offline-first mining transaction system that requires:

1. **User identity verification** - Multiple operators work across different roles (Gate, Checker, Loader)
2. **Fraud prevention** - Strict role separation prevents unauthorized access (e.g., Checker cannot modify loader status)
3. **Audit trails** - Each action must be traceable to a specific user
4. **ERP synchronization readiness** - User/role structure must align with future ERP integration

Currently, the system has basic authentication via DummyJSON but lacks role definitions, permission enforcement, and role-based page routing.

## What Changes

### Database Layer

- Add `roles` table for role definitions (Superadmin, Checker, Operator Loader)
- Add `permissions` table for permission codes
- Add `role_permissions` table for role-permission mapping
- Add `user_roles` table for user-role assignments
- Modify `users` table (if needed) to support local user management

### Backend/Main Process

- Add `RBACManager` class for permission checking in main process
- Add role/permission constants (enums/types)
- Add IPC handlers for role validation and permission checks
- Extend `AuthManager` to load user roles after authentication
- Add database seeding for default roles and permissions

### Frontend

- Add `AuthorizationContext` for app-wide permission state
- Add `PermissionGuard` component for route protection
- Add `usePermission` hook for conditional UI rendering
- Create role-based landing page routing
- Implement menu filtering based on permissions

### Role-Based Pages (Dummy UI)

- **Superadmin:** Dashboard, Users Management, Roles & Permissions, Reports
- **Checker:** Create Transaction, Transaction List, Payment Verification
- **Operator Loader:** Loader Queue, Loader Assignment Detail

## Impact

- **Affected specs:**
  - Authentication (MODIFIED - extend with role loading)
  - User Management (NEW capability)
  - Authorization (NEW capability)
  - Role-Based Pages (NEW capability)
- **Affected code:**

  - `electron/auth/AuthManager.ts` - Extend to load user roles
  - `electron/auth/database.ts` - Add new tables
  - `electron/auth/RBACManager.ts` - New RBAC module
  - `electron/main.ts` - Add IPC handlers for authorization
  - `electron/preload.ts` - Expose authorization API
  - `src/Features/Auth/Contexts/` - Extend with authorization context
  - `src/Features/Auth/Hooks/` - Add usePermission hook
  - `src/Features/Auth/Components/` - Add PermissionGuard
  - `src/Features/Superadmin/` - New feature folder
  - `src/Features/Checker/` - New feature folder
  - `src/Features/Loader/` - New feature folder
  - `src/Shared/Types/` - Add RBAC types

- **Database changes:** Add 4 new tables (roles, permissions, role_permissions, user_roles)
- **Breaking changes:** None (additive feature on top of existing auth)

## Success Criteria

- [ ] Checker cannot access `/loader/*` or `/users/*` routes
- [ ] Operator Loader cannot access `/transactions/*` or `/payments/*` routes
- [ ] Superadmin can access all features
- [ ] Unauthorized route access shows "Unauthorized Access" page
- [ ] Menu items are hidden based on user permissions
- [ ] Roles and permissions persist offline after initial sync
- [ ] Audit log records role-based access attempts

## Dependencies

- **Requires:** `add-dummyjson-authentication` change (authentication foundation)
- **Builds on:** Existing SQLite database infrastructure
- **Uses:** shadcn-ui components for dummy pages

## Out of Scope

- ERP user creation/sync (future phase)
- Advanced permission UI editor
- Payroll/HR features
- MFA implementation
