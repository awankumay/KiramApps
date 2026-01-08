"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Migration: Seed Transaction Reference Data
 * Created: 2026-01-07
 *
 * Seeds reference data for transaction management:
 * - Transaction types (PENJUALAN, PENGIRIMAN)
 * - Payment methods (CASH, TRANSFER, QRIS)
 */
/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.up = async function ({ db }) {
    // Seed transaction types
    db.exec(`INSERT OR IGNORE INTO transaction_types (id, name) VALUES (1, 'PENJUALAN')`);
    db.exec(`INSERT OR IGNORE INTO transaction_types (id, name) VALUES (2, 'PENGIRIMAN')`);
    // Seed payment methods
    db.exec(`INSERT OR IGNORE INTO payment_methods (id, name) VALUES (1, 'CASH')`);
    db.exec(`INSERT OR IGNORE INTO payment_methods (id, name) VALUES (2, 'TRANSFER')`);
    db.exec(`INSERT OR IGNORE INTO payment_methods (id, name) VALUES (3, 'QRIS')`);
    console.log("✅ Seeded transaction reference data:");
    console.log("   - 2 transaction types (PENJUALAN, PENGIRIMAN)");
    console.log("   - 3 payment methods (CASH, TRANSFER, QRIS)");
};
/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.down = async function ({ db }) {
    // Remove seeded data
    db.exec(`DELETE FROM payment_methods`);
    db.exec(`DELETE FROM transaction_types`);
};
