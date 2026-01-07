# Transaction Payment Calculation

## MODIFIED Requirements

### Requirement: Calculate Transaction Payment Status Based on Verified Payments

The transaction payment_status calculation MUST only count VERIFIED payments, and SHALL exclude PENDING and REJECTED payments from the total.

**Modifies:** Transaction payment status calculation (from add-transaction-crud)
**Related Requirements:** Payment Verification State Machine (payment-verification)

#### Scenario: Transaction remains UNPAID with pending payment

**Given** transaction exists with total_amount = 1,000,000
**And** payment of 1,000,000 exists with verification_status = 'PENDING'
**When** system calculates transaction.payment_status
**Then** transaction.payment_status = 'UNPAID'
**Because** PENDING payments are not counted

#### Scenario: Transaction becomes PAID when payment verified

**Given** transaction exists with total_amount = 1,000,000
**And** transaction.payment_status = 'UNPAID'
**And** payment of 1,000,000 exists with verification_status = 'PENDING'
**When** payment is verified
**And** system recalculates transaction.payment_status
**Then** transaction.payment_status = 'PAID'
**Because** verified payment amount >= transaction total

#### Scenario: Transaction remains UNPAID with rejected payment

**Given** transaction exists with total_amount = 1,000,000
**And** payment of 1,000,000 exists with verification_status = 'REJECTED'
**When** system calculates transaction.payment_status
**Then** transaction.payment_status = 'UNPAID'
**Because** REJECTED payments are not counted

#### Scenario: Multiple verified payments sum to total

**Given** transaction exists with total_amount = 1,000,000
**And** payment A of 600,000 with verification_status = 'VERIFIED'
**And** payment B of 400,000 with verification_status = 'VERIFIED'
**When** system calculates transaction.payment_status
**Then** transaction.payment_status = 'PAID'
**Because** SUM(verified payments) = 1,000,000 >= total_amount

#### Scenario: Mix of verified and pending payments

**Given** transaction exists with total_amount = 1,000,000
**And** payment A of 600,000 with verification_status = 'VERIFIED'
**And** payment B of 400,000 with verification_status = 'PENDING'
**When** system calculates transaction.payment_status
**Then** transaction.payment_status = 'UNPAID'
**Because** only payment A (600,000) counts, which is < 1,000,000

#### Scenario: Verified payments exceed total amount

**Given** transaction exists with total_amount = 1,000,000
**And** payment A of 700,000 with verification_status = 'VERIFIED'
**And** payment B of 500,000 with verification_status = 'VERIFIED'
**When** system calculates transaction.payment_status
**Then** transaction.payment_status = 'PAID'
**Because** SUM(verified payments) = 1,200,000 >= total_amount
**Note:** Overpayment is allowed (refund handled separately)

#### Scenario: Payment status query uses verification filter

**Given** transaction has multiple payments
**When** system queries total paid amount
**Then** SQL query is:

```sql
SELECT COALESCE(SUM(amount), 0) as total
FROM payments
WHERE transaction_id = ?
  AND verification_status = 'VERIFIED'
```

**And** query excludes PENDING and REJECTED payments

#### Scenario: Auto-update payment status after verification

**Given** transaction exists with payment_status = 'UNPAID'
**And** payment exists with verification_status = 'PENDING'
**When** payment is verified via verifyPayment()
**Then** updatePaymentStatus(transactionId) is called automatically
**And** transaction.payment_status is recalculated with new verification status

#### Scenario: Payment status does NOT update after rejection

**Given** transaction exists with payment_status = 'UNPAID'
**And** payment exists with verification_status = 'PENDING'
**When** payment is rejected via rejectPayment()
**Then** updatePaymentStatus(transactionId) is NOT called
**Because** rejected payments don't change the calculation

---

## ADDED Requirements

### Requirement: Transaction Detail Shows Payment Verification Status

The transaction detail page SHALL display verification status for each payment with visual indicators and verifier information.

**Related Requirements:** Payment Verification (payment-verification), Transaction CRUD (add-transaction-crud)

#### Scenario: Display payment verification badges

**Given** transaction has 3 payments:

- Payment A: verification_status = 'VERIFIED'
- Payment B: verification_status = 'PENDING'
- Payment C: verification_status = 'REJECTED'
  **When** user views transaction detail page
  **Then** each payment displays status badge:
- Payment A: Green "VERIFIED" badge
- Payment B: Yellow "PENDING" badge
- Payment C: Red "REJECTED" badge

#### Scenario: Display verifier information

**Given** payment is VERIFIED by user "John Doe" at '2026-01-07 10:30'
**When** user views payment in transaction detail
**Then** payment row shows:

- Verified by: John Doe
- Verified at: 2026-01-07 10:30

#### Scenario: Display rejection reason

**Given** payment is REJECTED with reason "Amount mismatch"
**When** user views payment in transaction detail
**Then** payment row shows:

- Status: REJECTED (red badge)
- Rejection reason: "Amount mismatch" (highlighted in red)
- Verified by: [User who rejected]
- Verified at: [Rejection timestamp]

#### Scenario: Pending payment shows no verifier

**Given** payment is PENDING (not yet verified)
**When** user views payment in transaction detail
**Then** payment row shows:

- Status: PENDING (yellow badge)
- Verified by: (empty)
- Verified at: (empty)
- Notes: [Creator notes if any]

#### Scenario: Link to payment verification page

**Given** user has VERIFY_PAYMENT permission
**And** transaction has PENDING payments
**When** user views transaction detail page
**Then** page shows "Verify Payments" button/link
**When** user clicks button
**Then** navigates to /checker/payment-verify filtered to this transaction

---

### Requirement: Payment Status Calculation Performance

The transaction payment status calculation MUST be efficient and SHALL use database indexes for fast queries even with large datasets.

**Related Requirements:** Payment Verification (payment-verification)

#### Scenario: Use index for payment status query

**Given** payments table has 10,000+ records
**And** index idx_payments_transaction_verification exists on (transaction_id, verification_status)
**When** system calculates payment status for transaction
**Then** query uses index for filtering
**And** query execution time < 50ms

#### Scenario: Avoid N+1 queries in transaction list

**Given** transaction list displays 20 transactions with payment_status
**When** system loads transaction list
**Then** payment_status is pre-calculated in transactions table
**And** no additional query per transaction for payment sum
**And** page load time < 500ms

#### Scenario: Cache payment status in transaction record

**Given** transaction exists with payment_status = 'UNPAID'
**When** payment is verified
**Then** transaction.payment_status is updated immediately via SQL UPDATE
**And** no additional calculation needed on next read
**And** transaction.updated_at is set to current timestamp
