/**
 * Sync entity types
 */
export type SyncEntityType =
  | "customer"
  | "item"
  | "transaction"
  | "transaction_item"
  | "transaction_vehicle"
  | "transaction_payment"
  | "payment_verification"
  | "loader";

/**
 * Sync action types
 */
export type SyncAction = "create" | "update" | "delete";

/**
 * Sync direction
 */
export type SyncDirection = "push" | "pull";

/**
 * Sync status for logs
 */
export type SyncLogStatus = "pending" | "success" | "failed" | "retrying";

/**
 * Sync status for UI state
 */
export type SyncStatus = "idle" | "syncing" | "error";

/**
 * Sync log record
 */
export interface SyncLog {
  id: number;
  sync_id: string;
  entity_type: SyncEntityType;
  entity_id: number | null;
  action: string;
  direction: SyncDirection;
  status: SyncLogStatus;
  payload: string | null;
  error_message: string | null;
  retry_count: number;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

/**
 * Sync statistics
 */
export interface SyncStats {
  total: number;
  totalSynced: number;
  pending: number;
  pendingCount: number;
  processing: number;
  completed: number;
  successCount: number;
  failed: number;
  failedCount: number;
  lastSyncAt: string | null;
  byEntity: Record<string, number>;
  byDirection: Record<string, number>;
}

/**
 * Sync logs filter - for API calls
 */
export interface SyncLogsFilter {
  entityType?: SyncEntityType;
  status?: SyncLogStatus;
  direction?: SyncDirection;
  limit?: number;
  offset?: number;
}

/**
 * Sync logs filters - for hook state
 */
export interface SyncLogsFilters {
  entity_type?: SyncEntityType | string;
  status?: SyncLogStatus | string;
  direction?: SyncDirection | string;
  limit?: number;
  offset?: number;
}

/**
 * Sync API response
 */
export interface SyncResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * Initial sync result
 */
export interface InitialSyncResult {
  success: boolean;
  message: string;
  count: number;
}

/**
 * All initial sync result
 */
export interface AllInitialSyncResult {
  success: boolean;
  message: string;
  data?: {
    results: Array<{
      entityType: string;
      success: boolean;
      message: string;
      count: number;
    }>;
    totalSuccess: number;
    totalFailed: number;
  };
}
