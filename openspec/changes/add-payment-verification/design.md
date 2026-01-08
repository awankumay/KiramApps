# Design: Payment Verification System

## Architecture Overview

Payment verification adds a state machine layer on top of the existing payments infrastructure. The system follows an **approval workflow pattern** where payments start in PENDING state and require explicit verification action to become VERIFIED.

```
[Payment Created]
       ↓
   [PENDING] ──────────────────→ Manual Verification Required
       ↓                                    ↓
   [CHECKER Reviews]                   [View Details]
       ↓                                    ↓
   [Decision]                          [Check Amount]
     ↙   ↘                              [Check Method]
[Verify] [Reject]                      [Check Customer]
    ↓       ↓                               ↓
[VERIFIED] [REJECTED]                  [Make Decision]
    ↓       ↓
[Update Transaction]  [Log Reason]
    ↓
[Payment Counted]
```

## State Machine

### Payment Verification States

```typescript
type PaymentVerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";
```

**State Transitions:**

| From     | To       | Trigger         | Allowed By          |
| -------- | -------- | --------------- | ------------------- |
| PENDING  | VERIFIED | verifyPayment() | CHECKER, SUPERADMIN |
| PENDING  | REJECTED | rejectPayment() | CHECKER, SUPERADMIN |
| VERIFIED | -        | (Final State)   | -                   |
| REJECTED | -        | (Final State)   | -                   |

**Invariants:**

- ✅ Once VERIFIED, cannot be changed (immutable)
- ✅ Once REJECTED, cannot be changed (immutable)
- ✅ Only PENDING payments can be verified/rejected
- ✅ Rejection requires mandatory reason
- ✅ Verification updates verified_at timestamp
- ✅ Both actions log verified_by user

### Transaction Payment Status Update

Transaction `payment_status` field logic changes:

**Before (Current):**

```sql
SELECT SUM(amount) FROM payments
WHERE transaction_id = ? AND status = 'PAID'
```

**After (With Verification):**

```sql
SELECT SUM(amount) FROM payments
WHERE transaction_id = ?
  AND verification_status = 'VERIFIED'
```

**Logic:**

- Transaction payment_status = 'PAID' when `SUM(verified_payments.amount) >= transaction.total_amount`
- Transaction payment_status = 'UNPAID' otherwise
- PENDING payments don't count toward total
- REJECTED payments don't count toward total

## Data Model Changes

### Enhanced Payments Table

```typescript
interface Payment {
  // Existing fields
  id: number;
  transaction_id: number;
  payment_method_id: number;
  amount: number;
  status: "PENDING" | "PAID"; // Legacy field (kept for compat)
  paid_at: timestamp;
  verified_by: number | null;
  notes: string | null;
  created_at: timestamp;

  // NEW fields for verification
  verification_status: "PENDING" | "VERIFIED" | "REJECTED";
  verified_at: timestamp | null;
  rejection_reason: string | null;
}
```

**Field Relationships:**

- `verified_by` + `verified_at` → Set when verification_status changes to VERIFIED or REJECTED
- `rejection_reason` → Required when verification_status = REJECTED
- `status` field → Deprecated but kept for backward compatibility (always 'PAID' after verification)

### Database Indexes

Add indexes for query performance:

```sql
CREATE INDEX idx_payments_verification_status
  ON payments(verification_status);

CREATE INDEX idx_payments_verified_at
  ON payments(verified_at DESC);

CREATE INDEX idx_payments_transaction_verification
  ON payments(transaction_id, verification_status);
```

**Query Patterns:**

- List pending payments: `WHERE verification_status = 'PENDING'`
- Transaction payment sum: `WHERE transaction_id = ? AND verification_status = 'VERIFIED'`
- Daily stats: `WHERE DATE(verified_at) = ? GROUP BY verification_status`

## API Design

### Backend Methods (TransactionManager)

#### New Methods

```typescript
// Get pending payments for verification
getPendingPayments(filters?: PaymentFilters): {
  payments: PaymentData[];
  total: number;
  page: number;
  limit: number;
}

// Get single payment with full details
getPaymentById(id: number): PaymentData | null

// Verify payment (PENDING → VERIFIED)
verifyPayment(
  paymentId: number,
  verifiedBy: number,
  notes?: string
): PaymentData | null

// Reject payment (PENDING → REJECTED)
rejectPayment(
  paymentId: number,
  verifiedBy: number,
  reason: string,
  notes?: string
): PaymentData | null

// Get verification statistics
getVerificationStats(dateRange?: {from: string, to: string}): {
  pendingCount: number;
  verifiedCount: number;
  rejectedCount: number;
  totalPending: number;
  totalVerified: number;
  totalRejected: number;
}
```

#### Modified Methods

```typescript
// addPayment - Now sets verification_status = 'PENDING'
addPayment(
  transactionId: number,
  data: CreatePaymentData,
  verifiedBy: number
): PaymentData | null {
  // Change: Insert with verification_status = 'PENDING'
  // Remove: Auto-set to PAID
  // Payment requires verification before counting
}

// getPayments - Include verification fields
getPayments(transactionId: number): PaymentData[] {
  // Add: verification_status, verified_at, rejection_reason
  // Add: JOINs for verifier name
}

// updatePaymentStatus - Only count VERIFIED
private updatePaymentStatus(transactionId: number): void {
  // Change: WHERE verification_status = 'VERIFIED'
  // Only VERIFIED payments count toward total
}
```

### IPC Channel Definitions

```typescript
// New IPC channels
interface IpcChannels {
  "payments:getPending": (filters?: PaymentFilters) => Promise<
    ApiResult<{
      payments: PaymentData[];
      total: number;
      page: number;
      limit: number;
    }>
  >;

  "payments:getById": (id: number) => Promise<ApiResult<PaymentData>>;

  "payments:verify": (
    paymentId: number,
    notes?: string
  ) => Promise<ApiResult<PaymentData>>;

  "payments:reject": (
    paymentId: number,
    reason: string,
    notes?: string
  ) => Promise<ApiResult<PaymentData>>;

  "payments:getVerificationStats": (dateRange?: {
    from: string;
    to: string;
  }) => Promise<ApiResult<PaymentVerificationStats>>;
}
```

## UI Component Architecture

### Component Hierarchy

```
PaymentVerifyPage
├── Stats Cards (3x)
│   ├── PendingCard
│   ├── VerifiedCard
│   └── RejectedCard
├── Filters Section
│   ├── Search Input
│   ├── Date Range Picker
│   ├── Status Filter
│   └── Customer Filter
├── Payments Table
│   ├── Table Header
│   ├── Table Body
│   │   └── Payment Row (repeating)
│   │       ├── ID Cell
│   │       ├── Invoice Cell (link)
│   │       ├── Customer Cell
│   │       ├── Vehicle Cell
│   │       ├── Method Cell
│   │       ├── Amount Cell
│   │       ├── Date Cell
│   │       ├── Status Badge Cell
│   │       └── Actions Cell
│   │           ├── View Button
│   │           ├── Verify Button (if PENDING)
│   │           └── Reject Button (if PENDING)
│   └── Pagination
└── Dialogs
    ├── PaymentDetailDialog
    ├── VerifyConfirmDialog
    └── RejectReasonDialog
```

### State Management Strategy

**Local State (useState):**

- `payments` - List of payments (current page)
- `stats` - Verification statistics
- `filters` - Search/filter values
- `selectedPayment` - Currently viewed payment
- `dialogStates` - Open/close state for dialogs
- `loading` - Loading states

**No Global State Needed:**

- Data fetched on mount and after actions
- Real-time updates via re-fetch
- No cross-page state sharing needed

**Data Flow:**

```
[User Action]
    ↓
[IPC Call via window.api]
    ↓
[Main Process - TransactionManager]
    ↓
[Database Query/Update]
    ↓
[Return Result to Renderer]
    ↓
[Update Local State]
    ↓
[Re-render UI]
```

### Permission-Based UI

Components must check `VERIFY_PAYMENT` permission:

```typescript
const canVerifyPayment = usePermission("VERIFY_PAYMENT");

// Conditional rendering
{
  canVerifyPayment && (
    <>
      <Button onClick={handleVerify}>Verify</Button>
      <Button onClick={handleReject}>Reject</Button>
    </>
  );
}
```

**Permission Check Locations:**

- Verify button visibility
- Reject button visibility
- PaymentVerifyPage route access
- Action handlers (double-check)

## Workflow Details

### Workflow 1: Verify Payment

**Steps:**

1. User opens `/checker/payment-verify`
2. System loads pending payments via `payments:getPending`
3. User clicks "View" → Show PaymentDetailDialog
4. Dialog displays:
   - Payment ID, Amount, Method
   - Transaction Invoice (link)
   - Customer Name
   - Vehicle Plate Number
   - Submitted At
   - Notes from payment creator
5. User reviews information
6. User clicks "Verify" button
7. VerifyConfirmDialog opens:
   - Shows payment summary
   - Optional notes field
   - Confirm/Cancel buttons
8. User enters optional notes and confirms
9. System calls `payments:verify` IPC
10. Backend:
    - Checks payment exists and is PENDING
    - Checks user has VERIFY_PAYMENT permission
    - Updates verification_status = 'VERIFIED'
    - Sets verified_by = current user
    - Sets verified_at = current timestamp
    - Saves notes if provided
    - Calls updatePaymentStatus() for transaction
    - Returns updated payment
11. UI shows success toast
12. UI refreshes payment list
13. Payment disappears from pending list

**Error Handling:**

- Payment not found → Show error toast
- Already verified → Show warning toast
- Permission denied → Show error toast
- Database error → Show error toast + retry option

### Workflow 2: Reject Payment

**Steps:**
1-6. Same as verify workflow 7. User clicks "Reject" button 8. RejectReasonDialog opens:

- Shows payment summary
- **Required** reason textarea
- Optional notes field
- Confirm/Cancel buttons (Confirm disabled until reason entered)

9. User enters reason (mandatory)
10. User optionally enters notes
11. User confirms
12. System calls `payments:reject` IPC
13. Backend:
    - Validates reason is not empty
    - Checks payment exists and is PENDING
    - Checks user has VERIFY_PAYMENT permission
    - Updates verification_status = 'REJECTED'
    - Sets verified_by = current user
    - Sets verified_at = current timestamp
    - Saves rejection_reason (mandatory)
    - Saves notes if provided
    - Does NOT update transaction payment_status
    - Returns updated payment
14. UI shows warning toast with rejection message
15. UI refreshes payment list
16. Payment moves to rejected section (if visible)

**Validation Rules:**

- Rejection reason: min 10 characters, max 500 characters
- Must provide meaningful reason (not just "rejected")
- Cannot be empty or whitespace only

### Workflow 3: View Payment Details

**Read-Only View for:**

- Already VERIFIED payments
- Already REJECTED payments
- Users without VERIFY_PAYMENT permission

**Details Shown:**

- Payment ID
- Transaction Invoice (clickable → /checker/transactions/:id)
- Customer Name
- Vehicle Plate Number
- Payment Method
- Amount (formatted with currency)
- Status Badge (PENDING/VERIFIED/REJECTED)
- Submitted At (formatted timestamp)
- Verified By (if verified/rejected)
- Verified At (if verified/rejected)
- Rejection Reason (if rejected, highlighted in red)
- Creator Notes (if any)
- Verifier Notes (if any)

## Security Considerations

### Permission Enforcement

**Frontend Guards:**

- Route guard on `/checker/payment-verify` (check VERIFY_PAYMENT)
- Button visibility based on permission
- Action handlers check permission before IPC call

**Backend Guards:**

- IPC handlers validate user has VERIFY_PAYMENT permission
- Database methods receive `verifiedBy` user ID
- Log all verification actions with user ID for audit

**Defense in Depth:**

- UI checks prevent accidental access
- Backend checks prevent malicious access
- Both layers must agree on permission

### Audit Trail

All verification actions logged:

- What: Payment ID, action (verify/reject)
- Who: verified_by user ID + name
- When: verified_at timestamp
- Why: notes (verify) or rejection_reason (reject)

**Queryable via:**

- Transaction detail page (payment history)
- Payment verification page (status column)
- Future: Audit log report

### Data Validation

**Payment Amount:**

- Must be positive number
- Cannot exceed transaction total_amount (warning, not error)
- Decimal precision: 2 places

**Rejection Reason:**

- Required for reject action
- Min length: 10 chars
- Max length: 500 chars
- Cannot be only whitespace

**Payment Method:**

- Must exist in payment_methods table
- Cannot be deleted if used in payments

## Performance Considerations

### Database Query Optimization

**Indexes:**

- `idx_payments_verification_status` - Fast filtering by status
- `idx_payments_verified_at` - Fast date range queries
- `idx_payments_transaction_verification` - Fast transaction payment sum

**Query Patterns:**

- Use pagination (LIMIT/OFFSET) for payment lists
- Use COUNT(\*) with WHERE for stats (separate query)
- JOIN only necessary tables (customers, vehicles, users)
- Cache stats for 1 minute (refresh on action)

### UI Performance

**Pagination:**

- Default: 20 payments per page
- Options: 20, 50, 100
- Show total count and current page

**Debouncing:**

- Search input: 300ms debounce
- Filter changes: Immediate (no debounce)
- Auto-refresh: 30 seconds (only if no dialog open)

**Loading States:**

- Skeleton loaders for initial load
- Spinner for actions (verify/reject)
- Optimistic updates (instant feedback)

### Caching Strategy

**No Caching:**

- Payment data is critical financial data
- Always fetch fresh data from database
- Exception: Stats card (1-minute cache)

**Refresh Triggers:**

- On page mount
- After verify action
- After reject action
- Manual refresh button
- Auto-refresh every 30s (configurable)

## Error Handling

### Backend Errors

```typescript
try {
  // Verify payment
} catch (error) {
  if (error.message.includes("not found")) {
    return { success: false, error: "Payment not found" };
  }
  if (error.message.includes("already verified")) {
    return { success: false, error: "Payment already verified" };
  }
  if (error.message.includes("permission denied")) {
    return { success: false, error: "You do not have permission" };
  }
  return { success: false, error: "Failed to verify payment" };
}
```

### Frontend Error Handling

```typescript
// Verify payment handler
const handleVerify = async () => {
  try {
    setLoading(true);
    const result = await window.api.payments.verify(paymentId, notes);

    if (!result.success) {
      toast.error(result.error || "Failed to verify payment");
      return;
    }

    toast.success("Payment verified successfully");
    refreshPayments();
    closeDialog();
  } catch (error) {
    console.error("Verify error:", error);
    toast.error("An unexpected error occurred");
  } finally {
    setLoading(false);
  }
};
```

**User-Friendly Messages:**

- ❌ "Payment not found" → "This payment no longer exists"
- ❌ "Already verified" → "This payment has already been verified"
- ❌ "Permission denied" → "You don't have permission to verify payments"
- ❌ "Database error" → "Something went wrong. Please try again"

## Testing Strategy

### Unit Tests (Backend)

```typescript
describe("TransactionManager.verifyPayment", () => {
  test("should verify pending payment", () => {
    // Arrange: Create payment with PENDING status
    // Act: Call verifyPayment()
    // Assert: verification_status = VERIFIED, verified_by set, verified_at set
  });

  test("should reject already verified payment", () => {
    // Arrange: Create payment with VERIFIED status
    // Act: Call verifyPayment()
    // Assert: Throws error "Payment already verified"
  });

  test("should update transaction payment_status", () => {
    // Arrange: Create transaction with total 1000, payment 1000 PENDING
    // Act: Call verifyPayment()
    // Assert: Transaction payment_status = PAID
  });

  test("should require rejection reason", () => {
    // Arrange: Create payment with PENDING status
    // Act: Call rejectPayment() without reason
    // Assert: Throws error "Rejection reason required"
  });
});
```

### Integration Tests (E2E)

```typescript
describe("Payment Verification Workflow", () => {
  test("CHECKER can verify pending payment", () => {
    // 1. Login as CHECKER
    // 2. Navigate to /checker/payment-verify
    // 3. Find pending payment in table
    // 4. Click verify button
    // 5. Confirm dialog
    // 6. Check success toast
    // 7. Verify payment removed from pending list
  });

  test("CHECKER can reject payment with reason", () => {
    // 1. Login as CHECKER
    // 2. Navigate to /checker/payment-verify
    // 3. Find pending payment
    // 4. Click reject button
    // 5. Enter rejection reason
    // 6. Confirm
    // 7. Check warning toast with reason
    // 8. Verify payment status changed to REJECTED
  });

  test("LOADER cannot access payment verification", () => {
    // 1. Login as LOADER
    // 2. Navigate to /checker/payment-verify
    // 3. Should redirect or show "Access Denied"
  });
});
```

### Manual Testing Checklist

- [ ] Create payment via TransactionDetailPage
- [ ] Verify payment appears in pending list
- [ ] Click view to see payment details
- [ ] Verify payment successfully
- [ ] Check transaction payment_status updated
- [ ] Reject payment with reason
- [ ] Check rejection reason visible in details
- [ ] Search payments by invoice/customer
- [ ] Filter payments by date range
- [ ] Check stats cards show correct counts
- [ ] Test pagination (create 25+ payments)
- [ ] Test as CHECKER role
- [ ] Test as SUPERADMIN role
- [ ] Test as LOADER (should be blocked)

## Migration Rollout Plan

### Phase 1: Database Migration (Safe)

- Run migration to add new fields
- Set default verification_status = 'PENDING'
- Migrate existing payments (verified_by NOT NULL → VERIFIED)
- No downtime required

### Phase 2: Backend Deployment

- Deploy updated TransactionManager with new methods
- Deploy updated IPC handlers
- Backward compatible (existing code still works)

### Phase 3: UI Deployment

- Deploy updated PaymentVerifyPage (replace mock)
- Deploy updated TransactionDetailPage (show verification status)
- Users can start verifying payments

### Rollback Plan

- If issues found, revert UI to previous version
- Backend changes are additive (safe to keep)
- Database migration can stay (new fields optional)

## Future Enhancements

### Phase 2 (Post-MVP)

- Bulk payment verification (select multiple → verify all)
- Payment proof upload (image attachments)
- Automated verification rules (amount threshold, method whitelist)
- Payment verification dashboard (graphs, trends)

### Phase 3 (Advanced)

- Bank statement reconciliation (CSV import → auto-match)
- Email/SMS notification for payment verification status
- Payment verification approval chain (requires 2 approvers)
- Integration with accounting software (export verified payments)

## Open Questions

1. **Should REJECTED payments be re-submittable?**

   - Current: No, rejection is final
   - Alternative: Allow re-submit with corrections
   - Decision: Keep final for MVP, add re-submit in Phase 2

2. **Should verification be reversible by SUPERADMIN?**

   - Current: No, VERIFIED is final
   - Alternative: Allow SUPERADMIN to unverify
   - Decision: Keep final for audit compliance

3. **Should we notify customer when payment verified/rejected?**

   - Current: No notifications
   - Alternative: Email/SMS notification
   - Decision: Add in Phase 2 (requires notification system)

4. **Should partial payments be allowed?**
   - Current: Yes (multiple payments can sum to total)
   - Alternative: Single payment only
   - Decision: Keep multiple payments (already supported)

## References

- ERD: `docs/erd/erd.md`
- Related Proposal: `openspec/changes/add-transaction-crud/proposal.md`
- RBAC Types: `src/Shared/Types/RBAC.ts`
- TransactionManager: `electron/auth/TransactionManager.ts`
- PaymentVerifyPage (mock): `src/Features/Checker/PaymentVerifyPage.tsx`
