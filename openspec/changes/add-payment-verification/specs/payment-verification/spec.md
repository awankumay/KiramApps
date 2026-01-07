# Payment Verification

## ADDED Requirements

### Requirement: Payment Verification State Machine

The system SHALL implement a verification workflow where newly created payments MUST start in PENDING state and SHALL require explicit verification or rejection by authorized users before counting toward transaction payment status.

**Related Requirements:** Transaction Payment Calculation (transaction-payment-calculation)

#### Scenario: Create payment with pending status

**Given** a transaction exists with total_amount 1,000,000
**And** user has VERIFY_PAYMENT permission
**When** user adds payment of 1,000,000 with payment_method CASH
**Then** payment is created with verification_status = 'PENDING'
**And** payment.status = 'PENDING'
**And** payment.verified_by = NULL
**And** payment.verified_at = NULL
**And** transaction.payment_status remains 'UNPAID'

#### Scenario: Verify pending payment

**Given** payment exists with verification_status = 'PENDING'
**And** user has VERIFY_PAYMENT permission
**When** user calls verifyPayment(paymentId, userId, "Amount verified")
**Then** payment.verification_status changes to 'VERIFIED'
**And** payment.verified_by = userId
**And** payment.verified_at = current timestamp
**And** payment.notes contains verification notes
**And** transaction.payment_status is recalculated

#### Scenario: Reject pending payment with reason

**Given** payment exists with verification_status = 'PENDING'
**And** user has VERIFY_PAYMENT permission
**When** user calls rejectPayment(paymentId, userId, "Amount mismatch")
**Then** payment.verification_status changes to 'REJECTED'
**And** payment.verified_by = userId
**And** payment.verified_at = current timestamp
**And** payment.rejection_reason = "Amount mismatch"
**And** transaction.payment_status is NOT updated (rejected payments don't count)

#### Scenario: Cannot verify already verified payment

**Given** payment exists with verification_status = 'VERIFIED'
**And** user has VERIFY_PAYMENT permission
**When** user calls verifyPayment(paymentId, userId)
**Then** operation fails with error "Payment already verified"
**And** payment.verification_status remains 'VERIFIED'
**And** payment.verified_by remains unchanged

#### Scenario: Cannot verify already rejected payment

**Given** payment exists with verification_status = 'REJECTED'
**And** user has VERIFY_PAYMENT permission
**When** user calls verifyPayment(paymentId, userId)
**Then** operation fails with error "Payment already rejected"
**And** payment.verification_status remains 'REJECTED'

#### Scenario: Cannot reject already verified payment

**Given** payment exists with verification_status = 'VERIFIED'
**And** user has VERIFY_PAYMENT permission
**When** user calls rejectPayment(paymentId, userId, "Invalid")
**Then** operation fails with error "Payment already verified"
**And** payment.verification_status remains 'VERIFIED'

#### Scenario: Rejection requires mandatory reason

**Given** payment exists with verification_status = 'PENDING'
**And** user has VERIFY_PAYMENT permission
**When** user calls rejectPayment(paymentId, userId, "")
**Then** operation fails with error "Rejection reason required"
**And** payment.verification_status remains 'PENDING'

---

### Requirement: Permission-Based Payment Verification

The system SHALL enforce that only users with VERIFY_PAYMENT permission can verify or reject payments. Permission checks MUST be enforced at both UI and backend levels.

**Related Requirements:** RBAC Permission System (add-user-management-rbac)

#### Scenario: CHECKER can verify payment

**Given** user has role CHECKER (includes VERIFY_PAYMENT permission)
**And** payment exists with verification_status = 'PENDING'
**When** user calls verifyPayment(paymentId, userId)
**Then** operation succeeds
**And** payment.verification_status = 'VERIFIED'

#### Scenario: SUPERADMIN can verify payment

**Given** user has role SUPERADMIN (includes all permissions)
**And** payment exists with verification_status = 'PENDING'
**When** user calls verifyPayment(paymentId, userId)
**Then** operation succeeds
**And** payment.verification_status = 'VERIFIED'

#### Scenario: LOADER cannot verify payment

**Given** user has role LOADER (no VERIFY_PAYMENT permission)
**And** payment exists with verification_status = 'PENDING'
**When** user calls verifyPayment(paymentId, userId)
**Then** operation fails with error "Permission denied"
**And** payment.verification_status remains 'PENDING'

#### Scenario: UI hides verify actions without permission

**Given** user has role LOADER (no VERIFY_PAYMENT permission)
**When** user views payment list page
**Then** verify button is not visible
**And** reject button is not visible
**And** view button is visible (read-only access)

---

### Requirement: Payment Verification List

The system SHALL provide users with VERIFY_PAYMENT permission a list of payments that can be filtered by verification status, searchable, and paginated.

#### Scenario: View pending payments list

**Given** user has VERIFY_PAYMENT permission
**And** 5 payments exist with verification_status = 'PENDING'
**And** 3 payments exist with verification_status = 'VERIFIED'
**When** user calls getPendingPayments({verificationStatus: 'PENDING'})
**Then** system returns 5 payments with status PENDING
**And** payments include: id, transactionId, transactionInvoiceNumber, customerName, vehiclePlate, paymentMethodName, amount, verification_status, paid_at
**And** payments are sorted by paid_at DESC (newest first)

#### Scenario: Search payments by invoice number

**Given** user has VERIFY_PAYMENT permission
**And** payment exists with invoice "INV-20260107-001"
**When** user searches with query "INV-20260107-001"
**Then** system returns matching payment
**And** payment includes transaction and customer details

#### Scenario: Search payments by customer name

**Given** user has VERIFY_PAYMENT permission
**And** payment exists for customer "PT. Sumber Makmur"
**When** user searches with query "Sumber Makmur"
**Then** system returns matching payments for that customer
**And** customer name is visible in results

#### Scenario: Filter payments by date range

**Given** user has VERIFY_PAYMENT permission
**And** payment A created on 2026-01-05
**And** payment B created on 2026-01-07
**When** user filters with dateFrom='2026-01-06' and dateTo='2026-01-08'
**Then** system returns only payment B
**And** payment A is not included

#### Scenario: Paginate payment list

**Given** user has VERIFY_PAYMENT permission
**And** 50 payments exist with verification_status = 'PENDING'
**When** user calls getPendingPayments({page: 1, limit: 20})
**Then** system returns 20 payments (first page)
**And** response includes total=50, page=1, limit=20
**When** user calls getPendingPayments({page: 2, limit: 20})
**Then** system returns next 20 payments (second page)

---

### Requirement: Payment Verification Statistics

The system SHALL provide real-time statistics on payment verification status including counts of pending, verified, and rejected payments.

#### Scenario: View verification stats for today

**Given** today is 2026-01-07
**And** 3 payments with verification_status = 'PENDING' exist today
**And** 5 payments with verification_status = 'VERIFIED' exist today
**And** 1 payment with verification_status = 'REJECTED' exists today
**When** user calls getVerificationStats()
**Then** stats.pendingCount = 3
**And** stats.verifiedCount = 5
**And** stats.rejectedCount = 1
**And** stats.date = '2026-01-07'

#### Scenario: View verification stats for date range

**Given** date range from '2026-01-01' to '2026-01-07'
**And** 10 PENDING payments in range
**And** 25 VERIFIED payments in range
**And** 2 REJECTED payments in range
**When** user calls getVerificationStats({from: '2026-01-01', to: '2026-01-07'})
**Then** stats.pendingCount = 10
**And** stats.verifiedCount = 25
**And** stats.rejectedCount = 2

#### Scenario: Stats update after verification

**Given** stats show pendingCount = 5, verifiedCount = 10
**And** payment exists with verification_status = 'PENDING'
**When** user verifies the payment
**And** user refreshes stats
**Then** stats.pendingCount = 4
**And** stats.verifiedCount = 11

---

### Requirement: Payment Detail View

The system SHALL allow users to view complete details of any payment including verification status, verifier information, and rejection reason if applicable.

#### Scenario: View verified payment details

**Given** payment exists with verification_status = 'VERIFIED'
**And** payment verified by user "John Doe" at '2026-01-07 10:30:00'
**When** user calls getPaymentById(paymentId)
**Then** payment details include:

- verification_status = 'VERIFIED'
- verified_by = user ID
- verified_by_name = "John Doe"
- verified_at = '2026-01-07 10:30:00'
- transaction invoice number
- customer name
- vehicle plate number
- payment method name
- amount
- notes (if any)

#### Scenario: View rejected payment details

**Given** payment exists with verification_status = 'REJECTED'
**And** payment rejected by user "Jane Smith" at '2026-01-07 11:00:00'
**And** rejection_reason = "Amount does not match invoice"
**When** user calls getPaymentById(paymentId)
**Then** payment details include:

- verification_status = 'REJECTED'
- verified_by = user ID
- verified_by_name = "Jane Smith"
- verified_at = '2026-01-07 11:00:00'
- rejection_reason = "Amount does not match invoice"
- all other payment details

#### Scenario: View pending payment details

**Given** payment exists with verification_status = 'PENDING'
**When** user calls getPaymentById(paymentId)
**Then** payment details include:

- verification_status = 'PENDING'
- verified_by = NULL
- verified_at = NULL
- rejection_reason = NULL
- all other payment details visible

---

### Requirement: Audit Trail for Payment Verification

The system SHALL log all payment verification actions with timestamp and user information for audit compliance.

#### Scenario: Verification action creates audit record

**Given** payment exists with verification_status = 'PENDING'
**And** user "John Doe" (ID: 1) has VERIFY_PAYMENT permission
**When** user verifies payment with notes "Amount confirmed"
**Then** payment.verified_by = 1
**And** payment.verified_at = current timestamp
**And** payment.notes contains "Amount confirmed"
**And** audit trail shows: user 1 verified payment at timestamp

#### Scenario: Rejection action creates audit record

**Given** payment exists with verification_status = 'PENDING'
**And** user "Jane Smith" (ID: 2) has VERIFY_PAYMENT permission
**When** user rejects payment with reason "Invalid payment method"
**Then** payment.verified_by = 2
**And** payment.verified_at = current timestamp
**And** payment.rejection_reason = "Invalid payment method"
**And** audit trail shows: user 2 rejected payment at timestamp with reason

#### Scenario: Query payment verification history

**Given** transaction has 3 payments
**And** payment 1 VERIFIED by user A
**And** payment 2 REJECTED by user B
**And** payment 3 PENDING
**When** user views transaction payment history
**Then** history shows:

- Payment 1: VERIFIED by user A at timestamp
- Payment 2: REJECTED by user B at timestamp with reason
- Payment 3: PENDING (no verifier yet)

---

### Requirement: Database Migration for Verification Fields

The database schema SHALL be enhanced to support payment verification workflow with proper field types and constraints.

#### Scenario: Migration adds verification fields

**Given** database has payments table without verification fields
**When** migration "20260107000003_enhance_payment_verification" runs
**Then** payments table has new column verification_status (enum: PENDING, VERIFIED, REJECTED)
**And** payments table has new column verified_at (timestamp, nullable)
**And** payments table has new column rejection_reason (text, nullable)
**And** existing verified_by column remains (foreign key to users)

#### Scenario: Migration sets default verification status

**Given** migration adds verification_status column
**When** new payment is inserted without specifying verification_status
**Then** verification_status defaults to 'PENDING'

#### Scenario: Migration migrates existing payments

**Given** existing payment has verified_by = 5 (not null)
**When** migration runs
**Then** payment.verification_status is set to 'VERIFIED'
**And** payment.verified_at is set to payment.paid_at (best estimate)

#### Scenario: Migration migrates unverified payments

**Given** existing payment has verified_by = NULL
**When** migration runs
**Then** payment.verification_status is set to 'PENDING'
**And** payment.verified_at remains NULL

#### Scenario: Migration creates indexes

**Given** migration adds verification_status column
**When** migration runs
**Then** index idx_payments_verification_status is created on verification_status
**And** index idx_payments_verified_at is created on verified_at
**And** index idx_payments_transaction_verification is created on (transaction_id, verification_status)

---

### Requirement: UI Payment Verification Page

The web interface SHALL provide an intuitive payment verification page with statistics, filterable list, and action dialogs for CHECKER and SUPERADMIN roles.

#### Scenario: Display payment verification dashboard

**Given** user has VERIFY_PAYMENT permission
**When** user navigates to /checker/payment-verify
**Then** page displays:

- Stats cards showing pending, verified, rejected counts
- Search input field
- Date range filter
- Status filter dropdown
- Payment list table with columns: ID, Invoice, Customer, Vehicle, Method, Amount, Date, Status, Actions

#### Scenario: Click view payment details

**Given** user is on payment verification page
**And** payment exists in list
**When** user clicks "View" button
**Then** dialog opens showing:

- Payment ID
- Transaction invoice (clickable link)
- Customer name
- Vehicle plate number
- Payment method
- Amount (formatted with currency)
- Status badge
- Submitted at timestamp
- Notes (if any)

#### Scenario: Verify payment from UI

**Given** user is on payment verification page
**And** payment has verification_status = 'PENDING'
**When** user clicks "Verify" button
**Then** confirmation dialog opens
**When** user optionally enters notes and confirms
**Then** IPC call payments:verify is made
**And** success toast displays "Payment verified successfully"
**And** payment list refreshes
**And** payment is removed from pending list

#### Scenario: Reject payment from UI

**Given** user is on payment verification page
**And** payment has verification_status = 'PENDING'
**When** user clicks "Reject" button
**Then** rejection dialog opens with:

- Payment summary
- Required reason textarea (min 10 chars)
- Optional notes field
- Confirm button (disabled until reason entered)
  **When** user enters reason and confirms
  **Then** IPC call payments:reject is made
  **And** warning toast displays reason
  **And** payment list refreshes
  **And** payment status changes to REJECTED

#### Scenario: Search payments in UI

**Given** user is on payment verification page
**When** user types "INV-001" in search input
**Then** payment list filters to show only matching invoices
**And** search is debounced by 300ms

#### Scenario: Filter payments by date in UI

**Given** user is on payment verification page
**When** user selects date range '2026-01-01' to '2026-01-07'
**Then** payment list filters to show only payments in range
**And** filter applies immediately

#### Scenario: Pagination in UI

**Given** user is on payment verification page
**And** 50 payments exist
**And** page size is set to 20
**Then** page shows first 20 payments
**And** pagination controls show "Page 1 of 3"
**When** user clicks "Next"
**Then** page shows next 20 payments
**And** pagination controls show "Page 2 of 3"

#### Scenario: Stats cards update after action

**Given** user is on payment verification page
**And** stats show pendingCount = 5
**When** user verifies a payment
**Then** stats refresh automatically
**And** pendingCount decreases to 4
**And** verifiedCount increases by 1
