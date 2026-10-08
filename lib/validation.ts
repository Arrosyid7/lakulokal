import { z } from "zod";

export const registerSchema = z.object({
  full_name: z.string().trim().min(1, "Nama wajib diisi").max(120),
  email: z.email("Email tidak valid").transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8, "Password minimal 8 karakter"),
  confirm_password: z.string()
}).refine((data) => data.password === data.confirm_password, {
  message: "Konfirmasi password tidak sama",
  path: ["confirm_password"]
});

export const loginSchema = z.object({
  email: z.email("Email tidak valid").transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1, "Password wajib diisi")
});

export const orderSchema = z.object({
  package_id: z.string().min(1)
});

export const browserProcessingSchema = z.object({
  status: z.enum(["PROCESSING", "COMPLETED", "FAILED"]),
  progress: z.number().int().min(0).max(100),
  error_message: z.string().trim().max(400).nullable().optional()
});

export function validationMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Data yang dikirim tidak valid";
}
