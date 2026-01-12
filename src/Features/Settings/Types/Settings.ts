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
 * ERP Settings form values
 */
export interface ERPSettingsFormValues {
  erp_api_url: string;
}

/**
 * Sync settings form values
 */
export interface SyncSettingsFormValues {
  sync_enabled: boolean;
  sync_interval_minutes: number;
  sync_on_startup: boolean;
  sync_batch_size: number;
  sync_retry_max: number;
  sync_timeout_seconds: number;
}

/**
 * Combined settings form values
 */
export interface SettingsFormValues
  extends ERPSettingsFormValues,
    SyncSettingsFormValues {}

/**
 * Connection test result
 */
export interface ConnectionTestResult {
  success: boolean;
  latencyMs: number;
  message: string;
  serverVersion?: string;
}

/**
 * Settings API response
 */
export interface SettingsResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
