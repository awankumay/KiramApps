# Change Proposal: fix-db-init-esm-error

## Summary

Fix "Unexpected token 'export'" error that occurs during database initialization in packaged Electron applications by ensuring migration files use CommonJS syntax compatible with Node.js runtime in production builds.

## Why

This change is necessary because the current implementation causes a **critical production failure** that completely blocks users from using the packaged application. The module system mismatch between ES Modules (migration files) and CommonJS (Electron main process) results in runtime errors when Umzug attempts to dynamically load migration files during database initialization.

**User Impact**: End users cannot launch the application after installation - they encounter an error immediately on first launch, making the application completely unusable in production environments.

**Technical Necessity**: The main Electron process is compiled to CommonJS for compatibility, but migration files remain in ES Module format after compilation. Node.js in the Electron runtime cannot execute these mixed module formats, causing the syntax error.

**Business Impact**: This blocks any production release or distribution of the application. Without fixing this, the application cannot be deployed to end users, defeating the purpose of the offline-first desktop application architecture.

## What Changes

This change converts all database migration files from ES Module syntax to CommonJS syntax to ensure compatibility with Electron's Node.js runtime.

**Files Modified**:

- `electron/migrations/*.ts` (8 migration files) - Convert from `export` to `module.exports`
- `tsconfig.migrations.json` - Change module target from ES2022 to CommonJS
- `scripts/migration-create.js` - Update template to generate CommonJS syntax
- `openspec/specs/database-migration-system/spec.md` - Add production compatibility requirements

**Configuration Changes**:

- TypeScript compiler module output: `ES2022` → `CommonJS`
- Migration file syntax: `export async function` → `module.exports.up`

**Build Process**:

- No changes to build scripts - existing copy process continues to work
- Output format changes: ES Module `.js` files → CommonJS `.js` files

**Not Changed**:

- Database schema or data structure
- Migration execution logic in `migrator.ts`
- Umzug configuration or storage adapter
- Application features or behavior
- Main or preload process code

## Problem Statement

### Current Behavior

When users install and run the packaged Electron application (Windows .exe), the following error occurs on first launch:

```
Database Initialization Error
Failed to initialize database: Unexpected token 'export'
```

This error completely blocks the application from starting, preventing access to all features since the database cannot initialize.

### Root Cause Analysis

After reviewing the codebase, the issue stems from a module system mismatch:

1. **Package Configuration**: `package.json` has `"type": "module"` which makes Node.js treat `.js` files as ES Modules by default
2. **Migration Files**: The compiled migration files in `dist-electron/migrations/*.js` use ES Module syntax (`export async function`)
3. **Electron Runtime**: When Electron's Node.js runtime loads these migration files via Umzug in production, it encounters ES Module syntax in a context expecting CommonJS
4. **Build Process**: While Vite compiles the main process to CommonJS (`format: "cjs"` in vite.config.ts), the migration files are copied as-is without transformation

### Evidence

- Source TypeScript migrations in `electron/migrations/` use ES Module syntax
- Compiled migrations in `dist-electron/migrations/` retain `export` statements
- `scripts/copy-migrations.js` copies files without transformation
- Main process uses CommonJS format per Vite config: `output: { format: "cjs" }`
- Umzug dynamically imports these files at runtime in production

### Impact

- **Critical**: Application unusable in production (packaged installer)
- **User Experience**: Complete failure on first launch
- **Scope**: Affects all new installations and fresh database setups
- **Workaround**: None available for end users

## Proposed Solution

Convert all migration files to use CommonJS syntax compatible with the Node.js runtime in Electron, ensuring consistent module format across the build output.

### Implementation Approach

**Option 1: Convert migrations to CommonJS (Recommended)**

- Change all migration files from `export async function` to `module.exports.up/down`
- Update migration file template in `scripts/migration-create.js`
- Update `tsconfig.migrations.json` to target CommonJS output
- No runtime changes needed - transparent to Umzug

**Option 2: Configure build to transform ESM to CJS**

- Add Vite/rollup transformation step for migration files
- Requires additional build configuration complexity
- May introduce build-time errors

**Recommendation**: Option 1 is simpler, more maintainable, and aligns with the main process CommonJS format.

### Scope

This change modifies:

- All existing migration files in `electron/migrations/` (8 files)
- Migration creation script template
- TypeScript compilation configuration for migrations
- Build verification process

This change does NOT modify:

- Database schema or data
- Umzug configuration or storage adapter
- Migration execution logic
- Main or preload process code

## Benefits

1. **Fixes Production Build**: Eliminates the blocking error in packaged applications
2. **Consistency**: Aligns migration module format with main process format (both CommonJS)
3. **Reliability**: Ensures migrations work identically in development and production
4. **Maintainability**: Explicit CommonJS syntax is clearer for Electron context
5. **No Breaking Changes**: Migration execution behavior remains identical

## Risks & Mitigations

| Risk                          | Mitigation                                                                |
| ----------------------------- | ------------------------------------------------------------------------- |
| Migration re-execution        | Schema_migrations table tracks applied migrations by filename (unchanged) |
| Development workflow changes  | Update migration creation script to use new template                      |
| TypeScript compilation errors | Test with `npm run migration:compile` before build                        |
| Platform-specific issues      | Test on Windows/macOS/Linux with packaged builds                          |

## Testing Strategy

### Development Testing

1. Run `npm run db:reset` to clear database
2. Run `npm run migration:compile` to verify TypeScript compilation
3. Run `npm run migration:run` to test migration execution
4. Verify all tables created correctly
5. Check migration history in `schema_migrations` table

### Production Testing

1. Build application: `npm run build`
2. Install on clean Windows machine
3. Launch application and verify database initializes
4. Check all tables exist and seed data populated
5. Test full transaction workflow

### Regression Testing

- Verify existing data unaffected (if upgrading)
- Test migration status commands still work
- Confirm development workflow unchanged after template update

## Success Criteria

- [ ] All migration files use CommonJS syntax (`module.exports`)
- [ ] TypeScript compiles migrations without errors
- [ ] Build process completes successfully
- [ ] Packaged application initializes database on first launch without errors
- [ ] All migrations execute in correct order
- [ ] Migration history correctly tracked
- [ ] Development migration creation workflow updated
- [ ] No errors in console during database initialization
- [ ] Application usable immediately after installation

## Dependencies

- Requires testing with actual packaged builds (electron-builder)
- No external dependency updates needed
- No API or schema changes

## Timeline Estimate

- Analysis & file conversion: **1 hour**
- Script template updates: **30 minutes**
- Testing (dev + prod builds): **1 hour**
- Documentation updates: **30 minutes**
- **Total**: ~3 hours

## Related Changes

- Part of ongoing database migration system improvements
- Complements existing `database-migration-system` spec
- No conflicts with active changes (verified via `openspec list`)

## References

- [tasks/error-inisialisasi-database.md](../../../../tasks/error-inisialisasi-database.md) - Original problem analysis
- [electron/database/migrator.ts](../../../../electron/database/migrator.ts) - Migration execution logic
- [scripts/copy-migrations.js](../../../../scripts/copy-migrations.js) - Build-time migration copying
- [openspec/specs/database-migration-system/spec.md](../../specs/database-migration-system/spec.md) - Current specification
- Umzug v3 Documentation: https://github.com/sequelize/umzug
- Electron Node.js Integration: https://www.electronjs.org/docs/latest/tutorial/esm
