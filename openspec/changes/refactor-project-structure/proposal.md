# Change: Refactor Project Structure to Feature-First PascalCase Architecture

## Why

Struktur proyek saat ini menggunakan pendekatan **layer-based** (`components/`, `pages/`, `hooks/`) yang menyulitkan skalabilitas dan pemeliharaan seiring bertambahnya fitur. Kode terkait satu fitur tersebar di banyak folder, membuat navigasi dan onboarding developer baru menjadi lebih lambat. Refactoring ke struktur **feature-first** dengan **PascalCase naming convention** akan meningkatkan readability, testability, dan maintainability jangka panjang.

## What Changes

### Struktur Baru

```
src/
├── App/                         # App-level concerns (providers, routes)
│   ├── Providers.tsx            # Context providers wrapper
│   └── Routes.tsx               # Route definitions
├── Features/                    # Feature modules (domain-driven)
│   ├── Auth/                    # Authentication feature
│   │   ├── Components/          # Presentational UI
│   │   │   └── LoginForm.tsx
│   │   ├── Hooks/               # Business logic
│   │   │   └── UseAuthLogic.ts
│   │   ├── Contexts/            # Feature-specific contexts
│   │   │   └── AuthContext.tsx
│   │   └── AuthPage.tsx         # Page orchestrator (rename dari LoginScreen)
│   └── Dashboard/               # Dashboard/MainApp feature
│       ├── Components/
│       │   ├── UserProfileHeader.tsx
│       │   └── DummyImage.tsx
│       ├── Hooks/
│       │   └── UseDummyImage.ts
│       └── DashboardPage.tsx    # Page orchestrator (rename dari MainApp)
├── Shared/                      # Cross-cutting concerns
│   ├── Components/              # Reusable UI components
│   │   └── UI/                  # shadcn-ui components
│   │       ├── AlertDialog.tsx
│   │       ├── Badge.tsx
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Field.tsx
│   │       ├── Input.tsx
│   │       ├── Label.tsx
│   │       └── Separator.tsx
│   ├── Hooks/                   # Shared logic hooks
│   ├── Lib/                     # Utilities/helpers
│   │   └── Utils.ts
│   └── Types/                   # Global TypeScript interfaces
│       └── Electron.d.ts
├── Assets/                      # Static assets
├── App.tsx                      # Root component
├── main.tsx                     # Entry point
├── index.css                    # Global styles
└── vite-env.d.ts                # Vite type definitions
```

### Daftar Perubahan

1. **BREAKING**: Reorganisasi folder dari layer-based ke feature-first
2. **BREAKING**: Rename semua file/folder ke PascalCase (kecuali entry points)
3. Pindahkan `contexts/AuthContext.tsx` → `Features/Auth/Contexts/AuthContext.tsx`
4. Pindahkan `pages/LoginScreen.tsx` → `Features/Auth/AuthPage.tsx`
5. Pindahkan `pages/MainApp.tsx` → `Features/Dashboard/DashboardPage.tsx`
6. Pindahkan `components/login-form.tsx` → `Features/Auth/Components/LoginForm.tsx`
7. Pindahkan `components/UserProfileHeader.tsx` → `Features/Dashboard/Components/UserProfileHeader.tsx`
8. Pindahkan `components/DummyImage.tsx` → `Features/Dashboard/Components/DummyImage.tsx`
9. Pindahkan `hooks/useDummyImage.tsx` → `Features/Dashboard/Hooks/UseDummyImage.ts`
10. Pindahkan `components/ui/*` → `Shared/Components/UI/*` (rename ke PascalCase)
11. Pindahkan `lib/utils.ts` → `Shared/Lib/Utils.ts`
12. Pindahkan `types/electron.d.ts` → `Shared/Types/Electron.d.ts`
13. Update semua import paths di seluruh codebase
14. Update `tsconfig.json` path aliases jika ada
15. Update `components.json` untuk shadcn-ui paths

## Impact

### Affected Specs

- `project-structure` (new capability spec)

### Affected Code

- Semua file di `/src/**/*.tsx` dan `/src/**/*.ts`
- `/tsconfig.json` (path aliases)
- `/components.json` (shadcn-ui configuration)
- `/vite.config.ts` (potential alias updates)

### Affected Documentation

- `/openspec/project.md` - Update File Organization section
- `/README.md` - Update project structure documentation

### Risk Assessment

- **Medium Risk**: Perubahan besar pada struktur folder memerlukan update import di seluruh codebase
- **Mitigasi**: Gunakan TypeScript compiler untuk validasi semua imports setelah refactoring

## Success Criteria

1. Semua file terorganisasi sesuai struktur baru
2. Semua import paths valid (no TypeScript/ESLint errors)
3. Aplikasi berjalan normal tanpa regression
4. shadcn-ui CLI tetap berfungsi dengan path baru
5. Developer baru dapat menemukan kode fitur dalam satu folder
