# Spec Delta: Payment Verification

## MODIFIED Requirements

### Requirement: Payment Record Creation for Non-Cash Methods

The system SHALL create payment records for all payment methods (CASH, QRIS, TRANSFER) upon transaction creation, with different initial verification states based on payment type.

#### Scenario: Create transaction with CASH payment method

```gherkin
Given a user creates a transaction with payment method "CASH"
When the transaction is saved
Then a payment record is created with:
  - status: "PAID"
  - verification_status: "VERIFIED"
  - verified_by: current user ID
  - verified_at: current timestamp
And the transaction payment_status is set to "PAID"
```

#### Scenario: Create transaction with QRIS payment method

```gherkin
Given a user creates a transaction with payment method "QRIS"
When the transaction is saved
Then a payment record is created with:
  - status: "PENDING"
  - verification_status: "PENDING"
  - verified_by: NULL
  - verified_at: NULL
And the transaction payment_status is set to "UNPAID"
And the payment appears in PaymentVerifyPage pending list
```

#### Scenario: Create transaction with TRANSFER payment method

```gherkin
Given a user creates a transaction with payment method "TRANSFER"
When the transaction is saved
Then a payment record is created with:
  - status: "PENDING"
  - verification_status: "PENDING"
  - verified_by: NULL
  - verified_at: NULL
And the transaction payment_status is set to "UNPAID"
And the payment appears in PaymentVerifyPage pending list
```

### Requirement: Transaction Payment Status Calculation

The system SHALL only consider payments with verification_status = "VERIFIED" when calculating transaction payment_status to determine if transaction is fully paid.

#### Scenario: Transaction with verified payment becomes PAID

```gherkin
Given a transaction with total_amount = 100000
And a payment record with amount = 100000 and verification_status = "PENDING"
When the payment is verified
Then the payment verification_status is updated to "VERIFIED"
And the transaction payment_status is updated to "PAID"
```

#### Scenario: Transaction with pending payment remains UNPAID

```gherkin
Given a transaction with total_amount = 100000
And a payment record with amount = 100000 and verification_status = "PENDING"
When no verification action is taken
Then the transaction payment_status remains "UNPAID"
```

#### Scenario: Transaction with rejected payment remains UNPAID

```gherkin
Given a transaction with total_amount = 100000
And a payment record with amount = 100000 and verification_status = "PENDING"
When the payment is rejected with reason "Invalid transfer receipt"
Then the payment verification_status is updated to "REJECTED"
And the payment rejection_reason is set to "Invalid transfer receipt"
And the transaction payment_status remains "UNPAID"
```

## ADDED Requirements

### Requirement: Payment Proof Storage

The system SHALL allow users with VERIFY_PAYMENT permission to upload payment proof images when verifying or rejecting payments.

#### Scenario: Upload payment proof during verification

```gherkin
Given a payment with verification_status = "PENDING"
And a user with VERIFY_PAYMENT permission
When the user verifies the payment and uploads a proof image
Then the image is saved to filesystem at "/user-data/payment-proofs/{payment-id}_{timestamp}.{ext}"
And the payment proof_image_path is updated with the file path
And the payment verification_status is set to "VERIFIED"
```

#### Scenario: Upload payment proof during rejection

```gherkin
Given a payment with verification_status = "PENDING"
And a user with VERIFY_PAYMENT permission
When the user rejects the payment with reason "Duplicate transfer" and uploads a proof image
Then the image is saved to filesystem
And the payment proof_image_path is updated with the file path
And the payment verification_status is set to "REJECTED"
And the payment rejection_reason is set to "Duplicate transfer"
```

#### Scenario: Verify payment without proof (optional)

```gherkin
Given a payment with verification_status = "PENDING"
And a user with VERIFY_PAYMENT permission
When the user verifies the payment without uploading proof
Then the payment is verified successfully
And the payment proof_image_path remains NULL
```

### Requirement: Payment Proof File Validation

The system SHALL validate payment proof uploads for file type and size to prevent abuse and ensure quality.

#### Scenario: Upload valid payment proof image

```gherkin
Given a user uploads a payment proof file
And the file type is "image/jpeg" or "image/png" or "application/pdf"
And the file size is less than 5MB
When the file is validated
Then the validation passes
And the file is saved successfully
```

#### Scenario: Reject oversized payment proof

```gherkin
Given a user uploads a payment proof file
And the file size is 6MB
When the file is validated
Then the validation fails with error "File size exceeds 5MB limit"
And the file is not saved
And the verification action is not completed
```

#### Scenario: Reject invalid file type

```gherkin
Given a user uploads a file with type "application/exe"
When the file is validated
Then the validation fails with error "Please upload JPG, PNG, or PDF file"
And the file is not saved
```

### Requirement: Payment Proof Display

The system SHALL allow users to view payment proof images in payment detail dialogs and transaction detail pages.

#### Scenario: View payment proof in detail dialog

```gherkin
Given a payment with proof_image_path = "/path/to/proof.jpg"
And a user opens the payment detail dialog
Then the proof image is displayed in the dialog
And a "View Full Size" button is available
```

#### Scenario: Open payment proof in external viewer

```gherkin
Given a payment with proof_image_path = "/path/to/proof.jpg"
And a user clicks "View Full Size" button
Then the OS default image viewer opens with the proof image
```

#### Scenario: Display placeholder when no proof available

```gherkin
Given a payment with proof_image_path = NULL
And a user opens the payment detail dialog
Then a placeholder message is displayed: "No payment proof uploaded"
And the "View Full Size" button is disabled
```

### Requirement: Payment Proof Deletion

The system SHALL delete payment proofs from filesystem when payment is deleted or when manually triggered by authorized users.

#### Scenario: Delete payment proof when payment is deleted

```gherkin
Given a payment with proof_image_path = "/path/to/proof.jpg"
When the payment is deleted
Then the proof image file is deleted from filesystem
And the database record is removed
```

#### Scenario: Delete payment proof manually

```gherkin
Given a payment with proof_image_path = "/path/to/proof.jpg"
And a user with VERIFY_PAYMENT permission
When the user deletes the payment proof
Then the proof image file is deleted from filesystem
And the payment proof_image_path is set to NULL
And the payment verification_status remains unchanged
```

## Related Capabilities

- **transaction-management**: Payment creation logic modified to support all payment methods
- **rbac-permissions**: VERIFY_PAYMENT permission required for proof operations
