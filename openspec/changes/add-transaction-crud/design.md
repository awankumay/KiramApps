# Design: Transaction CRUD Architecture

## Overview

Dokumen ini menjelaskan arsitektur teknis untuk fitur Transaction CRUD, termasuk pattern yang digunakan, data flow, dan integrasi dengan komponen existing.

## Architecture Decisions

### 1. TransactionManager Pattern

Mengikuti pattern yang sudah ada pada `CustomerManager`, `VehicleManager`, dan `ItemsManager`:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  React UI       │────▶│  IPC Handlers    │────▶│  Manager    │
│  (Features)     │     │  (main.ts)       │     │  (SQLite)   │
└─────────────────┘     └──────────────────┘     └─────────────┘
         │                                              │
         └──────────── preload.ts (bridge) ─────────────┘
```

### 2. Database Design

#### Entity Relationships

```
CUSTOMERS ──1:N──▶ TRANSACTIONS ◀──N:1── VEHICLES
                        │
                        ├──1:N──▶ TRANSACTION_ITEMS ◀──N:1── ITEMS
                        │
                        ├──1:N──▶ PAYMENTS ◀──N:1── PAYMENT_METHODS
                        │
                        └──1:N──▶ TRANSACTION_STATUS_LOGS ◀──N:1── USERS
```

#### Invoice Number Generation Strategy

Format: `INV-YYYYMMDD-XXXX`

- YYYY: Tahun
- MM: Bulan (01-12)
- DD: Tanggal (01-31)
- XXXX: Sequential counter per hari (0001-9999)

Implementasi:

```typescript
generateInvoiceNumber(): string {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `INV-${today}-`;

  // Query last invoice number for today
  const lastInvoice = this.db.prepare(`
    SELECT invoice_number FROM transactions
    WHERE invoice_number LIKE ?
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`);

  let counter = 1;
  if (lastInvoice) {
    const lastCounter = parseInt(lastInvoice.invoice_number.split('-')[2]);
    counter = lastCounter + 1;
  }

  return `${prefix}${counter.toString().padStart(4, '0')}`;
}
```

### 3. Status Workflow

#### Transaction Status Flow

```
                    ┌──────────────────────────────────────┐
                    │                                      │
    [CREATE] ──▶ CREATED ──▶ QUEUED ──▶ LOADING ──▶ DONE ──▶ CHECKED_OUT
                    │          │
                    ▼          ▼
                [DELETE]   [CANCEL]*

* CANCEL tidak dalam scope ini
```

#### Status Transition Rules

| From    | To          | Allowed Roles       | Notes                      |
| ------- | ----------- | ------------------- | -------------------------- |
| -       | CREATED     | CHECKER, SUPERADMIN | Initial state on create    |
| CREATED | QUEUED      | CHECKER, SUPERADMIN | Transaksi ready for loader |
| CREATED | (DELETE)    | CHECKER, SUPERADMIN | Only draft can be deleted  |
| QUEUED  | LOADING     | LOADER, SUPERADMIN  | Loader starts loading      |
| LOADING | DONE        | LOADER, SUPERADMIN  | Loading completed          |
| DONE    | CHECKED_OUT | CHECKER, SUPERADMIN | Vehicle exits gate         |

#### Payment Status Flow

```
UNPAID ──[addPayment]──▶ (check total) ──▶ PAID
            │
            └──▶ (partial) ──▶ UNPAID (tetap)
```

### 4. Data Flow: Create Transaction (with Combobox Inline Create)

```
┌────────────────────┐
│ User types in      │
│ Customer Combobox  │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐     ┌─────────────────────┐
│ Search existing    │────▶│ Show matching       │
│ customers          │     │ customers           │
└────────────────────┘     └──────────┬──────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
                    ▼                                   ▼
          ┌─────────────────┐               ┌─────────────────────┐
          │ Select existing │               │ Click "+ Tambah     │
          │ customer        │               │ Customer Baru: X"   │
          └────────┬────────┘               └──────────┬──────────┘
                   │                                   │
                   │                                   ▼
                   │                        ┌─────────────────────┐
                   │                        │ Auto-create         │
                   │                        │ customers.create()  │
                   │                        │ category: PERSONAL  │
                   │                        └──────────┬──────────┘
                   │                                   │
                   └───────────────┬───────────────────┘
                                   ▼
                    ┌────────────────────┐
                    │ Customer selected  │
                    │ (existing or new)  │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ User types in      │
                    │ Vehicle Combobox   │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ Search vehicles    │◀── Filter by customer_id
                    │ for customer       │
                    └─────────┬──────────┘
                              │
          ┌───────────────────┴───────────────────┐
          │                                       │
          ▼                                       ▼
┌─────────────────┐                   ┌─────────────────────┐
│ Select existing │                   │ Click "+ Tambah     │
│ vehicle         │                   │ Kendaraan: [PLAT]" │
└────────┬────────┘                   └──────────┬──────────┘
         │                                       │
         │                                       ▼
         │                            ┌─────────────────────┐
         │                            │ Auto-create         │
         │                            │ vehicles.create()   │
         │                            │ with customer_id    │
         │                            └──────────┬──────────┘
         │                                       │
         └───────────────────┬───────────────────┘
                             ▼
                  ┌────────────────────┐
                  │ Vehicle selected   │
                  └─────────┬──────────┘
                            │
                            ▼
                  ┌────────────────────┐
                  │ User adds Items    │◀── Items from items.getActive()
                  │ + Qty              │    Price auto-fill
                  └─────────┬──────────┘
                            │
                            ▼
                  ┌────────────────────┐
                  │ Submit Transaction │──▶ transactions.create()
                  └────────────────────┘
```

### 5. Component Architecture

#### Feature Directory Structure

```
src/Features/Checker/
├── TransactionListPage.tsx      # List dengan filter & stats
├── CreateTransactionPage.tsx    # Form create/edit
├── TransactionDetailPage.tsx    # Detail view (NEW)
├── Components/
│   ├── PaymentDialog.tsx        # Dialog input pembayaran
│   ├── StatusUpdateDialog.tsx   # Dialog ubah status
│   ├── TransactionItemsTable.tsx # Table items reusable
│   ├── TransactionStatusBadge.tsx # Badge status component
│   ├── CustomerCombobox.tsx     # Customer autocomplete with inline create
│   └── VehicleCombobox.tsx      # Vehicle autocomplete with inline create
└── Hooks/
    ├── UseTransactions.ts       # Hook untuk fetch transactions
    └── UseTransactionForm.ts    # Hook untuk form logic
```

### 5.1 Combobox Component Architecture

#### CustomerCombobox

```typescript
interface CustomerComboboxProps {
  value: number | null; // Selected customer ID
  onChange: (customer: CustomerData) => void;
  disabled?: boolean;
}

// Features:
// - Debounced search (300ms)
// - Shows matching customers as user types
// - Shows "+ Tambah Customer Baru: [query]" option when no exact match
// - On select "Tambah", calls customers.create({ name: query, category: 'PERSONAL' })
// - Returns newly created customer via onChange
```

#### VehicleCombobox

```typescript
interface VehicleComboboxProps {
  value: number | null; // Selected vehicle ID
  customerId: number | null; // Required - filter vehicles by customer
  onChange: (vehicle: VehicleData) => void;
  disabled?: boolean;
}

// Features:
// - Disabled if customerId is null
// - Debounced search (300ms)
// - Only shows vehicles belonging to selected customer
// - Shows "+ Tambah Kendaraan Baru: [PLAT]" option when no exact match
// - On select "Tambah", calls vehicles.create({ plate_number: query, customer_id: customerId })
// - Plate number auto-uppercased
// - Returns newly created vehicle via onChange
```

### 6. State Management

Menggunakan React hooks untuk state management lokal, konsisten dengan pattern existing:

```typescript
// Custom hook untuk transaction form
function UseTransactionForm(transactionId?: number) {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [items, setItems] = useState<ItemData[]>([]);
  const [formData, setFormData] = useState<CreateTransactionData>(initial);
  const [isLoading, setIsLoading] = useState(false);

  // Filter vehicles when customer changes
  useEffect(() => {
    if (formData.customerId) {
      fetchVehiclesByCustomer(formData.customerId);
    }
  }, [formData.customerId]);

  // Auto-calculate total
  const total = useMemo(
    () => formData.items.reduce((sum, item) => sum + item.subtotal, 0),
    [formData.items]
  );

  return {
    customers,
    vehicles,
    items,
    formData,
    setFormData,
    total,
    isLoading,
  };
}
```

### 7. API Contract

#### IPC Channel Naming

Mengikuti pattern existing: `entity:action`

```typescript
// Read operations
"transactions:getAll"; // { filters?: TransactionFilters }
"transactions:getById"; // { id: number }
"transactions:search"; // { query: string }
"transactions:getDailyStats"; // { date?: string }

// Write operations
"transactions:create"; // { data: CreateTransactionData }
"transactions:update"; // { id: number, data: UpdateTransactionData }
"transactions:delete"; // { id: number }
"transactions:updateStatus"; // { id: number, status: string, note?: string }

// Payment operations
"transactions:addPayment"; // { transactionId: number, data: CreatePaymentData }
"transactions:getPayments"; // { transactionId: number }

// Reference data
"transactionTypes:getAll"; // {}
"paymentMethods:getAll"; // {}
```

### 8. Validation Schema

Menggunakan Zod untuk validasi form:

```typescript
const createTransactionSchema = z.object({
  transactionTypeId: z.number().min(1, "Tipe transaksi harus dipilih"),
  customerId: z.number().min(1, "Customer harus dipilih"),
  vehicleId: z.number().min(1, "Kendaraan harus dipilih"),
  items: z
    .array(
      z.object({
        itemId: z.number().min(1),
        qty: z.number().min(1, "Qty minimal 1"),
        price: z.number().min(0, "Harga tidak valid"),
      })
    )
    .min(1, "Minimal 1 item"),
  notes: z.string().optional(),
});

const addPaymentSchema = z.object({
  paymentMethodId: z.number().min(1, "Metode pembayaran harus dipilih"),
  amount: z.number().min(1, "Jumlah pembayaran harus lebih dari 0"),
});
```

### 9. Error Handling

#### Database Constraints

- Foreign key violations → User-friendly message
- Unique constraint (invoice) → Retry with new number
- Transaction failures → Rollback all changes

#### UI Error States

- Loading skeleton untuk initial fetch
- Toast notifications untuk success/error
- Inline validation errors untuk form

### 10. Performance Considerations

#### Pagination

- Default 20 items per page
- Cursor-based untuk infinite scroll (future)

#### Caching Strategy

- Reference data (transactionTypes, paymentMethods) cached on app start
- Customer & Vehicle list cached per session
- Items list refreshed on dialog open

#### Query Optimization

- Index pada `invoice_number`, `customer_id`, `vehicle_id`, `created_at`
- JOIN queries untuk list dengan related data
- Separate queries untuk detail dengan items

## Migration Strategy

### Order of Execution

1. Create `transaction_types` table + seed
2. Create `payment_methods` table + seed
3. Create `transactions` table with FKs
4. Create `transaction_items` table
5. Create `payments` table
6. Create `transaction_status_logs` table
7. Create indexes

### Rollback Plan

Each migration file includes down() function untuk rollback jika diperlukan.

## Testing Strategy

### Unit Tests (Future)

- TransactionManager methods
- Invoice number generation
- Status transition validation

### Integration Tests (Manual)

- Create transaction with items
- Status workflow complete
- Payment until PAID
- Filter and search

### E2E Scenarios

- Complete transaction lifecycle
- Permission enforcement
- Error handling paths
