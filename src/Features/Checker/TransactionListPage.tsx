import { useState } from "react";
import { FileText, Search, Eye, Filter } from "lucide-react";
import { Button } from "@Shared/Components/UI/Button";
import { Input } from "@Shared/Components/UI/Input";
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

// Mock transaction data
const mockTransactions = [
  {
    id: "TRX-001",
    date: "2026-01-05 09:30",
    customer: "PT. Sumber Makmur",
    vehicle: "B 1234 ABC",
    items: "Pasir, Batu Split",
    total: "Rp 2.500.000",
    status: "COMPLETED",
  },
  {
    id: "TRX-002",
    date: "2026-01-05 10:15",
    customer: "CV. Karya Jaya",
    vehicle: "D 5678 XYZ",
    items: "Batu Kali",
    total: "Rp 1.800.000",
    status: "PENDING",
  },
  {
    id: "TRX-003",
    date: "2026-01-05 11:00",
    customer: "UD. Mitra Sejahtera",
    vehicle: "F 9012 DEF",
    items: "Pasir",
    total: "Rp 950.000",
    status: "VERIFIED",
  },
  {
    id: "TRX-004",
    date: "2026-01-05 13:45",
    customer: "PT. Bangun Persada",
    vehicle: "B 3456 GHI",
    items: "Batu Split, Pasir",
    total: "Rp 3.200.000",
    status: "PENDING",
  },
  {
    id: "TRX-005",
    date: "2026-01-05 14:30",
    customer: "CV. Abadi Jaya",
    vehicle: "D 7890 JKL",
    items: "Batu Kali, Pasir",
    total: "Rp 2.100.000",
    status: "COMPLETED",
  },
];

export function TransactionListPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTransactions = mockTransactions.filter(
    (trx) =>
      trx.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trx.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trx.vehicle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-800",
      VERIFIED: "bg-blue-100 text-blue-800",
      COMPLETED: "bg-green-100 text-green-800",
    };
    const labels: Record<string, string> = {
      PENDING: "Menunggu",
      VERIFIED: "Terverifikasi",
      COMPLETED: "Selesai",
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          styles[status] || "bg-gray-100 text-gray-800"
        }`}
      >
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Daftar Transaksi
          </h1>
          <p className="text-muted-foreground">
            Lihat semua transaksi dalam sistem
          </p>
        </div>
        <Button onClick={() => (window.location.hash = "/transactions/create")}>
          + Buat Transaksi
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockTransactions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Menunggu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {mockTransactions.filter((t) => t.status === "PENDING").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Terverifikasi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {mockTransactions.filter((t) => t.status === "VERIFIED").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Selesai</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {mockTransactions.filter((t) => t.status === "COMPLETED").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaksi</CardTitle>
          <CardDescription>Semua transaksi yang tercatat</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search & Filter */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari transaksi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Kendaraan</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((trx) => (
                  <TableRow key={trx.id}>
                    <TableCell className="font-mono font-medium">
                      {trx.id}
                    </TableCell>
                    <TableCell>{trx.date}</TableCell>
                    <TableCell>{trx.customer}</TableCell>
                    <TableCell>{trx.vehicle}</TableCell>
                    <TableCell>{trx.items}</TableCell>
                    <TableCell>{trx.total}</TableCell>
                    <TableCell>{getStatusBadge(trx.status)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
