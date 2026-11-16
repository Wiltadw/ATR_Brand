import { desc, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { handle, json } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { getCurrencySettings } from "@/lib/currency";

export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin(req);
    const [prod] = await db
      .select({
        total: sql<number>`count(*)`,
        available: sql<number>`coalesce(sum(case when ${schema.products.availability} = 'AVAILABLE' then 1 else 0 end), 0)`,
        unavailable: sql<number>`coalesce(sum(case when ${schema.products.availability} = 'UNAVAILABLE' then 1 else 0 end), 0)`,
        comingSoon: sql<number>`coalesce(sum(case when ${schema.products.availability} = 'COMING_SOON' then 1 else 0 end), 0)`,
        featured: sql<number>`coalesce(sum(case when ${schema.products.featured} then 1 else 0 end), 0)`,
        samples: sql<number>`coalesce(sum(case when ${schema.products.isSample} then 1 else 0 end), 0)`,
      })
      .from(schema.products);
    const byStatus = await db
      .select({ status: schema.orders.status, n: sql<number>`count(*)` })
      .from(schema.orders)
      .groupBy(schema.orders.status);
    const [revenue] = await db
      .select({ sum: sql<number>`coalesce(sum(${schema.orders.totalToman}), 0)` })
      .from(schema.orders)
      .where(sql`${schema.orders.status} NOT IN ('CANCELLED')`);
    const recent = await db.select().from(schema.orders).orderBy(desc(schema.orders.createdAt)).limit(8);
    const currency = await getCurrencySettings();

    const statusCounts = Object.fromEntries(byStatus.map((r) => [r.status, Number(r.n)]));
    return json({
      products: Object.fromEntries(Object.entries(prod).map(([k, v]) => [k, Number(v)])),
      orders: {
        total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
        byStatus: statusCounts,
        // جمع درخواست‌های غیرلغوشده؛ پرداختی ثبت نشده است، پس «درآمد» نیست
        requestedValueToman: Number(revenue.sum),
      },
      recentOrders: recent.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        status: o.status,
        totalToman: o.totalToman,
        createdAt: o.createdAt.toISOString(),
      })),
      currency: {
        rate: currency.effectiveRate,
        source: currency.effectiveSource,
        lastStatus: currency.lastStatus,
        lastError: currency.lastError,
        lastSuccessAt: currency.lastSuccessAt?.toISOString() ?? null,
      },
    });
  });
}
