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
  Building2,
  Car,
  LogOut,
  Settings,
  HelpCircle,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@Features/Auth/Contexts/AuthContext";
import {
  ROUTES,
  NAV_GROUPS,
  canAccessRoute,
  type RouteConfig,
} from "@Features/Auth/Routes/RouteConfig";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@Shared/Components/UI/Sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@Shared/Components/UI/DropdownMenu";
import { Badge } from "@Shared/Components/UI/Badge";
import { Avatar, AvatarFallback } from "@Shared/Components/UI/Avatar";
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
  Building2,
  Car,
  Settings,
  HelpCircle,
  Search,
};

export function AppSidebarRBAC({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { user, logout, permissions, roles } = useAuth();
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
  };

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupLabel)) {
        next.delete(groupLabel);
      } else {
        next.add(groupLabel);
      }
      return next;
    });
  };

  // Filter navigation groups based on user permissions
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
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Package className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">KiramApps</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {filteredGroups.map((group) => {
          const isExpanded = expandedGroups.has(group.label);
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel
                className={cn(
                  "cursor-pointer hover:bg-muted/50 transition-colors",
                  filteredGroups.length > 1 &&
                    "flex items-center justify-between"
                )}
                onClick={() =>
                  filteredGroups.length > 1 && toggleGroup(group.label)
                }
              >
                {group.label}
                {filteredGroups.length > 1 && (
                  <span className="ml-auto">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </span>
                )}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map(({ routeKey, route }) => {
                    const Icon =
                      iconMap[route.icon || "LayoutDashboard"] ||
                      LayoutDashboard;
                    const isActive = location.pathname === route.path;
                    return (
                      <SidebarMenuItem key={routeKey}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={route.name}
                        >
                          <Link to={route.path}>
                            <Icon />
                            <span>{route.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">
                      {user.firstName?.[0]}
                      {user.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user.firstName} {user.lastName}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                  <ChevronLeft className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg">
                        {user.firstName?.[0]}
                        {user.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {user.firstName} {user.lastName}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
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
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppSidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebarRBAC variant="inset" />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1" />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
