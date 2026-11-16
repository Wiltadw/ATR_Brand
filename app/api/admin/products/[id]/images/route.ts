import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { ApiError, handle, intParam, json } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { imageUrl, saveImage } from "@/lib/uploads";

type Ctx = { params: Promise<{ id: string }> };
const MAX_IMAGES_PER_PRODUCT = 8;

/** آپلود یک یا چند تصویر (multipart/form-data، فیلد file) */
export async function POST(req: Request, ctx: Ctx) {
  return handle(async () => {
    await requireAdmin(req);
    const productId = intParam((await ctx.params).id);
    const [p] = await db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.id, productId));
    if (!p) throw new ApiError(404, "محصول پیدا نشد");

    const form = await req.formData().catch(() => null);
    const files = (form?.getAll("file") ?? []).filter((f): f is File => f instanceof File);
    if (!files.length) throw new ApiError(400, "هیچ تصویری ارسال نشد");

    const [{ n, maxOrder }] = await db
      .select({ n: sql<number>`count(*)`, maxOrder: sql<number>`coalesce(max(${schema.productImages.sortOrder}), -1)` })
      .from(schema.productImages)
      .where(eq(schema.productImages.productId, productId));
    if (Number(n) + files.length > MAX_IMAGES_PER_PRODUCT) {
      throw new ApiError(400, `هر محصول حداکثر ${MAX_IMAGES_PER_PRODUCT} تصویر می‌تواند داشته باشد`);
    }

    const created = [];
    let order = Number(maxOrder) + 1;
    for (const file of files) {
      const filename = await saveImage(file);
      const [row] = await db
        .insert(schema.productImages)
        .values({ productId, filename, sortOrder: order++ })
        .returning();
      created.push({ id: row.id, url: imageUrl(row.filename), sortOrder: row.sortOrder });
    }
    return json({ images: created }, { status: 201 });
  });
}
