import { handle, json } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { runAutoUpdate } from "@/lib/currency";
import { rateLimit } from "@/lib/ratelimit";

/** دکمه «بروزرسانی همین حالا» در پنل مدیر */
export async function POST(req: Request) {
  return handle(async () => {
    const admin = await requireAdmin(req);
    rateLimit(`rate-refresh:${admin.id}`, 6, 10 * 60_000);
    const outcome = await runAutoUpdate({ force: true });
    return json(outcome, { status: outcome.ok ? 200 : 502 });
  });
}
