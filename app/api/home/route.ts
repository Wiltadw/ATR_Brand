import { handle, json } from "@/lib/api";
import { listProducts } from "@/lib/products";

/** داده بخش‌های صفحه اصلی در یک درخواست */
export async function GET() {
  return handle(async () => {
    const [featured, newest, bestSellers, offers, men, women] = await Promise.all([
      listProducts({ featured: true, pageSize: 8 }),
      listProducts({ sort: "newest", pageSize: 8 }),
      listProducts({ bestSeller: true, pageSize: 8 }),
      listProducts({ onSale: true, pageSize: 8 }),
      listProducts({ gender: "MEN", pageSize: 1 }),
      listProducts({ gender: "WOMEN", pageSize: 1 }),
    ]);
    return json({
      featured: featured.items,
      newArrivals: newest.items,
      bestSellers: bestSellers.items,
      offers: offers.items,
      genderCounts: { MEN: men.total, WOMEN: women.total },
      pricesReady: featured.rateAvailable,
    });
  });
}
