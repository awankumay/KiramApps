import { useState } from "react";
import {
  ArrowLeft,
  Truck,
  User,
  Package,
  Clock,
  CheckCircle,
  Play,
  Camera,
  Scale,
  AlertCircle,
  Printer,
} from "lucide-react";
import { Button } from "@Shared/Components/UI/Button";
import { Badge } from "@Shared/Components/UI/Badge";
import { Textarea } from "@Shared/Components/UI/Textarea";
import { Label } from "@Shared/Components/UI/Label";
import { Input } from "@Shared/Components/UI/Input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@Shared/Components/UI/Card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@Shared/Components/UI/Dialog";
import { TemplatePreviewer } from "@/Shared/Components/TemplatePreviewer";
import type {
  SuratKirimData,
  TemplateData,
} from "@/Shared/Types/PrintTemplate";
import { toast } from "sonner";

// Mock data untuk task muat material
const mockLoadingTask = {
  id: "LOAD-002",
  transactionId: "TRX-002",
  customer: {
    name: "CV. Karya Jaya",
    phone: "0812-3456-7890",
  },
  material: {
    type: "Batu Split",
    quantity: 8,
    unit: "m³",
    pricePerUnit: 250000,
  },
  truck: {
    plate: "D 5678 XYZ",
    driver: "Ahmad Supardi",
    capacity: 10,
    capacityUnit: "m³",
  },
  status: "in_progress",
  priority: "normal",
  timeline: [
    { status: "created", at: "2024-01-15 08:00", by: "System" },
    { status: "queued", at: "2024-01-15 09:00", by: "System" },
    { status: "in_progress", at: "2024-01-15 09:35", by: "Ahmad Supardi" },
  ],
  scheduledAt: "2024-01-15 09:30",
  startedAt: "2024-01-15 09:35",
};

type LoadingStatus = "queued" | "in_progress" | "completed";

const statusConfig: Record<
  LoadingStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    color: string;
  }
> = {
  queued: { label: "Antrian", variant: "secondary", color: "text-gray-500" },
  in_progress: {
    label: "Sedang Dimuat",
    variant: "default",
    color: "text-blue-500",
  },
  completed: { label: "Selesai", variant: "outline", color: "text-green-500" },
};

export function LoaderDetailPage() {
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");
  const [actualQuantity, setActualQuantity] = useState("");
  const [hasPhoto, setHasPhoto] = useState(false);
  const [showSuratKirimPreview, setShowSuratKirimPreview] = useState(false);
  const [suratKirimData, setSuratKirimData] = useState<SuratKirimData | null>(
    null
  );
  const task = mockLoadingTask;
  const status = statusConfig[task.status as LoadingStatus];

  const handleGoBack = () => {
    // In real app, use router navigation
    window.history.back();
  };

  const handleStartLoading = () => {
    alert("Mulai muat material (mock)");
  };

  const handleTakePhoto = () => {
    alert("Ambil foto bukti muat (mock)");
    setHasPhoto(true);
  };

  const handleComplete = () => {
    const notes = completionNotes || "-";
    const qty = actualQuantity || "-";
    alert(`Muat selesai. Catatan: ${notes}, Jumlah Aktual: ${qty} (mock)`);
    setShowCompleteDialog(false);
  };

  const handlePrintSuratKirim = () => {
    // Map loader task data to SuratKirimData format
    const suratKirim: SuratKirimData = {
      // Header
      companyName: "CV. KIRAMANA",

      // Truck & Destination
      truckName: task.truck.plate,
      destination: task.customer.name,

      // Materials
      materials: [
        {
          no: 1,
          jenisMaterial: task.material.type,
          jumlah: `${task.material.quantity} ${task.material.unit}`,
          keterangan: task.transactionId,
        },
      ],

      // Footer
      date: new Date().toLocaleDateString("id-ID"),
      driverName: task.truck.driver,
      supervisorName: "Supervisor", // In real app, get from auth context
    };

    setSuratKirimData(suratKirim);
    setShowSuratKirimPreview(true);
  };

  const handlePrintConfirmed = async () => {
    if (!suratKirimData) return;

    try {
      const result = await window.api.printer.printSuratKirim(suratKirimData);

      if (result.success) {
        toast.success("Surat Kirim berhasil dicetak");
        setShowSuratKirimPreview(false);
        // In real app, save print timestamp to database
      } else {
        toast.error(result.error || "Gagal mencetak Surat Kirim");
      }
    } catch (error) {
      console.error("Print error:", error);
      toast.error("Terjadi kesalahan saat mencetak");
    }
  };

  const totalPrice = task.material.quantity * task.material.pricePerUnit;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleGoBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Scale className="h-8 w-8" />
            {task.id}
          </h1>
          <p className="text-muted-foreground">
            Detail task muat {task.transactionId}
          </p>
        </div>
        <Badge variant={status.variant} className="text-lg py-1 px-3">
          {status.label}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informasi Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Nama</p>
                  <p className="font-medium">{task.customer.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telepon</p>
                  <p className="font-medium">{task.customer.phone}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Material Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Material
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Jenis Material
                  </p>
                  <p className="font-medium text-lg">{task.material.type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Jumlah Order</p>
                  <p className="font-medium text-lg">
                    {task.material.quantity} {task.material.unit}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Harga Satuan</p>
                  <p className="font-medium">
                    Rp {task.material.pricePerUnit.toLocaleString()}/
                    {task.material.unit}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Harga</p>
                  <p className="font-bold text-lg text-primary">
                    Rp {totalPrice.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Truck Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Truck
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Plat Nomor</p>
                  <p className="font-medium text-lg">{task.truck.plate}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sopir</p>
                  <p className="font-medium">{task.truck.driver}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Kapasitas Truck
                  </p>
                  <p className="font-medium">
                    {task.truck.capacity} {task.truck.capacityUnit}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Persentase Muatan
                  </p>
                  <p className="font-medium">
                    {(
                      (task.material.quantity / task.truck.capacity) *
                      100
                    ).toFixed(1)}
                    %
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions & Timeline */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Aksi</CardTitle>
              <CardDescription>Kelola proses muat material</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {task.status === "queued" && (
                <Button className="w-full" onClick={handleStartLoading}>
                  <Play className="h-4 w-4 mr-2" />
                  Mulai Muat
                </Button>
              )}
              {task.status === "in_progress" && (
                <>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleTakePhoto}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {hasPhoto ? "Foto Sudah Diambil" : "Ambil Foto Bukti"}
                  </Button>
                  {hasPhoto && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>Foto bukti muat tersimpan</span>
                    </div>
                  )}
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => setShowCompleteDialog(true)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Selesaikan Muat
                  </Button>
                </>
              )}
              {task.status === "completed" && (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>Muat material telah selesai</p>
                </div>
              )}

              {/* Print Surat Kirim - Available for all statuses */}
              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handlePrintSuratKirim}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Cetak Surat Kirim
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {task.timeline.map((event, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="relative">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                      {index < task.timeline.length - 1 && (
                        <div className="absolute top-3 left-[3px] w-[2px] h-full bg-border" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-medium capitalize">
                        {event.status === "created" && "Task Dibuat"}
                        {event.status === "queued" && "Dalam Antrian"}
                        {event.status === "in_progress" && "Sedang Dimuat"}
                        {event.status === "completed" && "Muat Selesai"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {event.at}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        oleh {event.by}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Schedule Info */}
          <Card>
            <CardHeader>
              <CardTitle>Jadwal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dijadwalkan</span>
                <span>{task.scheduledAt}</span>
              </div>
              {task.startedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dimulai</span>
                  <span>{task.startedAt}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Complete Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selesaikan Muat Material</DialogTitle>
            <DialogDescription>
              Konfirmasi penyelesaian muat material {task.id}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2 text-blue-700">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Informasi Order:</p>
                  <p>
                    {task.material.type}: {task.material.quantity}{" "}
                    {task.material.unit}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Jumlah Aktual Dimuat ({task.material.unit})</Label>
              <Input
                type="number"
                placeholder={`Masukkan jumlah aktual (max ${task.truck.capacity} ${task.truck.capacityUnit})`}
                value={actualQuantity}
                onChange={(e) => setActualQuantity(e.target.value)}
                min={0}
                max={task.truck.capacity}
              />
            </div>
            <div className="space-y-2">
              <Label>Catatan Penyelesaian (Opsional)</Label>
              <Textarea
                placeholder="Tambahkan catatan jika ada perbedaan atau kondisi khusus..."
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCompleteDialog(false)}
            >
              Batal
            </Button>
            <Button
              onClick={handleComplete}
              className="bg-green-600 hover:bg-green-700"
              disabled={!hasPhoto || !actualQuantity}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Konfirmasi Selesai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Surat Kirim Preview Dialog */}
      {showSuratKirimPreview && suratKirimData && (
        <TemplatePreviewer
          templateId="surat-kirim"
          data={suratKirimData as unknown as TemplateData}
          onClose={() => setShowSuratKirimPreview(false)}
          onPrint={handlePrintConfirmed}
        />
      )}
    </div>
  );
}
