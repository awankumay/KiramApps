erDiagram

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
        bigint created_by
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
        bigint verified_by
    }

    LOADERS {
        bigint id PK
        string name
    }

    LOADER_ASSIGNMENTS {
        bigint id PK
        bigint transaction_id FK
        bigint loader_id FK
        bigint operator_id
        string status "WAITING | ON_PROGRESS | DONE"
        datetime start_at
        datetime end_at
    }

    TRANSACTION_STATUS_LOGS {
        bigint id PK
        bigint transaction_id FK
        string status
        bigint changed_by
        datetime changed_at
        string note
    }

    GATE_LOGS {
        bigint id PK
        bigint transaction_id FK
        string gate_type "IN | OUT"
        string scan_method "QR | LPR | RFID"
        string status "SUCCESS | FAILED"
        datetime scan_at
    }

    FRAUD_FLAGS {
        bigint id PK
        bigint transaction_id FK
        string flag_type
        string description
        datetime created_at
    }

    %% RELATIONSHIPS

    CUSTOMERS ||--o{ VEHICLES : owns
    CUSTOMERS ||--o{ TRANSACTIONS : makes

    VEHICLES ||--o{ TRANSACTIONS : used_in

    TRANSACTIONS ||--o{ TRANSACTION_ITEMS : contains
    ITEMS ||--o{ TRANSACTION_ITEMS : included

    ITEMS ||--o{ PRICE_LISTS : priced_by

    TRANSACTION_TYPES ||--o{ TRANSACTIONS : categorized
    PAYMENT_METHODS ||--o{ PAYMENTS : used_by

    TRANSACTIONS ||--o{ PAYMENTS : has
    TRANSACTIONS ||--o{ LOADER_ASSIGNMENTS : processed_by
    LOADERS ||--o{ LOADER_ASSIGNMENTS : assigned

    TRANSACTIONS ||--o{ TRANSACTION_STATUS_LOGS : logged
    TRANSACTIONS ||--o{ GATE_LOGS : validated
    TRANSACTIONS ||--o{ FRAUD_FLAGS : flagged
