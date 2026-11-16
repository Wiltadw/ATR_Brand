import { z } from "zod";
import { AVAILABILITY, GENDERS, ORDER_STATUSES, TAG_GROUPS } from "@/db/schema";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `حداکثر ${max} کاراکتر مجاز است`)
    .nullish()
    .transform((v) => (v ? v : null));

/** قیمت درهم به‌صورت عدد (مثلاً 250 یا 249.5) دریافت و به فلس تبدیل می‌شود */
const aedPrice = z
  .number({ error: "قیمت درهمی باید عدد باشد" })
  .positive("قیمت باید بیشتر از صفر باشد")
  .max(1_000_000, "قیمت بیش از حد بزرگ است")
  .transform((v) => Math.round(v * 100));

export const productInput = z.object({
  name: z.string().trim().min(1, "نام محصول الزامی است").max(120),
  nameEn: optionalText(120),
  brand: z.string().trim().min(1, "نام برند الزامی است").max(80),
  categoryId: z.number().int().positive().nullish().transform((v) => v ?? null),
  priceAed: aedPrice,
  discountPercent: z
    .number()
    .int()
    .min(1, "تخفیف باید بین ۱ تا ۹۹ باشد")
    .max(99, "تخفیف باید بین ۱ تا ۹۹ باشد")
    .nullish()
    .transform((v) => v ?? null),
  discountEndsAt: z
    .string()
    .datetime({ offset: true, message: "تاریخ پایان تخفیف نامعتبر است" })
    .nullish()
    .transform((v) => (v ? new Date(v) : null)),
  shortDescription: optionalText(300),
  description: optionalText(5000),
  gender: z.enum(GENDERS).default("UNISEX"),
  fragranceFamily: optionalText(80),
  topNotes: optionalText(200),
  middleNotes: optionalText(200),
  baseNotes: optionalText(200),
  longevity: optionalText(80),
  projection: optionalText(80),
  availability: z.enum(AVAILABILITY).default("AVAILABLE"),
  featured: z.boolean().default(false),
  bestSeller: z.boolean().default(false),
  tagIds: z.array(z.number().int().positive()).max(30).default([]),
});
export type ProductInput = z.infer<typeof productInput>;

export const tagInput = z.object({
  name: z.string().trim().min(1, "نام تگ الزامی است").max(40),
  group: z.enum(TAG_GROUPS).default("OTHER"),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export const categoryInput = z.object({
  name: z.string().trim().min(1, "نام دسته الزامی است").max(60),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export const loginInput = z.object({
  username: z.string().trim().min(1).max(60),
  password: z.string().min(1).max(200),
});

export const passwordChangeInput = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(10, "رمز جدید باید حداقل ۱۰ کاراکتر باشد").max(200),
});

/** شماره موبایل ایران؛ ارقام فارسی هم پذیرفته می‌شود */
const phone = z
  .string()
  .trim()
  .transform((v) =>
    v
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
      .replace(/[\s-]/g, ""),
  )
  .refine((v) => /^(\+98|0098|0)?9\d{9}$/.test(v), "شماره موبایل معتبر نیست (مثال: 09123456789)")
  .transform((v) => "0" + v.replace(/^(\+98|0098|0)/, ""));

const cartItems = z
  .array(
    z.object({
      productId: z.number().int().positive(),
      quantity: z.number().int().min(1).max(20, "حداکثر ۲۰ عدد از هر محصول"),
    }),
  )
  .min(1, "سبد خرید خالی است")
  .max(50);

export const quoteInput = z.object({ items: cartItems });

export const orderInput = z.object({
  customerName: z.string().trim().min(2, "نام را وارد کنید").max(80),
  phone,
  address: z.string().trim().min(10, "آدرس را کامل‌تر وارد کنید").max(500),
  notes: optionalText(500),
  items: cartItems,
});

export const orderPatchInput = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  adminNote: optionalText(1000).optional(),
});

export const storeSettingsInput = z.object({
  storeName: z.string().trim().min(1).max(60),
  phone: optionalText(40),
  instagram: optionalText(120),
  telegram: optionalText(120),
  whatsapp: optionalText(120),
  email: optionalText(120),
  address: optionalText(300),
  shippingFeeToman: z.number().int().min(0).max(100_000_000),
});

export const currencyInput = z.object({
  action: z.enum(["setManual", "restoreAutomatic", "setAutoUpdate"]),
  rate: z.number().optional(),
  enabled: z.boolean().optional(),
});
