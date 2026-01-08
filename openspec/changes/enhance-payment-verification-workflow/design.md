# Design: Enhance Payment Verification Workflow

## Architecture Overview

This change enhances the existing payment verification system to support the complete workflow for non-cash payments (QRIS, TRANSFER) by fixing payment record creation, adding payment proof storage, and completing the UI components.

## System Context

```
┌─────────────────────────────────────────────────────────┐
│                    Electron Main Process                 │
│  ┌────────────────────────────────────────────────────┐ │
│  │         TransactionManager                         │ │
│  │  - createTransaction() [MODIFIED]                  │ │
│  │  - savePaymentProof() [NEW]                        │ │
│  │  - getPaymentProofPath() [NEW]                     │ │
│  │  - deletePaymentProof() [NEW]                      │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │         File System (Payment Proofs)               │ │
│  │  /user-data/payment-proofs/                        │ │
│  │    {payment-id}_{timestamp}.{ext}                  │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                            │
                   IPC Communication
                            │
┌─────────────────────────────────────────────────────────┐
│                  Electron Renderer Process               │
│  ┌────────────────────────────────────────────────────┐ │
│  │    TransactionDetailPage [ENHANCED]                │ │
│  │  - Status update button & dialog                   │ │
│  │  - Payment detail click handler                    │ │
│  │  - Payment proof viewer                            │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │    PaymentVerifyPage [ENHANCED]                    │ │
│  │  - Payment proof upload field                      │ │
│  │  - Image preview                                   │ │
│  │  - Proof viewer in detail dialog                   │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                            │
                    SQLite Database
                            │
┌─────────────────────────────────────────────────────────┐
│  payments table                                          │
│  - verification_status: PENDING | VERIFIED | REJECTED    │
│  - proof_image_path: TEXT [NEW]                          │
│  - verified_by, verified_at, rejection_reason, notes     │
└─────────────────────────────────────────────────────────┘
```

## Design Decisions

### 1. Payment Creation Strategy

**Decision**: Always create payment record for all payment methods, with different initial states.

**Rationale**:

- Consistency: Every transaction has payment records regardless of method
- Auditability: Complete trail of all payments, even if auto-verified (CASH)
- Verifiability: Non-cash payments enter workflow immediately upon transaction creation
- Simplicity: Single code path handles all payment methods

**Implementation**:

```typescript
// In createTransaction()
if (data.paymentMethodId) {
  const isCashPayment = data.paymentMethodId === 1;

  const paymentStatus = isCashPayment ? 'PAID' : 'PENDING';
  const verificationStatus = isCashPayment ? 'VERIFIED' : 'PENDING';
  const verifiedBy = isCashPayment ? userId : null;
  const verifiedAt = isCashPayment ? 'CURRENT_TIMESTAMP' : null;

  INSERT INTO payments (
    transaction_id, payment_method_id, amount,
    status, verification_status,
    verified_by, verified_at, notes
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
}
```

**Trade-offs**:

- ✅ Pro: Consistent data model, no special cases
- ✅ Pro: Payment verification workflow works for all methods
- ✅ Pro: Simpler to query and report on payments
- ⚠️ Con: More database records (minimal impact)
- ⚠️ Con: CASH payments have "redundant" verification step (already verified at creation)

### 2. Payment Proof Storage

**Decision**: Store payment proof images as files on local filesystem, not in database.

**Rationale**:

- Performance: SQLite can handle BLOBs but file system is faster for large images
- Simplicity: Electron app has full filesystem access, no BLOB encoding needed
- Scalability: Large images don't bloat database file
- Portability: Easy to backup/restore separately from database
- Flexibility: Can use OS-level tools to view/manage images

**File Naming Convention**:

```
{payment-id}_{timestamp}.{ext}

Examples:
- 42_1704672000000.jpg
- 123_1704672123456.png
- 456_1704672345678.pdf
```

**Storage Location**:

```
Windows: %APPDATA%/kiram-apps/payment-proofs/
Mac: ~/Library/Application Support/kiram-apps/payment-proofs/
Linux: ~/.config/kiram-apps/payment-proofs/
```

**Trade-offs**:

- ✅ Pro: Better performance for image operations
- ✅ Pro: Simpler code (no BLOB conversion)
- ✅ Pro: Easy to view files directly in OS file explorer
- ✅ Pro: Database remains small and fast
- ⚠️ Con: Need to manage file lifecycle (cleanup on payment delete)
- ⚠️ Con: Backup strategy must include both database + proof directory
- ⚠️ Con: File path in database can become stale if files are moved manually

### 3. Payment Proof Upload Flow

**Decision**: Upload proof as optional field in verify/reject dialogs, not as separate step.

**Rationale**:

- User Experience: Single-step verification process
- Simplicity: No separate "upload proof" action needed
- Flexibility: Proof is optional, not mandatory (checker discretion)
- Workflow: Matches real-world process (checker reviews payment → decides → optionally attaches proof)

**Flow**:

```
1. Checker opens PaymentVerifyPage
2. Clicks "Verify" or "Reject" on payment
3. Dialog opens with:
   - Notes textarea
   - [NEW] Optional file upload field
   - Verify/Reject button
4. Checker uploads proof (optional)
5. Preview shows uploaded image
6. Click confirm → API call with proof data
7. Backend saves image + updates payment record
```

**Trade-offs**:

- ✅ Pro: Streamlined UX (one dialog, one action)
- ✅ Pro: Proof upload is contextual (during verification decision)
- ✅ Pro: Optional nature makes it flexible
- ⚠️ Con: Can't upload proof before making verification decision
- ⚠️ Con: Large files may slow down verification action

**Alternative Considered**: Separate "Upload Proof" action before verify/reject

- Rejected because it adds extra steps and complexity
- Users might upload proof but forget to verify
- Creates partial state (proof uploaded, not verified)

### 4. Transaction Status Update UI

**Decision**: Add status update dialog to TransactionDetailPage with allowed transitions only.

**Rationale**:

- Safety: Only valid state transitions are allowed (enforced by UI)
- Clarity: User sees current status and what's possible next
- Auditability: Optional notes field for context
- Permissions: Gated by MANAGE_TRANSACTION_STATUS permission

**Status Transitions** (already defined in code):

```typescript
const STATUS_TRANSITIONS = {
  CREATED: ["QUEUED"], // New transaction → Queue for loading
  QUEUED: ["LOADING", "CREATED"], // Start loading OR back to created
  LOADING: ["DONE", "QUEUED"], // Finish loading OR back to queue
  DONE: ["CHECKED_OUT", "LOADING"], // Check out OR back to loading
  CHECKED_OUT: [], // Terminal state
};
```

**UI Components**:

- Button: "Update Status" (visible only if transitions available + has permission)
- Dialog: Shows current status, allowed next statuses (radio buttons), optional notes
- Confirmation: "Are you sure?" with selected status highlighted
- Result: Success toast, transaction data refreshed, status history updated

**Trade-offs**:

- ✅ Pro: Enforces valid workflow transitions
- ✅ Pro: Clear UX for status management
- ✅ Pro: Permission-based access control
- ⚠️ Con: Can't skip states (e.g., CREATED → LOADING directly)
- ⚠️ Con: Supervisor override not supported (could add later)

### 5. Payment Detail Dialog Fix

**Decision**: Fix broken onClick handlers to properly show payment detail dialog.

**Current Issue**:

```tsx
// Payment items are rendered but onClick doesn't set state
<div className="payment-item">
  {/* No onClick handler connected to detail dialog */}
</div>
```

**Fix Strategy**:

```tsx
<div
  className="payment-item cursor-pointer hover:bg-muted/50"
  onClick={() => {
    setSelectedPayment(payment);
    setPaymentDetailOpen(true);
  }}
>
  {/* Payment info */}
</div>
```

**Dialog State Management**:

```tsx
const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(
  null
);
const [paymentDetailOpen, setPaymentDetailOpen] = useState(false);

// Dialog controlled by paymentDetailOpen state
<Dialog open={paymentDetailOpen} onOpenChange={setPaymentDetailOpen}>
  {/* Show selectedPayment details */}
</Dialog>;
```

**Trade-offs**:

- ✅ Pro: Simple fix, leverages existing dialog component
- ✅ Pro: Consistent with other detail dialogs in app
- ⚠️ Con: Multiple dialogs on same page (could be confusing)

## Data Flow

### Create Transaction with QRIS Payment

```
User Action: Create transaction, select QRIS payment method
    │
    ▼
CreateTransactionPage
    │ window.api.transactions.create({ paymentMethodId: 2, ... })
    ▼
IPC Handler: transactions:create
    │
    ▼
TransactionManager.createTransaction()
    │
    ├─► INSERT INTO transactions (...) VALUES (...)
    │   - payment_status: 'UNPAID'
    │   - transaction_status: 'CREATED'
    │
    ├─► INSERT INTO payments (...) VALUES (...)
    │   - status: 'PENDING'
    │   - verification_status: 'PENDING'
    │   - verified_by: NULL
    │   - verified_at: NULL
    │
    └─► INSERT INTO transaction_status_logs (...)

Result: Transaction created with pending payment record
```

### Verify Payment with Proof

```
User Action: Open PaymentVerifyPage, click Verify, upload proof
    │
    ▼
PaymentVerifyPage
    │ 1. Read file as base64
    │ 2. window.api.payments.verify(id, notes, proofData)
    ▼
IPC Handler: payments:verify
    │
    ▼
TransactionManager.verifyPayment()
    │
    ├─► savePaymentProof(paymentId, imageBuffer)
    │   │
    │   ├─► Write file: /user-data/payment-proofs/{id}_{ts}.jpg
    │   └─► Return: filePath
    │
    ├─► UPDATE payments SET
    │   - verification_status = 'VERIFIED'
    │   - verified_by = userId
    │   - verified_at = CURRENT_TIMESTAMP
    │   - proof_image_path = filePath
    │   - notes = userNotes
    │
    └─► UPDATE transactions SET
        - payment_status = 'PAID' (if all payments verified)

Result: Payment verified, proof saved, transaction status updated
```

### View Payment Proof

```
User Action: Click payment in TransactionDetailPage
    │
    ▼
TransactionDetailPage
    │ selectedPayment.proofImagePath exists?
    ▼
Payment Detail Dialog
    │
    ├─► Display proof image: <img src={`file://${proofPath}`} />
    │
    └─► "View Full Size" button
        │ window.api.payments.openProofExternal(paymentId)
        ▼
        OS default image viewer opens
```

## Error Handling

### File Upload Errors

**Scenarios**:

1. **File too large** (> 5MB)
   - Show error: "File size exceeds 5MB limit"
   - Don't submit verification
2. **Invalid file type**
   - Accept: .jpg, .jpeg, .png, .pdf
   - Show error: "Please upload JPG, PNG, or PDF file"
3. **Disk full**
   - Backend returns error
   - Show error: "Failed to save proof: disk full"
   - Verification is NOT saved (rollback)
4. **File read error**
   - Show error: "Failed to read file"
   - Don't submit verification

**Implementation**:

```typescript
// Frontend validation
const validateProofFile = (file: File) => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];

  if (file.size > maxSize) {
    throw new Error("File size exceeds 5MB limit");
  }

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Please upload JPG, PNG, or PDF file");
  }
};

// Backend error handling
try {
  const filePath = savePaymentProof(paymentId, imageBuffer);
  // ... update database
} catch (error) {
  // Rollback database changes
  // Return error to frontend
  return { success: false, error: error.message };
}
```

### State Transition Errors

**Scenarios**:

1. **Invalid transition** (e.g., CREATED → DONE)
   - UI prevents this (only allowed transitions shown)
   - Backend validates: return error if invalid
2. **Permission denied**
   - UI checks permission before showing button
   - Backend validates: return error if no permission
3. **Transaction not found**
   - Show error: "Transaction not found"
   - Navigate back to list

## Security Considerations

### File Storage Security

**Concerns**:

- Payment proofs contain sensitive financial information
- Files stored on disk without encryption
- User data folder is accessible to other apps (potentially)

**Mitigations**:

- Store in app-specific user data folder (not public)
- File permissions: User-only read/write (0600 on Unix)
- No external access: Files only accessible via IPC, not HTTP
- Audit trail: All proof accesses logged in transaction history

**Future Enhancements** (out of scope):

- Encrypt proof files at rest
- Add watermark with verification timestamp
- Implement file integrity checks (hash verification)

### Permission Enforcement

**Layers**:

1. **UI Layer**: Hide buttons if user lacks permission
2. **IPC Layer**: Check permission in handler before calling manager
3. **Backend Layer**: Verify user ID has permission in database

**Example**:

```typescript
// UI (TransactionDetailPage)
{canManageStatus && <Button onClick={...}>Update Status</Button>}

// IPC Handler
ipcMain.handle('transactions:updateStatus', async (event, id, status, note) => {
  const userId = getCurrentUserId();
  const hasPermission = await rbacManager.hasPermission(userId, 'MANAGE_TRANSACTION_STATUS');
  if (!hasPermission) {
    return { success: false, error: 'Permission denied' };
  }

  return transactionManager.updateTransactionStatus(id, status, userId, note);
});

// Backend (TransactionManager)
// No additional check needed, trusts IPC layer
```

## Performance Considerations

### File Size Optimization

**Concerns**:

- Large images slow down upload
- Large images consume disk space
- Large images slow down rendering

**Mitigations**:

- Client-side image compression before upload (optional enhancement)
- Max file size limit: 5MB
- Thumbnail generation for list view (future enhancement)
- Lazy loading: Only load images when detail dialog opened

### Database Query Performance

**Concerns**:

- Payment list queries with proof paths
- Transaction detail queries with payment history

**Mitigations**:

- Existing indexes on verification_status, transaction_id
- SELECT only needed columns (don't load proof path unless needed)
- Pagination on PaymentVerifyPage (already implemented)

## Testing Strategy

### Unit Tests (Future)

**TransactionManager**:

- `createTransaction()` with CASH → payment verified
- `createTransaction()` with QRIS → payment pending
- `savePaymentProof()` → file written correctly
- `verifyPayment()` → status updated, proof path saved

### Integration Tests (Future)

**E2E Flow**:

- Create QRIS transaction → check payment record exists
- Verify payment with proof → check file saved, status updated
- View payment detail → check proof displayed

### Manual Testing (Required)

See proposal.md "Testing Checklist" section

## Migration Strategy

### Database Migration

**New Migration File**: `20260108000001_add_payment_proof.ts`

**Migration Steps**:

1. Add `proof_image_path` column (nullable)
2. No backfill needed (existing payments have no proof)

**Rollback**:

- Drop column (recreate table without it)
- Orphaned proof files remain (manual cleanup)

### Code Deployment

**Order**:

1. Run database migration
2. Deploy backend changes (TransactionManager)
3. Deploy IPC handlers
4. Deploy UI changes

**Backward Compatibility**:

- New column is nullable → old code still works
- Old code doesn't call new proof methods → no errors
- UI gracefully handles missing proof_image_path

## Open Technical Questions

1. **Proof File Cleanup**: When should we delete proof files?

   - On payment deletion?
   - On transaction deletion?
   - Never (keep for audit)?
   - **Recommendation**: Keep forever for audit, or implement retention policy (e.g., delete after 2 years)

2. **Proof File Format**: Should we normalize all images to JPEG to save space?

   - **Recommendation**: Accept as-is for now, add conversion later if needed

3. **Concurrent Verification**: What if two checkers try to verify the same payment simultaneously?

   - **Current**: Last write wins (database UPDATE)
   - **Risk**: Low (payments are assigned/locked to checker in practice)
   - **Recommendation**: Add optimistic locking later if needed (version column)

4. **Proof Validation**: Should we validate that uploaded file is actually an image/PDF?
   - **Current**: MIME type check only
   - **Risk**: User could upload wrong file
   - **Recommendation**: Add file header validation (magic bytes) in future iteration
