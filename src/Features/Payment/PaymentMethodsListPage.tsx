import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
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
  PaymentMethodData,
  CreatePaymentMethodData,
  UpdatePaymentMethodData,
} from "@Shared/Types/Electron";

// Form data interface
interface PaymentMethodFormData {
  name: string;
  is_active: boolean;
}

const initialFormData: PaymentMethodFormData = {
  name: "",
  is_active: true,
};

export function PaymentMethodsListPage() {
  // State
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] =
    useState<PaymentMethodData | null>(null);
  const [formData, setFormData] =
    useState<PaymentMethodFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof PaymentMethodFormData, string>>
  >({});

  // Fetch payment methods on mount
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await window.api.paymentMethods.getAll();

      console.log("Payment methods API response:", res);

      if (res.success && res.data) {
        const methods = res.data.paymentMethods || [];
        console.log("Setting payment methods:", methods);
        setPaymentMethods(methods);
      } else {
        toast.error("Gagal memuat data metode pembayaran", {
          description: res.error,
        });
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      toast.error("Gagal memuat data", {
        description: "Terjadi kesalahan saat memuat data",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter payment methods based on search and status
  const filteredPaymentMethods =
    paymentMethods?.filter(
      (method) =>
        method &&
        method.name &&
        method.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (statusFilter === undefined ||
          (statusFilter === "active" && method.is_active) ||
          (statusFilter === "inactive" && !method.is_active))
    ) || [];

  // Stats
  const totalMethods = paymentMethods.length;
  const activeMethods = paymentMethods.filter((m) => m.is_active).length;
  const inactiveMethods = paymentMethods.filter((m) => !m.is_active).length;

  // Form validation
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof PaymentMethodFormData, string>> = {};

    if (!formData.name.trim()) {
      errors.name = "Nama metode pembayaran wajib diisi";
    } else if (formData.name.length < 2) {
      errors.name = "Nama metode pembayaran minimal 2 karakter";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle create payment method
  const handleCreatePaymentMethod = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const createData: CreatePaymentMethodData = {
        name: formData.name.trim(),
        is_active: formData.is_active,
      };

      const res = await window.api.paymentMethods.create(createData);

      if (res.success && res.data) {
        setPaymentMethods((prev) => [...prev, res.data!]);
        setIsCreateDialogOpen(false);
        resetForm();
        toast.success("Metode pembayaran berhasil ditambahkan", {
          description: `${res.data.name} telah ditambahkan`,
        });
      } else {
        toast.error("Gagal menambahkan metode pembayaran", {
          description: res.error,
        });
      }
    } catch (error) {
      toast.error("Gagal menambahkan metode pembayaran", {
        description: "Terjadi kesalahan saat menyimpan data",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update payment method
  const handleUpdatePaymentMethod = async () => {
    if (!selectedMethod || !validateForm()) return;

    setIsSubmitting(true);
    try {
      const updateData: UpdatePaymentMethodData = {
        name: formData.name.trim(),
        is_active: formData.is_active,
      };

      const res = await window.api.paymentMethods.update(
        selectedMethod.id,
        updateData
      );

      if (res.success && res.data) {
        setPaymentMethods((prev) =>
          prev.map((m) => (m.id === selectedMethod.id ? res.data! : m))
        );
        setIsEditDialogOpen(false);
        resetForm();
        toast.success("Metode pembayaran berhasil diperbarui", {
          description: `Data ${res.data.name} telah diperbarui`,
        });
      } else {
        toast.error("Gagal memperbarui metode pembayaran", {
          description: res.error,
        });
      }
    } catch (error) {
      toast.error("Gagal memperbarui metode pembayaran", {
        description: "Terjadi kesalahan saat menyimpan data",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete payment method
  const handleDeletePaymentMethod = async () => {
    if (!selectedMethod) return;

    setIsSubmitting(true);
    try {
      const res = await window.api.paymentMethods.delete(selectedMethod.id);

      if (res.success) {
        setPaymentMethods((prev) =>
          prev.filter((m) => m.id !== selectedMethod.id)
        );
        setIsDeleteDialogOpen(false);
        setSelectedMethod(null);
        toast.success("Metode pembayaran berhasil dihapus", {
          description: `${selectedMethod.name} telah dihapus`,
        });
      } else {
        toast.error("Gagal menghapus metode pembayaran", {
          description: res.error,
        });
      }
    } catch (error) {
      toast.error("Gagal menghapus metode pembayaran", {
        description: "Terjadi kesalahan saat menghapus data",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle toggle status
  const handleToggleStatus = async (method: PaymentMethodData) => {
    try {
      const res = await window.api.paymentMethods.update(method.id, {
        is_active: !method.is_active,
      });

      if (res.success && res.data) {
        setPaymentMethods((prev) =>
          prev.map((m) => (m.id === method.id ? res.data! : m))
        );
        const statusText = res.data.is_active ? "aktif" : "nonaktif";
        toast.success("Status metode pembayaran diperbarui", {
          description: `${method.name} sekarang ${statusText}`,
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
  const openEditDialog = (method: PaymentMethodData) => {
    setSelectedMethod(method);
    setFormData({
      name: method.name,
      is_active: method.is_active,
    });
    setFormErrors({});
    setIsEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (method: PaymentMethodData) => {
    setSelectedMethod(method);
    setIsDeleteDialogOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData(initialFormData);
    setFormErrors({});
    setSelectedMethod(null);
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

  // Render form fields - inlined to prevent re-render issues
  const renderFormFields = () => (
    <div className="grid gap-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nama Metode Pembayaran</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="Masukkan nama metode pembayaran"
          className={formErrors.name ? "border-destructive" : ""}
        />
        {formErrors.name && (
          <p className="text-sm text-destructive">{formErrors.name}</p>
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
            <CreditCard className="h-8 w-8" />
            Manajemen Metode Pembayaran
          </h1>
          <p className="text-muted-foreground">Kelola data metode pembayaran</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchData} variant="secondary" disabled={isLoading}>
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Metode Pembayaran
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Metode Pembayaran
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMethods}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Metode Pembayaran Aktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeMethods}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Metode Pembayaran Nonaktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {inactiveMethods}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Metode Pembayaran</CardTitle>
          <CardDescription>
            Semua metode pembayaran yang terdaftar dalam sistem
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari metode pembayaran..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Nonaktif</SelectItem>
              </SelectContent>
            </Select>
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
                    <TableHead>Nama Metode Pembayaran</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal Dibuat</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPaymentMethods.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-8 text-muted-foreground"
                      >
                        {searchQuery || statusFilter
                          ? "Tidak ada metode pembayaran yang cocok dengan pencarian"
                          : "Belum ada metode pembayaran"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPaymentMethods.map((method) => (
                      <TableRow key={method.id}>
                        <TableCell className="font-medium">
                          {method.name}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                              method.is_active
                            )}`}
                          >
                            {method.is_active ? "Aktif" : "Nonaktif"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(method.created_at).toLocaleDateString(
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
                                onClick={() => openEditDialog(method)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(method)}
                              >
                                <Power className="h-4 w-4 mr-2" />
                                {method.is_active ? "Nonaktifkan" : "Aktifkan"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => openDeleteDialog(method)}
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

      {/* Create Payment Method Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Tambah Metode Pembayaran Baru</DialogTitle>
            <DialogDescription>
              Isi form berikut untuk menambahkan metode pembayaran baru ke
              sistem.
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
            <Button onClick={handleCreatePaymentMethod} disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Method Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Metode Pembayaran</DialogTitle>
            <DialogDescription>
              Perbarui informasi metode pembayaran {selectedMethod?.name}.
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
            <Button onClick={handleUpdatePaymentMethod} disabled={isSubmitting}>
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
            <AlertDialogTitle>Hapus Metode Pembayaran?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda yakin ingin menghapus metode pembayaran{" "}
              <strong>{selectedMethod?.name}</strong>? Tindakan ini tidak dapat
              dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePaymentMethod}
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
