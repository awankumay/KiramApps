import { useState, useEffect, useCallback } from "react";
import {
  Truck,
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
  LoaderData,
  CreateLoaderData,
  UpdateLoaderData,
} from "@Shared/Types/Electron";

// Form data interface
interface LoaderFormData {
  name: string;
  is_active: boolean;
}

const initialFormData: LoaderFormData = {
  name: "",
  is_active: true,
};

export function LoadersListPage() {
  // State
  const [loaders, setLoaders] = useState<LoaderData[]>([]);
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
  const [selectedLoader, setSelectedLoader] = useState<LoaderData | null>(null);
  const [formData, setFormData] = useState<LoaderFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof LoaderFormData, string>>
  >({});

  // Fetch loaders on mount
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await window.api.loaders.getAll();

      console.log("Loaders API response:", res);

      if (res.success && res.data) {
        const loaders = res.data.loaders || [];
        console.log("Setting loaders:", loaders);
        setLoaders(loaders);
      } else {
        toast.error("Gagal memuat data loader", {
          description: res.error,
        });
      }
    } catch (error) {
      console.error("Error fetching loaders:", error);
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

  // Filter loaders based on search and status
  const filteredLoaders =
    loaders?.filter(
      (loader) =>
        loader &&
        loader.name &&
        loader.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (statusFilter === undefined ||
          (statusFilter === "active" && loader.is_active) ||
          (statusFilter === "inactive" && !loader.is_active))
    ) || [];

  // Stats
  const totalLoaders = loaders.length;
  const activeLoaders = loaders.filter((l) => l.is_active).length;
  const inactiveLoaders = loaders.filter((l) => !l.is_active).length;

  // Form validation
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof LoaderFormData, string>> = {};

    if (!formData.name.trim()) {
      errors.name = "Nama loader wajib diisi";
    } else if (formData.name.length < 2) {
      errors.name = "Nama loader minimal 2 karakter";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle create loader
  const handleCreateLoader = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const createData: CreateLoaderData = {
        name: formData.name.trim(),
        is_active: formData.is_active,
      };

      const res = await window.api.loaders.create(createData);

      if (res.success && res.data) {
        setLoaders((prev) => [...prev, res.data!]);
        setIsCreateDialogOpen(false);
        resetForm();
        toast.success("Loader berhasil ditambahkan", {
          description: `${res.data.name} telah ditambahkan`,
        });
      } else {
        toast.error("Gagal menambahkan loader", {
          description: res.error,
        });
      }
    } catch (error) {
      toast.error("Gagal menambahkan loader", {
        description: "Terjadi kesalahan saat menyimpan data",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update loader
  const handleUpdateLoader = async () => {
    if (!selectedLoader || !validateForm()) return;

    setIsSubmitting(true);
    try {
      const updateData: UpdateLoaderData = {
        name: formData.name.trim(),
        is_active: formData.is_active,
      };

      const res = await window.api.loaders.update(
        selectedLoader.id,
        updateData
      );

      if (res.success && res.data) {
        setLoaders((prev) =>
          prev.map((l) => (l.id === selectedLoader.id ? res.data! : l))
        );
        setIsEditDialogOpen(false);
        resetForm();
        toast.success("Loader berhasil diperbarui", {
          description: `Data ${res.data.name} telah diperbarui`,
        });
      } else {
        toast.error("Gagal memperbarui loader", {
          description: res.error,
        });
      }
    } catch (error) {
      toast.error("Gagal memperbarui loader", {
        description: "Terjadi kesalahan saat menyimpan data",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete loader
  const handleDeleteLoader = async () => {
    if (!selectedLoader) return;

    setIsSubmitting(true);
    try {
      const res = await window.api.loaders.delete(selectedLoader.id);

      if (res.success) {
        setLoaders((prev) => prev.filter((l) => l.id !== selectedLoader.id));
        setIsDeleteDialogOpen(false);
        setSelectedLoader(null);
        toast.success("Loader berhasil dihapus", {
          description: `${selectedLoader.name} telah dihapus`,
        });
      } else {
        toast.error("Gagal menghapus loader", {
          description: res.error,
        });
      }
    } catch (error) {
      toast.error("Gagal menghapus loader", {
        description: "Terjadi kesalahan saat menghapus data",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle toggle status
  const handleToggleStatus = async (loader: LoaderData) => {
    try {
      const res = await window.api.loaders.update(loader.id, {
        is_active: !loader.is_active,
      });

      if (res.success && res.data) {
        setLoaders((prev) =>
          prev.map((l) => (l.id === loader.id ? res.data! : l))
        );
        const statusText = res.data.is_active ? "aktif" : "nonaktif";
        toast.success("Status loader diperbarui", {
          description: `${loader.name} sekarang ${statusText}`,
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
  const openEditDialog = (loader: LoaderData) => {
    setSelectedLoader(loader);
    setFormData({
      name: loader.name,
      is_active: loader.is_active,
    });
    setFormErrors({});
    setIsEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (loader: LoaderData) => {
    setSelectedLoader(loader);
    setIsDeleteDialogOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData(initialFormData);
    setFormErrors({});
    setSelectedLoader(null);
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
        <Label htmlFor="name">Nama Loader</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="Masukkan nama loader"
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
            <Truck className="h-8 w-8" />
            Manajemen Loader
          </h1>
          <p className="text-muted-foreground">Kelola data loader</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchData} variant="secondary" disabled={isLoading}>
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Loader
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Loader</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLoaders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Loader Aktif</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeLoaders}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Loader Nonaktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {inactiveLoaders}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loaders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Loader</CardTitle>
          <CardDescription>
            Semua loader yang terdaftar dalam sistem
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari loader..."
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
                    <TableHead>Nama Loader</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal Dibuat</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLoaders.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-8 text-muted-foreground"
                      >
                        {searchQuery || statusFilter
                          ? "Tidak ada loader yang cocok dengan pencarian"
                          : "Belum ada loader"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLoaders.map((loader) => (
                      <TableRow key={loader.id}>
                        <TableCell className="font-medium">
                          {loader.name}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                              loader.is_active
                            )}`}
                          >
                            {loader.is_active ? "Aktif" : "Nonaktif"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(loader.created_at).toLocaleDateString(
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
                                onClick={() => openEditDialog(loader)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(loader)}
                              >
                                <Power className="h-4 w-4 mr-2" />
                                {loader.is_active ? "Nonaktifkan" : "Aktifkan"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => openDeleteDialog(loader)}
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

      {/* Create Loader Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Tambah Loader Baru</DialogTitle>
            <DialogDescription>
              Isi form berikut untuk menambahkan loader baru ke sistem.
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
            <Button onClick={handleCreateLoader} disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Loader Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Loader</DialogTitle>
            <DialogDescription>
              Perbarui informasi loader {selectedLoader?.name}.
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
            <Button onClick={handleUpdateLoader} disabled={isSubmitting}>
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
            <AlertDialogTitle>Hapus Loader?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda yakin ingin menghapus loader{" "}
              <strong>{selectedLoader?.name}</strong>? Tindakan ini tidak dapat
              dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLoader}
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
