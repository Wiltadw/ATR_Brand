import type { Metadata } from "next";
import { CartView } from "@/components/CartView";

export const metadata: Metadata = { title: "سبد خرید" };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <h1 className="mb-8 text-3xl font-extrabold">سبد خرید</h1>
      <CartView />
    </div>
  );
}
