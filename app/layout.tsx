import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ATR Brand | فروشگاه عطر",
  description: "فروشگاه آنلاین عطرهای لوکس ATR Brand",
};

// فونت و طراحی نهایی در فاز ۳ (رابط کاربری) اضافه می‌شود.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fa" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
