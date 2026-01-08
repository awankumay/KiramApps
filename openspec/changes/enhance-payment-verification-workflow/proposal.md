# Proposal: Enhance Payment Verification Workflow

## Overview

Menyempurnakan workflow verifikasi pembayaran untuk mendukung pembayaran non-cash (QRIS, TRANSFER) dengan status tracking yang lebih baik, menambahkan payment proof upload capability, dan memperbaiki UI yang belum berfungsi pada TransactionDetailPage dan PaymentVerifyPage.

## Why

### Current State Analysis

**Database & Backend:**

- ✅ Table `payments` sudah ada dengan field `verification_status`, `verified_at`, `rejection_reason` (dari migration 20260107000003)
- ✅ TransactionManager sudah memiliki payment verification methods (verifyPayment, rejectPayment, getPendingPayments)
- ⚠️ **Payment Creation Logic Issue**:
  - CASH payment: Otomatis create record di `payments` table dengan status PAID
  - QRIS/TRANSFER: Transaction status set ke UNPAID tapi **tidak ada record di `payments` table**

**UI Components:**

- ⚠️ PaymentVerifyPage: Missing payment proof image field saat verify/reject pembayaran
- ⚠️ TransactionDetailPage:
  - Button "Update Status" belum ada atau tidak berfungsi
  - Button "Show Detail" pada payment list tidak berfungsi
  - Payment status badge tidak menampilkan verification_status dengan baik

### Problems Identified

1. **Payment Record Inconsistency**
   - QRIS/TRANSFER transactions tidak membuat payment record sama sekali
   - Hal ini membuat payment verification workflow tidak bisa berjalan
   - Payment list kosong untuk non-CASH transactions
2. **Missing Payment Proof Feature**

   - PaymentVerifyPage sudah ada placeholder untuk bukti pembayaran tapi belum ada field upload
   - Tidak ada storage untuk payment proof image
   - Detail dialog sudah menampilkan section untuk bukti tapi tidak ada data

3. **Incomplete Transaction Status Management**

   - Status update dialog/button tidak ada di TransactionDetailPage
   - User tidak bisa mengubah transaction_status (CREATED → QUEUED → LOADING → DONE → CHECKED_OUT)
   - Workflow operasional terhambat

4. **Broken Payment Detail UI**
   - Payment detail dialog tidak bisa dibuka dari transaction detail page
   - onClick handler untuk payment items tidak terhubung ke state management

### Business Impact

**Current Flow (Broken for QRIS/TRANSFER):**

```
Create Transaction (QRIS) → Transaction created with UNPAID status
                          → No payment record created
                          → Nothing to verify in PaymentVerifyPage
                          → Checker can't verify payment
                          → Transaction stuck in UNPAID state
```

**Desired Flow:**

```
Create Transaction (QRIS) → Transaction created with UNPAID status
                          → Payment record created with PENDING verification_status
                          → Appears in PaymentVerifyPage
                          → Checker uploads payment proof & verifies
                          → Payment verification_status = VERIFIED
                          → Transaction payment_status = PAID
```

## What Changes

### 1. Payment Creation Logic Fix

**File**: `electron/auth/TransactionManager.ts`

**Current Behavior** (createTransaction method):

```typescript
// Only CASH creates payment record
if (isCashPayment && data.paymentMethodId) {
  // Insert payment with status PAID
}
```

**New Behavior**:

```typescript
// All payment methods create payment record
if (data.paymentMethodId) {
  const isCashPayment = data.paymentMethodId === 1;

  if (isCashPayment) {
    // CASH: Auto-verified, status PAID
    INSERT INTO payments (...) VALUES (
      status: 'PAID',
      verification_status: 'VERIFIED',
      verified_by: userId,
      verified_at: CURRENT_TIMESTAMP
    )
  } else {
    // QRIS/TRANSFER: Pending verification, status PENDING
    INSERT INTO payments (...) VALUES (
      status: 'PENDING',
      verification_status: 'PENDING',
      verified_by: NULL,
      verified_at: NULL
    )
  }
}
```

**Methods to Modify:**

- `createTransaction()` - Create payment record for all payment methods
- `updatePaymentStatus()` - Update transaction payment_status based on verified payments only

### 2. Payment Proof Storage

**Database Migration**: Create new migration `20260108000001_add_payment_proof.ts`

Add to `payments` table:

```sql
ALTER TABLE payments ADD COLUMN proof_image_path TEXT;
```

**File Structure**: Store payment proof images locally

```
/user-data/
  /payment-proofs/
    /{payment-id}_{timestamp}.{ext}
```

**Backend Methods** (TransactionManager.ts):

- `savePaymentProof(paymentId, imageBuffer)` - Save image to disk, return file path
- `getPaymentProofPath(paymentId)` - Get proof image path
- `deletePaymentProof(paymentId)` - Delete proof image file

**IPC Handlers** (electron/main.ts):

```
payments:uploadProof
payments:getProofPath
payments:deleteProof
```

### 3. TransactionDetailPage Status Management

**File**: `src/Features/Checker/TransactionDetailPage.tsx`

**Add Components:**

- Status Update Button dengan permission check
- Status Update Dialog component dengan:
  - Current status display
  - Allowed next statuses (based on STATUS_TRANSITIONS)
  - Optional notes textarea
  - Confirmation button

**Status Transition Rules** (already defined in component):

```typescript
const STATUS_TRANSITIONS = {
  CREATED: ["QUEUED"],
  QUEUED: ["LOADING", "CREATED"],
  LOADING: ["DONE", "QUEUED"],
  DONE: ["CHECKED_OUT", "LOADING"],
  CHECKED_OUT: [],
};
```

**UI Changes:**

- Add "Update Status" button next to transaction status badge
- Wire up `handleUpdateStatus` to `window.api.transactions.updateStatus`
- Show status update dialog with allowed transitions
- Refresh transaction data after status update

### 4. TransactionDetailPage Payment Details

**File**: `src/Features/Checker/TransactionDetailPage.tsx`

**Fix Payment Detail Dialog:**

- Connect onClick handlers on payment items to open detail dialog
- Set `selectedPayment` state properly
- Set `paymentDetailOpen` to true when payment clicked
- Display payment proof image in detail dialog (if exists)
- Add "View Proof" button to open image in external viewer

**Payment Item Display:**

- Make payment items clickable (add cursor-pointer, hover effect)
- Show verification status badge clearly
- Add eye icon to indicate clickable

### 5. PaymentVerifyPage Proof Upload

**File**: `src/Features/Checker/PaymentVerifyPage.tsx`

**Verify Dialog Enhancement:**

- Add payment proof upload field (optional)
- Show image preview before submit
- Support formats: JPG, PNG, PDF
- Max file size: 5MB
- Upload and save proof when verifying

**Reject Dialog Enhancement:**

- Also support proof upload (untuk kasus rejection dengan bukti)
- Show existing proof if already uploaded

**Detail Dialog:**

- Show payment proof image (if exists)
- Add "View Full Size" button
- Add "Download Proof" button

### 6. Type Definitions Update

**File**: `src/Shared/Types/Electron.d.ts`

Add to PaymentData interface:

```typescript
interface PaymentData {
  // ... existing fields
  proofImagePath?: string; // Path to payment proof image
}
```

Add new types:

```typescript
interface UploadPaymentProofData {
  paymentId: number;
  imageData: string; // Base64 encoded image
  fileName: string;
}

interface UploadPaymentProofResult {
  success: boolean;
  filePath?: string;
  error?: string;
}
```

Update window.api interface:

```typescript
interface PaymentAPI {
  // ... existing methods
  uploadProof: (
    data: UploadPaymentProofData
  ) => Promise<UploadPaymentProofResult>;
  getProofPath: (paymentId: number) => Promise<{ path?: string }>;
  deleteProof: (paymentId: number) => Promise<{ success: boolean }>;
}
```

## Dependencies

**Depends On:**

- `add-payment-verification` - Base payment verification feature (partially implemented)
- `add-transaction-crud` - Transaction CRUD operations (implemented)

**Blocks:**

- None (this is a completion/fix for existing features)

## Migration Path

1. **Run new migration** - Add proof_image_path column
2. **Update TransactionManager** - Fix createTransaction payment logic
3. **Update IPC handlers** - Add proof upload/download handlers
4. **Update UI components** - Add missing buttons and fix broken handlers
5. **Test workflow** - Create QRIS transaction → Upload proof → Verify → Check payment_status

## Success Criteria

- [x] QRIS/TRANSFER transactions create payment records with PENDING status
- [x] Payment records appear in PaymentVerifyPage for verification
- [x] Payment proof can be uploaded when verifying payments
- [x] Payment proof is displayed in detail dialogs
- [x] Transaction status can be updated via UI button
- [x] Payment detail dialog opens when clicking payment items
- [x] All permission checks are enforced (VERIFY_PAYMENT, MANAGE_TRANSACTION_STATUS)
- [x] Transaction payment_status updates correctly after payment verification
- [x] Audit trail is complete (verified_by, verified_at, notes, proof)

## Out of Scope

- Payment proof OCR/validation
- Automatic payment matching from bank statements
- Payment reminder/notification system
- Payment installment/partial payment support
- Integration with external payment gateways
- Payment receipt PDF generation

## Testing Checklist

### Payment Creation:

- [ ] Create transaction with CASH → Payment record created with VERIFIED status
- [ ] Create transaction with QRIS → Payment record created with PENDING status
- [ ] Create transaction with TRANSFER → Payment record created with PENDING status
- [ ] Transaction payment_status is UNPAID for non-CASH methods

### Payment Verification:

- [ ] QRIS payment appears in PaymentVerifyPage with PENDING status
- [ ] Upload payment proof image (JPG, PNG, PDF)
- [ ] Preview uploaded proof before submit
- [ ] Verify payment with proof → verification_status = VERIFIED
- [ ] Transaction payment_status updates to PAID after verification
- [ ] View payment proof in transaction detail page

### Status Management:

- [ ] "Update Status" button appears on TransactionDetailPage
- [ ] Only allowed status transitions are shown
- [ ] Status updates successfully with optional notes
- [ ] Status history shows new entry after update
- [ ] Permission check enforced (MANAGE_TRANSACTION_STATUS)

### Payment Details:

- [ ] Click payment item → Detail dialog opens
- [ ] Payment proof is displayed in detail dialog
- [ ] "View Full Size" opens proof in external viewer
- [ ] Verification details are shown (verifiedBy, verifiedAt, notes)
- [ ] Rejection reason is shown for rejected payments

## Open Questions

1. **Payment Proof Retention Policy**: How long should we keep payment proof images? Should we implement auto-cleanup after X months?
2. **Payment Proof Validation**: Do we need to validate image content (e.g., check if it's actually a payment receipt)? Or is manual checker verification enough?

3. **Multiple Proofs**: Should we support multiple proof images per payment (e.g., front and back of transfer receipt)?

4. **Proof Format**: Should we support PDF files in addition to images? What about file size limits?

5. **Proof Encryption**: Should payment proof files be encrypted at rest for security/privacy?

## Timeline Estimate

- Database migration + backend logic: **2-3 hours**
- IPC handlers + file storage: **2 hours**
- TransactionDetailPage updates: **3-4 hours**
- PaymentVerifyPage proof upload: **3-4 hours**
- Testing + bug fixes: **2-3 hours**

**Total**: 12-16 hours of development work
