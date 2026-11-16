import Link from "next/link";
import { getStoreSettings } from "@/lib/orders";
import { formatNumber } from "@/lib/format";

function digits(v: string) {
  return v.replace(/[^\d+]/g, "");
}

export async function Footer() {
  const s = await getStoreSettings();
  const handle = (v: string) => v.replace(/^@/, "").replace(/^https?:\/\/(www\.)?[^/]+\//, "");
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-word.svg" alt="برند" width={120} height={72} className="h-14 w-auto" />
          <p className="mt-4 max-w-xs text-sm leading-7 text-dim">
            عطرهای منتخب، با قیمتی که هر روز از روی نرخ درهم حساب می‌شود.
          </p>
        </div>

        <nav aria-label="دسترسی سریع">
          <h2 className="text-sm font-semibold text-cream">فروشگاه</h2>
          <ul className="mt-3 space-y-2 text-sm text-dim">
            <li><Link href="/products" className="hover:text-cream">همه عطرها</Link></li>
            <li><Link href="/products?gender=MEN" className="hover:text-cream">عطر مردانه</Link></li>
            <li><Link href="/products?gender=WOMEN" className="hover:text-cream">عطر زنانه</Link></li>
            <li><Link href="/products?onSale=1" className="hover:text-cream">پیشنهاد ویژه</Link></li>
            <li><Link href="/wishlist" className="hover:text-cream">علاقه‌مندی‌ها</Link></li>
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-semibold text-cream">تماس با ما</h2>
          <ul className="mt-3 space-y-2 text-sm text-dim">
            {s.phone && (
              <li>
                <a href={`tel:${digits(s.phone)}`} className="num hover:text-cream" dir="ltr">
                  {s.phone}
                </a>
              </li>
            )}
            {s.instagram && (
              <li>
                <a href={`https://instagram.com/${handle(s.instagram)}`} className="hover:text-cream" rel="noopener noreferrer" target="_blank">
                  اینستاگرام: <span dir="ltr">@{handle(s.instagram)}</span>
                </a>
              </li>
            )}
            {s.telegram && (
              <li>
                <a href={`https://t.me/${handle(s.telegram)}`} className="hover:text-cream" rel="noopener noreferrer" target="_blank">
                  تلگرام: <span dir="ltr">@{handle(s.telegram)}</span>
                </a>
              </li>
            )}
            {s.whatsapp && (
              <li>
                <a href={`https://wa.me/${digits(s.whatsapp).replace(/^0/, "98")}`} className="hover:text-cream" rel="noopener noreferrer" target="_blank">
                  واتساپ
                </a>
              </li>
            )}
            {s.email && (
              <li>
                <a href={`mailto:${s.email}`} className="hover:text-cream" dir="ltr">{s.email}</a>
              </li>
            )}
            {s.address && <li className="leading-7">{s.address}</li>}
            {!s.phone && !s.instagram && !s.telegram && !s.whatsapp && !s.email && !s.address && (
              <li>اطلاعات تماس به‌زودی اضافه می‌شود.</li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-dim">
        ثبت سفارش در سایت به معنی پرداخت نیست؛ هماهنگی نهایی و پرداخت بعد از تماس همکاران ما انجام می‌شود.
        <span className="num"> · {formatNumber(new Date().getFullYear())}</span>
      </div>
    </footer>
  );
}
