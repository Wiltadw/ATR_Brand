"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconBag, IconCheck } from "./icons";
import { useStore } from "./StoreProvider";

export function AddToCartButton({ productId, available, label = "افزودن به سبد خرید" }: { productId: number; available: boolean; label?: string }) {
  const { addToCart } = useStore();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 2500);
    return () => clearTimeout(t);
  }, [added]);

  if (!available) {
    return (
      <button type="button" className="btn btn-primary w-full" disabled>
        فعلاً قابل سفارش نیست
      </button>
    );
  }
  return (
    <div className="space-y-2">
      <button
        type="button"
        className="btn btn-primary w-full"
        onClick={() => {
          addToCart(productId, 1);
          setAdded(true);
        }}
      >
        {added ? <IconCheck size={20} /> : <IconBag size={20} />}
        {added ? "به سبد اضافه شد" : label}
      </button>
      {/* اعلام وضعیت برای صفحه‌خوان‌ها */}
      <p className="min-h-5 text-center text-sm" role="status" aria-live="polite">
        {added && (
          <Link href="/cart" className="text-neon-soft underline underline-offset-4">
            مشاهده‌ی سبد خرید
          </Link>
        )}
      </p>
    </div>
  );
}
