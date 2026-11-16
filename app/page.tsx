import Link from "next/link";
import { ProductGrid } from "@/components/ProductCard";
import { Section } from "@/components/Section";
import { formatNumber } from "@/lib/format";
import { listProducts, listTags } from "@/lib/products";
import { currentSeason } from "@/lib/season";

export default async function HomePage() {
  const season = currentSeason();
  const [featured, newest, best, offers, seasonal, men, women, unisex, tags] = await Promise.all([
    listProducts({ featured: true, pageSize: 4 }),
    listProducts({ sort: "newest", pageSize: 4 }),
    listProducts({ bestSeller: true, pageSize: 4 }),
    listProducts({ onSale: true, pageSize: 4 }),
    listProducts({ tagSlugs: [season.tag], pageSize: 4 }),
    listProducts({ gender: "MEN", pageSize: 1 }),
    listProducts({ gender: "WOMEN", pageSize: 1 }),
    listProducts({ gender: "UNISEX", pageSize: 1 }),
    listTags(),
  ]);

  const characterTags = tags.filter((t) => t.group === "FRAGRANCE" && t.productCount > 0);
  const usageTags = tags.filter((t) => t.group === "USAGE" && t.productCount > 0);
  const genderTiles = [
    { label: "مردانه", href: "/products?gender=MEN", n: men.total },
    { label: "زنانه", href: "/products?gender=WOMEN", n: women.total },
    { label: "یونیسکس", href: "/products?gender=UNISEX", n: unisex.total },
  ];

  return (
    <>
      {/* ───── هیرو: تابلوی نئونی ───── */}
      <section className="relative isolate overflow-hidden border-b border-line">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: "radial-gradient(55% 70% at 28% 45%, rgba(255,31,142,.16), transparent 70%)" }}
        />
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 md:grid-cols-2 md:py-24">
          <div className="order-2 text-center md:order-1 md:text-start">
            <h1 className="text-[32px] font-extrabold leading-[1.45] md:text-5xl md:leading-[1.4]">
              عطرهای منتخب،
              <br />
              با قیمت همان روز
            </h1>
            <p className="mx-auto mt-5 max-w-md text-base leading-8 text-dim md:mx-0">
              قیمت هر عطر از روی نرخ درهم امروز حساب می‌شود و کنار آن قیمت اصلی به درهم هم دیده می‌شود. بدون حدس و بدون عدد قدیمی.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
              <Link href="/products" className="btn btn-primary">
                دیدن همه‌ی عطرها
              </Link>
              <Link href="/products?onSale=1" className="btn btn-ghost">
                پیشنهادهای ویژه
              </Link>
            </div>
          </div>

          <div className="order-1 flex justify-center md:order-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo-word.svg"
              alt="برند"
              width={370}
              height={223}
              className="neon-sign neon-glow w-[220px] sm:w-[300px] md:w-[400px]"
              fetchPriority="high"
            />
          </div>
        </div>
      </section>

      {featured.items.length > 0 && (
        <Section title="منتخب‌ها" href="/products?featured=1">
          <ProductGrid products={featured.items} priorityCount={2} />
        </Section>
      )}

      {newest.items.length > 0 && (
        <Section title="تازه‌ها" href="/products?sort=newest">
          <ProductGrid products={newest.items} />
        </Section>
      )}

      {/* ───── دسته‌بندی بر اساس مخاطب ───── */}
      <Section title="برای چه کسی؟">
        <ul className="grid gap-3 md:grid-cols-3">
          {genderTiles.map((g) => (
            <li key={g.href}>
              <Link
                href={g.href}
                className="group flex h-36 items-end justify-between rounded-2xl border border-line bg-raised p-5 transition-colors hover:border-neon md:h-44"
              >
                <span className="text-2xl font-extrabold">{g.label}</span>
                <span className="text-sm text-dim num group-hover:text-cream">{formatNumber(g.n)} عطر</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {/* ───── بر اساس ویژگی بو ───── */}
      {characterTags.length > 0 && (
        <Section title="بوی مورد علاقه‌ات کدام است؟">
          <div className="flex flex-wrap gap-2.5">
            {characterTags.map((t) => (
              <Link key={t.id} href={`/products?tags=${encodeURIComponent(t.slug)}`} className="pill !min-h-11 !px-5 !text-[15px]">
                {t.name}
              </Link>
            ))}
          </div>
          {usageTags.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-line pt-5">
              <span className="text-sm text-dim">مناسب برای:</span>
              {usageTags.map((t) => (
                <Link key={t.id} href={`/products?tags=${encodeURIComponent(t.slug)}`} className="pill">
                  {t.name}
                </Link>
              ))}
            </div>
          )}
        </Section>
      )}

      {seasonal.items.length > 0 && (
        <Section title={`پیشنهاد ${season.name}`} href={`/products?tags=${encodeURIComponent(season.tag)}`}>
          <ProductGrid products={seasonal.items} />
        </Section>
      )}

      {offers.items.length > 0 && (
        <Section title="تخفیف‌دارها" href="/products?onSale=1">
          <ProductGrid products={offers.items} />
        </Section>
      )}

      {best.items.length > 0 && (
        <Section title="پرفروش‌ها" href="/products?bestSeller=1">
          <ProductGrid products={best.items} />
        </Section>
      )}

      {/* ───── معرفی برند ───── */}
      <section className="mx-auto max-w-6xl px-4 pt-20">
        <div className="rounded-3xl border border-line bg-raised px-6 py-10 md:px-14 md:py-14">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-6 h-px w-16 bg-gold" aria-hidden="true" />
            <h2 className="text-2xl font-extrabold md:text-3xl">درباره‌ی برند</h2>
            <p className="mt-5 leading-9 text-dim">
              «برند» یک فروشگاه آنلاین عطر است. قیمت هر عطر از روی نرخ درهم همان روز حساب می‌شود. بعد از ثبت درخواست سفارش، همکاران ما برای هماهنگی نهایی و پرداخت با شما تماس می‌گیرند.
            </p>
            <Link href="/products" className="btn btn-ghost mt-8">
              شروع انتخاب
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
