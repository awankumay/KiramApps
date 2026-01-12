# App Settings Specification

## Overview

Sistem konfigurasi aplikasi yang memungkinkan admin untuk mengatur berbagai pengaturan aplikasi melalui UI, termasuk konfigurasi ERP Cloud endpoint dan sync settings.

## ADDED Requirements

### Requirement: App Settings Storage

The system SHALL provide persistent storage for application settings in SQLite database using `app_settings` table.

#### Scenario: Store setting value

- **WHEN** admin sets a configuration value
- **THEN** the value is stored in database with key, value, type, and category

#### Scenario: Retrieve setting value

- **WHEN** system requests a setting by key
- **THEN** the system returns the value with appropriate type casting

#### Scenario: Setting not found

- **WHEN** system requests a non-existent setting key
- **THEN** the system returns null or default value

---

### Requirement: Settings Type Support

The system SHALL support multiple data types for settings: string, number, boolean, and json.

#### Scenario: String type setting

- **WHEN** setting type is "string"
- **THEN** the value is stored and retrieved as string

#### Scenario: Number type setting

- **WHEN** setting type is "number"
- **THEN** the value is stored as string and retrieved as parsed number

#### Scenario: Boolean type setting

- **WHEN** setting type is "boolean"
- **THEN** the value is stored as "0" or "1" and retrieved as boolean

#### Scenario: JSON type setting

- **WHEN** setting type is "json"
- **THEN** the value is stored as JSON string and retrieved as parsed object

---

### Requirement: ERP Settings Management

The system SHALL provide specific settings for ERP Cloud configuration.

#### Scenario: Configure ERP API URL

- **WHEN** admin sets `erp_api_url` setting
- **THEN** the URL is validated and stored
- **AND** ERPClient uses this URL for API calls

#### Scenario: Invalid URL validation

- **WHEN** admin enters invalid URL format
- **THEN** the system shows validation error
- **AND** the setting is not saved

#### Scenario: Test ERP connection

- **WHEN** admin clicks "Test Connection" button
- **THEN** the system attempts to connect to ERP API
- **AND** displays connection status (success/failure) with latency

---

### Requirement: Sync Settings Management

The system SHALL provide settings for data synchronization behavior.

#### Scenario: Enable/disable auto sync

- **WHEN** admin toggles `sync_enabled` setting
- **THEN** automatic sync is enabled or disabled accordingly

#### Scenario: Configure sync interval

- **WHEN** admin sets `sync_interval_minutes` setting
- **THEN** auto sync runs at the specified interval (minimum 1 minute)

#### Scenario: Configure batch size

- **WHEN** admin sets `sync_batch_size` setting
- **THEN** sync operations use the specified batch size for bulk operations

---

### Requirement: Settings UI Access Control

The system SHALL restrict settings management to SUPERADMIN role only.

#### Scenario: Superadmin access settings page

- **WHEN** user with SUPERADMIN role navigates to settings
- **THEN** the settings page is displayed with all options

#### Scenario: Non-superadmin access denied

- **WHEN** user without SUPERADMIN role attempts to access settings
- **THEN** the user is redirected or shown access denied message

---

### Requirement: Settings Change Audit

The system SHALL log all settings changes for audit purposes.

#### Scenario: Setting value changed

- **WHEN** admin changes a setting value
- **THEN** the `updated_at` timestamp is updated
- **AND** the change is logged in audit trail

#### Scenario: View settings history

- **WHEN** admin views settings
- **THEN** the last updated timestamp is visible for each setting
