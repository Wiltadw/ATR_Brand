import Link from "next/link";
import { HeaderActions } from "./HeaderActions";
import { IconSearch } from "./icons";

const NAV = [
  { href: "/products", label: "همه عطرها" },
  { href: "/products?gender=MEN", label: "مردانه" },
  { href: "/products?gender=WOMEN", label: "زنانه" },
  { href: "/products?onSale=1", label: "پیشنهاد ویژه" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 md:gap-8">
        <Link href="/" aria-label="برند، صفحه اصلی" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-word.svg" alt="برند" width={92} height={55} className="h-11 w-auto" />
        </Link>

        <nav aria-label="منوی اصلی" className="hidden items-center gap-6 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-[15px] text-dim hover:text-cream">
              {n.label}
            </Link>
          ))}
        </nav>

        <form action="/products" role="search" className="relative ms-auto hidden w-64 md:block">
          <label htmlFor="header-search" className="sr-only">
            جستجوی عطر یا برند
          </label>
          <input id="header-search" name="q" type="search" placeholder="جستجوی عطر یا برند" className="field !min-h-10 ps-10" />
          <button type="submit" aria-label="جستجو" className="absolute start-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center text-dim hover:text-cream">
            <IconSearch size={18} />
          </button>
        </form>

        <div className="ms-auto md:ms-0">
          <HeaderActions />
        </div>
      </div>

      {/* موبایل: جستجو و منو */}
      <div className="mx-auto max-w-6xl px-4 pb-2 md:hidden">
        <form action="/products" role="search" className="relative">
          <label htmlFor="header-search-m" className="sr-only">
            جستجوی عطر یا برند
          </label>
          <input id="header-search-m" name="q" type="search" placeholder="جستجوی عطر یا برند" className="field !min-h-11 ps-10" />
          <button type="submit" aria-label="جستجو" className="absolute start-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center text-dim">
            <IconSearch size={18} />
          </button>
        </form>
        <nav aria-label="منوی اصلی" className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="pill shrink-0 !min-h-9 text-sm">
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
