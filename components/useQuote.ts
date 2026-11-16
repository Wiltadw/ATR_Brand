"use client";

import { useEffect, useState } from "react";
import type { CartItem } from "./StoreProvider";

export type QuoteLine = {
  productId: number;
  name: string;
  brand: string;
  slug: string;
  image: string | null;
  quantity: number;
  unitPriceToman: number;
  lineToman: number;
};
export type Quote = { lines: QuoteLine[]; subtotalToman: number; shippingToman: number; totalToman: number };
export type QuoteProblem = { productId: number; reason: string };

type Result = { key: string; quote?: Quote; error?: string; problems?: QuoteProblem[] };

/** قیمت سبد را از سرور می‌گیرد (قیمت واقعی همیشه سمت سرور حساب می‌شود). */
export function useQuote(cart: CartItem[], ready: boolean) {
  const key = JSON.stringify(cart);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!ready || cart.length === 0) return;
    const ctrl = new AbortController();
    fetch("/api/cart/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart }),
      signal: ctrl.signal,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok) setResult({ key, quote: data });
        else setResult({ key, error: data.error ?? "خطا در دریافت قیمت سبد", problems: data.problems });
      })
      .catch((e) => {
        if (e?.name !== "AbortError") setResult({ key, error: "ارتباط با سرور برقرار نشد. دوباره تلاش کنید." });
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  const empty = ready && cart.length === 0;
  const loading = !empty && (!ready || result?.key !== key);
  const current = result?.key === key ? result : null;
  return { loading, empty, quote: current?.quote, error: current?.error, problems: current?.problems };
}
