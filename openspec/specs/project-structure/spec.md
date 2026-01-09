# project-structure Specification

## Purpose
TBD - created by archiving change refactor-project-structure. Update Purpose after archive.
## Requirements
### Requirement: Feature-First Folder Organization

The system SHALL organize source code using feature-first folder structure where each feature domain has its own dedicated folder containing all related components, hooks, and contexts.

#### Scenario: Developer adds new feature

- **GIVEN** a developer needs to add a new feature called "SuratMasuk"
- **WHEN** they create the feature folder
- **THEN** they SHALL create `src/Features/SuratMasuk/` with subfolders `Components/`, `Hooks/`, and optionally `Contexts/`
- **AND** all feature-related code SHALL reside within this folder

#### Scenario: Developer locates feature code

- **GIVEN** a developer needs to modify the Auth feature
- **WHEN** they navigate to `src/Features/Auth/`
- **THEN** they SHALL find all Auth-related components, hooks, contexts, and the page orchestrator

---

### Requirement: PascalCase Naming Convention

The system SHALL use PascalCase naming for all folders and files except designated entry points.

#### Scenario: Creating new component file

- **GIVEN** a developer creates a new component
- **WHEN** naming the file
- **THEN** they SHALL use PascalCase (e.g., `UserProfileCard.tsx`)
- **AND** the folder containing it SHALL use PascalCase (e.g., `Components/`)

#### Scenario: Entry point exceptions

- **GIVEN** the following entry point files
- **WHEN** naming these files
- **THEN** they MAY use lowercase: `main.tsx`, `index.css`, `index.html`, `vite-env.d.ts`
- **AND** configuration files MAY use their standard names: `tsconfig.json`, `vite.config.ts`

---

### Requirement: Separation of Presentation and Logic

The system SHALL separate presentational components from business logic hooks within each feature.

#### Scenario: Component receives data via props

- **GIVEN** a presentational component in `Features/*/Components/`
- **WHEN** it needs data or callbacks
- **THEN** it SHALL receive them via props
- **AND** it SHALL NOT directly call APIs or manage complex state

#### Scenario: Business logic in hooks

- **GIVEN** business logic for a feature (API calls, state management, side effects)
- **WHEN** implementing this logic
- **THEN** it SHALL be placed in `Features/*/Hooks/` as custom React hooks
- **AND** it SHALL export functions and state that components can consume

#### Scenario: Page orchestrator composition

- **GIVEN** a page component (e.g., `AuthPage.tsx`)
- **WHEN** rendering the page
- **THEN** it SHALL compose presentational components with business logic hooks
- **AND** it SHALL serve as the wiring layer between UI and logic

---

### Requirement: Shared Code Organization

The system SHALL organize cross-feature shared code in the `Shared/` folder.

#### Scenario: Reusable UI components

- **GIVEN** a UI component used by multiple features (e.g., Button, Card)
- **WHEN** organizing this component
- **THEN** it SHALL be placed in `Shared/Components/` or `Shared/Components/UI/`
- **AND** features SHALL import from this shared location

#### Scenario: Utility functions

- **GIVEN** a utility function used across features (e.g., `cn()` for classnames)
- **WHEN** organizing this utility
- **THEN** it SHALL be placed in `Shared/Lib/`

#### Scenario: Global TypeScript types

- **GIVEN** TypeScript type definitions used across features
- **WHEN** organizing these types
- **THEN** they SHALL be placed in `Shared/Types/`

---

### Requirement: Path Aliases Configuration

The system SHALL configure TypeScript path aliases for cleaner imports.

#### Scenario: Import from features

- **GIVEN** a file needs to import from another feature
- **WHEN** writing the import statement
- **THEN** it SHOULD use `@Features/FeatureName/...` alias
- **AND** the alias SHALL resolve to `src/Features/...`

#### Scenario: Import from shared

- **GIVEN** a file needs to import from shared utilities
- **WHEN** writing the import statement
- **THEN** it SHOULD use `@Shared/...` or `@/Shared/...` alias
- **AND** the alias SHALL resolve to `src/Shared/...`

---

### Requirement: Developer Documentation for Asset Loading and Routing

The project documentation SHALL include troubleshooting guidance for asset loading and routing issues in Electron production builds.

#### Scenario: Developer encounters asset loading issue

- **GIVEN** a developer experiences asset loading failures in production
- **WHEN** consulting the project documentation
- **THEN** clear instructions SHALL be available explaining the `base: "./"` requirement
- **AND** troubleshooting steps SHALL guide diagnosis using DevTools Network tab
- **AND** expected vs. incorrect URL patterns SHALL be documented with examples

#### Scenario: Developer needs to understand routing strategy

- **GIVEN** a developer is working with React Router in the Electron app
- **WHEN** consulting the project documentation
- **THEN** clear explanation SHALL be provided for using `HashRouter` instead of `BrowserRouter`
- **AND** rationale SHALL explain `file://` protocol limitations with browser history API
- **AND** examples SHALL show correct hash-based URL patterns

