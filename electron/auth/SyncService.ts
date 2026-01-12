import { NetworkError } from "./ERPClient";

/**
 * Entity types that can be synced
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
 * Sync status
 */
export type SyncStatus = "pending" | "processing" | "completed" | "failed";

/**
 * Sync payload for push operations
 */
export interface SyncPayload<T = unknown> {
  syncId: string;
  entityType: SyncEntityType;
  action: SyncAction;
  data: T;
  timestamp: string;
}

/**
 * Push response from ERP
 */
export interface SyncPushResponse {
  success: boolean;
  syncId: string;
  entityId?: number;
  action: SyncAction;
  message?: string;
}

/**
 * Batch push response
 */
export interface SyncBatchResponse {
  success: boolean;
  total: number;
  processed: number;
  failed: number;
  results: SyncPushResponse[];
}

/**
 * Pull response from ERP
 */
export interface SyncPullResponse<T = unknown> {
  success: boolean;
  entityType: SyncEntityType;
  data: T[];
  pagination?: {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
  };
}

/**
 * Sync status response
 */
export interface SyncStatusResponse {
  success: boolean;
  syncId: string;
  status: SyncStatus;
  syncedAt?: string;
  error?: string;
}

/**
 * SyncService handles HTTP communication with ERP Cloud Sync API
 * Provides methods for push, pull, batch operations, and status checking
 */
export class SyncService {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private accessToken: string;

  constructor(baseUrl: string, accessToken: string, timeout = 30000) {
    this.baseUrl = baseUrl;
    this.accessToken = accessToken;
    this.timeout = timeout;
  }

  /**
   * Update access token (e.g., after refresh)
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Generate unique sync ID
   */
  static generateSyncId(): string {
    return `sync-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Push single record to ERP Cloud
   */
  async push<T>(
    entityType: SyncEntityType,
    action: SyncAction,
    data: T
  ): Promise<SyncPushResponse> {
    const syncId = SyncService.generateSyncId();
    // Payload structure for reference - actual body is formatted below
    const _payload: SyncPayload<T> = {
      syncId,
      entityType,
      action,
      data,
      timestamp: new Date().toISOString(),
    };
    void _payload; // Suppress unused warning

    console.log(
      `[SyncService] Pushing ${action} for ${entityType} | SyncID: ${syncId}`
    );
    console.log(
      `[SyncService] Payload:`,
      JSON.stringify(
        {
          entity_type: entityType,
          action,
          data: {
            sync_id: syncId,
            ...data,
          },
        },
        null,
        2
      )
    );

    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/sync/push`,
        {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({
            entity_type: entityType,
            action,
            data: {
              sync_id: syncId,
              ...data,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          `[SyncService] ✗ Push failed for ${entityType} (SyncID: ${syncId}):`,
          errorData.message || `HTTP ${response.status}`
        );
        return {
          success: false,
          syncId,
          action,
          message: errorData.message || `HTTP ${response.status}`,
        };
      }

      const result = await response.json();
      console.log(
        `[SyncService] ✓ Push successful for ${entityType} (SyncID: ${syncId}) | EntityID: ${
          result.entity_id || "N/A"
        }`
      );
      return {
        success: true,
        syncId: result.sync_id || syncId,
        entityId: result.entity_id,
        action,
        message: result.message || "Sync completed",
      };
    } catch (error) {
      console.error(
        `[SyncService] ✗ Push error for ${entityType} (SyncID: ${syncId}):`,
        error instanceof Error ? error.message : error
      );
      return {
        success: false,
        syncId,
        action,
        message: error instanceof Error ? error.message : "Push failed",
      };
    }
  }

  /**
   * Push multiple records in batch
   */
  async pushBatch<T>(
    items: Array<{
      entityType: SyncEntityType;
      action: SyncAction;
      data: T;
    }>
  ): Promise<SyncBatchResponse> {
    const payloads = items.map((item) => ({
      entity_type: item.entityType,
      action: item.action,
      data: {
        sync_id: SyncService.generateSyncId(),
        ...item.data,
      },
    }));

    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/sync/push-batch`,
        {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({ items: payloads }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          total: items.length,
          processed: 0,
          failed: items.length,
          results: payloads.map((p) => ({
            success: false,
            syncId: p.data.sync_id,
            action: p.action as SyncAction,
            message: errorData.message || `HTTP ${response.status}`,
          })),
        };
      }

      const result = await response.json();
      return {
        success: result.success,
        total: result.total || items.length,
        processed: result.processed || 0,
        failed: result.failed || 0,
        results:
          result.results ||
          payloads.map((p) => ({
            success: true,
            syncId: p.data.sync_id,
            action: p.action as SyncAction,
          })),
      };
    } catch (error) {
      return {
        success: false,
        total: items.length,
        processed: 0,
        failed: items.length,
        results: payloads.map((p) => ({
          success: false,
          syncId: p.data.sync_id,
          action: p.action as SyncAction,
          message: error instanceof Error ? error.message : "Batch push failed",
        })),
      };
    }
  }

  /**
   * Pull records from ERP Cloud
   */
  async pull<T>(
    entityType: SyncEntityType,
    options?: {
      since?: string;
      page?: number;
      perPage?: number;
    }
  ): Promise<SyncPullResponse<T>> {
    try {
      const params = new URLSearchParams();
      params.append("entity_type", entityType);
      if (options?.since) params.append("since", options.since);
      if (options?.page) params.append("page", options.page.toString());
      if (options?.perPage)
        params.append("per_page", options.perPage.toString());

      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/sync/pull?${params.toString()}`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        // Consume response body to prevent memory leaks
        await response.json().catch(() => ({}));
        return {
          success: false,
          entityType,
          data: [],
        };
      }

      const result = await response.json();
      return {
        success: true,
        entityType,
        data: result.data || [],
        pagination: result.pagination
          ? {
              currentPage: result.pagination.current_page,
              lastPage: result.pagination.last_page,
              perPage: result.pagination.per_page,
              total: result.pagination.total,
            }
          : undefined,
      };
    } catch (error) {
      return {
        success: false,
        entityType,
        data: [],
      };
    }
  }

  /**
   * Get sync status by sync ID
   */
  async getStatus(syncId: string): Promise<SyncStatusResponse> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/sync/status?sync_id=${encodeURIComponent(syncId)}`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        return {
          success: false,
          syncId,
          status: "failed",
          error: `HTTP ${response.status}`,
        };
      }

      const result = await response.json();
      return {
        success: true,
        syncId,
        status: result.status || "completed",
        syncedAt: result.synced_at,
      };
    } catch (error) {
      return {
        success: false,
        syncId,
        status: "failed",
        error: error instanceof Error ? error.message : "Status check failed",
      };
    }
  }

  /**
   * Get sync statistics
   */
  async getStats(period: "day" | "week" | "month" = "day"): Promise<{
    success: boolean;
    stats?: {
      total: number;
      completed: number;
      failed: number;
      pending: number;
      successRate: number;
      byEntity: Record<string, number>;
      byDirection: Record<string, number>;
    };
    error?: string;
  }> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/sync/stats?period=${period}`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }

      const result = await response.json();
      return {
        success: true,
        stats: {
          total: result.stats?.total || 0,
          completed: result.stats?.completed || 0,
          failed: result.stats?.failed || 0,
          pending: result.stats?.pending || 0,
          successRate: result.stats?.success_rate || 0,
          byEntity: result.stats?.by_entity || {},
          byDirection: result.stats?.by_direction || {},
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Stats fetch failed",
      };
    }
  }

  /**
   * Get sync logs from ERP
   */
  async getLogs(filters?: {
    entityType?: SyncEntityType;
    status?: SyncStatus;
    direction?: SyncDirection;
    fromDate?: string;
    toDate?: string;
    page?: number;
    perPage?: number;
  }): Promise<{
    success: boolean;
    logs?: Array<{
      syncId: string;
      entityType: string;
      entityId?: number;
      action: string;
      direction: string;
      status: string;
      errorMessage?: string;
      syncedAt?: string;
      createdAt: string;
    }>;
    pagination?: {
      currentPage: number;
      lastPage: number;
      perPage: number;
      total: number;
    };
    error?: string;
  }> {
    try {
      const params = new URLSearchParams();
      if (filters?.entityType) params.append("entity_type", filters.entityType);
      if (filters?.status) params.append("status", filters.status);
      if (filters?.direction) params.append("direction", filters.direction);
      if (filters?.fromDate) params.append("from_date", filters.fromDate);
      if (filters?.toDate) params.append("to_date", filters.toDate);
      if (filters?.page) params.append("page", filters.page.toString());
      if (filters?.perPage)
        params.append("per_page", filters.perPage.toString());

      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/sync/logs?${params.toString()}`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }

      const result = await response.json();
      return {
        success: true,
        logs:
          result.data?.map(
            (log: {
              sync_id: string;
              entity_type: string;
              entity_id: number | null;
              action: string;
              direction: string;
              status: string;
              error_message: string | null;
              synced_at: string | null;
              created_at: string;
            }) => ({
              syncId: log.sync_id,
              entityType: log.entity_type,
              entityId: log.entity_id,
              action: log.action,
              direction: log.direction,
              status: log.status,
              errorMessage: log.error_message,
              syncedAt: log.synced_at,
              createdAt: log.created_at,
            })
          ) || [],
        pagination: result.pagination
          ? {
              currentPage: result.pagination.current_page,
              lastPage: result.pagination.last_page,
              perPage: result.pagination.per_page,
              total: result.pagination.total,
            }
          : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Logs fetch failed",
      };
    }
  }

  /**
   * Get request headers
   */
  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.accessToken}`,
      "User-Agent": "KiramApps/Electron",
      "X-Device-ID": this.getDeviceId(),
    };
  }

  /**
   * Get device ID for tracking
   */
  private getDeviceId(): string {
    // In real implementation, this could be machine ID or stored device token
    return `electron-${process.platform}-${Date.now()}`;
  }

  /**
   * Fetch with timeout support
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new NetworkError("Request timeout");
      }
      throw error;
    }
  }
}
