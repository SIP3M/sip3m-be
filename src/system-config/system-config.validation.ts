import { z } from "zod";

/**
 * Validasi penyimpanan kredensial OAuth Google.
 * - client_id wajib diisi ulang saat menyimpan.
 * - client_secret opsional: kosong = pertahankan secret lama (karena GET
 *   hanya mengembalikan nilai ter-masking).
 */
export const updateGoogleOAuthSchema = z.object({
  client_id: z
    .string()
    .trim()
    .min(1, "Client ID wajib diisi.")
    .max(300, "Client ID maksimal 300 karakter."),
  client_secret: z
    .string()
    .trim()
    .max(300, "Client Secret maksimal 300 karakter.")
    .optional()
    .default(""),
});

export type UpdateGoogleOAuthInput = z.infer<typeof updateGoogleOAuthSchema>;
