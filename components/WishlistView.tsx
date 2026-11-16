"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PublicProduct } from "@/lib/products";
import { ProductGrid } from "./ProductCard";
import { useStore } from "./StoreProvider";

type Result = { key: string; items?: PublicProduct[]; error?: boolean };

export function WishlistView() {
  const { ready, wishlist } = useStore();
  const key = wishlist.join(",");
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!ready || wishlist.length === 0) return;
    const ctrl = new AbortController();
    fetch(`/api/products?ids=${key}&limit=48`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setResult({ key, items: d.items }))
      .catch((e) => {
        if (e?.name !== "AbortError") setResult({ key, error: true });
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  if (ready && wishlist.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-dashed border-line px-6 py-16 text-center">
        <p className="text-lg font-semibold">هنوز عطری را نشان نکرده‌اید</p>
        <p className="mt-2 text-sm text-dim">روی قلب کنار هر عطر بزنید تا اینجا نگهداری شود.</p>
        <Link href="/products" className="btn btn-primary mt-6">
          دیدن عطرها
        </Link>
      </div>
    );
  }
  const current = result?.key === key ? result : null;
  if (!ready || !current) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton aspect-[4/6]" />
        ))}
      </div>
    );
  }
  if (current.error || !current.items) {
    return (
      <p role="alert" className="rounded-2xl border border-danger/50 bg-raised p-6 text-danger">
        دریافت لیست انجام نشد. صفحه را دوباره باز کنید.
      </p>
    );
  }
  if (current.items.length === 0) {
    return <p className="text-dim">محصولات ذخیره‌شده‌ی شما دیگر در فروشگاه موجود نیستند.</p>;
  }
  return <ProductGrid products={current.items} />;
}
