# Spec Delta: Transaction Management

## ADDED Requirements

### Requirement: Transaction Status Update via UI

The system SHALL allow users with MANAGE_TRANSACTION_STATUS permission to update transaction status through UI dialogs with enforced valid state transitions.

#### Scenario: Update transaction status from CREATED to QUEUED

```gherkin
Given a transaction with transaction_status = "CREATED"
And a user with MANAGE_TRANSACTION_STATUS permission
When the user clicks "Update Status" button
Then a status update dialog appears
And the dialog shows current status as "CREATED"
And the dialog shows allowed next statuses: ["QUEUED"]
When the user selects "QUEUED" and optionally adds notes
And clicks confirm
Then the transaction_status is updated to "QUEUED"
And a status log entry is created with the user ID and notes
And the transaction data is refreshed
```

#### Scenario: Update transaction status from QUEUED to LOADING

```gherkin
Given a transaction with transaction_status = "QUEUED"
And a user with MANAGE_TRANSACTION_STATUS permission
When the user opens the status update dialog
Then the allowed next statuses are: ["LOADING", "CREATED"]
When the user selects "LOADING"
Then the transaction_status is updated to "LOADING"
And a status log entry is created
```

#### Scenario: Cannot update terminal status

```gherkin
Given a transaction with transaction_status = "CHECKED_OUT"
And a user with MANAGE_TRANSACTION_STATUS permission
When the user views the transaction detail page
Then the "Update Status" button is not displayed
And no status updates are allowed
```

#### Scenario: Permission denied for status update

```gherkin
Given a transaction with transaction_status = "CREATED"
And a user without MANAGE_TRANSACTION_STATUS permission
When the user views the transaction detail page
Then the "Update Status" button is not displayed
And the user cannot update transaction status
```

### Requirement: Transaction Status Validation

The system SHALL enforce valid state transitions for transaction status updates to maintain data integrity and workflow consistency.

#### Scenario: Enforce valid state transitions

```gherkin
Given the following valid state transitions:
  | From         | To                        |
  | CREATED      | QUEUED                    |
  | QUEUED       | LOADING, CREATED          |
  | LOADING      | DONE, QUEUED              |
  | DONE         | CHECKED_OUT, LOADING      |
  | CHECKED_OUT  | (none)                    |
When a user attempts to update status
Then only the allowed transitions for current status are shown
And invalid transitions are prevented at UI level
```

#### Scenario: Backend validation of status transition

```gherkin
Given a transaction with transaction_status = "CREATED"
When the backend receives a status update request to "DONE"
Then the backend validates the transition
And the request is rejected with error "Invalid status transition: CREATED → DONE"
And the transaction_status remains "CREATED"
```

### Requirement: Payment Detail Dialog Interaction

The system SHALL allow users to click on payment items in transaction detail page to view detailed payment information including verification status and proof.

#### Scenario: Open payment detail dialog

```gherkin
Given a transaction with payment records
And a user viewing the transaction detail page
When the user clicks on a payment item in the payment list
Then the payment detail dialog opens
And the dialog shows:
  - Payment ID
  - Payment method
  - Amount
  - Verification status
  - Verification details (verified_by, verified_at)
  - Notes
  - Rejection reason (if rejected)
  - Payment proof image (if available)
```

#### Scenario: View payment with verified status

```gherkin
Given a payment with verification_status = "VERIFIED"
When the user opens the payment detail dialog
Then the dialog shows a green "Terverifikasi" badge
And displays verified_by user name
And displays verified_at timestamp
And shows payment proof if available
```

#### Scenario: View payment with rejected status

```gherkin
Given a payment with verification_status = "REJECTED"
And rejection_reason = "Invalid bank transfer receipt"
When the user opens the payment detail dialog
Then the dialog shows a red "Ditolak" badge
And displays the rejection_reason in a highlighted section
And shows payment proof if available
```

#### Scenario: View payment with pending status

```gherkin
Given a payment with verification_status = "PENDING"
When the user opens the payment detail dialog
Then the dialog shows a gray "Menunggu" badge
And no verification details are shown
And a message suggests: "Pembayaran belum diverifikasi"
```

### Requirement: Payment List Visual Enhancement

The system SHALL provide clear visual indicators for payment verification status and clickability in transaction detail page payment lists.

#### Scenario: Display payment verification status badges

```gherkin
Given a transaction with multiple payments
And payments have different verification statuses
When the user views the payment list
Then each payment item shows a colored badge:
  - PENDING: Gray badge with clock icon
  - VERIFIED: Green badge with checkmark icon
  - REJECTED: Red badge with X icon
```

#### Scenario: Visual feedback for clickable payment items

```gherkin
Given payment items in the payment list
When the user hovers over a payment item
Then the item background changes to highlight color
And the cursor changes to pointer
And an eye icon is displayed indicating "View Details"
```

## Related Capabilities

- **payment-verification**: Payment detail dialogs display verification status and proof
- **rbac-permissions**: MANAGE_TRANSACTION_STATUS permission required for status updates
- **audit-logging**: Status changes are logged to transaction_status_logs table
