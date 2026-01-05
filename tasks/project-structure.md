# OpenSpec: React.js Project Structure with PascalCase and Clean Architecture

## 1. Overview

This specification defines a standardized, maintainable, and scalable project structure for a React.js application. The structure enforces **consistent PascalCase naming** across all artifacts (files, folders, components, hooks) and separates **presentation logic** from **business logic** to align with Clean Code and object-oriented design principles. The goal is to improve code readability, testability, team onboarding speed, and long-term maintainability—especially for offline-first desktop applications (e.g., built with Electron + React).

## 2. Objectives

- Enforce **PascalCase** for all file and folder names where technically feasible.
- Decouple **UI components** from **application logic**.
- Organize code by **feature/domain**, not by technical layer.
- Support easy testing, debugging, and future feature expansion.
- Align with modern React best practices (custom hooks, composition over inheritance).

## 3. Naming Convention

| Artifact Type        | Convention | Example                 |
| -------------------- | ---------- | ----------------------- |
| Components           | PascalCase | `LoginForm.tsx`         |
| Custom Hooks         | PascalCase | `useAuthLogic.ts`       |
| Feature Folders      | PascalCase | `/features/Auth`        |
| Shared Components    | PascalCase | `UserProfileHeader.tsx` |
| Utility Functions    | PascalCase | `FormatDate.ts`         |
| Type/Interface Files | PascalCase | `User.types.ts`         |

> **Note**: Only unavoidable exceptions (e.g., `index.ts`, `main.tsx`, `.env`) are exempt.

## 4. Project Structure

```
src/
├── app/                     // App-level concerns (providers, routes)
├── features/                // Feature modules (domain-driven)
│   ├── Auth/                // PascalCase feature folder
│   │   ├── components/      // Dumb/presentational UI
│   │   ├── hooks/           // Business logic (custom hooks)
│   │   └── AuthPage.tsx     // Page orchestrator
│   ├── Dashboard/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── DashboardPage.tsx
│   └── ...                  // Other features (FuelRequest, Inventory, etc.)
├── shared/                  // Cross-cutting concerns
│   ├── components/          // Reusable UI (Button, Modal, etc.)
│   ├── hooks/               // Shared logic (useApi, useLocalStorage)
│   ├── lib/                 // Utilities/helpers
│   └── types/               // Global TypeScript interfaces
├── assets/                  // Static assets
├── App.tsx
└── main.tsx
```

## 5. Separation of Concerns

- **Components** (`*.tsx` under `components/`):  
  Purely presentational. Receive data and callbacks via props. No direct data fetching or complex state.

- **Logic** (`*.ts` under `hooks/`):  
  Encapsulated in custom React hooks. Handles state, side effects, API calls, and business rules.

- **Pages** (`*Page.tsx`):  
  Orchestrate components and hooks. Serve as entry points for routes.

This separation ensures that UI can be redesigned without touching logic, and logic can be unit-tested in isolation.

## 6. Applicability

This structure is ideal for:

- Medium to large React applications.
- Teams practicing collaborative development.
- Applications requiring long-term maintenance (e.g., enterprise desktop apps built with Electron).
- Projects emphasizing offline-first capabilities with future API sync (e.g., SQLite + Laravel backend).

## 7. Out of Scope

- Build tool configuration (Vite, Webpack, etc.).
- Styling methodology (Tailwind, CSS Modules, etc.).
- State management libraries (Redux, Zustand)—logic is handled via hooks unless global state is justified.

## 8. References

- React Documentation: [Thinking in React](https://react.dev/learn/thinking-in-react)
- Clean Code by Robert C. Martin
- Atomic Design (modified for feature-first approach)
- Electron + React best practices for offline-first apps

---

> ✅ **Status**: Ready for implementation  
> 📌 **Owner**: Development Team  
> 🗓️ **Effective Date**: Immediately
