import { useState, useEffect, useCallback } from "react";
import { Wifi, WifiOff, RefreshCw, AlertCircle } from "lucide-react";
import { Badge } from "@Shared/Components/UI/Badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@Shared/Components/UI/Tooltip";

export type SyncStatusType = "online" | "offline" | "syncing" | "error";

interface SyncStatusIndicatorProps {
  className?: string;
  showLabel?: boolean;
  pollingInterval?: number; // in milliseconds, default 30000 (30s)
}

/**
 * A status indicator component that shows the current sync/online status.
 * Can be used in headers, sidebars, or other UI locations.
 */
export function SyncStatusIndicator({
  className = "",
  showLabel = true,
  pollingInterval = 30000,
}: SyncStatusIndicatorProps) {
  const [status, setStatus] = useState<SyncStatusType>("offline");
  const [lastSync, setLastSync] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const response = await window.api.sync.getNetworkStatus();
      if (response.success && response.data) {
        setStatus(response.data.isOnline ? "online" : "offline");
      }

      // Get last sync time from stats
      const statsResponse = await window.api.sync.getStats();
      if (statsResponse.success && statsResponse.data) {
        const stats = statsResponse.data as { lastSyncAt?: string };
        setLastSync(stats.lastSyncAt || null);
      }
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, pollingInterval);
    return () => clearInterval(interval);
  }, [checkStatus, pollingInterval]);

  const statusConfig: Record<
    SyncStatusType,
    {
      icon: typeof Wifi;
      label: string;
      variant: "default" | "secondary" | "destructive" | "outline";
      className: string;
    }
  > = {
    online: {
      icon: Wifi,
      label: "Online",
      variant: "default",
      className: "bg-green-500/10 text-green-600 border-green-500/20",
    },
    offline: {
      icon: WifiOff,
      label: "Offline",
      variant: "secondary",
      className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    },
    syncing: {
      icon: RefreshCw,
      label: "Syncing",
      variant: "outline",
      className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    },
    error: {
      icon: AlertCircle,
      label: "Error",
      variant: "destructive",
      className: "bg-destructive/10 text-destructive border-destructive/20",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  const formatLastSync = (dateStr: string | null): string => {
    if (!dateStr) return "Belum pernah";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Baru saja";
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`cursor-default ${config.className} ${className}`}
          >
            <Icon
              className={`h-3 w-3 ${
                status === "syncing" ? "animate-spin" : ""
              }`}
            />
            {showLabel && <span className="ml-1.5">{config.label}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="text-xs">
            <p className="font-medium">Status: {config.label}</p>
            <p className="text-muted-foreground">
              Sinkronisasi terakhir: {formatLastSync(lastSync)}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Compact version for use in tight spaces like navigation bars
 */
export function SyncStatusDot({ className = "" }: { className?: string }) {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const checkOnline = async () => {
      try {
        const response = await window.api.sync.getNetworkStatus();
        if (response.success && response.data) {
          setIsOnline(response.data.isOnline);
        }
      } catch {
        setIsOnline(false);
      }
    };

    checkOnline();
    const interval = setInterval(checkOnline, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              isOnline ? "bg-green-500" : "bg-yellow-500"
            } ${className}`}
          />
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <span className="text-xs">{isOnline ? "Online" : "Offline"}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
