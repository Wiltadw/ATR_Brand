import type { Metadata } from "next";
import Link from "next/link";
import { IconFilter } from "@/components/icons";
import { ProductGrid } from "@/components/ProductCard";
import { GENDER_LABEL, TAG_GROUP_LABEL, formatNumber } from "@/lib/format";
import { listProducts, listTags, type ListParams } from "@/lib/products";
import { normalizeText } from "@/lib/text";

export const metadata: Metadata = { title: "همه عطرها" };

type SP = Record<string, string | string[] | undefined>;
const PAGE_SIZE = 12;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const many = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? [v] : []).flatMap((x) => x.split(",")).map((x) => x.trim()).filter(Boolean);
/** ارقام فارسی را هم می‌پذیرد */
const toInt = (v: string) => {
  const n = Number(normalizeText(v).replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

function parse(sp: SP) {
  const sortRaw = first(sp.sort);
  const sort: ListParams["sort"] = sortRaw === "price_asc" || sortRaw === "price_desc" ? sortRaw : "newest";
  const gender = ["MEN", "WOMEN", "UNISEX"].includes(first(sp.gender)) ? first(sp.gender) : "";
  return {
    q: first(sp.q).trim().slice(0, 100),
    gender,
    tags: many(sp.tags).slice(0, 10),
    min: toInt(first(sp.minPrice)),
    max: toInt(first(sp.maxPrice)),
    sort,
    inStock: first(sp.inStock) === "1",
    featured: first(sp.featured) === "1",
    onSale: first(sp.onSale) === "1",
    bestSeller: first(sp.bestSeller) === "1",
    page: Math.max(Number(first(sp.page)) || 1, 1),
  };
}
type Parsed = ReturnType<typeof parse>;

function toQuery(f: Parsed, override: Partial<Record<string, string | string[] | null>> = {}) {
  const q = new URLSearchParams();
  const set = (k: string, v: string | string[] | undefined | null | number | boolean) => {
    if (k in override) {
      const o = override[k];
      if (o === null) return;
      if (Array.isArray(o)) o.forEach((x) => q.append(k, x));
      else if (o !== undefined) q.set(k, o);
      return;
    }
    if (v === undefined || v === null || v === "" || v === false) return;
    if (Array.isArray(v)) v.forEach((x) => q.append(k, x));
    else q.set(k, v === true ? "1" : String(v));
  };
  set("q", f.q);
  set("gender", f.gender);
  set("tags", f.tags);
  set("minPrice", f.min);
  set("maxPrice", f.max);
  set("sort", f.sort === "newest" ? "" : f.sort);
  set("inStock", f.inStock);
  set("featured", f.featured);
  set("onSale", f.onSale);
  set("bestSeller", f.bestSeller);
  set("page", f.page > 1 ? f.page : "");
  const s = q.toString();
  return s ? `/products?${s}` : "/products";
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const f = parse(await searchParams);
  const [result, allTags] = await Promise.all([
    listProducts({
      q: f.q || undefined,
      gender: f.gender || undefined,
      tagSlugs: f.tags,
      minToman: f.min,
      maxToman: f.max,
      sort: f.sort,
      availability: f.inStock ? "AVAILABLE" : undefined,
      featured: f.featured,
      onSale: f.onSale,
      bestSeller: f.bestSeller,
      page: f.page,
      pageSize: PAGE_SIZE,
    }),
    listTags(),
  ]);

  const tagBySlug = new Map(allTags.map((t) => [t.slug, t]));
  const groups = (["FRAGRANCE", "USAGE", "SEASON", "AUDIENCE", "OTHER"] as const)
    .map((g) => ({ key: g, tags: allTags.filter((t) => t.group === g && t.productCount > 0) }))
    .filter((g) => g.tags.length);

  // چیپ‌های فیلتر فعال؛ هرکدام با یک کلیک حذف می‌شود
  const chips: { label: string; href: string }[] = [];
  if (f.q) chips.push({ label: `«${f.q}»`, href: toQuery(f, { q: null, page: null }) });
  if (f.gender) chips.push({ label: GENDER_LABEL[f.gender], href: toQuery(f, { gender: null, page: null }) });
  for (const slug of f.tags)
    chips.push({ label: tagBySlug.get(slug)?.name ?? slug, href: toQuery(f, { tags: f.tags.filter((x) => x !== slug), page: null }) });
  if (f.min) chips.push({ label: `از ${formatNumber(f.min)} تومان`, href: toQuery(f, { minPrice: null, page: null }) });
  if (f.max) chips.push({ label: `تا ${formatNumber(f.max)} تومان`, href: toQuery(f, { maxPrice: null, page: null }) });
  if (f.inStock) chips.push({ label: "فقط موجودها", href: toQuery(f, { inStock: null, page: null }) });
  if (f.featured) chips.push({ label: "منتخب‌ها", href: toQuery(f, { featured: null, page: null }) });
  if (f.onSale) chips.push({ label: "تخفیف‌دارها", href: toQuery(f, { onSale: null, page: null }) });
  if (f.bestSeller) chips.push({ label: "پرفروش‌ها", href: toQuery(f, { bestSeller: null, page: null }) });

  const pages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const filterCount = chips.length;

  const filterForm = (
    <form action="/products" method="get" className="space-y-6">
      {/* فلگ‌هایی که از لینک‌های صفحه‌ی اصلی می‌آیند هنگام اعمال فیلتر حفظ می‌شوند */}
      {f.featured && <input type="hidden" name="featured" value="1" />}
      {f.onSale && <input type="hidden" name="onSale" value="1" />}
      {f.bestSeller && <input type="hidden" name="bestSeller" value="1" />}

      <div>
        <label htmlFor="f-q" className="mb-1.5 block text-sm font-semibold">
          جستجو
        </label>
        <input id="f-q" name="q" type="search" defaultValue={f.q} placeholder="نام عطر یا برند" className="field" />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">مناسب برای</legend>
        <div className="flex flex-wrap gap-2">
          {[["", "همه"], ["MEN", "مردانه"], ["WOMEN", "زنانه"], ["UNISEX", "یونیسکس"]].map(([v, l]) => (
            <label key={v} className="cursor-pointer">
              <input type="radio" name="gender" value={v} defaultChecked={f.gender === v} className="peer sr-only" />
              <span className="pill !min-h-10 !px-4 peer-checked:border-neon peer-checked:bg-neon/15 peer-checked:text-cream peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-neon-soft">
                {l}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {groups.map((g) => (
        <fieldset key={g.key}>
          <legend className="mb-2 text-sm font-semibold">{TAG_GROUP_LABEL[g.key]}</legend>
          <div className="flex flex-wrap gap-2">
            {g.tags.map((t) => (
              <label key={t.id} className="cursor-pointer">
                <input type="checkbox" name="tags" value={t.slug} defaultChecked={f.tags.includes(t.slug)} className="peer sr-only" />
                <span className="pill !min-h-9 peer-checked:border-neon peer-checked:bg-neon/15 peer-checked:text-cream peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-neon-soft">
                  {t.name}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">محدوده‌ی قیمت (تومان)</legend>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="f-min" className="sr-only">
              حداقل قیمت
            </label>
            <input id="f-min" name="minPrice" inputMode="numeric" defaultValue={f.min ?? ""} placeholder="از" className="field num" />
          </div>
          <div>
            <label htmlFor="f-max" className="sr-only">
              حداکثر قیمت
            </label>
            <input id="f-max" name="maxPrice" inputMode="numeric" defaultValue={f.max ?? ""} placeholder="تا" className="field num" />
          </div>
        </div>
      </fieldset>

      <label className="flex cursor-pointer items-center gap-3 text-sm">
        <input type="checkbox" name="inStock" value="1" defaultChecked={f.inStock} className="h-5 w-5 accent-[var(--neon)]" />
        فقط عطرهای موجود
      </label>

      <div>
        <label htmlFor="f-sort" className="mb-1.5 block text-sm font-semibold">
          مرتب‌سازی
        </label>
        <select id="f-sort" name="sort" defaultValue={f.sort} className="field">
          <option value="newest">جدیدترین</option>
          <option value="price_asc">ارزان‌ترین</option>
          <option value="price_desc">گران‌ترین</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary flex-1">
          اعمال فیلتر
        </button>
        {filterCount > 0 && (
          <Link href="/products" className="btn btn-ghost">
            پاک کردن
          </Link>
        )}
      </div>
    </form>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <h1 className="text-3xl font-extrabold">همه عطرها</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
        {/* موبایل: فیلترها جمع‌شونده */}
        <details className="group rounded-2xl border border-line bg-raised lg:hidden">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-[15px] font-semibold">
            <span className="flex items-center gap-2">
              <IconFilter size={18} />
              فیلتر و مرتب‌سازی
              {filterCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-neon px-1 text-[11px] text-white num">{formatNumber(filterCount)}</span>}
            </span>
            <span className="text-dim transition-transform group-open:rotate-180" aria-hidden="true">
              ▾
            </span>
          </summary>
          <div className="border-t border-line p-4">{filterForm}</div>
        </details>

        {/* دسکتاپ: ستون کناری */}
        <aside className="hidden lg:block" aria-label="فیلترها">
          <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-2xl border border-line bg-raised p-5">{filterForm}</div>
        </aside>

        <section aria-live="polite">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <p className="text-sm text-dim num">{formatNumber(result.total)} عطر</p>
            {chips.map((c) => (
              <Link key={c.label + c.href} href={c.href} className="pill !min-h-8 gap-1.5 border-neon/50 text-cream" aria-label={`حذف فیلتر ${c.label}`}>
                {c.label}
                <span aria-hidden="true" className="text-dim">×</span>
              </Link>
            ))}
          </div>

          {!result.rateAvailable && result.total > 0 && (
            <p className="mb-5 rounded-xl border border-gold/40 bg-gold/5 px-4 py-3 text-sm text-gold">
              نرخ درهم هنوز تعیین نشده؛ قیمت تومانی و فیلتر قیمت فعال نیست.
            </p>
          )}

          {result.items.length > 0 ? (
            <>
              <ProductGrid products={result.items} />
              {pages > 1 && (
                <nav aria-label="صفحه‌بندی" className="mt-10 flex items-center justify-center gap-3">
                  {f.page > 1 ? (
                    <Link href={toQuery(f, { page: f.page - 1 > 1 ? String(f.page - 1) : null })} className="btn btn-ghost !min-h-11" rel="prev">
                      صفحه‌ی قبل
                    </Link>
                  ) : (
                    <span className="btn btn-ghost !min-h-11" aria-disabled="true">
                      صفحه‌ی قبل
                    </span>
                  )}
                  <span className="text-sm text-dim num">
                    {formatNumber(f.page)} از {formatNumber(pages)}
                  </span>
                  {f.page < pages ? (
                    <Link href={toQuery(f, { page: String(f.page + 1) })} className="btn btn-ghost !min-h-11" rel="next">
                      صفحه‌ی بعد
                    </Link>
                  ) : (
                    <span className="btn btn-ghost !min-h-11" aria-disabled="true">
                      صفحه‌ی بعد
                    </span>
                  )}
                </nav>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
              <p className="text-lg font-semibold">عطری با این فیلترها پیدا نشد</p>
              <p className="mt-2 text-sm text-dim">یکی از فیلترها را بردارید یا جستجو را کوتاه‌تر کنید.</p>
              <Link href="/products" className="btn btn-primary mt-6">
                نمایش همه‌ی عطرها
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
