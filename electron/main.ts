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
}

app.whenReady().then(() => {
  initializeAuth();
  setupAuthHandlers();
  createWindow();
});
