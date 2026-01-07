import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  DollarSign,
  RefreshCw,
  Trash2,
  Printer,
  CheckCircle,
  Clock,
  X,
  AlertCircle,
  Eye,
  FileText,
} from "lucide-react";
import { Button } from "@/Shared/Components/UI/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/Shared/Components/UI/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/Shared/Components/UI/Table";
import { Badge } from "@/Shared/Components/UI/Badge";
import { Separator } from "@/Shared/Components/UI/Separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/Shared/Components/UI/Dialog";
import { TransactionStatusBadge } from "./Components/TransactionStatusBadge";
import { PaymentDialog } from "./Components/PaymentDialog";
import { StatusUpdateDialog } from "./Components/StatusUpdateDialog";
import { usePermission } from "@/Features/Auth/Hooks/UsePermission";
import type {
  TransactionData,
  PaymentData,
  TransactionStatusLogData,
  PaymentMethodData,
  TransactionStatus,
} from "@/Shared/Types/Electron";
import { toast } from "sonner";

const STATUS_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  CREATED: ["QUEUED"],
  QUEUED: ["LOADING", "CREATED"],
  LOADING: ["DONE", "QUEUED"],
  DONE: ["CHECKED_OUT", "LOADING"],
  CHECKED_OUT: [],
};

export function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canEdit = usePermission("EDIT_TRANSACTION");
  const canDelete = usePermission("DELETE_TRANSACTION");
  const canManageStatus = usePermission("MANAGE_TRANSACTION_STATUS");
  const canVerifyPayment = usePermission("VERIFY_PAYMENT");

  const [transaction, setTransaction] = useState<TransactionData | null>(null);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [statusHistory, setStatusHistory] = useState<
    TransactionStatusLogData[]
  >([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(
    null
  );
  const [paymentDetailOpen, setPaymentDetailOpen] = useState(false);
  const [proofImageData, setProofImageData] = useState<string | null>(null);

  const fetchTransaction = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const [txResult, paymentsResult, historyResult, methodsResult] =
        await Promise.all([
          window.api.transactions.getById(Number(id)),
          window.api.transactions.getPayments(Number(id)),
          window.api.transactions.getStatusHistory(Number(id)),
          window.api.paymentMethods.getAll(),
        ]);

      if (txResult.success && txResult.data) {
        setTransaction(txResult.data);
      } else {
        toast.error("Gagal memuat transaksi");
        navigate("/checker/transactions");
      }

      if (paymentsResult.success && paymentsResult.data) {
        setPayments(paymentsResult.data);
      }

      if (historyResult.success && historyResult.data) {
        setStatusHistory(historyResult.data);
      }

      if (methodsResult.success && methodsResult.data) {
        setPaymentMethods(methodsResult.data);
      }
    } catch (error) {
      console.error("Error fetching transaction:", error);
      toast.error("Terjadi kesalahan saat memuat transaksi");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction]);

  // Load proof image when payment is selected
  useEffect(() => {
    const loadProofImage = async () => {
      if (selectedPayment?.proofImagePath) {
        try {
          const response = await window.api.payments.readProofFile(
            selectedPayment.proofImagePath
          );
          if (response.success && response.data) {
            setProofImageData(response.data.data);
          } else {
            setProofImageData(null);
          }
        } catch (err) {
          console.error("Failed to load proof image:", err);
          setProofImageData(null);
        }
      } else {
        setProofImageData(null);
      }
    };

    loadProofImage();
  }, [selectedPayment]);

  const handleAddPayment = async (data: {
    method_id: number;
    amount: number;
    reference?: string;
  }) => {
    if (!transaction) return;

    const result = await window.api.transactions.addPayment(
      transaction.id,
      {
        paymentMethodId: data.method_id,
        amount: data.amount,
        reference: data.reference,
      },
      1
    );
    if (result.success) {
      toast.success("Pembayaran berhasil ditambahkan");
      fetchTransaction();
    } else {
      toast.error(result.error || "Gagal menambahkan pembayaran");
      throw new Error(result.error || "Gagal menambahkan pembayaran");
    }
  };

  const handleUpdateStatus = async (data: {
    status: TransactionStatus;
    note?: string;
  }) => {
    if (!transaction) return;

    const result = await window.api.transactions.updateStatus(
      transaction.id,
      data.status,
      1,
      data.note
    );
    if (result.success) {
      toast.success("Status berhasil diperbarui");
      fetchTransaction();
    } else {
      toast.error(result.error || "Gagal memperbarui status");
      throw new Error(result.error || "Gagal memperbarui status");
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;

    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus transaksi ${transaction.invoiceNumber}?`
      )
    ) {
      return;
    }

    const result = await window.api.transactions.delete(transaction.id);
    if (result.success) {
      toast.success("Transaksi berhasil dihapus");
      navigate("/checker/transactions");
    } else {
      toast.error(result.error || "Gagal menghapus transaksi");
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingAmount = transaction ? transaction.totalAmount - totalPaid : 0;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Transaksi tidak ditemukan</p>
          <Button
            variant="outline"
            onClick={() => navigate("/checker/transactions")}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Daftar
          </Button>
        </div>
      </div>
    );
  }

  const allowedStatuses =
    STATUS_TRANSITIONS[transaction.transactionStatus as TransactionStatus] ||
    [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/checker/transactions")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {transaction.invoiceNumber}
              </h1>
              <p className="text-muted-foreground">
                {new Date(transaction.createdAt).toLocaleString("id-ID")}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TransactionStatusBadge
            status={transaction.transactionStatus}
            type="transaction"
          />
          {canEdit && (
            <Button
              variant="outline"
              onClick={() =>
                navigate(`/checker/transactions/${transaction.id}/edit`)
              }
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {canManageStatus && allowedStatuses.length > 0 && (
            <Button variant="outline" onClick={() => setStatusDialogOpen(true)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Update Status
            </Button>
          )}
          {canVerifyPayment && remainingAmount > 0 && (
            <Button onClick={() => setPaymentDialogOpen(true)}>
              <DollarSign className="h-4 w-4 mr-2" />
              Tambah Pembayaran
            </Button>
          )}
          {canDelete && transaction.transactionStatus === "CREATED" && (
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Hapus
            </Button>
          )}
          <Button variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Cetak
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Vehicle Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informasi Pelanggan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nama Customer</p>
                  <p className="font-medium">{transaction.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kategori</p>
                  <p className="font-medium">{transaction.customerCategory}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Plat Kendaraan
                  </p>
                  <p className="font-medium">{transaction.vehiclePlate}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Tipe Kendaraan
                  </p>
                  <p className="font-medium">{transaction.vehicleType}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Items */}
          <Card>
            <CardHeader>
              <CardTitle>Item Transaksi</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Harga</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transaction.items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.itemName}</TableCell>
                      <TableCell className="text-right">{item.qty}</TableCell>
                      <TableCell className="text-right">
                        Rp {item.price.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="text-right">
                        Rp {(item.qty * item.price).toLocaleString("id-ID")}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-bold">
                      Total
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      Rp {transaction.totalAmount.toLocaleString("id-ID")}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Status History */}
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statusHistory.map((log, index) => (
                  <div key={log.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      {index < statusHistory.length - 1 && (
                        <div className="h-full w-px bg-border" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <TransactionStatusBadge
                          status={log.status}
                          type="transaction"
                        />
                        <p className="text-sm text-muted-foreground">
                          {new Date(log.changedAt).toLocaleString("id-ID")}
                        </p>
                      </div>
                      {log.note && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {log.note}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Oleh: {log.changedByName}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {transaction.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Catatan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{transaction.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status Pembayaran</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <TransactionStatusBadge
                  status={transaction.paymentStatus}
                  type="payment"
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Tagihan</span>
                  <span>
                    Rp {transaction.totalAmount.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sudah Dibayar</span>
                  <span className="text-green-600">
                    Rp {totalPaid.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Sisa</span>
                  <span
                    className={
                      remainingAmount > 0 ? "text-red-600" : "text-green-600"
                    }
                  >
                    Rp {remainingAmount.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Riwayat Pembayaran</CardTitle>
                {canVerifyPayment &&
                  payments.some((p) => p.verificationStatus === "PENDING") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("/checker/payments/verify")}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Verifikasi
                    </Button>
                  )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Belum ada pembayaran
                  </p>
                ) : (
                  payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex justify-between items-start text-sm p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">
                            {payment.paymentMethodName}
                          </p>
                          {payment.verificationStatus === "PENDING" && (
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              Menunggu
                            </Badge>
                          )}
                          {payment.verificationStatus === "VERIFIED" && (
                            <Badge
                              variant="default"
                              className="text-xs bg-green-100 text-green-700 hover:bg-green-100"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Terverifikasi
                            </Badge>
                          )}
                          {payment.verificationStatus === "REJECTED" && (
                            <Badge variant="destructive" className="text-xs">
                              <X className="h-3 w-3 mr-1" />
                              Ditolak
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payment.createdAt).toLocaleString("id-ID")}
                        </p>
                        {payment.reference && (
                          <p className="text-xs text-muted-foreground">
                            Ref: {payment.reference}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          Rp {payment.amount.toLocaleString("id-ID")}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedPayment(payment);
                            setPaymentDetailOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        totalAmount={transaction.totalAmount}
        paidAmount={totalPaid}
        paymentMethods={paymentMethods}
        onSubmit={handleAddPayment}
      />

      <StatusUpdateDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        currentStatus={transaction.transactionStatus}
        allowedStatuses={allowedStatuses}
        onSubmit={handleUpdateStatus}
      />

      {/* Payment Detail Dialog */}
      <Dialog open={paymentDetailOpen} onOpenChange={setPaymentDetailOpen}>
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
                  <p className="text-muted-foreground">Metode</p>
                  <p className="font-medium">
                    {selectedPayment.paymentMethodName}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Jumlah</p>
                  <p className="font-medium text-lg">
                    Rp {selectedPayment.amount.toLocaleString("id-ID")}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  {selectedPayment.verificationStatus === "PENDING" && (
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Menunggu
                    </Badge>
                  )}
                  {selectedPayment.verificationStatus === "VERIFIED" && (
                    <Badge
                      variant="default"
                      className="text-xs bg-green-100 text-green-700 hover:bg-green-100"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Terverifikasi
                    </Badge>
                  )}
                  {selectedPayment.verificationStatus === "REJECTED" && (
                    <Badge variant="destructive" className="text-xs">
                      <X className="h-3 w-3 mr-1" />
                      Ditolak
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground">Tanggal Bayar</p>
                  <p className="font-medium">
                    {new Date(selectedPayment.paidAt).toLocaleString("id-ID")}
                  </p>
                </div>
                {selectedPayment.verifiedAt && (
                  <div>
                    <p className="text-muted-foreground">Diverifikasi Pada</p>
                    <p className="font-medium text-green-600">
                      {new Date(selectedPayment.verifiedAt).toLocaleString(
                        "id-ID"
                      )}
                    </p>
                  </div>
                )}
              </div>

              {selectedPayment.reference && (
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">
                    Referensi Pembayaran
                  </p>
                  <p className="font-medium">{selectedPayment.reference}</p>
                </div>
              )}

              {/* Payment Proof Section */}
              {selectedPayment.proofImagePath && proofImageData ? (
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Bukti Pembayaran
                  </p>
                  <div className="space-y-2">
                    <img
                      src={proofImageData}
                      alt="Bukti Pembayaran"
                      className="w-full rounded border"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        // Open in new window with data URL
                        const newWindow = window.open();
                        if (newWindow) {
                          newWindow.document.write(
                            `<img src="${proofImageData}" style="max-width:100%;height:auto;" />`
                          );
                        }
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Lihat Ukuran Penuh
                    </Button>
                  </div>
                </div>
              ) : (
                selectedPayment.paymentMethodName !== "CASH" && (
                  <div className="bg-muted rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Belum ada bukti pembayaran
                    </p>
                  </div>
                )
              )}

              {selectedPayment.verificationStatus === "REJECTED" &&
                selectedPayment.rejectionReason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-red-700 mb-2">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium">Alasan Penolakan</span>
                    </div>
                    <p className="text-sm text-red-600">
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
    </div>
  );
}
