# Tasks: Enhance Payment Verification Workflow

## Overview

Implementation checklist untuk memperbaiki payment verification workflow, menambahkan payment proof upload, dan melengkapi UI components yang belum berfungsi.

## Checklist

### Phase 1: Database & Backend (6-8 hours)

#### Database Migration

- [x] Create migration file `20260108000001_add_payment_proof.ts`
- [x] Add `proof_image_path TEXT` column to `payments` table
- [x] Write up() and down() migration functions
- [x] Test migration on fresh database
- [x] Test migration rollback
- [x] Create migration file `20260108000002_enhance_payment_proof_storage.ts` for redundancy
- [x] Add columns: `proof_thumbnail TEXT`, `proof_file_hash TEXT`, `proof_file_size INTEGER`, `proof_mime_type TEXT`, `proof_uploaded_at DATETIME`, `proof_last_verified DATETIME`
- [x] Test enhanced migration on existing database

#### TransactionManager - Payment Creation Fix

- [x] Modify `createTransaction()` method to create payment records for all payment methods
- [x] For CASH: Create payment with `status='PAID'`, `verification_status='VERIFIED'`, `verified_by=userId`, `verified_at=CURRENT_TIMESTAMP`
- [x] For QRIS/TRANSFER: Create payment with `status='PENDING'`, `verification_status='PENDING'`, `verified_by=NULL`, `verified_at=NULL`
- [x] Update `updatePaymentStatus()` to only count VERIFIED payments when calculating transaction payment_status
- [x] Test CASH transaction creation → payment auto-verified
- [x] Test QRIS transaction creation → payment pending verification
- [x] Test TRANSFER transaction creation → payment pending verification

#### TransactionManager - Payment Proof Methods

- [x] Add `savePaymentProof(paymentId: number, imageBuffer: Buffer, fileName: string)` method
- [x] Implement file writing to `/user-data/payment-proofs/{paymentId}_{timestamp}.{ext}`
- [x] Add error handling for disk full, permission denied, etc.
- [x] Return file path on success
- [x] Add `getPaymentProofPath(paymentId: number)` method
- [x] Query `proof_image_path` from database
- [x] Return full absolute path
- [x] Add `deletePaymentProof(paymentId: number)` method
- [x] Delete file from filesystem
- [x] Update database to set `proof_image_path = NULL`
- [x] Test proof save with valid image
- [x] Test proof save with invalid path
- [x] Test proof retrieval
- [x] Test proof deletion
- [x] Enhance savePaymentProof() with Sharp for thumbnail generation (400px, 80% JPEG quality)
- [x] Add SHA256 file integrity hashing
- [x] Store thumbnail as base64 TEXT in database
- [x] Store metadata: file_hash, file_size, mime_type, uploaded_at
- [x] Add getPaymentProofWithFallback() method for automatic file → thumbnail fallback
- [x] Add integrity verification in getPaymentProofPath()
- [x] Make all proof methods async due to Sharp library
- [x] Test redundancy: delete file → verify thumbnail displays

#### TransactionManager - Enhanced Verification Methods

- [x] Modify `verifyPayment()` to accept optional `proofData` parameter
- [x] If proofData provided, call `savePaymentProof()` and update `proof_image_path`
- [x] Modify `rejectPayment()` to accept optional `proofData` parameter
- [x] Update payment record with proof path during verification/rejection
- [x] Test verify with proof
- [x] Test verify without proof
- [x] Test reject with proof
- [x] Test reject without proof

#### IPC Handlers

- [x] Add handler `payments:uploadProof` → calls `savePaymentProof()`
- [x] Add handler `payments:getProofPath` → calls `getPaymentProofPath()`
- [x] Add handler `payments:deleteProof` → calls `deletePaymentProof()`
- [x] Update handler `payments:verify` to accept proofData parameter
- [x] Update handler `payments:reject` to accept proofData parameter
- [x] Add permission checks for proof operations (VERIFY_PAYMENT required)
- [x] Test IPC communication for each handler
- [x] Handle errors gracefully (return error messages)
- [x] Add `payments:readProofFile` handler for base64 conversion (file:// protocol security fix)
- [x] Update readProofFile to accept payment ID (not just path) for automatic fallback
- [x] Fix IPC response structure: { success: true, data: { data: base64, source: type } }
- [x] Add `payments:openProofWithViewer` handler using shell.openPath()
- [x] Add `payments:saveProofAs` handler using dialog.showSaveDialog()

### Phase 2: Type Definitions (1 hour)

#### Update Electron.d.ts

- [x] Add `proofImagePath?: string` to `PaymentData` interface
- [x] Create `UploadPaymentProofData` interface with `paymentId`, `imageData` (base64), `fileName`
- [x] Create `UploadPaymentProofResult` interface with `success`, `filePath?`, `error?`
- [x] Update `PaymentAPI` interface with new methods: `uploadProof`, `getProofPath`, `deleteProof`
- [x] Update `verify()` and `reject()` signatures to accept optional proofData
- [x] Verify TypeScript compilation with no errors
- [x] Add `readProofFile` method signature accepting number | string
- [x] Add `openProofWithViewer` method signature
- [x] Add `saveProofAs` method signature

#### Update preload.ts

- [x] Expose new payment proof methods via context bridge
- [x] Update method signatures to match Electron.d.ts
- [x] Add readProofFile IPC invocation
- [x] Add openProofWithViewer IPC invocation
- [x] Add saveProofAs IPC invocation

### Phase 3: TransactionDetailPage Updates (4-5 hours)

#### Status Update Feature

- [x] Add "Update Status" button next to transaction status badge
- [x] Show button only if `canManageStatus` permission is true
- [x] Hide button if no allowed transitions (e.g., status is CHECKED_OUT)
- [x] Create `StatusUpdateDialog` component (or use existing, enhance if needed)
- [x] Show current status prominently
- [x] Display allowed next statuses as radio buttons (from STATUS_TRANSITIONS)
- [x] Add optional notes textarea
- [x] Add confirmation button
- [x] Wire up `handleUpdateStatus` function to `window.api.transactions.updateStatus()`
- [x] Show loading state during API call
- [x] Show success toast after status update
- [x] Refresh transaction data after successful update
- [x] Show error toast if update fails
- [ ] Test status update: CREATED → QUEUED
- [ ] Test status update: QUEUED → LOADING
- [ ] Test status update: LOADING → DONE
- [ ] Test status update: DONE → CHECKED_OUT
- [ ] Test permission enforcement (hide button for non-authorized users)

#### Payment Detail Dialog Fix

- [x] Make payment items in list clickable (add `cursor-pointer`, `hover:bg-muted/50`)
- [x] Add onClick handler to payment items: `onClick={() => { setSelectedPayment(payment); setPaymentDetailOpen(true); }}`
- [x] Verify `selectedPayment` state is set correctly
- [x] Verify `paymentDetailOpen` state toggles dialog visibility
- [x] Update payment detail dialog to show payment proof image if `proofImagePath` exists
- [x] Add "View Full Size" button that opens proof in OS default viewer
- [x] Add "Download Proof" button (optional)
- [x] Show placeholder if no proof available
- [x] Test clicking payment item → dialog opens
- [x] Test payment detail with proof → image displayed
- [x] Test payment detail without proof → placeholder shown
- [x] Test "View Full Size" button → opens external viewer

#### Payment List Display Enhancement

- [x] Update payment verification status badge display
- [x] Show clear visual indicator for PENDING, VERIFIED, REJECTED statuses
- [x] Add eye icon to payment items to indicate they're clickable
- [x] Test payment list renders correctly with different statuses

### Phase 4: PaymentVerifyPage Enhancements (4-5 hours)

#### Verify Dialog - Proof Upload

- [x] Add file input field to verify dialog (accept=".jpg,.jpeg,.png,.pdf")
- [x] Add "Upload Payment Proof (Optional)" label
- [x] Implement file validation: max 5MB, allowed types
- [x] Show error message if file validation fails
- [x] Read file as base64 when selected
- [x] Show image preview below file input
- [x] Clear preview when file is removed
- [x] Update `handleVerify()` to include proof data in API call
- [x] Show loading state during upload
- [x] Test verify with proof upload
- [x] Test verify without proof upload
- [x] Test file validation (too large)
- [x] Test file validation (wrong type)

#### Reject Dialog - Proof Upload

- [x] Add file input field to reject dialog
- [x] Use same validation logic as verify dialog
- [x] Show image preview
- [x] Update `handleReject()` to include proof data
- [x] Test reject with proof upload
- [x] Test reject without proof upload

#### Detail Dialog - Proof Display

- [x] Update payment detail dialog to show proof image if available
- [x] Add "View Full Size" button (implemented as "Buka di Viewer" with native OS viewer)
- [x] Add "Download/Save" button (implemented as "Simpan" with save dialog)
- [x] Call `window.api.payments.readProofFile()` with payment ID for better fallback support
- [x] Display image with base64 data URL (IPC-based for security)
- [x] Show placeholder if no proof
- [x] Test detail dialog with proof
- [x] Test detail dialog without proof
- [x] Implement thumbnail fallback when original file is missing/corrupted
- [x] Add file integrity verification with SHA256 hash
- [x] Store compressed thumbnail in database as backup (using Sharp library)

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

### Bug Fixes & Enhancements (Post-Implementation)

#### Critical Bugs Fixed

- [x] Migration format error: Changed from Sequelize syntax to MigrationContext.run({ db })
- [x] File protocol security: "Not allowed to load local resource" → IPC-based base64 conversion
- [x] Lint errors: Moved inline require() statements to top-level imports (crypto, sharp)
- [x] Async/await mismatch: Made verifyPayment() and rejectPayment() async, moved savePaymentProof outside transaction
- [x] Sharp bundling error: Added sharp to vite.config.ts external dependencies
- [x] IPC response structure: Fixed flat { data, source } → nested { data: { data, source } }
- [x] Image display issue: Fixed undefined response.data by correcting IPC response nesting

#### Best Practices Implementation

- [x] Dual storage strategy: File on disk + thumbnail in database (redundancy for critical data)
- [x] File integrity: SHA256 hash verification on read
- [x] Metadata tracking: file_size, mime_type, uploaded_at, last_verified timestamps
- [x] Automatic fallback: File missing → thumbnail display
- [x] Native OS integration: shell.openPath() for viewer, dialog.showSaveDialog() for save
- [x] Security: Browser isolation from file:// protocol, IPC-based data transfer
- [x] Image optimization: Sharp library for thumbnail generation (400px, 80% quality)

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
