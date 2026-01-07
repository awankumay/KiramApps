# Capability: Role-Based Pages

**Status:** New  
**Version:** 1.0.0  
**Owner:** Development Team  
**Last Updated:** 2026-01-05

## Overview

This capability provides role-specific pages and routing for the Surat Masuk Digital application. Each role (Superadmin, Checker, Operator Loader) has dedicated pages tailored to their operational responsibilities, with automatic landing page routing based on user role.

---

## ADDED Requirements

### Requirement: Role-Based Landing Page Routing

The system SHALL redirect authenticated users to their role-appropriate landing page after login.

**Priority:** Must Have  
**ID:** RBPAGES-001

#### Scenario: Superadmin landing page

**Given** the user authenticates successfully  
**And** the user has role SUPERADMIN  
**When** the login process completes  
**Then** the system shall redirect the user to `/dashboard`  
**And** the Dashboard page shall display system-wide metrics and overview

#### Scenario: Checker landing page

**Given** the user authenticates successfully  
**And** the user has role CHECKER  
**When** the login process completes  
**Then** the system shall redirect the user to `/transactions/create`  
**And** the Create Transaction page shall be ready for immediate input

#### Scenario: Operator Loader landing page

**Given** the user authenticates successfully  
**And** the user has role LOADER  
**When** the login process completes  
**Then** the system shall redirect the user to `/loader/assignments`  
**And** the Loader Queue page shall display pending assignments

#### Scenario: User with multiple roles uses primary role

**Given** the user authenticates successfully  
**And** the user has roles CHECKER and LOADER  
**When** the login process completes  
**Then** the system shall redirect to the landing page of the first assigned role  
**And** the user may manually navigate to other allowed sections

---

### Requirement: Superadmin Dashboard Page

The system SHALL provide a comprehensive dashboard page for Superadmin users.

**Priority:** Must Have  
**ID:** RBPAGES-002

#### Scenario: View dashboard with full metrics

**Given** the user is authenticated as Superadmin  
**And** the user navigates to `/dashboard`  
**When** the page loads  
**Then** the page shall display:

- Total transactions count (today, this week, this month)
- Active loaders count
- Pending payments count
- Recent transaction activity list  
  **And** the page shall be accessible only with VIEW_DASHBOARD permission

#### Scenario: Dashboard loads offline

**Given** the user is authenticated as Superadmin  
**And** the application is offline  
**When** the user navigates to `/dashboard`  
**Then** the page shall display cached metrics from local database  
**And** a notice shall indicate "Offline mode - data may not be current"

---

### Requirement: Superadmin Reports Page

The system SHALL provide a Reports page for viewing system reports.

**Priority:** Should Have  
**ID:** RBPAGES-003

#### Scenario: View reports page

**Given** the user is authenticated as Superadmin  
**And** the user has VIEW_REPORTS permission  
**When** the user navigates to `/reports`  
**Then** the page shall display report options:

- Transaction Summary Report
- Loader Activity Report
- Payment Reconciliation Report  
  **And** reports shall show placeholder data for MVP

---

### Requirement: Checker Transaction List Page

The system SHALL provide a Transaction List page for Checker users to view existing transactions.

**Priority:** Must Have  
**ID:** RBPAGES-004

#### Scenario: View transaction list

**Given** the user is authenticated with VIEW_TRANSACTION permission  
**And** the user navigates to `/transactions`  
**When** the page loads  
**Then** the page shall display a table of transactions with columns:

- Transaction ID
- Date/Time
- Customer Name
- Vehicle Plate
- Total Amount
- Status (PENDING, VERIFIED, COMPLETED)  
  **And** the table shall support sorting and filtering  
  **And** each row shall link to transaction detail page

#### Scenario: Access denied without permission

**Given** the user has role LOADER (no VIEW_TRANSACTION permission)  
**When** the user attempts to navigate to `/transactions`  
**Then** the system shall redirect to Unauthorized page

---

### Requirement: Checker Create Transaction Page

The system SHALL provide a Create Transaction page for Checker users to input new transactions.

**Priority:** Must Have  
**ID:** RBPAGES-005

#### Scenario: Access create transaction form

**Given** the user is authenticated with CREATE_TRANSACTION permission  
**And** the user navigates to `/transactions/create`  
**When** the page loads  
**Then** the page shall display a form with fields:

- Customer selection (dropdown/search)
- Vehicle selection (dropdown/search)
- Transaction items (line items with quantity, price)
- Notes  
  **And** the form shall validate required fields  
  **And** submit button shall be enabled when form is valid

#### Scenario: Create transaction offline

**Given** the user is on Create Transaction page  
**And** the application is offline  
**When** the user fills the form and clicks Submit  
**Then** the transaction shall be saved to local SQLite database  
**And** the transaction shall be marked for sync when online  
**And** a success message shall display: "Transaction saved locally"

---

### Requirement: Checker Payment Verification Page

The system SHALL provide a Payment Verification page for Checker users to verify pending payments.

**Priority:** Must Have  
**ID:** RBPAGES-006

#### Scenario: View pending payments

**Given** the user is authenticated with VERIFY_PAYMENT permission  
**And** the user navigates to `/payments/verify`  
**When** the page loads  
**Then** the page shall display a list of pending payments with:

- Transaction ID
- Customer Name
- Amount Due
- Payment Method
- Submitted By  
  **And** each payment shall have Verify and Reject buttons

#### Scenario: Verify a payment

**Given** the user is on Payment Verification page  
**And** a payment is displayed with status PENDING  
**When** the user clicks Verify button  
**Then** the payment status shall update to VERIFIED  
**And** the verifier_id shall be set to current user  
**And** the payment shall move off the pending list  
**And** audit log shall record the verification event

---

### Requirement: Loader Queue Page

The system SHALL provide a Loader Queue page for Operator Loader users to view pending assignments.

**Priority:** Must Have  
**ID:** RBPAGES-007

#### Scenario: View loader queue

**Given** the user is authenticated with VIEW_LOADER_QUEUE permission  
**And** the user navigates to `/loader/assignments`  
**When** the page loads  
**Then** the page shall display a list of assigned loads with:

- Assignment ID
- Transaction ID
- Vehicle Plate
- Material/Item Name
- Quantity
- Status (PENDING, ON_PROGRESS, DONE)  
  **And** assignments shall be sorted by priority/time

#### Scenario: Filter assignments by status

**Given** the user is on Loader Queue page  
**And** multiple assignments exist with different statuses  
**When** the user selects status filter "ON_PROGRESS"  
**Then** only ON_PROGRESS assignments shall be displayed  
**And** the count badge shall update to reflect filtered results

---

### Requirement: Loader Assignment Detail Page

The system SHALL provide an Assignment Detail page for viewing and updating individual loader assignments.

**Priority:** Must Have  
**ID:** RBPAGES-008

#### Scenario: View assignment details

**Given** the user is authenticated with VIEW_LOADER_QUEUE permission  
**And** the user navigates to `/loader/assignments/:id`  
**When** the page loads  
**Then** the page shall display:

- Assignment details (transaction, vehicle, material)
- Current status with timestamp
- Status history log
- Update Status button (if UPDATE_LOADER_STATUS permission)

#### Scenario: Update assignment status to ON_PROGRESS

**Given** the user has UPDATE_LOADER_STATUS permission  
**And** the assignment status is PENDING  
**When** the user clicks "Start Loading" button  
**Then** the status shall update to ON_PROGRESS  
**And** started_at timestamp shall be recorded  
**And** the UI shall reflect the new status immediately

#### Scenario: Update assignment status to DONE

**Given** the user has UPDATE_LOADER_STATUS permission  
**And** the assignment status is ON_PROGRESS  
**When** the user clicks "Complete Loading" button  
**Then** the status shall update to DONE  
**And** completed_at timestamp shall be recorded  
**And** the assignment shall move to completed section  
**And** audit log shall record the completion event

---

### Requirement: Unauthorized Access Page

The system SHALL provide a clear Unauthorized Access page when users attempt to access restricted routes.

**Priority:** Must Have  
**ID:** RBPAGES-009

#### Scenario: Display unauthorized message

**Given** a user attempts to access a route without required permissions  
**When** the system redirects to `/unauthorized`  
**Then** the page shall display:

- Clear heading: "Access Denied" or "Unauthorized Access"
- Message: "You don't have permission to access this page"
- Current user's assigned role(s)
- "Go to Dashboard" button (links to role-appropriate dashboard)
- "Go Back" button (browser history back)

#### Scenario: Unauthorized page styling

**Given** the user is on Unauthorized page  
**When** the page renders  
**Then** the page shall use consistent app styling  
**And** the page shall include a warning icon (from Lucide icons)  
**And** the page shall NOT reveal what permission was missing (security)

---

### Requirement: Route Configuration

The system SHALL define route-to-permission mappings in a centralized configuration.

**Priority:** Must Have  
**ID:** RBPAGES-010

#### Scenario: Route permission configuration structure

**Given** the application routing is configured  
**When** routes are defined  
**Then** each protected route shall specify:

- path: URL pattern
- component: React component
- permissions: array of required permission codes  
  **And** the configuration shall be in a single routes file

#### Scenario: Default route configuration

**Given** the route configuration is defined  
**Then** the following routes shall require these permissions:

| Route                   | Permissions Required |
| ----------------------- | -------------------- |
| /dashboard              | VIEW_DASHBOARD       |
| /transactions           | VIEW_TRANSACTION     |
| /transactions/create    | CREATE_TRANSACTION   |
| /transactions/:id       | VIEW_TRANSACTION     |
| /payments/verify        | VERIFY_PAYMENT       |
| /loader/assignments     | VIEW_LOADER_QUEUE    |
| /loader/assignments/:id | VIEW_LOADER_QUEUE    |
| /users                  | MANAGE_USERS         |
| /roles                  | MANAGE_ROLES         |
| /reports                | VIEW_REPORTS         |
