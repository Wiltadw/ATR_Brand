import { ApiError } from "./api";

/**
 * محدودکننده نرخ ساده در حافظه (مناسب یک سرور). اگر بعداً چند سرور داشتید،
 * باید به Redis یا سرویس مشابه منتقل شود.
 */
const buckets = new Map<string, number[]>();

export function clientIp(req: Request): string {
  // پشت پروکسی/هاست معتبر، این هدر توسط خود هاست پر می‌شود
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "local";
}

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    const retry = Math.ceil((windowMs - (now - hits[0])) / 1000);
    throw new ApiError(429, `تعداد درخواست‌ها زیاد است. ${retry} ثانیه دیگر دوباره تلاش کنید.`, {
      retryAfterSeconds: retry,
    });
  }
  hits.push(now);
  buckets.set(key, hits);
  // پاک‌سازی گاه‌به‌گاه
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
  }
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}
