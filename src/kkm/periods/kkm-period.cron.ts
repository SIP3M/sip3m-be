import { autoCompleteExpiredPeriods } from "./kkm-period.service";

const CRON_MS = 24 * 60 * 60 * 1000; // daily

let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Kombinasi Otomatis: ubah AKTIF -> SELESAI jika tgl_penarikan sudah lewat.
 * Dijalankan setiap 24 jam (interval) + sekali saat server start (delayed).
 * Tidak butuh dependency node-cron.
 */
export const startKkmPeriodCron = () => {
  if (timer) return;

  const run = async () => {
    try {
      const result = await autoCompleteExpiredPeriods();
      if (result.count > 0) {
        console.log(`[KKM_CRON] Auto-completed ${result.count} periode(s) -> SELESAI.`);
      }
    } catch (err) {
      console.error("[KKM_CRON_ERROR]", err);
    }
  };

  // run once shortly after boot (allow DB to be ready)
  setTimeout(run, 10_000);

  timer = setInterval(run, CRON_MS);
  console.log("[KKM_CRON] KKM period auto-complete cron started (interval: 24h).");
};

export const stopKkmPeriodCron = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
};
