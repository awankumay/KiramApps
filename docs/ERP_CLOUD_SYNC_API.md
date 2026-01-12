# ERP Cloud Sync System - API Documentation

This document describes the API endpoints for the ERP Cloud Sync System that synchronizes data between the ERP Cloud (Laravel) and Electron (Kiram-Site) applications.

## Authentication

All API endpoints require authentication via the custom API middleware (`auth.api`). Include the bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

For device identification, include the `X-Device-ID` header:

```
X-Device-ID: <device_identifier>
```

---

## Sync Operations

### Push Single Record

Push a single record from Electron to ERP Cloud.

**Endpoint:** `POST /api/sync/push`

**Request Body:**

```json
{
  "entity_type": "customer",
  "action": "create|update|delete",
  "data": {
    "sync_id": "uuid",
    "code": "CUST001",
    "name": "Customer Name",
    ...
  }
}
```

**Entity Types:**

- `customer` - Customer master data (bidirectional sync) - Simplified: code, name, category, is_active
- `transaction` - Transaction header (unidirectional: Electron → ERP)
- `transaction_item` - Transaction line items
- `transaction_vehicle` - Transaction vehicle info
- `transaction_payment` - Payment records with integrated verification
- `loader_queue` - Loader queue entries

**Response:**

```json
{
  "success": true,
  "sync_id": "uuid",
  "entity_id": 123,
  "action": "create",
  "message": "Sync completed successfully"
}
```

---

### Push Batch Records

Push multiple records in a single request.

**Endpoint:** `POST /api/sync/push-batch`

**Request Body:**

```json
{
  "items": [
    {
      "entity_type": "customer",
      "action": "create",
      "data": { ... }
    },
    {
      "entity_type": "transaction",
      "action": "create",
      "data": { ... }
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "total": 2,
  "processed": 2,
  "failed": 0,
  "results": [
    { "success": true, "sync_id": "...", "entity_id": 1 },
    { "success": true, "sync_id": "...", "entity_id": 2 }
  ]
}
```

---

### Pull Records

Fetch records from ERP Cloud to Electron.

**Endpoint:** `GET /api/sync/pull`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| entity_type | string | Yes | Entity type to pull |
| since | datetime | No | Only fetch records updated after this timestamp |
| page | integer | No | Page number (default: 1) |
| per_page | integer | No | Records per page (default: 50, max: 100) |

**Response:**

```json
{
  "success": true,
  "entity_type": "customer",
  "data": [...],
  "pagination": {
    "current_page": 1,
    "last_page": 5,
    "per_page": 50,
    "total": 245
  }
}
```

---

### Get Sync Status

Check status of a sync operation.

**Endpoint:** `GET /api/sync/status`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sync_id | uuid | No | Specific sync operation ID |
| entity_type | string | No | Filter by entity type |
| entity_id | integer | No | Filter by entity ID |

**Response:**

```json
{
  "success": true,
  "sync_status": "completed",
  "synced_at": "2026-01-10T12:00:00+00:00",
  "error": null
}
```

---

### Get Sync Logs

Retrieve sync operation logs.

**Endpoint:** `GET /api/sync/logs`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| entity_type | string | No | Filter by entity type |
| sync_status | string | No | Filter by status (pending, processing, completed, failed) |
| sync_direction | string | No | Filter by direction (push, pull) |
| from_date | date | No | Filter logs from this date |
| to_date | date | No | Filter logs until this date |
| page | integer | No | Page number |
| per_page | integer | No | Records per page (max: 100) |

---

### Get Sync Statistics

Get sync operation statistics.

**Endpoint:** `GET /api/sync/stats`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| period | string | day | Statistics period (day, week, month) |

**Response:**

```json
{
  "success": true,
  "period": "day",
  "start_date": "2026-01-10T00:00:00+00:00",
  "stats": {
    "total": 150,
    "completed": 145,
    "failed": 3,
    "pending": 2,
    "success_rate": 96.67,
    "by_entity": {
      "customer": 50,
      "transaction": 100
    },
    "by_sync_direction": {
      "push": 120,
      "pull": 30
    }
  }
}
```

---

## Customers API

### List Customers

**Endpoint:** `GET /api/customers`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| search | string | Search by name, code |
| category | string | Filter by category (PERSONAL, COMPANY) |
| is_active | boolean | Filter by status (true, false) |
| sort_by | string | Sort field (default: name) |
| sort_order | string | Sort order (asc, desc) |
| per_page | integer | Records per page |

### Get Customer

**Endpoint:** `GET /api/customers/{id}`

### Create Customer

**Endpoint:** `POST /api/customers`

**Request Body:**

```json
{
  "code": "CUST001",
  "name": "Customer Name",
  "category": "PERSONAL",
  "is_active": true
}
```

**Field Descriptions:**

- `code` (required, string, max:50) - Unique customer code
- `name` (required, string, max:255) - Customer name
- `category` (required, enum) - PERSONAL or COMPANY
- `is_active` (required, boolean) - Active status

### Update Customer

**Endpoint:** `PUT /api/customers/{id}`

### Delete Customer

**Endpoint:** `DELETE /api/customers/{id}`

### Get Customer Changes (for sync)

**Endpoint:** `GET /api/customers/sync-changes`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| since | datetime | Get changes since this timestamp |
| page | integer | Page number |
| per_page | integer | Records per page |

---

## Transactions API

### List Transactions

**Endpoint:** `GET /api/transactions`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| search | string | Search by transaction_number, reference_number, customer name |
| status | string | Filter by status |
| payment_status | string | Filter by payment status |
| transaction_type | string | Filter by type (sale, purchase, return) |
| customer_id | integer | Filter by customer |
| from_date | date | Filter from date |
| to_date | date | Filter to date |

### Get Transaction

**Endpoint:** `GET /api/transactions/{id}`

Returns transaction with all relations (items, vehicles, payments, status logs).

### Get Daily Statistics

**Endpoint:** `GET /api/transactions/daily-stats`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| date | date | today | Date to get stats for |

### Generate Reports

- Daily Report: `GET /api/transactions/daily-report?date=2026-01-10`
- Weekly Report: `GET /api/transactions/weekly-report?date=2026-01-10`
- Monthly Report: `GET /api/transactions/monthly-report?month=2026-01`

---

## Transaction Items API

### List Transaction Items

**Endpoint:** `GET /api/transaction-items`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| transaction_id | integer | Filter by transaction |
| item_id | integer | Filter by item |
| search | string | Search by item code or name |

### Get Transaction Item

**Endpoint:** `GET /api/transaction-items/{id}`

---

## Transaction Vehicles API

### List Transaction Vehicles

**Endpoint:** `GET /api/transaction-vehicles`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| transaction_id | integer | Filter by transaction |
| vehicle_id | integer | Filter by vehicle |
| license_plate | string | Filter by license plate |

### Get Transaction Vehicle

**Endpoint:** `GET /api/transaction-vehicles/{id}`

---

## Transaction Payments API

### List Payments

**Endpoint:** `GET /api/transaction-payments`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| transaction_id | integer | Filter by transaction |
| verification_status | string | Filter by verification status (PENDING, VERIFIED, REJECTED) |
| payment_method | string | Filter by method |
| from_date | date | Filter from date |
| to_date | date | Filter to date |

### Get Payment

**Endpoint:** `GET /api/transaction-payments/{id}`

### Verify Payment

**Endpoint:** `POST /api/transaction-payments/{id}/verify`

**Request Body:**

```json
{
  "notes": "Verified via bank statement"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Payment verified successfully",
  "payment": {
    "id": 123,
    "verification_status": "VERIFIED",
    "verified_by": 1,
    "proof_last_verified": "2026-01-10T12:00:00+00:00"
  }
}
```

### Reject Payment

**Endpoint:** `POST /api/transaction-payments/{id}/reject`

**Request Body:**

```json
{
  "rejection_reason": "Amount mismatch with bank statement"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Payment rejected",
  "payment": {
    "id": 123,
    "verification_status": "REJECTED",
    "verified_by": 1,
    "rejection_reason": "Amount mismatch with bank statement",
    "proof_last_verified": "2026-01-10T12:00:00+00:00"
  }
}
```

### Get Payment Proof

**Endpoint:** `GET /api/transaction-payments/{id}/proof`

Returns temporary URL to the payment proof file.

### Get Payment Statistics

**Endpoint:** `GET /api/transaction-payments/stats`

**Response:**

```json
{
  "success": true,
  "stats": {
    "total": 150,
    "pending": 45,
    "verified": 95,
    "rejected": 10,
    "total_amount_pending": 45000000,
    "total_amount_verified": 95000000,
    "verification_rate": 63.33
  }
}
```

---

## ~~Payment Verifications API~~ (DEPRECATED)

**Note:** Payment verification functionality has been integrated into the Transaction Payments API.
Use the following endpoints instead:

- Verify: `POST /api/transaction-payments/{id}/verify`
- Reject: `POST /api/transaction-payments/{id}/reject`
- Statistics: `GET /api/transaction-payments/stats`

See [Transaction Payments API](#transaction-payments-api) section above.

---

## Loader Queue API

### List Queue Entries

**Endpoint:** `GET /api/loader-queue`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status (waiting, loading, loaded, departed, cancelled) |
| transaction_id | integer | Filter by transaction |
| vehicle_id | integer | Filter by vehicle |
| from_date | datetime | Filter from date |
| to_date | datetime | Filter to date |
| today | boolean | Show only today's entries |

### Get Queue Entry

**Endpoint:** `GET /api/loader-queue/{id}`

### Get Queue Statistics

**Endpoint:** `GET /api/loader-queue/stats`

Returns statistics including average wait times and loading times.

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": {
    "field": ["Validation error message"]
  }
}
```

**HTTP Status Codes:**

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `422` - Validation Error
- `500` - Server Error

---

## Artisan Commands

The following artisan commands are available for managing sync operations:

```bash
# Process pending sync queue
php artisan sync:process

# Show sync queue status
php artisan sync:status

# Retry failed sync operations
php artisan sync:retry --limit=50

# Clean up old sync logs
php artisan sync:cleanup --days=90

# Dry run cleanup (show what would be deleted)
php artisan sync:cleanup --dry-run
```

---

## Configuration

See `config/sync.php` for all available configuration options. Key environment variables:

```env
SYNC_INTERVAL_MINUTES=5
SYNC_BATCH_SIZE=100
SYNC_MAX_RETRIES=3
SYNC_LOG_RETENTION_DAYS=90
SYNC_ELECTRON_INSTANCES=[]
```
