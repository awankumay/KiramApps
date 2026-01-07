import { ipcRenderer, contextBridge } from "electron";

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) =>
      listener(event, ...args)
    );
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },

  // You can expose other APTs you need here.
  // ...
});

// --------- Expose Auth API to Renderer process ---------
contextBridge.exposeInMainWorld("api", {
  auth: {
    login: (username: string, password: string) =>
      ipcRenderer.invoke("auth:login", username, password),
    logout: () => ipcRenderer.invoke("auth:logout"),
    getCurrentUser: () => ipcRenderer.invoke("auth:getCurrentUser"),
    checkAuthStatus: () => ipcRenderer.invoke("auth:checkAuthStatus"),
    refreshToken: () => ipcRenderer.invoke("auth:refreshToken"),
    isOnline: () => ipcRenderer.invoke("auth:isOnline"),
    // RBAC methods
    getPermissions: () => ipcRenderer.invoke("auth:getPermissions"),
    getRoles: () => ipcRenderer.invoke("auth:getRoles"),
    checkPermission: (permissionCode: string) =>
      ipcRenderer.invoke("auth:checkPermission", permissionCode),
  },
  rbac: {
    getAllRoles: () => ipcRenderer.invoke("rbac:getAllRoles"),
    getAllPermissions: () => ipcRenderer.invoke("rbac:getAllPermissions"),
  },
  users: {
    getAll: () => ipcRenderer.invoke("users:getAll"),
    getById: (userId: number) => ipcRenderer.invoke("users:getById", userId),
    create: (userData: {
      username: string;
      email: string;
      firstName: string;
      lastName: string;
      status?: string;
      roles?: string[];
    }) => ipcRenderer.invoke("users:create", userData),
    update: (
      userId: number,
      userData: {
        username?: string;
        email?: string;
        firstName?: string;
        lastName?: string;
        status?: string;
        roles?: string[];
      }
    ) => ipcRenderer.invoke("users:update", userId, userData),
    delete: (userId: number) => ipcRenderer.invoke("users:delete", userId),
    toggleStatus: (userId: number) =>
      ipcRenderer.invoke("users:toggleStatus", userId),
  },
  items: {
    getAll: () => ipcRenderer.invoke("items:getAll"),
    getById: (itemId: number) => ipcRenderer.invoke("items:getById", itemId),
    create: (itemData: {
      name: string;
      unit: string;
      price: number;
      isActive?: boolean;
    }) => ipcRenderer.invoke("items:create", itemData),
    update: (
      itemId: number,
      itemData: {
        name?: string;
        unit?: string;
        price?: number;
        isActive?: boolean;
      },
      userId?: number
    ) => ipcRenderer.invoke("items:update", itemId, itemData, userId),
    delete: (itemId: number) => ipcRenderer.invoke("items:delete", itemId),
    toggleStatus: (itemId: number) =>
      ipcRenderer.invoke("items:toggleStatus", itemId),
    search: (query: string) => ipcRenderer.invoke("items:search", query),
    getActive: () => ipcRenderer.invoke("items:getActive"),
    getPriceHistory: (itemId: number) =>
      ipcRenderer.invoke("items:getPriceHistory", itemId),
  },
  customers: {
    getAll: (filters?: {
      name?: string;
      category?: string;
      is_active?: boolean;
      page?: number;
      limit?: number;
    }) => ipcRenderer.invoke("customers:getAll", filters || {}),
    getById: (customerId: number) =>
      ipcRenderer.invoke("customers:getById", customerId),
    create: (customerData: { name: string; category: string }) =>
      ipcRenderer.invoke("customers:create", customerData),
    update: (
      customerId: number,
      customerData: { name?: string; category?: string; is_active?: boolean }
    ) => ipcRenderer.invoke("customers:update", customerId, customerData),
    delete: (customerId: number) =>
      ipcRenderer.invoke("customers:delete", customerId),
    search: (query: string) => ipcRenderer.invoke("customers:search", query),
    getActive: () => ipcRenderer.invoke("customers:getActive"),
  },
  vehicles: {
    getAll: (filters?: {
      plate_number?: string;
      customer_id?: number;
      is_active?: boolean;
      page?: number;
      limit?: number;
    }) => ipcRenderer.invoke("vehicles:getAll", filters || {}),
    getById: (vehicleId: number) =>
      ipcRenderer.invoke("vehicles:getById", vehicleId),
    create: (vehicleData: { plate_number: string; customer_id: number }) =>
      ipcRenderer.invoke("vehicles:create", vehicleData),
    update: (
      vehicleId: number,
      vehicleData: {
        plate_number?: string;
        customer_id?: number;
        is_active?: boolean;
      }
    ) => ipcRenderer.invoke("vehicles:update", vehicleId, vehicleData),
    delete: (vehicleId: number) =>
      ipcRenderer.invoke("vehicles:delete", vehicleId),
    search: (query: string) => ipcRenderer.invoke("vehicles:search", query),
    getByCustomerId: (customerId: number) =>
      ipcRenderer.invoke("vehicles:getByCustomerId", customerId),
    getActive: () => ipcRenderer.invoke("vehicles:getActive"),
    plateNumberExists: (plateNumber: string, excludeId?: number) =>
      ipcRenderer.invoke("vehicles:plateNumberExists", plateNumber, excludeId),
  },
  transactions: {
    getAll: (filters?: {
      status?: string;
      paymentStatus?: string;
      customerId?: number;
      vehicleId?: number;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    }) => ipcRenderer.invoke("transactions:getAll", filters || {}),
    getById: (transactionId: number) =>
      ipcRenderer.invoke("transactions:getById", transactionId),
    create: (
      transactionData: {
        transactionTypeId: number;
        customerId: number;
        vehicleId: number;
        items: { itemId: number; qty: number; price: number }[];
        notes?: string;
      },
      userId: number
    ) => ipcRenderer.invoke("transactions:create", transactionData, userId),
    update: (
      transactionId: number,
      transactionData: {
        transactionTypeId?: number;
        customerId?: number;
        vehicleId?: number;
        items?: { itemId: number; qty: number; price: number }[];
        notes?: string;
      }
    ) =>
      ipcRenderer.invoke("transactions:update", transactionId, transactionData),
    delete: (transactionId: number) =>
      ipcRenderer.invoke("transactions:delete", transactionId),
    search: (query: string) => ipcRenderer.invoke("transactions:search", query),
    updateStatus: (
      transactionId: number,
      newStatus: string,
      userId: number,
      note?: string
    ) =>
      ipcRenderer.invoke(
        "transactions:updateStatus",
        transactionId,
        newStatus,
        userId,
        note
      ),
    getStatusHistory: (transactionId: number) =>
      ipcRenderer.invoke("transactions:getStatusHistory", transactionId),
    addPayment: (
      transactionId: number,
      paymentData: { paymentMethodId: number; amount: number; notes?: string },
      verifiedBy: number
    ) =>
      ipcRenderer.invoke(
        "transactions:addPayment",
        transactionId,
        paymentData,
        verifiedBy
      ),
    getPayments: (transactionId: number) =>
      ipcRenderer.invoke("transactions:getPayments", transactionId),
    getDailyStats: (date?: string) =>
      ipcRenderer.invoke("transactions:getDailyStats", date),
  },
  transactionTypes: {
    getAll: () => ipcRenderer.invoke("transactionTypes:getAll"),
  },
  paymentMethods: {
    getAll: () => ipcRenderer.invoke("paymentMethods:getAll"),
  },
  payments: {
    getPending: (filters?: {
      verificationStatus?: "PENDING" | "VERIFIED" | "REJECTED";
      transactionId?: number;
      customerId?: number;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    }) => ipcRenderer.invoke("payments:getPending", filters),
    getById: (paymentId: number) =>
      ipcRenderer.invoke("payments:getById", paymentId),
    verify: (paymentId: number, notes?: string) =>
      ipcRenderer.invoke("payments:verify", paymentId, notes),
    reject: (paymentId: number, reason: string, notes?: string) =>
      ipcRenderer.invoke("payments:reject", paymentId, reason, notes),
    getVerificationStats: (dateRange?: { from: string; to: string }) =>
      ipcRenderer.invoke("payments:getVerificationStats", dateRange),
  },
});
