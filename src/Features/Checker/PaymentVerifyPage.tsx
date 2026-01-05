import { useState } from "react";
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

// Mock data
const mockPayments = [
  {
    id: "PAY-001",
    transactionId: "TRX-001",
    customer: "PT. Sumber Makmur",
    amount: 1500000,
    paymentDate: "2024-01-15",
    paymentMethod: "Transfer Bank",
    proof: "transfer_001.jpg",
    status: "pending",
    submittedAt: "2024-01-15 10:30",
  },
  {
    id: "PAY-002",
    transactionId: "TRX-002",
    customer: "CV. Karya Jaya",
    amount: 2500000,
    paymentDate: "2024-01-14",
    paymentMethod: "Cash",
    proof: "cash_002.jpg",
    status: "pending",
    submittedAt: "2024-01-14 14:00",
  },
  {
    id: "PAY-003",
    transactionId: "TRX-003",
    customer: "UD. Mitra Sejahtera",
    amount: 800000,
    paymentDate: "2024-01-13",
    paymentMethod: "Transfer Bank",
    proof: "transfer_003.jpg",
    status: "verified",
    verifiedAt: "2024-01-13 16:00",
  },
  {
    id: "PAY-004",
    transactionId: "TRX-004",
    customer: "PT. Bangun Persada",
    amount: 3200000,
    paymentDate: "2024-01-12",
    paymentMethod: "Giro",
    proof: "giro_004.jpg",
    status: "rejected",
    rejectedAt: "2024-01-12 11:00",
    rejectionReason: "Jumlah tidak sesuai",
  },
];

type PaymentStatus = "pending" | "verified" | "rejected";

const statusConfig: Record<
  PaymentStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  pending: { label: "Menunggu", variant: "secondary" },
  verified: { label: "Terverifikasi", variant: "default" },
  rejected: { label: "Ditolak", variant: "destructive" },
};

export function PaymentVerifyPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<
    (typeof mockPayments)[0] | null
  >(null);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const pendingCount = mockPayments.filter(
    (p) => p.status === "pending"
  ).length;
  const verifiedCount = mockPayments.filter(
    (p) => p.status === "verified"
  ).length;
  const rejectedCount = mockPayments.filter(
    (p) => p.status === "rejected"
  ).length;

  const filteredPayments = mockPayments.filter(
    (p) =>
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.transactionId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleVerify = () => {
    alert(`Pembayaran ${selectedPayment?.id} berhasil diverifikasi (mock)`);
    setShowVerifyDialog(false);
    setSelectedPayment(null);
  };

  const handleReject = () => {
    alert(
      `Pembayaran ${selectedPayment?.id} ditolak: ${rejectionReason} (mock)`
    );
    setShowRejectDialog(false);
    setRejectionReason("");
    setSelectedPayment(null);
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

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menunggu</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
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
              {verifiedCount}
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
              {rejectedCount}
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
          <CardTitle>Daftar Pembayaran</CardTitle>
          <CardDescription>
            Klik untuk melihat detail dan verifikasi
          </CardDescription>
          <div className="relative w-full md:w-64 mt-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari pembayaran..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
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
                const status = statusConfig[payment.status as PaymentStatus];
                return (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.id}</TableCell>
                    <TableCell>{payment.transactionId}</TableCell>
                    <TableCell>{payment.customer}</TableCell>
                    <TableCell>{payment.paymentMethod}</TableCell>
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
                        {payment.status === "pending" && (
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
                  <p className="font-medium">{selectedPayment.transactionId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedPayment.customer}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Metode</p>
                  <p className="font-medium">{selectedPayment.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tanggal</p>
                  <p className="font-medium">{selectedPayment.paymentDate}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Jumlah</p>
                  <p className="font-medium text-lg">
                    Rp {selectedPayment.amount.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="bg-muted rounded-lg p-4 flex items-center justify-center min-h-[200px]">
                <div className="text-center text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Bukti: {selectedPayment.proof}</p>
                  <p className="text-xs">(Preview placeholder)</p>
                </div>
              </div>
              {selectedPayment.status === "rejected" &&
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
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                {selectedPayment.id} - {selectedPayment.customer}
              </p>
              <p className="text-lg font-bold">
                Rp {selectedPayment.amount.toLocaleString()}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowVerifyDialog(false)}
            >
              Batal
            </Button>
            <Button
              onClick={handleVerify}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-2" />
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
                {selectedPayment.id} - {selectedPayment.customer}
              </p>
              <div className="space-y-2">
                <Label>Alasan Penolakan</Label>
                <Textarea
                  placeholder="Masukkan alasan penolakan..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
            >
              Batal
            </Button>
            <Button
              onClick={handleReject}
              variant="destructive"
              disabled={!rejectionReason}
            >
              <X className="h-4 w-4 mr-2" />
              Tolak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
