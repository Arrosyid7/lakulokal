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
  youtube_url: z.url("Masukkan URL YouTube yang valid").max(2048),
  package_id: z.string().min(1)
}).refine(({ youtube_url }) => {
  try {
    const url = new URL(youtube_url);
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}, { message: "URL harus berasal dari YouTube", path: ["youtube_url"] });

export function validationMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Data yang dikirim tidak valid";
}
