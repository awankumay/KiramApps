## Users Management, Authentication & Role-Based Pages

---

## 1. Title

**Users Management, Authentication, and Role-Based Access Control (RBAC)**

---

## 2. Background & Problem Statement

The system is an **offline-first mining transaction application** that will synchronize transaction data to an **ERP Cloud**.

Currently, the system requires:

- Secure user authentication
- Clear role separation to prevent fraud
- Restricted access to features based on operational roles

Manual role enforcement is error-prone and increases fraud risk, especially between **Checker** and **Operator Loader**.

---

## 3. Objectives

- Implement **centralized authentication**
- Enforce **role-based access control (RBAC)**
- Provide **dedicated pages per role**
- Prevent unauthorized feature access
- Prepare the system for **ERP user synchronization**

---

## 4. Scope

### In Scope

- User login & session management
- Role management
- Permission mapping
- Role-based page access
- Dummy UI pages per role

### Out of Scope

- ERP user creation
- Payroll / HR features
- Advanced permission UI (future phase)

---

## 5. Roles Definition

### 5.1 Roles

| Role Name       | Description                      |
| --------------- | -------------------------------- |
| Superadmin      | Full system access               |
| Checker         | Transaction input & verification |
| Operator Loader | Loader operation only            |

---

## 6. Permissions Matrix

### 6.1 Permission List

| Permission Code      | Description          |
| -------------------- | -------------------- |
| VIEW_DASHBOARD       | Access dashboard     |
| CREATE_TRANSACTION   | Create transaction   |
| VIEW_TRANSACTION     | View transaction     |
| VERIFY_PAYMENT       | Verify payment       |
| VIEW_LOADER_QUEUE    | View loader queue    |
| UPDATE_LOADER_STATUS | Update loader status |
| MANAGE_USERS         | Manage users         |
| MANAGE_ROLES         | Manage roles         |
| VIEW_REPORTS         | View reports         |

---

### 6.2 Role → Permission Mapping

#### Superadmin

```
ALL PERMISSIONS
```

#### Checker

```
VIEW_DASHBOARD
CREATE_TRANSACTION
VIEW_TRANSACTION
VERIFY_PAYMENT
```

#### Operator Loader

```
VIEW_DASHBOARD
VIEW_LOADER_QUEUE
UPDATE_LOADER_STATUS
```

---

## 7. Authentication Specification

### 7.1 Login Flow

1. User enters username & password
2. System validates credentials
3. System generates session/token
4. Role & permissions loaded into session
5. Redirect user to role-based landing page

---

### 7.2 Session Rules

- One active session per device
- Offline session allowed (cached user)
- Session expires on manual logout or role deactivation

---

## 8. Role-Based Page Routing

### 8.1 Landing Pages

| Role            | Default Page           |
| --------------- | ---------------------- |
| Superadmin      | `/dashboard`           |
| Checker         | `/transactions/create` |
| Operator Loader | `/loader/assignments`  |

---

### 8.2 Page Access Rules

#### Checker Pages

```
/transactions
/transactions/create
/transactions/:id
/payments/verify
```

❌ Cannot access:

```
/users
/roles
/loader/*
```

---

#### Operator Loader Pages

```
/loader/assignments
/loader/assignments/:id
```

❌ Cannot access:

```
/transactions
/payments
/users
```

---

#### Superadmin Pages

```
/dashboard
/users
/roles
/permissions
/transactions
/loader
/reports
```

---

## 9. Dummy Pages to Be Generated

### 9.1 Superadmin Pages

- Dashboard
- Users Management
- Roles & Permissions
- Reports

---

### 9.2 Checker Pages

- Create Transaction
- Transaction List
- Payment Verification

---

### 9.3 Operator Loader Pages

- Loader Queue
- Loader Assignment Detail
- Update Loader Status (ON_PROGRESS / DONE)

---

## 10. UI Guard Rules (Frontend)

- Hide menu items not allowed by role
- Block route access via middleware/guard
- Display "Unauthorized Access" page on violation

---

## 11. Backend Authorization Rules

- Every API endpoint must validate:

  - authenticated user
  - role permission

- No trust on frontend-only validation

---

## 12. Data Model Impact

### Tables Used

- users
- roles
- user_roles
- permissions
- role_permissions
- sessions (or tokens)

---

## 13. Security Considerations

- Password hashing
- Token/session rotation
- Device-bound session (offline)
- Immediate revoke on ERP sync update

---

## 14. Success Criteria

- Checker cannot access loader features
- Loader cannot create transactions
- Superadmin can access all features
- Unauthorized access attempts are blocked & logged

---

## 15. Future Enhancements

- ERP user auto-sync
- Permission UI editor
- Audit log viewer
- MFA (optional)

---

## 16. Implementation Notes for Agent Code

- Generate dummy pages per role
- Apply RBAC middleware
- Use enum or constant for roles
- Provide sample users for testing

---

## 17. Example Test Users

| Username  | Role            |
| --------- | --------------- |
| admin     | Superadmin      |
| checker01 | Checker         |
| loader01  | Operator Loader |

---
