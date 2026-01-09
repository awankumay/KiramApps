import { useState, useEffect, useCallback } from "react";
import {
  Users,
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
import { CustomerCategory } from "@Shared/Types/Customer";
import type {
  CustomerData,
  CreateCustomerData,
  UpdateCustomerData,
} from "@Shared/Types/Electron";

// Category options
const CATEGORY_OPTIONS = [
  { value: CustomerCategory.PERSONAL, label: "Personal" },
  { value: CustomerCategory.COMPANY, label: "Company" },
];

// Form data interface
interface CustomerFormData {
  name: string;
  category: CustomerCategory;
  code: string;
  is_active: boolean;
}

const initialFormData: CustomerFormData = {
  name: "",
  category: CustomerCategory.PERSONAL,
  code: "",
  is_active: true,
};

export function CustomerListPage() {
  // State
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(
    undefined
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(
    null
  );
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof CustomerFormData, string>>
  >({});

  // Fetch customers on mount
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await window.api.customers.getAll({
        name: searchQuery || undefined,
        category: categoryFilter,
      });

      if (res.success && res.data) {
        setCustomers(res.data.customers);
      } else {
        toast.error("Gagal memuat data customer", {
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
  }, [searchQuery, categoryFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter customers based on search and category
  const filteredCustomers =
    customers?.filter(
      (customer) =>
        customer &&
        customer.name &&
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (!categoryFilter || customer.category === categoryFilter)
    ) || [];

  // Stats
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.is_active).length;
  const inactiveCustomers = customers.filter((c) => !c.is_active).length;

  // Form validation
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof CustomerFormData, string>> = {};

    if (!formData.name.trim()) {
      errors.name = "Nama customer wajib diisi";
    } else if (formData.name.length < 2) {
      errors.name = "Nama customer minimal 2 karakter";
    }

    if (!formData.category) {
      errors.category = "Kategori wajib dipilih";
    }

    if (!formData.code.trim()) {
      errors.code = "Code wajib diisi";
    } else if (!/^[A-Z0-9_-]+$/.test(formData.code)) {
      errors.code =
        "Code hanya boleh mengandung huruf kapital, angka, underscore, dan dash";
    } else if (formData.code.length < 2) {
      errors.code = "Code minimal 2 karakter";
    } else if (formData.code.length > 50) {
      errors.code = "Code maksimal 50 karakter";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle create customer
  const handleCreateCustomer = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const createData: CreateCustomerData = {
        name: formData.name.trim(),
        category: formData.category,
        code: formData.code.trim().toUpperCase(),
      };

      const res = await window.api.customers.create(createData);

      if (res.success && res.data) {
        setCustomers((prev) => [...prev, res.data!]);
        setIsCreateDialogOpen(false);
        resetForm();
        toast.success("Customer berhasil ditambahkan", {
          description: `${res.data.name} telah ditambahkan`,
        });
      } else {
        toast.error("Gagal menambahkan customer", {
          description: res.error,
        });
      }
    } catch (error) {
      toast.error("Gagal menambahkan customer", {
        description: "Terjadi kesalahan saat menyimpan data",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update customer
  const handleUpdateCustomer = async () => {
    if (!selectedCustomer || !validateForm()) return;

    setIsSubmitting(true);
    try {
      const updateData: UpdateCustomerData = {
        name: formData.name.trim(),
        category: formData.category,
        code: formData.code.trim().toUpperCase(),
        is_active: formData.is_active,
      };

      const res = await window.api.customers.update(
        selectedCustomer.id,
        updateData
      );

      if (res.success && res.data) {
        setCustomers((prev) =>
          prev.map((c) => (c.id === selectedCustomer.id ? res.data! : c))
        );
        setIsEditDialogOpen(false);
        resetForm();
        toast.success("Customer berhasil diperbarui", {
          description: `Data ${res.data.name} telah diperbarui`,
        });
      } else {
        toast.error("Gagal memperbarui customer", {
          description: res.error,
        });
      }
    } catch (error) {
      toast.error("Gagal memperbarui customer", {
        description: "Terjadi kesalahan saat menyimpan data",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete customer
  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;

    setIsSubmitting(true);
    try {
      const res = await window.api.customers.delete(selectedCustomer.id);

      if (res.success) {
        setCustomers((prev) =>
          prev.filter((c) => c.id !== selectedCustomer.id)
        );
        setIsDeleteDialogOpen(false);
        setSelectedCustomer(null);
        toast.success("Customer berhasil dihapus", {
          description: `${selectedCustomer.name} telah dihapus`,
        });
      } else {
        toast.error("Gagal menghapus customer", {
          description: res.error,
        });
      }
    } catch (error) {
      toast.error("Gagal menghapus customer", {
        description: "Terjadi kesalahan saat menghapus data",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle toggle status
  const handleToggleStatus = async (customer: CustomerData) => {
    try {
      const res = await window.api.customers.update(customer.id, {
        is_active: !customer.is_active,
      });

      if (res.success && res.data) {
        setCustomers((prev) =>
          prev.map((c) => (c.id === customer.id ? res.data! : c))
        );
        const statusText = res.data.is_active ? "aktif" : "nonaktif";
        toast.success("Status customer diperbarui", {
          description: `${customer.name} sekarang ${statusText}`,
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
  const openEditDialog = (customer: CustomerData) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      category: customer.category as CustomerCategory,
      code: customer.code || "",
      is_active: customer.is_active,
    });
    setFormErrors({});
    setIsEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (customer: CustomerData) => {
    setSelectedCustomer(customer);
    setIsDeleteDialogOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData(initialFormData);
    setFormErrors({});
    setSelectedCustomer(null);
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

  const getCategoryBadgeColor = (category: string) => {
    return category === CustomerCategory.COMPANY
      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
  };

  // Render form fields - inlined to prevent re-render issues
  const renderFormFields = () => (
    <div className="grid gap-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="code">Code</Label>
        <Input
          id="code"
          name="code"
          value={formData.code}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              code: e.target.value.toUpperCase(),
            }))
          }
          placeholder="Contoh: CUST001"
          className={formErrors.code ? "border-destructive" : ""}
        />
        <p className="text-xs text-muted-foreground">
          Hanya huruf kapital, angka, underscore (_), dan dash (-)
        </p>
        {formErrors.code && (
          <p className="text-sm text-destructive">{formErrors.code}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Nama Customer</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="Masukkan nama customer"
          className={formErrors.name ? "border-destructive" : ""}
        />
        {formErrors.name && (
          <p className="text-sm text-destructive">{formErrors.name}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Kategori</Label>
        <Select
          value={formData.category}
          onValueChange={(value) =>
            setFormData((prev) => ({
              ...prev,
              category: value as CustomerCategory,
            }))
          }
        >
          <SelectTrigger
            className={formErrors.category ? "border-destructive" : ""}
          >
            <SelectValue placeholder="Pilih kategori" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {formErrors.category && (
          <p className="text-sm text-destructive">{formErrors.category}</p>
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
            <Users className="h-8 w-8" />
            Manajemen Customer
          </h1>
          <p className="text-muted-foreground">
            Kelola data customer dan kategori
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
            Tambah Customer
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Customer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Customer Aktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeCustomers}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Customer Nonaktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {inactiveCustomers}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Customer</CardTitle>
          <CardDescription>
            Semua customer yang terdaftar dalam sistem
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={categoryFilter}
              onValueChange={(value) =>
                setCategoryFilter(
                  value === "all" ? undefined : (value as CustomerCategory)
                )
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Semua Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
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
                    <TableHead>Code</TableHead>
                    <TableHead>Nama Customer</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal Dibuat</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        {searchQuery || categoryFilter
                          ? "Tidak ada customer yang cocok dengan pencarian"
                          : "Belum ada customer"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <code className="px-2 py-1 bg-muted rounded text-sm">
                            {customer.code}
                          </code>
                        </TableCell>
                        <TableCell className="font-medium">
                          {customer.name}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryBadgeColor(
                              customer.category
                            )}`}
                          >
                            {customer.category}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                              customer.is_active
                            )}`}
                          >
                            {customer.is_active ? "Aktif" : "Nonaktif"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(customer.created_at).toLocaleDateString(
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
                                onClick={() => openEditDialog(customer)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(customer)}
                              >
                                <Power className="h-4 w-4 mr-2" />
                                {customer.is_active
                                  ? "Nonaktifkan"
                                  : "Aktifkan"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => openDeleteDialog(customer)}
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

      {/* Create Customer Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Tambah Customer Baru</DialogTitle>
            <DialogDescription>
              Isi form berikut untuk menambahkan customer baru ke sistem.
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
            <Button onClick={handleCreateCustomer} disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Perbarui informasi customer {selectedCustomer?.name}.
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
            <Button onClick={handleUpdateCustomer} disabled={isSubmitting}>
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
            <AlertDialogTitle>Hapus Customer?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda yakin ingin menghapus customer{" "}
              <strong>{selectedCustomer?.name}</strong>? Tindakan ini tidak
              dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCustomer}
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
