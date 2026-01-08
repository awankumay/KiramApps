/**
 * Copy compiled migrations to dist-electron for production build
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, "..", "electron", "migrations");
const targetDir = path.join(__dirname, "..", "dist-electron", "migrations");

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
  console.log("✓ Created migrations directory:", targetDir);
}

// Copy all .js migration files
const files = fs.readdirSync(sourceDir);
let copiedCount = 0;

files.forEach((file) => {
  if (file.endsWith(".js")) {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);
    fs.copyFileSync(sourcePath, targetPath);
    copiedCount++;
    console.log(`  ✓ Copied ${file}`);
  }
});

console.log(
  `\n✓ Successfully copied ${copiedCount} migration files to dist-electron/migrations`
);
