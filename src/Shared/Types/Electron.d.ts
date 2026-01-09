export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface UserWithRoles extends User {
  roles: string[];
  permissions: string[];
}

export interface UserData {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt?: string;
  roles: string[];
}

export interface CreateUserData {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  status?: string;
  roles?: string[];
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
  roles?: string[];
}

export interface AuthResult {
  user: UserWithRoles;
  expiresAt: string;
}

export interface RoleData {
  id: number;
  code: string;
  name: string;
  description: string;
}

export interface PermissionData {
  id: number;
  code: string;
  name: string;
  description: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ItemData {
  id: number;
  name: string;
  unit: string;
  price: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateItemData {
  name: string;
  unit: string;
  price: number;
  isActive?: boolean;
}

export interface UpdateItemData {
  name?: string;
  unit?: string;
  price?: number;
  isActive?: boolean;
}

export interface PriceHistoryData {
  id: number;
  itemId: number;
  oldPrice: number | null;
  newPrice: number;
  changedBy: number | null;
  changedAt: string;
}

export interface CustomerData {
  id: number;
  name: string;
  category: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateCustomerData {
  name: string;
  category: string;
  code: string;
}

export interface UpdateCustomerData {
  name?: string;
  category?: string;
  code?: string;
  is_active?: boolean;
}

export interface VehicleData {
  id: number;
  plate_number: string;
  customer_id: number;
  customer_name?: string;
  customer_category?: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateVehicleData {
  plate_number: string;
  customer_id: number;
}

export interface UpdateVehicleData {
  plate_number?: string;
  customer_id?: number;
  is_active?: boolean;
}

// Transaction types
export type PaymentStatus = "UNPAID" | "PAID";
export type PaymentVerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";
export type TransactionStatus =
  | "CREATED"
  | "QUEUED"
  | "LOADING"
  | "DONE"
  | "CHECKED_OUT";

export interface TransactionTypeData {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface PaymentMethodData {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface LoaderData {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateTransactionTypeData {
  name: string;
  is_active?: boolean;
}

export interface UpdateTransactionTypeData {
  name?: string;
  is_active?: boolean;
}

export interface CreatePaymentMethodData {
  name: string;
  is_active?: boolean;
}

export interface UpdatePaymentMethodData {
  name?: string;
  is_active?: boolean;
}

export interface CreateLoaderData {
  name: string;
  is_active?: boolean;
}

export interface UpdateLoaderData {
  name?: string;
  is_active?: boolean;
}

export interface TransactionData {
  id: number;
  invoiceNumber: string;
  transactionTypeId: number;
  transactionTypeName?: string;
  customerId: number;
  customerName?: string;
  customerCategory?: string;
  vehicleId: number;
  vehiclePlate?: string;
  vehicleType?: string;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  transactionStatus: TransactionStatus;
  createdBy: number;
  createdByName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items?: TransactionItemData[];
}

export interface TransactionItemData {
  id: number;
  transactionId: number;
  itemId: number;
  itemName?: string;
  itemUnit?: string;
  qty: number;
  price: number;
  subtotal: number;
  createdAt: string;
}

export interface CreateTransactionData {
  transactionTypeId: number;
  customerId: number;
  vehicleId: number;
  items: { itemId: number; qty: number; price: number }[];
  paymentMethodId?: number; // Optional: if CASH (id=1), auto-set to PAID
  notes?: string;
}

export interface UpdateTransactionData {
  transactionTypeId?: number;
  customerId?: number;
  vehicleId?: number;
  items?: { itemId: number; qty: number; price: number }[];
  notes?: string;
}

export interface PaymentData {
  id: number;
  transactionId: number;
  paymentMethodId: number;
  paymentMethodName?: string;
  amount: number;
  status: "PENDING" | "PAID";
  paidAt: string;
  verifiedBy?: number;
  verifiedByName?: string;
  notes?: string;
  reference?: string;
  createdAt: string;
  verificationStatus: PaymentVerificationStatus;
  verifiedAt?: string;
  rejectionReason?: string;
  proofImagePath?: string;
  transactionInvoiceNumber?: string;
  customerName?: string;
  vehiclePlate?: string;
}

export interface CreatePaymentData {
  paymentMethodId: number;
  amount: number;
  reference?: string;
  notes?: string;
}

export interface TransactionStatusLogData {
  id: number;
  transactionId: number;
  status: TransactionStatus;
  changedBy: number;
  changedByName?: string;
  changedAt: string;
  note?: string;
}

export interface TransactionFilters {
  status?: TransactionStatus;
  paymentStatus?: PaymentStatus;
  customerId?: number;
  vehicleId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface DailyStats {
  date: string;
  total: number;
  pending: number;
  loading: number;
  done: number;
  checkedOut: number;
  totalAmount: number;
  paidAmount: number;
}

export interface UploadPaymentProofData {
  paymentId: number;
  imageData: string; // base64 encoded
  fileName: string;
}

export interface UploadPaymentProofResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export interface PaymentFilters {
  verificationStatus?: PaymentVerificationStatus;
  transactionId?: number;
  customerId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface PaymentVerificationStats {
  date: string;
  pendingCount: number;
  verifiedCount: number;
  rejectedCount: number;
  totalPending: number;
  totalVerified: number;
  totalRejected: number;
}

declare global {
  interface Window {
    api: {
      auth: {
        login: (
          username: string,
          password: string
        ) => Promise<ApiResponse<AuthResult>>;
        logout: () => Promise<ApiResponse<void>>;
        getCurrentUser: () => Promise<ApiResponse<UserWithRoles | null>>;
        checkAuthStatus: () => Promise<
          ApiResponse<{ isAuthenticated: boolean }>
        >;
        refreshToken: () => Promise<ApiResponse<void>>;
        isOnline: () => Promise<ApiResponse<{ isOnline: boolean }>>;
        // RBAC methods
        getPermissions: () => Promise<ApiResponse<string[]>>;
        getRoles: () => Promise<ApiResponse<string[]>>;
        checkPermission: (
          permissionCode: string
        ) => Promise<ApiResponse<boolean>>;
      };
      rbac: {
        getAllRoles: () => Promise<ApiResponse<RoleData[]>>;
        getAllPermissions: () => Promise<ApiResponse<PermissionData[]>>;
      };
      users: {
        getAll: () => Promise<ApiResponse<UserData[]>>;
        getById: (userId: number) => Promise<ApiResponse<UserData>>;
        create: (userData: CreateUserData) => Promise<ApiResponse<UserData>>;
        update: (
          userId: number,
          userData: UpdateUserData
        ) => Promise<ApiResponse<UserData>>;
        delete: (userId: number) => Promise<ApiResponse<void>>;
        toggleStatus: (userId: number) => Promise<ApiResponse<UserData>>;
      };
      items: {
        getAll: () => Promise<ApiResponse<ItemData[]>>;
        getById: (itemId: number) => Promise<ApiResponse<ItemData>>;
        create: (itemData: CreateItemData) => Promise<ApiResponse<ItemData>>;
        update: (
          itemId: number,
          itemData: UpdateItemData,
          userId?: number
        ) => Promise<ApiResponse<ItemData>>;
        delete: (itemId: number) => Promise<ApiResponse<void>>;
        toggleStatus: (itemId: number) => Promise<ApiResponse<ItemData>>;
        search: (query: string) => Promise<ApiResponse<ItemData[]>>;
        getActive: () => Promise<ApiResponse<ItemData[]>>;
        getPriceHistory: (
          itemId: number
        ) => Promise<ApiResponse<PriceHistoryData[]>>;
      };
      customers: {
        getAll: (filters?: {
          name?: string;
          category?: string;
          is_active?: boolean;
          page?: number;
          limit?: number;
        }) => Promise<
          ApiResponse<{
            customers: CustomerData[];
            total: number;
            page: number;
            limit: number;
          }>
        >;
        getById: (customerId: number) => Promise<ApiResponse<CustomerData>>;
        create: (
          customerData: CreateCustomerData
        ) => Promise<ApiResponse<CustomerData>>;
        update: (
          customerId: number,
          customerData: UpdateCustomerData
        ) => Promise<ApiResponse<CustomerData>>;
        delete: (customerId: number) => Promise<ApiResponse<void>>;
        search: (query: string) => Promise<ApiResponse<CustomerData[]>>;
        getActive: () => Promise<ApiResponse<CustomerData[]>>;
      };
      vehicles: {
        getAll: (filters?: {
          plate_number?: string;
          customer_id?: number;
          is_active?: boolean;
          page?: number;
          limit?: number;
        }) => Promise<
          ApiResponse<{
            vehicles: VehicleData[];
            total: number;
            page: number;
            limit: number;
          }>
        >;
        getById: (vehicleId: number) => Promise<ApiResponse<VehicleData>>;
        create: (
          vehicleData: CreateVehicleData
        ) => Promise<ApiResponse<VehicleData>>;
        update: (
          vehicleId: number,
          vehicleData: UpdateVehicleData
        ) => Promise<ApiResponse<VehicleData>>;
        delete: (vehicleId: number) => Promise<ApiResponse<void>>;
        search: (query: string) => Promise<ApiResponse<VehicleData[]>>;
        getByCustomerId: (
          customerId: number
        ) => Promise<ApiResponse<VehicleData[]>>;
        getActive: () => Promise<ApiResponse<VehicleData[]>>;
        plateNumberExists: (
          plateNumber: string,
          excludeId?: number
        ) => Promise<ApiResponse<boolean>>;
      };
      transactions: {
        getAll: (filters?: TransactionFilters) => Promise<
          ApiResponse<{
            transactions: TransactionData[];
            total: number;
            page: number;
            limit: number;
          }>
        >;
        getById: (
          transactionId: number
        ) => Promise<ApiResponse<TransactionData>>;
        create: (
          transactionData: CreateTransactionData,
          userId: number
        ) => Promise<ApiResponse<TransactionData>>;
        update: (
          transactionId: number,
          transactionData: UpdateTransactionData
        ) => Promise<ApiResponse<TransactionData>>;
        delete: (transactionId: number) => Promise<ApiResponse<void>>;
        search: (query: string) => Promise<ApiResponse<TransactionData[]>>;
        updateStatus: (
          transactionId: number,
          newStatus: string,
          userId: number,
          note?: string
        ) => Promise<ApiResponse<TransactionData>>;
        getStatusHistory: (
          transactionId: number
        ) => Promise<ApiResponse<TransactionStatusLogData[]>>;
        addPayment: (
          transactionId: number,
          paymentData: CreatePaymentData,
          verifiedBy: number
        ) => Promise<ApiResponse<PaymentData>>;
        getPayments: (
          transactionId: number
        ) => Promise<ApiResponse<PaymentData[]>>;
        getDailyStats: (date?: string) => Promise<ApiResponse<DailyStats>>;
      };
      transactionTypes: {
        getAll: () => Promise<ApiResponse<TransactionTypeData[]>>;
        getById: (id: number) => Promise<ApiResponse<TransactionTypeData>>;
        create: (
          data: CreateTransactionTypeData
        ) => Promise<ApiResponse<TransactionTypeData>>;
        update: (
          id: number,
          data: UpdateTransactionTypeData
        ) => Promise<ApiResponse<TransactionTypeData>>;
        delete: (id: number) => Promise<ApiResponse<void>>;
        getActive: () => Promise<ApiResponse<TransactionTypeData[]>>;
      };
      paymentMethods: {
        getAll: (filters?: {
          name?: string;
          is_active?: boolean;
          page?: number;
          limit?: number;
        }) => Promise<
          ApiResponse<{
            paymentMethods: PaymentMethodData[];
            total: number;
            page: number;
            limit: number;
          }>
        >;
        getById: (id: number) => Promise<ApiResponse<PaymentMethodData>>;
        create: (
          data: CreatePaymentMethodData
        ) => Promise<ApiResponse<PaymentMethodData>>;
        update: (
          id: number,
          data: UpdatePaymentMethodData
        ) => Promise<ApiResponse<PaymentMethodData>>;
        delete: (id: number) => Promise<ApiResponse<void>>;
        getActive: () => Promise<ApiResponse<PaymentMethodData[]>>;
      };
      loaders: {
        getAll: (filters?: {
          name?: string;
          is_active?: boolean;
          page?: number;
          limit?: number;
        }) => Promise<
          ApiResponse<{
            loaders: LoaderData[];
            total: number;
            page: number;
            limit: number;
          }>
        >;
        getById: (id: number) => Promise<ApiResponse<LoaderData>>;
        create: (data: CreateLoaderData) => Promise<ApiResponse<LoaderData>>;
        update: (
          id: number,
          data: UpdateLoaderData
        ) => Promise<ApiResponse<LoaderData>>;
        delete: (id: number) => Promise<ApiResponse<void>>;
        getActive: () => Promise<ApiResponse<LoaderData[]>>;
      };
      payments: {
        getPending: (filters?: PaymentFilters) => Promise<
          ApiResponse<{
            payments: PaymentData[];
            total: number;
            page: number;
            limit: number;
          }>
        >;
        getById: (paymentId: number) => Promise<ApiResponse<PaymentData>>;
        verify: (
          paymentId: number,
          notes?: string,
          proofData?: { imageData: string; fileName: string }
        ) => Promise<ApiResponse<PaymentData>>;
        reject: (
          paymentId: number,
          reason: string,
          notes?: string,
          proofData?: { imageData: string; fileName: string }
        ) => Promise<ApiResponse<PaymentData>>;
        getVerificationStats: (dateRange?: {
          from: string;
          to: string;
        }) => Promise<ApiResponse<PaymentVerificationStats>>;
        uploadProof: (
          paymentId: number,
          imageData: string,
          fileName: string
        ) => Promise<ApiResponse<{ filePath: string }>>;
        getProofPath: (
          paymentId: number
        ) => Promise<ApiResponse<{ filePath: string | null }>>;
        deleteProof: (
          paymentId: number
        ) => Promise<ApiResponse<{ deleted: boolean }>>;
        readProofFile: (
          paymentIdOrPath: number | string
        ) => Promise<
          ApiResponse<{ data: string; source?: "file" | "thumbnail" }>
        >;
        openProofWithViewer: (
          paymentId: number
        ) => Promise<ApiResponse<Record<string, never>>>;
        saveProofAs: (
          paymentId: number,
          fileName: string
        ) => Promise<ApiResponse<{ filePath?: string }>>;
      };
    };
  }
}

export {};
