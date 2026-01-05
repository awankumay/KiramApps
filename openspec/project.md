# Project Context

## Purpose

**Aplikasi Surat Masuk Digital** - Offline-first desktop application for tracking incoming units (trucks) at field locations with unstable internet connectivity.

**Primary Goals:**

- Enable 100% offline data entry and management for field operators
- Provide simple, intuitive desktop UI for recording truck arrivals
- Ensure reliable local data storage without internet dependency
- Allow seamless application updates without technical intervention

**Target Users:** Field operators at remote locations with unreliable internet access

## Tech Stack

- **Runtime:** Electron.js v30+ (cross-platform desktop app framework)
- **UI Framework:** React 18.2+ with TypeScript
- **Build Tool:** Vite 5+ (fast development and bundling)
- **Language:** TypeScript 5.2+
- **Local Database:** SQLite (via better-sqlite3) - to be added
- **Auto-Updater:** electron-updater + electron-builder
- **Styling:** Tailwind CSS 4+ with shadcn-ui component library
- **Component Library:** shadcn-ui (accessible, customizable React components)
- **MCP Integration:** Model Context Protocol Server for AI tooling
- **Packaging:** electron-builder (Windows .exe installer)

## Project Conventions

### Code Style

- **Language:** TypeScript with strict type checking enabled
- **Formatting:** ESLint configuration (see `.eslintrc` or inline config)
- **Naming Conventions:**
  - React Components: PascalCase (e.g., `SuratMasukForm.tsx`)
  - Functions/Variables: camelCase (e.g., `handleSubmit`, `truckData`)
  - Files: PascalCase for all files (consistent naming convention)
  - Database tables: snake_case (e.g., `surat_masuk`)
- **File Organization (Feature-First Architecture):**
  - `/electron` - Main and preload process code
  - `/src` - React application code
  - `/src/App` - Application root and configuration
  - `/src/Features` - Feature-based modules (Auth, Dashboard, etc.)
    - `/src/Features/Auth` - Authentication feature
      - `/Components` - Auth-specific components (LoginForm, etc.)
      - `/Hooks` - Auth-specific custom hooks
      - `/Contexts` - Auth context providers
    - `/src/Features/Dashboard` - Dashboard feature
      - `/Components` - Dashboard-specific components
      - `/Hooks` - Dashboard-specific custom hooks
  - `/src/Shared` - Shared code across features
    - `/Components` - Shared non-UI components
    - `/Components/UI` - shadcn-ui components (Button, Card, etc.)
    - `/Hooks` - Shared custom hooks (UseMobile, etc.)
    - `/Lib` - Utility functions and helpers (Utils.ts)
    - `/Types` - Shared TypeScript type definitions
  - `/src/Assets` - Static assets (images, fonts, etc.)
  - `/public` - Public static files
  - `/dist-electron` - Built electron files
- **Path Aliases:**
  - `@Features/*` - Import from Features directory
  - `@Shared/*` - Import from Shared directory
  - `@App/*` - Import from App directory
  - `@/*` - Import from src root

### UI/Design Conventions

- **Component System:** shadcn-ui components (copy-paste approach, fully customizable)
- **Styling Approach:** Tailwind CSS utility classes
- **Design Tokens:** CSS variables for theming (configured via shadcn-ui)
- **Accessibility:** Follow WCAG guidelines, use semantic HTML
- **Component Composition:** Prefer composition over prop drilling
- **Form Handling:** Use controlled components with proper validation
- **Responsive Design:** Desktop-first (Windows 10/11 screen sizes)

### Architecture Patterns

- **Offline-First Design:** All functionality must work without internet
- **Electron IPC:** Communication between main and renderer process via contextBridge
- **Data Layer:** SQLite for local persistence (to be implemented)
- **Component Structure:** Functional components with React hooks
- **State Management:** React state/context (keep simple initially)
- **Separation of Concerns:**
  - Main process: SQLite operations, window management, auto-updates
  - Renderer process: UI/UX, form validation, display logic
  - Preload: Secure IPC bridge between main and renderer

### Testing Strategy

- **Phase 1 (Current):** Manual testing on Windows 10/11 machines
- **Future:** Unit tests for business logic, E2E tests for critical flows
- **Offline Testing:** Verify all features work with network disabled
- **Update Testing:** Test auto-update mechanism on clean installations

### Git Workflow

- **Main Branch:** `main` - production-ready code
- **Feature Branches:** `feature/[name]` - new functionality
- **Commit Convention:** Clear, descriptive messages in Indonesian or English
- **Example:** "feat: add offline CRUD for surat masuk" or "fix: validasi input sopir"

## Domain Context

**Business Domain:** Logistics & Field Operations

**Key Concepts:**

- **Surat Masuk:** Record of incoming truck/unit arrival at field location
- **Unit/Truck:** Vehicle being tracked (identifier, destination, material type)
- **Sopir (Driver):** Person ordering/driving the truck
- **Pengawas (Checker):** Supervisor verifying the entry
- **Material:** Type and quantity of goods being transported
- **Waktu Masuk/Keluar:** Entry and exit timestamps

**Data Fields Required:**

1. Truck ID/Number
2. Tujuan (Destination)
3. Jenis Material (Material Type)
4. Jumlah (Quantity)
5. Keterangan (Notes/Description)
6. Sopir/Order (Driver name)
7. Pengawas/Checker (Supervisor name)
8. Tanggal & Waktu Masuk (Entry date/time)
9. Tanggal & Waktu Keluar (Exit date/time)

**Operational Context:**

- Used in remote field locations with poor/no internet
- Operators need simple, fast data entry
- Data integrity is critical for operational reporting
- System must survive power outages and device restarts

## Important Constraints

### Technical Constraints

- **Platform:** Windows 10/11 only (initial release)
- **Offline-First:** 100% functionality without internet required
- **Size:** Application bundle should be ≤ 50 MB
- **Self-Contained:** No external dependencies (Node.js, Python, etc.)
- **Data Storage:** Local only - stored in Windows `AppData\Roaming` directory
- **Update Method:** User-initiated only (not silent updates)

### Business Constraints

- **No Backend Integration (Phase 1):** Laravel API sync is out of scope initially
- **Single User:** Multi-user/role management postponed to future phase
- **No CCTV Integration:** Deferred to next phase

### Regulatory/Security Constraints

- Data remains on local machine (GDPR/privacy compliant)
- Optional: Code signing for installer (can be added later)
- Update signature verification (optional enhancement)

## External Dependencies

### Current External Dependencies

- **None required for core functionality** (100% offline operation)

### Future/Optional Dependencies

- **Update Server:** GitHub Releases, AWS S3, or internal server for distributing updates
  - Endpoint example: `https://updates.yourapp.com/latest.yml`
- **Sync Backend (Future):** Laravel API for data synchronization when online
  - Not in current scope

### Development Dependencies

- Node.js 18+ (development only, not required on target machines)
- npm/pnpm for package management
- Windows SDK for building native modules (if needed for better-sqlite3)
- **MCP Server:** Model Context Protocol for AI-assisted development
  - Enables AI tools to access shadcn-ui registry and component information
  - Configured via `.vscode/settings.json` or MCP config

### Runtime Dependencies (Bundled)

- Electron runtime (bundled in .exe)
- React runtime (bundled)
- Tailwind CSS (bundled)
- shadcn-ui components (bundled as source code)
- SQLite database engine (to be bundled via better-sqlite3)
