## ADDED Requirements

### Requirement: Vehicle Creation

The system SHALL allow users to create new vehicle records with plate number and customer association.

#### Scenario: Create vehicle for customer

- **WHEN** user provides plate number "B 1234 ABC" and selects customer "PT Logistics"
- **THEN** system creates a new vehicle record with id, plate_number, customer_id, is_active=true, and created_at timestamp
- **AND** system returns the created vehicle record

#### Scenario: Validate required fields

- **WHEN** user attempts to create vehicle without providing plate number
- **THEN** system returns validation error indicating plate number is required

#### Scenario: Validate customer association

- **WHEN** user attempts to create vehicle without selecting customer
- **THEN** system returns validation error indicating customer is required

### Requirement: Plate Number Uniqueness

The system SHALL enforce unique constraint on plate_number field across all vehicles.

#### Scenario: Create vehicle with unique plate number

- **WHEN** user creates vehicle with plate number "B 1234 ABC" that doesn't exist
- **THEN** system successfully creates the vehicle record

#### Scenario: Create vehicle with duplicate plate number

- **WHEN** user attempts to create vehicle with plate number "B 1234 ABC" that already exists
- **THEN** system returns error indicating plate number must be unique

#### Scenario: Update vehicle with duplicate plate number

- **WHEN** user updates vehicle plate number to value that already exists
- **THEN** system returns error indicating plate number must be unique

### Requirement: Vehicle Retrieval

The system SHALL allow users to retrieve vehicle records with pagination and filtering capabilities.

#### Scenario: List all active vehicles

- **WHEN** user requests vehicle list with pagination (page=1, limit=20)
- **THEN** system returns list of active vehicles (is_active=true) with total count
- **AND** results include customer information
- **AND** results are ordered by created_at descending

#### Scenario: Get vehicle by ID

- **WHEN** user requests vehicle with valid ID
- **THEN** system returns the vehicle record with all fields including customer details

#### Scenario: Search vehicles by plate number

- **WHEN** user searches vehicles with query "B 1234"
- **THEN** system returns vehicles whose plate_number contains "B 1234" (case-insensitive)

#### Scenario: Filter vehicles by customer

- **WHEN** user filters vehicles by customer ID
- **THEN** system returns only vehicles associated with that customer

### Requirement: Vehicle Update

The system SHALL allow users to update existing vehicle records.

#### Scenario: Update vehicle plate number

- **WHEN** user updates vehicle plate number from "B 1234 ABC" to "B 5678 XYZ"
- **AND** new plate number is unique
- **THEN** system updates the vehicle record
- **AND** system returns the updated vehicle record

#### Scenario: Update vehicle customer

- **WHEN** user updates vehicle customer from "PT Logistics" to "PT Transport"
- **THEN** system updates the vehicle record
- **AND** system returns the updated vehicle record

#### Scenario: Update non-existent vehicle

- **WHEN** user attempts to update vehicle with invalid ID
- **THEN** system returns error indicating vehicle not found

### Requirement: Vehicle Deletion

The system SHALL support soft delete for vehicle records to maintain data integrity.

#### Scenario: Soft delete vehicle

- **WHEN** user deletes vehicle with valid ID
- **THEN** system sets is_active=false for the vehicle
- **AND** vehicle is excluded from active vehicle lists
- **AND** historical transaction data remains intact

#### Scenario: Delete vehicle with transactions

- **WHEN** user deletes vehicle that has associated transactions
- **THEN** system performs soft delete on vehicle
- **AND** historical transactions remain linked to the vehicle

### Requirement: Vehicle-Customer Relationship

The system SHALL maintain many-to-one relationship between vehicles and customers.

#### Scenario: Get vehicle customer

- **WHEN** user requests vehicle details
- **THEN** system includes customer information (name, category) in the response

#### Scenario: List vehicles for customer

- **WHEN** user requests vehicles for specific customer
- **THEN** system returns list of vehicles associated with that customer
- **AND** results include only active vehicles (is_active=true)

#### Scenario: Validate customer exists

- **WHEN** user attempts to create/update vehicle with non-existent customer ID
- **THEN** system returns error indicating customer not found

### Requirement: Vehicle Status Management

The system SHALL support active/inactive status for vehicles.

#### Scenario: Deactivate vehicle

- **WHEN** user deactivates vehicle
- **THEN** system sets is_active=false
- **AND** vehicle is excluded from active vehicle lists
- **AND** vehicle cannot be used in new transactions

#### Scenario: Reactivate vehicle

- **WHEN** user reactivates previously deactivated vehicle
- **THEN** system sets is_active=true
- **AND** vehicle appears in active vehicle lists
- **AND** vehicle can be used in new transactions

### Requirement: Vehicle Search and Filter

The system SHALL provide search and filter capabilities for vehicles.

#### Scenario: Search by partial plate number

- **WHEN** user searches vehicles with "B 12"
- **THEN** system returns vehicles with plate numbers containing "B 12"

#### Scenario: Filter by active status

- **WHEN** user filters vehicles by is_active=true
- **THEN** system returns only active vehicles

#### Scenario: Combine search and filter

- **WHEN** user searches vehicles with "B" and filters by customer ID
- **THEN** system returns vehicles matching both criteria
