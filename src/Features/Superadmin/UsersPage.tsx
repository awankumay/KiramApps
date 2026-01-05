import { useState, useEffect } from "react";
import {
  Users,
  Search,
  Plus,
  MoreHorizontal,
  Shield,
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
import { Checkbox } from "@Shared/Components/UI/Checkbox";
import { toast } from "sonner";
import type {
  UserData,
  RoleData,
  CreateUserData,
  UpdateUserData,
} from "@Shared/Types/Electron";

// Form data interface
interface UserFormData {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
  status: string;
  roles: string[];
}

const initialFormData: UserFormData = {
  username: "",
  email: "",
  firstName: "",
  lastName: "",
  password: "",
  confirmPassword: "",
  status: "active",
  roles: [],
};

export function UsersPage() {
  // State
  const [users, setUsers] = useState<UserData[]>([]);
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof UserFormData, string>>
  >({});

  // Fetch users and roles on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        window.api.users.getAll(),
        window.api.rbac.getAllRoles(),
      ]);

      if (usersRes.success && usersRes.data) {
        setUsers(usersRes.data);
      } else {
        toast.error("Gagal memuat data pengguna", {
          description: usersRes.error,
        });
      }

      if (rolesRes.success && rolesRes.data) {
        setRoles(rolesRes.data);
      }
    } catch (error) {
      toast.error("Gagal memuat data", {
        description: "Terjadi kesalahan saat memuat data",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter users based on search
  const filteredUsers = users.filter(
    (user) =>
      user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "active").length;
  const inactiveUsers = users.filter((u) => u.status === "inactive").length;

  // Form validation
  const validateForm = (isCreate: boolean = false): boolean => {
    const errors: Partial<Record<keyof UserFormData, string>> = {};

    if (!formData.username.trim()) {
      errors.username = "Username wajib diisi";
    } else if (formData.username.length < 3) {
      errors.username = "Username minimal 3 karakter";
    }

    if (!formData.email.trim()) {
      errors.email = "Email wajib diisi";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Format email tidak valid";
    }

    if (!formData.firstName.trim()) {
      errors.firstName = "Nama depan wajib diisi";
    }

    if (!formData.lastName.trim()) {
      errors.lastName = "Nama belakang wajib diisi";
    }

    // Password validation only for create
    if (isCreate) {
      if (!formData.password) {
        errors.password = "Password wajib diisi";
      } else if (formData.password.length < 6) {
        errors.password = "Password minimal 6 karakter";
      }

      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = "Konfirmasi password tidak cocok";
      }
    }

    if (formData.roles.length === 0) {
      errors.roles = "Pilih minimal satu role";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle create user
  const handleCreateUser = async () => {
    if (!validateForm(true)) return;

    setIsSubmitting(true);
    try {
      const createData: CreateUserData = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        password: formData.password,
        status: formData.status,
        roles: formData.roles,
      };

      const res = await window.api.users.create(createData);

      if (res.success && res.data) {
        setUsers((prev) => [...prev, res.data!]);
        setIsCreateDialogOpen(false);
        resetForm();
        toast.success("Pengguna berhasil ditambahkan", {
          description: `${res.data.firstName} ${res.data.lastName} telah ditambahkan`,
        });
      } else {
        toast.error("Gagal menambahkan pengguna", {
          description: res.error,
        });
      }
    } catch (error) {
      toast.error("Gagal menambahkan pengguna", {
        description: "Terjadi kesalahan saat menyimpan data",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update user
  const handleUpdateUser = async () => {
    if (!selectedUser || !validateForm()) return;

    setIsSubmitting(true);
    try {
      const updateData: UpdateUserData = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        status: formData.status,
        roles: formData.roles,
      };

      const res = await window.api.users.update(selectedUser.id, updateData);

      if (res.success && res.data) {
        setUsers((prev) =>
          prev.map((u) => (u.id === selectedUser.id ? res.data! : u))
        );
        setIsEditDialogOpen(false);
        resetForm();
        toast.success("Pengguna berhasil diperbarui", {
          description: `Data ${res.data.firstName} ${res.data.lastName} telah diperbarui`,
        });
      } else {
        toast.error("Gagal memperbarui pengguna", {
          description: res.error,
        });
      }
    } catch (error) {
      toast.error("Gagal memperbarui pengguna", {
        description: "Terjadi kesalahan saat menyimpan data",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const res = await window.api.users.delete(selectedUser.id);

      if (res.success) {
        setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
        setIsDeleteDialogOpen(false);
        setSelectedUser(null);
        toast.success("Pengguna berhasil dihapus", {
          description: `${selectedUser.firstName} ${selectedUser.lastName} telah dihapus`,
        });
      } else {
        toast.error("Gagal menghapus pengguna", {
          description: res.error,
        });
      }
    } catch (error) {
      toast.error("Gagal menghapus pengguna", {
        description: "Terjadi kesalahan saat menghapus data",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle toggle status
  const handleToggleStatus = async (user: UserData) => {
    try {
      const res = await window.api.users.toggleStatus(user.id);

      if (res.success && res.data) {
        setUsers((prev) => prev.map((u) => (u.id === user.id ? res.data! : u)));
        const statusText = res.data.status === "active" ? "aktif" : "nonaktif";
        toast.success("Status pengguna diperbarui", {
          description: `${user.firstName} ${user.lastName} sekarang ${statusText}`,
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
  const openEditDialog = (user: UserData) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      password: "",
      confirmPassword: "",
      status: user.status,
      roles: user.roles || [],
    });
    setFormErrors({});
    setIsEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (user: UserData) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData(initialFormData);
    setFormErrors({});
    setSelectedUser(null);
  };

  // Open create dialog
  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  // Handle role checkbox change
  const handleRoleChange = (roleCode: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      roles: checked
        ? [...prev.roles, roleCode]
        : prev.roles.filter((r) => r !== roleCode),
    }));
    // Clear role error when user selects a role
    if (checked && formErrors.roles) {
      setFormErrors((prev) => ({ ...prev, roles: undefined }));
    }
  };

  // Badge color helpers
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "SUPERADMIN":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "CHECKER":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "LOADER":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    return status === "active"
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  };

  // Render form fields - inlined to prevent re-render issues
  const renderFormFields = (showPassword: boolean = false) => (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Nama Depan</Label>
          <Input
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, firstName: e.target.value }))
            }
            placeholder="Masukkan nama depan"
            className={formErrors.firstName ? "border-destructive" : ""}
          />
          {formErrors.firstName && (
            <p className="text-sm text-destructive">{formErrors.firstName}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Nama Belakang</Label>
          <Input
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, lastName: e.target.value }))
            }
            placeholder="Masukkan nama belakang"
            className={formErrors.lastName ? "border-destructive" : ""}
          />
          {formErrors.lastName && (
            <p className="text-sm text-destructive">{formErrors.lastName}</p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          value={formData.username}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, username: e.target.value }))
          }
          placeholder="Masukkan username"
          className={formErrors.username ? "border-destructive" : ""}
        />
        {formErrors.username && (
          <p className="text-sm text-destructive">{formErrors.username}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, email: e.target.value }))
          }
          placeholder="Masukkan email"
          className={formErrors.email ? "border-destructive" : ""}
        />
        {formErrors.email && (
          <p className="text-sm text-destructive">{formErrors.email}</p>
        )}
      </div>
      {showPassword && (
        <>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, password: e.target.value }))
              }
              placeholder="Masukkan password"
              className={formErrors.password ? "border-destructive" : ""}
            />
            {formErrors.password && (
              <p className="text-sm text-destructive">{formErrors.password}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  confirmPassword: e.target.value,
                }))
              }
              placeholder="Masukkan ulang password"
              className={formErrors.confirmPassword ? "border-destructive" : ""}
            />
            {formErrors.confirmPassword && (
              <p className="text-sm text-destructive">
                {formErrors.confirmPassword}
              </p>
            )}
          </div>
        </>
      )}
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value) =>
            setFormData((prev) => ({ ...prev, status: value }))
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
      <div className="space-y-2">
        <Label>Role</Label>
        <div
          className={`grid gap-2 p-3 border rounded-md ${
            formErrors.roles ? "border-destructive" : ""
          }`}
        >
          {roles.map((role) => (
            <div key={role.id} className="flex items-center space-x-2">
              <Checkbox
                id={`role-${role.code}`}
                checked={formData.roles.includes(role.code)}
                onCheckedChange={(checked) =>
                  handleRoleChange(role.code, checked as boolean)
                }
              />
              <Label
                htmlFor={`role-${role.code}`}
                className="text-sm font-normal cursor-pointer"
              >
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
                    role.code
                  )}`}
                >
                  <Shield className="h-3 w-3 mr-1" />
                  {role.name}
                </span>
                <span className="ml-2 text-muted-foreground">
                  {role.description}
                </span>
              </Label>
            </div>
          ))}
        </div>
        {formErrors.roles && (
          <p className="text-sm text-destructive">{formErrors.roles}</p>
        )}
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
            Manajemen Pengguna
          </h1>
          <p className="text-muted-foreground">
            Kelola pengguna dan hak akses sistem
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Pengguna
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Pengguna
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Pengguna Aktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeUsers}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Pengguna Nonaktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {inactiveUsers}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Pengguna</CardTitle>
          <CardDescription>
            Semua pengguna yang terdaftar dalam sistem
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari pengguna..."
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
                    <TableHead>Nama</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        {searchQuery
                          ? "Tidak ada pengguna yang cocok dengan pencarian"
                          : "Belum ada pengguna"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.firstName} {user.lastName}
                        </TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles && user.roles.length > 0 ? (
                              user.roles.map((role) => (
                                <span
                                  key={role}
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
                                    role
                                  )}`}
                                >
                                  <Shield className="h-3 w-3 mr-1" />
                                  {role}
                                </span>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                -
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                              user.status
                            )}`}
                          >
                            {user.status === "active" ? "Aktif" : "Nonaktif"}
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
                                onClick={() => openEditDialog(user)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(user)}
                              >
                                <Power className="h-4 w-4 mr-2" />
                                {user.status === "active"
                                  ? "Nonaktifkan"
                                  : "Aktifkan"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => openDeleteDialog(user)}
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

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Tambah Pengguna Baru</DialogTitle>
            <DialogDescription>
              Isi form berikut untuk menambahkan pengguna baru ke sistem.
            </DialogDescription>
          </DialogHeader>
          {renderFormFields(true)}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button onClick={handleCreateUser} disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Pengguna</DialogTitle>
            <DialogDescription>
              Perbarui informasi pengguna {selectedUser?.firstName}{" "}
              {selectedUser?.lastName}.
            </DialogDescription>
          </DialogHeader>
          {renderFormFields(false)}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button onClick={handleUpdateUser} disabled={isSubmitting}>
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
            <AlertDialogTitle>Hapus Pengguna?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda yakin ingin menghapus pengguna{" "}
              <strong>
                {selectedUser?.firstName} {selectedUser?.lastName}
              </strong>
              ? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
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
