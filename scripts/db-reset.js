#!/usr/bin/env node
/* eslint-env node */

import fs from "fs";
import path from "path";
import os from "os";

// Get database path (same as in electron/auth/database.ts)
function getDatabasePath() {
  const platform = os.platform();
  let appDataPath;

  if (platform === "win32") {
    appDataPath =
      process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  } else if (platform === "darwin") {
    appDataPath = path.join(os.homedir(), "Library", "Application Support");
  } else {
    appDataPath = path.join(os.homedir(), ".config");
  }

  const dbDir = path.join(appDataPath, "kiram-site");
  const dbPath = path.join(dbDir, "app-data.db");

  return dbPath;
}

try {
  const dbPath = getDatabasePath();

  console.log("🗑️  Resetting database...");
  console.log(`Database path: ${dbPath}`);

  // Delete database file if exists
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log("✅ Database file deleted");
  } else {
    console.log("ℹ️  Database file does not exist");
  }

  // Delete WAL files if they exist
  const walPath = dbPath + "-wal";
  const shmPath = dbPath + "-shm";

  if (fs.existsSync(walPath)) {
    fs.unlinkSync(walPath);
    console.log("✅ WAL file deleted");
  }

  if (fs.existsSync(shmPath)) {
    fs.unlinkSync(shmPath);
    console.log("✅ SHM file deleted");
  }

  console.log("\n✨ Database reset complete!");
  console.log('Run "npm run migration:run" to setup fresh database\n');
} catch (error) {
  console.error("❌ Failed to reset database:", error.message);
  process.exit(1);
}
