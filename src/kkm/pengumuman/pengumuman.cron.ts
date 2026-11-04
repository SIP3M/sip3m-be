import { publishDuePengumuman } from "./kkm-pengumuman.service";

const CRON_MS = 60 * 1000; // tiap 60 detik

let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Terbitkan pengumuman berstatus SCHEDULED yang jatuh tempo
 * (`scheduled_at <= now`) — fan-out notifikasi dijalankan saat publish.
 * Pola sama dengan kkm-period.cron.ts (interval tanpa dependency cron).
 */
export const startPengumumanCron = () => {
  if (timer) return;

  const run = async () => {
    try {
      const count = await publishDuePengumuman();
      if (count > 0) {
        console.log(`[PENGUMUMAN_CRON] Menerbitkan ${count} pengumuman terjadwal.`);
      }
    } catch (err) {
      console.error("[PENGUMUMAN_CRON_ERROR]", err);
    }
  };

  // jalankan sekali sesaat setelah boot (tunggu DB siap)
  setTimeout(run, 15_000);

  timer = setInterval(run, CRON_MS);
  console.log("[PENGUMUMAN_CRON] Pengumuman terjadwal cron started (interval: 60s).");
};

export const stopPengumumanCron = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
};
