# Design Document: fix-db-init-esm-error

## Context

The application uses a hybrid module system:

- Main Electron process: Compiled to CommonJS by Vite (`format: "cjs"`)
- Package.json declares: `"type": "module"` (treats `.js` files as ES Modules)
- Migration files: TypeScript source → JavaScript output → Dynamically loaded by Umzug at runtime

The error occurs because Umzug dynamically imports migration files that use ES Module syntax (`export`) in a Node.js context that expects CommonJS (`module.exports`).

## Problem Analysis

### Module System Flow

```
TypeScript Source (ES Modules)
    ↓ [tsc with tsconfig.migrations.json]
JavaScript Output (ES Modules)
    ↓ [scripts/copy-migrations.js]
dist-electron/migrations/*.js (ES Modules)
    ↓ [Umzug dynamic import at runtime]
❌ ERROR: Node.js in Electron expects CommonJS
```

### Key Components

1. **TypeScript Compilation** (`tsconfig.migrations.json`):

   - Currently: `"module": "ES2022"` → outputs ES Module syntax
   - Needed: `"module": "CommonJS"` → outputs CommonJS syntax

2. **Migration Files** (8 total):

   - Current syntax: `export async function up({ db }: MigrationContext)`
   - Needed syntax: `module.exports.up = async function({ db })`

3. **Build Process**:

   - Vite compiles main.ts → CommonJS (correct)
   - tsc compiles migrations/\*.ts → ES Modules (incorrect)
   - copy-migrations.js copies .js files without transformation

4. **Runtime Loading** (`electron/database/migrator.ts`):
   - Umzug uses dynamic import to load migration files
   - In production, Node.js in Electron loads from `dist-electron/migrations/`
   - Files must be valid CommonJS

## Solution Architecture

### Chosen Approach: Convert to CommonJS

**Rationale**:

1. **Simplicity**: Direct syntax conversion, no build tooling changes
2. **Consistency**: Matches main process format (CommonJS)
3. **Reliability**: CommonJS is stable and well-supported in Electron
4. **Maintainability**: Explicit format, no ambiguity
5. **No Runtime Changes**: Umzug works with both formats transparently

### Alternative Approaches Considered

#### Option A: Use ES Modules Everywhere

- Change main process to ES Modules
- Configure Electron to support ES Modules
- **Rejected**: High risk, requires extensive testing, may break other parts

#### Option B: Dynamic Transformation at Build

- Add rollup/esbuild plugin to transform migrations
- **Rejected**: Adds complexity, harder to debug, unnecessary overhead

#### Option C: Remove `"type": "module"` from package.json

- Change project-wide module default to CommonJS
- **Rejected**: Affects entire project, may break Vite/React setup

### Implementation Details

#### 1. TypeScript Configuration Change

**File**: `tsconfig.migrations.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS", // Changed from ES2022
    "moduleResolution": "node",
    "outDir": "./electron/migrations",
    "rootDir": "./electron/migrations",
    "esModuleInterop": true, // Ensure compatibility
    "allowSyntheticDefaultImports": true
  },
  "include": ["electron/migrations/**/*.ts"]
}
```

#### 2. Migration File Syntax Conversion

**Before** (ES Module):

```typescript
import type { MigrationContext } from "../database/migrator";

export async function up({ db }: MigrationContext): Promise<void> {
  db.exec(`CREATE TABLE ...`);
}

export async function down({ db }: MigrationContext): Promise<void> {
  db.exec(`DROP TABLE ...`);
}
```

**After** (CommonJS):

```typescript
import type { MigrationContext } from "../database/migrator";

module.exports.up = async function ({ db }: MigrationContext): Promise<void> {
  db.exec(`CREATE TABLE ...`);
};

module.exports.down = async function ({ db }: MigrationContext): Promise<void> {
  db.exec(`DROP TABLE ...`);
};
```

**Note**: Type imports remain unchanged - TypeScript handles this correctly

#### 3. Template Update

**File**: `scripts/migration-create.js`

Update the template string to use CommonJS syntax:

```javascript
const template = `import type { MigrationContext } from "../database/migrator";

/**
 * Migration: ${migrationName}
 * Created: ${new Date().toISOString().split("T")[0]}
 */
module.exports.up = async function({ db }: MigrationContext): Promise<void> {
  // Your migration code here
};

module.exports.down = async function({ db }: MigrationContext): Promise<void> {
  // Rollback code here
};
`;
```

#### 4. Build Verification

The existing build process requires no changes:

1. `tsc -p tsconfig.migrations.json` → Outputs CommonJS
2. `scripts/copy-migrations.js` → Copies files as-is (now CommonJS)
3. `vite build` → Bundles main process (already CommonJS)
4. `electron-builder` → Packages application

## Data Flow After Fix

```
TypeScript Source (ES Modules for imports, CommonJS for exports)
    ↓ [tsc with module: "CommonJS"]
JavaScript Output (CommonJS)
    ↓ [scripts/copy-migrations.js]
dist-electron/migrations/*.js (CommonJS)
    ↓ [Umzug dynamic import at runtime]
✅ SUCCESS: Node.js in Electron loads CommonJS correctly
```

## Impact Analysis

### What Changes

- ✅ Migration file syntax (8 files)
- ✅ TypeScript compilation target
- ✅ Migration creation template

### What Doesn't Change

- ❌ Database schema or data
- ❌ Migration execution logic
- ❌ Umzug configuration
- ❌ Main or preload process
- ❌ React application code
- ❌ Build scripts (except template)

### Compatibility

| Scenario           | Before           | After           | Status              |
| ------------------ | ---------------- | --------------- | ------------------- |
| Development        | ✅ Works         | ✅ Works        | No change           |
| Production Build   | ❌ Fails         | ✅ Works        | **Fixed**           |
| Migration Creation | ✅ ES Module     | ✅ CommonJS     | Updated template    |
| Existing Database  | ✅ Compatible    | ✅ Compatible   | No impact           |
| Future Migrations  | ES Module format | CommonJS format | **Breaking change** |

### Migration History Preservation

The `schema_migrations` table tracks migrations by filename, not content:

- Existing entries: `20260106000001_initial_schema.js`
- After fix: `20260106000001_initial_schema.js` (same filename)
- **Result**: Umzug recognizes already-applied migrations correctly

## Testing Strategy

### Unit Testing (Not Applicable)

Migration files are data migration scripts, not application logic. Testing occurs via execution.

### Integration Testing

**Test 1: Development Workflow**

```bash
npm run db:reset          # Clear database
npm run migration:compile # Compile TypeScript
npm run migration:run     # Execute migrations
npm run migration:status  # Verify status
```

**Expected**: All migrations execute successfully

**Test 2: Production Build**

```bash
npm run build            # Full build with migrations
# Install and run packaged app
```

**Expected**: Database initializes on first launch

**Test 3: Migration Creation**

```bash
npm run migration:create test_new_feature
# Inspect generated file
```

**Expected**: File uses CommonJS syntax

### Regression Testing

- Verify existing data unaffected
- Test upgrade from previous version (if applicable)
- Confirm all CRUD operations work
- Check transaction workflow end-to-end

## Rollback Strategy

**If Production Issues Occur**:

1. Revert commits for migration file changes
2. Rebuild: `npm run build`
3. Redeploy previous version

**Database Impact**: None - data and migration history preserved

**Code Rollback**:

```bash
git revert <commit-hash>  # Revert migration syntax changes
git revert <commit-hash>  # Revert tsconfig changes
npm run build             # Rebuild
```

## Performance Considerations

- **Compilation Time**: No significant impact (same TSC process)
- **Runtime Performance**: No difference (both module systems equally fast)
- **Bundle Size**: No change (migration files not bundled)

## Security Considerations

- No security implications - purely syntax change
- Migration execution permissions unchanged
- Database access patterns unchanged

## Maintenance Impact

### Developer Workflow

- New migrations must use CommonJS syntax
- Template automatically generates correct format
- No manual conversion needed for new migrations

### Documentation Updates Required

- Update DATABASE_MIGRATION_GUIDE.md
- Update migration creation instructions
- Add note in README about module format

### Future Considerations

- If project migrates to full ES Modules in future, migrations can be converted back
- Consider using a migration bundler if more complex transformations needed
- Monitor Umzug updates for improved ES Module support

## Conclusion

Converting migration files to CommonJS is the most straightforward, reliable solution that:

1. Fixes the production error immediately
2. Aligns with existing main process format
3. Requires minimal code changes
4. Has no runtime or data impact
5. Is fully reversible if needed

This approach prioritizes stability and maintainability over adopting newer but less stable ES Module patterns in the Electron context.
