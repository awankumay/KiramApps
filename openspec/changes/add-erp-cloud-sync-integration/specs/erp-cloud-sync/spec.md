# ERP Cloud Sync Specification

## Overview

Sistem sinkronisasi data antara aplikasi kiram-site (Electron + SQLite) dan ERP Cloud (Laravel 12). Mendukung sync dua arah untuk data master dan sync satu arah untuk data transaksi.

## ADDED Requirements

### Requirement: Sync Service Architecture

The system SHALL implement a layered sync architecture with SyncService and SyncManager.

#### Scenario: SyncService handles API calls

- **WHEN** sync operation is triggered
- **THEN** SyncService makes HTTP calls to ERP Cloud API
- **AND** handles responses and errors appropriately

#### Scenario: SyncManager orchestrates sync

- **WHEN** sync is needed
- **THEN** SyncManager coordinates queue, retry, and scheduling
- **AND** tracks online/offline status

---

### Requirement: Push Sync to ERP Cloud

The system SHALL push local changes to ERP Cloud.

#### Scenario: Push single record

- **WHEN** data is created/updated/deleted locally
- **THEN** the system pushes the change to ERP Cloud via `POST /api/sync/push`
- **AND** logs the sync operation in `sync_logs` table

#### Scenario: Push batch records

- **WHEN** multiple records need syncing
- **THEN** the system batches them into single `POST /api/sync/push-batch` request
- **AND** handles partial failures in batch

#### Scenario: Push failure handling

- **WHEN** push request fails (network error, API error)
- **THEN** the record is added to retry queue
- **AND** status is marked as "failed" in sync_logs

---

### Requirement: Pull Sync from ERP Cloud

The system SHALL pull changes from ERP Cloud to local database.

#### Scenario: Pull with timestamp filter

- **WHEN** sync pull is triggered with `since` timestamp
- **THEN** only records updated after that timestamp are fetched

#### Scenario: Pull all records

- **WHEN** sync pull is triggered without timestamp (initial sync)
- **THEN** all records for the entity type are fetched

#### Scenario: Apply pulled changes

- **WHEN** records are pulled from ERP
- **THEN** local database is updated with the changes
- **AND** `synced_at` column is updated

---

### Requirement: Bidirectional Customer Sync

The system SHALL sync customers bidirectionally between Electron and ERP Cloud.

#### Scenario: Customer created locally

- **WHEN** customer is created in kiram-site
- **THEN** the customer is pushed to ERP Cloud
- **AND** ERP Cloud creates corresponding record

#### Scenario: Customer updated in ERP Cloud

- **WHEN** customer is updated in ERP Cloud
- **THEN** the change is pulled to kiram-site on next sync
- **AND** local customer record is updated

#### Scenario: Customer conflict resolution

- **WHEN** same customer is modified in both systems
- **THEN** last-write-wins strategy is applied using `updated_at` timestamp

---

### Requirement: Unidirectional Transaction Sync

The system SHALL sync transactions one-way from Electron to ERP Cloud.

#### Scenario: Transaction created

- **WHEN** transaction is created in kiram-site
- **THEN** transaction with all items and vehicles is pushed to ERP Cloud
- **AND** ERP Cloud creates read-only record

#### Scenario: Transaction status updated

- **WHEN** transaction status changes (QUEUED → LOADING → DONE)
- **THEN** the status change is pushed to ERP Cloud

#### Scenario: Transaction items sync

- **WHEN** transaction items are added
- **THEN** items are included in transaction sync payload

---

### Requirement: Bidirectional Payment Verification Sync

The system SHALL sync payment verifications bidirectionally.

#### Scenario: Payment created locally

- **WHEN** payment is recorded in kiram-site
- **THEN** payment record is pushed to ERP Cloud

#### Scenario: Payment verified in ERP Cloud

- **WHEN** admin verifies payment in ERP Cloud
- **THEN** verification status is pulled to kiram-site
- **AND** local payment status is updated to VERIFIED

#### Scenario: Payment rejected in ERP Cloud

- **WHEN** admin rejects payment in ERP Cloud
- **THEN** rejection with reason is pulled to kiram-site
- **AND** local payment status is updated to REJECTED

---

### Requirement: Unidirectional Loader Queue Sync

The system SHALL sync loader queue one-way from Electron to ERP Cloud.

#### Scenario: Loader task queued

- **WHEN** vehicle is added to loader queue
- **THEN** task is pushed to ERP Cloud for monitoring

#### Scenario: Loader task completed

- **WHEN** loader task is marked complete
- **THEN** completion status is pushed to ERP Cloud

---

### Requirement: Sync Queue and Retry

The system SHALL maintain a sync queue with retry mechanism for failed operations.

#### Scenario: Failed sync added to queue

- **WHEN** sync operation fails
- **THEN** operation is added to retry queue
- **AND** retry_count is incremented

#### Scenario: Retry on reconnect

- **WHEN** network connection is restored
- **THEN** pending items in queue are retried
- **AND** successful items are removed from queue

#### Scenario: Maximum retry limit

- **WHEN** sync fails more than 5 times
- **THEN** status is marked as "permanently_failed"
- **AND** admin notification is triggered

---

### Requirement: Sync Logging

The system SHALL log all sync operations in `sync_logs` table.

#### Scenario: Log successful sync

- **WHEN** sync operation completes successfully
- **THEN** log entry is created with status "completed"
- **AND** `completed_at` timestamp is recorded

#### Scenario: Log failed sync

- **WHEN** sync operation fails
- **THEN** log entry is created with status "failed"
- **AND** error_message is recorded

#### Scenario: Query sync logs

- **WHEN** admin views sync dashboard
- **THEN** logs can be filtered by entity_type, status, direction, date range

---

### Requirement: Sync Status Monitoring

The system SHALL provide real-time sync status monitoring.

#### Scenario: Online status indicator

- **WHEN** application has network connectivity
- **THEN** status indicator shows "Online"
- **AND** last sync timestamp is displayed

#### Scenario: Offline status indicator

- **WHEN** application loses network connectivity
- **THEN** status indicator shows "Offline"
- **AND** pending sync count is displayed

#### Scenario: Sync statistics

- **WHEN** admin views sync dashboard
- **THEN** statistics are displayed: total syncs, success rate, pending, failed

---

### Requirement: Manual Sync Trigger

The system SHALL allow manual sync triggering by admin.

#### Scenario: Sync all entities

- **WHEN** admin clicks "Sync All" button
- **THEN** sync is triggered for all entity types
- **AND** progress indicator is shown

#### Scenario: Sync specific entity

- **WHEN** admin selects entity type and clicks sync
- **THEN** only that entity type is synced

#### Scenario: Retry failed syncs

- **WHEN** admin clicks "Retry" on failed sync item
- **THEN** the specific sync operation is retried

---

### Requirement: Scheduled Auto Sync

The system SHALL support scheduled automatic synchronization.

#### Scenario: Auto sync enabled

- **WHEN** `sync_enabled` setting is true
- **THEN** sync runs automatically at configured interval

#### Scenario: Sync on startup

- **WHEN** application starts and `sync_on_startup` is true
- **THEN** full sync is triggered after authentication

#### Scenario: Auto sync disabled

- **WHEN** `sync_enabled` setting is false
- **THEN** no automatic sync occurs
- **AND** only manual sync is available
