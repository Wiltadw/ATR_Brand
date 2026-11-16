import type { Metadata } from "next";
import Link from "next/link";
import { formatToman } from "@/lib/format";

export const metadata: Metadata = { title: "درخواست سفارش ثبت شد" };

type Props = { searchParams: Promise<{ order?: string; total?: string }> };

export default async function SuccessPage({ searchParams }: Props) {
  const { order, total } = await searchParams;
  const valid = order && /^ATR-\d{6}-[A-Z0-9]{5}$/.test(order);
  const totalNum = Number(total);
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-3xl font-extrabold">{valid ? "درخواست شما ثبت شد" : "صفحه‌ی نامعتبر"}</h1>
      {valid ? (
        <>
          <p className="mt-6 text-dim">شماره‌ی پیگیری سفارش</p>
          <p dir="ltr" className="mt-1 text-2xl font-extrabold tracking-wider text-neon-soft">
            {order}
          </p>
          {Number.isFinite(totalNum) && totalNum > 0 && <p className="mt-4 num">مبلغ نهایی: <span className="text-gold">{formatToman(totalNum)}</span></p>}
          <p className="mt-6 rounded-2xl border border-line bg-raised p-5 leading-8 text-dim">
            ثبت درخواست به معنی پرداخت نیست. همکاران ما برای هماهنگی نهایی و پرداخت با شما تماس می‌گیرند. لطفاً شماره‌ی پیگیری را نگه دارید.
          </p>
        </>
      ) : (
        <p className="mt-4 text-dim">برای دیدن سفارش‌ها از صفحه‌ی عطرها شروع کنید.</p>
      )}
      <Link href="/products" className="btn btn-primary mt-8">
        بازگشت به فروشگاه
      </Link>
    </div>
  );
}
