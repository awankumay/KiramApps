# Database Migration - Quick Reference

## 🚀 Common Commands

```bash
# Check migration status
npm run migration:status

# Create new migration
npm run migration:create <name>

# Run pending migrations
npm run migration:run

# Compile TypeScript migrations
npm run migration:compile

# Reset database (delete all data)
npm run db:reset

# Fresh start (reset + compile + migrate + rebuild)
npm run db:fresh

# Rebuild native modules
npm run rebuild:node   # For Node.js CLI
npm run rebuild        # For Electron
```

## 📂 File Structure

```
electron/
├── database/
│   ├── migrator.ts                 # Umzug wrapper + BetterSqlite3Storage
│   ├── sequelize.ts                # Database connection utilities
│   └── index.ts                    # Exports and CLI utilities
├── migrations/
│   ├── 20260106000001_initial_schema.ts      # Base schema
│   └── 20260106000002_seed_initial_data.ts   # Seed data
scripts/
├── db-reset.js                     # Delete database
├── migration-create.js             # Generate migration
├── migration-run.js                # Execute migrations
└── migration-status.js             # Check status

tsconfig.migrations.json            # TypeScript config for migrations
```

## ✍️ Migration Template (TypeScript)

```typescript
import type { MigrationContext } from "../database/migrator";

/**
 * Migration: Add Feature Name
 * Created: YYYY-MM-DD
 */
export async function up({ db }: MigrationContext): Promise<void> {
  // Create table
  db.exec(`
    CREATE TABLE IF NOT EXISTS feature (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add index
  db.exec(`CREATE INDEX IF NOT EXISTS idx_feature_name ON feature(name)`);

  // Seed data (optional) - use prepared statements for safety
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO feature (id, name) VALUES (?, ?)`
  );
  stmt.run(1, "Example");
}

export async function down({ db }: MigrationContext): Promise<void> {
  db.exec("DROP TABLE IF EXISTS feature");
}
```

## 🎯 Best Practices Checklist

- [ ] Use descriptive migration names
- [ ] One logical change per migration
- [ ] Include `IF NOT EXISTS` for idempotency
- [ ] Use `INSERT OR IGNORE` for seed data
- [ ] Add foreign key constraints
- [ ] Create indexes for frequently queried columns
- [ ] Implement `down()` function for rollback
- [ ] Test with `npm run db:fresh` before commit
- [ ] Never edit applied migrations

## 🔍 Quick Debugging

```bash
# Check what migrations are pending
npm run migration:status

# View database location
# Windows: C:\Users\<user>\AppData\Roaming\kiram-site\app-data.db
# macOS:   ~/Library/Application Support/kiram-site/app-data.db
# Linux:   ~/.config/kiram-site/app-data.db

# If migration fails
npm run migration:compile  # Compile TypeScript first
npm run migration:run      # Try again

# If native module errors (NODE_MODULE_VERSION mismatch)
npm run rebuild:node       # For CLI scripts
npm run rebuild            # For Electron app
npm run db:fresh           # Does both automatically
```

## 🐛 Common Issues

| Problem                        | Solution                                          |
| ------------------------------ | ------------------------------------------------- |
| "table already exists"         | Add `IF NOT EXISTS`                               |
| "duplicate data"               | Use `INSERT OR IGNORE`                            |
| "NODE_MODULE_VERSION mismatch" | Run `npm run db:fresh` (auto-rebuilds both)       |
| Migration not found            | Run `npm run migration:compile` first             |
| TypeScript compile error       | Check imports: `import type { MigrationContext }` |

## 📋 Test Users (Seeded)

| Username            | Password                            | Role       |
| ------------------- | ----------------------------------- | ---------- |
| superadmin          | password123                         | SUPERADMIN |
| checker1            | checker123                          | CHECKER    |
| loader1             | loader123                           | LOADER     |
| Can't find database | Scripts use userData path (AppData) |

## 📖 Full Documentation

See [DATABASE_MIGRATION_GUIDE.md](./DATABASE_MIGRATION_GUIDE.md) for complete guide.

## 🎓 Example Workflows

### Add New Column

```bash
npm run migration:create add_phone_to_users
# Edit: electron/migrations/XXX_add_phone_to_users.sql
# ALTER TABLE users ADD COLUMN phone TEXT;
npm run migration:run
```

### Create New Table

```bash
npm run migration:create create_orders_table
# Edit: electron/migrations/XXX_create_orders_table.sql
npm run migration:run
npm run dev  # Test in app
```

### Fresh Install (New Developer)

```bash
git clone <repo>
npm install
npm rebuild better-sqlite3
npm run rebuild
npm run migration:run
npm run dev
```

---

**Need help?** Check [DATABASE_MIGRATION_GUIDE.md](./DATABASE_MIGRATION_GUIDE.md) or [Troubleshooting Section](./DATABASE_MIGRATION_GUIDE.md#troubleshooting)
