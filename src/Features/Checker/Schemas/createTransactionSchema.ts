import { z } from "zod";

export const createTransactionSchema = z.object({
  transactionTypeId: z.number().min(1, "Tipe transaksi harus dipilih"),
  customerId: z.number().min(1, "Customer harus dipilih"),
  vehicleId: z.number().min(1, "Kendaraan harus dipilih"),
  items: z
    .array(
      z.object({
        itemId: z.number().min(1, "Item harus dipilih"),
        qty: z.number().min(1, "Qty harus lebih dari 0"),
        price: z.number().min(0, "Harga harus lebih dari 0"),
      })
    )
    .min(1, "Minimal satu item harus ditambahkan"),
  notes: z.string().optional(),
});

export type CreateTransactionFormData = z.infer<typeof createTransactionSchema>;
