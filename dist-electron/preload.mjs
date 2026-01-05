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
  }
});
