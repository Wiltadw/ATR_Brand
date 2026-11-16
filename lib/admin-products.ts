import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { ApiError } from "./api";
import { recordPrice } from "./currency";
import { buildSearchText } from "./products";
import { randomSuffix, slugify } from "./text";
import { deleteImageFile } from "./uploads";
import type { ProductInput } from "./validation";

const { products, productTags, productImages, tags, categories } = schema;

async function uniqueSlug(base: string, ignoreId?: number) {
  const root = slugify(base) || "perfume";
  let slug = root;
  for (let i = 0; i < 10; i++) {
    const [hit] = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug));
    if (!hit || hit.id === ignoreId) return slug;
    slug = `${root}-${randomSuffix(4)}`;
  }
  return `${root}-${randomSuffix(8)}`;
}

async function assertRefs(input: ProductInput) {
  if (input.categoryId) {
    const [c] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, input.categoryId));
    if (!c) throw new ApiError(400, "دسته‌بندی انتخاب‌شده وجود ندارد");
  }
  if (input.tagIds.length) {
    const found = await db.select({ id: tags.id }).from(tags).where(inArray(tags.id, input.tagIds));
    if (found.length !== new Set(input.tagIds).size) throw new ApiError(400, "یکی از تگ‌های انتخاب‌شده وجود ندارد");
  }
}

function toRow(input: ProductInput) {
  return {
    name: input.name,
    nameEn: input.nameEn,
    brand: input.brand,
    categoryId: input.categoryId,
    priceAedMinor: input.priceAed,
    discountPercent: input.discountPercent,
    discountEndsAt: input.discountPercent ? input.discountEndsAt : null,
    shortDescription: input.shortDescription,
    description: input.description,
    gender: input.gender,
    fragranceFamily: input.fragranceFamily,
    topNotes: input.topNotes,
    middleNotes: input.middleNotes,
    baseNotes: input.baseNotes,
    longevity: input.longevity,
    projection: input.projection,
    availability: input.availability,
    featured: input.featured,
    bestSeller: input.bestSeller,
    searchText: buildSearchText(input),
  };
}

export async function createProduct(input: ProductInput) {
  await assertRefs(input);
  const slug = await uniqueSlug(input.nameEn || `${input.brand} ${input.name}`);
  const [created] = await db
    .insert(products)
    .values({ ...toRow(input), slug })
    .returning();
  const uniqueTags = [...new Set(input.tagIds)];
  if (uniqueTags.length) {
    await db.insert(productTags).values(uniqueTags.map((tagId) => ({ productId: created.id, tagId })));
  }
  await recordPrice(created, "INITIAL");
  return created;
}

export async function updateProduct(id: number, input: ProductInput) {
  const [before] = await db.select().from(products).where(eq(products.id, id));
  if (!before) throw new ApiError(404, "محصول پیدا نشد");
  await assertRefs(input);
  const row = toRow(input);
  const [after] = await db
    .update(products)
    .set({ ...row, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();

  // تگ‌ها کامل جایگزین می‌شوند
  await db.delete(productTags).where(eq(productTags.productId, id));
  const uniqueTags = [...new Set(input.tagIds)];
  if (uniqueTags.length) {
    await db.insert(productTags).values(uniqueTags.map((tagId) => ({ productId: id, tagId })));
  }

  // تغییر دستی قیمت درهمی یا تخفیف، جدا از تغییر نرخ ارز در تاریخچه ثبت می‌شود
  if (before.priceAedMinor !== after.priceAedMinor) {
    await recordPrice(after, "AED_CHANGE");
  } else if (
    before.discountPercent !== after.discountPercent ||
    (before.discountEndsAt?.getTime() ?? null) !== (after.discountEndsAt?.getTime() ?? null)
  ) {
    await recordPrice(after, "DISCOUNT_CHANGE");
  }
  return after;
}

export async function deleteProduct(id: number) {
  const [p] = await db.select().from(products).where(eq(products.id, id));
  if (!p) throw new ApiError(404, "محصول پیدا نشد");
  const imgs = await db.select().from(productImages).where(eq(productImages.productId, id));
  await db.delete(products).where(eq(products.id, id)); // تگ‌ها و تاریخچه خودکار حذف می‌شوند؛ سفارش‌های قبلی حفظ می‌شوند
  await Promise.all(imgs.map((i) => deleteImageFile(i.filename)));
}
