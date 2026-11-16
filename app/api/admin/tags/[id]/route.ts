import { and, eq, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { ApiError, handle, intParam, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { tagInput } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  return handle(async () => {
    await requireAdmin(req);
    const id = intParam((await ctx.params).id);
    const input = tagInput.parse(await readJson(req));
    const [dup] = await db
      .select({ id: schema.tags.id })
      .from(schema.tags)
      .where(and(eq(schema.tags.name, input.name), ne(schema.tags.id, id)));
    if (dup) throw new ApiError(409, "تگی با این نام از قبل وجود دارد");
    // اسلاگ ثابت می‌ماند تا لینک‌های فیلتر قدیمی خراب نشوند
    const [tag] = await db.update(schema.tags).set(input).where(eq(schema.tags.id, id)).returning();
    if (!tag) throw new ApiError(404, "تگ پیدا نشد");
    return json({ tag });
  });
}

/** حذف تگ؛ از همه محصولات هم برداشته می‌شود (خود محصولات حذف نمی‌شوند) */
export async function DELETE(req: Request, ctx: Ctx) {
  return handle(async () => {
    await requireAdmin(req);
    const id = intParam((await ctx.params).id);
    const deleted = await db.delete(schema.tags).where(eq(schema.tags.id, id)).returning();
    if (!deleted.length) throw new ApiError(404, "تگ پیدا نشد");
    return json({ ok: true });
  });
}
