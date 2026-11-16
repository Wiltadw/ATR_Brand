"use client";

import { IconHeart } from "./icons";
import { useStore } from "./StoreProvider";

export function WishlistButton({ productId, productName, className = "" }: { productId: number; productName: string; className?: string }) {
  const { inWishlist, toggleWishlist, ready } = useStore();
  const active = ready && inWishlist(productId);
  return (
    <button
      type="button"
      onClick={() => toggleWishlist(productId)}
      aria-pressed={active}
      aria-label={active ? `حذف «${productName}» از علاقه‌مندی‌ها` : `افزودن «${productName}» به علاقه‌مندی‌ها`}
      className={`grid h-11 w-11 place-items-center rounded-full border border-line bg-ink/70 backdrop-blur transition-colors hover:border-neon-soft ${active ? "text-neon" : "text-cream"} ${className}`}
    >
      <IconHeart filled={active} size={20} />
    </button>
  );
}
