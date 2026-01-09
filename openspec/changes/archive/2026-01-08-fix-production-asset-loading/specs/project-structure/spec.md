# Project Structure Spec Delta

## ADDED Requirements

### Requirement: Build Configuration for Electron Production

The build system SHALL configure Vite to generate assets with relative paths compatible with Electron's `file://` protocol, ensuring all resources load correctly in packaged applications regardless of reload operations.

#### Scenario: Production build generates relative asset paths

- **GIVEN** the application is built for production using `npm run build`
- **WHEN** Vite bundles the application
- **THEN** all asset references in `dist/index.html` SHALL use relative paths (e.g., `./assets/index-*.js`)
- **AND** the base configuration SHALL be set to `"./"` in `vite.config.ts`

#### Scenario: Force reload in production app loads assets correctly

- **GIVEN** the packaged Electron application is running at any route
- **WHEN** the user performs a force reload (Ctrl+R or Cmd+R)
- **THEN** all assets SHALL load successfully from the correct relative paths
- **AND** no network errors SHALL appear in the DevTools console
- **AND** asset URLs SHALL resolve relative to the app's resource directory
- **AND** the application SHALL remain functional at the current route

#### Scenario: Asset URLs use file protocol correctly

- **GIVEN** the application is running in production mode
- **WHEN** inspecting network requests in DevTools
- **THEN** all asset URLs SHALL follow the pattern `file:///[app-path]/dist/assets/...`
- **AND** SHALL NOT attempt to load from root file system paths like `file:///C:/`

### Requirement: Build Output Validation

The build process SHALL verify that all generated assets are accessible via Electron's file protocol before packaging completes.

#### Scenario: Build script validates output structure

- **GIVEN** the build command completes
- **WHEN** checking the `dist/` directory
- **THEN** `index.html` SHALL exist with relative asset references
- **AND** all referenced assets in the `assets/` subdirectory SHALL exist
- **AND** no absolute paths SHALL be present in HTML or JS bundles

### Requirement: Routing Strategy for Electron

The application SHALL use hash-based routing (`HashRouter`) instead of browser history routing to ensure compatibility with Electron's `file://` protocol.

#### Scenario: Navigation works in production Electron app

- **GIVEN** the packaged Electron application is running
- **WHEN** the user navigates to any route (e.g., dashboard, transactions)
- **THEN** the route SHALL use hash-based URLs (e.g., `file:///.../index.html#/dashboard`)
- **AND** navigation SHALL work correctly without server requests
- **AND** the application SHALL display the correct page content

#### Scenario: Force reload maintains current route

- **GIVEN** the user is on a specific route after login (e.g., `/dashboard`)
- **WHEN** the user performs a force reload (Ctrl+R or Cmd+R)
- **THEN** the application SHALL reload and remain on the same route
- **AND** all features SHALL load correctly
- **AND** no navigation errors SHALL occur

## ADDED Requirements

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
