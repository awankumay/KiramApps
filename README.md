# Kiram Site - Aplikasi Surat Masuk Digital

Offline-first desktop application for tracking incoming units (trucks) at field locations with unstable internet connectivity.

## Tech Stack

- **Runtime:** Electron.js v30+
- **UI Framework:** React 18.2+ with TypeScript
- **Build Tool:** Vite 5+
- **Language:** TypeScript 5.2+
- **Styling:** Tailwind CSS 4+ with shadcn-ui component library
- **Component Library:** shadcn-ui

## Project Structure

This project uses a **feature-first architecture** with PascalCase naming convention:

```
src/
├── App/                    # Application root and configuration
├── Features/               # Feature-based modules
│   ├── Auth/              # Authentication feature
│   │   ├── Components/    # Auth-specific components
│   │   ├── Hooks/         # Auth-specific custom hooks
│   │   └── Contexts/      # Auth context providers
│   └── Dashboard/         # Dashboard feature
│       ├── Components/    # Dashboard-specific components
│       └── Hooks/         # Dashboard-specific custom hooks
├── Shared/                # Shared code across features
│   ├── Components/        # Shared non-UI components
│   ├── Components/UI/     # shadcn-ui components (Button, Card, etc.)
│   ├── Hooks/            # Shared custom hooks
│   ├── Lib/              # Utility functions and helpers
│   └── Types/            # Shared TypeScript type definitions
└── Assets/               # Static assets (images, fonts, etc.)
```

### Path Aliases

- `@Features/*` - Import from Features directory
- `@Shared/*` - Import from Shared directory
- `@App/*` - Import from App directory
- `@/*` - Import from src root

### Naming Conventions

- **React Components:** PascalCase (e.g., `SuratMasukForm.tsx`)
- **Functions/Variables:** camelCase (e.g., `handleSubmit`, `truckData`)
- **Files:** PascalCase for all files (consistent naming convention)
- **Database tables:** snake_case (e.g., `surat_masuk`)

## Database Management

This project uses a **SQL-based migration system** to manage database schema and data changes.

### Migration Behavior

**Development Mode (`npm run dev`):**

- Database migrations are **NOT** run automatically
- You must run migrations manually using `npm run db:migrate` or `npm run db:fresh`
- This prevents ES module loading issues during development
- Database location: `%APPDATA%\kiram-site\app-data.db` (Windows)

**Production Mode (Built/Installed App):**

- Database migrations run **automatically** on first startup
- Subsequent app launches only run new (pending) migrations
- Already-applied migrations are tracked in `schema_migrations` table
- No performance impact on repeat launches
- Database location: `%APPDATA%\KiramApps\app-data.db` (Windows)

### Quick Commands

```bash
# Check migration status
npm run migration:status

# Create new migration
npm run migration:create <name>

# Run pending migrations (development only)
npm run migration:run

# Fresh database (reset + run all migrations)
npm run db:fresh
```

### Documentation

- **[Database Migration Guide](./docs/DATABASE_MIGRATION_GUIDE.md)** - Complete migration system documentation
- **[Module System Guide](./docs/MODULE_SYSTEM_GUIDE.md)** - CommonJS vs ES Modules for development and production
- **[Quick Reference](./docs/MIGRATION_QUICK_REFERENCE.md)** - Command cheat sheet
- **[ERD Diagram](./docs/erd/erd.md)** - Database schema visualization

### Migration Best Practices

- Use `IF NOT EXISTS` for all CREATE statements
- Use `INSERT OR IGNORE` for seed data
- Test with `npm run db:fresh` before committing
- Never edit migrations that have been applied

See [Database Migration Guide](./docs/DATABASE_MIGRATION_GUIDE.md) for detailed workflows.

## Development

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Building for Production

### Build Command

```bash
npm run build
```

This command runs:

1. TypeScript compilation (`tsc`)
2. Vite build (creates `dist/` directory with frontend assets)
3. Electron-builder packaging (creates installer in `release/` directory)

### Build Configuration

**Important Electron-specific configurations:**

1. **Asset Paths** - The Vite configuration includes `base: "./"` to ensure assets use relative paths compatible with Electron's `file://` protocol. This prevents asset loading failures when the application is force-reloaded in production.

2. **Routing Strategy** - The application uses `HashRouter` instead of `BrowserRouter` because:
   - Electron uses the `file://` protocol which doesn't support browser history API
   - Hash-based routing (`#/route`) works correctly with file protocol
   - URLs will appear as `file://.../index.html#/dashboard` in production

### Troubleshooting Asset Loading Issues

If you encounter network errors like `Request URL: file:///C:/` after building:

1. **Check asset paths** - Open DevTools → Network tab in the packaged app

   - ✅ Correct: `file:///C:/Users/.../app/dist/assets/index-*.js`
   - ❌ Incorrect: `file:///C:/assets/index-*.js`

2. **Verify build output** - Check `dist/index.html`:

   - Should contain relative paths: `<script src="./assets/index-*.js">`
   - Should NOT contain absolute paths: `<script src="/assets/index-*.js">`

3. **Confirm Vite config** - Ensure `vite.config.ts` includes:

   ```typescript
   export default defineConfig({
     base: "./", // Required for Electron
     // ... other config
   });
   ```

4. **Verify Router configuration** - Check `src/App.tsx`:

   ```typescript
   import { HashRouter } from "react-router-dom"; // NOT BrowserRouter

   function App() {
     return <HashRouter>{/* routes */}</HashRouter>;
   }
   ```

### Testing Force Reload in Production

After building and installing the app:

1. Open the application
2. Login and navigate to any route (e.g., Dashboard, Transactions)
3. Press Ctrl+R (Windows/Linux) or Cmd+R (Mac) to force reload
4. ✅ Application should reload correctly at the same route
5. ✅ All features should load without errors
6. ✅ No `file:///C:/` errors should appear in DevTools Console
   ```typescript
   export default defineConfig({
     base: "./", // Required for Electron
     // ... other config
   });
   ```

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: ["./tsconfig.json", "./tsconfig.node.json"],
    tsconfigRootDir: __dirname,
  },
};
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list
