import { app, BrowserWindow, ipcMain, shell, dialog, Menu } from "electron";
// import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as fs from "fs";
import { createDatabase } from "./auth/database";
import { AuthManager } from "./auth/AuthManager";
import { runMigrations } from "./database/index";
import packageJson from "../package.json" assert { type: "json" };
import { SettingsManager } from "./auth/SettingsManager";
import { SyncManager } from "./auth/SyncManager";
import { ERPClient } from "./auth/ERPClient";
import { NetworkStatus } from "./auth/NetworkStatus";
import { PrinterManager } from "./auth/PrinterManager";

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
let settingsManager: SettingsManager | null = null;
let syncManager: SyncManager | null = null;
let networkStatus: NetworkStatus | null = null;
let printerManager: PrinterManager | null = null;

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  // Custom Menu Bar
  if (app.isPackaged) {
    // Production mode: Custom menu Help saja
    const menuTemplate: Electron.MenuItemConstructorOptions[] = [
      {
        label: "Help",
        submenu: [
          {
            label: "Tentang",
            click: () => {
              dialog.showMessageBox(win!, {
                message: `KiramApps v${packageJson.version}`,
                title: "Tentang Aplikasi",
                type: "info",
              });
            },
          },
        ],
      },
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
  }
  // Development mode: Tidak mengatur menu (gunakan menu default Electron dengan debug dan hotkeys)

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

  // Initialize printer manager after window is created
  printerManager = new PrinterManager(win);
  console.log("Printer manager initialized");
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
async function initializeAuth() {
  try {
    console.log("Initializing database...");
    const db = createDatabase();

    // Run pending migrations on startup - ONLY in production
    // In development, use `npm run db:migrate` manually
    const isProduction = !VITE_DEV_SERVER_URL;

    if (isProduction) {
      console.log("Running database migrations (production mode)...");
      await runMigrations(db);
      console.log("Database migrations completed successfully");
    } else {
      console.log("Skipping auto-migration in development mode");
      console.log("Run 'npm run db:migrate' manually if needed");
    }

    // Initialize settings manager FIRST (before AuthManager)
    // This ensures ERPClient can load the correct API URL from database
    settingsManager = new SettingsManager(db);
    ERPClient.initializeSettings(db);
    console.log("Settings manager initialized");

    // Log the configured ERP API URL
    const configuredUrl = settingsManager.getErpApiUrl();
    console.log(`Configured ERP API URL: ${configuredUrl}`);

    // Now initialize AuthManager (which will use the configured URL)
    authManager = new AuthManager(db);
    console.log("Authentication system initialized");

    // Initialize network status with settings manager
    networkStatus = authManager.getNetworkStatus();
    if (networkStatus && settingsManager) {
      networkStatus.updatePingUrl(settingsManager);
    }

    // Initialize sync manager
    syncManager = new SyncManager(db, networkStatus);
    console.log("Sync manager initialized");
  } catch (error) {
    console.error("Failed to initialize authentication system:", error);
    // Show error dialog to user - only in production
    const isProduction = !VITE_DEV_SERVER_URL;
    if (isProduction) {
      dialog.showErrorBox(
        "Database Initialization Error",
        `Failed to initialize database: ${
          error instanceof Error ? error.message : "Unknown error"
        }\n\nPlease contact support if this problem persists.`
      );
    }
    // In development, just log and continue
    console.log("Continuing without database in development mode...");
  }
}

/**
 * Helper function to queue a sync operation
 * Safely handles cases where syncManager is not initialized
 */
async function queueSyncOperation(
  entityType:
    | "customer"
    | "transaction"
    | "transaction_item"
    | "transaction_vehicle"
    | "transaction_payment"
    | "payment_verification"
    | "loader",
  action: "create" | "update" | "delete",
  data: unknown,
  entityId?: number
): Promise<void> {
  if (!syncManager) {
    console.log("[Sync] Sync manager not initialized, skipping sync queue");
    return;
  }

  try {
    // Initialize sync with current access token if needed
    const accessToken = await authManager.getAccessToken();
    if (accessToken) {
      syncManager.initialize(accessToken);
    }

    const syncId = await syncManager.queueSync(
      entityType,
      action,
      data,
      entityId
    );
    console.log(
      `[Sync] Queued ${action.toUpperCase()} for ${entityType}${
        entityId ? ` (ID: ${entityId})` : ""
      } | SyncID: ${syncId}`
    );
  } catch (error) {
    console.error(
      `[Sync] Failed to queue ${action} for ${entityType}:`,
      error instanceof Error ? error.message : error
    );
    // Don't throw - sync failures shouldn't break the main operation
  }
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

  // ============================================
  // Items Management CRUD Handlers
  // ============================================

  // Get all items
  ipcMain.handle("items:getAll", async () => {
    try {
      const itemsManager = authManager.getItemsManager();
      const items = itemsManager.getAllItems();
      return { success: true, data: items };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get items",
      };
    }
  });

  // Get single item by ID
  ipcMain.handle("items:getById", async (_event, itemId: number) => {
    try {
      const itemsManager = authManager.getItemsManager();
      const item = itemsManager.getItemById(itemId);
      if (!item) {
        return { success: false, error: "Item not found" };
      }
      return { success: true, data: item };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get item",
      };
    }
  });

  // Create new item
  ipcMain.handle(
    "items:create",
    async (
      _event,
      itemData: {
        name: string;
        unit: string;
        price: number;
        isActive?: boolean;
      }
    ) => {
      try {
        const itemsManager = authManager.getItemsManager();
        const item = itemsManager.createItem(itemData);
        return { success: true, data: item };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to create item",
        };
      }
    }
  );

  // Update existing item
  ipcMain.handle(
    "items:update",
    async (
      _event,
      itemId: number,
      itemData: {
        name?: string;
        unit?: string;
        price?: number;
        isActive?: boolean;
      },
      userId?: number
    ) => {
      try {
        const itemsManager = authManager.getItemsManager();
        const item = itemsManager.updateItem(itemId, itemData, userId);
        if (!item) {
          return { success: false, error: "Item not found" };
        }
        return { success: true, data: item };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to update item",
        };
      }
    }
  );

  // Delete item
  ipcMain.handle("items:delete", async (_event, itemId: number) => {
    try {
      const itemsManager = authManager.getItemsManager();
      const success = itemsManager.deleteItem(itemId);
      if (!success) {
        return { success: false, error: "Failed to delete item" };
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete item",
      };
    }
  });

  // Toggle item status
  ipcMain.handle("items:toggleStatus", async (_event, itemId: number) => {
    try {
      const itemsManager = authManager.getItemsManager();
      const item = itemsManager.toggleItemStatus(itemId);
      if (!item) {
        return { success: false, error: "Item not found" };
      }
      return { success: true, data: item };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to toggle item status",
      };
    }
  });

  // Search items
  ipcMain.handle("items:search", async (_event, query: string) => {
    try {
      const itemsManager = authManager.getItemsManager();
      const items = itemsManager.searchItems(query);
      return { success: true, data: items };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to search items",
      };
    }
  });

  // Get active items only
  ipcMain.handle("items:getActive", async () => {
    try {
      const itemsManager = authManager.getItemsManager();
      const items = itemsManager.getActiveItems();
      return { success: true, data: items };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get active items",
      };
    }
  });

  // Get price history for an item
  ipcMain.handle("items:getPriceHistory", async (_event, itemId: number) => {
    try {
      const itemsManager = authManager.getItemsManager();
      const history = itemsManager.getPriceHistory(itemId);
      return { success: true, data: history };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get price history",
      };
    }
  });

  // ============================================
  // Customer Management CRUD Handlers
  // ============================================

  // Get all customers
  ipcMain.handle(
    "customers:getAll",
    async (
      _event,
      filters: {
        name?: string;
        category?: string;
        is_active?: boolean;
        page?: number;
        limit?: number;
      } = {}
    ) => {
      try {
        const customerManager = authManager.getCustomerManager();
        const result = customerManager.getAll(filters);
        return { success: true, data: result };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to get customers",
        };
      }
    }
  );

  // Get customer by ID
  ipcMain.handle("customers:getById", async (_event, customerId: number) => {
    try {
      const customerManager = authManager.getCustomerManager();
      const customer = customerManager.getById(customerId);
      if (!customer) {
        return { success: false, error: "Customer not found" };
      }
      return { success: true, data: customer };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get customer",
      };
    }
  });

  // Create new customer
  ipcMain.handle(
    "customers:create",
    async (
      _event,
      customerData: { name: string; category: string; code: string }
    ) => {
      try {
        const customerManager = authManager.getCustomerManager();
        const customer = customerManager.create(customerData);

        // Queue sync for created customer
        // Transform to snake_case format expected by ERP
        if (customer) {
          await queueSyncOperation(
            "customer",
            "create",
            {
              id: customer.id,
              code: customer.code,
              name: customer.name,
              category: customer.category,
              is_active:
                customer.is_active !== undefined ? customer.is_active : true,
            },
            customer.id
          );
        }

        return { success: true, data: customer };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to create customer",
        };
      }
    }
  );

  // Update existing customer
  ipcMain.handle(
    "customers:update",
    async (
      _event,
      customerId: number,
      customerData: {
        name?: string;
        category?: string;
        code?: string;
        is_active?: boolean;
      }
    ) => {
      try {
        const customerManager = authManager.getCustomerManager();
        const customer = customerManager.update(customerId, customerData);
        if (!customer) {
          return { success: false, error: "Customer not found" };
        }

        // Queue sync for updated customer
        // Transform to snake_case format expected by ERP
        await queueSyncOperation(
          "customer",
          "update",
          {
            id: customer.id,
            code: customer.code,
            name: customer.name,
            category: customer.category,
            is_active:
              customer.is_active !== undefined ? customer.is_active : true,
          },
          customerId
        );

        return { success: true, data: customer };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to update customer",
        };
      }
    }
  );

  // Delete customer
  ipcMain.handle("customers:delete", async (_event, customerId: number) => {
    try {
      const customerManager = authManager.getCustomerManager();
      const success = customerManager.delete(customerId);
      if (!success) {
        return { success: false, error: "Failed to delete customer" };
      }

      // Queue sync for deleted customer (soft delete)
      await queueSyncOperation(
        "customer",
        "delete",
        { id: customerId },
        customerId
      );

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete customer",
      };
    }
  });

  // Search customers
  ipcMain.handle("customers:search", async (_event, query: string) => {
    try {
      const customerManager = authManager.getCustomerManager();
      const customers = customerManager.search(query);
      return { success: true, data: customers };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to search customers",
      };
    }
  });

  // Get active customers only
  ipcMain.handle("customers:getActive", async () => {
    try {
      const customerManager = authManager.getCustomerManager();
      const customers = customerManager.getActive();
      return { success: true, data: customers };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get active customers",
      };
    }
  });

  // Get active customers count
  ipcMain.handle("customers:getActiveCount", async () => {
    try {
      const customerManager = authManager.getCustomerManager();
      const count = customerManager.getActiveCount();
      return { success: true, data: count };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get active customers count",
      };
    }
  });

  // Get inactive customers count
  ipcMain.handle("customers:getInactiveCount", async () => {
    try {
      const customerManager = authManager.getCustomerManager();
      const count = customerManager.getInactiveCount();
      return { success: true, data: count };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get inactive customers count",
      };
    }
  });

  // ============================================
  // Vehicle Management CRUD Handlers
  // ============================================

  // Get all vehicles
  ipcMain.handle(
    "vehicles:getAll",
    async (
      _event,
      filters: {
        plate_number?: string;
        customer_id?: number;
        is_active?: boolean;
        page?: number;
        limit?: number;
      } = {}
    ) => {
      try {
        const vehicleManager = authManager.getVehicleManager();
        const result = vehicleManager.getAll(filters);
        return { success: true, data: result };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to get vehicles",
        };
      }
    }
  );

  // Get vehicle by ID
  ipcMain.handle("vehicles:getById", async (_event, vehicleId: number) => {
    try {
      const vehicleManager = authManager.getVehicleManager();
      const vehicle = vehicleManager.getById(vehicleId);
      if (!vehicle) {
        return { success: false, error: "Vehicle not found" };
      }
      return { success: true, data: vehicle };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get vehicle",
      };
    }
  });

  // Create new vehicle
  ipcMain.handle(
    "vehicles:create",
    async (
      _event,
      vehicleData: { plate_number: string; customer_id: number }
    ) => {
      try {
        const vehicleManager = authManager.getVehicleManager();
        const vehicle = vehicleManager.create(vehicleData);
        return { success: true, data: vehicle };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to create vehicle",
        };
      }
    }
  );

  // Update existing vehicle
  ipcMain.handle(
    "vehicles:update",
    async (
      _event,
      vehicleId: number,
      vehicleData: {
        plate_number?: string;
        customer_id?: number;
        is_active?: boolean;
      }
    ) => {
      try {
        const vehicleManager = authManager.getVehicleManager();
        const vehicle = vehicleManager.update(vehicleId, vehicleData);
        if (!vehicle) {
          return { success: false, error: "Vehicle not found" };
        }
        return { success: true, data: vehicle };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to update vehicle",
        };
      }
    }
  );

  // Delete vehicle
  ipcMain.handle("vehicles:delete", async (_event, vehicleId: number) => {
    try {
      const vehicleManager = authManager.getVehicleManager();
      const success = vehicleManager.delete(vehicleId);
      if (!success) {
        return { success: false, error: "Failed to delete vehicle" };
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete vehicle",
      };
    }
  });

  // Search vehicles
  ipcMain.handle("vehicles:search", async (_event, query: string) => {
    try {
      const vehicleManager = authManager.getVehicleManager();
      const vehicles = vehicleManager.search(query);
      return { success: true, data: vehicles };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to search vehicles",
      };
    }
  });

  // Get vehicles by customer ID
  ipcMain.handle(
    "vehicles:getByCustomerId",
    async (_event, customerId: number) => {
      try {
        const vehicleManager = authManager.getVehicleManager();
        const vehicles = vehicleManager.getByCustomerId(customerId);
        return { success: true, data: vehicles };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to get customer vehicles",
        };
      }
    }
  );

  // Get active vehicles only
  ipcMain.handle("vehicles:getActive", async () => {
    try {
      const vehicleManager = authManager.getVehicleManager();
      const vehicles = vehicleManager.getActive();
      return { success: true, data: vehicles };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get active vehicles",
      };
    }
  });

  // Check if plate number exists
  ipcMain.handle(
    "vehicles:plateNumberExists",
    async (_event, plateNumber: string, excludeId?: number) => {
      try {
        const vehicleManager = authManager.getVehicleManager();
        const exists = vehicleManager.plateNumberExists(plateNumber, excludeId);
        return { success: true, data: exists };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to check plate number",
        };
      }
    }
  );

  // ============================================
  // Transaction Management CRUD Handlers
  // ============================================

  // Get all transactions with filters
  ipcMain.handle(
    "transactions:getAll",
    async (
      _event,
      filters: {
        status?: string;
        paymentStatus?: string;
        customerId?: number;
        vehicleId?: number;
        dateFrom?: string;
        dateTo?: string;
        page?: number;
        limit?: number;
      } = {}
    ) => {
      try {
        const transactionManager = authManager.getTransactionManager();
        const result = transactionManager.getAllTransactions({
          ...filters,
          status: filters.status as
            | "CREATED"
            | "QUEUED"
            | "LOADING"
            | "DONE"
            | "CHECKED_OUT"
            | undefined,
          paymentStatus: filters.paymentStatus as "UNPAID" | "PAID" | undefined,
        });
        return { success: true, data: result };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to get transactions",
        };
      }
    }
  );

  // Get transaction by ID
  ipcMain.handle(
    "transactions:getById",
    async (_event, transactionId: number) => {
      try {
        const transactionManager = authManager.getTransactionManager();
        const transaction =
          transactionManager.getTransactionById(transactionId);
        if (!transaction) {
          return { success: false, error: "Transaction not found" };
        }
        return { success: true, data: transaction };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to get transaction",
        };
      }
    }
  );

  // Create new transaction
  ipcMain.handle(
    "transactions:create",
    async (
      _event,
      transactionData: {
        transactionTypeId: number;
        customerId: number;
        vehicleId: number;
        items: { itemId: number; qty: number; price: number }[];
        notes?: string;
      },
      userId: number
    ) => {
      try {
        const transactionManager = authManager.getTransactionManager();
        const transaction = transactionManager.createTransaction(
          transactionData,
          userId
        );

        // Queue sync for created transaction with items
        if (transaction) {
          console.log(
            `[Transaction Sync] Queuing sync for transaction ${
              transaction.id
            } with ${transaction.items?.length || 0} items`
          );

          // Transform to camelCase format expected by ERP (as per erp-cloud-sync-plan.md)
          // Note: Items are included in the transaction payload, so no need for separate transaction_item sync
          await queueSyncOperation(
            "transaction",
            "create",
            {
              id: transaction.id,
              invoiceNumber: transaction.invoiceNumber,
              transactionNumber: transaction.invoiceNumber, // Use invoice as transaction number
              transactionTypeId: transaction.transactionTypeId,
              customerId: transaction.customerId,
              vehicleId: transaction.vehicleId,
              totalAmount: transaction.totalAmount,
              paymentStatus: transaction.paymentStatus,
              transactionStatus: transaction.transactionStatus,
              createdBy: transaction.createdBy,
              notes: transaction.notes || null,
              // Include items for nested sync - ERP Cloud will handle items from this payload
              items: transaction.items?.map((item) => ({
                id: item.id,
                itemId: item.itemId,
                itemName: item.itemName || "Unknown Item",
                itemUnit: item.itemUnit || "unit",
                itemPrice: item.price,
                qty: item.qty,
                subtotal: item.subtotal,
              })),
            },
            transaction.id
          );

          console.log(
            `[Transaction Sync] Successfully queued sync for transaction ${transaction.id} (${transaction.invoiceNumber})`
          );
        }

        return { success: true, data: transaction };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to create transaction",
        };
      }
    }
  );

  // Update existing transaction
  ipcMain.handle(
    "transactions:update",
    async (
      _event,
      transactionId: number,
      transactionData: {
        transactionTypeId?: number;
        customerId?: number;
        vehicleId?: number;
        items?: { itemId: number; qty: number; price: number }[];
        notes?: string;
      }
    ) => {
      try {
        const transactionManager = authManager.getTransactionManager();
        const transaction = transactionManager.updateTransaction(
          transactionId,
          transactionData
        );
        if (!transaction) {
          return { success: false, error: "Transaction not found" };
        }
        return { success: true, data: transaction };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to update transaction",
        };
      }
    }
  );

  // Delete transaction
  ipcMain.handle(
    "transactions:delete",
    async (_event, transactionId: number) => {
      try {
        const transactionManager = authManager.getTransactionManager();
        const success = transactionManager.deleteTransaction(transactionId);
        if (!success) {
          return { success: false, error: "Failed to delete transaction" };
        }

        // Queue sync for deleted transaction
        await queueSyncOperation(
          "transaction",
          "delete",
          { id: transactionId },
          transactionId
        );

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to delete transaction",
        };
      }
    }
  );

  // Search transactions
  ipcMain.handle("transactions:search", async (_event, query: string) => {
    try {
      const transactionManager = authManager.getTransactionManager();
      const transactions = transactionManager.searchTransactions(query);
      return { success: true, data: transactions };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to search transactions",
      };
    }
  });

  // Update transaction status
  ipcMain.handle(
    "transactions:updateStatus",
    async (
      _event,
      transactionId: number,
      newStatus: string,
      userId: number,
      note?: string
    ) => {
      try {
        const transactionManager = authManager.getTransactionManager();
        const transaction = transactionManager.updateTransactionStatus(
          transactionId,
          newStatus as
            | "CREATED"
            | "QUEUED"
            | "LOADING"
            | "DONE"
            | "CHECKED_OUT",
          userId,
          note
        );
        if (!transaction) {
          return { success: false, error: "Transaction not found" };
        }

        // Queue sync for status change
        await queueSyncOperation(
          "transaction",
          "update",
          { id: transactionId, status: newStatus },
          transactionId
        );

        return { success: true, data: transaction };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to update transaction status",
        };
      }
    }
  );

  // Get status history for a transaction
  ipcMain.handle(
    "transactions:getStatusHistory",
    async (_event, transactionId: number) => {
      try {
        const transactionManager = authManager.getTransactionManager();
        const history = transactionManager.getStatusHistory(transactionId);
        return { success: true, data: history };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to get status history",
        };
      }
    }
  );

  // Add payment to transaction
  ipcMain.handle(
    "transactions:addPayment",
    async (
      _event,
      transactionId: number,
      paymentData: { paymentMethodId: number; amount: number; notes?: string },
      verifiedBy: number
    ) => {
      try {
        const transactionManager = authManager.getTransactionManager();
        const payment = transactionManager.addPayment(
          transactionId,
          paymentData,
          verifiedBy
        );
        if (!payment) {
          return { success: false, error: "Transaction not found" };
        }

        // Queue sync for created payment
        await queueSyncOperation(
          "transaction_payment",
          "create",
          { ...payment, transaction_id: transactionId },
          payment.id
        );

        return { success: true, data: payment };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to add payment",
        };
      }
    }
  );

  // Get payments for a transaction
  ipcMain.handle(
    "transactions:getPayments",
    async (_event, transactionId: number) => {
      try {
        const transactionManager = authManager.getTransactionManager();
        const payments = transactionManager.getPayments(transactionId);
        return { success: true, data: payments };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to get payments",
        };
      }
    }
  );

  // Get daily statistics
  ipcMain.handle(
    "transactions:getDailyStats",
    async (_event, date?: string) => {
      try {
        const transactionManager = authManager.getTransactionManager();
        const stats = transactionManager.getDailyStats(date);
        return { success: true, data: stats };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to get daily stats",
        };
      }
    }
  );

  // ============================================
  // Transaction Types CRUD Handlers
  // ============================================

  // Get all transaction types
  ipcMain.handle("transactionTypes:getAll", async () => {
    try {
      const transactionManager = authManager.getTransactionManager();
      const types = transactionManager.getTransactionTypes();
      return { success: true, data: types };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get transaction types",
      };
    }
  });

  // Get transaction type by ID
  ipcMain.handle("transactionTypes:getById", async (_event, id: number) => {
    try {
      const transactionManager = authManager.getTransactionManager();
      const type = transactionManager.getTransactionTypeById(id);
      if (!type) {
        return { success: false, error: "Transaction type not found" };
      }
      return { success: true, data: type };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get transaction type",
      };
    }
  });

  // Create new transaction type
  ipcMain.handle(
    "transactionTypes:create",
    async (
      _event,
      data: { name: string; code: string; is_active?: boolean }
    ) => {
      try {
        const transactionManager = authManager.getTransactionManager();
        const type = transactionManager.createTransactionType(data);
        return { success: true, data: type };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to create transaction type",
        };
      }
    }
  );

  // Update existing transaction type
  ipcMain.handle(
    "transactionTypes:update",
    async (
      _event,
      id: number,
      data: { name?: string; code?: string; is_active?: boolean }
    ) => {
      try {
        const transactionManager = authManager.getTransactionManager();
        const type = transactionManager.updateTransactionType(id, data);
        if (!type) {
          return { success: false, error: "Transaction type not found" };
        }
        return { success: true, data: type };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to update transaction type",
        };
      }
    }
  );

  // Delete transaction type (soft delete)
  ipcMain.handle("transactionTypes:delete", async (_event, id: number) => {
    try {
      const transactionManager = authManager.getTransactionManager();
      const success = transactionManager.deleteTransactionType(id);
      if (!success) {
        return { success: false, error: "Failed to delete transaction type" };
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete transaction type",
      };
    }
  });

  // Get active transaction types only
  ipcMain.handle("transactionTypes:getActive", async () => {
    try {
      const transactionManager = authManager.getTransactionManager();
      const types = transactionManager.getActiveTransactionTypes();
      return { success: true, data: types };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get active transaction types",
      };
    }
  });

  // ============================================
  // Payment Methods CRUD Handlers
  // ============================================

  // Get all payment methods with filters
  ipcMain.handle(
    "paymentMethods:getAll",
    async (
      _event,
      filters: {
        name?: string;
        is_active?: boolean;
        page?: number;
        limit?: number;
      } = {}
    ) => {
      try {
        const paymentManager = authManager.getPaymentManager();
        const result = paymentManager.getAll(filters);
        return { success: true, data: result };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to get payment methods",
        };
      }
    }
  );

  // Get payment method by ID
  ipcMain.handle("paymentMethods:getById", async (_event, id: number) => {
    try {
      const paymentManager = authManager.getPaymentManager();
      const method = paymentManager.getById(id);
      if (!method) {
        return { success: false, error: "Payment method not found" };
      }
      return { success: true, data: method };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get payment method",
      };
    }
  });

  // Create new payment method
  ipcMain.handle(
    "paymentMethods:create",
    async (
      _event,
      data: { name: string; code: string; is_active?: boolean }
    ) => {
      try {
        const paymentManager = authManager.getPaymentManager();
        const method = paymentManager.create(data);
        return { success: true, data: method };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to create payment method",
        };
      }
    }
  );

  // Update existing payment method
  ipcMain.handle(
    "paymentMethods:update",
    async (
      _event,
      id: number,
      data: { name?: string; code?: string; is_active?: boolean }
    ) => {
      try {
        const paymentManager = authManager.getPaymentManager();
        const method = paymentManager.update(id, data);
        if (!method) {
          return { success: false, error: "Payment method not found" };
        }
        return { success: true, data: method };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to update payment method",
        };
      }
    }
  );

  // Delete payment method (soft delete)
  ipcMain.handle("paymentMethods:delete", async (_event, id: number) => {
    try {
      const paymentManager = authManager.getPaymentManager();
      const success = paymentManager.delete(id);
      if (!success) {
        return { success: false, error: "Failed to delete payment method" };
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete payment method",
      };
    }
  });

  // Get active payment methods only
  ipcMain.handle("paymentMethods:getActive", async () => {
    try {
      const paymentManager = authManager.getPaymentManager();
      const methods = paymentManager.getActive();
      return { success: true, data: methods };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get active payment methods",
      };
    }
  });

  // ============================================
  // Loaders CRUD Handlers
  // ============================================

  // Get all loaders with filters
  ipcMain.handle(
    "loaders:getAll",
    async (
      _event,
      filters: {
        name?: string;
        is_active?: boolean;
        page?: number;
        limit?: number;
      } = {}
    ) => {
      try {
        const loaderManager = authManager.getLoaderManager();
        const result = loaderManager.getAll(filters);
        return { success: true, data: result };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to get loaders",
        };
      }
    }
  );

  // Get loader by ID
  ipcMain.handle("loaders:getById", async (_event, id: number) => {
    try {
      const loaderManager = authManager.getLoaderManager();
      const loader = loaderManager.getById(id);
      if (!loader) {
        return { success: false, error: "Loader not found" };
      }
      return { success: true, data: loader };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get loader",
      };
    }
  });

  // Create new loader
  ipcMain.handle(
    "loaders:create",
    async (
      _event,
      data: { name: string; code: string; is_active?: boolean }
    ) => {
      try {
        const loaderManager = authManager.getLoaderManager();
        const loader = loaderManager.create(data);

        // Queue sync for created loader
        if (loader) {
          await queueSyncOperation("loader", "create", loader, loader.id);
        }

        return { success: true, data: loader };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to create loader",
        };
      }
    }
  );

  // Update existing loader
  ipcMain.handle(
    "loaders:update",
    async (
      _event,
      id: number,
      data: { name?: string; code?: string; is_active?: boolean }
    ) => {
      try {
        const loaderManager = authManager.getLoaderManager();
        const loader = loaderManager.update(id, data);
        if (!loader) {
          return { success: false, error: "Loader not found" };
        }

        // Queue sync for updated loader
        await queueSyncOperation("loader", "update", loader, id);

        return { success: true, data: loader };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to update loader",
        };
      }
    }
  );

  // Delete loader (soft delete)
  ipcMain.handle("loaders:delete", async (_event, id: number) => {
    try {
      const loaderManager = authManager.getLoaderManager();
      const success = loaderManager.delete(id);
      if (!success) {
        return { success: false, error: "Failed to delete loader" };
      }

      // Queue sync for deleted loader
      await queueSyncOperation("loader", "delete", { id }, id);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete loader",
      };
    }
  });

  // Get active loaders only
  ipcMain.handle("loaders:getActive", async () => {
    try {
      const loaderManager = authManager.getLoaderManager();
      const loaders = loaderManager.getActive();
      return { success: true, data: loaders };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get active loaders",
      };
    }
  });

  // ============================================
  // Payment Verification Handlers
  // ============================================

  // Get pending payments for verification
  ipcMain.handle(
    "payments:getPending",
    async (
      _event,
      filters?: {
        verificationStatus?: "PENDING" | "VERIFIED" | "REJECTED";
        transactionId?: number;
        customerId?: number;
        dateFrom?: string;
        dateTo?: string;
        page?: number;
        limit?: number;
      }
    ) => {
      try {
        const user = await authManager.getCurrentUser();
        if (!user) {
          return { success: false, error: "Not authenticated" };
        }

        // Check VERIFY_PAYMENT permission
        const hasPermission = user.permissions.includes("VERIFY_PAYMENT");
        if (!hasPermission) {
          return {
            success: false,
            error: "You do not have permission to verify payments",
          };
        }

        const transactionManager = authManager.getTransactionManager();
        const result = transactionManager.getPendingPayments(filters);
        return { success: true, data: result };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to get pending payments",
        };
      }
    }
  );

  // Get single payment by ID
  ipcMain.handle("payments:getById", async (_event, paymentId: number) => {
    try {
      const user = await authManager.getCurrentUser();
      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      const transactionManager = authManager.getTransactionManager();
      const payment = transactionManager.getPaymentById(paymentId);
      if (!payment) {
        return { success: false, error: "Payment not found" };
      }
      return { success: true, data: payment };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get payment",
      };
    }
  });

  // Verify payment (PENDING → VERIFIED)
  ipcMain.handle(
    "payments:verify",
    async (
      _event,
      paymentId: number,
      notes?: string,
      proofData?: { imageData: string; fileName: string }
    ) => {
      try {
        const user = await authManager.getCurrentUser();
        if (!user) {
          return { success: false, error: "Not authenticated" };
        }

        // Check VERIFY_PAYMENT permission
        const hasPermission = user.permissions.includes("VERIFY_PAYMENT");
        if (!hasPermission) {
          return {
            success: false,
            error: "You do not have permission to verify payments",
          };
        }

        const transactionManager = authManager.getTransactionManager();
        const payment = await transactionManager.verifyPayment(
          paymentId,
          user.id,
          notes,
          proofData
        );

        // Queue sync for verification status change
        await queueSyncOperation(
          "payment_verification",
          "update",
          {
            id: paymentId,
            verification_status: "VERIFIED",
            verified_by: user.id,
          },
          paymentId
        );

        return { success: true, data: payment };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to verify payment",
        };
      }
    }
  );

  // Reject payment (PENDING → REJECTED)
  ipcMain.handle(
    "payments:reject",
    async (
      _event,
      paymentId: number,
      reason: string,
      notes?: string,
      proofData?: { imageData: string; fileName: string }
    ) => {
      try {
        const user = await authManager.getCurrentUser();
        if (!user) {
          return { success: false, error: "Not authenticated" };
        }

        // Check VERIFY_PAYMENT permission
        const hasPermission = user.permissions.includes("VERIFY_PAYMENT");
        if (!hasPermission) {
          return {
            success: false,
            error: "You do not have permission to verify payments",
          };
        }

        const transactionManager = authManager.getTransactionManager();
        const payment = await transactionManager.rejectPayment(
          paymentId,
          user.id,
          reason,
          notes,
          proofData
        );

        // Queue sync for rejection status change
        await queueSyncOperation(
          "payment_verification",
          "update",
          {
            id: paymentId,
            verification_status: "REJECTED",
            verified_by: user.id,
            rejection_reason: reason,
          },
          paymentId
        );

        return { success: true, data: payment };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to reject payment",
        };
      }
    }
  );

  // Get verification statistics
  ipcMain.handle(
    "payments:getVerificationStats",
    async (_event, dateRange?: { from: string; to: string }) => {
      try {
        const user = await authManager.getCurrentUser();
        if (!user) {
          return { success: false, error: "Not authenticated" };
        }

        const transactionManager = authManager.getTransactionManager();
        const stats = transactionManager.getVerificationStats(dateRange);
        return { success: true, data: stats };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to get verification stats",
        };
      }
    }
  );

  // Upload payment proof
  ipcMain.handle(
    "payments:uploadProof",
    async (_event, paymentId: number, imageData: string, fileName: string) => {
      try {
        const user = await authManager.getCurrentUser();
        if (!user) {
          return { success: false, error: "Not authenticated" };
        }

        // Check VERIFY_PAYMENT permission
        const hasPermission = user.permissions.includes("VERIFY_PAYMENT");
        if (!hasPermission) {
          return {
            success: false,
            error: "You do not have permission to upload payment proofs",
          };
        }

        const transactionManager = authManager.getTransactionManager();
        const buffer = Buffer.from(imageData, "base64");
        const filePath = await transactionManager.savePaymentProof(
          paymentId,
          buffer,
          fileName
        );
        return { success: true, filePath };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to upload payment proof",
        };
      }
    }
  );

  // Get payment proof path
  ipcMain.handle("payments:getProofPath", async (_event, paymentId: number) => {
    try {
      const user = await authManager.getCurrentUser();
      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      const transactionManager = authManager.getTransactionManager();
      const filePath = transactionManager.getPaymentProofPath(paymentId);
      return { success: true, filePath };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get payment proof path",
      };
    }
  });

  // Delete payment proof
  ipcMain.handle("payments:deleteProof", async (_event, paymentId: number) => {
    try {
      const user = await authManager.getCurrentUser();
      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      // Check VERIFY_PAYMENT permission
      const hasPermission = user.permissions.includes("VERIFY_PAYMENT");
      if (!hasPermission) {
        return {
          success: false,
          error: "You do not have permission to delete payment proofs",
        };
      }

      const transactionManager = authManager.getTransactionManager();
      const deleted = transactionManager.deletePaymentProof(paymentId);
      return { success: true, deleted };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete payment proof",
      };
    }
  });

  // Read payment proof file as base64
  ipcMain.handle(
    "payments:readProofFile",
    async (_event, paymentIdOrPath: number | string) => {
      try {
        const user = await authManager.getCurrentUser();
        if (!user) {
          return { success: false, error: "Not authenticated" };
        }

        const transactionManager = authManager.getTransactionManager();

        // If it's a number, use the new method with fallback
        if (typeof paymentIdOrPath === "number") {
          const result =
            transactionManager.getPaymentProofWithFallback(paymentIdOrPath);

          if (!result.data) {
            return {
              success: false,
              error: "No payment proof available",
            };
          }

          return {
            success: true,
            data: {
              data: result.data,
              source: result.type, // 'file' or 'thumbnail'
            },
          };
        }

        // Legacy: If it's a string path, read file directly
        // Security check: ensure file is in payment-proofs directory
        const userDataPath = app.getPath("userData");
        const proofsDir = path.join(userDataPath, "payment-proofs");
        const normalizedPath = path.normalize(paymentIdOrPath);

        if (!normalizedPath.startsWith(proofsDir)) {
          return {
            success: false,
            error: "Invalid file path",
          };
        }

        // Check if file exists
        if (!fs.existsSync(normalizedPath)) {
          return {
            success: false,
            error: "File not found",
          };
        }

        // Read file as base64
        const fileBuffer = fs.readFileSync(normalizedPath);
        const base64 = fileBuffer.toString("base64");
        const ext = path.extname(normalizedPath).toLowerCase();

        // Determine MIME type
        let mimeType = "application/octet-stream";
        if (ext === ".jpg" || ext === ".jpeg") {
          mimeType = "image/jpeg";
        } else if (ext === ".png") {
          mimeType = "image/png";
        } else if (ext === ".pdf") {
          mimeType = "application/pdf";
        }

        return {
          success: true,
          data: {
            data: `data:${mimeType};base64,${base64}`,
            source: "file",
          },
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to read payment proof file",
        };
      }
    }
  );

  // Open payment proof with native image viewer
  ipcMain.handle(
    "payments:openProofWithViewer",
    async (_event, paymentId: number) => {
      try {
        const user = await authManager.getCurrentUser();
        if (!user) {
          return { success: false, error: "Not authenticated" };
        }

        const transactionManager = authManager.getTransactionManager();
        const filePath = transactionManager.getPaymentProofPath(paymentId);

        if (!filePath) {
          return { success: false, error: "Payment proof not found" };
        }

        // Check if file exists
        if (!fs.existsSync(filePath)) {
          return { success: false, error: "Proof file does not exist" };
        }

        // Open with default system viewer
        const result = await shell.openPath(filePath);

        if (result) {
          // openPath returns error string if failed, empty string if success
          return { success: false, error: result };
        }

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to open proof file",
        };
      }
    }
  );

  // Save payment proof to user-selected location
  ipcMain.handle(
    "payments:saveProofAs",
    async (_event, paymentId: number, fileName: string) => {
      try {
        const user = await authManager.getCurrentUser();
        if (!user) {
          return { success: false, error: "Not authenticated" };
        }

        const transactionManager = authManager.getTransactionManager();
        const result =
          transactionManager.getPaymentProofWithFallback(paymentId);

        if (!result.data) {
          return { success: false, error: "Payment proof not available" };
        }

        // Show save dialog
        const saveResult = await dialog.showSaveDialog({
          title: "Simpan Bukti Pembayaran",
          defaultPath: fileName || `payment-proof-${paymentId}.jpg`,
          filters: [
            { name: "Images", extensions: ["jpg", "jpeg", "png"] },
            { name: "All Files", extensions: ["*"] },
          ],
        });

        if (saveResult.canceled || !saveResult.filePath) {
          return { success: false, error: "Save canceled" };
        }

        // Convert base64 data URL to buffer
        const base64Data = result.data.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");

        // Write to selected location
        fs.writeFileSync(saveResult.filePath, buffer);

        return { success: true, filePath: saveResult.filePath };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to save proof file",
        };
      }
    }
  );

  // ============================================
  // Settings IPC Handlers
  // ============================================

  // Get all settings
  ipcMain.handle("settings:getAll", async () => {
    try {
      if (!settingsManager) {
        return { success: false, error: "Settings manager not initialized" };
      }
      const settings = settingsManager.getAll();
      return { success: true, data: settings };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get settings",
      };
    }
  });

  // Get single setting
  ipcMain.handle("settings:get", async (_event, key: string) => {
    try {
      if (!settingsManager) {
        return { success: false, error: "Settings manager not initialized" };
      }
      const setting = settingsManager.getRaw(key);
      return { success: true, data: setting };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get setting",
      };
    }
  });

  // Get typed setting value
  ipcMain.handle(
    "settings:getValue",
    async (_event, key: string, defaultValue?: unknown) => {
      try {
        if (!settingsManager) {
          return { success: false, error: "Settings manager not initialized" };
        }
        const value = settingsManager.get(key, defaultValue);
        return { success: true, data: value };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to get setting value",
        };
      }
    }
  );

  // Set setting value
  ipcMain.handle(
    "settings:set",
    async (
      _event,
      key: string,
      value: string | number | boolean | object,
      options?: { type?: string; category?: string; description?: string }
    ) => {
      try {
        if (!settingsManager) {
          return { success: false, error: "Settings manager not initialized" };
        }
        const success = settingsManager.set(
          key,
          value,
          options as {
            type?: "string" | "number" | "boolean" | "json";
            category?: "general" | "sync" | "display" | "security";
            description?: string;
          }
        );

        // Reset ERPClient instance when URL changes
        if (key === "erp_api_url") {
          ERPClient.resetInstance();
        }

        return { success };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to set setting",
        };
      }
    }
  );

  // Set multiple settings
  ipcMain.handle(
    "settings:setMultiple",
    async (
      _event,
      settings: Array<{
        key: string;
        value: string | number | boolean | object;
        type?: string;
        category?: string;
        description?: string;
      }>
    ) => {
      try {
        if (!settingsManager) {
          return { success: false, error: "Settings manager not initialized" };
        }
        const success = settingsManager.setMultiple(
          settings as Array<{
            key: string;
            value: string | number | boolean | object;
            type?: "string" | "number" | "boolean" | "json";
            category?: "general" | "sync" | "display" | "security";
            description?: string;
          }>
        );
        ERPClient.resetInstance();
        return { success };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to set settings",
        };
      }
    }
  );

  // Get settings by category
  ipcMain.handle("settings:getByCategory", async (_event, category: string) => {
    try {
      if (!settingsManager) {
        return { success: false, error: "Settings manager not initialized" };
      }
      const settings = settingsManager.getByCategory(
        category as "general" | "sync" | "display" | "security"
      );
      return { success: true, data: settings };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get settings",
      };
    }
  });

  // Test ERP connection
  ipcMain.handle("settings:testConnection", async (_event, url?: string) => {
    try {
      const testUrl = url || settingsManager?.getErpApiUrl();
      if (!testUrl) {
        return { success: false, error: "No URL provided" };
      }
      const result = await ERPClient.testConnectionTo(testUrl);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Connection test failed",
      };
    }
  });

  // ============================================
  // Sync IPC Handlers
  // ============================================

  // Get sync stats
  ipcMain.handle("sync:getStats", async () => {
    try {
      if (!syncManager) {
        return { success: false, error: "Sync manager not initialized" };
      }
      const stats = await syncManager.getSyncStats();
      return { success: true, data: stats };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get sync stats",
      };
    }
  });

  // Get sync logs
  ipcMain.handle(
    "sync:getLogs",
    async (
      _event,
      filters?: {
        entityType?: string;
        status?: string;
        direction?: string;
        limit?: number;
        offset?: number;
      }
    ) => {
      try {
        if (!syncManager) {
          return { success: false, error: "Sync manager not initialized" };
        }
        const logs = await syncManager.getSyncLogs(filters);
        return { success: true, data: logs };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to get sync logs",
        };
      }
    }
  );

  // Start sync all
  ipcMain.handle("sync:syncAll", async () => {
    try {
      if (!syncManager) {
        return { success: false, error: "Sync manager not initialized" };
      }

      // Initialize sync with current access token
      const session = await authManager.getCurrentUser();
      if (session) {
        const accessToken = await authManager.getAccessToken();
        if (accessToken) {
          syncManager.initialize(accessToken);
        }
      }

      const result = await syncManager.syncAll();
      return { success: result.success, message: result.message };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Sync failed",
      };
    }
  });

  // Retry failed sync
  ipcMain.handle("sync:retry", async (_event, syncId: string) => {
    try {
      if (!syncManager) {
        return { success: false, error: "Sync manager not initialized" };
      }
      const success = await syncManager.retrySyncLog(syncId);
      return { success };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Retry failed",
      };
    }
  });

  // Start sync scheduler
  ipcMain.handle("sync:startScheduler", async () => {
    try {
      if (!syncManager) {
        return { success: false, error: "Sync manager not initialized" };
      }

      // Initialize with access token
      const accessToken = await authManager.getAccessToken();
      if (accessToken) {
        syncManager.initialize(accessToken);
      }

      syncManager.startScheduler();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to start scheduler",
      };
    }
  });

  // Stop sync scheduler
  ipcMain.handle("sync:stopScheduler", async () => {
    try {
      if (!syncManager) {
        return { success: false, error: "Sync manager not initialized" };
      }
      syncManager.stopScheduler();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to stop scheduler",
      };
    }
  });

  // Get network/online status for sync
  ipcMain.handle("sync:isOnline", async () => {
    try {
      if (!networkStatus) {
        return { success: false, error: "Network status not initialized" };
      }
      // Use getStatus() for cached value (synchronous)
      const isOnline = networkStatus.getStatus();
      return { success: true, data: isOnline };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get online status",
      };
    }
  });

  // Get network status with more details
  ipcMain.handle("sync:getNetworkStatus", async () => {
    try {
      if (!networkStatus) {
        return { success: false, error: "Network status not initialized" };
      }
      // Use getStatus() for cached boolean value, or await isOnline() for fresh check
      const isOnline = networkStatus.getStatus();
      return { success: true, data: { isOnline } };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get network status",
      };
    }
  });

  // Sync specific entity type
  ipcMain.handle(
    "sync:syncEntity",
    async (_event, entityType: string, direction?: string) => {
      try {
        if (!syncManager) {
          return { success: false, error: "Sync manager not initialized" };
        }

        // Initialize sync with current access token
        const session = await authManager.getCurrentUser();
        if (session) {
          const accessToken = await authManager.getAccessToken();
          if (accessToken) {
            syncManager.initialize(accessToken);
          }
        }

        let result;
        switch (entityType) {
          case "customer":
            result = await syncManager.syncCustomers(
              direction as "push" | "pull" | undefined
            );
            break;
          case "item":
            result = await syncManager.syncItems(
              direction as "push" | "pull" | undefined
            );
            break;
          case "payment_verification":
            result = await syncManager.syncPaymentVerifications(
              direction as "push" | "pull" | undefined
            );
            break;
          default:
            return {
              success: false,
              error: `Unknown entity type: ${entityType}`,
            };
        }

        return { success: result.success, message: result.message };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Sync entity failed",
        };
      }
    }
  );

  // Retry all failed syncs
  ipcMain.handle("sync:retryFailed", async () => {
    try {
      if (!syncManager) {
        return { success: false, error: "Sync manager not initialized" };
      }

      // Initialize sync with current access token
      const accessToken = await authManager.getAccessToken();
      if (accessToken) {
        syncManager.initialize(accessToken);
      }

      const result = await syncManager.retryAllFailed();
      return { success: result.success, message: result.message };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Retry failed syncs failed",
      };
    }
  });

  // Push initial data (synced_at IS NULL) to ERP Cloud
  ipcMain.handle("sync:pushInitialData", async (_event, entityType: string) => {
    try {
      if (!syncManager) {
        return { success: false, error: "Sync manager not initialized" };
      }

      // Initialize sync with current access token
      const session = await authManager.getCurrentUser();
      if (session) {
        const accessToken = await authManager.getAccessToken();
        if (accessToken) {
          syncManager.initialize(accessToken);
        }
      }

      const result = await syncManager.pushInitialData(
        entityType as "customer" | "item" | "transaction_vehicle"
      );
      return {
        success: result.success,
        message: result.message,
        data: { count: result.count },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Push initial data failed",
      };
    }
  });

  // Push all initial data (all entities with synced_at IS NULL)
  ipcMain.handle("sync:pushAllInitialData", async () => {
    try {
      if (!syncManager) {
        return { success: false, error: "Sync manager not initialized" };
      }

      // Initialize sync with current access token
      const session = await authManager.getCurrentUser();
      if (session) {
        const accessToken = await authManager.getAccessToken();
        if (accessToken) {
          syncManager.initialize(accessToken);
        }
      }

      const results: Array<{
        entityType: string;
        success: boolean;
        message: string;
        count: number;
      }> = [];

      // Sync all supported entity types
      const entityTypes: Array<"customer" | "item" | "transaction_vehicle"> = [
        "customer",
        "item",
        "transaction_vehicle",
      ];

      for (const entityType of entityTypes) {
        const result = await syncManager.pushInitialData(entityType);
        results.push({
          entityType,
          success: result.success,
          message: result.message,
          count: result.count,
        });
      }

      const totalSuccess = results.reduce(
        (sum, r) => sum + (r.success ? r.count : 0),
        0
      );
      const totalFailed = results.reduce(
        (sum, r) => sum + (!r.success ? 1 : 0),
        0
      );

      return {
        success: totalFailed === 0,
        message: `Initial sync completed: ${totalSuccess} records synced, ${totalFailed} failed`,
        data: { results, totalSuccess, totalFailed },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Push all initial data failed",
      };
    }
  });
}

// ============================================================================
// PRINTER IPC HANDLERS
// ============================================================================
function setupPrinterHandlers() {
  // Get all printers installed on the system
  ipcMain.handle("printer:getPrinters", async () => {
    try {
      if (!printerManager) {
        return { success: false, error: "Printer manager not initialized" };
      }

      const printers = await printerManager.getPrinters();
      return { success: true, data: printers };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get printers",
      };
    }
  });

  // Get current printer configuration
  ipcMain.handle("printer:getPrinterConfig", async () => {
    try {
      if (!printerManager) {
        return { success: false, error: "Printer manager not initialized" };
      }

      const config = printerManager.getPrinterConfig();
      return { success: true, data: config };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get printer config",
      };
    }
  });

  // Save printer configuration
  ipcMain.handle("printer:savePrinterConfig", async (_event, config) => {
    try {
      if (!printerManager) {
        return { success: false, error: "Printer manager not initialized" };
      }

      const success = printerManager.savePrinterConfig(config);
      return { success: true, data: success };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save printer config",
      };
    }
  });

  // Print test receipt
  ipcMain.handle("printer:printTest", async (_event, config) => {
    try {
      if (!printerManager) {
        return { success: false, error: "Printer manager not initialized" };
      }

      // Get current user info for receipt
      const session = await authManager.getCurrentUser();
      const userName = session
        ? `${session.firstName} ${session.lastName}`
        : undefined;

      const result = await printerManager.printTest(config, userName);
      return { success: result.success, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to print test",
      };
    }
  });

  // Print receipt
  ipcMain.handle("printer:printReceipt", async (_event, data, config) => {
    try {
      if (!printerManager) {
        return { success: false, error: "Printer manager not initialized" };
      }

      const result = await printerManager.printReceipt(data, config);
      return { success: result.success, data: result };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to print receipt",
      };
    }
  });

  // Print surat kirim
  ipcMain.handle("printer:printSuratKirim", async (_event, data, config) => {
    try {
      if (!printerManager) {
        return { success: false, error: "Printer manager not initialized" };
      }

      const result = await printerManager.printSuratKirim(data, config);
      return { success: result.success, data: result };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to print surat kirim",
      };
    }
  });

  // Preview template
  ipcMain.handle(
    "printer:previewTemplate",
    async (_event, templateId, data) => {
      try {
        if (!printerManager) {
          return { success: false, error: "Printer manager not initialized" };
        }

        const html = printerManager.previewTemplate(templateId, data);
        return { success: true, data: html };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to preview template",
        };
      }
    }
  );

  // Get available templates
  ipcMain.handle("printer:getTemplates", async () => {
    try {
      if (!printerManager) {
        return { success: false, error: "Printer manager not initialized" };
      }

      const templates = printerManager.getTemplates();
      return { success: true, data: templates };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get templates",
      };
    }
  });
}

app.whenReady().then(async () => {
  await initializeAuth();
  setupAuthHandlers();
  setupPrinterHandlers();
  createWindow();
});
