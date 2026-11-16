import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ApiError, handle, intParam, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { orderPatchInput } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

async function load(id: number) {
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, id));
  if (!order) throw new ApiError(404, "سفارش پیدا نشد");
  const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, id));
  return {
    order: { ...order, createdAt: order.createdAt.toISOString(), updatedAt: order.updatedAt.toISOString() },
    items: items.map((i) => ({ ...i, unitPriceAed: i.unitPriceAedMinor / 100, lineToman: i.unitPriceToman * i.quantity })),
  };
}

export async function GET(req: Request, ctx: Ctx) {
  return handle(async () => {
    await requireAdmin(req);
    return json(await load(intParam((await ctx.params).id)));
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  return handle(async () => {
    await requireAdmin(req);
    const id = intParam((await ctx.params).id);
    const patch = orderPatchInput.parse(await readJson(req));
    if (patch.status === undefined && patch.adminNote === undefined) {
      throw new ApiError(400, "چیزی برای تغییر ارسال نشد");
    }
    const [updated] = await db
      .update(schema.orders)
      .set({
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.adminNote !== undefined ? { adminNote: patch.adminNote } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.orders.id, id))
      .returning({ id: schema.orders.id });
    if (!updated) throw new ApiError(404, "سفارش پیدا نشد");
    return json(await load(id));
  });
}
