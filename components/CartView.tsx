"use client";

import Link from "next/link";
import { formatNumber, formatToman } from "@/lib/format";
import { IconMinus, IconPlus, IconTrash } from "./icons";
import { useStore } from "./StoreProvider";
import { useQuote } from "./useQuote";

export function CartView() {
  const { ready, cart, setQuantity, removeFromCart } = useStore();
  const { loading, empty, quote, error, problems } = useQuote(cart, ready);

  if (empty) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-dashed border-line px-6 py-16 text-center">
        <p className="text-lg font-semibold">سبد خرید شما خالی است</p>
        <p className="mt-2 text-sm text-dim">عطر مورد علاقه‌تان را پیدا کنید و به سبد اضافه کنید.</p>
        <Link href="/products" className="btn btn-primary mt-6">
          دیدن عطرها
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="در حال بارگذاری سبد خرید">
        {cart.map((i) => (
          <div key={i.productId} className="skeleton h-32" />
        ))}
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div role="alert" className="rounded-2xl border border-danger/50 bg-raised p-6">
        <p className="font-semibold text-danger">{error ?? "خطا در دریافت قیمت سبد"}</p>
        {problems && problems.length > 0 && (
          <ul className="mt-4 space-y-3">
            {problems.map((p) => (
              <li key={p.productId} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span>{p.reason}</span>
                <button type="button" className="btn btn-ghost !min-h-10 !px-4 !text-sm" onClick={() => removeFromCart(p.productId)}>
                  حذف از سبد
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <ul className="space-y-4">
        {quote.lines.map((l) => (
          <li key={l.productId} className="flex gap-4 rounded-2xl border border-line bg-raised p-3 sm:p-4">
            <Link href={`/products/${l.slug}`} className="bottle-halo block h-28 w-24 shrink-0 overflow-hidden rounded-xl border border-line">
              {l.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.image} alt={l.name} width={96} height={112} className="h-full w-full object-contain p-2" />
              )}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
              <div>
                <p className="text-xs text-dim">{l.brand}</p>
                <Link href={`/products/${l.slug}`} className="line-clamp-2 font-semibold leading-7 hover:text-neon-soft">
                  {l.name}
                </Link>
                <p className="text-sm text-dim num">قیمت هر عدد: {formatToman(l.unitPriceToman)}</p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center rounded-full border border-line" role="group" aria-label={`تعداد ${l.name}`}>
                  <button type="button" aria-label="کم کردن" disabled={l.quantity <= 1} onClick={() => setQuantity(l.productId, l.quantity - 1)} className="grid h-11 w-11 place-items-center disabled:opacity-40">
                    <IconMinus size={18} />
                  </button>
                  <span className="min-w-8 text-center num" aria-live="polite">
                    {formatNumber(l.quantity)}
                  </span>
                  <button type="button" aria-label="زیاد کردن" disabled={l.quantity >= 20} onClick={() => setQuantity(l.productId, l.quantity + 1)} className="grid h-11 w-11 place-items-center disabled:opacity-40">
                    <IconPlus size={18} />
                  </button>
                </div>
                <p className="font-semibold text-gold num">{formatToman(l.lineToman)}</p>
                <button type="button" onClick={() => removeFromCart(l.productId)} aria-label={`حذف ${l.name} از سبد`} className="grid h-11 w-11 place-items-center rounded-full text-dim hover:text-danger">
                  <IconTrash size={20} />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="h-fit rounded-2xl border border-line bg-raised p-5 lg:sticky lg:top-24" aria-label="خلاصه‌ی سفارش">
        <h2 className="text-lg font-extrabold">خلاصه‌ی سفارش</h2>
        <dl className="mt-4 space-y-3 text-sm num">
          <div className="flex justify-between">
            <dt className="text-dim">جمع عطرها</dt>
            <dd>{formatToman(quote.subtotalToman)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-dim">هزینه‌ی ارسال (جدا از قیمت عطر)</dt>
            <dd>{quote.shippingToman > 0 ? formatToman(quote.shippingToman) : "هماهنگ می‌شود"}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
            <dt>مبلغ نهایی</dt>
            <dd className="text-gold">{formatToman(quote.totalToman)}</dd>
          </div>
        </dl>
        <Link href="/checkout" className="btn btn-primary mt-5 w-full">
          ادامه و ثبت سفارش
        </Link>
        <p className="mt-3 text-xs leading-6 text-dim">قیمت‌ها بر اساس نرخ روز درهم محاسبه شده‌اند. ثبت سفارش به معنی پرداخت نیست.</p>
      </aside>
    </div>
  );
}
