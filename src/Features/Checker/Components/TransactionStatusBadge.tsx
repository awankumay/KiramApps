import { Badge } from "@/Shared/Components/UI/Badge";
import { TransactionStatus, PaymentStatus } from "@/Shared/Types/Electron";

interface TransactionStatusBadgeProps {
  status: TransactionStatus | PaymentStatus;
  type?: "transaction" | "payment";
}

const transactionStatusConfig: Record<
  TransactionStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  CREATED: { label: "Dibuat", variant: "outline" },
  QUEUED: { label: "Antrian", variant: "secondary" },
  LOADING: { label: "Memuat", variant: "default" },
  DONE: { label: "Selesai", variant: "default" },
  CHECKED_OUT: { label: "Keluar", variant: "secondary" },
};

const paymentStatusConfig: Record<
  PaymentStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  UNPAID: { label: "Belum Bayar", variant: "destructive" },
  PAID: { label: "Lunas", variant: "default" },
};

export function TransactionStatusBadge({
  status,
  type = "transaction",
}: TransactionStatusBadgeProps) {
  const config =
    type === "transaction"
      ? transactionStatusConfig[status as TransactionStatus]
      : paymentStatusConfig[status as PaymentStatus];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
