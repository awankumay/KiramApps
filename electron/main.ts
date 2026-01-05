import { app, BrowserWindow, ipcMain } from "electron";
// import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createDatabase } from "./auth/database";
import { AuthManager } from "./auth/AuthManager";

// const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;
let authManager: AuthManager;

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (authManager) {
      authManager.cleanup();
    }
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Initialize authentication system
function initializeAuth() {
  const db = createDatabase();
  authManager = new AuthManager(db);
}

// Setup IPC handlers for authentication
function setupAuthHandlers() {
  // Login handler
  ipcMain.handle(
    "auth:login",
    async (_event, username: string, password: string) => {
      try {
        const result = await authManager.login(username, password);
        return { success: true, data: result };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Login failed",
        };
      }
    }
  );

  // Logout handler
  ipcMain.handle("auth:logout", async () => {
    try {
      await authManager.logout();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Logout failed",
      };
    }
  });

  // Get current user handler
  ipcMain.handle("auth:getCurrentUser", async () => {
    try {
      const user = await authManager.getCurrentUser();
      return { success: true, data: user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get user",
      };
    }
  });

  // Check auth status handler
  ipcMain.handle("auth:checkAuthStatus", async () => {
    try {
      const isAuthenticated = await authManager.isAuthenticated();
      return { success: true, data: { isAuthenticated } };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to check auth status",
      };
    }
  });

  // Refresh token handler
  ipcMain.handle("auth:refreshToken", async () => {
    try {
      await authManager.refreshToken();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Token refresh failed",
      };
    }
  });

  // Check online status handler
  ipcMain.handle("auth:isOnline", async () => {
    try {
      const isOnline = await authManager.isOnline();
      return { success: true, data: { isOnline } };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to check online status",
      };
    }
  });

  // Get user permissions handler
  ipcMain.handle("auth:getPermissions", async () => {
    try {
      const user = await authManager.getCurrentUser();
      if (!user) {
        return { success: false, error: "Not authenticated" };
      }
      return { success: true, data: user.permissions };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get permissions",
      };
    }
  });

  // Get user roles handler
  ipcMain.handle("auth:getRoles", async () => {
    try {
      const user = await authManager.getCurrentUser();
      if (!user) {
        return { success: false, error: "Not authenticated" };
      }
      return { success: true, data: user.roles };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get roles",
      };
    }
  });

  // Check single permission handler
  ipcMain.handle(
    "auth:checkPermission",
    async (_event, permissionCode: string) => {
      try {
        const user = await authManager.getCurrentUser();
        if (!user) {
          return { success: false, error: "Not authenticated" };
        }
        const hasPermission = user.permissions.includes(permissionCode);
        return { success: true, data: hasPermission };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to check permission",
        };
      }
    }
  );

  // Get all available roles (for admin UI)
  ipcMain.handle("rbac:getAllRoles", async () => {
    try {
      const rbacManager = authManager.getRBACManager();
      const roles = rbacManager.getAllRoles();
      return { success: true, data: roles };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get roles",
      };
    }
  });

  // Get all available permissions (for admin UI)
  ipcMain.handle("rbac:getAllPermissions", async () => {
    try {
      const rbacManager = authManager.getRBACManager();
      const permissions = rbacManager.getAllPermissions();
      return { success: true, data: permissions };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get permissions",
      };
    }
  });

  // ============================================
  // User Management CRUD Handlers
  // ============================================

  // Get all users
  ipcMain.handle("users:getAll", async () => {
    try {
      const rbacManager = authManager.getRBACManager();
      const users = rbacManager.getAllUsers();
      return { success: true, data: users };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get users",
      };
    }
  });

  // Get single user by ID
  ipcMain.handle("users:getById", async (_event, userId: number) => {
    try {
      const rbacManager = authManager.getRBACManager();
      const user = rbacManager.getUserById(userId);
      if (!user) {
        return { success: false, error: "User not found" };
      }
      return { success: true, data: user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get user",
      };
    }
  });

  // Create new user
  ipcMain.handle(
    "users:create",
    async (
      _event,
      userData: {
        username: string;
        email: string;
        firstName: string;
        lastName: string;
        password: string;
        status?: string;
        roles?: string[];
      }
    ) => {
      try {
        const rbacManager = authManager.getRBACManager();
        const user = rbacManager.createUser(userData);
        return { success: true, data: user };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to create user",
        };
      }
    }
  );

  // Update existing user
  ipcMain.handle(
    "users:update",
    async (
      _event,
      userId: number,
      userData: {
        username?: string;
        email?: string;
        firstName?: string;
        lastName?: string;
        status?: string;
        roles?: string[];
      }
    ) => {
      try {
        const rbacManager = authManager.getRBACManager();
        const user = rbacManager.updateUser(userId, userData);
        if (!user) {
          return { success: false, error: "User not found" };
        }
        return { success: true, data: user };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to update user",
        };
      }
    }
  );

  // Delete user
  ipcMain.handle("users:delete", async (_event, userId: number) => {
    try {
      const rbacManager = authManager.getRBACManager();
      const success = rbacManager.deleteUser(userId);
      if (!success) {
        return { success: false, error: "Failed to delete user" };
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete user",
      };
    }
  });

  // Toggle user status
  ipcMain.handle("users:toggleStatus", async (_event, userId: number) => {
    try {
      const rbacManager = authManager.getRBACManager();
      const user = rbacManager.toggleUserStatus(userId);
      if (!user) {
        return { success: false, error: "User not found" };
      }
      return { success: true, data: user };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to toggle user status",
      };
    }
  });
}

app.whenReady().then(() => {
  initializeAuth();
  setupAuthHandlers();
  createWindow();
});
