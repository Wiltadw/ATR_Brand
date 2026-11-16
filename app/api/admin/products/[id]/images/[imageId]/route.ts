import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ApiError, handle, intParam, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { deleteImageFile, imageUrl, saveImage } from "@/lib/uploads";

type Ctx = { params: Promise<{ id: string; imageId: string }> };

async function findImage(ctx: Ctx) {
  const { id, imageId } = await ctx.params;
  const productId = intParam(id);
  const iid = intParam(imageId, "شناسه تصویر");
  const [img] = await db
    .select()
    .from(schema.productImages)
    .where(and(eq(schema.productImages.id, iid), eq(schema.productImages.productId, productId)));
  if (!img) throw new ApiError(404, "تصویر پیدا نشد");
  return img;
}

/** جایگزینی تصویر (multipart: file) یا تغییر متن جایگزین/ترتیب (JSON: alt, sortOrder) */
export async function PUT(req: Request, ctx: Ctx) {
  return handle(async () => {
    await requireAdmin(req);
    const img = await findImage(ctx);
    const type = req.headers.get("content-type") ?? "";

    if (type.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) throw new ApiError(400, "فایل تصویر ارسال نشد");
      const filename = await saveImage(file); // اول ذخیره می‌کنیم تا اگر خطا شد تصویر قبلی سالم بماند
      await db.update(schema.productImages).set({ filename }).where(eq(schema.productImages.id, img.id));
      await deleteImageFile(img.filename);
      return json({ image: { id: img.id, url: imageUrl(filename) } });
    }

    const body = (await readJson(req)) as { alt?: unknown; sortOrder?: unknown };
    const patch: { alt?: string | null; sortOrder?: number } = {};
    if (typeof body.alt === "string" || body.alt === null) patch.alt = (body.alt as string | null)?.slice(0, 200) || null;
    if (Number.isInteger(body.sortOrder) && (body.sortOrder as number) >= 0) patch.sortOrder = body.sortOrder as number;
    if (!Object.keys(patch).length) throw new ApiError(400, "چیزی برای تغییر ارسال نشد");
    await db.update(schema.productImages).set(patch).where(eq(schema.productImages.id, img.id));
    return json({ ok: true });
  });
}

export async function DELETE(req: Request, ctx: Ctx) {
  return handle(async () => {
    await requireAdmin(req);
    const img = await findImage(ctx);
    await db.delete(schema.productImages).where(eq(schema.productImages.id, img.id));
    await deleteImageFile(img.filename);
    return json({ ok: true });
  });
}
