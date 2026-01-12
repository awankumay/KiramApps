import { useState, useEffect } from "react";
import {
  Settings,
  Save,
  RotateCw,
  Wifi,
  WifiOff,
  Globe,
  Clock,
  Database,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@Shared/Components/UI/Button";
import { Input } from "@Shared/Components/UI/Input";
import { Label } from "@Shared/Components/UI/Label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@Shared/Components/UI/Card";
import { Separator } from "@Shared/Components/UI/Separator";
import { toast } from "sonner";
import { useSettings } from "../Hooks/UseSettings";
import type { SettingsFormValues } from "../Types/Settings";

export function SettingsPage() {
  const {
    isLoading,
    error,
    connectionStatus,
    isTestingConnection,
    getFormValues,
    updateSettings,
    testConnection,
    clearError,
  } = useSettings();

  // Form state
  const [formValues, setFormValues] = useState<SettingsFormValues>({
    erp_api_url: "",
    sync_enabled: true,
    sync_interval_minutes: 10,
    sync_on_startup: true,
    sync_batch_size: 50,
    sync_retry_max: 5,
    sync_timeout_seconds: 30,
  });
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings on mount
  useEffect(() => {
    if (!isLoading) {
      const values = getFormValues();
      setFormValues(values);
    }
  }, [isLoading, getFormValues]);

  // Handle input change
  const handleChange = (
    field: keyof SettingsFormValues,
    value: string | number | boolean
  ) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    clearError();
  };

  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const success = await updateSettings(formValues);
      if (success) {
        toast.success("Pengaturan berhasil disimpan");
        setIsDirty(false);
      } else {
        toast.error("Gagal menyimpan pengaturan");
      }
    } catch {
      toast.error("Terjadi kesalahan saat menyimpan");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle reset
  const handleReset = () => {
    const values = getFormValues();
    setFormValues(values);
    setIsDirty(false);
    clearError();
    toast.info("Pengaturan direset ke nilai tersimpan");
  };

  // Handle test connection
  const handleTestConnection = async () => {
    const result = await testConnection(formValues.erp_api_url);
    if (result.success) {
      toast.success(`Koneksi berhasil (${result.latencyMs}ms)`);
    } else {
      toast.error(result.message || "Koneksi gagal");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Pengaturan Aplikasi
          </h1>
          <p className="text-muted-foreground mt-1">
            Konfigurasi koneksi ERP dan sinkronisasi data
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!isDirty || isSaving}
          >
            <RotateCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!isDirty || isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Simpan
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* ERP Connection Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Koneksi ERP Cloud
          </CardTitle>
          <CardDescription>
            Konfigurasi endpoint API untuk sinkronisasi dengan server ERP
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="erp_api_url">URL API ERP</Label>
              <div className="flex gap-2">
                <Input
                  id="erp_api_url"
                  type="url"
                  placeholder="https://erp.example.com/api"
                  value={formValues.erp_api_url}
                  onChange={(e) => handleChange("erp_api_url", e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                >
                  {isTestingConnection ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wifi className="h-4 w-4" />
                  )}
                  <span className="ml-2">Test</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Masukkan URL lengkap endpoint API ERP (contoh:
                https://erp.company.com/api)
              </p>
            </div>

            {/* Connection Status */}
            {connectionStatus && (
              <div
                className={`flex items-center gap-2 p-3 rounded-md ${
                  connectionStatus.success
                    ? "bg-green-500/10 text-green-600"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {connectionStatus.success ? (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    <span>
                      Koneksi berhasil - Latensi: {connectionStatus.latencyMs}ms
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5" />
                    <span>{connectionStatus.message}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Pengaturan Sinkronisasi
          </CardTitle>
          <CardDescription>
            Konfigurasi perilaku sinkronisasi data otomatis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Sync Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Aktifkan Sinkronisasi</Label>
              <p className="text-xs text-muted-foreground">
                Mengaktifkan sinkronisasi otomatis dengan server ERP
              </p>
            </div>
            <Button
              variant={formValues.sync_enabled ? "default" : "outline"}
              size="sm"
              onClick={() =>
                handleChange("sync_enabled", !formValues.sync_enabled)
              }
            >
              {formValues.sync_enabled ? (
                <>
                  <Wifi className="h-4 w-4 mr-2" /> Aktif
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 mr-2" /> Nonaktif
                </>
              )}
            </Button>
          </div>

          <Separator />

          {/* Sync on Startup Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Sinkronisasi saat Startup</Label>
              <p className="text-xs text-muted-foreground">
                Jalankan sinkronisasi otomatis saat aplikasi dimulai
              </p>
            </div>
            <Button
              variant={formValues.sync_on_startup ? "default" : "outline"}
              size="sm"
              onClick={() =>
                handleChange("sync_on_startup", !formValues.sync_on_startup)
              }
              disabled={!formValues.sync_enabled}
            >
              {formValues.sync_on_startup ? "Aktif" : "Nonaktif"}
            </Button>
          </div>

          <Separator />

          {/* Sync Interval */}
          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="sync_interval_minutes">
                Interval Sinkronisasi (menit)
              </Label>
            </div>
            <Input
              id="sync_interval_minutes"
              type="number"
              min={1}
              max={1440}
              value={formValues.sync_interval_minutes}
              onChange={(e) =>
                handleChange(
                  "sync_interval_minutes",
                  parseInt(e.target.value) || 10
                )
              }
              disabled={!formValues.sync_enabled}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              Seberapa sering melakukan sinkronisasi otomatis (1-1440 menit)
            </p>
          </div>

          <Separator />

          {/* Batch Size */}
          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="sync_batch_size">Ukuran Batch</Label>
            </div>
            <Input
              id="sync_batch_size"
              type="number"
              min={10}
              max={500}
              value={formValues.sync_batch_size}
              onChange={(e) =>
                handleChange("sync_batch_size", parseInt(e.target.value) || 50)
              }
              disabled={!formValues.sync_enabled}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              Jumlah record yang diproses per batch sinkronisasi (10-500)
            </p>
          </div>

          <Separator />

          {/* Retry Settings */}
          <div className="grid grid-cols-2 gap-6">
            <div className="grid gap-2">
              <Label htmlFor="sync_retry_max">Maksimal Retry</Label>
              <Input
                id="sync_retry_max"
                type="number"
                min={1}
                max={10}
                value={formValues.sync_retry_max}
                onChange={(e) =>
                  handleChange("sync_retry_max", parseInt(e.target.value) || 5)
                }
                disabled={!formValues.sync_enabled}
                className="w-24"
              />
              <p className="text-xs text-muted-foreground">
                Jumlah percobaan ulang jika gagal (1-10)
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sync_timeout_seconds">Timeout (detik)</Label>
              <Input
                id="sync_timeout_seconds"
                type="number"
                min={5}
                max={120}
                value={formValues.sync_timeout_seconds}
                onChange={(e) =>
                  handleChange(
                    "sync_timeout_seconds",
                    parseInt(e.target.value) || 30
                  )
                }
                disabled={!formValues.sync_enabled}
                className="w-24"
              />
              <p className="text-xs text-muted-foreground">
                Batas waktu untuk setiap request (5-120 detik)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
