import { useState, useCallback, useEffect, useRef } from "react";
import type {
  SyncStats,
  SyncLog,
  SyncLogsFilters,
  SyncStatus,
  SyncEntityType,
  SyncDirection,
  InitialSyncResult,
  AllInitialSyncResult,
} from "../Types/Sync";

/**
 * Hook for managing sync operations
 */
export function useSync() {
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [isOnline, setIsOnline] = useState(true);

  // Filters state
  const [filters, setFilters] = useState<SyncLogsFilters>({
    limit: 50,
    offset: 0,
  });

  // Polling interval ref
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch sync stats
   */
  const fetchStats = useCallback(async () => {
    try {
      const response = await window.api.sync.getStats();
      if (response.success && response.data) {
        setStats(response.data as SyncStats);
      }
    } catch (err) {
      console.error("Failed to fetch sync stats:", err);
    }
  }, []);

  /**
   * Fetch sync logs
   */
  const fetchLogs = useCallback(
    async (newFilters?: SyncLogsFilters) => {
      setIsLoading(true);
      try {
        const queryFilters = newFilters || filters;
        const response = await window.api.sync.getLogs(queryFilters);
        if (response.success && response.data) {
          const { logs: logsData, total } = response.data as {
            logs: SyncLog[];
            total: number;
          };
          setLogs(logsData);
          setTotalLogs(total);
        }
      } catch (err) {
        console.error("Failed to fetch sync logs:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch logs");
      } finally {
        setIsLoading(false);
      }
    },
    [filters]
  );

  /**
   * Update filters and fetch logs
   */
  const updateFilters = useCallback(
    async (newFilters: Partial<SyncLogsFilters>) => {
      const updatedFilters = { ...filters, ...newFilters };
      setFilters(updatedFilters);
      await fetchLogs(updatedFilters);
    },
    [filters, fetchLogs]
  );

  /**
   * Reset filters to default
   */
  const resetFilters = useCallback(async () => {
    const defaultFilters: SyncLogsFilters = { limit: 50, offset: 0 };
    setFilters(defaultFilters);
    await fetchLogs(defaultFilters);
  }, [fetchLogs]);

  /**
   * Trigger full sync
   */
  const syncAll = useCallback(async (): Promise<boolean> => {
    if (isSyncing) return false;

    setIsSyncing(true);
    setStatus("syncing");
    setError(null);

    try {
      const response = await window.api.sync.syncAll();
      if (response.success) {
        setStatus("idle");
        await fetchStats();
        await fetchLogs();
        return true;
      }
      setStatus("error");
      setError(response.error || "Sync failed");
      return false;
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Sync failed");
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, fetchStats, fetchLogs]);

  /**
   * Sync specific entity type
   */
  const syncEntity = useCallback(
    async (
      entityType: SyncEntityType,
      direction?: SyncDirection
    ): Promise<boolean> => {
      if (isSyncing) return false;

      setIsSyncing(true);
      setStatus("syncing");
      setError(null);

      try {
        const response = await window.api.sync.syncEntity(
          entityType,
          direction
        );
        if (response.success) {
          setStatus("idle");
          await fetchStats();
          await fetchLogs();
          return true;
        }
        setStatus("error");
        setError(response.error || `Sync ${entityType} failed`);
        return false;
      } catch (err) {
        setStatus("error");
        setError(
          err instanceof Error ? err.message : `Sync ${entityType} failed`
        );
        return false;
      } finally {
        setIsSyncing(false);
      }
    },
    [isSyncing, fetchStats, fetchLogs]
  );

  /**
   * Sync customers
   */
  const syncCustomers = useCallback(
    async (direction?: SyncDirection): Promise<boolean> => {
      return syncEntity("customer", direction);
    },
    [syncEntity]
  );

  /**
   * Sync items
   */
  const syncItems = useCallback(
    async (direction?: SyncDirection): Promise<boolean> => {
      return syncEntity("item", direction);
    },
    [syncEntity]
  );

  /**
   * Sync payment verifications
   */
  const syncPaymentVerifications = useCallback(
    async (direction?: SyncDirection): Promise<boolean> => {
      return syncEntity("payment_verification", direction);
    },
    [syncEntity]
  );

  /**
   * Retry failed syncs
   */
  const retryFailed = useCallback(async (): Promise<boolean> => {
    if (isSyncing) return false;

    setIsSyncing(true);
    setStatus("syncing");
    setError(null);

    try {
      const response = await window.api.sync.retryFailed();
      if (response.success) {
        setStatus("idle");
        await fetchStats();
        await fetchLogs();
        return true;
      }
      setStatus("error");
      setError(response.error || "Retry failed");
      return false;
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Retry failed");
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, fetchStats, fetchLogs]);

  /**
   * Push initial data (data with synced_at NULL) to ERP Cloud
   */
  const pushInitialData = useCallback(
    async (entityType: SyncEntityType): Promise<InitialSyncResult> => {
      if (isSyncing) {
        return { success: false, message: "Sync in progress", count: 0 };
      }

      setIsSyncing(true);
      setStatus("syncing");
      setError(null);

      try {
        const response = await window.api.sync.pushInitialData(entityType);
        if (response.success && response.data) {
          setStatus("idle");
          await fetchStats();
          await fetchLogs();
          return {
            success: true,
            message: response.data.message,
            count: response.data.count,
          };
        }
        setStatus("error");
        setError(response.error || `Initial sync failed for ${entityType}`);
        return {
          success: false,
          message: response.error || `Initial sync failed for ${entityType}`,
          count: 0,
        };
      } catch (err) {
        setStatus("error");
        setError(
          err instanceof Error
            ? err.message
            : `Initial sync failed for ${entityType}`
        );
        return {
          success: false,
          message:
            err instanceof Error
              ? err.message
              : `Initial sync failed for ${entityType}`,
          count: 0,
        };
      } finally {
        setIsSyncing(false);
      }
    },
    [isSyncing, fetchStats, fetchLogs]
  );

  /**
   * Push all initial data (all entities with synced_at NULL) to ERP Cloud
   */
  const pushAllInitialData =
    useCallback(async (): Promise<AllInitialSyncResult> => {
      if (isSyncing) {
        return {
          success: false,
          message: "Sync in progress",
        };
      }

      setIsSyncing(true);
      setStatus("syncing");
      setError(null);

      try {
        const response = await window.api.sync.pushAllInitialData();
        if (response.success && response.data) {
          setStatus("idle");
          await fetchStats();
          await fetchLogs();
          return {
            success: true,
            message: response.data.message,
            data: response.data,
          };
        }
        setStatus("error");
        setError(response.error || "Initial sync failed");
        return {
          success: false,
          message: response.error || "Initial sync failed",
        };
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Initial sync failed");
        return {
          success: false,
          message: err instanceof Error ? err.message : "Initial sync failed",
        };
      } finally {
        setIsSyncing(false);
      }
    }, [isSyncing, fetchStats, fetchLogs]);

  /**
   * Get network status
   */
  const getNetworkStatus = useCallback(async () => {
    try {
      const response = await window.api.sync.getNetworkStatus();
      if (response.success && response.data) {
        setIsOnline(response.data.isOnline);
        return response.data;
      }
    } catch (err) {
      console.error("Failed to get network status:", err);
    }
    return null;
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
    if (status === "error") {
      setStatus("idle");
    }
  }, [status]);

  /**
   * Start polling for updates
   */
  const startPolling = useCallback(
    (intervalMs: number = 30000) => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }

      pollingRef.current = setInterval(() => {
        fetchStats();
        getNetworkStatus();
      }, intervalMs);
    },
    [fetchStats, getNetworkStatus]
  );

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  /**
   * Pagination helpers
   */
  const goToPage = useCallback(
    async (page: number) => {
      const newOffset = (page - 1) * (filters.limit || 50);
      await updateFilters({ offset: newOffset });
    },
    [filters.limit, updateFilters]
  );

  const currentPage =
    Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1;
  const totalPages = Math.ceil(totalLogs / (filters.limit || 50));

  // Initial fetch
  useEffect(() => {
    fetchStats();
    fetchLogs();
    getNetworkStatus();
  }, [fetchStats, fetchLogs, getNetworkStatus]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    // Data
    stats,
    logs,
    totalLogs,
    filters,
    isOnline,

    // Status
    isLoading,
    isSyncing,
    error,
    status,

    // Pagination
    currentPage,
    totalPages,
    goToPage,

    // Actions
    fetchStats,
    fetchLogs,
    updateFilters,
    resetFilters,
    syncAll,
    syncEntity,
    syncCustomers,
    syncItems,
    syncPaymentVerifications,
    retryFailed,
    getNetworkStatus,
    clearError,

    // Initial Sync Actions
    pushInitialData,
    pushAllInitialData,

    // Polling
    startPolling,
    stopPolling,
  };
}
