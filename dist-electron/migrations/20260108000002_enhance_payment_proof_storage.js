/**
 * Migration: Enhance Payment Proof Storage with Redundancy
 * Created: 2026-01-08
 *
 * Adds redundancy and metadata for critical payment proof files:
 * - proof_thumbnail: Base64 thumbnail/compressed version as backup
 * - proof_file_hash: SHA256 hash for integrity verification
 * - proof_file_size: File size in bytes
 * - proof_mime_type: MIME type of the file
 * - proof_uploaded_at: Timestamp when proof was uploaded
 * - proof_last_verified: Last time file existence was verified
 *
 * This ensures payment proofs are never lost even if file system fails
 */
export async function up({ db }) {
    // Add proof_thumbnail column (base64 compressed version as backup)
    db.exec(`
    ALTER TABLE payments 
    ADD COLUMN proof_thumbnail TEXT
  `);
    // Add proof_file_hash column (for integrity verification)
    db.exec(`
    ALTER TABLE payments 
    ADD COLUMN proof_file_hash TEXT
  `);
    // Add proof_file_size column
    db.exec(`
    ALTER TABLE payments 
    ADD COLUMN proof_file_size INTEGER
  `);
    // Add proof_mime_type column
    db.exec(`
    ALTER TABLE payments 
    ADD COLUMN proof_mime_type TEXT
  `);
    // Add proof_uploaded_at column
    db.exec(`
    ALTER TABLE payments 
    ADD COLUMN proof_uploaded_at DATETIME
  `);
    // Add proof_last_verified column
    db.exec(`
    ALTER TABLE payments 
    ADD COLUMN proof_last_verified DATETIME
  `);
    // Create index for faster queries
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_payments_proof_uploaded_at 
    ON payments(proof_uploaded_at DESC)
  `);
}
export async function down({ db }) {
    // Drop index
    db.exec(`DROP INDEX IF EXISTS idx_payments_proof_uploaded_at`);
    // SQLite doesn't support ALTER TABLE DROP COLUMN directly
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
      verification_status TEXT DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
      verified_at DATETIME,
      rejection_reason TEXT,
      proof_image_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT,
      FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
    // Copy data from payments to payments_backup (without new columns)
    db.exec(`
    INSERT INTO payments_backup (
      id, transaction_id, payment_method_id, amount, status, 
      paid_at, verified_by, notes, verification_status, verified_at, 
      rejection_reason, proof_image_path, created_at
    )
    SELECT 
      id, transaction_id, payment_method_id, amount, status,
      paid_at, verified_by, notes, verification_status, verified_at,
      rejection_reason, proof_image_path, created_at
    FROM payments
  `);
    // Drop original table
    db.exec(`DROP TABLE payments`);
    // Rename backup to payments
    db.exec(`ALTER TABLE payments_backup RENAME TO payments`);
    // Recreate indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_payments_payment_method_id ON payments(payment_method_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_payments_verification_status ON payments(verification_status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_payments_verified_at ON payments(verified_at DESC)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_payments_transaction_verification ON payments(transaction_id, verification_status)`);
}
