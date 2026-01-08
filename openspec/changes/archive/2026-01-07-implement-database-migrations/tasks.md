# Database Migration Implementation Tasks

## 1. Create Migration Infrastructure

### 1.1 Create MigrationRunner class

- [x] Create `electron/database/migrator.ts` (refactored from MigrationRunner.ts)
- [x] Implement migration discovery using Umzug with better-sqlite3
- [x] Implement custom BetterSqlite3Storage for migration tracking
- [x] Add migration tracking via schema_migrations table

### 1.2 Create migration file templates

- [x] Create TypeScript migration template (db.exec pattern)
- [x] Add migration file naming convention utilities
- [x] Support timestamp-based naming (YYYYMMDDHHMMSS_name.ts)

### 1.3 Create schema_migrations table schema

- [x] Define schema_migrations table structure
- [x] Add creation logic in BetterSqlite3Storage class

## 2. Convert Existing Schema to Migrations

### 2.1 Create initial schema migration

- [x] Extract current schema from `initAuthDatabase`, `initItemsDatabase`, etc.
- [x] Create `20260106000001_initial_schema.ts` with all current tables
- [x] Test migration creates identical schema

### 2.2 Create initial data seeding migration

- [x] Extract seeding logic from `seedItemsData`, `seedCustomerData`, etc.
- [x] Create `20260106000002_seed_initial_data.ts` with all seed data
- [x] Ensure INSERT OR IGNORE to prevent duplicates
- [x] Implement password hashing with SHA256 in seed migration

### 2.3 Update database.ts to use migrations

- [x] Remove MigrationRunner import from database.ts
- [x] Migrations now run via CLI before app startup
- [x] Update createDatabase() to only establish connection

## 3. Add Development Tools

### 3.1 Create migration CLI commands

- [x] Add `migration:create` npm script
- [x] Add `migration:status` npm script
- [x] Add `migration:run` npm script
- [x] Add `migration:compile` npm script (TypeScript compilation)

### 3.2 Create migration status display

- [x] Show applied vs pending migrations
- [x] Display migration execution history
- [x] Add error reporting for failed migrations

### 3.3 Handle native module rebuilding

- [x] Add `rebuild:node` script for Node.js CLI
- [x] Add `rebuild` script for Electron
- [x] Auto-rebuild in db:fresh and db:migrate workflows

## 4. Add Error Handling and Rollback

### 4.1 Implement transaction rollback

- [x] Umzug handles transaction per migration
- [x] Rollback on migration failure
- [x] Log detailed error information

### 4.2 Add migration rollback support

- [x] Implement down migrations in TypeScript files
- [x] MigrationRunner.rollbackLast() method
- [x] MigrationRunner.rollbackAll() method

## 5. Testing and Validation

### 5.1 Create migration tests

- [ ] Test migration execution order
- [ ] Test transaction rollback on failure
- [ ] Test migration discovery and parsing

### 5.2 Test data integrity

- [x] Verify no data loss during migration
- [x] Test seed data uniqueness (INSERT OR IGNORE)
- [x] Validate schema consistency

### 5.3 Manual testing completed

- [x] Test `npm run db:fresh` workflow
- [x] Test `npm run migration:status`
- [x] Test `npm run dev` after migrations
- [x] Test local user login with hashed passwords

## 6. Documentation and Deployment

### 6.1 Update developer documentation

- [x] Document migration creation process
- [x] Add migration best practices
- [x] Update database setup instructions
- [ ] **Update docs for Umzug + better-sqlite3 architecture**

### 6.2 Add production deployment checks

- [x] Add migration status checks in build process
- [x] Ensure migrations run before app startup in production
- [x] Add backup recommendations

### 6.3 Create migration troubleshooting guide

- [x] Document common migration issues
- [x] Add recovery procedures
- [x] Include debugging commands
- [ ] **Update troubleshooting for native module rebuilding**

## 7. Refactoring to Umzug + better-sqlite3 (NEW)

### 7.1 Remove Sequelize dependency

- [x] Uninstall sequelize and sqlite3 packages
- [x] Create custom BetterSqlite3Storage class
- [x] Update CLI scripts to use better-sqlite3 directly

### 7.2 Update migration file format

- [x] Convert migrations from sequelize.query() to db.exec()
- [x] Use MigrationContext with `db: Database` type
- [x] Update migration template generator

### 7.3 Update database module structure

- [x] Create `electron/database/` folder
- [x] Create `migrator.ts` - Umzug wrapper
- [x] Create `sequelize.ts` (renamed) - better-sqlite3 connection utilities
- [x] Create `index.ts` - exports and CLI utilities
- [x] Create `tsconfig.migrations.json` for separate compilation

## Dependencies

- **Blocks**: None (can be developed in parallel with other features)
- **Blocked by**: None
- **Parallel work**: Can work on migration files while infrastructure is being built

## Validation Criteria

- ✅ Migrations run via CLI before app startup
- ✅ No duplicate data seeding occurs
- ✅ Schema changes are version-controlled
- ✅ Migration failures are handled gracefully
- ✅ Development tools work correctly
- ✅ Rollback functionality implemented (MigrationRunner methods)
- ✅ All existing functionality preserved
- ✅ Local user login works with hashed passwords
- ✅ Native module rebuilding handled automatically
- [ ] Automated tests pass with new migration system</content>
      <parameter name="filePath">d:\Project\Example\KiramApps\kiram-site\openspec\changes\implement-database-migrations\tasks.md
