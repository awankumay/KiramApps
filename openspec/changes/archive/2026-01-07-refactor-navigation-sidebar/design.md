# Design: RBAC-Integrated Sidebar Navigation

## Architecture Overview

The new sidebar navigation unifies two existing navigation approaches into a single, RBAC-integrated component that provides consistent user experience across all application pages.

### Component Structure

```
AppSidebarLayout (Layout Wrapper)
├── SidebarProvider (Context)
│   ├── AppSidebarRBAC (Sidebar Component)
│   │   ├── SidebarHeader (Logo/Brand)
│   │   ├── SidebarContent (Navigation Groups)
│   │   │   ├── Navigation Group 1 (e.g., "Utama")
│   │   │   │   ├── Menu Item 1 (Dashboard)
│   │   │   │   └── Menu Item 2 (...)
│   │   │   ├── Navigation Group 2 (e.g., "Superadmin")
│   │   │   │   └── ...
│   │   │   └── Navigation Group N (...)
│   │   └── SidebarFooter (User Profile)
│   │       └── DropdownMenu (User Info + Logout)
│   └── SidebarInset (Main Content Area)
│       ├── Header (Sidebar Trigger)
│       └── Page Content (Children)
```

### Data Flow

```
RouteConfig (Static Configuration)
    ↓
NAV_GROUPS (Navigation Groups)
    ↓
canAccessRoute() (Permission Check)
    ↓
Filtered Groups (User-Specific)
    ↓
AppSidebarRBAC (Render)
    ↓
User Interaction (Click/Navigation)
    ↓
React Router (Route Change)
```

## Key Design Decisions

### 1. Sidebar vs Top Bar

**Decision:** Use sidebar layout instead of top bar navigation.

**Rationale:**

- Desktop application benefits from vertical navigation (more screen width for content)
- Better scalability for growing menu items
- Consistent with common desktop app patterns
- Sidebar can be collapsed to icon-only mode for space efficiency

### 2. RBAC Integration

**Decision:** Permission-based filtering at component level using existing RouteConfig.

**Rationale:**

- Reuses existing RBAC infrastructure from `add-user-management-rbac`
- Single source of truth for route permissions
- Automatic menu updates when user roles change
- No duplicate permission logic

### 3. Icon Library

**Decision:** Use lucide-react exclusively for navigation icons.

**Rationale:**

- Consistent with AppNavigation and other components
- Better TypeScript support than @tabler/icons
- Reduces bundle size (single icon library)
- More active maintenance and updates

### 4. Navigation Groups

**Decision:** Keep existing NAV_GROUPS structure from RouteConfig.

**Rationale:**

- Logical grouping of related routes (Utama, Superadmin, Transaksi, Loader)
- Groups can be expanded/collapsed for better organization
- Aligns with existing route configuration
- Easy to add new groups in the future

### 5. User Profile Location

**Decision:** Place user profile in sidebar footer with dropdown menu.

**Rationale:**

- Consistent with common sidebar patterns
- Easy access to user info and logout
- Doesn't consume header space
- Can display roles and permissions clearly

## Technical Implementation

### Component: AppSidebarRBAC

**Props:**

- Inherits all props from shadcn-ui `Sidebar` component

**State:**

- `expandedGroups: Set<string>` - Tracks which navigation groups are expanded

**Dependencies:**

- `useAuth` hook - For user, permissions, roles, logout
- `useLocation` hook - For active route highlighting
- `RouteConfig` - For route definitions and permission checking
- `NAV_GROUPS` - For navigation group structure

**Features:**

1. **Permission Filtering:** Uses `canAccessRoute()` to filter menu items
2. **Active State:** Compares `location.pathname` with route paths
3. **Group Toggle:** Click handler to expand/collapse navigation groups
4. **User Dropdown:** Displays user info, roles, and logout action

### Component: AppSidebarLayout

**Props:**

- `children: React.ReactNode` - Page content to render

**Features:**

1. **SidebarProvider:** Provides sidebar context to all children
2. **CSS Variables:** Sets `--sidebar-width` and `--header-height`
3. **Header:** Includes sidebar trigger button for collapsing
4. **Content Area:** Wraps children in SidebarInset

## Migration Strategy

### Phase 1: Create New Components (✅ Completed)

- Create `AppSidebarRBAC.tsx` with full RBAC integration
- Create `AppSidebarLayout` wrapper component
- Test with existing RouteConfig and NAV_GROUPS

### Phase 2: Update App.tsx (✅ Completed)

- Replace `AppNavigation` with `AppSidebarLayout`
- Update imports to use new components
- Verify all routes work with new sidebar

### Phase 3: Clean Up Dashboard (✅ Completed)

- Remove `AppSidebarLayout` wrapper from DashboardPage
- Keep only page-specific content
- Verify no duplicate sidebar rendering

### Phase 4: Archive Old Components (Optional)

- Move `AppSidebar.tsx` to archive folder
- Move `AppNavigation.tsx` to archive folder
- Move related Nav components to archive folder
- Update documentation to reflect new structure

## Edge Cases & Considerations

### 1. User Without Permissions

- If user has no permissions, sidebar shows only logo and user profile
- User can still logout
- No navigation items are rendered

### 2. Single Navigation Group

- If only one group exists, group label is shown but not collapsible
- Improves UX for simple permission sets

### 3. Active Route Not in Menu

- If current route is not in filtered menu, no item is highlighted
- Can happen with direct URL access or bookmarked routes
- User can still navigate via other means

### 4. Role Change During Session

- Sidebar re-renders when auth context updates
- Menu items automatically update to reflect new permissions
- No manual refresh required

### 5. Mobile Responsiveness

- Current implementation is desktop-focused
- Sidebar collapses to icon-only on smaller screens
- Future enhancement: Add mobile drawer navigation

## Performance Considerations

### Optimizations

1. **Memoization:** Navigation groups are filtered once per auth context update
2. **Lazy Rendering:** Only visible groups are expanded
3. **Icon Loading:** lucide-react icons are tree-shakeable
4. **CSS Variables:** Sidebar width controlled by CSS, not JS

### Bundle Size Impact

- **Added:** AppSidebarRBAC (~3KB gzipped)
- **Removed:** AppSidebar, AppNavigation, Nav components (~5KB gzipped)
- **Net:** ~2KB reduction in bundle size

## Accessibility

### Keyboard Navigation

- Sidebar menu items are keyboard accessible
- Tab order: Logo → Menu Items → User Profile
- Enter/Space to activate menu items
- Arrow keys for dropdown navigation

### Screen Reader Support

- Semantic HTML structure
- ARIA labels on interactive elements
- Clear focus indicators
- Descriptive link text

### Color Contrast

- Active state uses primary color with sufficient contrast
- Hover states provide visual feedback
- Disabled states are clearly indicated

## Future Enhancements

### Potential Improvements

1. **Mobile Navigation:** Add bottom tab bar or drawer for mobile
2. **Search:** Add search functionality to find menu items
3. **Bookmarks:** Allow users to bookmark frequently used routes
4. **Customization:** Let users customize sidebar width and collapsed state
5. **Notifications:** Add notification badge to user profile
6. **Theme Toggle:** Add dark/light mode toggle in sidebar
7. **Recent Items:** Show recently accessed routes
8. **Keyboard Shortcuts:** Add shortcuts for common navigation actions

### Extensibility

- Navigation groups can be easily added to NAV_GROUPS
- New routes automatically appear if permissions match
- Icon mapping can be extended for new icons
- Custom menu items can be added via props
