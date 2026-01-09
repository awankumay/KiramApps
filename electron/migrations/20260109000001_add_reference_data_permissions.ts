/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Migration: add_reference_data_permissions
 * Created: 2026-01-09
 *
 * Add permissions for managing reference data (transaction types, payment methods, loaders)
 */

/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.up = async function ({ db }: any) {
  // Insert new permissions for reference data management
  db.exec(`
    INSERT INTO permissions (id, code, name, description, created_at)
    VALUES
      (50, 'MANAGE_TRANSACTION_TYPES', 'Manage Transaction Types', 'Can manage transaction types', CURRENT_TIMESTAMP),
      (51, 'MANAGE_PAYMENT_METHODS', 'Manage Payment Methods', 'Can manage payment methods', CURRENT_TIMESTAMP),
      (52, 'MANAGE_LOADERS', 'Manage Loaders', 'Can manage loaders', CURRENT_TIMESTAMP)
  `);

  // Assign these permissions to SUPERADMIN role
  // First, get SUPERADMIN role id
  const superadminRole = db
    .prepare("SELECT id FROM roles WHERE code = ?")
    .get("SUPERADMIN");

  if (superadminRole) {
    // Insert role-permission mappings
    const insertRolePermission = db.prepare(
      "INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)"
    );

    insertRolePermission.run(superadminRole.id, 50); // MANAGE_TRANSACTION_TYPES
    insertRolePermission.run(superadminRole.id, 51); // MANAGE_PAYMENT_METHODS
    insertRolePermission.run(superadminRole.id, 52); // MANAGE_LOADERS
  }
};

/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.down = async function ({ db }: any) {
  // Remove role-permission mappings for reference data permissions
  db.exec(`
    DELETE FROM role_permissions 
    WHERE permission_id IN (50, 51, 52)
  `);

  // Remove the permissions
  db.exec(`
    DELETE FROM permissions 
    WHERE id IN (50, 51, 52)
  `);
};
