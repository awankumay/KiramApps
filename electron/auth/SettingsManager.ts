import type { Database } from "better-sqlite3";

/**
 * Setting type for type-safe value casting
 */
export type SettingType = "string" | "number" | "boolean" | "json";

/**
 * Setting category for grouping
 */
export type SettingCategory = "general" | "sync" | "display" | "security";

/**
 * App setting record from database
 */
export interface AppSetting {
  id: number;
  key: string;
  value: string | null;
  type: SettingType;
  category: SettingCategory;
  description: string | null;
  is_encrypted: number;
  created_at: string;
  updated_at: string;
}

/**
 * Setting value with typed result
 */
export interface SettingValue<T = unknown> {
  key: string;
  value: T;
  type: SettingType;
  category: SettingCategory;
}

/**
 * Default ERP API URL (fallback)
 */
export const DEFAULT_ERP_API_URL = "http://localhost:8000/api";

/**
 * SettingsManager handles application settings stored in SQLite
 * Provides CRUD operations with type-safe value retrieval and caching
 */
export class SettingsManager {
  private db: Database;
  private cache: Map<string, AppSetting> = new Map();
  private cacheValid = false;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Load all settings into cache
   */
  private loadCache(): void {
    if (this.cacheValid) return;

    try {
      const stmt = this.db.prepare("SELECT * FROM app_settings");
      const rows = stmt.all() as AppSetting[];

      this.cache.clear();
      for (const row of rows) {
        this.cache.set(row.key, row);
      }
      this.cacheValid = true;
    } catch (error) {
      console.error("[SettingsManager] Failed to load cache:", error);
      this.cacheValid = false;
    }
  }

  /**
   * Invalidate cache (call after updates)
   */
  invalidateCache(): void {
    this.cacheValid = false;
    this.cache.clear();
  }

  /**
   * Get raw setting record by key
   */
  getRaw(key: string): AppSetting | null {
    this.loadCache();
    return this.cache.get(key) || null;
  }

  /**
   * Get setting value as string
   */
  getString(key: string, defaultValue = ""): string {
    const setting = this.getRaw(key);
    if (!setting || setting.value === null) return defaultValue;
    return setting.value;
  }

  /**
   * Get setting value as number
   */
  getNumber(key: string, defaultValue = 0): number {
    const setting = this.getRaw(key);
    if (!setting || setting.value === null) return defaultValue;
    const num = parseFloat(setting.value);
    return isNaN(num) ? defaultValue : num;
  }

  /**
   * Get setting value as boolean
   */
  getBoolean(key: string, defaultValue = false): boolean {
    const setting = this.getRaw(key);
    if (!setting || setting.value === null) return defaultValue;
    return setting.value === "1" || setting.value.toLowerCase() === "true";
  }

  /**
   * Get setting value as JSON object
   */
  getJSON<T = unknown>(key: string, defaultValue: T | null = null): T | null {
    const setting = this.getRaw(key);
    if (!setting || setting.value === null) return defaultValue;
    try {
      return JSON.parse(setting.value) as T;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Get typed setting value based on stored type
   */
  get<T = unknown>(key: string, defaultValue?: T): T {
    const setting = this.getRaw(key);
    if (!setting || setting.value === null) {
      return defaultValue as T;
    }

    switch (setting.type) {
      case "number":
        return this.getNumber(key, defaultValue as number) as T;
      case "boolean":
        return this.getBoolean(key, defaultValue as boolean) as T;
      case "json":
        return this.getJSON<T>(key, defaultValue) as T;
      default:
        return this.getString(key, defaultValue as string) as T;
    }
  }

  /**
   * Set setting value
   */
  set(
    key: string,
    value: string | number | boolean | object,
    options?: {
      type?: SettingType;
      category?: SettingCategory;
      description?: string;
    }
  ): boolean {
    try {
      // Convert value to string
      let stringValue: string;
      let type: SettingType = options?.type || "string";

      if (typeof value === "boolean") {
        stringValue = value ? "1" : "0";
        type = options?.type || "boolean";
      } else if (typeof value === "number") {
        stringValue = value.toString();
        type = options?.type || "number";
      } else if (typeof value === "object") {
        stringValue = JSON.stringify(value);
        type = options?.type || "json";
      } else {
        stringValue = value;
      }

      // Check if setting exists
      const existing = this.getRaw(key);

      if (existing) {
        // Update existing setting
        const stmt = this.db.prepare(`
          UPDATE app_settings 
          SET value = ?, type = ?, updated_at = datetime('now')
          WHERE key = ?
        `);
        stmt.run(stringValue, type, key);
      } else {
        // Insert new setting
        const stmt = this.db.prepare(`
          INSERT INTO app_settings (key, value, type, category, description)
          VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run(
          key,
          stringValue,
          type,
          options?.category || "general",
          options?.description || null
        );
      }

      this.invalidateCache();
      return true;
    } catch (error) {
      console.error(`[SettingsManager] Failed to set ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete a setting
   */
  delete(key: string): boolean {
    try {
      const stmt = this.db.prepare("DELETE FROM app_settings WHERE key = ?");
      stmt.run(key);
      this.invalidateCache();
      return true;
    } catch (error) {
      console.error(`[SettingsManager] Failed to delete ${key}:`, error);
      return false;
    }
  }

  /**
   * Get all settings
   */
  getAll(): AppSetting[] {
    this.loadCache();
    return Array.from(this.cache.values());
  }

  /**
   * Get settings by category
   */
  getByCategory(category: SettingCategory): AppSetting[] {
    return this.getAll().filter((s) => s.category === category);
  }

  /**
   * Get ERP API URL with fallback
   */
  getErpApiUrl(): string {
    return this.getString("erp_api_url", DEFAULT_ERP_API_URL);
  }

  /**
   * Get sync settings as object
   */
  getSyncSettings(): {
    enabled: boolean;
    intervalMinutes: number;
    onStartup: boolean;
    batchSize: number;
    retryMax: number;
    timeoutSeconds: number;
  } {
    return {
      enabled: this.getBoolean("sync_enabled", true),
      intervalMinutes: this.getNumber("sync_interval_minutes", 10),
      onStartup: this.getBoolean("sync_on_startup", true),
      batchSize: this.getNumber("sync_batch_size", 50),
      retryMax: this.getNumber("sync_retry_max", 5),
      timeoutSeconds: this.getNumber("sync_timeout_seconds", 30),
    };
  }

  /**
   * Update multiple settings at once
   */
  setMultiple(
    settings: Array<{
      key: string;
      value: string | number | boolean | object;
      type?: SettingType;
      category?: SettingCategory;
      description?: string;
    }>
  ): boolean {
    try {
      const transaction = this.db.transaction(() => {
        for (const setting of settings) {
          this.set(setting.key, setting.value, {
            type: setting.type,
            category: setting.category,
            description: setting.description,
          });
        }
      });

      transaction();
      this.invalidateCache();
      return true;
    } catch (error) {
      console.error(
        "[SettingsManager] Failed to set multiple settings:",
        error
      );
      return false;
    }
  }

  /**
   * Validate URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
