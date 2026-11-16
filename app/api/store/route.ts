import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { handle, json } from "@/lib/api";
import { getCurrencySettings } from "@/lib/currency";
import { getStoreSettings } from "@/lib/orders";

/** اطلاعات عمومی فروشگاه (بدون هیچ داده حساس) */
export async function GET() {
  return handle(async () => {
    const [store, currency, categories] = await Promise.all([
      getStoreSettings(),
      getCurrencySettings(),
      db.select().from(schema.categories).orderBy(asc(schema.categories.sortOrder)),
    ]);
    return json({
      store: {
        storeName: store.storeName,
        phone: store.phone,
        instagram: store.instagram,
        telegram: store.telegram,
        whatsapp: store.whatsapp,
        email: store.email,
        address: store.address,
        shippingFeeToman: store.shippingFeeToman,
      },
      currency: {
        rate: currency.effectiveRate, // تومان به‌ازای هر درهم؛ null یعنی هنوز تعیین نشده
        updatedAt: (currency.lastSuccessAt ?? null)?.toISOString() ?? null,
        pricesReady: !!currency.effectiveRate,
      },
      categories,
    });
  });
}
