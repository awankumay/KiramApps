# Module System Guide: Development vs Production

## Overview

This project uses **different module systems** in different contexts to ensure compatibility with both development and production Electron environments.

## Module System Configuration

### Root Package Configuration

```json
{
  "type": "module"
}
```

The root `package.json` specifies ES Module as the default, which means all `.js` files are treated as ES Modules unless overridden.

### Migration Files Module System

**Source Files** (TypeScript):

- Location: `electron/migrations/*.ts`
- Syntax: CommonJS - `module.exports.up`, `module.exports.down`
- Reason: Production Electron requires CommonJS for dynamic loading

**Compiled Files** (JavaScript):

- Location: `dist-electron/migrations/*.js`
- Compiled with: `module: "CommonJS"` (tsconfig.migrations.json)
- Override: `dist-electron/migrations/package.json` with `{"type": "commonjs"}`
- Reason: Node.js needs explicit CommonJS type to avoid treating files as ES Modules

### Migration Scripts

- Files: `scripts/migration-run.cjs`, `scripts/migration-status.cjs`
- Extension: `.cjs` (CommonJS)
- Syntax: `const x = require('...')`
- Reason: Must use `require()` to load CommonJS migration files

## Why CommonJS for Migrations?

### Problem with ES Modules in Production

When we initially tried ES Module syntax (`export async function`):

```typescript
// ❌ This worked in development but FAILED in production
export async function up({ db }: any) { ... }
export async function down({ db }: any) { ... }
```

**Error in Production Build:**

```
Unexpected token 'export'
```

### Root Cause

1. **Development**: Dynamic `import()` works with Node.js runtime
2. **Production**: Packaged Electron apps using webpack/esbuild cannot resolve ES Module dynamic imports correctly
3. **Solution**: Use CommonJS `module.exports` + `require()` which works in both environments

### Correct Pattern (CommonJS)

```typescript
// ✅ This works in BOTH development and production
/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.up = async function ({ db }: any) {
  // migration code
};

/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.down = async function ({ db }: any) {
  // rollback code
};
```

## Development Workflow

### Running Migrations

```bash
npm run db:fresh          # Reset + compile + run all migrations
npm run migration:run     # Run pending migrations only
npm run migration:status  # Check migration status
```

### Creating New Migrations

```bash
npm run migration:create my_migration_name
```

This generates a migration file with CommonJS template:

- Location: `electron/migrations/[timestamp]_my_migration_name.ts`
- Template: Pre-configured with `module.exports` pattern

### Compilation

```bash
npm run migration:compile  # Compiles TS migrations to dist-electron
```

The compilation process:

1. Compiles `.ts` files to `.js` with CommonJS module format
2. Outputs to `dist-electron/migrations/`
3. `copy-migrations.js` verifies files and creates `package.json` with `"type": "commonjs"`

## Production Build

### Build Process

```bash
npm run build
```

Build steps:

1. `tsc` - Compile main TypeScript code
2. `tsc -p tsconfig.migrations.json` - Compile migrations with CommonJS
3. `node scripts/copy-migrations.js` - Verify migrations and create package.json
4. `vite build` - Build Vite frontend
5. `electron-builder` - Package Electron app

### Package Structure

```
release/
└── [version]/
    └── win-unpacked/
        └── resources/
            └── app.asar.unpacked/
                └── dist-electron/
                    └── migrations/
                        ├── package.json         {"type": "commonjs"}
                        ├── 20260106000001_....js
                        ├── 20260106000002_....js
                        └── ...
```

### Migration Loading in Production

The `electron/database/migrator.ts` uses `require()` to load migrations:

```typescript
const migration = require(migrationPath);
```

This works because:

1. Migration files are compiled with `module.exports`
2. `package.json` in migrations folder specifies `"type": "commonjs"`
3. Node.js correctly interprets files as CommonJS despite root package.json `"type": "module"`

## Common Issues & Solutions

### Issue: "module is not defined"

**Cause**: Migration .js files treated as ES Modules but contain `module.exports`

**Solution**: Ensure `dist-electron/migrations/package.json` exists with `{"type": "commonjs"}`

### Issue: "Unexpected token 'export'"

**Cause**: ES Module syntax in packaged Electron app

**Solution**: Use CommonJS (`module.exports`) pattern in migration source files

### Issue: ESLint warning "Require statement not part of import statement"

**Cause**: .cjs files using `require()` triggers TypeScript ESLint rule

**Solution**: Add `/* eslint-disable @typescript-eslint/no-var-requires */` at top of .cjs files

## References

- [Archived Change: fix-db-init-esm-error](../openspec/changes/archive/2026-01-08-fix-db-init-esm-error/)
- [Database Migration Guide](./DATABASE_MIGRATION_GUIDE.md)
- [TypeScript Handbook: Modules](https://www.typescriptlang.org/docs/handbook/modules.html)
- [Node.js: ECMAScript Modules](https://nodejs.org/api/esm.html)
- [Node.js: CommonJS](https://nodejs.org/api/modules.html)
