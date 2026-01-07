# Database Migration System

## ADDED Requirements

### Requirement: Migration Execution

The system SHALL execute pending database migrations automatically on application startup in version order, with atomic transaction support.

#### Scenario: Application startup runs pending migrations

**Given** the application is starting up  
**When** the database connection is established  
**Then** the migration runner should execute all pending migrations in version order  
**And** record successful migrations in the schema_migrations table

#### Scenario: Migration execution is atomic

**Given** a migration is running  
**When** the migration encounters an error  
**Then** the entire migration should be rolled back  
**And** subsequent migrations should not execute

### Requirement: Migration Tracking

The system SHALL track applied migrations to prevent re-execution and provide migration history.

#### Scenario: Migration versions are tracked

**Given** a migration has been executed  
**When** the application checks for pending migrations  
**Then** the executed migration should not run again

#### Scenario: Migration table exists

**Given** the database is being initialized  
**When** the migration system starts  
**Then** the schema_migrations table should be created if it doesn't exist

### Requirement: Migration File Management

The system SHALL discover and manage migration files following a consistent naming convention.

#### Scenario: Migration files are discovered

**Given** migration files exist in the migrations directory  
**When** the migration runner scans for migrations  
**Then** all migration files should be found and sorted by version

#### Scenario: Migration files follow naming convention

**Given** a developer creates a migration  
**When** the migration file is named  
**Then** it should follow the pattern: `{version}_{description}.sql` or `{version}_{description}.ts`

### Requirement: Data Seeding Migration

The system SHALL handle initial data population through versioned migrations to prevent duplicates.

#### Scenario: Initial data is seeded once

**Given** the application is running for the first time  
**When** the initial data migration runs  
**Then** items, users, and other seed data should be inserted  
**And** subsequent runs should not duplicate the data

#### Scenario: Seed data migration is versioned

**Given** seed data needs to be updated  
**When** a new seed migration is created  
**Then** it should be treated as a regular migration with version tracking

### Requirement: Development Tools

The system SHALL provide CLI tools for migration management during development.

#### Scenario: Migration creation command exists

**Given** a developer needs to create a migration  
**When** they run the migration creation command  
**Then** a new migration file should be created with proper naming

#### Scenario: Migration status command exists

**Given** a developer wants to see migration status  
**When** they run the migration status command  
**Then** they should see applied and pending migrations

### Requirement: Error Handling

The system SHALL handle migration failures gracefully with detailed logging and rollback capabilities.

#### Scenario: Migration failure is logged

**Given** a migration fails to execute  
**When** the error occurs  
**Then** the error should be logged with details  
**And** the migration status should remain unchanged

#### Scenario: Invalid migration file is detected

**Given** a migration file has invalid syntax  
**When** the migration runner attempts to execute it  
**Then** the execution should fail gracefully  
**And** an error should be reported

### Requirement: Rollback Support

The system SHALL support rolling back migrations to previous states.

#### Scenario: Migration can be rolled back

**Given** a migration has been applied  
**When** a rollback is requested  
**Then** the migration changes should be reversed  
**And** the migration should be removed from the tracking table

## MODIFIED Requirements

### Requirement: Database Initialization

The database initialization process SHALL use the migration system instead of ad-hoc schema creation functions.

#### Scenario: Database initialization uses migrations

**Given** the application is starting  
**When** the database is initialized  
**Then** migrations should be run instead of ad-hoc schema creation  
**And** the old init functions should be replaced

### Requirement: Data Seeding

Data seeding SHALL be handled through versioned migrations instead of startup code.

#### Scenario: Data seeding is migration-based

**Given** initial data needs to be populated  
**When** the application starts  
**Then** data seeding should happen through migrations  
**And** not through startup code

## REMOVED Requirements

### Requirement: Ad-hoc Schema Initialization

**Reason:** Replaced by version-controlled migration system  
**Migration:** Schema initialization will be handled by migration files

#### Scenario: Old init functions are removed

**Given** the migration system is in place  
**When** database initialization occurs  
**Then** the old `initAuthDatabase`, `initItemsDatabase` functions should be removed  
**And** replaced with migration execution

### Requirement: Startup Data Seeding

**Reason:** Data seeding moved to versioned migrations to prevent duplicates  
**Migration:** Initial data will be seeded through migration files

#### Scenario: Startup seeding is removed

**Given** migrations handle data seeding  
**When** the application starts  
**Then** data seeding should not occur in startup code  
**And** should only happen through migrations</content>
<parameter name="filePath">d:\Project\Example\KiramApps\kiram-site\openspec\changes\implement-database-migrations\specs\database-migration-system\spec.md
