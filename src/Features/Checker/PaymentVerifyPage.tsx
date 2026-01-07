import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle,
  Clock,
  Search,
  Eye,
  Check,
  X,
  FileText,
  DollarSign,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@Shared/Components/UI/Button";
import { Input } from "@Shared/Components/UI/Input";
import { Badge } from "@Shared/Components/UI/Badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@Shared/Components/UI/Dialog";
import { Textarea } from "@Shared/Components/UI/Textarea";
import { Label } from "@Shared/Components/UI/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@Shared/Components/UI/Select";
import type {
  PaymentData,
  PaymentVerificationStatus,
} from "@Shared/Types/Electron";

type PaymentStatus = "PENDING" | "VERIFIED" | "REJECTED";

const statusConfig: Record<
  PaymentStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  PENDING: { label: "Menunggu", variant: "secondary" },
  VERIFIED: { label: "Terverifikasi", variant: "default" },
  REJECTED: { label: "Ditolak", variant: "destructive" },
};

export function PaymentVerifyPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(
    null
  );
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [verifyNotes, setVerifyNotes] = useState("");

  // Data states
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    pendingCount: number;
    verifiedCount: number;
    rejectedCount: number;
  }>({
    pendingCount: 0,
    verifiedCount: 0,
    rejectedCount: 0,
  });

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  // Load payments
  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: {
        verificationStatus?: PaymentVerificationStatus;
        page: number;
        limit: number;
      } = {
        page,
        limit,
      };

      if (statusFilter !== "ALL") {
        filters.verificationStatus = statusFilter as PaymentVerificationStatus;
      }

      const response = await window.api.payments.getPending(filters);

      if (response.success && response.data) {
        setPayments(response.data.payments);
        setTotal(response.data.total);
      } else {
        setError(response.error || "Gagal memuat pembayaran");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter]);

  // Load verification stats
  const loadStats = useCallback(async () => {
    try {
      const today = new Date();
      const firstDayOfMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

      const response = await window.api.payments.getVerificationStats({
        from: firstDayOfMonth.toISOString().split("T")[0],
        to: today.toISOString().split("T")[0],
      });

      if (response.success && response.data) {
        // The API returns a single object, not an array
        setStats({
          pendingCount: response.data.totalPending || 0,
          verifiedCount: response.data.totalVerified || 0,
          rejectedCount: response.data.totalRejected || 0,
        });
      }
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadPayments();
    loadStats();
  }, [page, statusFilter, loadPayments, loadStats]);

  // Filter payments by search query
  const filteredPayments = payments.filter(
    (p) =>
      p.id.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.customerName &&
        p.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.transactionInvoiceNumber &&
        p.transactionInvoiceNumber
          .toLowerCase()
          .includes(searchQuery.toLowerCase()))
  );

  const handleVerify = async () => {
    if (!selectedPayment) return;

    try {
      setLoading(true);
      const response = await window.api.payments.verify(
        selectedPayment.id,
        verifyNotes
      );

      if (response.success) {
        setShowVerifyDialog(false);
        setVerifyNotes("");
        setSelectedPayment(null);
        loadPayments();
        loadStats();
      } else {
        setError(response.error || "Gagal memverifikasi pembayaran");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPayment) return;

    try {
      setLoading(true);
      const response = await window.api.payments.reject(
        selectedPayment.id,
        rejectionReason,
        verifyNotes
      );

      if (response.success) {
        setShowRejectDialog(false);
        setRejectionReason("");
        setVerifyNotes("");
        setSelectedPayment(null);
        loadPayments();
        loadStats();
      } else {
        setError(response.error || "Gagal menolak pembayaran");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadPayments();
    loadStats();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <CheckCircle className="h-8 w-8" />
          Verifikasi Pembayaran
        </h1>
        <p className="text-muted-foreground">
          Verifikasi pembayaran yang masuk
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={() => setError(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menunggu</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingCount}</div>
            <p className="text-xs text-muted-foreground">Perlu diverifikasi</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Terverifikasi</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.verifiedCount}
            </div>
            <p className="text-xs text-muted-foreground">Bulan ini</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ditolak</CardTitle>
            <X className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.rejectedCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Perlu ditindaklanjuti
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Daftar Pembayaran</CardTitle>
              <CardDescription>
                Klik untuk melihat detail dan verifikasi
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
          <div className="flex gap-4 mt-4">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari pembayaran..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Status</SelectItem>
                <SelectItem value="PENDING">Menunggu</SelectItem>
                <SelectItem value="VERIFIED">Terverifikasi</SelectItem>
                <SelectItem value="REJECTED">Ditolak</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading && payments.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Tidak ada pembayaran ditemukan
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Transaksi</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Metode</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => {
                    const status =
                      statusConfig[payment.verificationStatus as PaymentStatus];
                    return (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {payment.id}
                        </TableCell>
                        <TableCell>
                          {payment.transactionInvoiceNumber || "-"}
                        </TableCell>
                        <TableCell>{payment.customerName || "-"}</TableCell>
                        <TableCell>
                          {payment.paymentMethodName || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          Rp {payment.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedPayment(payment)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {payment.verificationStatus === "PENDING" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => {
                                    setSelectedPayment(payment);
                                    setShowVerifyDialog(true);
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => {
                                    setSelectedPayment(payment);
                                    setShowRejectDialog(true);
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {total > limit && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Menampilkan {Math.min(page * limit, total)} dari {total}{" "}
                    pembayaran
                  </p>
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
                      disabled={page * limit >= total}
                    >
                      Selanjutnya
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedPayment && !showVerifyDialog && !showRejectDialog}
        onOpenChange={() => setSelectedPayment(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detail Pembayaran
            </DialogTitle>
            <DialogDescription>
              Informasi lengkap pembayaran transaksi
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">ID Pembayaran</p>
                  <p className="font-medium">{selectedPayment.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">ID Transaksi</p>
                  <p className="font-medium">
                    {selectedPayment.transactionInvoiceNumber || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">
                    {selectedPayment.customerName || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Metode</p>
                  <p className="font-medium">
                    {selectedPayment.paymentMethodName || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tanggal</p>
                  <p className="font-medium">
                    {new Date(selectedPayment.paidAt).toLocaleDateString(
                      "id-ID"
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Jumlah</p>
                  <p className="font-medium text-lg">
                    Rp {selectedPayment.amount.toLocaleString()}
                  </p>
                </div>
                {selectedPayment.verifiedAt && (
                  <div>
                    <p className="text-muted-foreground">Diverifikasi Pada</p>
                    <p className="font-medium">
                      {new Date(selectedPayment.verifiedAt).toLocaleString(
                        "id-ID"
                      )}
                    </p>
                  </div>
                )}
              </div>
              <div className="bg-muted rounded-lg p-4 flex items-center justify-center min-h-[200px]">
                <div className="text-center text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Bukti Pembayaran</p>
                  <p className="text-xs">
                    {selectedPayment.reference || "Tidak ada referensi"}
                  </p>
                </div>
              </div>
              {selectedPayment.verificationStatus === "REJECTED" &&
                selectedPayment.rejectionReason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium">Alasan Penolakan:</span>
                    </div>
                    <p className="text-sm text-red-600 mt-1">
                      {selectedPayment.rejectionReason}
                    </p>
                  </div>
                )}
              {selectedPayment.notes && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Catatan:</span>{" "}
                    {selectedPayment.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Verify Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verifikasi Pembayaran</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin memverifikasi pembayaran ini?
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                {selectedPayment.id} - {selectedPayment.customerName || "-"}
              </p>
              <p className="text-lg font-bold">
                Rp {selectedPayment.amount.toLocaleString()}
              </p>
              <div className="space-y-2">
                <Label>Catatan (Opsional)</Label>
                <Textarea
                  placeholder="Tambahkan catatan verifikasi..."
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowVerifyDialog(false);
                setVerifyNotes("");
              }}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              onClick={handleVerify}
              className="bg-green-600 hover:bg-green-700"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Verifikasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Pembayaran</DialogTitle>
            <DialogDescription>
              Berikan alasan penolakan pembayaran ini
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                {selectedPayment.id} - {selectedPayment.customerName || "-"}
              </p>
              <div className="space-y-2">
                <Label>Alasan Penolakan *</Label>
                <Textarea
                  placeholder="Masukkan alasan penolakan..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Catatan (Opsional)</Label>
                <Textarea
                  placeholder="Tambahkan catatan..."
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason("");
                setVerifyNotes("");
              }}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              onClick={handleReject}
              variant="destructive"
              disabled={loading || !rejectionReason}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Tolak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
