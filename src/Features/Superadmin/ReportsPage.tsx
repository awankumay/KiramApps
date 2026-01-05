import { BarChart3, FileText, TrendingUp, Download } from "lucide-react";
import { Button } from "@Shared/Components/UI/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@Shared/Components/UI/Card";

export function ReportsPage() {
  const reports = [
    {
      title: "Laporan Transaksi",
      description: "Ringkasan transaksi harian, mingguan, dan bulanan",
      icon: FileText,
      type: "transaction",
    },
    {
      title: "Laporan Loader",
      description: "Aktivitas dan performa loader",
      icon: TrendingUp,
      type: "loader",
    },
    {
      title: "Laporan Pembayaran",
      description: "Rekonsiliasi pembayaran dan outstanding",
      icon: BarChart3,
      type: "payment",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-8 w-8" />
          Laporan
        </h1>
        <p className="text-muted-foreground">
          Akses laporan dan analitik sistem
        </p>
      </div>

      {/* Report Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Card key={report.type} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <report.icon className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>{report.title}</CardTitle>
              <CardDescription>{report.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  Lihat
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Placeholder Chart Area */}
      <Card>
        <CardHeader>
          <CardTitle>Grafik Transaksi</CardTitle>
          <CardDescription>Trend transaksi 30 hari terakhir</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-muted rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">
              Grafik akan ditampilkan di sini
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
