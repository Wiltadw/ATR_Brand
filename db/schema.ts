import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

const now = () => new Date();

/** مدیران فروشگاه (رمز عبور فقط به‌صورت هش ذخیره می‌شود) */
export const adminUsers = sqliteTable("admin_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  // با تغییر رمز، این عدد زیاد می‌شود و نشست‌های قدیمی بی‌اعتبار می‌شوند
  sessionVersion: integer("session_version").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(now),
});

/** دسته‌بندی محصولات (مثلاً عطر، ست هدیه) */
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const GENDERS = ["MEN", "WOMEN", "UNISEX"] as const;
export const AVAILABILITY = ["AVAILABLE", "UNAVAILABLE", "COMING_SOON"] as const;
export type Gender = (typeof GENDERS)[number];
export type Availability = (typeof AVAILABILITY)[number];

/**
 * محصولات. قیمت اصلی همیشه به درهم و به‌صورت «فلس» (۱۰۰ فلس = ۱ درهم) ذخیره می‌شود
 * تا خطای اعشاری نداشته باشیم. قیمت تومان هیچ‌وقت ذخیره نمی‌شود؛ همیشه از نرخ فعلی محاسبه می‌شود.
 */
export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    nameEn: text("name_en"),
    brand: text("brand").notNull(),
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    priceAedMinor: integer("price_aed_minor").notNull(),
    discountPercent: integer("discount_percent"), // ۱ تا ۹۹
    discountEndsAt: integer("discount_ends_at", { mode: "timestamp" }),
    shortDescription: text("short_description"),
    description: text("description"),
    gender: text("gender", { enum: GENDERS }).notNull().default("UNISEX"),
    fragranceFamily: text("fragrance_family"),
    topNotes: text("top_notes"),
    middleNotes: text("middle_notes"),
    baseNotes: text("base_notes"),
    longevity: text("longevity"),
    projection: text("projection"),
    availability: text("availability", { enum: AVAILABILITY })
      .notNull()
      .default("AVAILABLE"),
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    bestSeller: integer("best_seller", { mode: "boolean" }).notNull().default(false),
    // محصولات آزمایشی با یک دستور حذف می‌شوند
    isSample: integer("is_sample", { mode: "boolean" }).notNull().default(false),
    // متن نرمال‌شده برای جستجوی فارسی/انگلیسی
    searchText: text("search_text").notNull().default(""),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(now),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(now),
  },
  (t) => [
    index("products_availability_idx").on(t.availability),
    index("products_featured_idx").on(t.featured),
    index("products_created_idx").on(t.createdAt),
  ],
);

export const productImages = sqliteTable(
  "product_images",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(), // نام فایل در پوشه آپلود
    alt: text("alt"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("product_images_product_idx").on(t.productId)],
);

export const TAG_GROUPS = ["FRAGRANCE", "USAGE", "SEASON", "AUDIENCE", "OTHER"] as const;
export type TagGroup = (typeof TAG_GROUPS)[number];

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  group: text("group", { enum: TAG_GROUPS }).notNull().default("OTHER"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const productTags = sqliteTable(
  "product_tags",
  {
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.tagId] }), index("product_tags_tag_idx").on(t.tagId)],
);

/** تنظیمات ارز (یک ردیف ثابت با id=1) */
export const currencySettings = sqliteTable("currency_settings", {
  id: integer("id").primaryKey(),
  autoUpdateEnabled: integer("auto_update_enabled", { mode: "boolean" })
    .notNull()
    .default(false),
  manualOverrideEnabled: integer("manual_override_enabled", { mode: "boolean" })
    .notNull()
    .default(false),
  manualRate: integer("manual_rate"), // تومان به‌ازای هر درهم
  autoRate: integer("auto_rate"), // آخرین نرخ موفقِ خودکار
  autoRateSource: text("auto_rate_source"),
  // نرخی که الان قیمت‌ها با آن حساب می‌شود؛ null یعنی هنوز نرخی تعیین نشده
  effectiveRate: integer("effective_rate"),
  effectiveSource: text("effective_source"), // MANUAL | AUTO | SAMPLE
  lastSuccessAt: integer("last_success_at", { mode: "timestamp" }),
  lastAttemptAt: integer("last_attempt_at", { mode: "timestamp" }),
  lastStatus: text("last_status"), // SUCCESS | FAILED | NEVER
  lastError: text("last_error"),
});

/** تاریخچه نرخ‌ها و تلاش‌های بروزرسانی (موفق و ناموفق) */
export const exchangeRateLogs = sqliteTable("exchange_rate_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  rate: integer("rate"),
  source: text("source").notNull(),
  kind: text("kind").notNull(), // AUTO | MANUAL | SYSTEM
  success: integer("success", { mode: "boolean" }).notNull(),
  message: text("message"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(now),
});

/** اطلاعات و تنظیمات فروشگاه (یک ردیف ثابت با id=1) */
export const storeSettings = sqliteTable("store_settings", {
  id: integer("id").primaryKey(),
  storeName: text("store_name").notNull().default("ATR Brand"),
  phone: text("phone"),
  instagram: text("instagram"),
  telegram: text("telegram"),
  whatsapp: text("whatsapp"),
  email: text("email"),
  address: text("address"),
  shippingFeeToman: integer("shipping_fee_toman").notNull().default(0),
});

export const PRICE_REASONS = ["INITIAL", "AED_CHANGE", "DISCOUNT_CHANGE", "RATE_CHANGE"] as const;
export type PriceReason = (typeof PRICE_REASONS)[number];

/** تاریخچه قیمت؛ دلیل تغییر (نرخ ارز / تغییر دستی قیمت درهمی) جدا ثبت می‌شود */
export const priceHistory = sqliteTable(
  "price_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    priceAedMinor: integer("price_aed_minor").notNull(),
    discountPercent: integer("discount_percent"),
    rate: integer("rate").notNull(),
    priceToman: integer("price_toman").notNull(), // قیمت نهایی (بعد از تخفیف)
    reason: text("reason", { enum: PRICE_REASONS }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(now),
  },
  (t) => [index("price_history_product_idx").on(t.productId, t.createdAt)],
);

export const ORDER_STATUSES = [
  "NEW",
  "REVIEWING",
  "CONFIRMED",
  "PREPARING",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["UNPAID", "PENDING", "PAID", "FAILED", "REFUNDED"] as const;

/** درخواست سفارش. پرداخت آنلاین هنوز وجود ندارد، ولی ستون‌ها و جدول payments برای آینده آماده‌اند. */
export const orders = sqliteTable(
  "orders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderNumber: text("order_number").notNull().unique(),
    customerName: text("customer_name").notNull(),
    phone: text("phone").notNull(),
    address: text("address").notNull(),
    notes: text("notes"),
    status: text("status", { enum: ORDER_STATUSES }).notNull().default("NEW"),
    paymentStatus: text("payment_status", { enum: PAYMENT_STATUSES })
      .notNull()
      .default("UNPAID"),
    subtotalToman: integer("subtotal_toman").notNull(),
    shippingToman: integer("shipping_toman").notNull().default(0),
    totalToman: integer("total_toman").notNull(),
    rateUsed: integer("rate_used").notNull(),
    adminNote: text("admin_note"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(now),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(now),
  },
  (t) => [index("orders_status_idx").on(t.status), index("orders_created_idx").on(t.createdAt)],
);

/** اقلام سفارش؛ نام و قیمت هنگام ثبت کپی می‌شوند تا تغییر بعدی محصول، سفارش قدیمی را خراب نکند */
export const orderItems = sqliteTable(
  "order_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    productName: text("product_name").notNull(),
    brand: text("brand").notNull(),
    unitPriceAedMinor: integer("unit_price_aed_minor").notNull(),
    unitPriceToman: integer("unit_price_toman").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

/** آماده برای درگاه پرداخت در آینده (فعلاً استفاده نمی‌شود) */
export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  reference: text("reference"),
  amountToman: integer("amount_toman").notNull(),
  status: text("status", { enum: PAYMENT_STATUSES }).notNull().default("PENDING"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(now),
});
