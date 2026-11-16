import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ApiError, handle, intParam, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { categoryInput } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  return handle(async () => {
    await requireAdmin(req);
    const id = intParam((await ctx.params).id);
    const input = categoryInput.parse(await readJson(req));
    const [category] = await db.update(schema.categories).set(input).where(eq(schema.categories.id, id)).returning();
    if (!category) throw new ApiError(404, "دسته‌بندی پیدا نشد");
    return json({ category });
  });
}

/** محصولات این دسته حذف نمی‌شوند و فقط بدون دسته می‌شوند */
export async function DELETE(req: Request, ctx: Ctx) {
  return handle(async () => {
    await requireAdmin(req);
    const id = intParam((await ctx.params).id);
    const deleted = await db.delete(schema.categories).where(eq(schema.categories.id, id)).returning();
    if (!deleted.length) throw new ApiError(404, "دسته‌بندی پیدا نشد");
    return json({ ok: true });
  });
}
