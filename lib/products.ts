import { and, asc, desc, eq, gte, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { getEffectiveRate } from "./currency";
import { activeDiscount, aedMinorToToman, finalAedMinor, finalAedMinorSql } from "./pricing";
import { normalizeText } from "./text";
import { imageUrl } from "./uploads";

const { products, productImages, productTags, tags, categories, priceHistory } = schema;

type ProductRow = typeof products.$inferSelect;

export type PublicProduct = ReturnType<typeof serializeProduct>;

export function buildSearchText(p: { name: string; nameEn?: string | null; brand: string }) {
  return normalizeText([p.name, p.nameEn ?? "", p.brand].join(" "));
}

export function serializeProduct(
  p: ProductRow,
  extra: {
    tags: { id: number; name: string; slug: string; group: string }[];
    images: { id: number; filename: string; alt: string | null }[];
    categoryName?: string | null;
    rate: number | null;
  },
) {
  const discount = activeDiscount(p);
  const finalMinor = finalAedMinor(p);
  const rate = extra.rate;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    nameEn: p.nameEn,
    brand: p.brand,
    categoryId: p.categoryId,
    category: extra.categoryName ?? null,
    shortDescription: p.shortDescription,
    description: p.description,
    gender: p.gender,
    fragranceFamily: p.fragranceFamily,
    topNotes: p.topNotes,
    middleNotes: p.middleNotes,
    baseNotes: p.baseNotes,
    longevity: p.longevity,
    projection: p.projection,
    availability: p.availability,
    featured: p.featured,
    bestSeller: p.bestSeller,
    isSample: p.isSample,
    priceAed: p.priceAedMinor / 100,
    finalPriceAed: finalMinor / 100,
    discountPercent: discount || null,
    discountEndsAt: discount && p.discountEndsAt ? p.discountEndsAt.toISOString() : null,
    // اگر نرخی تعیین نشده باشد، قیمت تومانی null است (هرگز عدد جعلی نمی‌دهیم)
    priceToman: rate ? aedMinorToToman(finalMinor, rate) : null,
    originalPriceToman: rate ? aedMinorToToman(p.priceAedMinor, rate) : null,
    tags: extra.tags,
    images: extra.images.map((i) => ({ id: i.id, url: imageUrl(i.filename), alt: i.alt })),
    image: extra.images[0] ? imageUrl(extra.images[0].filename) : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

/** تگ‌ها و تصاویر چند محصول را یکجا می‌خواند (بدون N+1) */
export async function hydrate(rows: ProductRow[]): Promise<PublicProduct[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const rate = await getEffectiveRate();
  const [tagRows, imageRows, catRows] = await Promise.all([
    db
      .select({
        productId: productTags.productId,
        id: tags.id,
        name: tags.name,
        slug: tags.slug,
        group: tags.group,
        sortOrder: tags.sortOrder,
      })
      .from(productTags)
      .innerJoin(tags, eq(tags.id, productTags.tagId))
      .where(inArray(productTags.productId, ids))
      .orderBy(asc(tags.sortOrder), asc(tags.id)),
    db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, ids))
      .orderBy(asc(productImages.sortOrder), asc(productImages.id)),
    db.select().from(categories),
  ]);
  const catName = new Map(catRows.map((c) => [c.id, c.name]));
  return rows.map((p) =>
    serializeProduct(p, {
      tags: tagRows.filter((t) => t.productId === p.id),
      images: imageRows.filter((i) => i.productId === p.id),
      categoryName: p.categoryId ? catName.get(p.categoryId) : null,
      rate,
    }),
  );
}

export type ListParams = {
  q?: string;
  gender?: string;
  tagSlugs?: string[];
  minToman?: number;
  maxToman?: number;
  sort?: "newest" | "price_asc" | "price_desc";
  featured?: boolean;
  onSale?: boolean;
  bestSeller?: boolean;
  availability?: string;
  page?: number;
  pageSize?: number;
  includeSamples?: boolean;
  ids?: number[];
};

export async function listProducts(params: ListParams) {
  const rate = await getEffectiveRate();
  const conds: SQL[] = [];

  if (params.q) {
    const words = normalizeText(params.q).split(" ").filter(Boolean).slice(0, 6);
    for (const w of words) {
      const escaped = w.replace(/[\\%_]/g, (c) => `\\${c}`);
      conds.push(sql`${products.searchText} LIKE ${"%" + escaped + "%"} ESCAPE '\\'`);
    }
  }
  if (params.gender && ["MEN", "WOMEN", "UNISEX"].includes(params.gender)) {
    // «یونیسکس» برای همه جنسیت‌ها هم مناسب است
    conds.push(
      params.gender === "UNISEX"
        ? eq(products.gender, "UNISEX")
        : or(eq(products.gender, params.gender as "MEN" | "WOMEN"), eq(products.gender, "UNISEX"))!,
    );
  }
  if (params.availability && ["AVAILABLE", "UNAVAILABLE", "COMING_SOON"].includes(params.availability)) {
    conds.push(eq(products.availability, params.availability as "AVAILABLE"));
  }
  if (params.ids) {
    const ids = params.ids.filter((n) => Number.isInteger(n) && n > 0).slice(0, 60);
    conds.push(ids.length ? inArray(products.id, ids) : sql`0`);
  }
  if (params.featured) conds.push(eq(products.featured, true));
  if (params.bestSeller) conds.push(eq(products.bestSeller, true));
  if (params.onSale) {
    const nowSec = Math.floor(Date.now() / 1000);
    conds.push(
      sql`${products.discountPercent} > 0 AND (${products.discountEndsAt} IS NULL OR ${products.discountEndsAt} > ${nowSec})`,
    );
  }
  if (!params.includeSamples) {
    /* نمونه‌ها فقط تا زمانی که حذف نشده‌اند نمایش داده می‌شوند؛ فیلتری لازم نیست */
  }

  // چند تگ = محصول باید همه تگ‌های انتخاب‌شده را داشته باشد
  const tagSlugs = (params.tagSlugs ?? []).filter(Boolean).slice(0, 10);
  if (tagSlugs.length) {
    conds.push(sql`${products.id} IN (
      SELECT pt.product_id FROM product_tags pt
      JOIN tags t ON t.id = pt.tag_id
      WHERE t.slug IN (${sql.join(tagSlugs.map((s) => sql`${s}`), sql`, `)})
      GROUP BY pt.product_id
      HAVING COUNT(DISTINCT pt.tag_id) = ${tagSlugs.length}
    )`);
  }

  // فیلتر قیمت بر اساس تومان؛ با نرخ فعلی به درهم برمی‌گردد
  const finalExpr = finalAedMinorSql(products);
  if (rate) {
    if (params.minToman && params.minToman > 0) conds.push(gte(finalExpr, Math.floor((params.minToman * 100) / rate)));
    if (params.maxToman && params.maxToman > 0) conds.push(lte(finalExpr, Math.ceil((params.maxToman * 100) / rate)));
  }

  const where = conds.length ? and(...conds) : undefined;
  const orderBy =
    params.sort === "price_asc"
      ? [asc(finalExpr), desc(products.id)]
      : params.sort === "price_desc"
        ? [desc(finalExpr), desc(products.id)]
        : [desc(products.createdAt), desc(products.id)];

  const pageSize = Math.min(Math.max(params.pageSize ?? 12, 1), 60);
  const page = Math.max(params.page ?? 1, 1);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(products)
    .where(where);
  const rows = await db
    .select()
    .from(products)
    .where(where)
    .orderBy(...orderBy)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    items: await hydrate(rows),
    total: Number(total),
    page,
    pageSize,
    rateAvailable: !!rate,
  };
}

/** محصولات مشابه: بر اساس تگ مشترک، خانواده بویایی، جنسیت و بازه قیمت */
export async function relatedProducts(product: ProductRow, limit = 4): Promise<PublicProduct[]> {
  const [own, others, otherTags] = await Promise.all([
    db.select({ tagId: productTags.tagId }).from(productTags).where(eq(productTags.productId, product.id)),
    db.select().from(products).where(sql`${products.id} != ${product.id}`),
    db.select().from(productTags),
  ]);
  const ownTags = new Set(own.map((t) => t.tagId));
  const tagsByProduct = new Map<number, number[]>();
  for (const t of otherTags) {
    const arr = tagsByProduct.get(t.productId) ?? [];
    arr.push(t.tagId);
    tagsByProduct.set(t.productId, arr);
  }
  const base = finalAedMinor(product);
  const scored = others
    .map((o) => {
      let score = 0;
      for (const t of tagsByProduct.get(o.id) ?? []) if (ownTags.has(t)) score += 3;
      if (product.fragranceFamily && o.fragranceFamily === product.fragranceFamily) score += 2;
      if (o.gender === product.gender) score += 1;
      const price = finalAedMinor(o);
      if (base > 0 && Math.abs(price - base) / base <= 0.4) score += 1;
      if (o.availability === "AVAILABLE") score += 0.5; // موجودها کمی جلوتر
      return { o, score };
    })
    .filter((x) => x.score >= 1.5)
    .sort((a, b) => b.score - a.score || b.o.id - a.o.id)
    .slice(0, limit)
    .map((x) => x.o);
  return hydrate(scored);
}

/** تاریخچه قیمت واقعی ثبت‌شده؛ چیزی ساخته یا حدس زده نمی‌شود */
export async function getPriceHistory(productId: number) {
  const rows = await db
    .select()
    .from(priceHistory)
    .where(eq(priceHistory.productId, productId))
    .orderBy(asc(priceHistory.createdAt), asc(priceHistory.id));
  return rows.map((r, i) => {
    const prev = rows[i - 1];
    return {
      at: r.createdAt.toISOString(),
      priceAed: r.priceAedMinor / 100,
      discountPercent: r.discountPercent,
      rate: r.rate,
      priceToman: r.priceToman,
      reason: r.reason,
      // تغییر نسبت به ردیف قبلی
      changeToman: prev ? r.priceToman - prev.priceToman : null,
    };
  });
}

/** همه تگ‌ها با تعداد محصول (برای فیلتر و صفحه اصلی) */
export async function listTags() {
  const rows = await db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      group: tags.group,
      productCount: sql<number>`(SELECT COUNT(*) FROM product_tags pt WHERE pt.tag_id = ${tags.id})`,
    })
    .from(tags)
    .orderBy(asc(tags.sortOrder), asc(tags.id));
  return rows.map((r) => ({ ...r, productCount: Number(r.productCount) }));
}
