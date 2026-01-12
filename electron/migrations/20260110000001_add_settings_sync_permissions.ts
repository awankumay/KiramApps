/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Migration: add_settings_sync_permissions
 * Created: 2026-01-10
 *
 * Add permissions for managing settings and sync features
 */

/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.up = async function ({ db }: any) {
  // Insert new permissions for settings and sync management
  db.exec(`
    INSERT INTO permissions (id, code, name, description, created_at)
    VALUES
      (53, 'MANAGE_SETTINGS', 'Manage Settings', 'Can manage application settings', CURRENT_TIMESTAMP),
      (54, 'MANAGE_SYNC', 'Manage Sync', 'Can manage ERP sync and view sync dashboard', CURRENT_TIMESTAMP)
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

    insertRolePermission.run(superadminRole.id, 53); // MANAGE_SETTINGS
    insertRolePermission.run(superadminRole.id, 54); // MANAGE_SYNC
  }
};

/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.down = async function ({ db }: any) {
  // Remove role-permission mappings for settings and sync permissions
  db.exec(`
    DELETE FROM role_permissions 
    WHERE permission_id IN (53, 54)
  `);

  // Remove the permissions
  db.exec(`
    DELETE FROM permissions 
    WHERE id IN (53, 54)
  `);
};
