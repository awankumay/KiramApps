# Design Document: Fix Linting Issues

## Overview

Dokumen ini menjelaskan pendekatan teknis untuk memperbaiki 15 masalah linting yang terdeteksi oleh ESLint. Perbaikan ini dibagi menjadi tiga kategori utama: TypeScript type safety, React hooks optimization, dan React fast refresh compliance.

## Architecture Decisions

### 1. TypeScript Type Safety

#### Problem

Tiga lokasi menggunakan `any` type untuk hasil query database dari better-sqlite3:

- `AuditLogger.ts` line 124: `const rows = stmt.all(limit) as any[];`
- `AuditLogger.ts` line 162: `const rows = stmt.all(userId, limit) as any[];`
- `TokenStorage.ts` line 128: `const row = stmt.get() as any;`

#### Solution

Membuat type interface untuk hasil query database yang sesuai dengan struktur tabel:

**AuditLogger.ts:**

```typescript
interface AuthEventRow {
  id: number;
  eventType: string;
  userId: number | null;
  username: string | null;
  success: number;
  errorMessage: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}
```

**TokenStorage.ts:**

```typescript
interface SessionRow {
  id: number;
  userId: number;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  accessTokenEncrypted: Buffer;
  refreshTokenEncrypted: Buffer;
  tokenExpiry: string;
  isActive: number;
  createdAt: string;
  lastRefreshedAt: string | null;
}
```

#### Rationale

- Menggunakan interface memberikan type safety yang lebih baik
- Memudahkan refactoring di masa depan
- Mematuhi TypeScript best practices
- Tidak mempengaruhi runtime performance

### 2. React Hooks Dependency Optimization

#### Problem 1: Derived State in AuthContext

Variable `permissions` dan `roles` dihitung setiap render, menyebabkan useCallback dependencies berubah setiap render.

**Current Code:**

```typescript
const permissions = user?.permissions ?? [];
const roles = user?.roles ?? [];

const hasPermission = useCallback(
  (permission: string) => {
    return permissions.includes(permission);
  },
  [permissions] // Changes every render
);
```

#### Solution 1: Memoize Derived State

Wrap derived state dengan `useMemo` untuk memastikan stability:

```typescript
const permissions = useMemo(() => user?.permissions ?? [], [user?.permissions]);
const roles = useMemo(() => user?.roles ?? [], [user?.roles]);

const hasPermission = useCallback(
  (permission: string) => {
    return permissions.includes(permission);
  },
  [permissions] // Now stable
);
```

#### Rationale

- Mencegah re-render yang tidak perlu pada child components
- Meningkatkan performance
- Mematuhi React best practices
- Menghilangkan ESLint warning

#### Problem 2: Missing Dependencies in List Pages

`CustomerListPage.tsx` dan `VehicleListPage.tsx` memiliki useEffect yang memanggil fungsi async namun tidak menyertakannya dalam dependency array.

**Current Code:**

```typescript
useEffect(() => {
  loadCustomers();
}, [page, searchQuery, categoryFilter]); // Missing loadCustomers
```

#### Solution 2: Add Missing Dependencies

Tambahkan fungsi ke dependency array:

```typescript
useEffect(() => {
  loadCustomers();
}, [page, searchQuery, categoryFilter, loadCustomers]);
```

#### Rationale

- Mematuhi React Rules of Hooks
- Mencegah stale closures
- Menghilangkan ESLint warning
- Memastikan efek berjalan dengan benar saat dependencies berubah

### 3. React Fast Refresh Compliance

#### Problem

Beberapa files mengekspor non-component items (constants, hooks) yang memicu warning fast refresh.

#### Solution

Gunakan `eslint-disable-next-line` comment untuk menekan warning pada exports yang valid:

```typescript
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() { ... }

// eslint-disable-next-line react-refresh/only-export-components
export const schema = z.object({ ... });

// eslint-disable-next-line react-refresh/only-export-components
export { badgeVariants };
```

#### Rationale

- UI components dari shadcn/ui umumnya mengekspor constants untuk variant configurations
- Memindahkan constants ke file terpisah akan memperburuk developer experience
- ESLint disable adalah trade-off yang dapat diterima untuk kasus ini
- Tidak mempengaruhi runtime performance atau fungsionalitas

## Implementation Details

### File Changes Summary

#### Phase 1: TypeScript Type Safety

1. **electron/auth/AuditLogger.ts**

   - Add `AuthEventRow` interface
   - Replace `as any[]` with `as AuthEventRow[]` (line 124)
   - Replace `as any[]` with `as AuthEventRow[]` (line 162)

2. **electron/auth/TokenStorage.ts**
   - Add `SessionRow` interface
   - Replace `as any` with `as SessionRow | undefined` (line 128)

#### Phase 2: React Hooks Optimization

3. **src/Features/Auth/Contexts/AuthContext.tsx**

   - Import `useMemo` from React
   - Wrap `permissions` with `useMemo`
   - Wrap `roles` with `useMemo`

4. **src/Features/Customer/CustomerListPage.tsx**

   - Add `loadCustomers` to useEffect dependency array

5. **src/Features/Vehicle/VehicleListPage.tsx**
   - Add `loadVehicles` to useEffect dependency array

#### Phase 3: Fast Refresh Warnings

6. **src/Features/Auth/Contexts/AuthContext.tsx**

   - Add eslint-disable comment before `useAuth` export

7. **src/Features/Dashboard/Components/DataTable.tsx**

   - Add eslint-disable comment before `schema` export

8. **src/Shared/Components/UI/Badge.tsx**

   - Add eslint-disable comment before `badgeVariants` export

9. **src/Shared/Components/UI/Button.tsx**

   - Add eslint-disable comment before `buttonVariants` export

10. **src/Shared/Components/UI/Sidebar.tsx**

    - Add eslint-disable comment before non-component exports

11. **src/Shared/Components/UI/Toggle.tsx**
    - Add eslint-disable comment before `toggleVariants` export

## Testing Strategy

### Unit Testing

- Tidak diperlukan karena perubahan ini adalah code quality improvements
- Fungsi yang diperbaiki sudah tercakup dalam test yang ada (jika ada)

### Integration Testing

- Jalankan aplikasi dan verifikasi:
  - Authentication flow berfungsi normal
  - Customer list page berfungsi normal
  - Vehicle list page berfungsi normal

### Linting Validation

- Jalankan `npm run lint` dan verifikasi:
  - Exit code adalah 0
  - Tidak ada error
  - Tidak ada warning (kecuali yang sengaja di-disable)

### Type Checking

- Jalankan `npm run type-check` atau `npm run build` dan verifikasi:
  - Tidak ada TypeScript errors
  - Semua types terinfer dengan benar

## Performance Considerations

### Positive Impact

- Memoizing derived state akan mencegah re-render yang tidak perlu
- Improved type safety akan mengurangi runtime errors

### Neutral Impact

- ESLint disable comments tidak mempengaruhi runtime
- Interface definitions di-compile away di production

### Negative Impact

- Tidak ada negative impact yang signifikan

## Security Considerations

Perubahan ini tidak mempengaruhi security:

- Type safety improvements hanya memperbaiki compile-time checks
- React hooks optimizations tidak mengubah logic
- Fast refresh handling hanya untuk developer experience

## Migration Strategy

Perubahan ini bersifat backward compatible:

- Tidak ada breaking changes
- Tidak ada API changes
- Tidak ada database schema changes
- Tidak ada configuration changes

## Rollback Plan

Jika terjadi masalah setelah deployment:

1. Revert commit yang berisi perubahan ini
2. Aplikasi akan kembali ke state sebelumnya
3. Tidak ada data yang hilang atau rusak

## Future Considerations

### Potential Improvements

1. Pertimbangkan untuk memindahkan constants ke file terpisah di masa depan
2. Tambahkan unit tests untuk AuditLogger dan TokenStorage
3. Pertimbangkan untuk menggunakan type-safe database query builder

### Related Work

- Perbaikan ini mendukung upaya code quality yang lebih luas
- Dapat diikuti dengan refactoring yang lebih besar untuk fast refresh compliance
- Dapat diintegrasikan dengan CI/CD pipeline untuk automated linting checks
