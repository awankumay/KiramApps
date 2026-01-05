import { useState } from "react";
import {
  Truck,
  Clock,
  CheckCircle,
  Search,
  Play,
  Eye,
  Package,
  Scale,
} from "lucide-react";
import { Button } from "@Shared/Components/UI/Button";
import { Input } from "@Shared/Components/UI/Input";
import { Badge } from "@Shared/Components/UI/Badge";
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

// Mock data - Antrian truck untuk dimuat material
const mockLoadingTasks = [
  {
    id: "LOAD-001",
    transactionId: "TRX-001",
    customer: "PT. Sumber Makmur",
    material: "Pasir",
    quantity: 5,
    unit: "m³",
    truckPlate: "B 1234 ABC",
    truckDriver: "Budi Santoso",
    status: "queued",
    priority: "high",
    scheduledAt: "2024-01-15 08:00",
  },
  {
    id: "LOAD-002",
    transactionId: "TRX-002",
    customer: "CV. Karya Jaya",
    material: "Batu Split",
    quantity: 8,
    unit: "m³",
    truckPlate: "D 5678 XYZ",
    truckDriver: "Ahmad Supardi",
    status: "in_progress",
    priority: "normal",
    scheduledAt: "2024-01-15 09:30",
    startedAt: "2024-01-15 09:35",
  },
  {
    id: "LOAD-003",
    transactionId: "TRX-003",
    customer: "UD. Mitra Sejahtera",
    material: "Batu Kali",
    quantity: 3,
    unit: "m³",
    truckPlate: "F 9012 DEF",
    truckDriver: "Dedi Kurniawan",
    status: "completed",
    priority: "normal",
    scheduledAt: "2024-01-15 07:00",
    startedAt: "2024-01-15 07:05",
    completedAt: "2024-01-15 08:30",
  },
  {
    id: "LOAD-004",
    transactionId: "TRX-004",
    customer: "PT. Bangun Persada",
    material: "Abu Batu",
    quantity: 10,
    unit: "m³",
    truckPlate: "B 2345 GHI",
    truckDriver: "Eko Prasetyo",
    status: "queued",
    priority: "high",
    scheduledAt: "2024-01-15 11:00",
  },
];

type LoadingStatus = "queued" | "in_progress" | "completed";

const statusConfig: Record<
  LoadingStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: typeof Clock;
  }
> = {
  queued: { label: "Antrian", variant: "secondary", icon: Clock },
  in_progress: { label: "Sedang Dimuat", variant: "default", icon: Truck },
  completed: { label: "Selesai", variant: "outline", icon: CheckCircle },
};

const priorityConfig = {
  high: { label: "Prioritas", variant: "destructive" as const },
  normal: { label: "Normal", variant: "outline" as const },
};

export function LoaderQueuePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const queuedCount = mockLoadingTasks.filter(
    (t) => t.status === "queued"
  ).length;
  const inProgressCount = mockLoadingTasks.filter(
    (t) => t.status === "in_progress"
  ).length;
  const completedTodayCount = mockLoadingTasks.filter(
    (t) => t.status === "completed"
  ).length;

  const filteredTasks = mockLoadingTasks.filter((task) => {
    const matchesSearch =
      task.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.truckPlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.material.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      selectedStatus === "all" || task.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleStartLoading = (id: string) => {
    alert(`Mulai muat material untuk task ${id} (mock)`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Scale className="h-8 w-8" />
          Antrian Muat
        </h1>
        <p className="text-muted-foreground">
          Kelola antrian truck untuk dimuat material
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className={`cursor-pointer transition-colors ${
            selectedStatus === "queued" ? "ring-2 ring-primary" : ""
          }`}
          onClick={() =>
            setSelectedStatus(selectedStatus === "queued" ? "all" : "queued")
          }
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Antrian</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queuedCount}</div>
            <p className="text-xs text-muted-foreground">Menunggu dimuat</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-colors ${
            selectedStatus === "in_progress" ? "ring-2 ring-primary" : ""
          }`}
          onClick={() =>
            setSelectedStatus(
              selectedStatus === "in_progress" ? "all" : "in_progress"
            )
          }
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sedang Dimuat</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {inProgressCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Proses muat material
            </p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-colors ${
            selectedStatus === "completed" ? "ring-2 ring-primary" : ""
          }`}
          onClick={() =>
            setSelectedStatus(
              selectedStatus === "completed" ? "all" : "completed"
            )
          }
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Selesai Hari Ini
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {completedTodayCount}
            </div>
            <p className="text-xs text-muted-foreground">Muat selesai</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Antrian</CardTitle>
          <CardDescription>
            {selectedStatus === "all"
              ? "Semua task muat"
              : `Filter: ${
                  statusConfig[selectedStatus as LoadingStatus]?.label ||
                  selectedStatus
                }`}
          </CardDescription>
          <div className="flex gap-4 mt-4">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari task muat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            {selectedStatus !== "all" && (
              <Button variant="ghost" onClick={() => setSelectedStatus("all")}>
                Reset Filter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Truck</TableHead>
                <TableHead>Sopir</TableHead>
                <TableHead>Prioritas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => {
                const status = statusConfig[task.status as LoadingStatus];
                const priority =
                  priorityConfig[task.priority as keyof typeof priorityConfig];
                const StatusIcon = status.icon;
                return (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.id}</TableCell>
                    <TableCell>
                      <div>
                        <p>{task.customer}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.transactionId}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{task.material}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {task.quantity} {task.unit}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{task.truckPlate}</span>
                    </TableCell>
                    <TableCell>{task.truckDriver}</TableCell>
                    <TableCell>
                      <Badge variant={priority.variant}>{priority.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={status.variant}
                        className="flex items-center gap-1 w-fit"
                      >
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {task.status === "queued" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => handleStartLoading(task.id)}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredTasks.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Tidak ada task muat ditemukan
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
