# Project Context

## Purpose

**Aplikasi Surat Masuk Digital (KiramApps)** - Offline-first desktop application for tracking incoming units (trucks) at field locations with unstable internet connectivity. The system handles the complete transaction lifecycle from gate entry, checker validation, loader operations, to gate checkout.

**Primary Goals:**

- Enable 100% offline data entry and management for field operators
- Provide simple, intuitive desktop UI for recording truck arrivals and departures
- Ensure reliable local data storage without internet dependency
- Allow seamless application updates without technical intervention
- Support complete transaction workflow: Gate In → Checker → Loader → Gate Out
- Handle payment processing and invoice generation offline

**Target Users:** Field operators at remote locations with unreliable internet access, including:

- Gate operators (check-in/check-out)
- Checkers (order validation & payment) - `CHECKER` role
- Loader operators (material loading) - `LOADER` role
- Supervisors/Superadmin - `SUPERADMIN` role

## Tech Stack

- **Runtime:** Electron.js v30.0.1 (cross-platform desktop app framework)
- **UI Framework:** React 18.2.0 with TypeScript
- **Build Tool:** Vite 5.1.6 (fast development and bundling)
- **Language:** TypeScript 5.2.2
- **Routing:** React Router DOM v7.11.0 (client-side routing)
- **Local Database:** SQLite (via better-sqlite3 v12.5.0) - integrated
- **Migration System:** Umzug v3.8.2 (database migrations)
- **Auto-Updater:** electron-updater + electron-builder v24.13.3
- **Styling:** Tailwind CSS v4.1.18 with shadcn-ui (new-york style)
- **Component Library:** shadcn-ui (accessible, customizable React components)
- **Icons:** Lucide React v0.562.0 (primary), Tabler Icons React v3.36.1 (secondary)
- **Data Tables:** TanStack React Table v8.21.3
- **Charts:** Recharts v2.15.4
- **Drag & Drop:** dnd-kit (core v6.3.1, sortable v10.0.0, modifiers, utilities)
- **Form Validation:** Zod v4.3.4
- **Notifications:** Sonner v2.0.7
- **Theming:** next-themes v0.4.6
- **Animation:** tw-animate-css v1.4.0
- **MCP Integration:** Model Context Protocol Server for AI tooling
- **Packaging:** electron-builder (Windows .exe installer)

## Project Conventions

### Code Style

- **Language:** TypeScript with strict type checking enabled
- **Formatting:** ESLint configuration (see `.eslintrc` or inline config)
- **Naming Conventions:**
  - React Components: PascalCase (e.g., `SuratMasukForm.tsx`)
  - Functions/Variables: camelCase (e.g., `handleSubmit`, `truckData`)
  - Custom Hooks: PascalCase with `Use` prefix (e.g., `UseMobile.ts`, `UseAuthLogic.ts`)
  - Files: PascalCase for all files (consistent naming convention)
  - Database tables: snake_case (e.g., `surat_masuk`, `transaction_items`)
  - Constants: SCREAMING_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)
- **File Organization (Feature-First Architecture):**
  - `/electron` - Main and preload process code
    - `/auth` - Authentication & authorization modules (AuthManager, RBACManager, TokenStorage, etc.)
    - `/database` - Database initialization and migration system
    - `/migrations` - TypeScript migration files
  - `/src` - React application code
  - `/src/App` - Application root and configuration
  - `/src/Features` - Feature-based modules
    - `/src/Features/Auth` - Authentication feature
      - `/Components` - Auth-specific components (LoginForm, ProtectedRoute, etc.)
      - `/Hooks` - Auth-specific custom hooks
      - `/Contexts` - Auth context providers (AuthContext)
      - `/Routes` - Route configuration with RBAC
    - `/src/Features/Dashboard` - Dashboard feature
    - `/src/Features/Superadmin` - Admin features (Users, Roles, Items, Reports)
    - `/src/Features/Checker` - Checker role features (Transactions, Payments)
    - `/src/Features/Loader` - Loader role features (Queue management)
    - `/src/Features/Customer` - Customer management (CRUD)
    - `/src/Features/Vehicle` - Vehicle management (CRUD)
  - `/src/Shared` - Shared code across features
    - `/Components` - Shared components (AppNavigation, AppSidebarRBAC)
    - `/Components/UI` - shadcn-ui components (26+ components)
    - `/Hooks` - Shared custom hooks (UseMobile, etc.)
    - `/Lib` - Utility functions and helpers (Utils.ts)
    - `/Types` - Shared TypeScript type definitions (Electron.d.ts, RBAC.ts)
  - `/src/Assets` - Static assets (images, fonts, etc.)
  - `/public` - Public static files
  - `/dist-electron` - Built electron files
  - `/docs` - Documentation files
    - `/erd` - Entity Relationship Diagrams
  - `/openspec` - Project specifications and change proposals
    - `/changes` - Active change proposals
    - `/specs` - Stable specifications
  - `/scripts` - CLI scripts (migration, db-reset, hash-password)
  - `/tasks` - Task documentation and proposals
- **Path Aliases:**
  - `@Features/*` - Import from Features directory
  - `@Shared/*` - Import from Shared directory
  - `@App/*` - Import from App directory
  - `@/*` - Import from src root

### UI/Design Conventions

- **Component System:** shadcn-ui components (new-york style, copy-paste approach)
- **Styling Approach:** Tailwind CSS v4 utility classes with tw-animate-css
- **Design Tokens:** CSS variables for theming (neutral base color, CSS variables enabled)
- **Accessibility:** Follow WCAG guidelines, use semantic HTML, Radix UI primitives
- **Component Composition:** Prefer composition over prop drilling
- **Form Handling:** Use controlled components with Zod validation
- **Responsive Design:** Desktop-first (Windows 10/11 screen sizes)
- **Toast Notifications:** Sonner for feedback messages
- **Data Display:** TanStack React Table for complex data tables
- **Charts/Visualization:** Recharts for data visualization
- **Drag & Drop:** dnd-kit for sortable/draggable interfaces
- **Dialogs/Modals:** Radix UI Dialog, Alert Dialog, and Vaul (drawer)
- **Icons:** Lucide React (primary), Tabler Icons (secondary)
- **shadcn-ui Components Available:** AlertDialog, Avatar, Badge, Breadcrumb, Button, Card, Chart, Checkbox, Dialog, Drawer, DropdownMenu, Field, Input, Label, Select, Separator, Sheet, Sidebar, Skeleton, Sonner, Table, Tabs, Textarea, Toggle, ToggleGroup, Tooltip

### Architecture Patterns

- **Offline-First Design:** All functionality must work without internet
- **Electron IPC:** Communication between main and renderer process via contextBridge
- **Data Layer:** SQLite for local persistence (implemented via better-sqlite3)
- **Component Structure:** Functional components with React hooks
- **State Management:** React state/context (keep simple initially)
- **Separation of Concerns:**
  - Main process: SQLite operations, window management, auto-updates, authentication, RBAC
  - Renderer process: UI/UX, form validation, display logic
  - Preload: Secure IPC bridge between main and renderer
- **Role-Based Access Control (RBAC):**
  - Roles: SUPERADMIN, CHECKER, LOADER
  - Permission-based route protection via ProtectedRoute component
  - Role-based sidebar navigation via AppSidebarRBAC
  - Permissions defined in RBAC.ts with ROLE_PERMISSIONS mapping
- **Authentication Flow:**
  - DummyJSON API for development/testing (https://dummyjson.com/docs/auth)
  - JWT Bearer Token authentication with encrypted storage
  - Local user authentication with SHA-256 password hashing
  - Automatic token refresh on expiry
  - 24-hour offline grace period for cached sessions
- **Database Migration System:**
  - Umzug-based migration runner
  - TypeScript migrations in `/electron/migrations`
  - CLI scripts: `npm run migration:create`, `npm run migration:run`, `npm run migration:status`
  - Atomic up/down migrations with transaction support
- **Sync Architecture (Future):**
  - SYNC_QUEUE for pending operations
  - SYNC_LOGS for audit trail
  - ID_MAPPINGS for local-to-ERP ID resolution
  - Support for PUSH/PULL operations

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

**Business Domain:** Logistics & Field Operations (Material Loading/Unloading Facility)

**Key Concepts:**

- **Surat Masuk/Ticket:** Record of incoming truck/unit arrival at field location
- **Unit/Truck (Vehicle):** Vehicle being tracked (plate number, customer association)
- **Customer:** Entity (PERSONAL or COMPANY) owning vehicles and making transactions
- **Sopir (Driver):** Person operating/driving the truck
- **Pengawas/Checker:** Supervisor verifying entry and processing orders/payments
- **Material (Item):** Type and quantity of goods being loaded/unloaded
- **Loader:** Equipment/machine used for loading materials
- **Operator:** Person operating the loader equipment
- **Transaction:** Complete order from entry to checkout
- **Gate Log:** Record of gate scans (QR, LPR, RFID)

**Transaction Workflow:**

1. **CREATED** - Driver checks in at Gate In, ticket generated with QR code
2. **QUEUED** - Driver shows QR to Checker for validation
3. **LOADING** - Material loading in progress by Loader operator
4. **DONE** - Loading complete, ready for checkout
5. **CHECKED_OUT** - Driver exits through Gate Out

**Payment Status:** UNPAID → PAID
**Loader Assignment Status:** WAITING → ON_PROGRESS → DONE

**Data Fields Required:**

1. Invoice Number (auto-generated)
2. Transaction Type
3. Customer Information
4. Vehicle/Plate Number
5. Items with Quantity & Price
6. Payment Method & Amount
7. Loader Assignment
8. Gate Entry/Exit Timestamps
9. Status Logs with Notes
10. Sopir/Order (Driver name)
11. Pengawas/Checker (Supervisor name)

**Scan Methods:** QR Code, LPR (License Plate Recognition), RFID

**Operational Context:**

- Used in remote field locations with poor/no internet
- Operators need simple, fast data entry
- Data integrity is critical for operational reporting
- System must survive power outages and device restarts
- CCTV capture at gates (future integration)
- Fraud detection and flagging capabilities

## Important Constraints

### Technical Constraints

- **Platform:** Windows 10/11 only (initial release)
- **Offline-First:** 100% functionality without internet required
- **Size:** Application bundle should be ≤ 50 MB
- **Self-Contained:** No external dependencies (Node.js, Python, etc.)
- **Data Storage:** Local only - stored in Windows `AppData\Roaming` directory
- **Update Method:** User-initiated only (opt-in, not silent updates)
- **Database:** SQLite via better-sqlite3 (bundled, no external installation)

### Business Constraints

- **No Backend Integration (Phase 1):** Laravel API sync is out of scope initially
- **Authentication:** DummyJSON API for development, local auth for production
- **No CCTV Integration:** Deferred to next phase

### Regulatory/Security Constraints

- Data remains on local machine (GDPR/privacy compliant)
- JWT tokens stored securely in local storage
- Optional: Code signing for installer (can be added later)
- Update signature verification (optional enhancement)

## External Dependencies

### Current External Dependencies

- **DummyJSON API (Development):** https://dummyjson.com/docs/auth
  - `/auth/login` - POST - User authentication
  - `/auth/me` - GET - Get current user (Bearer Token)
  - `/auth/refresh` - POST - Refresh access token
  - `/users` - GET - List users (optional)
- **Local Authentication:** SHA-256 hashed passwords for offline user management

### Future/Optional Dependencies

- **Update Server:** GitHub Releases, AWS S3, or internal server for distributing updates
  - Endpoint example: `https://updates.yourapp.com/latest.yml`
- **Sync Backend (Future):** Laravel API for data synchronization when online
  - Entity sync: Transactions, Users, Customers, Vehicles
  - Bi-directional sync: LOCAL_TO_ERP, ERP_TO_LOCAL

### Development Dependencies

- Node.js 18+ (development only, not required on target machines)
- npm/pnpm for package management
- Windows SDK for building native modules (better-sqlite3)
- **MCP Server:** Model Context Protocol for AI-assisted development
  - Enables AI tools to access shadcn-ui registry and component information
  - Configured via `.vscode/settings.json` or MCP config

### Runtime Dependencies (Bundled)

- Electron runtime v30.0.1 (bundled in .exe)
- React runtime v18.2.0 (bundled)
- Tailwind CSS v4.1.18 (bundled)
- shadcn-ui components (bundled as source code)
- SQLite database engine (bundled via better-sqlite3 v12.5.0)
- Radix UI primitives (bundled)
- Lucide/Tabler icons (bundled)

## Database Schema

The application uses SQLite with the following entity groups:

### Authentication & Sessions

- `auth_sessions` - Active login sessions with encrypted tokens
- `auth_events` - Audit log for authentication events

### User & Access Control

- `users` - System users with local password hash
- `roles` - User roles (SUPERADMIN, CHECKER, LOADER)
- `permissions` - Permission codes
- `role_permissions` - Role-permission assignments
- `user_roles` - User-role assignments

### Customer & Vehicle

- `customers` - Customer records (PERSONAL/COMPANY)
- `vehicles` - Vehicle/truck records with plate numbers

### Item & Pricing

- `items` - Material/product items with price
- `item_price_history` - Price change audit trail

### Transaction Core (Planned)

- `transactions` - Main transaction records
- `transaction_items` - Line items with qty/price/subtotal
- `transaction_types` - Transaction categorization
- `payments` - Payment records
- `payment_methods` - Available payment methods

### Loader Operations (Planned)

- `loaders` - Loader equipment
- `loader_assignments` - Assignment of loaders to transactions

### Gate & Audit (Planned)

- `gate_logs` - Gate scan records (IN/OUT)
- `transaction_status_logs` - Status change history
- `fraud_flags` - Fraud detection records

### Offline Sync Layer (Planned)

- `devices` - Registered devices (GATE/CHECKER/LOADER)
- `sync_jobs` - Sync job tracking (PUSH/PULL)
- `sync_queue` - Pending sync operations
- `sync_logs` - Sync audit trail
- `id_mappings` - Local-to-ERP ID mappings

See [docs/erd/erd.md](../docs/erd/erd.md) for complete ERD diagram.

## Available NPM Scripts

### Development

- `npm run dev` - Start Vite dev server with Electron
- `npm run build` - Build TypeScript, Vite, and Electron package
- `npm run lint` - Run ESLint
- `npm run preview` - Preview built application

### Database Management

- `npm run db:reset` - Reset database (delete and recreate)
- `npm run db:fresh` - Fresh database with migrations
- `npm run db:migrate` - Run pending migrations

### Migration Commands

- `npm run migration:create` - Create new migration file
- `npm run migration:status` - Check migration status
- `npm run migration:run` - Run pending migrations
- `npm run migration:compile` - Compile TypeScript migrations

### Native Module Rebuilding

- `npm run rebuild` - Rebuild better-sqlite3 for Electron
- `npm run rebuild:node` - Rebuild better-sqlite3 for Node.js

## Implemented Features

Based on completed change proposals in `/openspec/changes`:

### ✅ Authentication (`add-dummyjson-authentication`)

- DummyJSON API integration for development login
- Local user authentication with encrypted password storage
- JWT token management with automatic refresh
- 24-hour offline grace period
- Auth session persistence in SQLite
- Audit logging for all auth events

### ✅ User Management & RBAC (`add-user-management-rbac`)

- Role-based access control: SUPERADMIN, CHECKER, LOADER
- Permission-based route protection
- Role-based sidebar navigation
- User CRUD operations (Superadmin only)
- Role assignment management
- Protected routes with UnauthorizedPage fallback

### ✅ Customer Management (`add-customer-vehicle-crud`)

- Customer CRUD with PERSONAL/COMPANY categories
- Customer list with search and filter
- Customer form with Zod validation

### ✅ Vehicle Management (`add-customer-vehicle-crud`)

- Vehicle CRUD linked to customers
- Plate number validation (unique)
- Vehicle list with customer association

### ✅ Items Management (`add-items-crud`)

- Item CRUD with name, unit, price
- Price history tracking
- Active/inactive toggle

### ✅ Database Migration System (`implement-database-migrations`)

- Umzug-based migration runner
- TypeScript migration files
- CLI scripts for migration management
- Atomic transactions for migrations

### ✅ Project Structure (`refactor-project-structure`)

- Feature-first architecture
- Path aliases (@Features, @Shared, @App)
- Consistent file naming (PascalCase)

### ✅ Navigation & Sidebar (`refactor-navigation-sidebar`)

- Role-based sidebar with AppSidebarRBAC
- Permission-filtered menu items
- Collapsible navigation groups

### 🔲 Pending Features

- Transaction workflow (CREATED → CHECKED_OUT)
- Loader queue management
- Gate logging (QR, LPR, RFID)
- Payment processing
- Reports and analytics
- ERP synchronization
