/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Migration: Add Payment Proof Image Path
 * Created: 2026-01-08
 *
 * Adds proof_image_path column to payments table to store payment proof images
 */
/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.up = async function ({ db }: any) {
  // Add proof_image_path column
  db.exec(`
    ALTER TABLE payments 
    ADD COLUMN proof_image_path TEXT
  `);
};

/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.down = async function ({ db }: any) {
  // SQLite doesn't support ALTER TABLE DROP COLUMN directly
  // We need to recreate the table without the proof_image_path column
  db.exec(`
    CREATE TABLE payments_backup (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      payment_method_id INTEGER NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      status TEXT NOT NULL DEFAULT 'PAID' CHECK(status IN ('PENDING', 'PAID')),
      paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      verified_by INTEGER,
      notes TEXT,
      verification_status TEXT DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
      verified_at DATETIME,
      rejection_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT,
      FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Copy data from payments to payments_backup (without proof_image_path)
  db.exec(`
    INSERT INTO payments_backup (
      id, transaction_id, payment_method_id, amount, status, 
      paid_at, verified_by, notes, verification_status, verified_at, 
      rejection_reason, created_at
    )
    SELECT 
      id, transaction_id, payment_method_id, amount, status,
      paid_at, verified_by, notes, verification_status, verified_at,
      rejection_reason, created_at
    FROM payments
  `);

  // Disable foreign keys temporarily to allow dropping payments table
  const previousFkStatus = db.pragma("foreign_keys", { simple: true });
  db.pragma("foreign_keys = OFF");

  // Drop original table
  db.exec(`DROP TABLE payments`);

  // Rename backup to payments
  db.exec(`ALTER TABLE payments_backup RENAME TO payments`);

  // Restore foreign keys status
  if (previousFkStatus) {
    db.pragma("foreign_keys = ON");
  }

  // Recreate indexes
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_payments_payment_method_id ON payments(payment_method_id)`
  );
  db.exec(`CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)`);
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_payments_verification_status ON payments(verification_status)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_payments_verified_at ON payments(verified_at DESC)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_payments_transaction_verification ON payments(transaction_id, verification_status)`
  );
};
