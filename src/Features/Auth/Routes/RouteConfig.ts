import { Permission, Role, ROLE_LANDING_PAGES } from "@Shared/Types/RBAC";

/**
 * Route configuration with permission requirements
 */
export interface RouteConfig {
  path: string;
  name: string;
  permissions?: Permission[];
  roles?: Role[];
  /** Icon name from lucide-react */
  icon?: string;
  /** Whether to show in navigation */
  showInNav?: boolean;
  /** Parent route for grouping in navigation */
  parent?: string;
}

/**
 * All application routes with their permission requirements
 */
export const ROUTES: Record<string, RouteConfig> = {
  // Dashboard - accessible to all authenticated users
  dashboard: {
    path: "/dashboard",
    name: "Dashboard",
    permissions: [Permission.VIEW_DASHBOARD],
    icon: "LayoutDashboard",
    showInNav: true,
  },

  // Superadmin routes
  superadminDashboard: {
    path: "/superadmin",
    name: "Dashboard Superadmin",
    permissions: [Permission.MANAGE_USERS],
    icon: "LayoutDashboard",
    showInNav: false,
  },
  users: {
    path: "/superadmin/users",
    name: "Manajemen Pengguna",
    permissions: [Permission.MANAGE_USERS],
    icon: "Users",
    showInNav: true,
  },
  roles: {
    path: "/superadmin/roles",
    name: "Role & Permissions",
    permissions: [Permission.MANAGE_ROLES],
    icon: "Shield",
    showInNav: true,
  },
  items: {
    path: "/superadmin/items",
    name: "Manajemen Item",
    permissions: [Permission.MANAGE_ITEMS],
    icon: "Package",
    showInNav: true,
  },
  reports: {
    path: "/superadmin/reports",
    name: "Laporan",
    permissions: [Permission.VIEW_REPORTS],
    icon: "BarChart3",
    showInNav: true,
  },
  customers: {
    path: "/superadmin/customers",
    name: "Manajemen Customer",
    permissions: [Permission.MANAGE_CUSTOMERS],
    icon: "Building2",
    showInNav: true,
  },
  customerForm: {
    path: "/superadmin/customers/new",
    name: "Tambah Customer",
    permissions: [Permission.MANAGE_CUSTOMERS],
    showInNav: false,
  },
  customerEdit: {
    path: "/superadmin/customers/:id",
    name: "Edit Customer",
    permissions: [Permission.MANAGE_CUSTOMERS],
    showInNav: false,
  },
  vehicles: {
    path: "/superadmin/vehicles",
    name: "Manajemen Kendaraan",
    permissions: [Permission.MANAGE_VEHICLES],
    icon: "Car",
    showInNav: true,
  },
  vehicleForm: {
    path: "/superadmin/vehicles/new",
    name: "Tambah Kendaraan",
    permissions: [Permission.MANAGE_VEHICLES],
    showInNav: false,
  },
  vehicleEdit: {
    path: "/superadmin/vehicles/:id",
    name: "Edit Kendaraan",
    permissions: [Permission.MANAGE_VEHICLES],
    showInNav: false,
  },

  // Transaction routes (Checker + Superadmin)
  transactions: {
    path: "/checker/transactions",
    name: "Daftar Transaksi",
    permissions: [Permission.VIEW_TRANSACTION],
    icon: "FileText",
    showInNav: true,
    parent: "transactions",
  },
  transactionCreate: {
    path: "/checker/transactions/create",
    name: "Buat Transaksi",
    permissions: [Permission.CREATE_TRANSACTION],
    icon: "FilePlus",
    showInNav: true,
    parent: "transactions",
  },
  transactionDetail: {
    path: "/checker/transactions/:id",
    name: "Detail Transaksi",
    permissions: [Permission.VIEW_TRANSACTION],
    showInNav: false,
  },

  // Payment routes (Checker + Superadmin)
  paymentVerify: {
    path: "/checker/payments",
    name: "Verifikasi Pembayaran",
    permissions: [Permission.VERIFY_PAYMENT],
    icon: "CreditCard",
    showInNav: true,
  },

  // Loader routes (Loader + Superadmin)
  loaderQueue: {
    path: "/loader/queue",
    name: "Antrian Loader",
    permissions: [Permission.VIEW_LOADER_QUEUE],
    icon: "Truck",
    showInNav: true,
  },
  loaderDetail: {
    path: "/loader/assignment/:id",
    name: "Detail Assignment",
    permissions: [Permission.UPDATE_LOADER_STATUS],
    showInNav: false,
  },

  // Error pages
  unauthorized: {
    path: "/unauthorized",
    name: "Unauthorized",
    showInNav: false,
  },
};

/**
 * Navigation groups for sidebar
 */
export interface NavGroup {
  label: string;
  items: string[]; // Route keys
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Utama",
    items: ["dashboard"],
  },
  {
    label: "Superadmin",
    items: ["users", "roles", "items", "customers", "vehicles", "reports"],
  },
  {
    label: "Transaksi",
    items: ["transactions", "transactionCreate", "paymentVerify"],
  },
  {
    label: "Loader",
    items: ["loaderQueue"],
  },
];

/**
 * Get landing page path based on user's primary role
 */
export function getLandingPage(roles: string[]): string {
  if (roles.length === 0) {
    return "/dashboard";
  }

  const primaryRole = roles[0] as Role;
  return ROLE_LANDING_PAGES[primaryRole] || "/dashboard";
}

/**
 * Check if user has access to a route based on their permissions
 */
export function canAccessRoute(
  route: RouteConfig,
  userPermissions: string[]
): boolean {
  // If no permissions required, allow access
  if (!route.permissions || route.permissions.length === 0) {
    return true;
  }

  // Check if user has any of the required permissions
  return route.permissions.some((perm) => userPermissions.includes(perm));
}

/**
 * Get filtered navigation items based on user permissions
 */
export function getFilteredNavigation(userPermissions: string[]): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((routeKey) => {
      const route = ROUTES[routeKey];
      if (!route || !route.showInNav) return false;
      return canAccessRoute(route, userPermissions);
    }),
  })).filter((group) => group.items.length > 0);
}
