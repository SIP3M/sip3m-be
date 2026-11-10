import { prisma } from "../prisma";
import { HttpError } from "../common/errors/http-error";
import { GOOGLE_CONFIG_KEYS } from "../auth/oauth.service";
import { UpdateGoogleOAuthInput } from "./system-config.validation";

/**
 * System Config — pengaturan sistem yang dikelola ADMIN_SISTEM.
 * Saat ini: kredensial OAuth Google (Client ID & Client Secret).
 *
 * Nilai disimpan di tabel `system_config`, jadi bisa diganti kapan pun
 * tanpa deploy ulang.
 */

export interface GoogleOAuthConfigView {
  client_id: string;
  /** Secret di-mask — asli tidak pernah dikirim ke FE. */
  client_secret_masked: string | null;
  is_configured: boolean;
  updated_at: string | null;
}

/** Masking secret: `GOCSPX-abc…wxyz` (hanya 4 karakter pertama & terakhir). */
const maskSecret = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length <= 8) return "****";
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
};

export const getGoogleOAuthView = async (): Promise<GoogleOAuthConfigView> => {
  const rows = await prisma.systemConfig.findMany({
    where: { key: { in: [GOOGLE_CONFIG_KEYS.CLIENT_ID, GOOGLE_CONFIG_KEYS.CLIENT_SECRET] } },
    select: { key: true, value: true, updated_at: true },
  });

  const map = new Map(rows.map((r) => [r.key, r]));
  const clientId = map.get(GOOGLE_CONFIG_KEYS.CLIENT_ID)?.value.trim() ?? "";
  const clientSecret =
    map.get(GOOGLE_CONFIG_KEYS.CLIENT_SECRET)?.value.trim() ?? "";
  const updatedAt =
    map.get(GOOGLE_CONFIG_KEYS.CLIENT_ID)?.updated_at ??
    map.get(GOOGLE_CONFIG_KEYS.CLIENT_SECRET)?.updated_at ??
    null;

  return {
    client_id: clientId,
    client_secret_masked: clientSecret ? maskSecret(clientSecret) : null,
    is_configured: Boolean(clientId && clientSecret),
    updated_at: updatedAt ? updatedAt.toISOString() : null,
  };
};

/**
 * Simpan kredensial Google. `client_secret` kosong → pertahankan nilai lama.
 */
export const saveGoogleOAuth = async (
  input: UpdateGoogleOAuthInput,
): Promise<GoogleOAuthConfigView> => {
  const clientId = input.client_id.trim();
  const incomingSecret = (input.client_secret ?? "").trim();

  if (!clientId) {
    throw new HttpError("Client ID wajib diisi.", 400);
  }

  const existingSecret = await prisma.systemConfig.findUnique({
    where: { key: GOOGLE_CONFIG_KEYS.CLIENT_SECRET },
    select: { value: true },
  });

  // Secret lama dipertahankan bila admin tidak menggantinya.
  const secretToSave =
    incomingSecret || existingSecret?.value.trim() || "";

  if (!secretToSave) {
    throw new HttpError("Client Secret wajib diisi.", 400);
  }

  await prisma.$transaction([
    prisma.systemConfig.upsert({
      where: { key: GOOGLE_CONFIG_KEYS.CLIENT_ID },
      update: { value: clientId },
      create: { key: GOOGLE_CONFIG_KEYS.CLIENT_ID, value: clientId },
    }),
    prisma.systemConfig.upsert({
      where: { key: GOOGLE_CONFIG_KEYS.CLIENT_SECRET },
      update: { value: secretToSave },
      create: { key: GOOGLE_CONFIG_KEYS.CLIENT_SECRET, value: secretToSave },
    }),
  ]);

  return getGoogleOAuthView();
};
