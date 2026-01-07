# Implement Database Migrations

## Why

The current ad-hoc database initialization causes duplicate data insertion (especially items) every time `npm run dev` runs, as seeding happens on every startup without version tracking. This prevents reliable development and creates data integrity issues.

## What Changes

- **BREAKING:** Replace ad-hoc schema initialization with version-controlled migration system
- Implement MigrationRunner class for executing database migrations
- Create schema_migrations table to track applied migrations
- Convert existing schema and seed data to migration files
- Add CLI tools for migration management
- Remove old init functions and startup seeding logic

## Impact

- Affected specs: database-migration-system (new capability)
- Affected code: `electron/auth/database.ts`, `electron/main.ts`, all database initialization code
- **Breaking change:** Database initialization will change from ad-hoc to migration-based
- **Migration required:** Existing databases will need migration scripts</content>
  <parameter name="filePath">d:\Project\Example\KiramApps\kiram-site\openspec\changes\implement-database-migrations\proposal.md
