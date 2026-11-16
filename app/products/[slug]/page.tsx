import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { AddToCartButton } from "@/components/AddToCartButton";
import { PriceHistoryChart } from "@/components/PriceHistoryChart";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductGrid } from "@/components/ProductCard";
import { WishlistButton } from "@/components/WishlistButton";
import { AVAILABILITY_LABEL, GENDER_LABEL, PRICE_REASON_LABEL, formatAed, formatDate, formatNumber, formatToman } from "@/lib/format";
import { getPriceHistory, hydrate, relatedProducts } from "@/lib/products";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const [row] = await db.select().from(schema.products).where(eq(schema.products.slug, slug));
  if (!row) return null;
  const [[product], related, history] = await Promise.all([hydrate([row]), relatedProducts(row, 4), getPriceHistory(row.id)]);
  return { product, related, history };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await load((await params).slug);
  if (!data) return { title: "محصول پیدا نشد" };
  return { title: `${data.product.name} | ${data.product.brand}`, description: data.product.shortDescription ?? undefined };
}

const DOT: Record<string, string> = {
  AVAILABLE: "bg-ok",
  UNAVAILABLE: "bg-danger",
  COMING_SOON: "bg-gold",
};

export default async function ProductPage({ params }: Props) {
  const data = await load((await params).slug);
  if (!data) notFound();
  const { product: p, related, history } = data;
  const available = p.availability === "AVAILABLE";

  const notes = [
    { label: "نت‌های بالا (اولین بو)", value: p.topNotes },
    { label: "نت‌های میانی", value: p.middleNotes },
    { label: "نت‌های پایه (ماندگاری)", value: p.baseNotes },
  ].filter((n) => n.value);

  const specs = [
    { label: "مناسب برای", value: GENDER_LABEL[p.gender] },
    { label: "خانواده‌ی بو", value: p.fragranceFamily },
    { label: "ماندگاری", value: p.longevity },
    { label: "پخش بو", value: p.projection },
  ].filter((s) => s.value);

  const changes = [...history].reverse().filter((h) => h.changeToman !== null).slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      <nav aria-label="مسیر صفحه" className="mb-5 flex flex-wrap items-center gap-2 text-sm text-dim">
        <Link href="/" className="hover:text-cream">خانه</Link>
        <span aria-hidden="true">/</span>
        <Link href="/products" className="hover:text-cream">عطرها</Link>
        <span aria-hidden="true">/</span>
        <span className="text-cream" aria-current="page">{p.name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        <ProductGallery images={p.images} name={p.name} />

        <div>
          <p className="text-sm text-dim">{p.brand}</p>
          <h1 className="mt-1 text-3xl font-extrabold leading-[1.5]">{p.name}</h1>
          {p.nameEn && (
            <p dir="ltr" className="mt-1 text-end text-sm text-dim">
              {p.nameEn}
            </p>
          )}

          {p.tags.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="ویژگی‌های بو">
              {p.tags.map((t) => (
                <li key={t.id}>
                  <Link href={`/products?tags=${encodeURIComponent(t.slug)}`} className="pill">
                    {t.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 rounded-2xl border border-line bg-raised p-5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 num">
              <span className="text-3xl font-extrabold text-gold">{formatToman(p.priceToman)}</span>
              {p.discountPercent && p.originalPriceToman && (
                <>
                  <span className="text-base text-dim line-through decoration-neon/70">{formatNumber(p.originalPriceToman)}</span>
                  <span className="rounded-full bg-neon px-2.5 py-1 text-xs font-semibold leading-none text-white">{formatNumber(p.discountPercent)}٪ تخفیف</span>
                </>
              )}
            </div>
            <p className="mt-2 text-sm text-dim num">
              قیمت اصلی: {formatAed(p.priceAed)}
              {p.discountPercent && <span> · بعد از تخفیف: {formatAed(p.finalPriceAed)}</span>}
            </p>
            {p.discountEndsAt && <p className="mt-1 text-sm text-neon-soft">تخفیف تا {formatDate(p.discountEndsAt)}</p>}

            <p className="mt-4 flex items-center gap-2 text-sm">
              <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${DOT[p.availability]}`} />
              {AVAILABILITY_LABEL[p.availability]}
            </p>

            <div className="mt-5 flex items-start gap-3">
              <div className="flex-1">
                <AddToCartButton productId={p.id} available={available && p.priceToman !== null} />
              </div>
              <WishlistButton productId={p.id} productName={p.name} className="!h-12 !w-12" />
            </div>
            <p className="mt-1 text-xs leading-6 text-dim">هزینه‌ی ارسال جدا از قیمت عطر است و هنگام ثبت سفارش نمایش داده می‌شود. ثبت سفارش به معنی پرداخت نیست.</p>
          </div>

          {p.shortDescription && <p className="mt-6 leading-8 text-dim">{p.shortDescription}</p>}
        </div>
      </div>

      {(p.description || notes.length > 0 || specs.length > 0) && (
        <section className="mt-14 grid gap-10 md:grid-cols-2 md:gap-12" aria-label="مشخصات عطر">
          <div>
            {p.description && (
              <>
                <h2 className="text-xl font-extrabold">درباره‌ی این عطر</h2>
                <p className="mt-3 whitespace-pre-line leading-9 text-dim">{p.description}</p>
              </>
            )}
            {specs.length > 0 && (
              <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-6">
                {specs.map((s) => (
                  <div key={s.label}>
                    <dt className="text-sm text-dim">{s.label}</dt>
                    <dd className="mt-0.5 font-semibold">{s.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {notes.length > 0 && (
            <div>
              <h2 className="text-xl font-extrabold">نت‌های بو</h2>
              <ol className="mt-4 space-y-0 divide-y divide-line rounded-2xl border border-line bg-raised">
                {notes.map((n) => (
                  <li key={n.label} className="px-5 py-4">
                    <p className="text-sm text-dim">{n.label}</p>
                    <p className="mt-1 font-semibold">{n.value}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      )}

      {/* ───── تاریخچه‌ی قیمت ───── */}
      <section className="mt-14" aria-labelledby="price-history">
        <h2 id="price-history" className="text-xl font-extrabold">
          تاریخچه‌ی قیمت
        </h2>
        {history.length >= 2 ? (
          <div className="mt-4 grid gap-6 md:grid-cols-[1.4fr_1fr]">
            <PriceHistoryChart points={history} />
            <ul className="divide-y divide-line self-start rounded-2xl border border-line bg-raised">
              {changes.map((h, i) => (
                <li key={`${h.at}-${i}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span>
                    <span className="block">{PRICE_REASON_LABEL[h.reason]}</span>
                    <span className="text-xs text-dim">{formatDate(h.at)}</span>
                  </span>
                  <span className={`num ${h.changeToman! > 0 ? "text-neon-soft" : "text-ok"}`} dir="ltr">
                    {h.changeToman! > 0 ? "+" : "−"}
                    {formatNumber(Math.abs(h.changeToman!))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-3 rounded-2xl border border-dashed border-line px-5 py-8 text-center text-sm text-dim">
            هنوز تغییری در قیمت این عطر ثبت نشده است. با اولین تغییر، نمودار اینجا نمایش داده می‌شود.
          </p>
        )}
      </section>

      {related.length > 0 && (
        <section className="mt-16" aria-labelledby="related">
          <h2 id="related" className="mb-6 border-b border-line pb-3 text-2xl font-extrabold">
            عطرهای مشابه
          </h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
