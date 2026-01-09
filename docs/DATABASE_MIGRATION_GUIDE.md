# Database Migration Guide

## Overview

KiramApps menggunakan sistem migrasi database berbasis **Umzug + better-sqlite3** untuk mengelola perubahan schema dan data secara terstruktur. Sistem ini mencegah duplikasi data dan memastikan semua perubahan database ter-versi dengan baik.

> **Important**: For detailed information about module system setup (CommonJS vs ES Modules) for development and production, see [MODULE_SYSTEM_GUIDE.md](./MODULE_SYSTEM_GUIDE.md).

## Konsep Dasar

### Apa itu Database Migration?

Migration adalah cara untuk mengelola perubahan database schema secara terstruktur dan dapat dilacak (version-controlled). Setiap migration memiliki:

- **Timestamp**: Format YYYYMMDDHHMMSS untuk ordering
- **TypeScript file**: Berisi logic `up()` dan `down()` untuk migrasi
- **Status tracking**: Dicatat dalam tabel `schema_migrations`

### Tech Stack

- **Umzug**: Migration framework (dari tim Sequelize)
- **better-sqlite3**: Synchronous SQLite driver untuk Node.js/Electron
- **Custom BetterSqlite3Storage**: Storage adapter untuk tracking migrations

### Keuntungan Migration System

✅ **Version Control**: Semua perubahan database ter-versi di Git  
✅ **Idempotent**: Migration hanya dijalankan sekali  
✅ **No Duplicates**: Seed data menggunakan `INSERT OR IGNORE`  
✅ **Rollback Support**: Setiap migration punya `down()` function  
✅ **Team Collaboration**: Developer lain dapat sync database dengan mudah  
✅ **Native Performance**: better-sqlite3 lebih cepat dari async drivers

## Arsitektur

```
electron/
├── database/
│   ├── migrator.ts              # Umzug wrapper + BetterSqlite3Storage
│   ├── sequelize.ts             # Database connection utilities
│   └── index.ts                 # Exports and CLI utilities
├── migrations/
│   ├── 20260106000001_initial_schema.ts    # Baseline schema
│   └── 20260106000002_seed_initial_data.ts # Initial data seeding
└── auth/
    └── database.ts              # App database initialization

scripts/
├── db-reset.js                  # Reset database (delete files)
├── migration-create.js          # Create new migration file
├── migration-run.js             # Run pending migrations
└── migration-status.js          # Check migration status

tsconfig.migrations.json         # TypeScript config for migrations
```

### Schema Migrations Table

Migration tracking disimpan dalam tabel `schema_migrations`:

```sql
CREATE TABLE schema_migrations (
  name TEXT PRIMARY KEY,
  executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Cara Menggunakan

### 1. Check Migration Status

Untuk melihat migration mana yang sudah applied dan mana yang pending:

```bash
npm run migration:status
```

Output:

```
📊 Migration Status
==================
Database: C:\Users\<user>\AppData\Roaming\kiram-site\app-data.db

✅ Applied migrations (2):
   - 20260106000001_initial_schema.js
   - 20260106000002_seed_initial_data.js
✅ No pending migrations
```

### 2. Membuat Migration Baru

Untuk membuat migration file baru:

```bash
npm run migration:create add_transactions_table
```

Ini akan generate file: `electron/migrations/20260106123456_add_transactions_table.ts`

Template migration (TypeScript):

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Migration: add_transactions_table
 * Created: 2026-01-06
 */
/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.up = async function ({ db }: any) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `);

  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id)`
  );
};

/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.down = async function ({ db }: any) {
  db.exec("DROP TABLE IF EXISTS transactions");
};
```

**Note**: Migration files use CommonJS syntax (`module.exports`) for compatibility with Electron's Node.js runtime in production builds.

### 3. Menjalankan Pending Migrations

Untuk execute semua pending migrations:

```bash
npm run migration:run
```

Output:

```
🚀 Running pending migrations...
Database path: C:\Users\<user>\AppData\Roaming\kiram-site\app-data.db
✅ Database connection established
Found 2 pending migrations
{ event: 'migrating', name: '20260106000001_initial_schema.js' }
{ event: 'migrated', name: '20260106000001_initial_schema.js', durationSeconds: 0.003 }
{ event: 'migrating', name: '20260106000002_seed_initial_data.js' }
✅ Seeded initial data...
{ event: 'migrated', name: '20260106000002_seed_initial_data.js', durationSeconds: 0.005 }
✅ All migrations completed successfully
```

### 4. Reset Database (Fresh Start)

Untuk menghapus database dan run ulang semua migrations dari awal:

```bash
npm run db:fresh
```

Perintah ini akan:

1. Rebuild better-sqlite3 for Node.js CLI
2. Delete semua database files (`.db`, `.db-wal`, `.db-shm`)
3. Compile TypeScript migrations
4. Run semua migrations dari awal
5. Rebuild better-sqlite3 for Electron

⚠️ **Warning**: Semua data akan hilang! Gunakan hanya untuk development.

### 5. Reset Database Tanpa Re-run Migrations

Jika hanya ingin delete database files tanpa menjalankan migrations:

```bash
npm run db:reset
```

## Best Practices

### ✅ DO

1. **Gunakan descriptive names**

   ```bash
   npm run migration:create add_payment_status_column
   npm run migration:create create_audit_logs_table
   ```

2. **Satu migration untuk satu perubahan logis**

   - ✅ Good: `001_create_users_table.sql`
   - ❌ Bad: `001_create_all_tables.sql`

3. **Gunakan IF NOT EXISTS untuk idempotency**

   ```sql
   CREATE TABLE IF NOT EXISTS users (...);
   CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
   ```

4. **Gunakan INSERT OR IGNORE untuk seed data**

   ```sql
   INSERT OR IGNORE INTO roles (id, name) VALUES (1, 'Admin');
   ```

5. **Test migrations sebelum commit**
   ```bash
   npm run db:fresh  # Test from scratch
   npm run dev       # Verify app works
   ```

### ❌ DON'T

1. **Jangan edit migration yang sudah applied**

   - Migration sudah applied tidak boleh diubah
   - Buat migration baru untuk perubahan tambahan

2. **Jangan hapus migration yang sudah di-commit**

   - Migration history harus preserved
   - Hapus via rollback migration jika perlu

3. **Jangan hardcode sensitive data**

   - Gunakan environment variables
   - Atau buat migration khusus untuk local dev

4. **Jangan lupa foreign key constraints**

   ```sql
   -- ❌ Bad
   CREATE TABLE orders (
     customer_id INTEGER
   );

   -- ✅ Good
   CREATE TABLE orders (
     customer_id INTEGER NOT NULL,
     FOREIGN KEY (customer_id) REFERENCES customers(id)
   );
   ```

## Workflow Development

### Scenario 1: Menambah Kolom Baru

```bash
# 1. Buat migration
npm run migration:create add_phone_to_customers

# 2. Edit file migration
# electron/migrations/003_add_phone_to_customers.sql
ALTER TABLE customers ADD COLUMN phone TEXT;

# 3. Run migration
npm run migration:run

# 4. Verify
npm run migration:status
```

### Scenario 2: Membuat Tabel Baru dengan Data

```bash
# 1. Buat migration untuk schema
npm run migration:create create_products_table

# electron/migrations/004_create_products_table.sql
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0
);

# 2. Buat migration untuk seed data
npm run migration:create seed_products_data

# electron/migrations/005_seed_products_data.sql
INSERT OR IGNORE INTO products (id, name, price, stock)
VALUES
  (1, 'Product A', 100000, 50),
  (2, 'Product B', 200000, 30);

# 3. Run migrations
npm run migration:run
```

### Scenario 3: Fresh Install (Developer Baru)

```bash
# 1. Clone repository
git clone <repo-url>
cd kiram-site

# 2. Install dependencies
npm install

# 3. Rebuild native modules
npm rebuild better-sqlite3
npm run rebuild

# 4. Run migrations
npm run migration:run

# 5. Start app
npm run dev
```

## Troubleshooting

### Problem: "table already exists"

**Penyebab**: Migration tidak menggunakan `IF NOT EXISTS`

**Solusi**: Tambahkan `IF NOT EXISTS` di CREATE statements

```sql
CREATE TABLE IF NOT EXISTS users (...);
```

### Problem: "duplicate data seeding"

**Penyebab**: INSERT tanpa `OR IGNORE`

**Solusi**: Gunakan `INSERT OR IGNORE` atau specify unique constraint

```sql
INSERT OR IGNORE INTO items (id, name, price) VALUES (1, 'Pasir', 150000);
```

### Problem: "NODE_MODULE_VERSION mismatch"

**Penyebab**: better-sqlite3 compiled untuk Node.js, bukan Electron

**Solusi**: Rebuild dengan electron-rebuild

```bash
npm run rebuild
```

### Problem: Migration gagal di tengah-tengah

**Good news**: Sistem sudah handle ini dengan transaction rollback!

**Yang terjadi**:

1. Migration dijalankan dalam transaction
2. Jika ada error, transaction otomatis rollback
3. Database kembali ke state sebelum migration
4. Error message ditampilkan di console

**Cara fix**:

1. Check error message untuk tahu masalahnya
2. Fix SQL di migration file
3. Rebuild TypeScript: `npm run build`
4. Run ulang: `npm run migration:run`

### Problem: Database path berbeda antara CLI dan Electron

**Penyebab**: CLI scripts menggunakan relative path, Electron menggunakan userData path

**Solusi**: Sudah dihandle di scripts! Database path:

- **Windows**: `C:\Users\<username>\AppData\Roaming\kiram-site\app-data.db`
- **macOS**: `~/Library/Application Support/kiram-site/app-data.db`
- **Linux**: `~/.config/kiram-site/app-data.db`

## NPM Scripts Reference

| Script                    | Perintah                           | Deskripsi                             |
| ------------------------- | ---------------------------------- | ------------------------------------- |
| `migration:create <name>` | `node scripts/migration-create.js` | Buat migration file baru              |
| `migration:status`        | `node scripts/migration-status.js` | Lihat status migrations               |
| `migration:run`           | `node scripts/migration-run.js`    | Run pending migrations                |
| `db:reset`                | `node scripts/db-reset.js`         | Hapus database files                  |
| `db:fresh`                | Combined script                    | Reset DB + run all migrations         |
| `rebuild`                 | `electron-rebuild`                 | Rebuild better-sqlite3 untuk Electron |

## Migration File Format

### SQL Migration (Recommended)

```sql
-- Migration: <Description>
-- Version: <XXX>
-- Created: <Date>

-- Your SQL statements here
CREATE TABLE IF NOT EXISTS example (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

INSERT OR IGNORE INTO example (id, name) VALUES (1, 'Test');
```

### TypeScript Migration Format

Migration files use CommonJS syntax for compatibility with Electron:

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Migration: add_example_table
 * Created: 2026-01-XX
 */
/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.up = async function ({ db }: any) {
  // Add your migration logic here
  db.exec(`
    CREATE TABLE IF NOT EXISTS example (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )
  `);
};

/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.down = async function ({ db }: any) {
  // Rollback logic
  db.exec("DROP TABLE IF EXISTS example");
};
```

**Important**: Use CommonJS (`module.exports`) instead of ES Modules (`export`) to ensure compatibility with Electron's Node.js runtime in production builds.

## Advanced Topics

### Transaction Behavior

Setiap migration dijalankan dalam single transaction:

```typescript
db.transaction(() => {
  const sql = fs.readFileSync(migrationPath, "utf-8");
  db.exec(sql);
  db.prepare("INSERT INTO schema_migrations (version) VALUES (?)").run(version);
})();
```

**Benefits**:

- Atomic: Semua SQL dijalankan atau none
- Rollback otomatis jika ada error
- Database consistency terjaga

### Migration Discovery

MigrationRunner otomatis discover migration files:

1. Scan folder `electron/migrations/`
2. Filter files dengan pattern: `\d{3}_.*\.sql`
3. Sort by version number (001, 002, 003...)
4. Compare dengan `schema_migrations` table
5. Execute pending migrations in order

### Production Considerations

**Backup Strategy**:

```bash
# Sebelum deploy production
cp app-data.db app-data.db.backup-$(date +%Y%m%d-%H%M%S)
```

**Pre-deployment Checklist**:

- [ ] Test migrations di development environment
- [ ] Backup production database
- [ ] Run migrations di staging environment
- [ ] Verify application functionality
- [ ] Deploy dengan migration:run di startup script

## Related Documentation

- [Auth Developer Guide](./AUTH_DEVELOPER_GUIDE.md) - Authentication system
- [Test Credentials](./TEST_CREDENTIALS.md) - Test user accounts
- [ERD Documentation](./erd/erd.md) - Database schema diagram

## Support

Jika menemukan issues atau ada pertanyaan:

1. Check [Troubleshooting](#troubleshooting) section
2. Review migration logs: `npm run migration:status`
3. Check database state: Buka database dengan SQLite browser
4. Create issue di GitHub repository
