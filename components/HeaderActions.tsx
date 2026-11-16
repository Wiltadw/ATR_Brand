"use client";

import Link from "next/link";
import { IconBag, IconHeart } from "./icons";
import { useStore } from "./StoreProvider";
import { formatNumber } from "@/lib/format";

function Badge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="absolute -top-1 -start-1 grid min-w-5 h-5 px-1 place-items-center rounded-full bg-neon text-[11px] font-semibold leading-none text-white num">
      {formatNumber(n)}
    </span>
  );
}

export function HeaderActions() {
  const { cartCount, wishlist, ready } = useStore();
  return (
    <div className="flex items-center gap-1">
      <Link
        href="/wishlist"
        aria-label={`علاقه‌مندی‌ها${ready && wishlist.length ? `، ${formatNumber(wishlist.length)} مورد` : ""}`}
        className="relative grid h-11 w-11 place-items-center rounded-full text-cream hover:text-neon-soft"
      >
        <IconHeart />
        {ready && <Badge n={wishlist.length} />}
      </Link>
      <Link
        href="/cart"
        aria-label={`سبد خرید${ready && cartCount ? `، ${formatNumber(cartCount)} عدد` : ""}`}
        className="relative grid h-11 w-11 place-items-center rounded-full text-cream hover:text-neon-soft"
      >
        <IconBag />
        {ready && <Badge n={cartCount} />}
      </Link>
    </div>
  );
}
