import { and, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { handle, json } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { ORDER_STATUSES } from "@/db/schema";

export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin(req);
    const sp = new URL(req.url).searchParams;
    const conds: SQL[] = [];
    const status = sp.get("status");
    if (status && (ORDER_STATUSES as readonly string[]).includes(status)) {
      conds.push(eq(schema.orders.status, status as (typeof ORDER_STATUSES)[number]));
    }
    const q = sp.get("q")?.trim().slice(0, 60);
    if (q) {
      const like_ = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      conds.push(
        or(
          sql`${schema.orders.orderNumber} LIKE ${like_} ESCAPE '\\'`,
          sql`${schema.orders.customerName} LIKE ${like_} ESCAPE '\\'`,
          like(schema.orders.phone, `%${q.replace(/[^\d]/g, "")}%`),
        )!,
      );
    }
    const page = Math.max(Number(sp.get("page")) || 1, 1);
    const pageSize = Math.min(Math.max(Number(sp.get("limit")) || 20, 1), 100);
    const where = conds.length ? and(...conds) : undefined;

    const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(schema.orders).where(where);
    const rows = await db
      .select()
      .from(schema.orders)
      .where(where)
      .orderBy(desc(schema.orders.createdAt), desc(schema.orders.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return json({
      orders: rows.map((o) => ({ ...o, createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString() })),
      total: Number(total),
      page,
      pageSize,
    });
  });
}
