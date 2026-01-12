"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Migration: seed_customers_data
 * Created: 2026-01-09
 */
/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.up = async function ({ db }) {
    // Add your migration logic here
    // Insert Data Customers
    // db.exec(
    //   `INSERT OR IGNORE INTO customers (code, name, category, is_active) VALUES ('CASH', 'CASH CUSTOMER', 'PERSONAL', 1)`
    // );
};
/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.down = async function ({ db }) {
    // Add your rollback logic here
    // Delete Data Customers
    // db.exec(`DELETE FROM customers WHERE code = 'CASH'`);
};
