import { z } from "zod";

export const createPaymentSchema = z.object({
  method_id: z.number().min(1, "Metode pembayaran harus dipilih"),
  amount: z.number().min(0.01, "Jumlah pembayaran harus lebih dari 0"),
  reference: z.string().optional(),
});

export type CreatePaymentFormData = z.infer<typeof createPaymentSchema>;
