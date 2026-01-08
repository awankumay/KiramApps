## ADDED Requirements

### Requirement: TypeScript Type Safety

The codebase SHALL use specific TypeScript types and avoid using `any` type to ensure type safety. Using `any` type reduces TypeScript benefits and can cause runtime errors that should be caught at compile-time.

#### Scenario: Replace any type with specific types in database query results

- **GIVEN** file `electron/auth/AuditLogger.ts` dan `electron/auth/TokenStorage.ts` menggunakan `any` type untuk hasil query database
- **WHEN** developer menjalankan `npm run lint`
- **THEN** ESLint tidak melaporkan error `@typescript-eslint/no-explicit-any`
- **AND** hasil query database menggunakan type yang spesifik dan type-safe

### Requirement: React Hooks Dependency Optimization

React hooks SHALL have correct dependency arrays to prevent unnecessary re-renders and stale closures. Incomplete or unstable dependency arrays can cause hard-to-detect bugs and performance issues.

#### Scenario: Memoize derived state in AuthContext

- **GIVEN** `AuthContext.tsx` memiliki derived state `permissions` dan `roles` yang digunakan dalam multiple useCallback hooks
- **WHEN** component re-renders
- **THEN** derived state tidak dibuat ulang setiap render
- **AND** useCallback hooks memiliki dependency yang stabil
- **AND** ESLint tidak melaporkan warning `react-hooks/exhaustive-deps`

#### Scenario: Fix missing dependencies in list page components

- **GIVEN** `CustomerListPage.tsx` dan `VehicleListPage.tsx` memiliki useEffect yang memanggil `loadCustomers` atau `loadVehicles`
- **WHEN** useEffect dependency array diperiksa
- **THEN** semua dependencies yang digunakan dalam useEffect tercantum dalam dependency array
- **AND** ESLint tidak melaporkan warning `react-hooks/exhaustive-deps`

### Requirement: React Fast Refresh Compliance

Component files SHALL support React Fast Refresh to improve developer experience, however for UI components from shadcn/ui that export constants, warnings can be suppressed with eslint-disable. Fast Refresh allows developers to see changes instantly without losing component state.

#### Scenario: Handle fast refresh warnings for UI components

- **GIVEN** beberapa UI component files mengekspor non-component exports (constants, hooks)
- **WHEN** developer menjalankan `npm run lint`
- **THEN** fast refresh warnings ditangani dengan eslint-disable comment untuk files yang sesuai
- **AND** comment eslint-disable hanya digunakan untuk exports yang tidak dapat dipindahkan (seperti constants dari shadcn/ui)
- **AND** ESLint tidak melaporkan warning `react-refresh/only-export-components`

### Requirement: Linting Compliance

The codebase SHALL comply with all configured ESLint rules. Linting compliance ensures code consistency, early bug detection, and easier developer collaboration.

#### Scenario: Run npm run lint without errors

- **GIVEN** semua perbaikan linting telah diterapkan
- **WHEN** developer menjalankan `npm run lint`
- **THEN** command selesai dengan exit code 0
- **AND** tidak ada error yang dilaporkan
- **AND** tidak ada warning yang dilaporkan (kecuali yang sengaja di-disable dengan alasan yang valid)
