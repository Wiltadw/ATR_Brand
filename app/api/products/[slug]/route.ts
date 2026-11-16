import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ApiError, handle, json } from "@/lib/api";
import { getPriceHistory, hydrate, relatedProducts } from "@/lib/products";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  return handle(async () => {
    const { slug } = await ctx.params;
    const [row] = await db.select().from(schema.products).where(eq(schema.products.slug, slug));
    if (!row) throw new ApiError(404, "محصول پیدا نشد");
    const [product] = await hydrate([row]);
    const [related, history] = await Promise.all([relatedProducts(row), getPriceHistory(row.id)]);
    return json({
      product,
      related,
      priceHistory: history,
      // نمودار فقط وقتی حداقل دو نقطه واقعی داریم معنی دارد
      priceHistoryChartReady: history.length >= 2,
    });
  });
}
