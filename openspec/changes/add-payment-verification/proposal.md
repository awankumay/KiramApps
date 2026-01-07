# Proposal: Add Payment Verification

## Overview

Menambahkan fitur verifikasi pembayaran untuk transaksi yang memungkinkan pengguna dengan role CHECKER dan SUPERADMIN untuk memverifikasi pembayaran yang telah dicatat pada transaksi. Fitur ini melengkapi workflow transaksi dari proposal `add-transaction-crud` dengan menambahkan proses verifikasi pembayaran yang mencakup review detail pembayaran, list pembayaran menunggu verifikasi, dan dashboard monitoring pembayaran.

## Why

Saat ini sistem sudah memiliki:

- Tabel `payments` di database dengan field `verified_by` untuk tracking siapa yang verifikasi
- TransactionManager method `addPayment()` yang mencatat pembayaran dan langsung set status `PAID`
- UI dummy `PaymentVerifyPage.tsx` dengan data mock untuk konsep verifikasi pembayaran
- PaymentDialog untuk input pembayaran di TransactionDetailPage

**Gap yang perlu diisi:**

1. **Tidak ada workflow verifikasi** - Pembayaran langsung ter-set `PAID` tanpa proses verifikasi
2. **Tidak ada list pending payments** - UI PaymentVerifyPage masih menggunakan mock data
3. **Tidak ada tracking status verifikasi** - Field `verified_by` sudah ada tapi tidak digunakan dalam workflow
4. **Tidak ada permission check** - VERIFY_PAYMENT permission sudah didefinisikan tapi belum diimplementasi sepenuhnya

**Business Value:**

- **Financial Control** - Setiap pembayaran harus diverifikasi sebelum dianggap valid
- **Audit Trail** - Tracking lengkap siapa yang memverifikasi pembayaran dan kapan
- **Risk Mitigation** - Deteksi pembayaran bermasalah (amount tidak sesuai, metode tidak valid)
- **Workflow Clarity** - Status pembayaran yang jelas (PENDING → PAID/REJECTED)

## What Changes

### 1. Database Schema Enhancement

**Migration File**: `electron/migrations/20260107000003_enhance_payment_verification.ts`

Modify `payments` table:

- Add `verification_status` enum: `PENDING | VERIFIED | REJECTED`
- Add `verified_at` timestamp field
- Add `rejection_reason` text field
- Keep existing `verified_by` FK field
- Update existing `status` field usage

**Migration Strategy:**

- Add new fields with backward compatibility
- Default `verification_status` = 'PENDING' for new payments
- Migrate existing payments: if `verified_by` IS NOT NULL, set to 'VERIFIED'

### 2. Backend Logic Enhancement

**File**: `electron/auth/TransactionManager.ts`

Add new methods:

#### Payment Verification Methods:

- `getPendingPayments(filters?)` - List pembayaran status PENDING dengan filter (date, customer, transaction)
- `getPaymentById(id)` - Detail pembayaran tunggal dengan relasi transaction/customer/vehicle
- `verifyPayment(paymentId, verifiedBy, notes?)` - Verifikasi pembayaran (PENDING → VERIFIED)
- `rejectPayment(paymentId, verifiedBy, reason)` - Tolak pembayaran (PENDING → REJECTED)
- `getVerificationStats(dateRange?)` - Statistik verifikasi (pending count, verified count, rejected count)

#### Modify Existing Methods:

- `addPayment()` - Set verification_status = 'PENDING' instead of immediate 'PAID'
- `getPayments()` - Include verification_status, verified_at, rejection_reason in result
- `updatePaymentStatus()` - Only count 'VERIFIED' payments for transaction payment_status

### 3. IPC Handlers

**File**: `electron/main.ts`

Add new IPC handlers:

```
payments:getPending
payments:getById
payments:verify
payments:reject
payments:getVerificationStats
```

Modify existing handlers:

- `transactions:addPayment` - Return payment with verification_status
- `transactions:getPayments` - Include verification fields

### 4. Type Definitions Enhancement

**File**: `src/Shared/Types/Electron.d.ts`

Update interfaces:

```typescript
// Payment verification status
type PaymentVerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

// Enhanced PaymentData interface
interface PaymentData {
  id: number;
  transactionId: number;
  paymentMethodId: number;
  paymentMethodName?: string;
  amount: number;
  status: "PENDING" | "PAID"; // Keep for backward compat
  verificationStatus: PaymentVerificationStatus; // NEW
  paidAt: string;
  verifiedBy?: number;
  verifiedByName?: string;
  verifiedAt?: string; // NEW
  rejectionReason?: string; // NEW
  notes?: string;
  createdAt: string;
  // Joined fields for display
  transactionInvoiceNumber?: string;
  customerName?: string;
  vehiclePlate?: string;
}

// Payment verification action data
interface VerifyPaymentData {
  notes?: string;
}

interface RejectPaymentData {
  reason: string;
  notes?: string;
}

// Payment filters
interface PaymentFilters {
  verificationStatus?: PaymentVerificationStatus;
  transactionId?: number;
  customerId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// Verification statistics
interface PaymentVerificationStats {
  date: string;
  pendingCount: number;
  verifiedCount: number;
  rejectedCount: number;
  totalPending: number;
  totalVerified: number;
  totalRejected: number;
}
```

### 5. UI Components - PaymentVerifyPage

**File**: `src/Features/Checker/PaymentVerifyPage.tsx`

Replace mock data dengan real data dari database:

**Features:**

- **Stats Cards** - Show pending, verified, rejected counts (real-time)
- **Payment List Table** - Display pending payments dengan search/filter
- **Detail Dialog** - View payment details dengan transaction info
- **Verify Dialog** - Confirm verification dengan optional notes
- **Reject Dialog** - Reject dengan mandatory reason
- **Real-time Updates** - Auto-refresh setelah verify/reject action

**Table Columns:**

- Payment ID
- Invoice Number (clickable → TransactionDetailPage)
- Customer Name
- Vehicle Plate
- Payment Method
- Amount
- Submitted At
- Status Badge
- Actions (View, Verify, Reject)

**Filters:**

- Search: Payment ID, Invoice, Customer
- Date Range picker
- Verification Status dropdown
- Customer dropdown

### 6. UI Components - TransactionDetailPage Enhancement

**File**: `src/Features/Checker/TransactionDetailPage.tsx`

Update payment section:

- Show `verificationStatus` badge for each payment
- Show `verifiedBy` and `verifiedAt` info
- Show `rejectionReason` if rejected
- Update payment list display to handle verification status
- Add filter/sort by verification status

### 7. Permission Guards

Enforce permission checks:

- `VERIFY_PAYMENT` - Required for verify/reject actions
- UI elements hidden/disabled if no permission
- Backend methods check permission (via verifiedBy user)

### 8. Notification System

Add toast notifications for:

- ✅ Payment verified successfully
- ❌ Payment rejected (with reason)
- ⚠️ Validation errors
- 🔄 Real-time updates when payments added

## Dependencies

### Depends On:

- ✅ `add-transaction-crud` - Must be completed first (provides transactions, payments infrastructure)
- ✅ `add-user-management-rbac` - Already completed (provides VERIFY_PAYMENT permission)
- ✅ `implement-database-migrations` - Already completed (provides migration system)

### Blocked By:

- None (all dependencies completed or in progress)

### Blocks:

- Future: Payment reconciliation reports
- Future: Automated payment validation rules
- Future: Bulk payment verification

## Out of Scope

The following are explicitly NOT included in this change:

- ❌ Bulk payment verification (verify multiple payments at once)
- ❌ Payment proof upload/attachment (images, PDFs)
- ❌ Payment amount editing after submission
- ❌ Automated payment matching (bank statement integration)
- ❌ Payment refund workflow
- ❌ Multi-currency support
- ❌ Payment installment tracking
- ❌ Email/SMS notification for payment verification

## Success Criteria

This change is complete when:

1. ✅ Migration adds verification fields to payments table
2. ✅ TransactionManager supports payment verification methods
3. ✅ IPC handlers expose verification APIs to renderer
4. ✅ PaymentVerifyPage displays real payment data
5. ✅ CHECKER can verify/reject pending payments
6. ✅ Verification stats show accurate counts
7. ✅ Transaction payment_status only counts VERIFIED payments
8. ✅ Audit trail complete (who verified, when, why rejected)
9. ✅ Permission guards enforced (VERIFY_PAYMENT)
10. ✅ No console errors, all TypeScript types correct
11. ✅ Payment verification workflow tested end-to-end

## UI/UX Considerations

### User Workflows:

**Workflow 1: Verify Pembayaran**

1. CHECKER opens PaymentVerifyPage
2. Sees list of PENDING payments
3. Clicks "View" to see details (transaction, customer, amount)
4. Reviews payment details
5. Clicks "Verify" button
6. Adds optional notes
7. Confirms → Payment status changes to VERIFIED
8. Transaction payment_status auto-updates if fully paid

**Workflow 2: Reject Pembayaran**

1. CHECKER sees suspicious payment in list
2. Clicks "Reject" button
3. Must enter rejection reason (required)
4. Adds optional notes
5. Confirms → Payment status changes to REJECTED
6. Rejection reason visible in payment history
7. Customer/Admin can see why payment rejected

**Workflow 3: Monitor Verifikasi**

1. User opens PaymentVerifyPage
2. Sees stats cards: Pending (3), Verified (15), Rejected (1)
3. Filters by date range or customer
4. Searches by invoice or payment ID
5. Views verification history

### Visual Design:

**Status Badges:**

- 🟡 PENDING - Yellow/Secondary variant
- 🟢 VERIFIED - Green/Success variant
- 🔴 REJECTED - Red/Destructive variant

**Stats Cards Color Coding:**

- Pending: Orange accent (requires action)
- Verified: Green accent (success)
- Rejected: Red accent (attention needed)

### Performance Considerations:

- Pagination for payment list (default: 20 per page)
- Debounce search input (300ms)
- Cache verification stats (refresh on action)
- Optimistic UI updates (instant feedback)

## Risks and Mitigations

### Risk 1: Data Migration Issues

**Impact:** Existing payments may not have verification status set correctly
**Mitigation:**

- Migration script handles existing data carefully
- Default to VERIFIED if verified_by is set
- Add validation queries to verify migration success

### Risk 2: Race Conditions

**Impact:** Multiple users verify same payment simultaneously
**Mitigation:**

- Database transaction wrapping verify/reject operations
- Check verification_status before update
- Return error if already verified

### Risk 3: Permission Bypass

**Impact:** Unauthorized users could verify payments
**Mitigation:**

- Backend enforces permission check (not just UI)
- Log all verification actions with user ID
- Regular audit of verification logs

### Risk 4: UI Performance

**Impact:** Large number of pending payments slows down page
**Mitigation:**

- Implement pagination from start
- Add indexes on verification_status column
- Lazy load stats cards separately

## Alternatives Considered

### Alternative 1: Single-Status Payment (No Verification)

- Pembayaran langsung PAID tanpa verifikasi
- ❌ Rejected: No financial control, high risk of fraud
- ❌ No audit trail for payment approval

### Alternative 2: External Payment Gateway Integration

- Integrate with payment gateway (Midtrans, Xendit)
- ❌ Rejected: Out of scope for offline-first application
- ❌ Requires internet connectivity (against project goals)

### Alternative 3: Automated Verification Rules

- Auto-verify payments based on rules (amount threshold, payment method)
- ❌ Postponed: Add in future iteration
- ✅ Keep manual verification for MVP

## Notes

- This proposal focuses on manual payment verification workflow
- Automated verification rules can be added in future iterations
- Payment proof upload (images) is deferred to future proposals
- Email/SMS notifications for verification status can be added later
- Payment verification is critical for financial control and audit compliance
