/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Migration: seed_data_dummy
 * Created: 2026-01-07
 */
/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.up = async function ({ db }: any) {
  // Seed dummy items data
  db.exec(
    `INSERT OR IGNORE INTO items (name, unit, price, is_active) VALUES ('Pasir', 'm³', 150000, 1)`
  );
  db.exec(
    `INSERT OR IGNORE INTO items (name, unit, price, is_active) VALUES ('Batu Split', 'm³', 250000, 1)`
  );
  db.exec(
    `INSERT OR IGNORE INTO items (name, unit, price, is_active) VALUES ('Batu Kali', 'm³', 200000, 1)`
  );
};

/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.down = async function ({ db }: any) {
  // Remove seeded dummy items data
  db.exec(
    `DELETE FROM items WHERE name IN ('Pasir', 'Batu Split', 'Batu Kali')`
  );
};
