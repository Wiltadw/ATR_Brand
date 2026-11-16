import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { StoreProvider } from "@/components/StoreProvider";

// فوتر از دیتابیس می‌خواند؛ پس صفحه‌ها در هر درخواست ساخته می‌شوند
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "برند | فروشگاه عطر", template: "%s | برند" },
  description: "فروشگاه آنلاین عطر؛ قیمت هر عطر از روی نرخ درهم همان روز.",
};

export const viewport: Viewport = {
  themeColor: "#0c0810",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="flex min-h-dvh flex-col">
        <StoreProvider>
          <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-neon focus:px-4 focus:py-2 focus:text-white">
            رفتن به محتوا
          </a>
          <Header />
          <main id="content" className="flex-1">
            {children}
          </main>
          <Footer />
        </StoreProvider>
      </body>
    </html>
  );
}
