import { createHash } from "crypto";
/**
 * Migration: Seed Initial Data
 * Created: 2026-01-06
 *
 * Seeds initial data including items, customers, vehicles, RBAC roles/permissions, and users
 */
/**
 * Hash password using SHA256 (same as AuthManager)
 */
function hashPassword(password) {
    return createHash("sha256").update(password).digest("hex");
}
export async function up({ db }) {
    // Seed dummy items data
    db.exec(`INSERT OR IGNORE INTO items (name, unit, price, is_active) VALUES ('Pasir', 'm³', 150000, 1)`);
    db.exec(`INSERT OR IGNORE INTO items (name, unit, price, is_active) VALUES ('Batu Split', 'm³', 250000, 1)`);
    db.exec(`INSERT OR IGNORE INTO items (name, unit, price, is_active) VALUES ('Batu Kali', 'm³', 200000, 1)`);
    // Seed dummy customer data
    db.exec(`INSERT OR IGNORE INTO customers (name, category, is_active) VALUES ('PT Logistics Indonesia', 'COMPANY', 1)`);
    db.exec(`INSERT OR IGNORE INTO customers (name, category, is_active) VALUES ('PT Transport Jaya', 'COMPANY', 1)`);
    db.exec(`INSERT OR IGNORE INTO customers (name, category, is_active) VALUES ('Budi Santoso', 'PERSONAL', 1)`);
    db.exec(`INSERT OR IGNORE INTO customers (name, category, is_active) VALUES ('Ahmad Hidayat', 'PERSONAL', 1)`);
    // Seed dummy vehicle data
    db.exec(`INSERT OR IGNORE INTO vehicles (plate_number, customer_id, is_active) VALUES ('B 1234 ABC', 1, 1)`);
    db.exec(`INSERT OR IGNORE INTO vehicles (plate_number, customer_id, is_active) VALUES ('B 5678 XYZ', 1, 1)`);
    db.exec(`INSERT OR IGNORE INTO vehicles (plate_number, customer_id, is_active) VALUES ('B 9012 DEF', 2, 1)`);
    db.exec(`INSERT OR IGNORE INTO vehicles (plate_number, customer_id, is_active) VALUES ('B 3456 GHI', 3, 1)`);
    db.exec(`INSERT OR IGNORE INTO vehicles (plate_number, customer_id, is_active) VALUES ('B 7890 JKL', 4, 1)`);
    // Seed RBAC roles
    db.exec(`INSERT OR IGNORE INTO roles (code, name, description) VALUES ('SUPERADMIN', 'Super Administrator', 'Full system access')`);
    db.exec(`INSERT OR IGNORE INTO roles (code, name, description) VALUES ('CHECKER', 'Checker', 'Transaction input and verification')`);
    db.exec(`INSERT OR IGNORE INTO roles (code, name, description) VALUES ('LOADER', 'Operator Loader', 'Loader operation only')`);
    // Seed RBAC permissions
    const permissions = [
        ["VIEW_DASHBOARD", "View Dashboard", "Access dashboard"],
        ["CREATE_TRANSACTION", "Create Transaction", "Create new transactions"],
        ["VIEW_TRANSACTION", "View Transaction", "View transaction details"],
        ["EDIT_TRANSACTION", "Edit Transaction", "Edit transactions"],
        ["DELETE_TRANSACTION", "Delete Transaction", "Delete transactions"],
        [
            "MANAGE_TRANSACTION_STATUS",
            "Manage Transaction Status",
            "Update transaction status",
        ],
        ["VERIFY_PAYMENT", "Verify Payment", "Verify payment submissions"],
        ["VIEW_LOADER_QUEUE", "View Loader Queue", "View loader assignment queue"],
        [
            "UPDATE_LOADER_STATUS",
            "Update Loader Status",
            "Update loader assignment status",
        ],
        ["MANAGE_USERS", "Manage Users", "Create, edit, delete users"],
        ["MANAGE_ROLES", "Manage Roles", "Manage roles and permissions"],
        ["MANAGE_ITEMS", "Manage Items", "Create, edit, delete items"],
        ["MANAGE_CUSTOMERS", "Manage Customers", "Create, edit, delete customers"],
        ["MANAGE_VEHICLES", "Manage Vehicles", "Create, edit, delete vehicles"],
        ["VIEW_REPORTS", "View Reports", "Access system reports"],
    ];
    const insertPermission = db.prepare(`INSERT OR IGNORE INTO permissions (code, name, description) VALUES (?, ?, ?)`);
    for (const [code, name, description] of permissions) {
        insertPermission.run(code, name, description);
    }
    // Seed local users with encrypted passwords
    const insertUser = db.prepare(`INSERT OR IGNORE INTO users (id, username, email, password_hash, first_name, last_name, status) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    // User: superadmin | Password: password123 | Role: SUPERADMIN
    insertUser.run(1, "superadmin", "superadmin@example.com", hashPassword("password123"), "Administrator", "System", "active");
    // User: checker1 | Password: checker123 | Role: CHECKER
    insertUser.run(7, "checker1", "checker1@example.com", hashPassword("checker123"), "John", "Checker", "active");
    // User: loader1 | Password: loader123 | Role: LOADER
    insertUser.run(8, "loader1", "loader1@example.com", hashPassword("loader123"), "Mike", "Loader", "active");
    // DummyJSON Users (for API authentication only)
    const insertDummyUser = db.prepare(`INSERT OR IGNORE INTO users (id, username, email, first_name, last_name, status) VALUES (?, ?, ?, ?, ?, ?)`);
    insertDummyUser.run(2, "emilys", "emily.johnson@x.dummyjson.com", "Emily", "Johnson", "active");
    insertDummyUser.run(3, "michaelw", "michael.williams@x.dummyjson.com", "Michael", "Williams", "active");
    insertDummyUser.run(4, "sophiab", "sophia.brown@x.dummyjson.com", "Sophia", "Brown", "active");
    insertDummyUser.run(5, "jamesd", "james.davis@x.dummyjson.com", "James", "Davis", "inactive");
    insertDummyUser.run(6, "emmaw", "emma.wilson@x.dummyjson.com", "Emma", "Wilson", "active");
    // Seed role-permission mappings
    // SUPERADMIN gets all permissions
    db.exec(`
    INSERT OR IGNORE INTO role_permissions (role_id, permission_id) 
    SELECT r.id, p.id FROM roles r, permissions p WHERE r.code = 'SUPERADMIN'
  `);
    // CHECKER permissions
    db.exec(`
    INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p
    WHERE r.code = 'CHECKER' AND p.code IN ('VIEW_DASHBOARD', 'CREATE_TRANSACTION', 'VIEW_TRANSACTION', 'EDIT_TRANSACTION', 'DELETE_TRANSACTION', 'MANAGE_TRANSACTION_STATUS', 'VERIFY_PAYMENT')
  `);
    // LOADER permissions
    db.exec(`
    INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p
    WHERE r.code = 'LOADER' AND p.code IN ('VIEW_DASHBOARD', 'VIEW_LOADER_QUEUE', 'UPDATE_LOADER_STATUS')
  `);
    // Seed user-role assignments
    db.exec(`INSERT OR IGNORE INTO user_roles (user_id, role_id) SELECT 1, id FROM roles WHERE code = 'SUPERADMIN'`);
    db.exec(`INSERT OR IGNORE INTO user_roles (user_id, role_id) SELECT 2, id FROM roles WHERE code = 'CHECKER'`);
    db.exec(`INSERT OR IGNORE INTO user_roles (user_id, role_id) SELECT 3, id FROM roles WHERE code = 'LOADER'`);
    db.exec(`INSERT OR IGNORE INTO user_roles (user_id, role_id) SELECT 7, id FROM roles WHERE code = 'CHECKER'`);
    db.exec(`INSERT OR IGNORE INTO user_roles (user_id, role_id) SELECT 8, id FROM roles WHERE code = 'LOADER'`);
    console.log("✅ Seeded initial data:");
    console.log("   - 3 items (Pasir, Batu Split, Batu Kali)");
    console.log("   - 4 customers");
    console.log("   - 5 vehicles");
    console.log("   - 3 roles (SUPERADMIN, CHECKER, LOADER)");
    console.log("   - 15 permissions");
    console.log("   - Test users:");
    console.log("     • superadmin / password123 (SUPERADMIN)");
    console.log("     • checker1 / checker123 (CHECKER)");
    console.log("     • loader1 / loader123 (LOADER)");
}
export async function down({ db }) {
    // Remove seeded data (in reverse order)
    db.exec(`DELETE FROM user_roles`);
    db.exec(`DELETE FROM role_permissions`);
    db.exec(`DELETE FROM users`);
    db.exec(`DELETE FROM permissions`);
    db.exec(`DELETE FROM roles`);
    db.exec(`DELETE FROM vehicles`);
    db.exec(`DELETE FROM customers`);
    db.exec(`DELETE FROM items`);
}
