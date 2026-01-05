# Change: Refactor Navigation to RBAC-Integrated Sidebar

**Change ID:** `refactor-navigation-sidebar`
**Status:** Draft
**Created:** 2026-01-05
**Author:** AI Assistant

## Why

The application currently has two different navigation components with inconsistent implementations:

1. **AppSidebar.tsx** - Located in Dashboard feature, uses hardcoded data with no RBAC integration
2. **AppNavigation.tsx** - Located in Shared components, fully integrated with RBAC but uses top bar layout

**Problems:**

- Inconsistent user experience across the application
- Dashboard sidebar doesn't respect user permissions (hardcoded menu items)
- Two different navigation patterns create confusion
- AppSidebar uses @tabler/icons while AppNavigation uses lucide-react (inconsistent icon library)
- Duplicate navigation components increase maintenance burden

**Solution:**
Create a unified sidebar navigation component that combines:

- Sidebar layout from AppSidebar (better space utilization for desktop apps)
- RBAC integration from AppNavigation (permission-based filtering)
- Consistent icon library (lucide-react)
- Single source of truth for navigation

## What Changes

### New Components

- **`src/Shared/Components/AppSidebarRBAC.tsx`** - New unified sidebar component

  - Permission-based navigation filtering
  - Collapsible sidebar with icon-only mode
  - User profile dropdown with role display
  - Navigation groups with expand/collapse
  - Active route highlighting
  - Uses lucide-react icons (consistent with app)

- **`AppSidebarLayout`** - Layout wrapper component
  - Provides SidebarProvider context
  - Includes header with sidebar trigger
  - Wraps main content area

### Modified Components

- **`src/App.tsx`** - Replace AppNavigation with AppSidebarLayout

  - Remove AppNavigation import
  - Wrap Routes with AppSidebarLayout
  - All routes now use unified sidebar

- **`src/Features/Dashboard/DashboardPage.tsx`** - Remove duplicate sidebar wrapper
  - Remove AppSidebarLayout wrapper (already in App.tsx)
  - Keep only page-specific content

### Deprecated Components

- **`src/Features/Dashboard/Components/AppSidebar.tsx`** - No longer used (can be archived)
- **`src/Shared/Components/AppNavigation.tsx`** - No longer used (can be archived)
- **`src/Features/Dashboard/Components/NavMain.tsx`** - No longer used (can be archived)
- **`src/Features/Dashboard/Components/NavDocuments.tsx`** - No longer used (can be archived)
- **`src/Features/Dashboard/Components/NavSecondary.tsx`** - No longer used (can be archived)
- **`src/Features/Dashboard/Components/NavUser.tsx`** - No longer used (can be archived)

## Impact

- **Affected specs:**
  - Navigation (NEW capability - unified RBAC-integrated sidebar)
  - User Experience (MODIFIED - consistent sidebar across all pages)
- **Affected code:**

  - `src/App.tsx` - Replace AppNavigation with AppSidebarLayout
  - `src/Features/Dashboard/DashboardPage.tsx` - Remove duplicate sidebar wrapper
  - `src/Shared/Components/AppSidebarRBAC.tsx` - NEW unified sidebar component
  - `src/Features/Dashboard/Components/AppSidebar.tsx` - DEPRECATED
  - `src/Shared/Components/AppNavigation.tsx` - DEPRECATED

- **Breaking changes:** None (functional replacement)
- **User-visible changes:**
  - All pages now use consistent sidebar navigation
  - Menu items are filtered based on user permissions
  - User profile displayed in sidebar footer
  - Sidebar can be collapsed to icon-only mode

## Success Criteria

- [ ] All pages use unified sidebar navigation
- [ ] Menu items are filtered based on user permissions
- [ ] Sidebar is collapsible with icon-only mode
- [ ] User profile dropdown displays name, email, and roles
- [ ] Active route is highlighted in sidebar
- [ ] Navigation groups can be expanded/collapsed
- [ ] No TypeScript errors
- [ ] Consistent icon library (lucide-react) throughout navigation

## Dependencies

- **Requires:** `add-user-management-rbac` change (RBAC infrastructure)
- **Builds on:** Existing RouteConfig and NAV_GROUPS from Auth/Routes
- **Uses:** shadcn-ui Sidebar components

## Out of Scope

- Mobile-responsive navigation (currently desktop-focused)
- Advanced sidebar customization (theme, width, etc.)
- Navigation analytics/tracking
- Multi-level nested navigation (beyond current group structure)
