erDiagram

    %% ======================
    %% USER & ACCESS CONTROL
    %% ======================

    USERS {
        bigint id PK
        string name
        string username
        boolean is_active
        datetime created_at
    }

    ROLES {
        bigint id PK
        string name
    }

    USER_ROLES {
        bigint user_id FK
        bigint role_id FK
    }

    %% ======================
    %% CUSTOMER & VEHICLE
    %% ======================

    CUSTOMERS {
        bigint id PK
        string name
        string category "PERSONAL | COMPANY"
        boolean is_active
        datetime created_at
    }

    VEHICLES {
        bigint id PK
        string plate_number "UNIQUE"
        bigint customer_id FK
        boolean is_active
        datetime created_at
    }

    %% ======================
    %% ITEM & PRICING
    %% ======================

    ITEMS {
        bigint id PK
        string name
        string unit
        boolean is_active
    }

    PRICE_LISTS {
        bigint id PK
        bigint item_id FK
        int min_qty
        int max_qty
        decimal price
        date effective_date
    }

    %% ======================
    %% TRANSACTION CORE
    %% ======================

    TRANSACTION_TYPES {
        bigint id PK
        string name
    }

    PAYMENT_METHODS {
        bigint id PK
        string name
    }

    TRANSACTIONS {
        bigint id PK
        string invoice_number
        bigint transaction_type_id FK
        bigint customer_id FK
        bigint vehicle_id FK
        decimal total_amount
        string payment_status "UNPAID | PAID"
        string transaction_status "CREATED | QUEUED | LOADING | DONE | CHECKED_OUT"
        bigint created_by FK
        datetime created_at
    }

    TRANSACTION_ITEMS {
        bigint id PK
        bigint transaction_id FK
        bigint item_id FK
        int qty
        decimal price
        decimal subtotal
    }

    PAYMENTS {
        bigint id PK
        bigint transaction_id FK
        bigint payment_method_id FK
        decimal amount
        string status "PENDING | PAID"
        datetime paid_at
        bigint verified_by FK
    }

    %% ======================
    %% LOADER OPERATION
    %% ======================

    LOADERS {
        bigint id PK
        string name
    }

    LOADER_ASSIGNMENTS {
        bigint id PK
        bigint transaction_id FK
        bigint loader_id FK
        bigint operator_id FK
        string status "WAITING | ON_PROGRESS | DONE"
        datetime start_at
        datetime end_at
    }

    %% ======================
    %% GATE & AUDIT
    %% ======================

    GATE_LOGS {
        bigint id PK
        bigint transaction_id FK
        string gate_type "IN | OUT"
        string scan_method "QR | LPR | RFID"
        string status "SUCCESS | FAILED"
        datetime scan_at
    }

    TRANSACTION_STATUS_LOGS {
        bigint id PK
        bigint transaction_id FK
        string status
        bigint changed_by FK
        datetime changed_at
        string note
    }

    FRAUD_FLAGS {
        bigint id PK
        bigint transaction_id FK
        string flag_type
        string description
        datetime created_at
    }

    %% ======================
    %% OFFLINE SYNC LAYER
    %% ======================

    DEVICES {
        string device_id PK
        string device_name
        string location
        string device_type "GATE | CHECKER | LOADER"
        datetime registered_at
        datetime last_seen_at
        boolean is_active
    }

    LOCAL_USERS {
        bigint id PK
        bigint erp_user_id
        string name
        string role_code
        boolean is_active
        datetime last_sync_at
    }

    SYNC_JOBS {
        bigint id PK
        string job_type "PUSH | PULL"
        string entity_name
        datetime started_at
        datetime finished_at
        string status "SUCCESS | FAILED | PARTIAL"
    }

    SYNC_QUEUE {
        bigint id PK
        string entity_name
        bigint entity_id
        string operation "CREATE | UPDATE"
        string sync_status "PENDING | SUCCESS | FAILED"
        int retry_count
        datetime last_attempt_at
    }

    SYNC_LOGS {
        bigint id PK
        string entity_name
        bigint entity_id
        string direction "LOCAL_TO_ERP | ERP_TO_LOCAL"
        string status "SUCCESS | FAILED"
        string error_message
        datetime synced_at
    }

    ID_MAPPINGS {
        bigint id PK
        string entity_name
        bigint local_id
        bigint erp_id
        datetime created_at
    }

    %% ======================
    %% RELATIONSHIPS
    %% ======================

    USERS ||--o{ USER_ROLES : has
    ROLES ||--o{ USER_ROLES : assigned

    USERS ||--o{ TRANSACTIONS : creates
    USERS ||--o{ PAYMENTS : verifies
    USERS ||--o{ LOADER_ASSIGNMENTS : operates
    USERS ||--o{ TRANSACTION_STATUS_LOGS : changes

    CUSTOMERS ||--o{ VEHICLES : owns
    CUSTOMERS ||--o{ TRANSACTIONS : makes
    VEHICLES ||--o{ TRANSACTIONS : used_in

    ITEMS ||--o{ PRICE_LISTS : priced_by
    ITEMS ||--o{ TRANSACTION_ITEMS : included
    TRANSACTIONS ||--o{ TRANSACTION_ITEMS : contains

    TRANSACTION_TYPES ||--o{ TRANSACTIONS : categorized
    PAYMENT_METHODS ||--o{ PAYMENTS : used_by
    TRANSACTIONS ||--o{ PAYMENTS : has

    LOADERS ||--o{ LOADER_ASSIGNMENTS : assigned
    TRANSACTIONS ||--o{ LOADER_ASSIGNMENTS : processed_by

    TRANSACTIONS ||--o{ TRANSACTION_STATUS_LOGS : logged
    TRANSACTIONS ||--o{ GATE_LOGS : validated
    TRANSACTIONS ||--o{ FRAUD_FLAGS : flagged

    DEVICES ||--o{ SYNC_JOBS : triggers
    SYNC_JOBS ||--o{ SYNC_QUEUE : contains
    SYNC_QUEUE ||--o{ SYNC_LOGS : logs

    TRANSACTIONS ||--o{ SYNC_QUEUE : queued
    TRANSACTIONS ||--o{ SYNC_LOGS : synced

    ID_MAPPINGS ||--|| TRANSACTIONS : maps
    ID_MAPPINGS ||--|| LOCAL_USERS : maps
