import type { Database } from "better-sqlite3";
import {
  SyncService,
  SyncEntityType,
  SyncAction,
  SyncStatus,
  SyncDirection,
} from "./SyncService";
import { SettingsManager } from "./SettingsManager";
import { NetworkStatus } from "./NetworkStatus";

/**
 * Sync log record from local database
 */
export interface SyncLogRecord {
  id: number;
  sync_id: string;
  entity_type: string;
  entity_id: number | null;
  action: string;
  direction: string;
  status: string;
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
 * Sync queue item
 */
interface SyncQueueItem {
  entityType: SyncEntityType;
  entityId?: number;
  action: SyncAction;
  data: unknown;
  retryCount?: number;
}

/**
 * SyncManager orchestrates synchronization between Electron and ERP Cloud
 * Handles queue management, retry logic, scheduling, and entity-specific sync
 */
export class SyncManager {
  private db: Database;
  private settingsManager: SettingsManager;
  private syncService: SyncService | null = null;
  private networkStatus: NetworkStatus;
  private syncQueue: SyncQueueItem[] = [];
  private isProcessing = false;
  private schedulerInterval: NodeJS.Timeout | null = null;

  constructor(db: Database, networkStatus: NetworkStatus) {
    this.db = db;
    this.settingsManager = new SettingsManager(db);
    this.networkStatus = networkStatus;
  }

  /**
   * Initialize sync service with access token
   */
  initialize(accessToken: string): void {
    const baseUrl = this.settingsManager.getErpApiUrl();
    const settings = this.settingsManager.getSyncSettings();
    this.syncService = new SyncService(
      baseUrl,
      accessToken,
      settings.timeoutSeconds * 1000
    );
  }

  /**
   * Update access token (e.g., after refresh)
   */
  updateAccessToken(accessToken: string): void {
    if (this.syncService) {
      this.syncService.setAccessToken(accessToken);
    }
  }

  /**
   * Start scheduled sync
   */
  startScheduler(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
    }

    const settings = this.settingsManager.getSyncSettings();
    if (!settings.enabled) {
      console.log("[SyncManager] Auto sync is disabled");
      return;
    }

    const intervalMs = settings.intervalMinutes * 60 * 1000;
    this.schedulerInterval = setInterval(() => {
      this.syncAll();
    }, intervalMs);

    console.log(
      `[SyncManager] Scheduler started with ${settings.intervalMinutes} minute interval`
    );

    // Sync on startup if enabled
    if (settings.onStartup) {
      setTimeout(() => this.syncAll(), 5000); // Delay 5s after startup
    }
  }

  /**
   * Stop scheduled sync
   */
  stopScheduler(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
      console.log("[SyncManager] Scheduler stopped");
    }
  }

  /**
   * Add item to sync queue
   */
  async queueSync(
    entityType: SyncEntityType,
    action: SyncAction,
    data: unknown,
    entityId?: number
  ): Promise<string> {
    const syncId = SyncService.generateSyncId();

    console.log(
      `[SyncManager] Queueing ${action} for ${entityType}${
        entityId ? ` (ID: ${entityId})` : ""
      } | SyncID: ${syncId}`
    );

    // Log to database
    await this.createSyncLog({
      syncId,
      entityType,
      entityId,
      action,
      direction: "push",
      status: "pending",
      payload: data,
    });

    // Add to in-memory queue
    this.syncQueue.push({
      entityType,
      entityId,
      action,
      data,
      retryCount: 0,
    });

    console.log(
      `[SyncManager] Added to queue. Queue size: ${this.syncQueue.length} items`
    );

    // Try to process immediately if online
    if (this.networkStatus.getStatus() && !this.isProcessing) {
      console.log(`[SyncManager] Network online, processing queue immediately`);
      this.processQueue();
    } else {
      console.log(
        `[SyncManager] Network offline or queue processing in progress. Queue size: ${this.syncQueue.length}`
      );
    }

    return syncId;
  }

  /**
   * Process sync queue
   */
  async processQueue(): Promise<void> {
    if (
      this.isProcessing ||
      !this.syncService ||
      !this.networkStatus.isOnline()
    ) {
      return;
    }

    this.isProcessing = true;
    const settings = this.settingsManager.getSyncSettings();
    const maxRetries = settings.retryMax;
    const batchSize = settings.batchSize;

    try {
      // Get pending items from queue
      const batch = this.syncQueue.splice(0, batchSize);

      if (batch.length === 0) {
        // Check for pending items in database
        const pendingLogs = await this.getPendingSyncLogs();
        for (const log of pendingLogs.slice(0, batchSize)) {
          try {
            const payload = log.payload ? JSON.parse(log.payload) : {};
            batch.push({
              entityType: log.entity_type as SyncEntityType,
              entityId: log.entity_id || undefined,
              action: log.action as SyncAction,
              data: payload,
              retryCount: log.retry_count,
            });
          } catch {
            console.error(
              `[SyncManager] Failed to parse payload for ${log.sync_id}`
            );
          }
        }
      }

      if (batch.length === 0) {
        this.isProcessing = false;
        return;
      }

      // Process in batch if multiple items, otherwise single push
      if (batch.length > 1) {
        const response = await this.syncService.pushBatch(
          batch.map((item) => ({
            entityType: item.entityType,
            action: item.action,
            data: item.data,
          }))
        );

        // Update logs based on results
        for (let i = 0; i < response.results.length; i++) {
          const result = response.results[i];
          const item = batch[i];
          if (result.success) {
            await this.updateSyncLogStatus(result.syncId, "completed");
          } else {
            if ((item.retryCount || 0) < maxRetries) {
              // Re-queue for retry
              this.syncQueue.push({
                ...item,
                retryCount: (item.retryCount || 0) + 1,
              });
              await this.updateSyncLogRetry(result.syncId, result.message);
            } else {
              await this.updateSyncLogStatus(
                result.syncId,
                "failed",
                result.message
              );
            }
          }
        }
      } else {
        const item = batch[0];
        const response = await this.syncService.push(
          item.entityType,
          item.action,
          item.data
        );

        if (response.success) {
          await this.updateSyncLogStatus(response.syncId, "completed");
        } else {
          if ((item.retryCount || 0) < maxRetries) {
            this.syncQueue.push({
              ...item,
              retryCount: (item.retryCount || 0) + 1,
            });
            await this.updateSyncLogRetry(response.syncId, response.message);
          } else {
            await this.updateSyncLogStatus(
              response.syncId,
              "failed",
              response.message
            );
          }
        }
      }

      // Continue processing if more items
      if (this.syncQueue.length > 0) {
        setTimeout(() => this.processQueue(), 1000);
      }
    } catch (error) {
      console.error("[SyncManager] Queue processing error:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Sync all entities
   */
  async syncAll(): Promise<{ success: boolean; message: string }> {
    if (!this.syncService || !this.networkStatus.isOnline()) {
      return {
        success: false,
        message: "Not connected or sync service not initialized",
      };
    }

    console.log("[SyncManager] Starting full sync...");

    try {
      // Sync bidirectional entities first (pull then push)
      await this.syncCustomers();
      await this.syncPaymentVerifications();

      // Process push queue for unidirectional entities
      await this.processQueue();

      console.log("[SyncManager] Full sync completed");
      return { success: true, message: "Sync completed successfully" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      console.error("[SyncManager] Full sync failed:", message);
      return { success: false, message };
    }
  }

  /**
   * Sync customers (bidirectional)
   */
  async syncCustomers(
    direction?: "push" | "pull"
  ): Promise<{ success: boolean; message: string }> {
    if (!this.syncService) {
      return { success: false, message: "Sync service not initialized" };
    }

    console.log("[SyncManager] Syncing customers...");

    try {
      // Pull changes from ERP (unless only push requested)
      if (direction !== "push") {
        const lastSync = await this.getLastSyncTime("customer", "pull");
        const pullResult = await this.syncService.pull("customer", {
          since: lastSync || undefined,
        });

        if (pullResult.success && pullResult.data.length > 0) {
          // Apply pulled changes to local database
          for (const customer of pullResult.data) {
            await this.applyCustomerChange(
              customer as {
                id: number;
                code?: string;
                name?: string;
                category?: string;
                is_active?: boolean;
              }
            );
          }
          console.log(
            `[SyncManager] Pulled ${pullResult.data.length} customer changes`
          );
        }
      }

      // Push pending local changes (unless only pull requested)
      if (direction !== "pull") {
        await this.processQueue();
      }

      return { success: true, message: "Customers synced successfully" };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Customer sync failed";
      console.error("[SyncManager] Customer sync failed:", message);
      return { success: false, message };
    }
  }

  /**
   * Apply customer change from pull
   * Handles partial data from ERP by merging with existing local data
   */
  private async applyCustomerChange(data: {
    id: number;
    code?: string;
    name?: string;
    category?: string;
    is_active?: boolean;
  }): Promise<void> {
    try {
      // First, check if customer exists locally to get existing values
      const existing = this.db
        .prepare("SELECT * FROM customers WHERE id = ?")
        .get(data.id) as
        | {
            id: number;
            code: string;
            name: string;
            category: string;
            is_active: number;
          }
        | undefined;

      // Merge with existing data or use defaults
      // Note: category must be 'PERSONAL' or 'COMPANY' per CHECK constraint
      const mergedData = {
        id: data.id,
        code: data.code ?? existing?.code ?? `CUST-${data.id}`,
        name: data.name ?? existing?.name ?? "Unknown Customer",
        category: data.category ?? existing?.category ?? "PERSONAL",
        is_active:
          data.is_active !== undefined
            ? data.is_active
            : existing
            ? Boolean(existing.is_active)
            : true,
      };

      // Use UPDATE for existing records to avoid foreign key constraint issues
      // Use INSERT for new records
      if (existing) {
        const updateStmt = this.db.prepare(`
          UPDATE customers 
          SET code = ?, name = ?, category = ?, is_active = ?, synced_at = datetime('now'), updated_at = datetime('now')
          WHERE id = ?
        `);
        updateStmt.run(
          mergedData.code,
          mergedData.name,
          mergedData.category,
          mergedData.is_active ? 1 : 0,
          mergedData.id
        );
      } else {
        const insertStmt = this.db.prepare(`
          INSERT INTO customers (id, code, name, category, is_active, synced_at, updated_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `);
        insertStmt.run(
          mergedData.id,
          mergedData.code,
          mergedData.name,
          mergedData.category,
          mergedData.is_active ? 1 : 0
        );
      }

      await this.createSyncLog({
        syncId: SyncService.generateSyncId(),
        entityType: "customer",
        entityId: data.id,
        action: existing ? "update" : "create",
        direction: "pull",
        status: "completed",
        payload: mergedData,
      });
    } catch (error) {
      console.error("[SyncManager] Failed to apply customer change:", error);
    }
  }

  /**
   * Sync payment verifications (bidirectional)
   */
  async syncPaymentVerifications(
    direction?: "push" | "pull"
  ): Promise<{ success: boolean; message: string }> {
    if (!this.syncService) {
      return { success: false, message: "Sync service not initialized" };
    }

    console.log("[SyncManager] Syncing payment verifications...");

    try {
      // Pull verification status changes from ERP (unless only push requested)
      if (direction !== "push") {
        const lastSync = await this.getLastSyncTime(
          "payment_verification",
          "pull"
        );
        const pullResult = await this.syncService.pull("payment_verification", {
          since: lastSync || undefined,
        });

        if (pullResult.success && pullResult.data.length > 0) {
          for (const verification of pullResult.data) {
            await this.applyPaymentVerificationChange(
              verification as {
                id: number;
                verification_status: string;
                verified_by: number | null;
                rejection_reason: string | null;
              }
            );
          }
          console.log(
            `[SyncManager] Pulled ${pullResult.data.length} verification changes`
          );
        }
      }

      // Push pending local changes (unless only pull requested)
      if (direction !== "pull") {
        await this.processQueue();
      }

      return {
        success: true,
        message: "Payment verifications synced successfully",
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Payment verification sync failed";
      console.error("[SyncManager] Payment verification sync failed:", message);
      return { success: false, message };
    }
  }

  /**
   * Apply payment verification change from pull
   */
  private async applyPaymentVerificationChange(data: {
    id: number;
    verification_status: string;
    verified_by: number | null;
    rejection_reason: string | null;
  }): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        UPDATE payments 
        SET verification_status = ?, verified_by = ?, rejection_reason = ?, synced_at = datetime('now')
        WHERE id = ?
      `);
      stmt.run(
        data.verification_status,
        data.verified_by,
        data.rejection_reason,
        data.id
      );

      await this.createSyncLog({
        syncId: SyncService.generateSyncId(),
        entityType: "payment_verification",
        entityId: data.id,
        action: "update",
        direction: "pull",
        status: "completed",
        payload: data,
      });
    } catch (error) {
      console.error(
        "[SyncManager] Failed to apply verification change:",
        error
      );
    }
  }

  /**
   * Sync items (bidirectional - pull from ERP master data)
   * Note: 'item' entity type is for reference data (master items from ERP)
   * Not to be confused with 'transaction_item' which is transaction line items
   */
  async syncItems(
    direction?: "push" | "pull"
  ): Promise<{ success: boolean; message: string }> {
    if (!this.syncService) {
      return { success: false, message: "Sync service not initialized" };
    }

    console.log("[SyncManager] Syncing items...");

    try {
      // Items are primarily pulled from ERP (master data)
      if (direction !== "push") {
        const lastSync = await this.getLastSyncTime("item", "pull");
        const pullResult = await this.syncService.pull("item", {
          since: lastSync || undefined,
        });

        if (pullResult.success && pullResult.data.length > 0) {
          for (const item of pullResult.data) {
            await this.applyItemChange(
              item as {
                id: number;
                code?: string;
                name?: string;
                unit?: string;
                price?: number;
                is_active?: boolean;
              }
            );
          }
          console.log(
            `[SyncManager] Pulled ${pullResult.data.length} item changes`
          );
        }
      }

      // Push is usually not needed for items (master data from ERP)
      // but process queue in case there are pending item syncs
      if (direction !== "pull") {
        await this.processQueue();
      }

      return { success: true, message: "Items synced successfully" };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Item sync failed";
      console.error("[SyncManager] Item sync failed:", message);
      return { success: false, message };
    }
  }

  /**
   * Apply item change from pull (master data from ERP)
   */
  private async applyItemChange(data: {
    id: number;
    code?: string;
    name?: string;
    unit?: string;
    price?: number;
    is_active?: boolean;
  }): Promise<void> {
    try {
      const existing = this.db
        .prepare("SELECT * FROM items WHERE id = ?")
        .get(data.id) as
        | {
            id: number;
            code: string;
            name: string;
            unit: string;
            price: number;
            is_active: number;
          }
        | undefined;

      const mergedData = {
        id: data.id,
        code: data.code ?? existing?.code ?? `ITEM-${data.id}`,
        name: data.name ?? existing?.name ?? "Unknown Item",
        unit: data.unit ?? existing?.unit ?? "unit",
        price: data.price ?? existing?.price ?? 0,
        is_active:
          data.is_active !== undefined
            ? data.is_active
            : existing
            ? Boolean(existing.is_active)
            : true,
      };

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO items (id, code, name, unit, price, is_active, synced_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);
      stmt.run(
        mergedData.id,
        mergedData.code,
        mergedData.name,
        mergedData.unit,
        mergedData.price,
        mergedData.is_active ? 1 : 0
      );

      await this.createSyncLog({
        syncId: SyncService.generateSyncId(),
        entityType: "item",
        entityId: data.id,
        action: existing ? "update" : "create",
        direction: "pull",
        status: "completed",
        payload: mergedData,
      });
    } catch (error) {
      console.error("[SyncManager] Failed to apply item change:", error);
    }
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<SyncStats> {
    try {
      const total = this.db
        .prepare("SELECT COUNT(*) as count FROM sync_logs")
        .get() as { count: number };
      const pending = this.db
        .prepare(
          "SELECT COUNT(*) as count FROM sync_logs WHERE status = 'pending'"
        )
        .get() as { count: number };
      const processing = this.db
        .prepare(
          "SELECT COUNT(*) as count FROM sync_logs WHERE status = 'processing'"
        )
        .get() as { count: number };
      const completed = this.db
        .prepare(
          "SELECT COUNT(*) as count FROM sync_logs WHERE status = 'completed'"
        )
        .get() as { count: number };
      const failed = this.db
        .prepare(
          "SELECT COUNT(*) as count FROM sync_logs WHERE status = 'failed'"
        )
        .get() as { count: number };
      const lastSync = this.db
        .prepare(
          "SELECT MAX(completed_at) as last_sync FROM sync_logs WHERE status = 'completed'"
        )
        .get() as { last_sync: string | null };

      const byEntity = this.db
        .prepare(
          "SELECT entity_type, COUNT(*) as count FROM sync_logs GROUP BY entity_type"
        )
        .all() as Array<{ entity_type: string; count: number }>;

      const byDirection = this.db
        .prepare(
          "SELECT direction, COUNT(*) as count FROM sync_logs GROUP BY direction"
        )
        .all() as Array<{ direction: string; count: number }>;

      return {
        total: total.count,
        totalSynced: completed.count,
        pending: pending.count,
        pendingCount: pending.count,
        processing: processing.count,
        completed: completed.count,
        successCount: completed.count,
        failed: failed.count,
        failedCount: failed.count,
        lastSyncAt: lastSync.last_sync,
        byEntity: Object.fromEntries(
          byEntity.map((e) => [e.entity_type, e.count])
        ),
        byDirection: Object.fromEntries(
          byDirection.map((d) => [d.direction, d.count])
        ),
      };
    } catch (error) {
      console.error("[SyncManager] Failed to get stats:", error);
      return {
        total: 0,
        totalSynced: 0,
        pending: 0,
        pendingCount: 0,
        processing: 0,
        completed: 0,
        successCount: 0,
        failed: 0,
        failedCount: 0,
        lastSyncAt: null,
        byEntity: {},
        byDirection: {},
      };
    }
  }

  /**
   * Get sync logs with filters
   */
  async getSyncLogs(filters?: {
    entityType?: string;
    entity_type?: string;
    status?: string;
    direction?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: SyncLogRecord[]; total: number }> {
    try {
      // Support both entityType and entity_type
      const entityTypeFilter = filters?.entityType || filters?.entity_type;

      let countSql = "SELECT COUNT(*) as count FROM sync_logs WHERE 1=1";
      let sql = "SELECT * FROM sync_logs WHERE 1=1";
      const countParams: unknown[] = [];
      const params: unknown[] = [];

      if (entityTypeFilter) {
        countSql += " AND entity_type = ?";
        sql += " AND entity_type = ?";
        countParams.push(entityTypeFilter);
        params.push(entityTypeFilter);
      }
      if (filters?.status) {
        countSql += " AND status = ?";
        sql += " AND status = ?";
        countParams.push(filters.status);
        params.push(filters.status);
      }
      if (filters?.direction) {
        countSql += " AND direction = ?";
        sql += " AND direction = ?";
        countParams.push(filters.direction);
        params.push(filters.direction);
      }

      // Get total count
      const countResult = this.db.prepare(countSql).get(...countParams) as {
        count: number;
      };

      sql += " ORDER BY created_at DESC";

      if (filters?.limit) {
        sql += " LIMIT ?";
        params.push(filters.limit);
      }
      if (filters?.offset) {
        sql += " OFFSET ?";
        params.push(filters.offset);
      }

      const logs = this.db.prepare(sql).all(...params) as SyncLogRecord[];
      return { logs, total: countResult.count };
    } catch (error) {
      console.error("[SyncManager] Failed to get logs:", error);
      return { logs: [], total: 0 };
    }
  }

  /**
   * Retry failed sync
   */
  async retrySyncLog(syncId: string): Promise<boolean> {
    try {
      const log = this.db
        .prepare("SELECT * FROM sync_logs WHERE sync_id = ?")
        .get(syncId) as SyncLogRecord | undefined;

      if (!log || log.status !== "failed") {
        return false;
      }

      // Reset status and add to queue
      this.db
        .prepare(
          "UPDATE sync_logs SET status = 'pending', retry_count = 0 WHERE sync_id = ?"
        )
        .run(syncId);

      if (log.payload) {
        const payload = JSON.parse(log.payload);
        this.syncQueue.push({
          entityType: log.entity_type as SyncEntityType,
          entityId: log.entity_id || undefined,
          action: log.action as SyncAction,
          data: payload,
          retryCount: 0,
        });
      }

      // Trigger queue processing
      if (!this.isProcessing) {
        this.processQueue();
      }

      return true;
    } catch (error) {
      console.error("[SyncManager] Failed to retry sync:", error);
      return false;
    }
  }

  /**
   * Retry all failed syncs
   */
  async retryAllFailed(): Promise<{ success: boolean; message: string }> {
    try {
      const failedLogs = this.db
        .prepare("SELECT * FROM sync_logs WHERE status = 'failed' LIMIT 100")
        .all() as SyncLogRecord[];

      if (failedLogs.length === 0) {
        return { success: true, message: "No failed syncs to retry" };
      }

      let retryCount = 0;
      for (const log of failedLogs) {
        const success = await this.retrySyncLog(log.sync_id);
        if (success) retryCount++;
      }

      // Process the queue
      if (!this.isProcessing) {
        await this.processQueue();
      }

      return {
        success: true,
        message: `Retried ${retryCount} of ${failedLogs.length} failed syncs`,
      };
    } catch (error) {
      console.error("[SyncManager] Failed to retry all failed syncs:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Retry failed",
      };
    }
  }

  /**
   * Create sync log entry
   */
  private async createSyncLog(log: {
    syncId: string;
    entityType: SyncEntityType;
    entityId?: number;
    action: SyncAction;
    direction: SyncDirection;
    status: SyncStatus;
    payload?: unknown;
    errorMessage?: string;
  }): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO sync_logs (sync_id, entity_type, entity_id, action, direction, status, payload, error_message, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      stmt.run(
        log.syncId,
        log.entityType,
        log.entityId || null,
        log.action,
        log.direction,
        log.status,
        log.payload ? JSON.stringify(log.payload) : null,
        log.errorMessage || null
      );
    } catch (error) {
      console.error("[SyncManager] Failed to create sync log:", error);
    }
  }

  /**
   * Update sync log status
   */
  private async updateSyncLogStatus(
    syncId: string,
    status: SyncStatus,
    errorMessage?: string
  ): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        UPDATE sync_logs 
        SET status = ?, error_message = ?, completed_at = CASE WHEN ? = 'completed' THEN datetime('now') ELSE NULL END
        WHERE sync_id = ?
      `);
      stmt.run(status, errorMessage || null, status, syncId);
    } catch (error) {
      console.error("[SyncManager] Failed to update sync log:", error);
    }
  }

  /**
   * Update sync log for retry
   */
  private async updateSyncLogRetry(
    syncId: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        UPDATE sync_logs 
        SET retry_count = retry_count + 1, error_message = ?, status = 'pending'
        WHERE sync_id = ?
      `);
      stmt.run(errorMessage || null, syncId);
    } catch (error) {
      console.error("[SyncManager] Failed to update retry count:", error);
    }
  }

  /**
   * Get pending sync logs from database
   */
  private async getPendingSyncLogs(): Promise<SyncLogRecord[]> {
    try {
      return this.db
        .prepare(
          "SELECT * FROM sync_logs WHERE status = 'pending' AND direction = 'push' ORDER BY created_at ASC LIMIT 100"
        )
        .all() as SyncLogRecord[];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get last sync time for entity and direction
   */
  private async getLastSyncTime(
    entityType: string,
    direction: string
  ): Promise<string | null> {
    try {
      const result = this.db
        .prepare(
          "SELECT MAX(completed_at) as last_sync FROM sync_logs WHERE entity_type = ? AND direction = ? AND status = 'completed'"
        )
        .get(entityType, direction) as { last_sync: string | null };
      return result.last_sync;
    } catch {
      return null;
    }
  }

  /**
   * Push initial data (data with synced_at NULL) to ERP Cloud
   * Used for initial sync when ERP Cloud is empty
   */
  async pushInitialData(
    entityType: SyncEntityType
  ): Promise<{ success: boolean; message: string; count: number }> {
    if (!this.syncService || !this.networkStatus.isOnline()) {
      return {
        success: false,
        message: "Not connected or sync service not initialized",
        count: 0,
      };
    }

    console.log(`[SyncManager] Pushing initial ${entityType} data...`);

    try {
      let count = 0;

      switch (entityType) {
        case "customer":
          count = await this.pushInitialCustomers();
          break;
        // Note: 'item' and 'transaction_vehicle' master data are not synced
        // Only transaction_item and transaction_vehicle within transactions are synced
        case "item":
        case "transaction_vehicle":
          return {
            success: false,
            message: `Initial sync not supported for ${entityType} (master data not synced)`,
            count: 0,
          };
        default:
          return {
            success: false,
            message: `Initial sync not supported for ${entityType}`,
            count: 0,
          };
      }

      console.log(
        `[SyncManager] Initial sync completed for ${entityType}: ${count} records`
      );
      return {
        success: true,
        message: `Initial sync completed for ${entityType}: ${count} records`,
        count,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `Initial sync failed for ${entityType}`;
      console.error(
        `[SyncManager] Initial sync failed for ${entityType}:`,
        message
      );
      return { success: false, message, count: 0 };
    }
  }

  /**
   * Push initial customers (synced_at IS NULL) to ERP Cloud
   */
  private async pushInitialCustomers(): Promise<number> {
    try {
      // Get all customers with synced_at IS NULL
      const customers = this.db
        .prepare(
          "SELECT id, code, name, category, is_active FROM customers WHERE synced_at IS NULL"
        )
        .all() as Array<{
        id: number;
        code: string;
        name: string;
        category: string;
        is_active: number;
      }>;

      if (customers.length === 0) {
        console.log("[SyncManager] No customers to sync (all synced)");
        return 0;
      }

      console.log(`[SyncManager] Found ${customers.length} customers to sync`);

      let successCount = 0;
      const batchSize = 50; // Process in batches to avoid overwhelming the API

      for (let i = 0; i < customers.length; i += batchSize) {
        const batch = customers.slice(i, i + batchSize);
        const items = batch.map((customer) => ({
          entityType: "customer" as SyncEntityType,
          action: "create" as SyncAction,
          data: {
            // Don't send 'id' for create - ERP will generate its own ID
            code: customer.code,
            name: customer.name,
            category: customer.category,
            is_active: Boolean(customer.is_active),
          },
        }));

        const response = await this.syncService!.pushBatch(items);

        // Update synced_at for successful records
        for (let j = 0; j < response.results.length; j++) {
          const result = response.results[j];
          const customer = batch[j];

          if (result.success) {
            // Update synced_at to mark as synced
            this.db
              .prepare(
                "UPDATE customers SET synced_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
              )
              .run(customer.id);

            // Create sync log with generated syncId if result.syncId is undefined
            const syncId = result.syncId || SyncService.generateSyncId();
            await this.createSyncLog({
              syncId,
              entityType: "customer",
              entityId: customer.id,
              action: "create",
              direction: "push",
              status: "completed",
              payload: customer,
            });

            successCount++;
          } else {
            // Create failed sync log with generated syncId if result.syncId is undefined
            const syncId = result.syncId || SyncService.generateSyncId();
            await this.createSyncLog({
              syncId,
              entityType: "customer",
              entityId: customer.id,
              action: "create",
              direction: "push",
              status: "failed",
              payload: customer,
              errorMessage: result.message,
            });
          }
        }
      }

      console.log(
        `[SyncManager] Initial customers sync: ${successCount}/${customers.length} successful`
      );
      return successCount;
    } catch (error) {
      console.error("[SyncManager] Failed to push initial customers:", error);
      return 0;
    }
  }
}
