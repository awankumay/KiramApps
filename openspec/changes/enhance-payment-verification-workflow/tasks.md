# Tasks: Enhance Payment Verification Workflow

## Overview

Implementation checklist untuk memperbaiki payment verification workflow, menambahkan payment proof upload, dan melengkapi UI components yang belum berfungsi.

## Checklist

### Phase 1: Database & Backend (6-8 hours)

#### Database Migration

- [ ] Create migration file `20260108000001_add_payment_proof.ts`
- [ ] Add `proof_image_path TEXT` column to `payments` table
- [ ] Write up() and down() migration functions
- [ ] Test migration on fresh database
- [ ] Test migration rollback

#### TransactionManager - Payment Creation Fix

- [ ] Modify `createTransaction()` method to create payment records for all payment methods
- [ ] For CASH: Create payment with `status='PAID'`, `verification_status='VERIFIED'`, `verified_by=userId`, `verified_at=CURRENT_TIMESTAMP`
- [ ] For QRIS/TRANSFER: Create payment with `status='PENDING'`, `verification_status='PENDING'`, `verified_by=NULL`, `verified_at=NULL`
- [ ] Update `updatePaymentStatus()` to only count VERIFIED payments when calculating transaction payment_status
- [ ] Test CASH transaction creation → payment auto-verified
- [ ] Test QRIS transaction creation → payment pending verification
- [ ] Test TRANSFER transaction creation → payment pending verification

#### TransactionManager - Payment Proof Methods

- [ ] Add `savePaymentProof(paymentId: number, imageBuffer: Buffer, fileName: string)` method
- [ ] Implement file writing to `/user-data/payment-proofs/{paymentId}_{timestamp}.{ext}`
- [ ] Add error handling for disk full, permission denied, etc.
- [ ] Return file path on success
- [ ] Add `getPaymentProofPath(paymentId: number)` method
- [ ] Query `proof_image_path` from database
- [ ] Return full absolute path
- [ ] Add `deletePaymentProof(paymentId: number)` method
- [ ] Delete file from filesystem
- [ ] Update database to set `proof_image_path = NULL`
- [ ] Test proof save with valid image
- [ ] Test proof save with invalid path
- [ ] Test proof retrieval
- [ ] Test proof deletion

#### TransactionManager - Enhanced Verification Methods

- [ ] Modify `verifyPayment()` to accept optional `proofData` parameter
- [ ] If proofData provided, call `savePaymentProof()` and update `proof_image_path`
- [ ] Modify `rejectPayment()` to accept optional `proofData` parameter
- [ ] Update payment record with proof path during verification/rejection
- [ ] Test verify with proof
- [ ] Test verify without proof
- [ ] Test reject with proof
- [ ] Test reject without proof

#### IPC Handlers

- [ ] Add handler `payments:uploadProof` → calls `savePaymentProof()`
- [ ] Add handler `payments:getProofPath` → calls `getPaymentProofPath()`
- [ ] Add handler `payments:deleteProof` → calls `deletePaymentProof()`
- [ ] Update handler `payments:verify` to accept proofData parameter
- [ ] Update handler `payments:reject` to accept proofData parameter
- [ ] Add permission checks for proof operations (VERIFY_PAYMENT required)
- [ ] Test IPC communication for each handler
- [ ] Handle errors gracefully (return error messages)

### Phase 2: Type Definitions (1 hour)

#### Update Electron.d.ts

- [ ] Add `proofImagePath?: string` to `PaymentData` interface
- [ ] Create `UploadPaymentProofData` interface with `paymentId`, `imageData` (base64), `fileName`
- [ ] Create `UploadPaymentProofResult` interface with `success`, `filePath?`, `error?`
- [ ] Update `PaymentAPI` interface with new methods: `uploadProof`, `getProofPath`, `deleteProof`
- [ ] Update `verify()` and `reject()` signatures to accept optional proofData
- [ ] Verify TypeScript compilation with no errors

### Phase 3: TransactionDetailPage Updates (4-5 hours)

#### Status Update Feature

- [ ] Add "Update Status" button next to transaction status badge
- [ ] Show button only if `canManageStatus` permission is true
- [ ] Hide button if no allowed transitions (e.g., status is CHECKED_OUT)
- [ ] Create `StatusUpdateDialog` component (or use existing, enhance if needed)
- [ ] Show current status prominently
- [ ] Display allowed next statuses as radio buttons (from STATUS_TRANSITIONS)
- [ ] Add optional notes textarea
- [ ] Add confirmation button
- [ ] Wire up `handleUpdateStatus` function to `window.api.transactions.updateStatus()`
- [ ] Show loading state during API call
- [ ] Show success toast after status update
- [ ] Refresh transaction data after successful update
- [ ] Show error toast if update fails
- [ ] Test status update: CREATED → QUEUED
- [ ] Test status update: QUEUED → LOADING
- [ ] Test status update: LOADING → DONE
- [ ] Test status update: DONE → CHECKED_OUT
- [ ] Test permission enforcement (hide button for non-authorized users)

#### Payment Detail Dialog Fix

- [ ] Make payment items in list clickable (add `cursor-pointer`, `hover:bg-muted/50`)
- [ ] Add onClick handler to payment items: `onClick={() => { setSelectedPayment(payment); setPaymentDetailOpen(true); }}`
- [ ] Verify `selectedPayment` state is set correctly
- [ ] Verify `paymentDetailOpen` state toggles dialog visibility
- [ ] Update payment detail dialog to show payment proof image if `proofImagePath` exists
- [ ] Add "View Full Size" button that opens proof in OS default viewer
- [ ] Add "Download Proof" button (optional)
- [ ] Show placeholder if no proof available
- [ ] Test clicking payment item → dialog opens
- [ ] Test payment detail with proof → image displayed
- [ ] Test payment detail without proof → placeholder shown
- [ ] Test "View Full Size" button → opens external viewer

#### Payment List Display Enhancement

- [ ] Update payment verification status badge display
- [ ] Show clear visual indicator for PENDING, VERIFIED, REJECTED statuses
- [ ] Add eye icon to payment items to indicate they're clickable
- [ ] Test payment list renders correctly with different statuses

### Phase 4: PaymentVerifyPage Enhancements (4-5 hours)

#### Verify Dialog - Proof Upload

- [ ] Add file input field to verify dialog (accept=".jpg,.jpeg,.png,.pdf")
- [ ] Add "Upload Payment Proof (Optional)" label
- [ ] Implement file validation: max 5MB, allowed types
- [ ] Show error message if file validation fails
- [ ] Read file as base64 when selected
- [ ] Show image preview below file input
- [ ] Clear preview when file is removed
- [ ] Update `handleVerify()` to include proof data in API call
- [ ] Show loading state during upload
- [ ] Test verify with proof upload
- [ ] Test verify without proof upload
- [ ] Test file validation (too large)
- [ ] Test file validation (wrong type)

#### Reject Dialog - Proof Upload

- [ ] Add file input field to reject dialog
- [ ] Use same validation logic as verify dialog
- [ ] Show image preview
- [ ] Update `handleReject()` to include proof data
- [ ] Test reject with proof upload
- [ ] Test reject without proof upload

#### Detail Dialog - Proof Display

- [ ] Update payment detail dialog to show proof image if available
- [ ] Add "View Full Size" button
- [ ] Call `window.api.payments.getProofPath()` to get file path
- [ ] Display image with `<img src={`file://${proofPath}`} />`
- [ ] Show placeholder if no proof
- [ ] Test detail dialog with proof
- [ ] Test detail dialog without proof

### Phase 5: Testing & Validation (2-3 hours)

#### End-to-End Testing

- [ ] Create transaction with CASH → verify payment auto-verified
- [ ] Create transaction with QRIS → verify payment pending
- [ ] Upload proof in PaymentVerifyPage → verify file saved
- [ ] Verify payment with proof → verify transaction payment_status updated
- [ ] View payment detail in TransactionDetailPage → verify proof displayed
- [ ] Update transaction status → verify status history updated
- [ ] Reject payment with reason → verify rejection_reason saved
- [ ] Delete proof → verify file removed and database updated

#### Permission Testing

- [ ] Test VERIFY_PAYMENT permission (hide verify buttons for unauthorized users)
- [ ] Test MANAGE_TRANSACTION_STATUS permission (hide status update button)
- [ ] Test with CHECKER role (should have verify permission)
- [ ] Test with SUPERADMIN role (should have all permissions)
- [ ] Test with LOADER role (should not have verify permission)

#### Error Handling Testing

- [ ] Test upload with file > 5MB → show error
- [ ] Test upload with .exe file → show error
- [ ] Test verify with network error → show error toast
- [ ] Test status update with invalid transition → show error
- [ ] Test proof display with missing file → show placeholder

#### Browser/UI Testing

- [ ] Test on Windows 10
- [ ] Test on Windows 11
- [ ] Test responsive layout (if applicable)
- [ ] Test keyboard navigation
- [ ] Test screen reader accessibility (if required)

### Phase 6: Documentation & Cleanup (1 hour)

#### Update Documentation

- [ ] Update AUTH_USER_GUIDE.md with payment proof upload instructions
- [ ] Update DATABASE_MIGRATION_GUIDE.md with new migration
- [ ] Add inline code comments for new methods
- [ ] Update type documentation

#### Code Review & Cleanup

- [ ] Remove console.log statements
- [ ] Ensure consistent code style
- [ ] Check for unused imports
- [ ] Run ESLint and fix warnings
- [ ] Verify all TypeScript types are correct

#### Archive Proposal (After Implementation)

- [ ] Mark all tasks as completed
- [ ] Test final implementation against success criteria
- [ ] Archive change proposal with `openspec archive enhance-payment-verification-workflow --yes`

## Dependencies

- Migration must run before backend changes
- Backend changes must deploy before UI changes
- Type definitions must be updated before UI implementation

## Estimated Timeline

- Phase 1: 6-8 hours
- Phase 2: 1 hour
- Phase 3: 4-5 hours
- Phase 4: 4-5 hours
- Phase 5: 2-3 hours
- Phase 6: 1 hour

**Total**: 18-23 hours

## Success Criteria Verification

After completing all tasks, verify:

- [ ] QRIS/TRANSFER transactions create payment records with PENDING status
- [ ] Payment records appear in PaymentVerifyPage
- [ ] Payment proof can be uploaded during verification
- [ ] Payment proof is saved to filesystem
- [ ] Payment proof is displayed in detail dialogs
- [ ] Transaction status can be updated via UI
- [ ] Payment detail dialog opens on click
- [ ] All permission checks work correctly
- [ ] Transaction payment_status updates after verification
- [ ] Audit trail is complete (verified_by, verified_at, notes, proof)
