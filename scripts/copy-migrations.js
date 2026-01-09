#!/usr/bin/env node
/* eslint-env node */

/**
 * Copy compiled migrations to dist-electron for production build
 * Note: TypeScript migrations are compiled to dist-electron/migrations by tsc
 * This script is kept for compatibility but may not be needed since
 * migrations are already in the correct location after compilation.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Migrations are compiled directly to dist-electron/migrations by TypeScript
const migrationsDir = path.join(__dirname, "..", "dist-electron", "migrations");

// Verify migrations exist
if (!fs.existsSync(migrationsDir)) {
  console.error("❌ Migrations directory not found:", migrationsDir);
  console.error("   Run 'npm run migration:compile' first");
  process.exit(1);
}

// Count migration files
const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".js"));

if (files.length === 0) {
  console.error("❌ No migration files found in:", migrationsDir);
  console.error("   Run 'npm run migration:compile' first");
  process.exit(1);
}

console.log(
  `✓ Found ${files.length} migration files in dist-electron/migrations`
);
files.forEach((file) => console.log(`  ✓ ${file}`));

// Create package.json with type: commonjs for proper module resolution
const packageJsonPath = path.join(migrationsDir, "package.json");
const packageJsonContent = JSON.stringify({ type: "commonjs" }, null, 2);
fs.writeFileSync(packageJsonPath, packageJsonContent + "\n", "utf8");
console.log(`  ✓ package.json (type: commonjs)`);

console.log(`\n✓ Successfully verified ${files.length} migration files`);
