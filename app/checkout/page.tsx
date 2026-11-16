import type { Metadata } from "next";
import { CheckoutForm } from "@/components/CheckoutForm";

export const metadata: Metadata = { title: "ثبت سفارش" };

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <h1 className="mb-8 text-3xl font-extrabold">ثبت درخواست سفارش</h1>
      <CheckoutForm />
    </div>
  );
}
