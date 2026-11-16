import Link from "next/link";
import type { PublicProduct } from "@/lib/products";
import { AVAILABILITY_LABEL, formatAed, formatNumber, formatToman } from "@/lib/format";
import { WishlistButton } from "./WishlistButton";

export function ProductCard({ product: p, priority = false }: { product: PublicProduct; priority?: boolean }) {
  const unavailable = p.availability !== "AVAILABLE";
  return (
    <article className="group relative">
      <Link href={`/products/${p.slug}`} className="block rounded-2xl focus-visible:outline-offset-4">
        <div className="bottle-halo relative aspect-[4/5] overflow-hidden rounded-2xl border border-line transition-colors duration-300 group-hover:border-neon/60">
          {p.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.image}
              alt={p.name}
              width={640}
              height={800}
              loading={priority ? "eager" : "lazy"}
              className={`h-full w-full object-contain p-5 transition-transform duration-500 ease-out group-hover:scale-[1.04] ${unavailable ? "opacity-60" : ""}`}
            />
          ) : (
            <div className="grid h-full place-items-center text-sm text-dim">بدون تصویر</div>
          )}

          {p.discountPercent && !unavailable && (
            <span className="absolute start-3 top-3 rounded-full bg-neon px-2.5 py-1 text-xs font-semibold leading-none text-white num">
              {formatNumber(p.discountPercent)}٪ تخفیف
            </span>
          )}
          {unavailable && (
            <span className="absolute inset-x-3 bottom-3 rounded-full border border-line bg-ink/85 px-3 py-1.5 text-center text-xs text-cream backdrop-blur">
              {AVAILABILITY_LABEL[p.availability]}
            </span>
          )}
        </div>

        <div className="px-1 pt-3">
          <p className="text-[13px] text-dim">{p.brand}</p>
          <h3 className="mt-0.5 line-clamp-2 min-h-[3.25rem] text-[17px] font-semibold leading-[1.6] text-cream">{p.name}</h3>

          {p.tags.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="ویژگی‌های بو">
              {p.tags.slice(0, 3).map((t) => (
                <li key={t.id} className="pill !min-h-6 !px-2.5 !text-xs">
                  {t.name}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 num">
            <span className="text-[17px] font-semibold text-gold">{formatToman(p.priceToman)}</span>
            {p.discountPercent && p.originalPriceToman && (
              <span className="text-sm text-dim line-through decoration-neon/70">{formatNumber(p.originalPriceToman)}</span>
            )}
          </div>
          <p className="text-xs text-dim num">{formatAed(p.finalPriceAed)}</p>
        </div>
      </Link>
      <WishlistButton productId={p.id} productName={p.name} className="absolute end-3 top-3" />
    </article>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: PublicProduct[]; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
