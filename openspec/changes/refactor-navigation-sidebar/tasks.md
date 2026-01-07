# Tasks: Refactor Navigation to RBAC-Integrated Sidebar

## Implementation Tasks

### Phase 1: Create New Sidebar Component

- [x] Create `src/Shared/Components/AppSidebarRBAC.tsx` component

  - [x] Import necessary dependencies (lucide-react icons, auth hooks, RouteConfig)
  - [x] Create iconMap for lucide-react icons
  - [x] Implement permission-based filtering using canAccessRoute()
  - [x] Implement navigation groups with expand/collapse functionality
  - [x] Implement active route highlighting using useLocation()
  - [x] Implement user profile dropdown in sidebar footer
  - [x] Add logout functionality
  - [x] Style using shadcn-ui Sidebar components

- [x] Create `AppSidebarLayout` wrapper component
  - [x] Wrap AppSidebarRBAC with SidebarProvider
  - [x] Include SidebarInset for main content area
  - [x] Add header with sidebar trigger button
  - [x] Set CSS variables for sidebar width and header height

### Phase 2: Update Application Structure

- [x] Update `src/App.tsx` to use new sidebar

  - [x] Remove AppNavigation import
  - [x] Add AppSidebarLayout import
  - [x] Wrap Routes component with AppSidebarLayout
  - [x] Verify all routes work with new layout

- [x] Update `src/Features/Dashboard/DashboardPage.tsx`
  - [x] Remove AppSidebarLayout wrapper (duplicate)
  - [x] Keep only page-specific content
  - [x] Verify no double sidebar rendering

### Phase 3: Verification & Testing

- [x] Run TypeScript compilation check

  - [x] Execute `npx tsc --noEmit`
  - [x] Verify no TypeScript errors
  - [x] Fix any import path issues

- [x] Manual testing checklist
  - [x] Test navigation to all routes (/dashboard, /superadmin/users, etc.)
  - [x] Verify menu items are filtered by permissions
  - [ ] Test sidebar collapse/expand functionality
  - [ ] Test navigation group expand/collapse
  - [x] Verify active route highlighting
  - [x] Test user profile dropdown
  - [x] Test logout functionality
  - [ ] Verify no duplicate navigation elements
  - [x] Test with different user roles (Superadmin, Checker, Loader)

### Phase 4: Cleanup (Optional)

- [ ] Archive deprecated components

  - [ ] Move `src/Features/Dashboard/Components/AppSidebar.tsx` to archive
  - [ ] Move `src/Shared/Components/AppNavigation.tsx` to archive
  - [ ] Move `src/Features/Dashboard/Components/NavMain.tsx` to archive
  - [ ] Move `src/Features/Dashboard/Components/NavDocuments.tsx` to archive
  - [ ] Move `src/Features/Dashboard/Components/NavSecondary.tsx` to archive
  - [ ] Move `src/Features/Dashboard/Components/NavUser.tsx` to archive

- [ ] Update documentation
  - [ ] Update project.md to reflect new navigation structure
  - [ ] Add note about deprecated components
  - [ ] Update any references to old navigation components

### Phase 5: Validation

- [x] Validate OpenSpec proposal
  - [x] Run `openspec validate refactor-navigation-sidebar --strict`
  - [x] Fix any validation errors
  - [x] Ensure all requirements are covered in specs

## Dependencies

- **Prerequisite:** `add-user-management-rbac` change must be applied first

  - RBAC infrastructure (roles, permissions, RouteConfig)
  - Auth context with user and permissions
  - ProtectedRoute component

- **Builds on:**
  - shadcn-ui Sidebar components
  - Existing RouteConfig and NAV_GROUPS
  - Auth context (useAuth hook)

## Validation Criteria

Each task should be verified before marking as complete:

1. **Code Quality:**

   - No TypeScript errors
   - No ESLint warnings
   - Follows project conventions (PascalCase, camelCase, etc.)

2. **Functionality:**

   - All navigation items work correctly
   - Permission filtering works as expected
   - Active route highlighting is accurate
   - User profile and logout function properly

3. **User Experience:**

   - Sidebar is consistent across all pages
   - No duplicate navigation elements
   - Responsive behavior is acceptable
   - Keyboard navigation works

4. **Integration:**
   - Works with existing RBAC system
   - Compatible with all authenticated routes
   - No breaking changes to other features

## Estimated Effort

- **Phase 1:** 2-3 hours (component development)
- **Phase 2:** 1 hour (app integration)
- **Phase 3:** 2-3 hours (testing and verification)
- **Phase 4:** 1 hour (cleanup - optional)
- **Phase 5:** 0.5 hour (validation)

**Total:** 6.5-8.5 hours

## Rollback Plan

If issues arise during implementation:

1. **Revert App.tsx changes:**

   - Restore AppNavigation import
   - Remove AppSidebarLayout wrapper

2. **Revert DashboardPage.tsx changes:**

   - Restore original AppSidebarLayout wrapper
   - Keep original AppSidebar component

3. **Delete new components:**

   - Remove `src/Shared/Components/AppSidebarRBAC.tsx`

4. **Restore old components:**
   - Ensure all archived components are restored if needed

## Notes

- All imports use alias paths (@Features, @Shared) as configured in vite.config.ts
- TypeScript validation passed with no errors
- Icon library unified to lucide-react throughout navigation
- Permission-based filtering uses existing canAccessRoute() function
- Navigation groups follow existing NAV_GROUPS structure
