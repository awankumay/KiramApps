# Change: Fix Production Asset Loading and Routing in Built Electron App

## Why

When the Electron application is built for production and force-reloaded, the browser attempts to load assets from `file:///C:/` instead of the correct relative path to the app's resources. This occurs due to two issues:

1. **Asset Path Issue**: Vite's default configuration doesn't set the proper base path for Electron file protocol loading
2. **Routing Issue**: React Router's `BrowserRouter` is incompatible with Electron's `file://` protocol, causing navigation and force reload failures after login

The issue manifests as:

- Network error showing `Request URL: file:///C:/`
- Assets failing to load after force reload (Ctrl+R / Cmd+R)
- White screen or missing styles/scripts in production build
- Features not loading after successful login (only sidebar visible)
- Force reload on any route after login fails with `file:///C:/` error

## What Changes

- Configure Vite to use relative base path (`./`) for Electron production builds
- Replace `BrowserRouter` with `HashRouter` for Electron compatibility
- Ensure all built assets use relative paths compatible with Electron's `file://` protocol
- Verify navigation and force reload works correctly at any route in production
- Add validation to prevent regression of this issue

## Impact

**Affected specs:**

- `project-structure` - Build configuration and asset bundling
- `navigation` - Routing strategy for Electron

**Affected code:**

- `vite.config.ts` - Add `base` configuration
- `src/App.tsx` - Change from `BrowserRouter` to `HashRouter`
- Build process documentation
- Developer setup instructions (if needed)

**Breaking:** No breaking changes. URLs will now use hash-based routing (e.g., `/#/dashboard` instead of `/dashboard`), but this is the correct pattern for Electron apps and doesn't affect functionality.

**Risk:** Low - configuration changes only affect production build output paths and routing strategy, does not modify application logic or data structures.
