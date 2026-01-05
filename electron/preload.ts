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
});
