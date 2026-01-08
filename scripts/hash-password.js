#!/usr/bin/env node
/* eslint-env node */

import { createHash } from "crypto";

const password = process.argv[2];

if (!password) {
  console.error("Usage: node scripts/hash-password.js <password>");
  console.error("Example: node scripts/hash-password.js mypassword123");
  process.exit(1);
}

const hash = createHash("sha256").update(password).digest("hex");

console.log("\n🔐 Password Hash Generator");
console.log("========================");
console.log(`Password: ${password}`);
console.log(`SHA256 Hash: ${hash}`);
console.log("\nCopy this hash to your migration file:");
console.log(
  `INSERT OR IGNORE INTO users (..., password_hash) VALUES (..., '${hash}');`
);
console.log("");
