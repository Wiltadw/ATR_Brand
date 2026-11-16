import type { Metadata } from "next";
import { WishlistView } from "@/components/WishlistView";

export const metadata: Metadata = { title: "علاقه‌مندی‌ها" };

export default function WishlistPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <h1 className="mb-8 text-3xl font-extrabold">علاقه‌مندی‌ها</h1>
      <WishlistView />
    </div>
  );
}
