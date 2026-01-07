import { Shield, Check } from "lucide-react";
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
import { ROLE_PERMISSIONS, Permission, Role } from "@Shared/Types/RBAC";

// Permission descriptions
const permissionDescriptions: Record<Permission, string> = {
  [Permission.VIEW_DASHBOARD]: "Melihat dashboard utama",
  [Permission.CREATE_TRANSACTION]: "Membuat transaksi baru",
  [Permission.VIEW_TRANSACTION]: "Melihat daftar dan detail transaksi",
  [Permission.VERIFY_PAYMENT]: "Memverifikasi pembayaran",
  [Permission.VIEW_LOADER_QUEUE]: "Melihat antrian loader",
  [Permission.UPDATE_LOADER_STATUS]: "Mengubah status loader",
  [Permission.MANAGE_USERS]: "Mengelola pengguna sistem",
  [Permission.MANAGE_ROLES]: "Mengelola role dan permission",
  [Permission.MANAGE_ITEMS]: "Mengelola item dan harga",
  [Permission.VIEW_REPORTS]: "Melihat laporan sistem",
  [Permission.MANAGE_CUSTOMERS]: "Mengelola data customer",
  [Permission.MANAGE_VEHICLES]: "Mengelola data kendaraan",
};

// Role descriptions
const roleDescriptions: Record<Role, string> = {
  [Role.SUPERADMIN]: "Akses penuh ke seluruh sistem",
  [Role.CHECKER]: "Mengelola transaksi dan verifikasi pembayaran",
  [Role.LOADER]: "Mengelola operasi loader",
};

export function RolesPage() {
  const allPermissions = Object.values(Permission);
  const allRoles = Object.values(Role);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Role & Permissions
        </h1>
        <p className="text-muted-foreground">
          Lihat konfigurasi role dan permission sistem
        </p>
      </div>

      {/* Roles Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        {allRoles.map((role) => (
          <Card key={role}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {role}
              </CardTitle>
              <CardDescription>{roleDescriptions[role]}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {ROLE_PERMISSIONS[role].length} permissions
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Permission Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Matriks Permission</CardTitle>
          <CardDescription>
            Mapping antara role dan permission dalam sistem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Permission</TableHead>
                  <TableHead className="min-w-[150px]">Deskripsi</TableHead>
                  {allRoles.map((role) => (
                    <TableHead key={role} className="text-center min-w-[100px]">
                      {role}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {allPermissions.map((permission) => (
                  <TableRow key={permission}>
                    <TableCell className="font-mono text-sm">
                      {permission}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {permissionDescriptions[permission]}
                    </TableCell>
                    {allRoles.map((role) => (
                      <TableCell key={role} className="text-center">
                        {ROLE_PERMISSIONS[role].includes(permission) ? (
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Role Details */}
      {allRoles.map((role) => (
        <Card key={role}>
          <CardHeader>
            <CardTitle>{role}</CardTitle>
            <CardDescription>{roleDescriptions[role]}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ROLE_PERMISSIONS[role].map((permission) => (
                <span
                  key={permission}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                >
                  {permission}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
