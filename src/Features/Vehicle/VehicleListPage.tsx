import { useState, useEffect, useCallback } from "react";
import {
  Car,
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash,
  Power,
  Loader2,
  RefreshCw,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@Shared/Components/UI/Table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@Shared/Components/UI/DropdownMenu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@Shared/Components/UI/Dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@Shared/Components/UI/AlertDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@Shared/Components/UI/Select";
import { toast } from "sonner";
import type {
  VehicleData,
  CustomerData,
  CreateVehicleData,
  UpdateVehicleData,
} from "@Shared/Types/Electron";

// Form data interface
interface VehicleFormData {
  plate_number: string;
  customer_id: number;
  is_active: boolean;
}

const initialFormData: VehicleFormData = {
  plate_number: "",
  customer_id: 0,
  is_active: true,
};

export function VehicleListPage() {
  // State
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleData | null>(
    null
  );
  const [formData, setFormData] = useState<VehicleFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof VehicleFormData, string>>
  >({});

  // Fetch vehicles and customers on mount
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await window.api.vehicles.getAll({
        plate_number: searchQuery || undefined,
      });

      if (res.success && res.data) {
        setVehicles(res.data.vehicles);
      } else {
        toast.error("Gagal memuat data kendaraan", {
          description: res.error,
        });
      }
    } catch (error) {
      toast.error("Gagal memuat data", {
        description: "Terjadi kesalahan saat memuat data",
      });
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await window.api.customers.getAll({ is_active: true });

      if (res.success && res.data) {
        setCustomers(res.data.customers);
      }
    } catch (error) {
      console.error("Error loading customers:", error);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchCustomers();
  }, [fetchData, fetchCustomers]);

  // Filter vehicles based on search
  const filteredVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.plate_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const totalVehicles = vehicles.length;
  const activeVehicles = vehicles.filter((v) => v.is_active).length;
  const inactiveVehicles = vehicles.filter((v) => !v.is_active).length;

  // Form validation
  const validateForm = async (): Promise<boolean> => {
    const errors: Partial<Record<keyof VehicleFormData, string>> = {};

    if (!formData.plate_number.trim()) {
      errors.plate_number = "Nomor plat wajib diisi";
    } else if (formData.plate_number.length < 3) {
      errors.plate_number = "Nomor plat minimal 3 karakter";
    }

    if (!formData.customer_id || formData.customer_id === 0) {
      errors.customer_id = "Customer wajib dipilih";
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return false;
    }

    // Check plate number uniqueness
    try {
      const res = await window.api.vehicles.plateNumberExists(
        formData.plate_number,
        selectedVehicle?.id
      );

      if (res.success && res.data) {
        errors.plate_number = "Nomor plat sudah digunakan";
        setFormErrors(errors);
        return false;
      }
    } catch (error) {
      console.error("Error checking plate number:", error);
    }

    return true;
  };

  // Handle create vehicle
  const handleCreateVehicle = async () => {
    const isValid = await validateForm();
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      const createData: CreateVehicleData = {
        plate_number: formData.plate_number.trim().toUpperCase(),
        customer_id: formData.customer_id,
      };

      const res = await window.api.vehicles.create(createData);

      if (res.success && res.data) {
        setVehicles((prev) => [...prev, res.data!]);
        setIsCreateDialogOpen(false);
        resetForm();
        toast.success("Kendaraan berhasil ditambahkan", {
          description: `${res.data.plate_number} telah ditambahkan`,
        });
      } else {
        toast.error("Gagal menambahkan kendaraan", {
          description: res.error,
        });
      }
    } catch (error) {
      toast.error("Gagal menambahkan kendaraan", {
        description: "Terjadi kesalahan saat menyimpan data",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update vehicle
  const handleUpdateVehicle = async () => {
    const isValid = await validateForm();
    if (!isValid || !selectedVehicle) return;

    setIsSubmitting(true);
    try {
      const updateData: UpdateVehicleData = {
        plate_number: formData.plate_number.trim().toUpperCase(),
        customer_id: formData.customer_id,
        is_active: formData.is_active,
      };

      const res = await window.api.vehicles.update(
        selectedVehicle.id,
        updateData
      );

      if (res.success && res.data) {
        setVehicles((prev) =>
          prev.map((v) => (v.id === selectedVehicle.id ? res.data! : v))
        );
        setIsEditDialogOpen(false);
        resetForm();
        toast.success("Kendaraan berhasil diperbarui", {
          description: `Data ${res.data.plate_number} telah diperbarui`,
        });
      } else {
        toast.error("Gagal memperbarui kendaraan", {
          description: res.error,
        });
      }
    } catch (error) {
      toast.error("Gagal memperbarui kendaraan", {
        description: "Terjadi kesalahan saat menyimpan data",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete vehicle
  const handleDeleteVehicle = async () => {
    if (!selectedVehicle) return;

    setIsSubmitting(true);
    try {
      const res = await window.api.vehicles.delete(selectedVehicle.id);

      if (res.success) {
        setVehicles((prev) => prev.filter((v) => v.id !== selectedVehicle.id));
        setIsDeleteDialogOpen(false);
        setSelectedVehicle(null);
        toast.success("Kendaraan berhasil dihapus", {
          description: `${selectedVehicle.plate_number} telah dihapus`,
        });
      } else {
        toast.error("Gagal menghapus kendaraan", {
          description: res.error,
        });
      }
    } catch (error) {
      toast.error("Gagal menghapus kendaraan", {
        description: "Terjadi kesalahan saat menghapus data",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle toggle status
  const handleToggleStatus = async (vehicle: VehicleData) => {
    try {
      const res = await window.api.vehicles.update(vehicle.id, {
        is_active: !vehicle.is_active,
      });

      if (res.success && res.data) {
        setVehicles((prev) =>
          prev.map((v) => (v.id === vehicle.id ? res.data! : v))
        );
        const statusText = res.data.is_active ? "aktif" : "nonaktif";
        toast.success("Status kendaraan diperbarui", {
          description: `${vehicle.plate_number} sekarang ${statusText}`,
        });
      } else {
        toast.error("Gagal mengubah status", {
          description: res.error,
        });
      }
    } catch (error) {
      toast.error("Gagal mengubah status", {
        description: "Terjadi kesalahan",
      });
    }
  };

  // Open edit dialog
  const openEditDialog = (vehicle: VehicleData) => {
    setSelectedVehicle(vehicle);
    setFormData({
      plate_number: vehicle.plate_number,
      customer_id: vehicle.customer_id,
      is_active: vehicle.is_active,
    });
    setFormErrors({});
    setIsEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (vehicle: VehicleData) => {
    setSelectedVehicle(vehicle);
    setIsDeleteDialogOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData(initialFormData);
    setFormErrors({});
    setSelectedVehicle(null);
  };

  // Open create dialog
  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  // Badge color helpers
  const getStatusBadgeColor = (isActive: boolean) => {
    return isActive
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  };

  const getCategoryBadgeColor = (category?: string) => {
    if (!category) return "";
    return category === "COMPANY"
      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
  };

  // Render form fields - inlined to prevent re-render issues
  const renderFormFields = () => (
    <div className="grid gap-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="plate_number">Nomor Plat</Label>
        <Input
          id="plate_number"
          name="plate_number"
          value={formData.plate_number}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              plate_number: e.target.value.toUpperCase(),
            }))
          }
          placeholder="Masukkan nomor plat"
          className={`font-mono uppercase ${
            formErrors.plate_number ? "border-destructive" : ""
          }`}
        />
        {formErrors.plate_number && (
          <p className="text-sm text-destructive">{formErrors.plate_number}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="customer_id">Customer</Label>
        <Select
          value={formData.customer_id.toString()}
          onValueChange={(value) =>
            setFormData((prev) => ({
              ...prev,
              customer_id: parseInt(value),
            }))
          }
        >
          <SelectTrigger
            className={formErrors.customer_id ? "border-destructive" : ""}
          >
            <SelectValue placeholder="Pilih customer" />
          </SelectTrigger>
          <SelectContent>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id.toString()}>
                {customer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {formErrors.customer_id && (
          <p className="text-sm text-destructive">{formErrors.customer_id}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={formData.is_active ? "active" : "inactive"}
          onValueChange={(value) =>
            setFormData((prev) => ({
              ...prev,
              is_active: value === "active",
            }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Pilih status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Car className="h-8 w-8" />
            Manajemen Kendaraan
          </h1>
          <p className="text-muted-foreground">
            Kelola data kendaraan dan customer
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchData} variant="secondary" disabled={isLoading}>
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Kendaraan
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Kendaraan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVehicles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Kendaraan Aktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeVehicles}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Kendaraan Nonaktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {inactiveVehicles}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vehicles Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Kendaraan</CardTitle>
          <CardDescription>
            Semua kendaraan yang terdaftar dalam sistem
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari kendaraan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nomor Plat</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal Dibuat</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVehicles.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground"
                      >
                        {searchQuery
                          ? "Tidak ada kendaraan yang cocok dengan pencarian"
                          : "Belum ada kendaraan"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVehicles.map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-medium font-mono">
                          {vehicle.plate_number}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{vehicle.customer_name}</span>
                            {vehicle.customer_category && (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoryBadgeColor(
                                  vehicle.customer_category
                                )}`}
                              >
                                {vehicle.customer_category}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                              vehicle.is_active
                            )}`}
                          >
                            {vehicle.is_active ? "Aktif" : "Nonaktif"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(vehicle.created_at).toLocaleDateString(
                            "id-ID",
                            {
                              dateStyle: "medium",
                            }
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => openEditDialog(vehicle)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(vehicle)}
                              >
                                <Power className="h-4 w-4 mr-2" />
                                {vehicle.is_active ? "Nonaktifkan" : "Aktifkan"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => openDeleteDialog(vehicle)}
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Vehicle Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Tambah Kendaraan Baru</DialogTitle>
            <DialogDescription>
              Isi form berikut untuk menambahkan kendaraan baru ke sistem.
            </DialogDescription>
          </DialogHeader>
          {renderFormFields()}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button onClick={handleCreateVehicle} disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Vehicle Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Kendaraan</DialogTitle>
            <DialogDescription>
              Perbarui informasi kendaraan {selectedVehicle?.plate_number}.
            </DialogDescription>
          </DialogHeader>
          {renderFormFields()}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button onClick={handleUpdateVehicle} disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kendaraan?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda yakin ingin menghapus kendaraan{" "}
              <strong>{selectedVehicle?.plate_number}</strong>? Tindakan ini
              tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVehicle}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
