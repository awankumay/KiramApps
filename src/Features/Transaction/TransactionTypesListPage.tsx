import { useState, useEffect, useCallback } from "react";
import {
  Layers,
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
  TransactionTypeData,
  CreateTransactionTypeData,
  UpdateTransactionTypeData,
} from "@Shared/Types/Electron";

// Form data interface
interface TransactionTypeFormData {
  name: string;
  is_active: boolean;
}

const initialFormData: TransactionTypeFormData = {
  name: "",
  is_active: true,
};

export function TransactionTypesListPage() {
  // State
  const [transactionTypes, setTransactionTypes] = useState<
    TransactionTypeData[]
  >([]);
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
  const [selectedType, setSelectedType] = useState<TransactionTypeData | null>(
    null
  );
  const [formData, setFormData] =
    useState<TransactionTypeFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof TransactionTypeFormData, string>>
  >({});

  // Fetch transaction types on mount
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await window.api.transactionTypes.getAll();

      if (res.success && res.data) {
        setTransactionTypes(res.data);
      } else {
        toast.error("Gagal memuat data tipe transaksi", {
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter transaction types based on search and status
  const filteredTransactionTypes =
    transactionTypes?.filter(
      (type) =>
        type &&
        type.name &&
        type.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (statusFilter === undefined ||
          (statusFilter === "active" && type.is_active) ||
          (statusFilter === "inactive" && !type.is_active))
    ) || [];

  // Stats
  const totalTypes = transactionTypes.length;
  const activeTypes = transactionTypes.filter((t) => t.is_active).length;
  const inactiveTypes = transactionTypes.filter((t) => !t.is_active).length;

  // Form validation
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof TransactionTypeFormData, string>> = {};

    if (!formData.name.trim()) {
      errors.name = "Nama tipe transaksi wajib diisi";
    } else if (formData.name.length < 2) {
      errors.name = "Nama tipe transaksi minimal 2 karakter";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle create transaction type
  const handleCreateTransactionType = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const createData: CreateTransactionTypeData = {
        name: formData.name.trim(),
        is_active: formData.is_active,
      };

      const res = await window.api.transactionTypes.create(createData);

      if (res.success && res.data) {
        setTransactionTypes((prev) => [...prev, res.data!]);
        setIsCreateDialogOpen(false);
        resetForm();
        toast.success("Tipe transaksi berhasil ditambahkan", {
          description: `${res.data.name} telah ditambahkan`,
        });
      } else {
        toast.error("Gagal menambahkan tipe transaksi", {
          description: res.error,
        });
      }
    } catch (error) {
      toast.error("Gagal menambahkan tipe transaksi", {
        description: "Terjadi kesalahan saat menyimpan data",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update transaction type
  const handleUpdateTransactionType = async () => {
    if (!selectedType || !validateForm()) return;

    setIsSubmitting(true);
    try {
      const updateData: UpdateTransactionTypeData = {
        name: formData.name.trim(),
        is_active: formData.is_active,
      };

      const res = await window.api.transactionTypes.update(
        selectedType.id,
        updateData
      );

      if (res.success && res.data) {
        setTransactionTypes((prev) =>
          prev.map((t) => (t.id === selectedType.id ? res.data! : t))
        );
        setIsEditDialogOpen(false);
        resetForm();
        toast.success("Tipe transaksi berhasil diperbarui", {
          description: `Data ${res.data.name} telah diperbarui`,
        });
      } else {
        toast.error("Gagal memperbarui tipe transaksi", {
          description: res.error,
        });
      }
    } catch (error) {
      toast.error("Gagal memperbarui tipe transaksi", {
        description: "Terjadi kesalahan saat menyimpan data",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete transaction type
  const handleDeleteTransactionType = async () => {
    if (!selectedType) return;

    setIsSubmitting(true);
    try {
      const res = await window.api.transactionTypes.delete(selectedType.id);

      if (res.success) {
        setTransactionTypes((prev) =>
          prev.filter((t) => t.id !== selectedType.id)
        );
        setIsDeleteDialogOpen(false);
        setSelectedType(null);
        toast.success("Tipe transaksi berhasil dihapus", {
          description: `${selectedType.name} telah dihapus`,
        });
      } else {
        toast.error("Gagal menghapus tipe transaksi", {
          description: res.error,
        });
      }
    } catch (error) {
      toast.error("Gagal menghapus tipe transaksi", {
        description: "Terjadi kesalahan saat menghapus data",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle toggle status
  const handleToggleStatus = async (type: TransactionTypeData) => {
    try {
      const res = await window.api.transactionTypes.update(type.id, {
        is_active: !type.is_active,
      });

      if (res.success && res.data) {
        setTransactionTypes((prev) =>
          prev.map((t) => (t.id === type.id ? res.data! : t))
        );
        const statusText = res.data.is_active ? "aktif" : "nonaktif";
        toast.success("Status tipe transaksi diperbarui", {
          description: `${type.name} sekarang ${statusText}`,
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
  const openEditDialog = (type: TransactionTypeData) => {
    setSelectedType(type);
    setFormData({
      name: type.name,
      is_active: type.is_active,
    });
    setFormErrors({});
    setIsEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (type: TransactionTypeData) => {
    setSelectedType(type);
    setIsDeleteDialogOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData(initialFormData);
    setFormErrors({});
    setSelectedType(null);
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
        <Label htmlFor="name">Nama Tipe Transaksi</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="Masukkan nama tipe transaksi"
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
            <Layers className="h-8 w-8" />
            Manajemen Tipe Transaksi
          </h1>
          <p className="text-muted-foreground">Kelola data tipe transaksi</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchData} variant="secondary" disabled={isLoading}>
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Tipe Transaksi
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Tipe Transaksi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTypes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Tipe Transaksi Aktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeTypes}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Tipe Transaksi Nonaktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {inactiveTypes}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Types Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Tipe Transaksi</CardTitle>
          <CardDescription>
            Semua tipe transaksi yang terdaftar dalam sistem
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari tipe transaksi..."
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
                    <TableHead>Nama Tipe Transaksi</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal Dibuat</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactionTypes.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-8 text-muted-foreground"
                      >
                        {searchQuery || statusFilter
                          ? "Tidak ada tipe transaksi yang cocok dengan pencarian"
                          : "Belum ada tipe transaksi"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactionTypes.map((type) => (
                      <TableRow key={type.id}>
                        <TableCell className="font-medium">
                          {type.name}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                              type.is_active
                            )}`}
                          >
                            {type.is_active ? "Aktif" : "Nonaktif"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(type.created_at).toLocaleDateString(
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
                                onClick={() => openEditDialog(type)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(type)}
                              >
                                <Power className="h-4 w-4 mr-2" />
                                {type.is_active ? "Nonaktifkan" : "Aktifkan"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => openDeleteDialog(type)}
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

      {/* Create Transaction Type Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Tambah Tipe Transaksi Baru</DialogTitle>
            <DialogDescription>
              Isi form berikut untuk menambahkan tipe transaksi baru ke sistem.
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
            <Button
              onClick={handleCreateTransactionType}
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Type Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Tipe Transaksi</DialogTitle>
            <DialogDescription>
              Perbarui informasi tipe transaksi {selectedType?.name}.
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
            <Button
              onClick={handleUpdateTransactionType}
              disabled={isSubmitting}
            >
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
            <AlertDialogTitle>Hapus Tipe Transaksi?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda yakin ingin menghapus tipe transaksi{" "}
              <strong>{selectedType?.name}</strong>? Tindakan ini tidak dapat
              dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTransactionType}
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
