# Design: User Management and Role-Based Access Control

**Change ID:** `add-user-management-rbac`  
**Last Updated:** 2026-01-05

## Context

The Surat Masuk Digital application operates at remote mining locations with unreliable internet. Multiple operator roles exist:

- **Gate operators** - Handle check-in/check-out
- **Checkers** - Validate orders and payments
- **Loader operators** - Manage material loading
- **Supervisors (Superadmin)** - Full system access

Without RBAC, any authenticated user could access any feature, creating fraud risk and operational confusion. The system must enforce role-based restrictions both online and offline.

### Constraints

- Must work 100% offline after initial authentication
- Must integrate with existing DummyJSON auth flow
- Must support future ERP user synchronization
- Must use existing SQLite infrastructure
- Cannot require additional external dependencies

### Stakeholders

- Field operators (end users)
- Supervisors (administrative users)
- Development team (implementation)
- Future ERP integration team

## Goals / Non-Goals

### Goals

- Implement centralized role and permission management in SQLite
- Enforce RBAC at both frontend (UI) and backend (IPC) layers
- Support offline permission validation using cached role data
- Provide clear role-to-page mapping for navigation
- Create extensible permission system for future features

### Non-Goals

- Dynamic role/permission UI editor (future phase)
- Real-time ERP user synchronization
- Multi-tenancy or organization-level permissions
- Granular field-level permissions
- Permission inheritance hierarchies

## Decisions

### Decision 1: Permission Model Architecture

**Decision:** Use a flat permission-code model with explicit role-permission mappings.

**Alternatives Considered:**

| Approach                      | Pros                            | Cons                          |
| ----------------------------- | ------------------------------- | ----------------------------- |
| **Flat Permissions** (chosen) | Simple, explicit, easy to audit | More rows in role_permissions |
| Hierarchical Permissions      | Compact, inheritance            | Complex offline resolution    |
| Resource-Action Pattern       | RESTful, granular               | Overhead for simple use cases |

**Rationale:** Flat permissions are straightforward to validate offline. Each permission is a single string check. The mining app has ~10 permissions; complexity is manageable.

### Decision 2: Permission Storage Location

**Decision:** Store permissions in SQLite tables, load into memory on app start.

**Flow:**

```
App Start
    │
    ▼
Load roles/permissions from SQLite
    │
    ▼
Cache in RBACManager (main process)
    │
    ▼
Expose via IPC to renderer
    │
    ▼
AuthorizationContext caches in React state
```

**Rationale:** SQLite provides persistence. In-memory cache avoids repeated DB queries. IPC boundary maintains security.

### Decision 3: Frontend Permission Enforcement

**Decision:** Dual-layer enforcement with `PermissionGuard` component and route middleware.

```tsx
// Component-level protection
<PermissionGuard permission="CREATE_TRANSACTION">
  <CreateTransactionButton />
</PermissionGuard>

// Route-level protection (in router config)
{
  path: '/transactions/create',
  element: <CreateTransaction />,
  permissions: ['CREATE_TRANSACTION']
}
```

**Rationale:** Route guards prevent page access. Component guards hide unauthorized UI elements. Both are needed for complete UX.

### Decision 4: Backend Permission Enforcement

**Decision:** IPC handlers validate permissions before executing operations.

```typescript
// In main process IPC handler
ipcMain.handle("transactions:create", async (event, data) => {
  const hasPermission = await rbacManager.check(userId, "CREATE_TRANSACTION");
  if (!hasPermission) {
    return { error: "UNAUTHORIZED", message: "Permission denied" };
  }
  // ... proceed with operation
});
```

**Rationale:** Frontend enforcement can be bypassed. Backend must be authoritative. All sensitive IPC handlers require permission validation.

### Decision 5: Role Assignment Strategy

**Decision:** Users are assigned roles via `user_roles` junction table. One user can have multiple roles.

```sql
user_roles
├── user_id (FK → users.id)
├── role_id (FK → roles.id)
└── assigned_at (timestamp)
```

**Rationale:** Many-to-many allows flexibility (e.g., supervisor who also loads). Permission aggregation uses UNION of role permissions.

### Decision 6: Default Test Users

**Decision:** Seed database with test users matching DummyJSON accounts.

| DummyJSON User | Local Role      | Purpose           |
| -------------- | --------------- | ----------------- |
| emilys         | Superadmin      | Test full access  |
| michaelw       | Checker         | Test checker flow |
| sophiab        | Operator Loader | Test loader flow  |

**Rationale:** DummyJSON has predefined test accounts. Mapping them to local roles enables immediate testing without custom backend.

## Risks / Trade-offs

| Risk                             | Probability | Impact | Mitigation                                      |
| -------------------------------- | ----------- | ------ | ----------------------------------------------- |
| Permission cache gets stale      | Low         | Medium | Reload on app restart, manual sync option       |
| DummyJSON users don't exist      | Low         | Low    | Document valid test users, fallback handling    |
| Frontend bypass attempts         | Medium      | Low    | Backend validation is authoritative             |
| Role changes require app restart | Medium      | Low    | Acceptable for offline-first; add refresh later |

## Data Model

### New Tables

```sql
-- Role definitions
CREATE TABLE roles (
  id INTEGER PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,  -- 'SUPERADMIN', 'CHECKER', 'LOADER'
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Permission definitions
CREATE TABLE permissions (
  id INTEGER PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,  -- 'CREATE_TRANSACTION'
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Role-permission mapping
CREATE TABLE role_permissions (
  role_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (permission_id) REFERENCES permissions(id)
);

-- User-role assignment
CREATE TABLE user_roles (
  user_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);
```

### Permission Codes

```typescript
enum Permission {
  VIEW_DASHBOARD = "VIEW_DASHBOARD",
  CREATE_TRANSACTION = "CREATE_TRANSACTION",
  VIEW_TRANSACTION = "VIEW_TRANSACTION",
  VERIFY_PAYMENT = "VERIFY_PAYMENT",
  VIEW_LOADER_QUEUE = "VIEW_LOADER_QUEUE",
  UPDATE_LOADER_STATUS = "UPDATE_LOADER_STATUS",
  MANAGE_USERS = "MANAGE_USERS",
  MANAGE_ROLES = "MANAGE_ROLES",
  VIEW_REPORTS = "VIEW_REPORTS",
}
```

## Component Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     React Renderer                        │
│  ┌─────────────────────────────────────────────────────┐ │
│  │            AuthorizationContext                      │ │
│  │  ┌──────────────┐  ┌────────────────────────────┐   │ │
│  │  │ user.roles   │  │ user.permissions (cached)  │   │ │
│  │  └──────────────┘  └────────────────────────────┘   │ │
│  └──────────────────────────────────────────────────────┘ │
│                           │                               │
│            ┌──────────────┼──────────────┐               │
│            ▼              ▼              ▼               │
│  ┌───────────────┐ ┌───────────┐ ┌───────────────────┐  │
│  │PermissionGuard│ │usePermission│ │ Route Middleware │ │
│  └───────────────┘ └───────────┘ └───────────────────┘  │
└──────────────────────────────────────────────────────────┘
                            │
                    IPC (contextBridge)
                            │
┌──────────────────────────────────────────────────────────┐
│                     Main Process                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              RBACManager                             │ │
│  │  ┌───────────────────────────────────────────────┐  │ │
│  │  │ checkPermission(userId, permissionCode)       │  │ │
│  │  │ getUserRoles(userId)                          │  │ │
│  │  │ getUserPermissions(userId)                    │  │ │
│  │  └───────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────┘ │
│                           │                               │
│                    SQLite Database                        │
│  ┌────────┐ ┌───────────────┐ ┌───────────────────────┐  │
│  │ roles  │ │ permissions   │ │ role_permissions      │  │
│  └────────┘ └───────────────┘ └───────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │                    user_roles                       │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## Migration Plan

1. **Phase 1: Schema** - Create tables, seed default roles/permissions
2. **Phase 2: Backend** - Implement RBACManager, extend AuthManager
3. **Phase 3: IPC** - Add authorization IPC handlers
4. **Phase 4: Frontend** - Add context, hooks, guards
5. **Phase 5: Pages** - Create role-specific dummy pages
6. **Phase 6: Integration** - Connect routing with permission guards

### Rollback Strategy

- All changes are additive
- Existing auth flow remains functional
- If RBAC fails, fallback to basic authentication (all features accessible)
- Delete new tables to revert completely

## Open Questions

1. **Q:** Should we cache permissions per-session or reload on each IPC call?
   **A:** Cache on login, reload on app restart. Balance between freshness and performance.

2. **Q:** How to handle users without role assignments?
   **A:** Default to no permissions (deny-by-default). Show "Contact Administrator" message.

3. **Q:** Should permission checks log to audit?
   **A:** Log failures only (security events). Success logs would be too verbose.
