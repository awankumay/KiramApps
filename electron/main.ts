import { app, BrowserWindow, ipcMain, shell, dialog } from "electron";
// import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as fs from "fs";
import { createDatabase } from "./auth/database";
import { AuthManager } from "./auth/AuthManager";
import { runMigrations } from "./database/index";

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

    authManager = new AuthManager(db);
    console.log("Authentication system initialized");
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
    async (_event, customerData: { name: string; category: string }) => {
      try {
        const customerManager = authManager.getCustomerManager();
        const customer = customerManager.create(customerData);
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
      customerData: { name?: string; category?: string; is_active?: boolean }
    ) => {
      try {
        const customerManager = authManager.getCustomerManager();
        const customer = customerManager.update(customerId, customerData);
        if (!customer) {
          return { success: false, error: "Customer not found" };
        }
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

  // Get all payment methods
  ipcMain.handle("paymentMethods:getAll", async () => {
    try {
      const transactionManager = authManager.getTransactionManager();
      const methods = transactionManager.getPaymentMethods();
      return { success: true, data: methods };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get payment methods",
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
}

app.whenReady().then(async () => {
  await initializeAuth();
  setupAuthHandlers();
  createWindow();
});
