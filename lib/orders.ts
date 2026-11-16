import { inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { ApiError } from "./api";
import { getEffectiveRate } from "./currency";
import { aedMinorToToman, finalAedMinor } from "./pricing";
import { imageUrl } from "./uploads";

export async function getStoreSettings() {
  const [row] = await db.select().from(schema.storeSettings);
  if (row) return row;
  await db.insert(schema.storeSettings).values({ id: 1 }).onConflictDoNothing();
  const [created] = await db.select().from(schema.storeSettings);
  return created;
}

export type PricedLine = {
  productId: number;
  name: string;
  brand: string;
  slug: string;
  image: string | null;
  quantity: number;
  unitPriceAedMinor: number;
  unitPriceToman: number;
  lineToman: number;
};

/**
 * قیمت سبد خرید همیشه سمت سرور حساب می‌شود (قیمتی که مرورگر بفرستد نادیده گرفته می‌شود).
 * محصول ناموجود یا بدون نرخ ارز اجازه ثبت ندارد.
 */
export async function priceCart(items: { productId: number; quantity: number }[]) {
  const rate = await getEffectiveRate();
  if (!rate) {
    throw new ApiError(503, "نرخ ارز هنوز تعیین نشده است؛ فعلاً امکان ثبت سفارش نیست");
  }
  // اگر یک محصول دو بار آمده بود، جمع می‌شود
  const merged = new Map<number, number>();
  for (const it of items) merged.set(it.productId, (merged.get(it.productId) ?? 0) + it.quantity);

  const ids = [...merged.keys()];
  const rows = await db.select().from(schema.products).where(inArray(schema.products.id, ids));
  const images = await db
    .select()
    .from(schema.productImages)
    .where(inArray(schema.productImages.productId, ids));
  const byId = new Map(rows.map((r) => [r.id, r]));

  const lines: PricedLine[] = [];
  const problems: { productId: number; reason: string }[] = [];
  for (const [productId, quantity] of merged) {
    const p = byId.get(productId);
    if (!p) {
      problems.push({ productId, reason: "این محصول دیگر وجود ندارد" });
      continue;
    }
    if (p.availability !== "AVAILABLE") {
      problems.push({ productId, reason: `«${p.name}» در حال حاضر قابل سفارش نیست` });
      continue;
    }
    if (quantity > 20) {
      problems.push({ productId, reason: "حداکثر ۲۰ عدد از هر محصول" });
      continue;
    }
    const unit = aedMinorToToman(finalAedMinor(p), rate);
    const img = images
      .filter((i) => i.productId === p.id)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)[0];
    lines.push({
      productId: p.id,
      name: p.name,
      brand: p.brand,
      slug: p.slug,
      image: img ? imageUrl(img.filename) : null,
      quantity,
      unitPriceAedMinor: finalAedMinor(p),
      unitPriceToman: unit,
      lineToman: unit * quantity,
    });
  }
  if (problems.length) {
    throw new ApiError(409, "برخی محصولات سبد خرید قابل سفارش نیستند", { problems });
  }
  const settings = await getStoreSettings();
  const subtotal = lines.reduce((s, l) => s + l.lineToman, 0);
  const shipping = settings.shippingFeeToman;
  return { lines, subtotalToman: subtotal, shippingToman: shipping, totalToman: subtotal + shipping, rate };
}

/** شماره سفارش خوانا و یکتا مثل ATR-261116-K7M2Q */
export function newOrderNumber(): string {
  const d = new Date();
  const ymd =
    String(d.getFullYear()).slice(2) +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return `ATR-${ymd}-${Array.from(bytes, (b) => chars[b % chars.length]).join("")}`;
}
