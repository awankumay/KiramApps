# navigation Specification

## Purpose
TBD - created by archiving change refactor-navigation-sidebar. Update Purpose after archive.
## Requirements
### Requirement: Unified Sidebar Navigation

The application MUST provide a unified sidebar navigation component that is used across all authenticated pages.

#### Scenario: User accesses any authenticated page

Given the user is authenticated
When the user navigates to any authenticated page (/dashboard, /superadmin/users, etc.)
Then the sidebar MUST be displayed on the left side of the screen
And the sidebar MUST contain navigation items based on user permissions

#### Scenario: Sidebar is collapsible

Given the user is viewing any page with sidebar
When the user clicks the sidebar trigger button in the header
Then the sidebar MUST collapse to icon-only mode
And when clicked again, the sidebar MUST expand to show full menu

### Requirement: Permission-Based Menu Filtering

The sidebar MUST filter navigation items based on user permissions defined in RouteConfig.

#### Scenario: User with limited permissions

Given a user with only VIEW_TRANSACTION permission
When the sidebar renders
Then only menu items that require VIEW_TRANSACTION or no permissions MUST be visible
And menu items requiring MANAGE_USERS MUST NOT be visible

#### Scenario: Superadmin user

Given a user with all permissions (SUPERADMIN role)
When the sidebar renders
Then all navigation items MUST be visible
And all navigation groups MUST be displayed

#### Scenario: User permissions change

Given a user is viewing the application
And the user's permissions are updated (e.g., role change)
When the auth context updates
Then the sidebar MUST re-render with updated menu items
And previously hidden items MUST become visible if permissions allow

### Requirement: Navigation Groups

The sidebar MUST organize navigation items into logical groups that can be expanded and collapsed.

#### Scenario: Navigation groups are displayed

Given the user has permissions for multiple groups
When the sidebar renders
Then navigation groups MUST be displayed with labels (e.g., "Utama", "Superadmin", "Transaksi", "Loader")
And each group MUST contain its associated menu items

#### Scenario: Expand and collapse groups

Given the sidebar has multiple navigation groups
When the user clicks on a group label
Then that group MUST expand to show its menu items
And clicking again MUST collapse the group

#### Scenario: Single group scenario

Given the user has permissions for only one navigation group
When the sidebar renders
Then the group label MUST be displayed
And the group MUST NOT be collapsible (always expanded)

### Requirement: Active Route Highlighting

The sidebar MUST visually indicate the currently active route.

#### Scenario: Active route is highlighted

Given the user is on the Dashboard page (/dashboard)
When the sidebar renders
Then the "Dashboard" menu item MUST have active styling (background color change)
And other menu items MUST NOT have active styling

#### Scenario: User navigates to different page

Given the user is on the Dashboard page
When the user clicks on "Manajemen Pengguna" menu item
Then the application MUST navigate to /superadmin/users
And the "Manajemen Pengguna" menu item MUST become active
And the "Dashboard" menu item MUST lose active styling

### Requirement: User Profile Display

The sidebar MUST display user information in the footer with a dropdown menu.

#### Scenario: User profile is displayed

Given the user is authenticated
When the sidebar renders
Then the sidebar footer MUST display user's avatar with initials
And the user's full name MUST be visible
And clicking the profile MUST open a dropdown menu

#### Scenario: User profile dropdown content

Given the user clicks on their profile in the sidebar footer
When the dropdown menu opens
Then it MUST display the user's full name
And it MUST display the user's email
And it MUST display all user roles as badges
And it MUST contain a "Logout" button

#### Scenario: User logs out from sidebar

Given the user is viewing the application
When the user clicks "Logout" in the profile dropdown
Then the user MUST be logged out
And the application MUST redirect to the login page

### Requirement: Consistent Icon Library

The sidebar MUST use lucide-react icons exclusively for consistency with the rest of the application.

#### Scenario: Menu items display correct icons

Given the sidebar is rendering navigation items
When each menu item is displayed
Then it MUST use the corresponding lucide-react icon from the iconMap
And the icon MUST match the icon defined in RouteConfig

#### Scenario: User profile uses avatar

Given the user is viewing the sidebar
When the user profile is displayed
Then it MUST use Avatar component from shadcn-ui
And the avatar MUST display user initials (first letter of first and last name)

### Requirement: Responsive Behavior

The sidebar MUST adapt to different screen sizes while maintaining functionality.

#### Scenario: Desktop view

Given the user is on a desktop screen (≥768px width)
When the sidebar renders
Then it MUST display in full width mode by default
And the sidebar trigger button MUST be visible in the header

#### Scenario: Collapsed mode

Given the user is on a desktop screen
When the sidebar is collapsed to icon-only mode
Then only icons MUST be visible for menu items
And group labels MUST be hidden
And user profile MUST show only avatar without text
And tooltips MUST appear on hover for menu items

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

