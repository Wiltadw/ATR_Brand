/**
 * زمان‌بند سمت سرور: هر ۲۴ ساعت (ساعت ۳ بامداد به وقت تهران) نرخ درهم را بروزرسانی می‌کند.
 * این کد فقط روی سرور اجرا می‌شود و هیچ ربطی به مرورگر کاربران ندارد.
 * اگر روی هاستی هستید که سرور را بین درخواست‌ها خاموش می‌کند، ENABLE_INTERNAL_CRON=false بگذارید
 * و از cron خود هاست برای صدا زدن /api/cron/update-rate استفاده کنید (راهنمای انتشار را ببینید).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.ENABLE_INTERNAL_CRON === "false") return;

  const g = globalThis as unknown as { __atrCronStarted?: boolean };
  if (g.__atrCronStarted) return; // جلوگیری از ثبت دوباره هنگام ری‌لود
  g.__atrCronStarted = true;

  const cron = (await import("node-cron")).default;
  const { runAutoUpdate } = await import("./lib/currency");

  cron.schedule(
    "0 3 * * *",
    async () => {
      try {
        const r = await runAutoUpdate();
        console.log(`[cron] currency update: ${r.ok ? "ok" : "FAILED"} - ${r.message}`);
      } catch (e) {
        console.error("[cron] currency update crashed:", e);
      }
    },
    { timezone: "Asia/Tehran" },
  );
  console.log("[cron] daily currency update scheduled for 03:00 Asia/Tehran");
}
