import { handle, json, readJson } from "@/lib/api";
import { priceCart } from "@/lib/orders";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { quoteInput } from "@/lib/validation";

/** قیمت‌گذاری سبد خرید توسط سرور (برای نمایش سبد و صفحه تسویه) */
export async function POST(req: Request) {
  return handle(async () => {
    rateLimit(`quote:${clientIp(req)}`, 60, 60_000);
    const { items } = quoteInput.parse(await readJson(req));
    return json(await priceCart(items));
  });
}
