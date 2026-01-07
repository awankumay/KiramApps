## ADDED Requirements

### Requirement: Customer Creation

The system SHALL allow users to create new customer records with name and category fields.

#### Scenario: Create personal customer

- **WHEN** user provides customer name "John Doe" and selects category "PERSONAL"
- **THEN** system creates a new customer record with id, name, category, is_active=true, and created_at timestamp
- **AND** system returns the created customer record

#### Scenario: Create company customer

- **WHEN** user provides customer name "PT Logistics" and selects category "COMPANY"
- **THEN** system creates a new customer record with id, name, category, is_active=true, and created_at timestamp
- **AND** system returns the created customer record

#### Scenario: Validate required fields

- **WHEN** user attempts to create customer without providing name
- **THEN** system returns validation error indicating name is required

### Requirement: Customer Retrieval

The system SHALL allow users to retrieve customer records with pagination and filtering capabilities.

#### Scenario: List all active customers

- **WHEN** user requests customer list with pagination (page=1, limit=20)
- **THEN** system returns list of active customers (is_active=true) with total count
- **AND** results are ordered by created_at descending

#### Scenario: Get customer by ID

- **WHEN** user requests customer with valid ID
- **THEN** system returns the customer record with all fields

#### Scenario: Search customers by name

- **WHEN** user searches customers with query "PT"
- **THEN** system returns customers whose name contains "PT" (case-insensitive)

#### Scenario: Filter customers by category

- **WHEN** user filters customers by category "COMPANY"
- **THEN** system returns only customers with category="COMPANY"

### Requirement: Customer Update

The system SHALL allow users to update existing customer records.

#### Scenario: Update customer name

- **WHEN** user updates customer name from "PT Logistics" to "PT Logistics Indonesia"
- **THEN** system updates the customer record
- **AND** system returns the updated customer record

#### Scenario: Update customer category

- **WHEN** user updates customer category from "PERSONAL" to "COMPANY"
- **THEN** system updates the customer record
- **AND** system returns the updated customer record

#### Scenario: Update non-existent customer

- **WHEN** user attempts to update customer with invalid ID
- **THEN** system returns error indicating customer not found

### Requirement: Customer Deletion

The system SHALL support soft delete for customer records to maintain data integrity.

#### Scenario: Soft delete customer

- **WHEN** user deletes customer with valid ID
- **THEN** system sets is_active=false for the customer
- **AND** customer is excluded from active customer lists
- **AND** historical data remains intact

#### Scenario: Delete customer with vehicles

- **WHEN** user deletes customer that has associated vehicles
- **THEN** system performs soft delete on customer
- **AND** associated vehicles remain in database but are marked inactive

### Requirement: Customer Category Management

The system SHALL support two customer categories: PERSONAL and COMPANY.

#### Scenario: List customer categories

- **WHEN** user requests available customer categories
- **THEN** system returns ["PERSONAL", "COMPANY"]

#### Scenario: Validate customer category

- **WHEN** user attempts to create customer with invalid category
- **THEN** system returns validation error indicating valid categories

### Requirement: Customer-Vehicle Relationship

The system SHALL maintain one-to-many relationship between customers and vehicles.

#### Scenario: Get customer vehicles

- **WHEN** user requests vehicles for customer with ID
- **THEN** system returns list of vehicles associated with that customer
- **AND** results include only active vehicles (is_active=true)

#### Scenario: Count customer vehicles

- **WHEN** user requests vehicle count for customer
- **THEN** system returns number of active vehicles for that customer
