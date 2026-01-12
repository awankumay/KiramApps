"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(
      channel,
      (event, ...args2) => listener(event, ...args2)
    );
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
  // You can expose other APTs you need here.
  // ...
});
electron.contextBridge.exposeInMainWorld("api", {
  auth: {
    login: (username, password) => electron.ipcRenderer.invoke("auth:login", username, password),
    logout: () => electron.ipcRenderer.invoke("auth:logout"),
    getCurrentUser: () => electron.ipcRenderer.invoke("auth:getCurrentUser"),
    checkAuthStatus: () => electron.ipcRenderer.invoke("auth:checkAuthStatus"),
    refreshToken: () => electron.ipcRenderer.invoke("auth:refreshToken"),
    isOnline: () => electron.ipcRenderer.invoke("auth:isOnline"),
    // RBAC methods
    getPermissions: () => electron.ipcRenderer.invoke("auth:getPermissions"),
    getRoles: () => electron.ipcRenderer.invoke("auth:getRoles"),
    checkPermission: (permissionCode) => electron.ipcRenderer.invoke("auth:checkPermission", permissionCode)
  },
  rbac: {
    getAllRoles: () => electron.ipcRenderer.invoke("rbac:getAllRoles"),
    getAllPermissions: () => electron.ipcRenderer.invoke("rbac:getAllPermissions")
  },
  users: {
    getAll: () => electron.ipcRenderer.invoke("users:getAll"),
    getById: (userId) => electron.ipcRenderer.invoke("users:getById", userId),
    create: (userData) => electron.ipcRenderer.invoke("users:create", userData),
    update: (userId, userData) => electron.ipcRenderer.invoke("users:update", userId, userData),
    delete: (userId) => electron.ipcRenderer.invoke("users:delete", userId),
    toggleStatus: (userId) => electron.ipcRenderer.invoke("users:toggleStatus", userId)
  },
  items: {
    getAll: () => electron.ipcRenderer.invoke("items:getAll"),
    getById: (itemId) => electron.ipcRenderer.invoke("items:getById", itemId),
    create: (itemData) => electron.ipcRenderer.invoke("items:create", itemData),
    update: (itemId, itemData, userId) => electron.ipcRenderer.invoke("items:update", itemId, itemData, userId),
    delete: (itemId) => electron.ipcRenderer.invoke("items:delete", itemId),
    toggleStatus: (itemId) => electron.ipcRenderer.invoke("items:toggleStatus", itemId),
    search: (query) => electron.ipcRenderer.invoke("items:search", query),
    getActive: () => electron.ipcRenderer.invoke("items:getActive"),
    getPriceHistory: (itemId) => electron.ipcRenderer.invoke("items:getPriceHistory", itemId)
  },
  customers: {
    getAll: (filters) => electron.ipcRenderer.invoke("customers:getAll", filters || {}),
    getById: (customerId) => electron.ipcRenderer.invoke("customers:getById", customerId),
    create: (customerData) => electron.ipcRenderer.invoke("customers:create", customerData),
    update: (customerId, customerData) => electron.ipcRenderer.invoke("customers:update", customerId, customerData),
    delete: (customerId) => electron.ipcRenderer.invoke("customers:delete", customerId),
    search: (query) => electron.ipcRenderer.invoke("customers:search", query),
    getActive: () => electron.ipcRenderer.invoke("customers:getActive")
  },
  vehicles: {
    getAll: (filters) => electron.ipcRenderer.invoke("vehicles:getAll", filters || {}),
    getById: (vehicleId) => electron.ipcRenderer.invoke("vehicles:getById", vehicleId),
    create: (vehicleData) => electron.ipcRenderer.invoke("vehicles:create", vehicleData),
    update: (vehicleId, vehicleData) => electron.ipcRenderer.invoke("vehicles:update", vehicleId, vehicleData),
    delete: (vehicleId) => electron.ipcRenderer.invoke("vehicles:delete", vehicleId),
    search: (query) => electron.ipcRenderer.invoke("vehicles:search", query),
    getByCustomerId: (customerId) => electron.ipcRenderer.invoke("vehicles:getByCustomerId", customerId),
    getActive: () => electron.ipcRenderer.invoke("vehicles:getActive"),
    plateNumberExists: (plateNumber, excludeId) => electron.ipcRenderer.invoke("vehicles:plateNumberExists", plateNumber, excludeId)
  },
  transactions: {
    getAll: (filters) => electron.ipcRenderer.invoke("transactions:getAll", filters || {}),
    getById: (transactionId) => electron.ipcRenderer.invoke("transactions:getById", transactionId),
    create: (transactionData, userId) => electron.ipcRenderer.invoke("transactions:create", transactionData, userId),
    update: (transactionId, transactionData) => electron.ipcRenderer.invoke("transactions:update", transactionId, transactionData),
    delete: (transactionId) => electron.ipcRenderer.invoke("transactions:delete", transactionId),
    search: (query) => electron.ipcRenderer.invoke("transactions:search", query),
    updateStatus: (transactionId, newStatus, userId, note) => electron.ipcRenderer.invoke(
      "transactions:updateStatus",
      transactionId,
      newStatus,
      userId,
      note
    ),
    getStatusHistory: (transactionId) => electron.ipcRenderer.invoke("transactions:getStatusHistory", transactionId),
    addPayment: (transactionId, paymentData, verifiedBy) => electron.ipcRenderer.invoke(
      "transactions:addPayment",
      transactionId,
      paymentData,
      verifiedBy
    ),
    getPayments: (transactionId) => electron.ipcRenderer.invoke("transactions:getPayments", transactionId),
    getDailyStats: (date) => electron.ipcRenderer.invoke("transactions:getDailyStats", date)
  },
  transactionTypes: {
    getAll: () => electron.ipcRenderer.invoke("transactionTypes:getAll"),
    getById: (id) => electron.ipcRenderer.invoke("transactionTypes:getById", id),
    create: (data) => electron.ipcRenderer.invoke("transactionTypes:create", data),
    update: (id, data) => electron.ipcRenderer.invoke("transactionTypes:update", id, data),
    delete: (id) => electron.ipcRenderer.invoke("transactionTypes:delete", id),
    getActive: () => electron.ipcRenderer.invoke("transactionTypes:getActive")
  },
  paymentMethods: {
    getAll: (filters) => electron.ipcRenderer.invoke("paymentMethods:getAll", filters || {}),
    getById: (id) => electron.ipcRenderer.invoke("paymentMethods:getById", id),
    create: (data) => electron.ipcRenderer.invoke("paymentMethods:create", data),
    update: (id, data) => electron.ipcRenderer.invoke("paymentMethods:update", id, data),
    delete: (id) => electron.ipcRenderer.invoke("paymentMethods:delete", id),
    getActive: () => electron.ipcRenderer.invoke("paymentMethods:getActive")
  },
  loaders: {
    getAll: (filters) => electron.ipcRenderer.invoke("loaders:getAll", filters || {}),
    getById: (id) => electron.ipcRenderer.invoke("loaders:getById", id),
    create: (data) => electron.ipcRenderer.invoke("loaders:create", data),
    update: (id, data) => electron.ipcRenderer.invoke("loaders:update", id, data),
    delete: (id) => electron.ipcRenderer.invoke("loaders:delete", id),
    getActive: () => electron.ipcRenderer.invoke("loaders:getActive")
  },
  payments: {
    getPending: (filters) => electron.ipcRenderer.invoke("payments:getPending", filters),
    getById: (paymentId) => electron.ipcRenderer.invoke("payments:getById", paymentId),
    verify: (paymentId, notes, proofData) => electron.ipcRenderer.invoke("payments:verify", paymentId, notes, proofData),
    reject: (paymentId, reason, notes, proofData) => electron.ipcRenderer.invoke(
      "payments:reject",
      paymentId,
      reason,
      notes,
      proofData
    ),
    getVerificationStats: (dateRange) => electron.ipcRenderer.invoke("payments:getVerificationStats", dateRange),
    uploadProof: (paymentId, imageData, fileName) => electron.ipcRenderer.invoke(
      "payments:uploadProof",
      paymentId,
      imageData,
      fileName
    ),
    getProofPath: (paymentId) => electron.ipcRenderer.invoke("payments:getProofPath", paymentId),
    deleteProof: (paymentId) => electron.ipcRenderer.invoke("payments:deleteProof", paymentId),
    readProofFile: (paymentIdOrPath) => electron.ipcRenderer.invoke("payments:readProofFile", paymentIdOrPath),
    openProofWithViewer: (paymentId) => electron.ipcRenderer.invoke("payments:openProofWithViewer", paymentId),
    saveProofAs: (paymentId, fileName) => electron.ipcRenderer.invoke("payments:saveProofAs", paymentId, fileName)
  },
  settings: {
    getAll: () => electron.ipcRenderer.invoke("settings:getAll"),
    get: (key) => electron.ipcRenderer.invoke("settings:get", key),
    getValue: (key, defaultValue) => electron.ipcRenderer.invoke("settings:getValue", key, defaultValue),
    set: (key, value, options) => electron.ipcRenderer.invoke("settings:set", key, value, options),
    setMultiple: (settings) => electron.ipcRenderer.invoke("settings:setMultiple", settings),
    getByCategory: (category) => electron.ipcRenderer.invoke("settings:getByCategory", category),
    testConnection: (url) => electron.ipcRenderer.invoke("settings:testConnection", url)
  },
  sync: {
    getStats: () => electron.ipcRenderer.invoke("sync:getStats"),
    getLogs: (filters) => electron.ipcRenderer.invoke("sync:getLogs", filters),
    syncAll: () => electron.ipcRenderer.invoke("sync:syncAll"),
    syncEntity: (entityType, direction) => electron.ipcRenderer.invoke("sync:syncEntity", entityType, direction),
    retry: (syncId) => electron.ipcRenderer.invoke("sync:retry", syncId),
    retryFailed: () => electron.ipcRenderer.invoke("sync:retryFailed"),
    startScheduler: () => electron.ipcRenderer.invoke("sync:startScheduler"),
    stopScheduler: () => electron.ipcRenderer.invoke("sync:stopScheduler"),
    isOnline: () => electron.ipcRenderer.invoke("sync:isOnline"),
    getNetworkStatus: () => electron.ipcRenderer.invoke("sync:getNetworkStatus"),
    pushInitialData: (entityType) => electron.ipcRenderer.invoke("sync:pushInitialData", entityType),
    pushAllInitialData: () => electron.ipcRenderer.invoke("sync:pushAllInitialData")
  }
});
