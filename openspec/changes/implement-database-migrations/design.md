# Database Migration System Design

## Architecture Overview

The migration system will consist of:

1. **Migration Runner**: Core engine that executes migrations in order
2. **Migration Files**: Versioned SQL/TypeScript files containing schema changes
3. **Migration Table**: `schema_migrations` table tracking applied migrations
4. **Migration API**: Programmatic interface for creating and running migrations

## Key Components

### Migration Runner (`MigrationRunner.ts`)

```typescript
class MigrationRunner {
  private db: DatabaseInstance;
  private migrationsPath: string;

  constructor(db: DatabaseInstance, migrationsPath: string) {
    this.db = db;
    this.migrationsPath = migrationsPath;
  }

  async runPendingMigrations(): Promise<void> {
    const applied = this.getAppliedMigrations();
    const pending = this.getPendingMigrations(applied);

    for (const migration of pending) {
      await this.runMigration(migration);
      this.recordMigration(migration);
    }
  }

  private getAppliedMigrations(): Set<string> {
    // Query schema_migrations table
  }

  private getPendingMigrations(applied: Set<string>): Migration[] {
    // Scan migrations directory and filter
  }
}
```

### Migration File Structure

```
migrations/
  001_initial_schema.sql
  002_add_user_roles.sql
  003_seed_initial_data.sql
  004_add_price_history.sql
```

### Migration Table Schema

```sql
CREATE TABLE schema_migrations (
  version TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Migration Types

1. **Schema Migrations**: DDL changes (CREATE, ALTER, DROP)
2. **Data Migrations**: DML changes (INSERT, UPDATE, DELETE)
3. **Seed Migrations**: Initial data population

## Execution Flow

1. On app startup, create MigrationRunner instance
2. Check for pending migrations
3. Execute migrations in version order
4. Record successful migrations
5. Handle failures with rollback

## Error Handling

- **Atomic Transactions**: Each migration runs in a transaction
- **Rollback Support**: Failed migrations can be rolled back
- **Logging**: Detailed logs for debugging
- **Dry Run Mode**: Preview migrations without executing

## Development Workflow

1. Create migration file: `npm run migration:create <name>`
2. Write migration logic
3. Test migration locally
4. Commit migration file
5. Deploy with migration execution

## Production Considerations

- **Backup Before Migration**: Always backup before running migrations
- **Zero-Downtime**: Design migrations to be non-blocking
- **Rollback Plan**: Have rollback scripts ready
- **Monitoring**: Log migration execution and failures

## Alternatives Considered

### TypeORM Integration

- **Pros**: Rich migration features, active community
- **Cons**: Heavy dependency, ORM overhead, learning curve
- **Decision**: Not chosen due to existing better-sqlite3 usage and simpler needs

### Manual SQL Scripts

- **Pros**: Simple, direct control
- **Cons**: No version tracking, error-prone, hard to manage
- **Decision**: Not chosen due to lack of automation and safety

### Custom Migration System

- **Pros**: Tailored to needs, lightweight
- **Cons**: Development effort, maintenance burden
- **Decision**: Chosen for control and simplicity

## Trade-offs

- **Complexity vs Safety**: Migration system adds complexity but provides safety
- **Development Speed vs Production Safety**: Slower initial development but safer deployments
- **Custom vs Off-the-shelf**: More maintenance but better fit for Electron/SQLite stack</content>
  <parameter name="filePath">d:\Project\Example\KiramApps\kiram-site\openspec\changes\implement-database-migrations\design.md
