# Spec Delta: database-migration-system

## MODIFIED Requirements

### Requirement: Migration File Management

The system SHALL discover and manage migration files following a consistent naming convention **using CommonJS module format compatible with Electron's Node.js runtime**.

#### Scenario: Migration files follow naming convention

**Given** a developer creates a migration  
**When** the migration file is named  
**Then** it should follow the pattern: `{version}_{description}.ts`  
**And** use CommonJS exports: `module.exports.up` and `module.exports.down`

#### Scenario: Migration files are compatible with production builds

**Given** migration files are compiled from TypeScript  
**When** the application is packaged with electron-builder  
**Then** the compiled migration files should use CommonJS syntax  
**And** be loadable by Umzug without module system errors

#### Scenario: TypeScript compilation targets CommonJS

**Given** migration TypeScript files exist  
**When** migrations are compiled via `npm run migration:compile`  
**Then** the output should be CommonJS format (not ES Modules)  
**And** use `module.exports` instead of `export` statements

### Requirement: Development Tools

The system SHALL provide CLI tools for migration management during development **that generate CommonJS-compatible migration files**.

#### Scenario: Migration creation command generates CommonJS format

**Given** a developer needs to create a migration  
**When** they run `npm run migration:create <name>`  
**Then** a new migration file should be created with proper naming  
**And** the template should use `module.exports.up` and `module.exports.down`  
**And** the file should be TypeScript with CommonJS export syntax

#### Scenario: Migration compilation uses correct module format

**Given** TypeScript migration files exist  
**When** the developer runs `npm run migration:compile`  
**Then** the TypeScript compiler should target CommonJS module output  
**And** the resulting `.js` files should be compatible with Node.js in Electron

## ADDED Requirements

### Requirement: Production Build Compatibility

The system SHALL ensure migration files work correctly in packaged Electron applications without module system errors.

#### Scenario: Packaged application loads migrations successfully

**Given** the application is packaged with electron-builder  
**When** the application launches for the first time  
**Then** the migration system should load migration files without errors  
**And** no "Unexpected token" or module-related errors should occur  
**And** all migrations should execute successfully

#### Scenario: Migration files survive build process intact

**Given** migration files are compiled to CommonJS  
**When** the build process copies migrations to dist-electron  
**Then** the migration files should retain CommonJS syntax  
**And** no transformation or bundling should modify the module format  
**And** the files should be directly loadable by Node.js

### Requirement: Module Format Consistency

The system SHALL maintain consistent module format between migration files and the Electron main process.

#### Scenario: Migration format matches main process format

**Given** the Electron main process uses CommonJS format  
**When** migration files are loaded at runtime  
**Then** they should also use CommonJS format  
**And** there should be no module system mismatch errors

## Rationale

### Why CommonJS for Migration Files

1. **Electron Compatibility**: The main Electron process is compiled to CommonJS for maximum compatibility
2. **Production Reliability**: Ensures migrations work identically in development and packaged builds
3. **Umzug Compatibility**: Umzug supports both ES Modules and CommonJS, but CommonJS is more stable in Electron context
4. **Build Simplicity**: No need for complex transformation or bundling of migration files

### Why This Spec Delta

This delta addresses a critical production bug where the module system mismatch prevented database initialization in packaged applications. By explicitly specifying CommonJS as the required format for migration files, we:

- Prevent future ES Module syntax from being introduced
- Document the expected build output format
- Provide clear guidance for developers creating new migrations
- Ensure consistency across development and production environments

### Impact on Existing Spec

- **Migration File Management**: Enhanced to specify module format requirements
- **Development Tools**: Updated to require CommonJS template generation
- **Production Compatibility**: New requirement for packaged application scenarios

### Related Specifications

- Complements existing `authentication` and `authorization` specs (both use CommonJS)
- Aligns with `project-structure` conventions (main process uses CommonJS)
- Extends `database-migration-system` with production build requirements
