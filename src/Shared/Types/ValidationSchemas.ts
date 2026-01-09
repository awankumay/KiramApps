import { z } from "zod";
import { CustomerCategory } from "./Customer";

/**
 * Customer validation schemas
 */
export const CustomerCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Nama customer wajib diisi")
    .max(255, "Nama customer maksimal 255 karakter"),
  category: z.nativeEnum(CustomerCategory, {
    message: "Kategori customer harus PERSONAL atau COMPANY",
  }),
  code: z
    .string()
    .min(1, "Code wajib diisi")
    .max(50, "Code maksimal 50 karakter")
    .regex(
      /^[A-Z0-9_-]+$/,
      "Code hanya boleh mengandung huruf kapital, angka, underscore, dan dash"
    ),
});

export const CustomerUpdateSchema = z.object({
  id: z.number().int().positive("ID customer harus valid"),
  name: z
    .string()
    .min(1, "Nama customer wajib diisi")
    .max(255, "Nama customer maksimal 255 karakter")
    .optional(),
  category: z
    .nativeEnum(CustomerCategory, {
      message: "Kategori customer harus PERSONAL atau COMPANY",
    })
    .optional(),
  code: z
    .string()
    .min(1, "Code wajib diisi")
    .max(50, "Code maksimal 50 karakter")
    .regex(
      /^[A-Z0-9_-]+$/,
      "Code hanya boleh mengandung huruf kapital, angka, underscore, dan dash"
    )
    .optional(),
  is_active: z.boolean().optional(),
});

export const CustomerFilterSchema = z.object({
  name: z.string().optional(),
  category: z.nativeEnum(CustomerCategory).optional(),
  is_active: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

/**
 * Vehicle validation schemas
 */
export const VehicleCreateSchema = z.object({
  plate_number: z
    .string()
    .min(1, "Nomor plat wajib diisi")
    .max(20, "Nomor plat maksimal 20 karakter"),
  customer_id: z.number().int().positive("ID customer harus valid"),
});

export const VehicleUpdateSchema = z.object({
  id: z.number().int().positive("ID kendaraan harus valid"),
  plate_number: z
    .string()
    .min(1, "Nomor plat wajib diisi")
    .max(20, "Nomor plat maksimal 20 karakter")
    .optional(),
  customer_id: z.number().int().positive("ID customer harus valid").optional(),
  is_active: z.boolean().optional(),
});

export const VehicleFilterSchema = z.object({
  plate_number: z.string().optional(),
  customer_id: z.number().int().positive().optional(),
  is_active: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});
