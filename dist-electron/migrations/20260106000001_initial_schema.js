"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Migration: Initial Database Schema
 * Created: 2026-01-06
 */
/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.up = async function ({ db }) {
    // Create auth_sessions table
    db.exec(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      email TEXT,
      first_name TEXT,
      last_name TEXT,
      access_token_encrypted BLOB NOT NULL,
      refresh_token_encrypted BLOB NOT NULL,
      token_expiry DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_refreshed_at DATETIME,
      is_active INTEGER DEFAULT 1
    )
  `);
    // Create auth_events table for audit logging
    db.exec(`
    CREATE TABLE IF NOT EXISTS auth_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      user_id INTEGER,
      username TEXT,
      success INTEGER NOT NULL,
      error_message TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // Create auth session indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_auth_sessions_is_active ON auth_sessions(is_active)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_auth_events_user_id ON auth_events(user_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_auth_events_created_at ON auth_events(created_at)`);
    // Create users table for local user management
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // Create user indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)`);
    // Create items table
    db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // Create item_price_history table
    db.exec(`
    CREATE TABLE IF NOT EXISTS item_price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      old_price REAL,
      new_price REAL NOT NULL,
      changed_by INTEGER,
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )
  `);
    // Create item indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_items_name ON items(name)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_items_is_active ON items(is_active)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_price_history_item_id ON item_price_history(item_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_price_history_changed_at ON item_price_history(changed_at)`);
    // Create customers table
    db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('PERSONAL', 'COMPANY')),
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // Create vehicles table
    db.exec(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plate_number TEXT NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
    )
  `);
    // Create customer and vehicle indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_customers_category ON customers(category)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_vehicles_plate_number ON vehicles(plate_number)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON vehicles(customer_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_vehicles_is_active ON vehicles(is_active)`);
    // Create RBAC tables
    db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    db.exec(`
    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    db.exec(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id INTEGER NOT NULL,
      permission_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (role_id, permission_id),
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    )
  `);
    db.exec(`
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id INTEGER NOT NULL,
      role_id INTEGER NOT NULL,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, role_id),
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
    )
  `);
    // Create RBAC indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id)`);
};
/**
 * @param {{ db: import('better-sqlite3').Database }} context
 */
module.exports.down = async function ({ db }) {
    // Drop tables in reverse order (due to foreign key constraints)
    db.exec(`DROP TABLE IF EXISTS user_roles`);
    db.exec(`DROP TABLE IF EXISTS role_permissions`);
    db.exec(`DROP TABLE IF EXISTS permissions`);
    db.exec(`DROP TABLE IF EXISTS roles`);
    db.exec(`DROP TABLE IF EXISTS vehicles`);
    db.exec(`DROP TABLE IF EXISTS customers`);
    db.exec(`DROP TABLE IF EXISTS item_price_history`);
    db.exec(`DROP TABLE IF EXISTS items`);
    db.exec(`DROP TABLE IF EXISTS users`);
    db.exec(`DROP TABLE IF EXISTS auth_events`);
    db.exec(`DROP TABLE IF EXISTS auth_sessions`);
};
