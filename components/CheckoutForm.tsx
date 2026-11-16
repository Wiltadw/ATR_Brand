"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatNumber, formatToman } from "@/lib/format";
import { useStore } from "./StoreProvider";
import { useQuote } from "./useQuote";

type FieldErrors = Record<string, string>;

export function CheckoutForm() {
  const router = useRouter();
  const { ready, cart, clearCart, removeFromCart } = useStore();
  const { loading, empty, quote, error, problems } = useQuote(cart, ready);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState<FieldErrors>({});

  if (empty) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-dashed border-line px-6 py-16 text-center">
        <p className="text-lg font-semibold">سبد خرید شما خالی است</p>
        <Link href="/products" className="btn btn-primary mt-6">
          دیدن عطرها
        </Link>
      </div>
    );
  }
  if (loading) return <div className="skeleton h-96" aria-busy="true" aria-label="در حال بارگذاری" />;
  if (error || !quote) {
    return (
      <div role="alert" className="rounded-2xl border border-danger/50 bg-raised p-6">
        <p className="font-semibold text-danger">{error ?? "خطا در دریافت قیمت سبد"}</p>
        {problems?.map((p) => (
          <div key={p.productId} className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
            <span>{p.reason}</span>
            <button type="button" className="btn btn-ghost !min-h-10 !px-4 !text-sm" onClick={() => removeFromCart(p.productId)}>
              حذف از سبد
            </button>
          </div>
        ))}
        <Link href="/cart" className="btn btn-ghost mt-5">
          بازگشت به سبد خرید
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    setFormError(null);
    setFields({});
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.get("customerName"),
          phone: form.get("phone"),
          address: form.get("address"),
          notes: form.get("notes"),
          items: cart,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        clearCart();
        router.push(`/checkout/success?order=${encodeURIComponent(data.orderNumber)}&total=${data.totalToman}`);
        return;
      }
      if (Array.isArray(data.fields)) {
        const map: FieldErrors = {};
        for (const f of data.fields as { path: string; message: string }[]) map[f.path.split(".")[0]] ??= f.message;
        setFields(map);
      }
      setFormError(data.error ?? "ثبت سفارش انجام نشد. دوباره تلاش کنید.");
    } catch {
      setFormError("ارتباط با سرور برقرار نشد. اینترنت را بررسی کنید و دوباره تلاش کنید.");
    } finally {
      setSubmitting(false);
    }
  }

  const input = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <input id={name} name={name} className="field" aria-invalid={!!fields[name]} aria-describedby={fields[name] ? `${name}-err` : undefined} {...props} />
      {fields[name] && (
        <p id={`${name}-err`} className="mt-1 text-sm text-danger">
          {fields[name]}
        </p>
      )}
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {input("customerName", "نام و نام خانوادگی", { required: true, autoComplete: "name", maxLength: 80 })}
        {input("phone", "شماره‌ی موبایل", { required: true, type: "tel", inputMode: "tel", autoComplete: "tel", placeholder: "09123456789", dir: "ltr", style: { textAlign: "right" } })}
        <div>
          <label htmlFor="address" className="mb-1.5 block text-sm font-semibold">
            آدرس کامل
          </label>
          <textarea id="address" name="address" rows={4} required maxLength={500} autoComplete="street-address" className="field" aria-invalid={!!fields.address} />
          {fields.address && <p className="mt-1 text-sm text-danger">{fields.address}</p>}
        </div>
        <div>
          <label htmlFor="notes" className="mb-1.5 block text-sm font-semibold">
            توضیحات (اختیاری)
          </label>
          <textarea id="notes" name="notes" rows={3} maxLength={500} className="field" />
        </div>

        {formError && (
          <p role="alert" className="rounded-xl border border-danger/50 bg-raised px-4 py-3 text-sm text-danger">
            {formError}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-full sm:w-auto sm:min-w-56" disabled={submitting}>
          {submitting ? "در حال ثبت…" : "ثبت درخواست سفارش"}
        </button>
        <p className="text-sm leading-7 text-dim">با ثبت درخواست، هنوز پرداختی انجام نمی‌شود. همکاران ما برای هماهنگی نهایی و پرداخت با شما تماس می‌گیرند.</p>
      </form>

      <aside className="h-fit rounded-2xl border border-line bg-raised p-5 lg:sticky lg:top-24" aria-label="مرور سفارش">
        <h2 className="text-lg font-extrabold">مرور سفارش</h2>
        <ul className="mt-4 divide-y divide-line text-sm">
          {quote.lines.map((l) => (
            <li key={l.productId} className="flex items-start justify-between gap-3 py-3">
              <span className="min-w-0">
                {l.name}
                <span className="num text-dim"> × {formatNumber(l.quantity)}</span>
              </span>
              <span className="shrink-0 num">{formatToman(l.lineToman)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-2 space-y-2 border-t border-line pt-4 text-sm num">
          <div className="flex justify-between">
            <dt className="text-dim">جمع عطرها</dt>
            <dd>{formatToman(quote.subtotalToman)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-dim">هزینه‌ی ارسال</dt>
            <dd>{quote.shippingToman > 0 ? formatToman(quote.shippingToman) : "هماهنگ می‌شود"}</dd>
          </div>
          <div className="flex justify-between pt-2 text-base font-semibold">
            <dt>مبلغ نهایی</dt>
            <dd className="text-gold">{formatToman(quote.totalToman)}</dd>
          </div>
        </dl>
        <Link href="/cart" className="mt-4 inline-block text-sm text-neon-soft underline underline-offset-4">
          ویرایش سبد خرید
        </Link>
      </aside>
    </div>
  );
}
