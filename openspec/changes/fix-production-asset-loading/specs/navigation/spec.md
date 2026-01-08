# Navigation Spec Delta

## MODIFIED Requirements

### Requirement: Client-Side Routing Strategy

The application SHALL use hash-based routing (`HashRouter`) to ensure compatibility with Electron's `file://` protocol and enable reliable navigation in packaged desktop applications.

#### Scenario: Application uses hash-based routing

- **GIVEN** the application is running in Electron
- **WHEN** the routing system is initialized
- **THEN** `HashRouter` SHALL be used instead of `BrowserRouter`
- **AND** all routes SHALL use hash-based URLs (e.g., `#/dashboard`, `#/transactions`)
- **AND** the browser history API SHALL NOT be used

#### Scenario: Navigation works with file protocol

- **GIVEN** the packaged Electron application is running
- **WHEN** the user navigates to a route
- **THEN** the URL SHALL follow the pattern `file://.../index.html#/[route]`
- **AND** navigation SHALL work without server requests
- **AND** the application SHALL render the correct component

#### Scenario: Force reload preserves route state

- **GIVEN** the user is viewing a specific route (e.g., `/dashboard`)
- **WHEN** the user performs a force reload (Ctrl+R / Cmd+R)
- **THEN** the application SHALL reload at the same route
- **AND** the hash portion of the URL SHALL be preserved
- **AND** no navigation errors SHALL occur

### Requirement: Route URL Format

All application routes SHALL use hash-based URL format to maintain compatibility with Electron's file protocol.

#### Scenario: Routes generate correct hash URLs

- **GIVEN** the application has defined routes
- **WHEN** a user clicks a navigation link or programmatically navigates
- **THEN** the URL SHALL include a hash before the route path
- **AND** SHALL follow the format: `[base-url]#/[route-path]`
- **AND** SHALL NOT use browser history pushState

#### Scenario: Deep links work in production

- **GIVEN** the packaged application is launched
- **WHEN** the application starts with a hash route (e.g., `index.html#/dashboard`)
- **THEN** the application SHALL navigate to the specified route
- **AND** the correct page SHALL be displayed
- **AND** no redirect to root SHALL occur
