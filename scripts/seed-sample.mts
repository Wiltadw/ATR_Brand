/**
 * داده‌های آزمایشی ATR Brand — فقط برای دیدن و تست سایت.
 * همه محصولات «نمونه آزمایشی» هستند (نام‌ها و قیمت‌ها ساختگی‌اند) و با دستور زیر یکجا حذف می‌شوند:
 *   npm run sample:remove
 */
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "../db";
import { createProduct } from "../lib/admin-products";
import { getCurrencySettings, setManualRate } from "../lib/currency";
import { uploadDir } from "../lib/uploads";
import type { ProductInput } from "../lib/validation";

async function bottleImage(c1: string, c2: string): Promise<string> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1100" viewBox="0 0 900 1100">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a1714"/><stop offset="1" stop-color="#0b0a09"/></linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c1}"/><stop offset="0.5" stop-color="${c2}"/><stop offset="1" stop-color="${c1}"/></linearGradient>
    <linearGradient id="cap" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a6d3b"/><stop offset="0.5" stop-color="#e7d3a1"/><stop offset="1" stop-color="#8a6d3b"/></linearGradient>
  </defs>
  <rect width="900" height="1100" fill="url(#bg)"/>
  <ellipse cx="450" cy="930" rx="260" ry="38" fill="#000" opacity="0.5"/>
  <rect x="395" y="150" width="110" height="90" rx="10" fill="url(#cap)"/>
  <rect x="420" y="235" width="60" height="50" fill="#b99b5f"/>
  <rect x="270" y="280" width="360" height="620" rx="46" fill="url(#glass)" opacity="0.92"/>
  <rect x="300" y="310" width="40" height="560" rx="20" fill="#fff" opacity="0.14"/>
  <rect x="345" y="520" width="210" height="150" rx="6" fill="#0b0a09" opacity="0.55" stroke="#c9ad6f" stroke-width="2"/>
  <text x="450" y="605" font-family="serif" font-size="46" fill="#e7d3a1" text-anchor="middle" letter-spacing="8">ATR</text>
  <text x="450" y="650" font-family="serif" font-size="20" fill="#c9ad6f" text-anchor="middle" letter-spacing="4">SAMPLE</text>
</svg>`;
  const filename = `${randomUUID()}.webp`;
  await mkdir(uploadDir(), { recursive: true });
  await sharp(Buffer.from(svg)).webp({ quality: 85 }).toFile(path.join(uploadDir(), filename));
  return filename;
}

const tagRows = await db.select().from(schema.tags);
const tag = (...names: string[]) =>
  names.map((n) => tagRows.find((t) => t.name === n)?.id).filter((x): x is number => !!x);
const [category] = await db.select().from(schema.categories).limit(1);

type Sample = Partial<ProductInput> &
  Pick<ProductInput, "name" | "nameEn" | "priceAed" | "gender" | "tagIds"> & { colors: [string, string] };

const samples: Sample[] = [
  { name: "نوآر آمبر (نمونه آزمایشی)", nameEn: "Noir Ambre Sample", priceAed: 250, gender: "MEN", tagIds: tag("گرم", "چوبی", "شبانه", "پاییزی", "مردانه"), fragranceFamily: "چوبی ادویه‌ای", topNotes: "فلفل صورتی، برگاموت", middleNotes: "چوب سدر، ادویه", baseNotes: "عنبر، وانیل", longevity: "۸ تا ۱۰ ساعت", projection: "قوی", featured: true, bestSeller: true, colors: ["#3b2a1a", "#8c5a2b"] },
  { name: "رز بلان (نمونه آزمایشی)", nameEn: "Rose Blanc Sample", priceAed: 310, gender: "WOMEN", tagIds: tag("گلی", "شیرین", "بهاری", "روزانه", "زنانه"), fragranceFamily: "گلی", topNotes: "گلابی، نارنج", middleNotes: "رز دمشقی، یاس", baseNotes: "مشک سفید", longevity: "۶ تا ۸ ساعت", projection: "متوسط", featured: true, colors: ["#5b2a3a", "#d68ba3"] },
  { name: "سیتروس لومیر (نمونه آزمایشی)", nameEn: "Citrus Lumiere Sample", priceAed: 180, gender: "UNISEX", tagIds: tag("خنک", "مرکباتی", "تابستانی", "روزانه", "اسپرت", "یونیسکس"), fragranceFamily: "مرکباتی", topNotes: "لیمو، گریپ‌فروت", middleNotes: "نعنا", baseNotes: "چوب سفید", longevity: "۴ تا ۶ ساعت", projection: "ملایم", bestSeller: true, colors: ["#4a5a1f", "#d8c84a"] },
  { name: "عود سلطانی (نمونه آزمایشی)", nameEn: "Oud Sultani Sample", priceAed: 520, gender: "UNISEX", tagIds: tag("گرم", "تلخ", "تند", "شبانه", "زمستانی", "رسمی", "یونیسکس"), fragranceFamily: "عودی", topNotes: "زعفران", middleNotes: "عود", baseNotes: "پچولی، مشک", longevity: "۱۲ ساعت به بالا", projection: "بسیار قوی", featured: true, discountPercent: 15, colors: ["#1f1410", "#6e3b1f"] },
  { name: "ونیل نوکتورن (نمونه آزمایشی)", nameEn: "Vanille Nocturne Sample", priceAed: 275, gender: "WOMEN", tagIds: tag("شیرین", "گرم", "شبانه", "زمستانی", "زنانه"), fragranceFamily: "شرقی وانیلی", topNotes: "هل", middleNotes: "گل ارکیده", baseNotes: "وانیل، تونکا", longevity: "۸ ساعت", projection: "متوسط تا قوی", colors: ["#4b3b2a", "#e0c08a"] },
  { name: "آکوا مارین (نمونه آزمایشی)", nameEn: "Aqua Marine Sample", priceAed: 160, gender: "MEN", tagIds: tag("خنک", "اسپرت", "تابستانی", "روزانه", "مردانه"), fragranceFamily: "آبی", topNotes: "نمک دریایی", middleNotes: "یاس دریایی", baseNotes: "خزه", longevity: "۵ ساعت", projection: "متوسط", availability: "UNAVAILABLE", colors: ["#123a52", "#4ea3c9"] },
  { name: "جاردین سکرت (نمونه آزمایشی)", nameEn: "Jardin Secret Sample", priceAed: 230, gender: "WOMEN", tagIds: tag("گلی", "خنک", "بهاری", "روزانه", "زنانه"), fragranceFamily: "گلی میوه‌ای", topNotes: "هلو", middleNotes: "سوسن", baseNotes: "صندل", longevity: "۶ ساعت", projection: "ملایم", availability: "COMING_SOON", colors: ["#2d4a35", "#9bc9a0"] },
  { name: "تباکو لِدِر (نمونه آزمایشی)", nameEn: "Tabac Leather Sample", priceAed: 340, gender: "MEN", tagIds: tag("گرم", "تلخ", "تند", "ادویه‌ای", "پاییزی", "زمستانی", "رسمی", "مردانه"), fragranceFamily: "چرمی", topNotes: "دارچین", middleNotes: "توتون", baseNotes: "چرم، ونیل", longevity: "۱۰ ساعت", projection: "قوی", discountPercent: 10, colors: ["#2a1a12", "#7a4a2a"] },
];

let made = 0;
for (const s of samples) {
  const { colors, ...rest } = s;
  const created = await createProduct({
    brand: "ATR نمونه",
    categoryId: category?.id ?? null,
    discountPercent: null,
    discountEndsAt: null,
    shortDescription: "این یک محصول آزمایشی است و فقط برای تست سایت ساخته شده.",
    description: "این محصول، نام، قیمت و مشخصاتش ساختگی است و فقط برای دیدن ظاهر فروشگاه و تست امکانات ساخته شده است. قبل از انتشار سایت با دستور حذف نمونه‌ها پاک می‌شود.",
    availability: "AVAILABLE",
    featured: false,
    bestSeller: false,
    fragranceFamily: null,
    topNotes: null,
    middleNotes: null,
    baseNotes: null,
    longevity: null,
    projection: null,
    ...rest,
    priceAed: Math.round(s.priceAed * 100), // مثل اعتبارسنجی API: درهم → فلس
  } as ProductInput);
  await db.update(schema.products).set({ isSample: true }).where(eq(schema.products.id, created.id));
  await db.insert(schema.productImages).values({ productId: created.id, filename: await bottleImage(colors[0], colors[1]), alt: s.name });
  made++;
}
console.log(`✓ ${made} محصول آزمایشی ساخته شد.`);

// اطلاعات تماس و هزینه ارسال آزمایشی (بعداً در پنل مدیریت عوض می‌شوند)
await db.update(schema.storeSettings).set({
  phone: "09120000000",
  instagram: "atrbrand_test",
  telegram: "atrbrand_test",
  whatsapp: "09120000000",
  email: "test@example.com",
  address: "تهران، آدرس آزمایشی (بعداً ویرایش می‌شود)",
  shippingFeeToman: 150000,
}).where(eq(schema.storeSettings.id, 1));
console.log("✓ اطلاعات تماس و هزینه ارسال آزمایشی ثبت شد (ویرایش از پنل مدیریت).");

// نرخ آزمایشی فقط اگر هنوز هیچ نرخی تعیین نشده
const cur = await getCurrencySettings();
if (!cur.effectiveRate) {
  await setManualRate(25000);
  console.log("⚠ نرخ آزمایشی ۲۵٬۰۰۰ تومان به‌ازای هر درهم ثبت شد. این نرخ واقعی نیست؛ حتماً از پنل مدیریت نرخ واقعی را وارد کنید.");
}
void inArray;
