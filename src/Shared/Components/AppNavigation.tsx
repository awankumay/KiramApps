import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Shield,
  FileText,
  FilePlus,
  CreditCard,
  Truck,
  BarChart3,
  Package,
  LogOut,
  ChevronDown,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@Features/Auth/Contexts/AuthContext";
import {
  ROUTES,
  NAV_GROUPS,
  canAccessRoute,
  type RouteConfig,
} from "@Features/Auth/Routes/RouteConfig";
import { Button } from "@Shared/Components/UI/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@Shared/Components/UI/DropdownMenu";
import { Badge } from "@Shared/Components/UI/Badge";
import { cn } from "../Lib/Utils";

// Icon mapping - matches icon names in RouteConfig
const iconMap: Record<string, typeof LayoutDashboard> = {
  LayoutDashboard,
  Users,
  Shield,
  FileText,
  FilePlus,
  CreditCard,
  Truck,
  BarChart3,
  Package,
};

export function AppNavigation() {
  const { user, logout, permissions, roles } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
  };

  // Filter navigation groups based on user permissions
  // NAV_GROUPS contains route keys (strings), we need to look up the RouteConfig
  const filteredGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items
      .map((routeKey) => {
        const route = ROUTES[routeKey];
        if (!route || !route.showInNav) return null;
        if (!canAccessRoute(route, permissions)) return null;
        return { routeKey, route };
      })
      .filter(
        (item): item is { routeKey: string; route: RouteConfig } =>
          item !== null
      ),
  })).filter((group) => group.items.length > 0);

  return (
    <nav className="border-b bg-background">
      <div className="flex h-16 items-center px-4 gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <Package className="h-6 w-6" />
          <span className="hidden md:inline">KiramApps</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1 flex-1">
          {filteredGroups.map((group) => (
            <div key={group.label} className="flex items-center">
              {group.items.map(({ routeKey, route }) => {
                const Icon =
                  iconMap[route.icon || "LayoutDashboard"] || LayoutDashboard;
                const isActive = location.pathname === route.path;
                return (
                  <Link
                    key={routeKey}
                    to={route.path}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {route.name}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* User Menu */}
        <div className="ml-auto flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {user.firstName?.[0]}
                    {user.lastName?.[0]}
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium">
                    {user.firstName} {user.lastName}
                  </p>
                  <div className="flex gap-1">
                    {roles.slice(0, 2).map((role) => (
                      <Badge
                        key={role}
                        variant="outline"
                        className="text-xs py-0"
                      >
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p>
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground font-normal">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                Roles
              </DropdownMenuLabel>
              <div className="px-2 pb-2 flex flex-wrap gap-1">
                {roles.map((role) => (
                  <Badge key={role} variant="secondary" className="text-xs">
                    {role}
                  </Badge>
                ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t p-4 space-y-4">
          {filteredGroups.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map(({ routeKey, route }) => {
                  const Icon =
                    iconMap[route.icon || "LayoutDashboard"] || LayoutDashboard;
                  const isActive = location.pathname === route.path;
                  return (
                    <Link
                      key={routeKey}
                      to={route.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {route.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </nav>
  );
}
