import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ApiError, handle, intParam, json, readJson } from "@/lib/api";
import { deleteProduct, updateProduct } from "@/lib/admin-products";
import { requireAdmin } from "@/lib/auth";
import { getPriceHistory, hydrate } from "@/lib/products";
import { productInput } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  return handle(async () => {
    await requireAdmin(req);
    const id = intParam((await ctx.params).id);
    const [row] = await db.select().from(schema.products).where(eq(schema.products.id, id));
    if (!row) throw new ApiError(404, "محصول پیدا نشد");
    const [product] = await hydrate([row]);
    return json({ product, priceHistory: await getPriceHistory(id) });
  });
}

export async function PUT(req: Request, ctx: Ctx) {
  return handle(async () => {
    await requireAdmin(req);
    const id = intParam((await ctx.params).id);
    const input = productInput.parse(await readJson(req));
    const updated = await updateProduct(id, input);
    const [product] = await hydrate([updated]);
    return json({ product });
  });
}

export async function DELETE(req: Request, ctx: Ctx) {
  return handle(async () => {
    await requireAdmin(req);
    await deleteProduct(intParam((await ctx.params).id));
    return json({ ok: true });
  });
}
