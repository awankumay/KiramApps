import { useState, useEffect } from "react";
import {
  Package,
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash,
  Power,
  Loader2,
  RefreshCw,
  History,
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
import { useAuth } from "@Features/Auth/Contexts/AuthContext";
import type {
  ItemData,
  CreateItemData,
  UpdateItemData,
  PriceHistoryData,
} from "@Shared/Types/Electron";

// Available unit options
const UNIT_OPTIONS = [
  { value: "pcs", label: "Pcs (Pieces)" },
  { value: "liter", label: "Liter" },
  { value: "kg", label: "Kg (Kilogram)" },
  { value: "m³", label: "m³ (Meter Kubik)" },
];

// Form data interface
interface ItemFormData {
  name: string;
  unit: string;
  price: number;
  isActive: boolean;
}

const initialFormData: ItemFormData = {
  name: "",
  unit: "m³",
  price: 0,
  isActive: true,
};

export function ItemsPage() {
  const { user } = useAuth();

  // State
  const [items, setItems] = useState<ItemData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemData | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryData[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [formData, setFormData] = useState<ItemFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof ItemFormData, string>>
  >({});

  // Fetch items on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await window.api.items.getAll();

      if (res.success && res.data) {
        setItems(res.data);
      } else {
        toast.error("Gagal memuat data item", {
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
  };

  const fetchPriceHistory = async (itemId: number) => {
    setIsLoadingHistory(true);
    try {
      const res = await window.api.items.getPriceHistory(itemId);

      if (res.success && res.data) {
        setPriceHistory(res.data);
      } else {
        toast.error("Gagal memuat riwayat harga", {
          description: res.error,
        });
      }
    } catch (error) {
      toast.error("Gagal memuat riwayat harga", {
        description: "Terjadi kesalahan",
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Filter items based on search
  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.unit.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const totalItems = items.length;
  const activeItems = items.filter((i) => i.isActive).length;
  const inactiveItems = items.filter((i) => !i.isActive).length;

  // Form validation
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof ItemFormData, string>> = {};

    if (!formData.name.trim()) {
      errors.name = "Nama item wajib diisi";
    } else if (formData.name.length < 2) {
      errors.name = "Nama item minimal 2 karakter";
    }

    if (!formData.unit) {
      errors.unit = "Satuan wajib dipilih";
    }

    if (formData.price <= 0) {
      errors.price = "Harga harus lebih dari 0";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle create item
  const handleCreateItem = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const createData: CreateItemData = {
        name: formData.name.trim(),
        unit: formData.unit,
        price: formData.price,
        isActive: formData.isActive,
      };

      const res = await window.api.items.create(createData);

      if (res.success && res.data) {
        setItems((prev) => [...prev, res.data!]);
        setIsCreateDialogOpen(false);
        resetForm();
        toast.success("Item berhasil ditambahkan", {
          description: `${res.data.name} telah ditambahkan`,
        });
      } else {
        toast.error("Gagal menambahkan item", {
          description: res.error,
        });
      }
    } catch (error) {
      toast.error("Gagal menambahkan item", {
        description: "Terjadi kesalahan saat menyimpan data",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update item
  const handleUpdateItem = async () => {
    if (!selectedItem || !validateForm()) return;

    setIsSubmitting(true);
    try {
      const updateData: UpdateItemData = {
        name: formData.name.trim(),
        unit: formData.unit,
        price: formData.price,
        isActive: formData.isActive,
      };

      const res = await window.api.items.update(
        selectedItem.id,
        updateData,
        user?.id
      );

      if (res.success && res.data) {
        setItems((prev) =>
          prev.map((i) => (i.id === selectedItem.id ? res.data! : i))
        );
        setIsEditDialogOpen(false);
        resetForm();
        toast.success("Item berhasil diperbarui", {
          description: `Data ${res.data.name} telah diperbarui`,
        });
      } else {
        toast.error("Gagal memperbarui item", {
          description: res.error,
        });
      }
    } catch (error) {
      toast.error("Gagal memperbarui item", {
        description: "Terjadi kesalahan saat menyimpan data",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete item
  const handleDeleteItem = async () => {
    if (!selectedItem) return;

    setIsSubmitting(true);
    try {
      const res = await window.api.items.delete(selectedItem.id);

      if (res.success) {
        setItems((prev) => prev.filter((i) => i.id !== selectedItem.id));
        setIsDeleteDialogOpen(false);
        setSelectedItem(null);
        toast.success("Item berhasil dihapus", {
          description: `${selectedItem.name} telah dihapus`,
        });
      } else {
        toast.error("Gagal menghapus item", {
          description: res.error,
        });
      }
    } catch (error) {
      toast.error("Gagal menghapus item", {
        description: "Terjadi kesalahan saat menghapus data",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle toggle status
  const handleToggleStatus = async (item: ItemData) => {
    try {
      const res = await window.api.items.toggleStatus(item.id);

      if (res.success && res.data) {
        setItems((prev) => prev.map((i) => (i.id === item.id ? res.data! : i)));
        const statusText = res.data.isActive ? "aktif" : "nonaktif";
        toast.success("Status item diperbarui", {
          description: `${item.name} sekarang ${statusText}`,
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
  const openEditDialog = (item: ItemData) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      unit: item.unit,
      price: item.price,
      isActive: item.isActive,
    });
    setFormErrors({});
    setIsEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (item: ItemData) => {
    setSelectedItem(item);
    setIsDeleteDialogOpen(true);
  };

  // Open price history dialog
  const openHistoryDialog = (item: ItemData) => {
    setSelectedItem(item);
    setIsHistoryDialogOpen(true);
    fetchPriceHistory(item.id);
  };

  // Reset form
  const resetForm = () => {
    setFormData(initialFormData);
    setFormErrors({});
    setSelectedItem(null);
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
        <Label htmlFor="name">Nama Item</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="Masukkan nama item"
          className={formErrors.name ? "border-destructive" : ""}
        />
        {formErrors.name && (
          <p className="text-sm text-destructive">{formErrors.name}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="unit">Satuan</Label>
        <Select
          value={formData.unit}
          onValueChange={(value) =>
            setFormData((prev) => ({ ...prev, unit: value }))
          }
        >
          <SelectTrigger
            className={formErrors.unit ? "border-destructive" : ""}
          >
            <SelectValue placeholder="Pilih satuan" />
          </SelectTrigger>
          <SelectContent>
            {UNIT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {formErrors.unit && (
          <p className="text-sm text-destructive">{formErrors.unit}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="price">Harga (Rp)</Label>
        <Input
          id="price"
          name="price"
          type="number"
          min="0"
          step="1000"
          value={formData.price}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, price: Number(e.target.value) }))
          }
          placeholder="Masukkan harga"
          className={formErrors.price ? "border-destructive" : ""}
        />
        {formErrors.price && (
          <p className="text-sm text-destructive">{formErrors.price}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={formData.isActive ? "active" : "inactive"}
          onValueChange={(value) =>
            setFormData((prev) => ({
              ...prev,
              isActive: value === "active",
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
            <Package className="h-8 w-8" />
            Manajemen Item
          </h1>
          <p className="text-muted-foreground">
            Kelola item, satuan, dan harga produk
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
            Tambah Item
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Item</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Item Aktif</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeItems}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Item Nonaktif</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {inactiveItems}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Item</CardTitle>
          <CardDescription>
            Semua item yang terdaftar dalam sistem
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari item..."
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
                    <TableHead>Nama Item</TableHead>
                    <TableHead>Satuan</TableHead>
                    <TableHead>Harga</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground"
                      >
                        {searchQuery
                          ? "Tidak ada item yang cocok dengan pencarian"
                          : "Belum ada item"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.name}
                        </TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>Rp {item.price.toLocaleString()}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                              item.isActive
                            )}`}
                          >
                            {item.isActive ? "Aktif" : "Nonaktif"}
                          </span>
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
                                onClick={() => openEditDialog(item)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openHistoryDialog(item)}
                              >
                                <History className="h-4 w-4 mr-2" />
                                Riwayat Harga
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(item)}
                              >
                                <Power className="h-4 w-4 mr-2" />
                                {item.isActive ? "Nonaktifkan" : "Aktifkan"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => openDeleteDialog(item)}
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

      {/* Create Item Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Tambah Item Baru</DialogTitle>
            <DialogDescription>
              Isi form berikut untuk menambahkan item baru ke sistem.
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
            <Button onClick={handleCreateItem} disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>
              Perbarui informasi item {selectedItem?.name}.
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
            <Button onClick={handleUpdateItem} disabled={isSubmitting}>
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
            <AlertDialogTitle>Hapus Item?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda yakin ingin menghapus item{" "}
              <strong>{selectedItem?.name}</strong>? Tindakan ini tidak dapat
              dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
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

      {/* Price History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Riwayat Harga</DialogTitle>
            <DialogDescription>
              Riwayat perubahan harga untuk item{" "}
              <strong>{selectedItem?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : priceHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Belum ada riwayat perubahan harga
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Harga Lama</TableHead>
                    <TableHead>Harga Baru</TableHead>
                    <TableHead>Diubah Oleh</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceHistory.map((history) => (
                    <TableRow key={history.id}>
                      <TableCell>
                        {new Date(history.changedAt).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </TableCell>
                      <TableCell>
                        {history.oldPrice !== null
                          ? `Rp ${history.oldPrice.toLocaleString()}`
                          : "-"}
                      </TableCell>
                      <TableCell className="font-medium">
                        Rp {history.newPrice.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {history.changedBy ? `User #${history.changedBy}` : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsHistoryDialogOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
