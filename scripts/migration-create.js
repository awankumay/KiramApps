#!/usr/bin/env node
/* eslint-env node */

import fs from "fs";
import path from "path";

const migrationName = process.argv[2];

if (!migrationName) {
  console.error("Usage: npm run migration:create <migration_name>");
  console.error("Example: npm run migration:create add_user_preferences");
  process.exit(1);
}

try {
  const migrationsPath = path.join(process.cwd(), "electron", "migrations");

  // Generate timestamp-based filename (YYYYMMDDHHMMSS format)
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "")
    .slice(0, 14);

  const filename = `${timestamp}_${migrationName}.ts`;
  const filePath = path.join(migrationsPath, filename);

  const template = `import { MigrationContext } from "../database/migrator";

/**
 * Migration: ${migrationName}
 * Created: ${new Date().toISOString().split("T")[0]}
 */
export async function up({ db }: MigrationContext): Promise<void> {
  // Add your migration logic here
  // Example:
  // await sequelize.query(\`
  //   CREATE TABLE IF NOT EXISTS example (
  //     id INTEGER PRIMARY KEY AUTOINCREMENT,
  //     name TEXT NOT NULL,
  //     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  //   )
  // \`);
}

export async function down({ db }: MigrationContext): Promise<void> {
  // Add your rollback logic here
  // Example:
  // await sequelize.query(\`DROP TABLE IF EXISTS example\`);
}
`;

  fs.writeFileSync(filePath, template);
  console.log(`✅ Migration created: ${filePath}`);
  console.log(`\nNext steps:`);
  console.log(`1. Edit the migration file to add your schema changes`);
  console.log(`2. Run "npm run build" to compile TypeScript`);
  console.log(`3. Run "npm run migration:run" to execute the migration`);
} catch (error) {
  console.error("❌ Failed to create migration:", error.message);
  process.exit(1);
}
