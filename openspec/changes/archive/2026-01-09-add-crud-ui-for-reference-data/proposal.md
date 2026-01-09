# Change: Add CRUD UI for Reference Data Management

## Why

Database schema has tables `transaction_types`, `payment_methods`, and `loaders` with `is_active` status field. However, the UI for managing these reference data is missing. The system needs complete CRUD (Create, Read, Update, Delete) interfaces to allow SUPERADMIN users to manage this reference data easily.

## What Changes

- **Transaction Types CRUD UI:**
  - Create page for managing Transaction Types with complete CRUD operations
  - Display columns: `name`, `is_active`, `created_at`
  - Feature: toggle active/inactive status
  - Search and filter by status
- **Payment Methods CRUD UI:**
  - Create page for managing Payment Methods with complete CRUD operations
  - Display columns: `name`, `is_active`, `created_at`
  - Feature: toggle active/inactive status
  - Search and filter by status
- **Loaders CRUD UI:**
  - Create page for managing Loaders with complete CRUD operations
  - Display columns: `name`, `is_active`, `created_at`
  - Feature: toggle active/inactive status
  - Search and filter by status

## Impact

- **Affected specs:**
  - `customer-management` - new spec for customer management capabilities
  - `transaction-management` - new spec for transaction types CRUD
  - `payment-management` - new spec for payment methods CRUD
  - `loader-management` - new spec for loaders CRUD
- **Affected code:**
  - `src/Features/Transaction/` - create TransactionTypesListPage
  - `src/Features/Payment/` - create PaymentMethodsListPage
  - `src/Features/Loader/` - create LoadersListPage
  - `src/Shared/Types/Electron.d.ts` - update type definitions
  - `electron/auth/TransactionManager.ts` - add API methods for transaction types CRUD
  - `electron/auth/PaymentManager.ts` - add API methods for payment methods CRUD
  - `electron/auth/LoaderManager.ts` - add API methods for loaders CRUD
- **UI Components:**
  - Using existing shadcn-ui components (Button, Input, Table, Dialog, Select, etc.)
  - Following the same pattern as ItemsPage for consistency
- **Navigation:**
  - Add menu items in sidebar for Transaction Types, Payment Methods, and Loaders
  - Role-based access control (only SUPERADMIN can access)
