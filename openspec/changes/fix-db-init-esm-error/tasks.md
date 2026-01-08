# Tasks: fix-db-init-esm-error

## Implementation Tasks

This change requires converting all migration files from ES Module syntax to CommonJS syntax to ensure compatibility with Electron's Node.js runtime in production builds.

### 1. Update TypeScript Configuration for Migrations

- [x] Modify `tsconfig.migrations.json` to output CommonJS format
- [x] Change `module` from `ES2022` to `CommonJS`
- [x] Verify `esModuleInterop` is enabled for compatibility
- [x] Test compilation: `npm run migration:compile`

**Validation**: Compiled files in `electron/migrations/` should use `module.exports` syntax

### 2. Convert Existing Migration Files to CommonJS

- [x] Update `20260106000001_initial_schema.ts` - convert export to module.exports
- [x] Update `20260106000002_seed_initial_data.ts` - convert export to module.exports
- [x] Update `20260107000001_add_transaction_tables.ts` - convert export to module.exports
- [x] Update `20260107000002_seed_transaction_reference_data.ts` - convert export to module.exports
- [x] Update `20260107000003_enhance_payment_verification.ts` - convert export to module.exports
- [x] Update `20260107073701_seed_data_dummy.ts` - convert export to module.exports
- [x] Update `20260108000001_add_payment_proof.ts` - convert export to module.exports
- [x] Update `20260108000002_enhance_payment_proof_storage.ts` - convert export to module.exports

**Pattern**:

- Before: `export async function up({ db }: MigrationContext): Promise<void> { ... }`
- After: `module.exports.up = async function({ db }: any) { ... }`

**Validation**: All files compile without errors using `npm run migration:compile` ✅

### 3. Update Migration Creation Script Template

- [x] Modify `scripts/migration-create.js` template to use CommonJS syntax
- [x] Update template to use `module.exports.up` and `module.exports.down`
- [x] Remove ES Module import syntax from template
- [x] Add JSDoc type annotations and eslint-disable comments

**Validation**: Newly created migration file should use CommonJS syntax ✅

### 4. Verify Build Process

- [x] Run full build: `npm run build`
- [x] Verify `dist-electron/migrations/*.js` files use CommonJS
- [x] Check that `scripts/copy-migrations.js` copies files correctly
- [x] Inspect output files to ensure no `export` statements remain

**Validation**: All files in `dist-electron/migrations/` should use `module.exports` ✅

### 5. Test Development Workflow

- [ ] Reset database: `npm run db:reset`
- [ ] Compile migrations: `npm run migration:compile`
- [ ] Run migrations: `npm run migration:run`
- [ ] Check migration status: `npm run migration:status`
- [ ] Verify all tables created correctly
- [ ] Verify seed data populated

**Validation**: Database initializes with all tables and seed data; no errors in console

### 6. Test Production Build

- [ ] Build installer: `npm run build`
- [ ] Test on Windows machine (primary platform)
- [ ] Delete any existing database file (fresh install scenario)
- [ ] Launch application from installer
- [ ] Verify database initializes without errors
- [ ] Verify application is fully functional
- [ ] Check console logs for any errors

**Validation**: Application launches successfully; no "Unexpected token 'export'" error; database fully initialized

### 7. Test Edge Cases

- [ ] Test with existing database (upgrade scenario)
- [ ] Test migration rollback functionality (if implemented)
- [ ] Test migration status command in production
- [ ] Verify error handling for invalid migrations still works
- [ ] Test on macOS (if available)
- [ ] Test on Linux (if available)

**Validation**: All scenarios work correctly; no regressions

### 8. Update Documentation

- [x] Update `docs/DATABASE_MIGRATION_GUIDE.md` with CommonJS syntax examples
- [ ] Update `docs/MIGRATION_QUICK_REFERENCE.md` if exists
- [x] Add note about module format in migration creation guide
- [ ] Document the fix in changelog/release notes

**Validation**: Documentation accurately reflects CommonJS migration format ✅

### 9. Cleanup and Verification

- [ ] Remove any temporary test migrations
- [x] Verify `package.json` scripts still work correctly
- [ ] Run full test suite if available
- [ ] Review all console output for warnings
- [x] Confirm no TypeScript errors: `npm run lint`

**Validation**: Clean build with no errors or warnings ✅

## Completion Checklist

Before marking this change as complete, verify:

- [x] All 8 migration files converted to CommonJS
- [x] TypeScript compilation successful
- [ ] Development migration execution works
- [ ] Production build successful
- [ ] Packaged application initializes database correctly
- [ ] No "Unexpected token" errors in production
- [x] Migration creation script updated
- [x] Documentation updated
- [ ] All manual tests passed

## Rollback Plan

If issues occur:

1. Revert migration files to ES Module syntax from git
2. Revert `tsconfig.migrations.json` changes
3. Revert `scripts/migration-create.js` template
4. Rebuild: `npm run build`

Database data is unaffected - only code syntax changes.

## Notes

- This is a **breaking change for migration file format** - all future migrations must use CommonJS
- Existing database data and migration history are **not affected**
- The change is **transparent to end users** - only affects build/development
- Migration execution logic in `migrator.ts` requires **no changes**
- This aligns migration format with main process format (both CommonJS)
