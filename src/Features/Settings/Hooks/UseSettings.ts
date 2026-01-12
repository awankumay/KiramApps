import { useState, useCallback, useEffect } from "react";
import type {
  AppSetting,
  ConnectionTestResult,
  SettingsFormValues,
} from "../Types/Settings";

/**
 * Hook for managing application settings
 */
export function useSettings() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionTestResult | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  /**
   * Fetch all settings
   */
  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await window.api.settings.getAll();
      if (response.success && response.data) {
        setSettings(response.data as AppSetting[]);
      } else {
        setError(response.error || "Failed to fetch settings");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get setting value by key
   */
  const getSetting = useCallback(
    (key: string): AppSetting | undefined => {
      return settings.find((s) => s.key === key);
    },
    [settings]
  );

  /**
   * Get typed setting value
   */
  const getSettingValue = useCallback(
    <T = unknown>(key: string, defaultValue?: T): T => {
      const setting = getSetting(key);
      if (!setting || setting.value === null) {
        return defaultValue as T;
      }

      switch (setting.type) {
        case "number":
          return parseFloat(setting.value) as T;
        case "boolean":
          return (setting.value === "1" || setting.value === "true") as T;
        case "json":
          try {
            return JSON.parse(setting.value) as T;
          } catch {
            return defaultValue as T;
          }
        default:
          return setting.value as T;
      }
    },
    [getSetting]
  );

  /**
   * Get current form values
   */
  const getFormValues = useCallback((): SettingsFormValues => {
    return {
      erp_api_url: getSettingValue("erp_api_url", "http://localhost:8000/api"),
      sync_enabled: getSettingValue("sync_enabled", true),
      sync_interval_minutes: getSettingValue("sync_interval_minutes", 10),
      sync_on_startup: getSettingValue("sync_on_startup", true),
      sync_batch_size: getSettingValue("sync_batch_size", 50),
      sync_retry_max: getSettingValue("sync_retry_max", 5),
      sync_timeout_seconds: getSettingValue("sync_timeout_seconds", 30),
    };
  }, [getSettingValue]);

  /**
   * Update a single setting
   */
  const updateSetting = useCallback(
    async (
      key: string,
      value: string | number | boolean | object,
      options?: { type?: string; category?: string; description?: string }
    ): Promise<boolean> => {
      try {
        const response = await window.api.settings.set(key, value, options);
        if (response.success) {
          await fetchSettings();
          return true;
        }
        setError(response.error || "Failed to update setting");
        return false;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        return false;
      }
    },
    [fetchSettings]
  );

  /**
   * Update multiple settings
   */
  const updateSettings = useCallback(
    async (values: SettingsFormValues): Promise<boolean> => {
      try {
        const settingsArray = [
          { key: "erp_api_url", value: values.erp_api_url, type: "string" },
          { key: "sync_enabled", value: values.sync_enabled, type: "boolean" },
          {
            key: "sync_interval_minutes",
            value: values.sync_interval_minutes,
            type: "number",
          },
          {
            key: "sync_on_startup",
            value: values.sync_on_startup,
            type: "boolean",
          },
          {
            key: "sync_batch_size",
            value: values.sync_batch_size,
            type: "number",
          },
          {
            key: "sync_retry_max",
            value: values.sync_retry_max,
            type: "number",
          },
          {
            key: "sync_timeout_seconds",
            value: values.sync_timeout_seconds,
            type: "number",
          },
        ];

        const response = await window.api.settings.setMultiple(settingsArray);
        if (response.success) {
          await fetchSettings();
          return true;
        }
        setError(response.error || "Failed to update settings");
        return false;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        return false;
      }
    },
    [fetchSettings]
  );

  /**
   * Test ERP connection
   */
  const testConnection = useCallback(
    async (url?: string): Promise<ConnectionTestResult> => {
      setIsTestingConnection(true);
      setConnectionStatus(null);
      try {
        const response = await window.api.settings.testConnection(url);
        if (response.success && response.data) {
          const result = response.data as ConnectionTestResult;
          setConnectionStatus(result);
          return result;
        }
        const failResult: ConnectionTestResult = {
          success: false,
          latencyMs: 0,
          message: response.error || "Connection test failed",
        };
        setConnectionStatus(failResult);
        return failResult;
      } catch (err) {
        const failResult: ConnectionTestResult = {
          success: false,
          latencyMs: 0,
          message: err instanceof Error ? err.message : "Unknown error",
        };
        setConnectionStatus(failResult);
        return failResult;
      } finally {
        setIsTestingConnection(false);
      }
    },
    []
  );

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    isLoading,
    error,
    connectionStatus,
    isTestingConnection,
    fetchSettings,
    getSetting,
    getSettingValue,
    getFormValues,
    updateSetting,
    updateSettings,
    testConnection,
    clearError,
  };
}
