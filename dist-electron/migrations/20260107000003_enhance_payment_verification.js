/**
 * Migration: Enhance Payment Verification
 * Created: 2026-01-07
 *
 * Adds payment verification workflow features:
 * - verification_status: PENDING | VERIFIED | REJECTED
 * - verified_at: Timestamp when payment was verified/rejected
 * - rejection_reason: Reason for rejection (required when rejected)
 * - Indexes for performance
 * - Backfills existing data based on verified_by field
 */
export async function up({ db }) {
    // Add verification_status column
    db.exec(`
    ALTER TABLE payments 
    ADD COLUMN verification_status TEXT DEFAULT 'PENDING'
    CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED'))
  `);
    // Add verified_at column
    db.exec(`
    ALTER TABLE payments 
    ADD COLUMN verified_at DATETIME
  `);
    // Add rejection_reason column
    db.exec(`
    ALTER TABLE payments 
    ADD COLUMN rejection_reason TEXT
  `);
    // Backfill existing data
    // If verified_by is NOT NULL, set to VERIFIED
    db.exec(`
    UPDATE payments 
    SET verification_status = 'VERIFIED',
        verified_at = paid_at
    WHERE verified_by IS NOT NULL
  `);
    // If verified_by is NULL, set to PENDING
    db.exec(`
    UPDATE payments 
    SET verification_status = 'PENDING'
    WHERE verified_by IS NULL
  `);
    // Create indexes for performance
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_payments_verification_status 
    ON payments(verification_status)
  `);
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_payments_verified_at 
    ON payments(verified_at DESC)
  `);
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_payments_transaction_verification 
    ON payments(transaction_id, verification_status)
  `);
}
export async function down({ db }) {
    // Drop indexes
    db.exec(`DROP INDEX IF EXISTS idx_payments_transaction_verification`);
    db.exec(`DROP INDEX IF EXISTS idx_payments_verified_at`);
    db.exec(`DROP INDEX IF EXISTS idx_payments_verification_status`);
    // Remove columns (SQLite doesn't support ALTER TABLE DROP COLUMN directly)
    // We need to recreate the table without the new columns
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT,
      FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
    // Copy data from payments to payments_backup
    db.exec(`
    INSERT INTO payments_backup (
      id, transaction_id, payment_method_id, amount, status, 
      paid_at, verified_by, notes, created_at
    )
    SELECT 
      id, transaction_id, payment_method_id, amount, status,
      paid_at, verified_by, notes, created_at
    FROM payments
  `);
    // Drop original table
    db.exec(`DROP TABLE payments`);
    // Rename backup to payments
    db.exec(`ALTER TABLE payments_backup RENAME TO payments`);
    // Recreate original indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_payments_payment_method_id ON payments(payment_method_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at)`);
}
