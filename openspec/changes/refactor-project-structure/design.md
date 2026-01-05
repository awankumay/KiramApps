# Design: Project Structure Refactoring

## Overview

Dokumen ini menjelaskan keputusan arsitektural dan strategi migrasi untuk refactoring struktur proyek dari **layer-based** ke **feature-first** architecture dengan **PascalCase naming convention**.

## Architectural Decisions

### ADR-1: Feature-First Organization

**Context:**  
Struktur saat ini menggunakan pendekatan layer-based (`components/`, `pages/`, `hooks/`, `contexts/`) yang umum di proyek React kecil. Namun, saat fitur bertambah, developer harus melompat antar folder untuk memahami satu fitur.

**Decision:**  
Adopsi struktur **feature-first** dimana semua kode terkait satu fitur berada dalam satu folder.

**Rationale:**

- **Cohesion**: Kode yang sering berubah bersama berada bersama
- **Discoverability**: Mudah menemukan semua kode terkait fitur
- **Scalability**: Mudah menambah fitur baru tanpa polusi folder
- **Team Ownership**: Tim dapat "own" fitur tertentu

**Consequences:**

- (+) Navigasi lebih mudah
- (+) Onboarding lebih cepat
- (+) Delete fitur = delete folder
- (-) Shared logic perlu dipindah ke `Shared/`
- (-) Migrasi memerlukan update banyak imports

### ADR-2: PascalCase Naming Convention

**Context:**  
Saat ini ada inkonsistensi naming: `login-form.tsx` (kebab-case), `UserProfileHeader.tsx` (PascalCase), `useDummyImage.tsx` (camelCase).

**Decision:**  
Gunakan **PascalCase** untuk semua folder dan file, kecuali entry points yang harus mengikuti konvensi ekosistem (`main.tsx`, `index.css`, `vite-env.d.ts`).

**Rationale:**

- Konsistensi visual di seluruh codebase
- Align dengan convention React component naming
- Mudah membedakan file proyek vs library files

**Consequences:**

- (+) Konsisten dan predictable
- (+) IDE autocomplete lebih akurat
- (-) Perlu rename semua file existing
- (-) Git case-sensitivity issues di Windows

### ADR-3: Separation of Concerns

**Context:**  
Perlu clear boundary antara presentational components dan business logic.

**Decision:**  
Setiap feature folder memiliki struktur:

```
Feature/
├── Components/   # Presentational (props-driven, no side effects)
├── Hooks/        # Business logic (state, effects, API calls)
├── Contexts/     # Feature-specific context (optional)
└── FeaturePage.tsx  # Page orchestrator
```

**Rationale:**

- **Components**: Pure UI, mudah di-test dengan snapshot/visual tests
- **Hooks**: Business logic terpisah, mudah di-unit test
- **Page**: Composition layer, wiring components dengan hooks

**Consequences:**

- (+) UI dapat di-redesign tanpa mengubah logic
- (+) Logic dapat di-test tanpa UI
- (+) Clear dependency flow
- (-) Slightly more files/folders

### ADR-4: Shared Components Strategy

**Context:**  
shadcn-ui components (`button.tsx`, `card.tsx`, dll) digunakan di banyak fitur.

**Decision:**

- shadcn-ui components → `Shared/Components/UI/`
- Cross-feature utilities → `Shared/Lib/`
- Global types → `Shared/Types/`
- Shared hooks → `Shared/Hooks/`

**Rationale:**

- Mencegah duplikasi komponen reusable
- shadcn-ui CLI dapat dikonfigurasi ke path baru
- Clear boundary antara "feature code" dan "shared code"

## Migration Strategy

### Phase 1: Preparation

1. Backup codebase (Git commit)
2. Dokumentasikan semua current imports
3. Update `components.json` untuk shadcn-ui path baru
4. Update path aliases di `tsconfig.json`

### Phase 2: Create New Structure

1. Buat folder structure baru
2. Pindahkan files satu per satu
3. Rename ke PascalCase saat memindahkan
4. Jangan update imports dulu

### Phase 3: Update Imports

1. Update imports di setiap file yang dipindahkan
2. Gunakan TypeScript compiler untuk detect broken imports
3. Run `npm run build` untuk validasi

### Phase 4: Cleanup & Validation

1. Delete folder lama yang kosong
2. Run full application test
3. Update documentation

## Path Alias Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@Features/*": ["./src/Features/*"],
      "@Shared/*": ["./src/Shared/*"],
      "@App/*": ["./src/App/*"]
    }
  }
}
```

## shadcn-ui Configuration Update

```json
// components.json
{
  "aliases": {
    "components": "@/Shared/Components",
    "utils": "@/Shared/Lib/Utils",
    "ui": "@/Shared/Components/UI"
  }
}
```

## Risk Mitigation

| Risk             | Mitigation                                   |
| ---------------- | -------------------------------------------- |
| Broken imports   | TypeScript strict mode + CI build            |
| Git case issues  | Use `git mv` for renames                     |
| shadcn-ui breaks | Test `npx shadcn@latest add` after migration |
| Team confusion   | Document new structure, update AGENTS.md     |

## Trade-offs Considered

### Alternative: Keep Layer-Based

- **Pro**: No migration effort
- **Con**: Scalability issues as features grow

### Alternative: Domain-Driven Design (DDD)

- **Pro**: Even more structured
- **Con**: Overkill for current app size

### Chosen: Feature-First

- **Pro**: Balance between simplicity and scalability
- **Con**: Requires migration effort (one-time cost)
