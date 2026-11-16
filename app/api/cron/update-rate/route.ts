import { timingSafeEqual } from "node:crypto";
import { ApiError, handle, json } from "@/lib/api";
import { runAutoUpdate } from "@/lib/currency";
import { clientIp, rateLimit } from "@/lib/ratelimit";

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * نقطه‌ای که cron هاست هر ۲۴ ساعت صدا می‌زند:
 *   curl -X POST -H "Authorization: Bearer <CRON_SECRET>" https://example.com/api/cron/update-rate
 * بدون CRON_SECRET درست هیچ‌کس نمی‌تواند آن را اجرا کند.
 */
export async function POST(req: Request) {
  return handle(async () => {
    rateLimit(`cron:${clientIp(req)}`, 10, 60_000);
    const secret = process.env.CRON_SECRET;
    const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    if (!secret || secret.length < 16 || !safeEqual(given, secret)) {
      throw new ApiError(401, "دسترسی غیرمجاز");
    }
    const outcome = await runAutoUpdate();
    return json(outcome, { status: outcome.ok ? 200 : 502 });
  });
}
