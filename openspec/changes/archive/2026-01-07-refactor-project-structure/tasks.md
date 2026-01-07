# Tasks: Refactor Project Structure

Implementation checklist untuk refactoring ke feature-first PascalCase architecture.

## 1. Preparation

- [x] **1.1** Commit semua perubahan pending ke Git
- [x] **1.2** Update `tsconfig.json` dengan path aliases baru (`@Features/*`, `@Shared/*`, `@App/*`)
- [x] **1.3** Update `components.json` shadcn-ui dengan paths baru
- [x] **1.4** Update `vite.config.ts` dengan resolve aliases jika diperlukan

## 2. Create New Folder Structure

- [x] **2.1** Buat folder `src/App/`
- [x] **2.2** Buat folder `src/Features/`
- [x] **2.3** Buat folder `src/Features/Auth/` dengan subfolder `Components/`, `Hooks/`, `Contexts/`
- [x] **2.4** Buat folder `src/Features/Dashboard/` dengan subfolder `Components/`, `Hooks/`
- [x] **2.5** Buat folder `src/Shared/` dengan subfolder `Components/`, `Components/UI/`, `Hooks/`, `Lib/`, `Types/`
- [x] **2.6** Rename `src/assets/` → `src/Assets/`

## 3. Migrate Shared Components (UI Library)

- [x] **3.1** Pindahkan `components/ui/alert-dialog.tsx` → `Shared/Components/UI/AlertDialog.tsx` (rename ke PascalCase)
- [x] **3.2** Pindahkan `components/ui/badge.tsx` → `Shared/Components/UI/Badge.tsx`
- [x] **3.3** Pindahkan `components/ui/button.tsx` → `Shared/Components/UI/Button.tsx`
- [x] **3.4** Pindahkan `components/ui/card.tsx` → `Shared/Components/UI/Card.tsx`
- [x] **3.5** Pindahkan `components/ui/field.tsx` → `Shared/Components/UI/Field.tsx`
- [x] **3.6** Pindahkan `components/ui/input.tsx` → `Shared/Components/UI/Input.tsx`
- [x] **3.7** Pindahkan `components/ui/label.tsx` → `Shared/Components/UI/Label.tsx`
- [x] **3.8** Pindahkan `components/ui/separator.tsx` → `Shared/Components/UI/Separator.tsx`

## 4. Migrate Shared Utilities

- [x] **4.1** Pindahkan `lib/utils.ts` → `Shared/Lib/Utils.ts`
- [x] **4.2** Pindahkan `types/electron.d.ts` → `Shared/Types/Electron.d.ts`

## 5. Migrate Auth Feature

- [x] **5.1** Pindahkan `contexts/AuthContext.tsx` → `Features/Auth/Contexts/AuthContext.tsx`
- [x] **5.2** Pindahkan `components/login-form.tsx` → `Features/Auth/Components/LoginForm.tsx` (rename ke PascalCase)
- [x] **5.3** Pindahkan `pages/LoginScreen.tsx` → `Features/Auth/AuthPage.tsx` (rename)
- [x] **5.4** Update imports di `AuthContext.tsx`
- [x] **5.5** Update imports di `LoginForm.tsx`
- [x] **5.6** Update imports di `AuthPage.tsx`

## 6. Migrate Dashboard Feature

- [x] **6.1** Pindahkan `components/UserProfileHeader.tsx` → `Features/Dashboard/Components/UserProfileHeader.tsx`
- [x] **6.2** Pindahkan `components/DummyImage.tsx` → `Features/Dashboard/Components/DummyImage.tsx`
- [x] **6.3** Pindahkan `hooks/useDummyImage.tsx` → `Features/Dashboard/Hooks/UseDummyImage.ts` (rename + change extension)
- [x] **6.4** Pindahkan `pages/MainApp.tsx` → `Features/Dashboard/DashboardPage.tsx` (rename)
- [x] **6.5** Update imports di `UserProfileHeader.tsx`
- [x] **6.6** Update imports di `DummyImage.tsx`
- [x] **6.7** Update imports di `UseDummyImage.ts`
- [x] **6.8** Update imports di `DashboardPage.tsx`

## 7. Update Root Files

- [x] **7.1** Update `App.tsx` imports untuk path baru
- [x] **7.2** Update `main.tsx` imports jika ada
- [x] **7.3** Update `App.css` imports jika ada

## 8. Cleanup

- [x] **8.1** Delete folder `src/components/` (setelah kosong)
- [x] **8.2** Delete folder `src/pages/` (setelah kosong)
- [x] **8.3** Delete folder `src/hooks/` (setelah kosong)
- [x] **8.4** Delete folder `src/contexts/` (setelah kosong)
- [x] **8.5** Delete folder `src/lib/` (setelah kosong)
- [x] **8.6** Delete folder `src/types/` (setelah kosong)

## 9. Validation

- [x] **9.1** Run `npm run build` - pastikan tidak ada TypeScript errors
- [x] **9.2** Run `npm run dev` - pastikan aplikasi berjalan normal
- [x] **9.3** Test login flow end-to-end
- [x] **9.4** Test dashboard functionality
- [x] **9.5** Test `npx shadcn@latest add toast` - pastikan shadcn CLI masih bekerja

## 10. Documentation

- [x] **10.1** Update `openspec/project.md` File Organization section
- [x] **10.2** Update `README.md` dengan struktur baru (jika ada section struktur)
- [x] **10.3** Commit semua perubahan dengan message: `refactor: reorganize to feature-first PascalCase structure`

---

## Dependencies

```
1.x → 2.x (sequential)
2.x → 3.x, 4.x, 5.x, 6.x (parallel - can be done together)
3.x, 4.x, 5.x, 6.x → 7.x (sequential)
7.x → 8.x (sequential)
8.x → 9.x (sequential)
9.x → 10.x (sequential)
```

## Validation Criteria

Setiap task dianggap selesai jika:

- File berpindah ke lokasi baru dengan nama PascalCase
- Semua internal imports di file tersebut sudah diupdate
- TypeScript tidak menunjukkan error untuk file tersebut
