import { sql } from "drizzle-orm";

type PriceFields = {
  priceAedMinor: number;
  discountPercent: number | null;
  discountEndsAt: Date | null;
};

/** درصد تخفیفِ فعال (اگر منقضی شده باشد صفر) */
export function activeDiscount(p: Pick<PriceFields, "discountPercent" | "discountEndsAt">, at = new Date()): number {
  if (!p.discountPercent || p.discountPercent <= 0) return 0;
  if (p.discountEndsAt && p.discountEndsAt.getTime() <= at.getTime()) return 0;
  return p.discountPercent;
}

/** قیمت نهایی به فلس (بعد از تخفیف) */
export function finalAedMinor(p: PriceFields, at = new Date()): number {
  const d = activeDiscount(p, at);
  return d ? Math.round((p.priceAedMinor * (100 - d)) / 100) : p.priceAedMinor;
}

/** تومان = درهم × نرخ. ورودی به فلس است. فقط اعداد صحیح تا خطای اعشاری نداشته باشیم. */
export function aedMinorToToman(aedMinor: number, rate: number): number {
  return Math.round((aedMinor * rate) / 100);
}

/** همان محاسبه تخفیف ولی داخل SQL (برای فیلتر و مرتب‌سازی بر اساس قیمت نهایی) */
export function finalAedMinorSql(table: {
  priceAedMinor: unknown;
  discountPercent: unknown;
  discountEndsAt: unknown;
}) {
  const nowSec = Math.floor(Date.now() / 1000);
  return sql<number>`CASE WHEN ${table.discountPercent} IS NOT NULL AND ${table.discountPercent} > 0 AND (${table.discountEndsAt} IS NULL OR ${table.discountEndsAt} > ${nowSec}) THEN CAST(ROUND(${table.priceAedMinor} * (100 - ${table.discountPercent}) / 100.0) AS INTEGER) ELSE ${table.priceAedMinor} END`;
}
