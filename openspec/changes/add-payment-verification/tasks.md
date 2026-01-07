# Implementation Tasks

## Prerequisites

Before starting, ensure:

- ✅ `add-transaction-crud` is complete (provides TransactionManager, payments table)
- ✅ `add-user-management-rbac` is complete (provides VERIFY_PAYMENT permission)
- ✅ `implement-database-migrations` is complete (provides migration system)

## Task Breakdown

### Phase 1: Database Schema Enhancement (1-2 hours)

#### Task 1.1: Create migration file

- [x] Create `electron/migrations/20260107000003_enhance_payment_verification.ts`
- [x] Add verification_status enum column (PENDING | VERIFIED | REJECTED)
- [x] Add verified_at timestamp column (nullable)
- [x] Add rejection_reason text column (nullable)
- [x] Set default verification_status = 'PENDING' for new records
- [x] Create migration up() and down() functions
- **Validation:** Run migration with `npm run db:migrate`, check schema with SQLite browser
- **Files Modified:** `electron/migrations/20260107000003_enhance_payment_verification.ts`

#### Task 1.2: Add migration data backfill

- [x] In migration, query existing payments with verified_by NOT NULL
- [x] Set verification_status = 'VERIFIED' for those payments
- [x] Set verified_at = paid_at (best estimate)
- [x] Query existing payments with verified_by NULL
- [x] Set verification_status = 'PENDING' for those payments
- **Validation:** After migration, all existing payments have verification_status set
- **Files Modified:** Same migration file

#### Task 1.3: Create database indexes

- [x] Add index idx_payments_verification_status on verification_status
- [x] Add index idx_payments_verified_at on verified_at DESC
- [x] Add index idx_payments_transaction_verification on (transaction_id, verification_status)
- **Validation:** Run `EXPLAIN QUERY PLAN` on payment status queries, verify indexes used
- **Files Modified:** Same migration file

#### Task 1.4: Run and test migration

- [x] Run `npm run db:migrate` to apply migration
- [x] Verify new columns exist with correct types
- [x] Verify indexes created successfully
- [x] Test rollback with down() migration
- [x] Re-apply migration
- **Validation:** All payments table queries work, no errors in console
- **Files Modified:** Database schema

---

### Phase 2: Backend API Enhancement (3-4 hours)

#### Task 2.1: Update PaymentData interface

- [x] Open `electron/auth/TransactionManager.ts`
- [x] Add verificationStatus to PaymentData interface
- [x] Add verifiedAt to PaymentData interface
- [x] Add rejectionReason to PaymentData interface
- [x] Export PaymentVerificationStatus type
- **Validation:** TypeScript compiles without errors
- **Files Modified:** `electron/auth/TransactionManager.ts`

#### Task 2.2: Create PaymentFilters interface

- [x] Add PaymentFilters interface with fields:
  - verificationStatus?: PaymentVerificationStatus
  - transactionId?: number
  - customerId?: number
  - dateFrom?: string
  - dateTo?: string
  - page?: number
  - limit?: number
- **Validation:** TypeScript compiles
- **Files Modified:** `electron/auth/TransactionManager.ts`

#### Task 2.3: Implement getPendingPayments method

- [x] Create getPendingPayments(filters?: PaymentFilters) method
- [x] Build SQL query with WHERE clauses for each filter
- [x] JOIN payment_methods, transactions, customers, vehicles, users tables
- [x] Add search functionality (invoice, customer name)
- [x] Add pagination (default limit 20)
- [x] Add ORDER BY verified_at DESC, created_at DESC
- [x] Return {payments, total, page, limit}
- **Validation:** Test with various filters, check results correct
- **Files Modified:** `electron/auth/TransactionManager.ts`

#### Task 2.4: Implement getPaymentById method

- [x] Create getPaymentById(id: number) method
- [x] Query payment with all fields including verification fields
- [x] JOIN related tables for display names
- [x] Return single PaymentData or null
- **Validation:** Test with valid and invalid IDs
- **Files Modified:** `electron/auth/TransactionManager.ts`

#### Task 2.5: Implement verifyPayment method

- [x] Create verifyPayment(paymentId, verifiedBy, notes?) method
- [x] Check payment exists and verification_status = 'PENDING'
- [x] Update verification_status = 'VERIFIED'
- [x] Set verified_by = verifiedBy
- [x] Set verified_at = CURRENT_TIMESTAMP
- [x] Save notes if provided
- [x] Wrap in database transaction
- [x] Call updatePaymentStatus(transactionId) after update
- [x] Return updated payment
- **Validation:** Test verification flow, check transaction payment_status updates
- **Files Modified:** `electron/auth/TransactionManager.ts`

#### Task 2.6: Implement rejectPayment method

- [x] Create rejectPayment(paymentId, verifiedBy, reason, notes?) method
- [x] Validate reason is not empty (min 10 chars)
- [x] Check payment exists and verification_status = 'PENDING'
- [x] Update verification_status = 'REJECTED'
- [x] Set verified_by = verifiedBy
- [x] Set verified_at = CURRENT_TIMESTAMP
- [x] Save rejection_reason (required)
- [x] Save notes if provided
- [x] Wrap in database transaction
- [x] Do NOT call updatePaymentStatus (rejected payments don't count)
- [x] Return updated payment
- **Validation:** Test rejection flow, verify reason saved
- **Files Modified:** `electron/auth/TransactionManager.ts`

#### Task 2.7: Implement getVerificationStats method

- [x] Create getVerificationStats(dateRange?) method
- [x] Query counts by verification_status
- [x] Default to today if no date range provided
- [x] Return {date, pendingCount, verifiedCount, rejectedCount, totalPending, totalVerified, totalRejected}
- **Validation:** Test with various date ranges, verify counts accurate
- **Files Modified:** `electron/auth/TransactionManager.ts`

#### Task 2.8: Modify addPayment to set PENDING status

- [x] Update addPayment method
- [x] Change INSERT to set verification_status = 'PENDING'
- [x] Remove immediate status = 'PAID' logic
- [x] Keep verified_by = verifiedBy (but payment not verified yet)
- [x] Update comments to reflect pending workflow
- **Validation:** Create payment, verify starts in PENDING state
- **Files Modified:** `electron/auth/TransactionManager.ts`

#### Task 2.9: Modify getPayments to include verification fields

- [x] Update getPayments SQL query
- [x] Add verification_status, verified_at, rejection_reason to SELECT
- [x] Ensure all fields mapped to camelCase in result
- **Validation:** Fetch payments, verify all verification fields present
- **Files Modified:** `electron/auth/TransactionManager.ts`

#### Task 2.10: Modify updatePaymentStatus to count only VERIFIED

- [x] Update updatePaymentStatus private method
- [x] Change WHERE clause to `verification_status = 'VERIFIED'`
- [x] Remove old `status = 'PAID'` filter
- [x] Update comments
- **Validation:** Create PENDING payment, verify transaction stays UNPAID; verify payment, check transaction becomes PAID
- **Files Modified:** `electron/auth/TransactionManager.ts`

---

### Phase 3: IPC Handlers (1 hour)

#### Task 3.1: Add payments:getPending handler

- [x] Open `electron/main.ts`
- [x] Add ipcMain.handle("payments:getPending", async (event, filters) => {...})
- [x] Get current user from authManager
- [x] Check VERIFY_PAYMENT permission
- [x] Call transactionManager.getPendingPayments(filters)
- [x] Return ApiResult format
- **Validation:** Test IPC call from renderer, verify returns payments
- **Files Modified:** `electron/main.ts`

#### Task 3.2: Add payments:getById handler

- [x] Add ipcMain.handle("payments:getById", async (event, id) => {...})
- [x] Get current user from authManager
- [x] Call transactionManager.getPaymentById(id)
- [x] Return ApiResult format
- **Validation:** Test IPC call with valid/invalid IDs
- **Files Modified:** `electron/main.ts`

#### Task 3.3: Add payments:verify handler

- [x] Add ipcMain.handle("payments:verify", async (event, paymentId, notes) => {...})
- [x] Get current user from authManager
- [x] Check VERIFY_PAYMENT permission (return error if no permission)
- [x] Call transactionManager.verifyPayment(paymentId, user.id, notes)
- [x] Return ApiResult format
- [x] Wrap in try-catch for error handling
- **Validation:** Test verification via IPC, check permission enforcement
- **Files Modified:** `electron/main.ts`

#### Task 3.4: Add payments:reject handler

- [x] Add ipcMain.handle("payments:reject", async (event, paymentId, reason, notes) => {...})
- [x] Get current user from authManager
- [x] Check VERIFY_PAYMENT permission
- [x] Validate reason is not empty
- [x] Call transactionManager.rejectPayment(paymentId, user.id, reason, notes)
- [x] Return ApiResult format
- [x] Wrap in try-catch
- **Validation:** Test rejection via IPC, verify reason required
- **Files Modified:** `electron/main.ts`

#### Task 3.5: Add payments:getVerificationStats handler

- [x] Add ipcMain.handle("payments:getVerificationStats", async (event, dateRange) => {...})
- [x] Get current user from authManager
- [x] Call transactionManager.getVerificationStats(dateRange)
- [x] Return ApiResult format
- **Validation:** Test stats IPC call, verify counts correct
- **Files Modified:** `electron/main.ts`

---

### Phase 4: Type Definitions (30 minutes)

#### Task 4.1: Update PaymentData interface in renderer types

- [x] Open `src/Shared/Types/Electron.d.ts`
- [x] Add verificationStatus: PaymentVerificationStatus to PaymentData
- [x] Add verifiedAt?: string to PaymentData
- [x] Add rejectionReason?: string to PaymentData
- [x] Add joined fields: transactionInvoiceNumber?, customerName?, vehiclePlate?
- **Validation:** TypeScript compiles without errors
- **Files Modified:** `src/Shared/Types/Electron.d.ts`

#### Task 4.2: Add PaymentVerificationStatus type

- [x] Add `type PaymentVerificationStatus = "PENDING" | "VERIFIED" | "REJECTED"`
- [x] Export type for use in components
- **Validation:** TypeScript compiles
- **Files Modified:** `src/Shared/Types/Electron.d.ts`

#### Task 4.3: Add PaymentFilters interface

- [x] Create PaymentFilters interface matching backend
- [x] Include all filter fields (verificationStatus, transactionId, customerId, dateFrom, dateTo, page, limit)
- **Validation:** TypeScript compiles
- **Files Modified:** `src/Shared/Types/Electron.d.ts`

#### Task 4.4: Add PaymentVerificationStats interface

- [x] Create interface with: date, pendingCount, verifiedCount, rejectedCount, totalPending, totalVerified, totalRejected
- **Validation:** TypeScript compiles
- **Files Modified:** `src/Shared/Types/Electron.d.ts`

#### Task 4.5: Add VerifyPaymentData and RejectPaymentData interfaces

- [x] Create VerifyPaymentData with optional notes field
- [x] Create RejectPaymentData with required reason and optional notes
- **Validation:** TypeScript compiles
- **Files Modified:** `src/Shared/Types/Electron.d.ts`

#### Task 4.6: Update window.api.payments interface

- [x] Add getPending method signature
- [x] Add getById method signature
- [x] Add verify method signature
- [x] Add reject method signature
- [x] Add getVerificationStats method signature
- **Validation:** TypeScript recognizes new methods, autocomplete works
- **Files Modified:** `src/Shared/Types/Electron.d.ts`

---

### Phase 5: Preload Script (30 minutes)

#### Task 5.1: Add payments IPC methods to preload

- [x] Open `electron/preload.ts`
- [x] Add payments.getPending method calling "payments:getPending"
- [x] Add payments.getById method calling "payments:getById"
- [x] Add payments.verify method calling "payments:verify"
- [x] Add payments.reject method calling "payments:reject"
- [x] Add payments.getVerificationStats method calling "payments:getVerificationStats"
- **Validation:** Build succeeds, methods available in window.api
- **Files Modified:** `electron/preload.ts`

---

### Phase 6: UI Components - PaymentVerifyPage (4-5 hours)

#### Task 6.1: Replace mock data with API calls

- [x] Open `src/Features/Checker/PaymentVerifyPage.tsx`
- [x] Remove mockPayments constant
- [x] Add state: const [payments, setPayments] = useState<PaymentData[]>([])
- [x] Add state: const [stats, setStats] = useState<PaymentVerificationStats | null>(null)
- [x] Add state: const [loading, setLoading] = useState(false)
- [x] Create loadPayments() async function calling window.api.payments.getPending
- [x] Create loadStats() async function calling window.api.payments.getVerificationStats
- **Validation:** Page loads real data, no mock data visible
- **Files Modified:** `src/Features/Checker/PaymentVerifyPage.tsx`

#### Task 6.2: Implement useEffect for data loading

- [x] Add useEffect to call loadPayments() and loadStats() on mount
- [x] Add cleanup to prevent memory leaks
- [x] Handle loading and error states
- **Validation:** Page loads data on mount, shows loading spinner
- **Files Modified:** `src/Features/Checker/PaymentVerifyPage.tsx`

#### Task 6.3: Update stats cards with real data

- [x] Update PendingCard to use stats.pendingCount
- [x] Update VerifiedCard to use stats.verifiedCount
- [x] Update RejectedCard to use stats.rejectedCount
- [x] Handle null stats (loading state)
- **Validation:** Stats cards display correct counts from database
- **Files Modified:** `src/Features/Checker/PaymentVerifyPage.tsx`

#### Task 6.4: Implement search functionality

- [x] Add searchQuery state
- [x] Add debounced search handler (300ms)
- [x] Call loadPayments with search filter
- [x] Update table to display filtered results
- **Validation:** Search updates results after 300ms, filters correctly
- **Files Modified:** `src/Features/Checker/PaymentVerifyPage.tsx`

#### Task 6.5: Implement filter functionality

- [x] Add filter states (verificationStatus, dateFrom, dateTo)
- [x] Add Filter section UI with dropdowns and date pickers
- [x] Call loadPayments with filter parameters
- [x] Clear filters button
- **Validation:** Filters work correctly, results update immediately
- **Files Modified:** `src/Features/Checker/PaymentVerifyPage.tsx`

#### Task 6.6: Implement pagination

- [x] Add pagination state (page, limit, total)
- [x] Add Pagination component below table
- [x] Update loadPayments to use page/limit parameters
- [x] Handle page change events
- **Validation:** Pagination shows correct pages, navigates correctly
- **Files Modified:** `src/Features/Checker/PaymentVerifyPage.tsx`

#### Task 6.7: Update table columns with verification data

- [x] Update table to show verification_status badge
- [x] Add Invoice column (link to /checker/transactions/:id)
- [x] Add Customer Name column
- [x] Add Vehicle Plate column
- [x] Format Amount with currency
- [x] Format Date with proper formatting
- **Validation:** Table displays all columns correctly, invoice link works
- **Files Modified:** `src/Features/Checker/PaymentVerifyPage.tsx`

#### Task 6.8: Implement PaymentDetailDialog

- [x] Create dialog to show payment details
- [x] Display all payment fields including verification info
- [x] Show verifiedBy and verifiedAt if verified/rejected
- [x] Show rejectionReason if rejected (highlighted in red)
- [x] Add clickable invoice link
- **Validation:** Detail dialog shows all information correctly
- **Files Modified:** `src/Features/Checker/PaymentVerifyPage.tsx`

#### Task 6.9: Implement VerifyConfirmDialog

- [x] Create confirmation dialog for verify action
- [x] Show payment summary
- [x] Add optional notes textarea
- [x] Add Confirm and Cancel buttons
- [x] Call window.api.payments.verify on confirm
- [x] Show success toast
- [x] Refresh payments and stats after verification
- **Validation:** Verify action works, payment status updates, UI refreshes
- **Files Modified:** `src/Features/Checker/PaymentVerifyPage.tsx`

#### Task 6.10: Implement RejectReasonDialog

- [x] Create dialog for reject action
- [x] Show payment summary
- [x] Add required reason textarea (min 10 chars)
- [x] Add optional notes textarea
- [x] Disable Confirm button until reason entered
- [x] Call window.api.payments.reject on confirm
- [x] Show warning toast with reason
- [x] Refresh payments and stats after rejection
- **Validation:** Reject action requires reason, works correctly, UI refreshes
- **Files Modified:** `src/Features/Checker/PaymentVerifyPage.tsx`

#### Task 6.11: Add action buttons to table rows

- [x] Add View button (eye icon) for all payments
- [x] Add Verify button (check icon) only for PENDING payments
- [x] Add Reject button (X icon) only for PENDING payments
- [x] Check VERIFY_PAYMENT permission before showing action buttons
- [x] Handle button clicks to open appropriate dialogs
- **Validation:** Buttons show/hide correctly based on status and permission
- **Files Modified:** `src/Features/Checker/PaymentVerifyPage.tsx`

#### Task 6.12: Implement permission guards

- [x] Use usePermission("VERIFY_PAYMENT") hook
- [x] Hide verify/reject buttons if no permission
- [x] Show message if user lacks permission
- [x] Test as CHECKER (has permission) and LOADER (no permission)
- **Validation:** Permission enforced in UI, LOADER cannot see action buttons
- **Files Modified:** `src/Features/Checker/PaymentVerifyPage.tsx`

#### Task 6.13: Add auto-refresh functionality

- [ ] Add auto-refresh interval (30 seconds)
- [ ] Only refresh if no dialog is open
- [ ] Clear interval on unmount
- [ ] Add manual refresh button
- **Validation:** Page auto-refreshes every 30s, can be triggered manually
- **Files Modified:** `src/Features/Checker/PaymentVerifyPage.tsx`

#### Task 6.14: Add error handling and loading states

- [x] Show loading skeleton while data loads
- [x] Show error message if API fails
- [x] Add retry button for failed requests
- [x] Show empty state if no payments
- **Validation:** Error states display correctly, retry works
- **Files Modified:** `src/Features/Checker/PaymentVerifyPage.tsx`

---

### Phase 7: UI Enhancement - TransactionDetailPage (1-2 hours)

#### Task 7.1: Update payment list to show verification status

- [x] Open `src/Features/Checker/TransactionDetailPage.tsx`
- [x] Update payment table to include verification_status badge
- [x] Add Verified By column
- [x] Add Verified At column
- [x] Show rejection_reason if status is REJECTED (red text)
- **Validation:** Payment list shows verification info correctly
- **Files Modified:** `src/Features/Checker/TransactionDetailPage.tsx`

#### Task 7.2: Update PaymentStatusBadge component

- [x] Create or update component to handle verification_status
- [x] Map PENDING → yellow badge "Menunggu Verifikasi"
- [x] Map VERIFIED → green badge "Terverifikasi"
- [x] Map REJECTED → red badge "Ditolak"
- **Validation:** Badges display with correct colors
- **Files Modified:** `src/Features/Checker/TransactionDetailPage.tsx` (inline badge implementation)

#### Task 7.3: Add "Verify Payments" link

- [x] Check if user has VERIFY_PAYMENT permission
- [x] Check if transaction has PENDING payments
- [x] Implemented Payment Detail Dialog instead of separate link
- [x] Added View Detail button (Eye icon) to view payment details
- **Validation:** Payment detail dialog works correctly with all information
- **Files Modified:** `src/Features/Checker/TransactionDetailPage.tsx`

#### Task 7.4: Update payment display to handle new fields

- [x] Ensure getPayments IPC call includes verification fields
- [x] Update PaymentData state type
- [x] Update payment rendering to use new fields
- [x] Added Payment Detail Dialog with View button
- [x] Display payment method, amount, status, dates, notes, rejection reason
- **Validation:** All payment verification info displays in transaction detail
- **Files Modified:** `src/Features/Checker/TransactionDetailPage.tsx`

---

### Phase 8: Testing and Validation (2-3 hours)

#### Task 8.1: Database migration testing

- [ ] Run migration on fresh database
- [ ] Run migration on database with existing payments
- [ ] Verify backfill works (existing verified payments → VERIFIED status)
- [ ] Test migration rollback
- [ ] Verify indexes created correctly
- **Validation:** Migration runs without errors, data migrated correctly

#### Task 8.2: Backend unit testing

- [ ] Test verifyPayment with PENDING payment (should succeed)
- [ ] Test verifyPayment with VERIFIED payment (should fail)
- [ ] Test rejectPayment with PENDING payment (should succeed)
- [ ] Test rejectPayment without reason (should fail)
- [ ] Test getPendingPayments with various filters
- [ ] Test getVerificationStats with date ranges
- [ ] Test updatePaymentStatus only counts VERIFIED payments
- **Validation:** All backend methods work as expected

#### Task 8.3: Permission enforcement testing

- [ ] Test as CHECKER - should be able to verify/reject
- [ ] Test as SUPERADMIN - should be able to verify/reject
- [ ] Test as LOADER - should NOT be able to verify/reject
- [ ] Test UI hides buttons without permission
- [ ] Test backend returns error without permission
- **Validation:** Permission system enforced at all levels

#### Task 8.4: UI workflow testing

- [ ] Create transaction and add payment
- [ ] Verify payment appears in pending list
- [ ] Verify payment from PaymentVerifyPage
- [ ] Check transaction payment_status updates to PAID
- [ ] Create another payment and reject it
- [ ] Verify rejection reason shows in detail
- [ ] Test search functionality
- [ ] Test filters (status, date range)
- [ ] Test pagination (create 25+ payments)
- **Validation:** Complete workflow works end-to-end

#### Task 8.5: Stats accuracy testing

- [ ] Create 3 PENDING, 5 VERIFIED, 2 REJECTED payments
- [ ] Check stats cards show correct counts
- [ ] Verify a payment
- [ ] Check stats update (PENDING -1, VERIFIED +1)
- [ ] Test stats with date range filter
- **Validation:** Stats always accurate and update correctly

#### Task 8.6: Error handling testing

- [ ] Test with invalid payment ID
- [ ] Test with already verified payment
- [ ] Test with missing rejection reason
- [ ] Test with network/database errors
- [ ] Verify error messages user-friendly
- [ ] Verify retry options available
- **Validation:** All error cases handled gracefully

#### Task 8.7: Performance testing

- [ ] Create 100+ payments
- [ ] Test payment list loading time (<500ms)
- [ ] Test search debounce working (300ms)
- [ ] Test pagination performance
- [ ] Verify database indexes used (EXPLAIN QUERY PLAN)
- **Validation:** Page performs well with large datasets

#### Task 8.8: Cross-role testing

- [ ] Login as CHECKER → full access to payment verification
- [ ] Login as SUPERADMIN → full access
- [ ] Login as LOADER → no access, buttons hidden
- [ ] Test route guards prevent unauthorized access
- **Validation:** All roles behave correctly

---

### Phase 9: Documentation and Cleanup (1 hour)

#### Task 9.1: Update README or docs

- [x] Updated ERD documentation (docs/erd/erd.md)
- [x] Added all verification fields to PAYMENTS table schema
- [x] Created backup of original ERD (docs/erd/erd.backup.md)
- [ ] Document payment verification workflow in user guide
- [ ] Add screenshots of PaymentVerifyPage
- [ ] Explain verification states (PENDING → VERIFIED/REJECTED)
- [ ] Document permission requirements
- **Validation:** Documentation clear and complete
- **Files Modified:** `docs/erd/erd.md`, `docs/PAYMENT_VERIFICATION_GUIDE.md` (create)

#### Task 9.2: Update RBAC documentation

- [ ] Confirm VERIFY_PAYMENT permission documented
- [ ] Update role permission matrix
- **Validation:** RBAC docs up to date
- **Files Modified:** `docs/AUTH_DEVELOPER_GUIDE.md`

#### Task 9.3: Code cleanup and linting

- [ ] Run `npm run lint` and fix issues
- [ ] Remove console.log statements
- [ ] Remove commented code
- [ ] Ensure consistent code style
- **Validation:** No lint errors, code clean
- **Files Modified:** All modified files

#### Task 9.4: Add TypeScript comments

- [ ] Add JSDoc comments to new methods in TransactionManager
- [ ] Document complex logic (verification state machine)
- [ ] Add type annotations where missing
- **Validation:** Code well-documented
- **Files Modified:** `electron/auth/TransactionManager.ts`, others

---

## Summary

**Total Estimated Time:** 15-20 hours

**Progress:**

- ✅ Phase 1: Database Schema (4/4 tasks - 100% complete)
- ✅ Phase 2: Backend API (10/10 tasks - 100% complete)
- ✅ Phase 3: IPC Handlers (5/5 tasks - 100% complete)
- ✅ Phase 4: Type Definitions (6/6 tasks - 100% complete)
- ✅ Phase 5: Preload Script (1/1 tasks - 100% complete)
- ✅ Phase 6: UI - PaymentVerifyPage (13/14 tasks - 93% complete)
- ✅ Phase 7: UI - TransactionDetailPage (4/4 tasks - 100% complete)
- ⏳ Phase 8: Testing (0/8 tasks - 0% complete)
- ⏳ Phase 9: Documentation (1/4 tasks - 25% complete)

**Overall Progress: ~85% (33/40 tasks completed)**

**Phases:**

1. Database Schema (1-2h) ✅
2. Backend API (3-4h) ✅
3. IPC Handlers (1h) ✅
4. Type Definitions (30m) ✅
5. Preload Script (30m) ✅
6. UI - PaymentVerifyPage (4-5h) ✅ (1 task pending: auto-refresh)
7. UI - TransactionDetailPage (1-2h) ✅
8. Testing (2-3h) ⏳
9. Documentation (1h) ⏳

**Critical Path:**
Database → Backend API → IPC Handlers → Type Definitions → Preload → UI Components → Testing

**Parallelizable:**

- Tasks 4 (Type Definitions) and 5 (Preload) can start after Task 2.1-2.2 (interface definitions)
- UI work (Phase 6-7) can be split between multiple developers
- Documentation (Phase 9) can be written in parallel with late implementation

**Dependencies:**

- Phase 2 depends on Phase 1 (database schema must exist)
- Phase 3 depends on Phase 2 (backend methods must exist)
- Phase 6-7 depend on Phase 3-5 (IPC and types must be available)
- Phase 8 depends on Phase 6-7 (everything implemented)
- Phase 9 can start anytime after Phase 6

**Validation Checkpoints:**

- After Phase 1: Migration runs successfully, schema correct
- After Phase 3: All IPC handlers work via console/test
- After Phase 5: TypeScript compiles, no type errors
- After Phase 6: PaymentVerifyPage fully functional
- After Phase 7: TransactionDetailPage shows verification status
- After Phase 8: All tests pass, no bugs found
- After Phase 9: Documentation complete, code clean

**Risks:**

- Migration complexity - Test thoroughly on copy of production data
- Race conditions - Use database transactions for verify/reject
- Performance - Monitor query times with large datasets
- Permission bypass - Double-check backend enforces permissions
