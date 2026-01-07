import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useAuth } from "@Features/Auth/Contexts/AuthContext";
import AuthPage from "@Features/Auth/AuthPage";
import { ProtectedRoute } from "@Features/Auth/Components/ProtectedRoute";
import { UnauthorizedPage } from "@Features/Auth/Components/UnauthorizedPage";
import {
  getLandingPage,
  ROUTES,
  canAccessRoute,
} from "@Features/Auth/Routes/RouteConfig";
import { AppSidebarLayout } from "@Shared/Components/AppSidebarRBAC";
import { Permission, ROLE_PERMISSIONS } from "@Shared/Types/RBAC";
import { Role } from "@Shared/Types/RBAC";
import { CustomerListPage } from "@Features/Customer/CustomerListPage";
import { CustomerForm } from "@Features/Customer/CustomerForm";
import { VehicleListPage } from "@Features/Vehicle/VehicleListPage";
import { VehicleForm } from "@Features/Vehicle/VehicleForm";

/**
 * Helper function to check if a path is accessible for given roles
 */
function canAccessRouteForRoles(path: string, roles: string[]): boolean {
  // Find route config for the path
  const routeConfig = Object.values(ROUTES).find(
    (route) => route.path === path
  );

  // If no route config found, allow access
  if (!routeConfig) return true;

  // Get user's permissions based on roles
  const userPermissions: string[] = [];
  for (const role of roles) {
    const rolePermissions = ROLE_PERMISSIONS[role as Role];
    if (rolePermissions) {
      userPermissions.push(...rolePermissions);
    }
  }

  // Check if user has access to the route
  return canAccessRoute(routeConfig, userPermissions);
}

// Superadmin Pages
import { DashboardPage as SuperadminDashboard } from "@Features/Superadmin/DashboardPage";
import { UsersPage } from "@Features/Superadmin/UsersPage";
import { RolesPage } from "@Features/Superadmin/RolesPage";
import { ReportsPage } from "@Features/Superadmin/ReportsPage";
import { ItemsPage } from "@Features/Superadmin/ItemsPage";

// Checker Pages
import { TransactionListPage } from "@Features/Checker/TransactionListPage";
import { CreateTransactionPage } from "@Features/Checker/CreateTransactionPage";
import { TransactionDetailPage } from "@Features/Checker/TransactionDetailPage";
import { PaymentVerifyPage } from "@Features/Checker/PaymentVerifyPage";

// Loader Pages
import { LoaderQueuePage } from "@Features/Loader/LoaderQueuePage";
import { LoaderDetailPage } from "@Features/Loader/LoaderDetailPage";

// Dashboard (shared)
import { DashboardPage } from "@Features/Dashboard/DashboardPage";

function AppContent() {
  const { isAuthenticated, isLoading, roles } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // Get landing page based on user's primary role
  const landingPage = getLandingPage(roles);

  // Check if current path is not accessible for current user's role
  // If so, redirect to appropriate landing page
  const currentPath = location.pathname;
  const isRootPath = currentPath === "/";
  const isLandingPath = currentPath === landingPage;

  // Don't redirect if already on landing page or root path
  if (!isRootPath && !isLandingPath) {
    // Check if current path is accessible
    const isAccessible = canAccessRouteForRoles(currentPath, roles);
    if (!isAccessible) {
      return <Navigate to={landingPage} replace />;
    }
  }

  return (
    <AppSidebarLayout>
      <Routes>
        {/* Root redirect to role-based landing page */}
        <Route path="/" element={<Navigate to={landingPage} replace />} />

        {/* Superadmin Routes */}
        <Route
          path="/superadmin"
          element={
            <ProtectedRoute permissions={[Permission.MANAGE_USERS]}>
              <SuperadminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/superadmin/users"
          element={
            <ProtectedRoute permissions={[Permission.MANAGE_USERS]}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/superadmin/roles"
          element={
            <ProtectedRoute permissions={[Permission.MANAGE_ROLES]}>
              <RolesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/superadmin/items"
          element={
            <ProtectedRoute permissions={[Permission.MANAGE_ITEMS]}>
              <ItemsPage />
            </ProtectedRoute>
          }
        />

        {/* Customer Management Routes */}
        <Route
          path="/superadmin/customers"
          element={
            <ProtectedRoute permissions={[Permission.MANAGE_CUSTOMERS]}>
              <CustomerListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/superadmin/customers/new"
          element={
            <ProtectedRoute permissions={[Permission.MANAGE_CUSTOMERS]}>
              <CustomerForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/superadmin/customers/:id"
          element={
            <ProtectedRoute permissions={[Permission.MANAGE_CUSTOMERS]}>
              <CustomerForm />
            </ProtectedRoute>
          }
        />

        {/* Vehicle Management Routes */}
        <Route
          path="/superadmin/vehicles"
          element={
            <ProtectedRoute permissions={[Permission.MANAGE_VEHICLES]}>
              <VehicleListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/superadmin/vehicles/new"
          element={
            <ProtectedRoute permissions={[Permission.MANAGE_VEHICLES]}>
              <VehicleForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/superadmin/vehicles/:id"
          element={
            <ProtectedRoute permissions={[Permission.MANAGE_VEHICLES]}>
              <VehicleForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/superadmin/reports"
          element={
            <ProtectedRoute permissions={[Permission.VIEW_REPORTS]}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        {/* Checker Routes */}
        <Route
          path="/checker/transactions"
          element={
            <ProtectedRoute permissions={[Permission.VIEW_TRANSACTION]}>
              <TransactionListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checker/transactions/create"
          element={
            <ProtectedRoute permissions={[Permission.CREATE_TRANSACTION]}>
              <CreateTransactionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checker/transactions/:id"
          element={
            <ProtectedRoute permissions={[Permission.VIEW_TRANSACTION]}>
              <TransactionDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checker/payments"
          element={
            <ProtectedRoute permissions={[Permission.VERIFY_PAYMENT]}>
              <PaymentVerifyPage />
            </ProtectedRoute>
          }
        />

        {/* Loader Routes */}
        <Route
          path="/loader/queue"
          element={
            <ProtectedRoute permissions={[Permission.VIEW_LOADER_QUEUE]}>
              <LoaderQueuePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/loader/assignment/:id"
          element={
            <ProtectedRoute permissions={[Permission.UPDATE_LOADER_STATUS]}>
              <LoaderDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Shared Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute permissions={[Permission.VIEW_DASHBOARD]}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppSidebarLayout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
