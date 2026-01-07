import { useState, useEffect, useCallback } from "react";
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
import type {
  TransactionData,
  TransactionFilters,
  DailyStats,
} from "@Shared/Types/Electron";

export function TransactionListPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined
  );
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<
    string | undefined
  >(undefined);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const filters: TransactionFilters = {
        status: statusFilter as
          | "CREATED"
          | "QUEUED"
          | "LOADING"
          | "DONE"
          | "CHECKED_OUT"
          | undefined,
        paymentStatus: paymentStatusFilter as "UNPAID" | "PAID" | undefined,
        page,
        limit,
      };

      if (searchQuery) {
        const searchResult = await window.api.transactions.search(searchQuery);
        if (searchResult.success && searchResult.data) {
          setTransactions(searchResult.data);
          setTotal(searchResult.data.length);
        }
      } else {
        const allResult = await window.api.transactions.getAll(filters);
        if (allResult.success && allResult.data) {
          setTransactions(allResult.data.transactions);
          setTotal(allResult.data.total);
        }
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, paymentStatusFilter, page, limit]);

  const fetchStats = useCallback(async () => {
    try {
      const result = await window.api.transactions.getDailyStats();
      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
    fetchStats();
  }, [fetchTransactions, fetchStats]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      CREATED: "bg-gray-100 text-gray-800",
      QUEUED: "bg-yellow-100 text-yellow-800",
      LOADING: "bg-blue-100 text-blue-800",
      DONE: "bg-green-100 text-green-800",
      CHECKED_OUT: "bg-purple-100 text-purple-800",
    };
    const labels: Record<string, string> = {
      CREATED: "Dibuat",
      QUEUED: "Antrian",
      LOADING: "Loading",
      DONE: "Selesai",
      CHECKED_OUT: "Keluar",
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

  const getPaymentStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      UNPAID: "bg-red-100 text-red-800",
      PAID: "bg-green-100 text-green-800",
    };
    const labels: Record<string, string> = {
      UNPAID: "Belum Bayar",
      PAID: "Sudah Bayar",
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

  const handleViewDetail = (id: number) => {
    window.location.hash = `/checker/transactions/${id}`;
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
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Hari Ini
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Dibuat</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">
                {stats.pending}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Loading</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.loading}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Selesai</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.done}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="">Semua Status</option>
              <option value="CREATED">Dibuat</option>
              <option value="QUEUED">Antrian</option>
              <option value="LOADING">Loading</option>
              <option value="DONE">Selesai</option>
              <option value="CHECKED_OUT">Keluar</option>
            </select>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="">Semua Pembayaran</option>
              <option value="UNPAID">Belum Bayar</option>
              <option value="PAID">Sudah Bayar</option>
            </select>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Memuat data...
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Tidak ada transaksi ditemukan
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Kendaraan</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pembayaran</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((trx) => (
                      <TableRow key={trx.id}>
                        <TableCell className="font-mono font-medium">
                          {trx.invoiceNumber}
                        </TableCell>
                        <TableCell>
                          {new Date(trx.createdAt).toLocaleDateString("id-ID")}
                        </TableCell>
                        <TableCell>{trx.customerName || "-"}</TableCell>
                        <TableCell>{trx.vehiclePlate || "-"}</TableCell>
                        <TableCell>
                          Rp {trx.totalAmount.toLocaleString("id-ID")}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(trx.transactionStatus)}
                        </TableCell>
                        <TableCell>
                          {getPaymentStatusBadge(trx.paymentStatus)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetail(trx.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Menampilkan {transactions.length} dari {total} transaksi
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={transactions.length < limit}
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
