import { useEffect, useCallback } from "react";
import {
  RefreshCw,
  Database,
  Users,
  Package,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  RotateCcw,
  Play,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { Button } from "@Shared/Components/UI/Button";
import { Label } from "@Shared/Components/UI/Label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@Shared/Components/UI/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@Shared/Components/UI/Table";
import { Badge } from "@Shared/Components/UI/Badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@Shared/Components/UI/Select";
import { Separator } from "@Shared/Components/UI/Separator";
import { toast } from "sonner";
import { useSync } from "../Hooks/UseSync";
import type { SyncEntityType, SyncDirection } from "../Types/Sync";

// Format date helper
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

// Format relative time
function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "Belum pernah";

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Baru saja";
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  return `${diffDays} hari lalu`;
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const variants: Record<
    string,
    {
      variant: "default" | "secondary" | "destructive" | "outline";
      icon: typeof CheckCircle2;
    }
  > = {
    success: { variant: "default", icon: CheckCircle2 },
    completed: { variant: "default", icon: CheckCircle2 },
    failed: { variant: "destructive", icon: XCircle },
    pending: { variant: "secondary", icon: Clock },
    retrying: { variant: "outline", icon: RotateCcw },
    processing: { variant: "outline", icon: RotateCcw },
  };

  const { variant, icon: Icon } = variants[status] || variants.pending;

  return (
    <Badge variant={variant} className="flex items-center gap-1 w-fit">
      <Icon className="h-3 w-3" />
      <span className="capitalize">{status}</span>
    </Badge>
  );
}

// Direction badge component
function DirectionBadge({ direction }: { direction: string }) {
  return (
    <Badge variant="outline" className="capitalize">
      {direction === "push" ? "↑ Push" : "↓ Pull"}
    </Badge>
  );
}

// Entity icon component
function EntityIcon({ type }: { type: string }) {
  const icons: Record<string, typeof Users> = {
    customer: Users,
    item: Package,
    payment_verification: CreditCard,
    transaction: Database,
    transaction_item: Package,
    transaction_vehicle: Database,
    transaction_payment: CreditCard,
    loader: Database,
  };
  const Icon = icons[type] || Database;
  return <Icon className="h-4 w-4" />;
}

export function SyncDashboardPage() {
  const {
    stats,
    logs,
    totalLogs,
    filters,
    isOnline,
    isLoading,
    isSyncing,
    error,
    currentPage,
    totalPages,
    goToPage,
    fetchStats,
    fetchLogs,
    updateFilters,
    resetFilters,
    syncAll,
    syncCustomers,
    syncItems,
    syncPaymentVerifications,
    retryFailed,
    pushInitialData,
    pushAllInitialData,
    startPolling,
    stopPolling,
    clearError,
  } = useSync();

  // Start polling on mount
  useEffect(() => {
    startPolling(30000); // Poll every 30 seconds
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  // Handle sync actions
  const handleSyncAll = useCallback(async () => {
    const success = await syncAll();
    if (success) {
      toast.success("Sinkronisasi selesai");
    } else {
      toast.error("Sinkronisasi gagal");
    }
  }, [syncAll]);

  const handleSyncEntity = useCallback(
    async (entity: SyncEntityType, label: string) => {
      let success = false;
      switch (entity) {
        case "customer":
          success = await syncCustomers();
          break;
        case "item":
          success = await syncItems();
          break;
        case "payment_verification":
          success = await syncPaymentVerifications();
          break;
      }
      if (success) {
        toast.success(`Sinkronisasi ${label} selesai`);
      } else {
        toast.error(`Sinkronisasi ${label} gagal`);
      }
    },
    [syncCustomers, syncItems, syncPaymentVerifications]
  );

  const handleRetryFailed = useCallback(async () => {
    const success = await retryFailed();
    if (success) {
      toast.success("Retry selesai");
    } else {
      toast.error("Retry gagal");
    }
  }, [retryFailed]);

  const handlePushInitialData = useCallback(
    async (entity: SyncEntityType, label: string) => {
      const result = await pushInitialData(entity);
      if (result.success) {
        toast.success(`Initial sync ${label} selesai: ${result.count} record`);
      } else {
        toast.error(`Initial sync ${label} gagal: ${result.message}`);
      }
    },
    [pushInitialData]
  );

  const handlePushAllInitialData = useCallback(async () => {
    const result = await pushAllInitialData();
    if (result.success) {
      const totalSuccess = result.data?.totalSuccess || 0;
      const totalFailed = result.data?.totalFailed || 0;
      toast.success(
        `Initial sync selesai: ${totalSuccess} record berhasil, ${totalFailed} gagal`
      );
    } else {
      toast.error(`Initial sync gagal: ${result.message}`);
    }
  }, [pushAllInitialData]);

  // Handle filter changes
  const handleStatusFilter = (value: string) => {
    if (value === "all") {
      updateFilters({ status: undefined, offset: 0 });
    } else {
      updateFilters({ status: value, offset: 0 });
    }
  };

  const handleEntityFilter = (value: string) => {
    if (value === "all") {
      updateFilters({ entity_type: undefined, offset: 0 });
    } else {
      updateFilters({ entity_type: value as SyncEntityType, offset: 0 });
    }
  };

  const handleDirectionFilter = (value: string) => {
    if (value === "all") {
      updateFilters({ direction: undefined, offset: 0 });
    } else {
      updateFilters({ direction: value as SyncDirection, offset: 0 });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RefreshCw className="h-6 w-6" />
            Sinkronisasi Data
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitoring dan manajemen sinkronisasi dengan ERP Cloud
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Online Status */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
              isOnline
                ? "bg-green-500/10 text-green-600"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="h-4 w-4" />
                Online
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4" />
                Offline
              </>
            )}
          </div>
          <Button onClick={handleSyncAll} disabled={isSyncing || !isOnline}>
            {isSyncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Sync Semua
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={clearError}>
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Synced */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tersinkronisasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalSynced.toLocaleString() ?? "-"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <CheckCircle2 className="h-3 w-3 inline mr-1" />
              {stats?.successCount.toLocaleString() ?? 0} berhasil
            </p>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Menunggu Sinkronisasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats?.pendingCount.toLocaleString() ?? "-"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <Clock className="h-3 w-3 inline mr-1" />
              Dalam antrean
            </p>
          </CardContent>
        </Card>

        {/* Failed */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gagal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats?.failedCount.toLocaleString() ?? "-"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={handleRetryFailed}
                disabled={isSyncing || (stats?.failedCount ?? 0) === 0}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Retry semua
              </Button>
            </p>
          </CardContent>
        </Card>

        {/* Last Sync */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sinkronisasi Terakhir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {formatRelativeTime(stats?.lastSyncAt ?? null)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.lastSyncAt
                ? formatDate(stats.lastSyncAt)
                : "Belum ada sinkronisasi"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Sync Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sinkronisasi Manual</CardTitle>
          <CardDescription>
            Sinkronisasi data per entitas secara manual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => handleSyncEntity("customer", "Pelanggan")}
              disabled={isSyncing || !isOnline}
            >
              <Users className="h-4 w-4 mr-2" />
              Sync Pelanggan
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSyncEntity("item", "Barang")}
              disabled={isSyncing || !isOnline}
            >
              <Package className="h-4 w-4 mr-2" />
              Sync Barang
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                handleSyncEntity(
                  "payment_verification",
                  "Verifikasi Pembayaran"
                )
              }
              disabled={isSyncing || !isOnline}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Sync Verifikasi Pembayaran
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Initial Sync Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sinkronisasi Data Lama</CardTitle>
          <CardDescription>
            Sinkronisasi data yang belum pernah disync ke ERP Cloud (synced_at
            IS NULL)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => handlePushInitialData("customer", "Pelanggan")}
              disabled={isSyncing || !isOnline}
            >
              <Users className="h-4 w-4 mr-2" />
              Initial Sync Pelanggan
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePushInitialData("item", "Barang")}
              disabled={isSyncing || !isOnline}
            >
              <Package className="h-4 w-4 mr-2" />
              Initial Sync Barang
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                handlePushInitialData("transaction_vehicle", "Kendaraan")
              }
              disabled={isSyncing || !isOnline}
            >
              <Database className="h-4 w-4 mr-2" />
              Initial Sync Kendaraan
            </Button>
            <Button
              variant="default"
              onClick={handlePushAllInitialData}
              disabled={isSyncing || !isOnline}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Initial Sync Semua Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sync Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Log Sinkronisasi</CardTitle>
              <CardDescription>
                Riwayat aktivitas sinkronisasi data
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                fetchStats();
                fetchLogs();
              }}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="grid gap-1.5">
              <Label className="text-xs">Status</Label>
              <Select
                value={filters.status || "all"}
                onValueChange={handleStatusFilter}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="retrying">Retrying</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs">Entitas</Label>
              <Select
                value={filters.entity_type || "all"}
                onValueChange={handleEntityFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Semua Entitas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Entitas</SelectItem>
                  <SelectItem value="customer">Pelanggan</SelectItem>
                  <SelectItem value="item">Barang</SelectItem>
                  <SelectItem value="payment_verification">
                    Verifikasi Pembayaran
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs">Arah</Label>
              <Select
                value={filters.direction || "all"}
                onValueChange={handleDirectionFilter}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="push">Push</SelectItem>
                  <SelectItem value="pull">Pull</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(filters.status || filters.entity_type || filters.direction) && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="h-4 w-4 mr-1" />
                Reset Filter
              </Button>
            )}
          </div>

          <Separator />

          {/* Logs Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Waktu</TableHead>
                  <TableHead className="w-[120px]">Entitas</TableHead>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead className="w-[100px]">Aksi</TableHead>
                  <TableHead className="w-[80px]">Arah</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead>Pesan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Belum ada log sinkronisasi
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <EntityIcon type={log.entity_type} />
                          <span className="text-sm capitalize">
                            {log.entity_type.replace("_", " ")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.entity_id || "-"}
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {log.action}
                      </TableCell>
                      <TableCell>
                        <DirectionBadge direction={log.direction} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={log.status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {log.error_message || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Menampilkan {logs.length} dari {totalLogs} log
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1 || isLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages || isLoading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
