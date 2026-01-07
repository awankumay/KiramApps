import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/Shared/Components/UI/Dialog";
import { Button } from "@/Shared/Components/UI/Button";
import { Label } from "@/Shared/Components/UI/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/Shared/Components/UI/Select";
import { Input } from "@/Shared/Components/UI/Input";
import { PaymentMethodData } from "@/Shared/Types/Electron";
import { toast } from "sonner";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  paidAmount: number;
  paymentMethods: PaymentMethodData[];
  onSubmit: (data: {
    method_id: number;
    amount: number;
    reference?: string;
  }) => Promise<void>;
}

export function PaymentDialog({
  open,
  onOpenChange,
  totalAmount,
  paidAmount,
  paymentMethods,
  onSubmit,
}: PaymentDialogProps) {
  const [methodId, setMethodId] = useState<number | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const remainingAmount = totalAmount - paidAmount;
  const isFullyPaid = remainingAmount <= 0;

  useEffect(() => {
    if (open) {
      setMethodId(null);
      setAmount("");
      setReference("");
      setLoading(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!methodId) {
      toast.error("Metode pembayaran harus dipilih");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Jumlah pembayaran harus lebih dari 0");
      return;
    }

    if (amountNum > remainingAmount && !isFullyPaid) {
      toast.error(
        `Jumlah pembayaran tidak boleh melebihi sisa: ${remainingAmount.toLocaleString(
          "id-ID"
        )}`
      );
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        method_id: methodId,
        amount: amountNum,
        reference: reference || undefined,
      });
      toast.success("Pembayaran berhasil ditambahkan");
      onOpenChange(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Gagal menambahkan pembayaran";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Tambah Pembayaran</DialogTitle>
            <DialogDescription>
              {isFullyPaid
                ? "Transaksi ini sudah lunas"
                : `Sisa pembayaran: ${remainingAmount.toLocaleString("id-ID")}`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="method" className="text-right">
                Metode
              </Label>
              <Select
                value={methodId?.toString()}
                onValueChange={(value) => setMethodId(parseInt(value))}
                disabled={isFullyPaid}
              >
                <SelectTrigger id="method" className="col-span-3">
                  <SelectValue placeholder="Pilih metode pembayaran" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id.toString()}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Jumlah
              </Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={remainingAmount.toString()}
                className="col-span-3"
                disabled={isFullyPaid}
                min="0"
                step="0.01"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reference" className="text-right">
                Referensi
              </Label>
              <Input
                id="reference"
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Nomor referensi (opsional)"
                className="col-span-3"
                disabled={isFullyPaid}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <div className="col-span-4 text-sm text-muted-foreground">
                <p>Total: {totalAmount.toLocaleString("id-ID")}</p>
                <p>Sudah dibayar: {paidAmount.toLocaleString("id-ID")}</p>
                <p className="font-medium">
                  Sisa: {remainingAmount.toLocaleString("id-ID")}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading || isFullyPaid}>
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
