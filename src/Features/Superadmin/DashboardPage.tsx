import { Users, FileText, Truck, TrendingUp, DollarSign } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@Shared/Components/UI/Card";
import { useAuth } from "@Features/Auth/Contexts/AuthContext";

export function DashboardPage() {
  const { user, roles } = useAuth();

  // Mock data for dashboard
  const stats = [
    {
      title: "Total Transaksi",
      value: "124",
      description: "Hari ini",
      icon: FileText,
      trend: "+12%",
    },
    {
      title: "Pendapatan",
      value: "Rp 45.2M",
      description: "Bulan ini",
      icon: DollarSign,
      trend: "+8%",
    },
    {
      title: "Loader Aktif",
      value: "8",
      description: "Dari 10 unit",
      icon: Truck,
      trend: "",
    },
    {
      title: "Pengguna",
      value: "32",
      description: "Total terdaftar",
      icon: Users,
      trend: "",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Selamat datang, {user?.firstName || user?.username}!
          </p>
        </div>
        <div className="flex items-center gap-2">
          {roles.map((role) => (
            <span
              key={role}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
            >
              {role}
            </span>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
                {stat.trend && (
                  <span className="text-green-600 ml-1">{stat.trend}</span>
                )}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Aktivitas Terkini</CardTitle>
            <CardDescription>Transaksi dan aktivitas terbaru</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Transaksi #{1000 + i}</p>
                    <p className="text-xs text-muted-foreground">
                      {i} menit yang lalu
                    </p>
                  </div>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Loader</CardTitle>
            <CardDescription>Kondisi loader saat ini</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {["Loader A", "Loader B", "Loader C", "Loader D"].map(
                (loader, i) => (
                  <div key={loader} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Truck className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{loader}</p>
                      <p className="text-xs text-muted-foreground">
                        {i % 2 === 0 ? "Sedang bekerja" : "Tersedia"}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                        i % 2 === 0
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {i % 2 === 0 ? "Aktif" : "Idle"}
                    </span>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
