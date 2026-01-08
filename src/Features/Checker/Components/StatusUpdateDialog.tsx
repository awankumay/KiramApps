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
import { Textarea } from "@/Shared/Components/UI/Textarea";
import { TransactionStatus } from "@/Shared/Types/Electron";
import { toast } from "sonner";

interface StatusUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatus: TransactionStatus;
  allowedStatuses: TransactionStatus[];
  onSubmit: (data: {
    status: TransactionStatus;
    note?: string;
  }) => Promise<void>;
}

const statusLabels: Record<TransactionStatus, string> = {
  CREATED: "Dibuat",
  QUEUED: "Antrian",
  LOADING: "Memuat",
  DONE: "Selesai",
  CHECKED_OUT: "Keluar",
};

export function StatusUpdateDialog({
  open,
  onOpenChange,
  currentStatus,
  allowedStatuses,
  onSubmit,
}: StatusUpdateDialogProps) {
  const [status, setStatus] = useState<TransactionStatus | null>(null);
  const [note, setNote] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setStatus(null);
      setNote("");
      setLoading(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!status) {
      toast.error("Status harus dipilih");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        status,
        note: note || undefined,
      });
      toast.success("Status berhasil diperbarui");
      onOpenChange(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Gagal memperbarui status";
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
            <DialogTitle>Update Status Transaksi</DialogTitle>
            <DialogDescription>
              Status saat ini: <strong>{statusLabels[currentStatus]}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status Baru
              </Label>
              <Select
                value={status || ""}
                onValueChange={(value) => setStatus(value as TransactionStatus)}
              >
                <SelectTrigger id="status" className="col-span-3">
                  <SelectValue placeholder="Pilih status baru" />
                </SelectTrigger>
                <SelectContent>
                  {allowedStatuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="note" className="text-right">
                Catatan
              </Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Catatan opsional..."
                className="col-span-3"
                rows={3}
              />
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
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
