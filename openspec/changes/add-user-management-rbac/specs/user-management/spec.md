# Capability: User Management

**Status:** New  
**Version:** 1.0.0  
**Owner:** Development Team  
**Last Updated:** 2026-01-05

## Overview

This capability provides user role and permission management for the Surat Masuk Digital application. It enables administrators to define roles, assign permissions to roles, and assign roles to users. The system supports offline-first operation with locally cached role data.

---

## ADDED Requirements

### Requirement: Role Definition Storage

The system SHALL store role definitions in a local SQLite database with unique codes, names, and descriptions.

**Priority:** Must Have  
**ID:** USRMGMT-001

#### Scenario: Create default roles on database initialization

**Given** the application database is being initialized for the first time  
**When** the database migration runs  
**Then** the system shall create the `roles` table with columns (id, code, name, description, created_at)  
**And** the system shall seed default roles:

- SUPERADMIN: "Super Administrator" - Full system access
- CHECKER: "Checker" - Transaction input and verification
- LOADER: "Operator Loader" - Loader operation only  
  **And** each role shall have a unique code  
  **And** the seeding shall be idempotent (no duplicates on re-run)

#### Scenario: Query available roles

**Given** the application is running  
**And** the database contains role definitions  
**When** a component requests the list of roles  
**Then** the system shall return all roles with their codes, names, and descriptions  
**And** the results shall be retrieved from local SQLite database

---

### Requirement: Permission Definition Storage

The system SHALL store permission definitions in a local SQLite database with unique codes and descriptions.

**Priority:** Must Have  
**ID:** USRMGMT-002

#### Scenario: Create default permissions on database initialization

**Given** the application database is being initialized for the first time  
**When** the database migration runs  
**Then** the system shall create the `permissions` table with columns (id, code, name, description, created_at)  
**And** the system shall seed default permissions:

- VIEW_DASHBOARD: Access dashboard
- CREATE_TRANSACTION: Create transaction
- VIEW_TRANSACTION: View transaction
- VERIFY_PAYMENT: Verify payment
- VIEW_LOADER_QUEUE: View loader queue
- UPDATE_LOADER_STATUS: Update loader status
- MANAGE_USERS: Manage users
- MANAGE_ROLES: Manage roles
- VIEW_REPORTS: View reports  
  **And** each permission shall have a unique code  
  **And** the seeding shall be idempotent

#### Scenario: Query available permissions

**Given** the application is running  
**And** the database contains permission definitions  
**When** a component requests the list of permissions  
**Then** the system shall return all permissions with their codes and descriptions

---

### Requirement: Role-Permission Mapping

The system SHALL maintain explicit mappings between roles and permissions in a junction table.

**Priority:** Must Have  
**ID:** USRMGMT-003

#### Scenario: Seed role-permission mappings for Superadmin

**Given** the roles and permissions tables are populated  
**When** the database seeding runs  
**Then** the system shall assign ALL permissions to the SUPERADMIN role  
**And** the mappings shall be stored in `role_permissions` table

#### Scenario: Seed role-permission mappings for Checker

**Given** the roles and permissions tables are populated  
**When** the database seeding runs  
**Then** the system shall assign these permissions to the CHECKER role:

- VIEW_DASHBOARD
- CREATE_TRANSACTION
- VIEW_TRANSACTION
- VERIFY_PAYMENT  
  **And** the Checker shall NOT have:
- VIEW_LOADER_QUEUE
- UPDATE_LOADER_STATUS
- MANAGE_USERS
- MANAGE_ROLES

#### Scenario: Seed role-permission mappings for Operator Loader

**Given** the roles and permissions tables are populated  
**When** the database seeding runs  
**Then** the system shall assign these permissions to the LOADER role:

- VIEW_DASHBOARD
- VIEW_LOADER_QUEUE
- UPDATE_LOADER_STATUS  
  **And** the Loader shall NOT have:
- CREATE_TRANSACTION
- VIEW_TRANSACTION
- VERIFY_PAYMENT
- MANAGE_USERS
- MANAGE_ROLES

---

### Requirement: User Role Assignment

The system SHALL maintain user-to-role assignments in a junction table, supporting multiple roles per user.

**Priority:** Must Have  
**ID:** USRMGMT-004

#### Scenario: Assign role to user

**Given** a user exists in the system (identified by user_id)  
**And** a role exists in the roles table  
**When** an administrator assigns the role to the user  
**Then** the system shall create an entry in `user_roles` table  
**And** the entry shall include user_id, role_id, and assigned_at timestamp  
**And** duplicate assignments shall be prevented by primary key constraint

#### Scenario: User with multiple roles

**Given** a user exists with role CHECKER assigned  
**When** an administrator assigns role LOADER to the same user  
**Then** the user shall have both CHECKER and LOADER roles  
**And** the user's effective permissions shall be the UNION of both role permissions

#### Scenario: Seed test user role assignments

**Given** the database seeding runs  
**When** test users are configured  
**Then** the system shall assign roles to DummyJSON test users:

- User ID 1 (emilys) → SUPERADMIN
- User ID 2 (michaelw) → CHECKER
- User ID 3 (sophiab) → LOADER

---

### Requirement: Users Management Page

The system SHALL provide a Users Management page for Superadmin users to view and manage user accounts.

**Priority:** Should Have  
**ID:** USRMGMT-005

#### Scenario: View users list as Superadmin

**Given** the user is authenticated as Superadmin  
**And** the user has MANAGE_USERS permission  
**When** the user navigates to /users  
**Then** the system shall display a table of users  
**And** the table shall show: username, email, name, assigned roles  
**And** the page shall include action buttons for role assignment

#### Scenario: Access denied for non-Superadmin

**Given** the user is authenticated as Checker or Loader  
**And** the user does NOT have MANAGE_USERS permission  
**When** the user attempts to navigate to /users  
**Then** the system shall redirect to Unauthorized page  
**And** the Users menu item shall not be visible in navigation

---

### Requirement: Roles Management Page

The system SHALL provide a Roles & Permissions page for viewing role definitions and their permissions.

**Priority:** Should Have  
**ID:** USRMGMT-006

#### Scenario: View roles and permissions as Superadmin

**Given** the user is authenticated as Superadmin  
**And** the user has MANAGE_ROLES permission  
**When** the user navigates to /roles  
**Then** the system shall display all roles with their descriptions  
**And** each role shall show its assigned permissions  
**And** permissions shall be displayed as badges or chips

#### Scenario: Access denied for non-Superadmin

**Given** the user is authenticated as Checker or Loader  
**And** the user does NOT have MANAGE_ROLES permission  
**When** the user attempts to navigate to /roles  
**Then** the system shall redirect to Unauthorized page
