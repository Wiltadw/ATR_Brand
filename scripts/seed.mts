import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";

// ۱) مدیر اولیه (از .env؛ هرگز در کد نوشته نشده)
const username = process.env.ADMIN_USERNAME?.trim();
const password = process.env.ADMIN_PASSWORD;
const [existing] = await db.select().from(schema.adminUsers).limit(1);
if (existing) {
  console.log("• مدیر از قبل وجود دارد؛ تغییری داده نشد.");
} else {
  if (!username || !password || password.length < 10) {
    console.error("✗ ADMIN_USERNAME و ADMIN_PASSWORD (حداقل ۱۰ کاراکتر) را در فایل .env تنظیم کنید.");
    process.exit(1);
  }
  await db.insert(schema.adminUsers).values({ username, passwordHash: await argon2.hash(password) });
  console.log(`✓ مدیر «${username}» ساخته شد. بعد از اولین ورود رمز را از پنل عوض کنید.`);
}

// ۲) ردیف‌های تنظیمات
await db.insert(schema.currencySettings).values({ id: 1, lastStatus: "NEVER" }).onConflictDoNothing();
await db.insert(schema.storeSettings).values({ id: 1 }).onConflictDoNothing();

// ۳) تگ‌ها و دسته پیش‌فرض (قابل ویرایش در پنل مدیریت)
const defaults: Record<(typeof schema.TAG_GROUPS)[number], string[]> = {
  FRAGRANCE: ["خنک", "گرم", "شیرین", "تلخ", "تند", "چوبی", "مرکباتی", "گلی", "ادویه‌ای"],
  USAGE: ["روزانه", "رسمی", "شبانه", "اسپرت"],
  SEASON: ["تابستانی", "زمستانی", "بهاری", "پاییزی"],
  AUDIENCE: ["مردانه", "زنانه", "یونیسکس"],
  OTHER: [],
};
let order = 0;
let added = 0;
for (const [group, names] of Object.entries(defaults)) {
  for (const name of names) {
    const [hit] = await db.select().from(schema.tags).where(eq(schema.tags.name, name));
    order++;
    if (hit) continue;
    const slug = name.replace(/[‌\s]+/g, "-");
    await db.insert(schema.tags).values({ name, slug, group: group as "FRAGRANCE", sortOrder: order });
    added++;
  }
}
console.log(`✓ ${added} تگ پیش‌فرض اضافه شد.`);
await db.insert(schema.categories).values({ name: "عطر", slug: "عطر", sortOrder: 1 }).onConflictDoNothing();
console.log("✓ داده‌های پایه آماده است.");
