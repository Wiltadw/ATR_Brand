/**
 * تست خودکار APIها روی سرور در حال اجرا:  npm run test:api
 * از .env می‌خواند؛ هیچ رمزی در این فایل نیست.
 */
const BASE = process.env.TEST_BASE ?? "http://localhost:3000";
const ORIGIN = BASE;
let pass = 0;
let fail = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    failures.push(name);
    console.log(`  ✗ ${name}`, detail !== undefined ? JSON.stringify(detail).slice(0, 300) : "");
  }
}

let cookie = "";
async function call(method: string, path: string, body?: unknown, opts: { auth?: boolean; headers?: Record<string, string>; raw?: BodyInit } = {}) {
  const headers: Record<string, string> = { Origin: ORIGIN, ...(opts.headers ?? {}) };
  if (opts.auth !== false && cookie) headers.Cookie = cookie;
  let payload: BodyInit | undefined = opts.raw;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, { method, headers, body: payload });
  const set = res.headers.get("set-cookie");
  if (set && set.includes("atr_admin=")) cookie = set.split(";")[0];
  let data: any = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data, headers: res.headers };
}

const section = (t: string) => console.log(`\n■ ${t}`);

// ---------- امنیت و دسترسی ----------
section("امنیت: دسترسی بدون ورود");
for (const [m, p] of [
  ["GET", "/api/admin/products"],
  ["POST", "/api/admin/products"],
  ["GET", "/api/admin/orders"],
  ["GET", "/api/admin/currency"],
  ["GET", "/api/admin/stats"],
  ["POST", "/api/admin/tags"],
] as const) {
  const r = await call(m, p, m === "POST" ? {} : undefined, { auth: false });
  check(`${m} ${p} بدون ورود → 401`, r.status === 401, r.status);
}

section("ورود مدیر");
let r = await call("POST", "/api/admin/login", { username: "admin", password: "wrong-password-123" }, { auth: false });
check("رمز اشتباه → 401", r.status === 401, r);
r = await call("POST", "/api/admin/login", { username: "admin", password: process.env.ADMIN_PASSWORD }, { auth: false });
check("ورود با رمز درست → 200", r.status === 200, r);
check("کوکی نشست HttpOnly است", /HttpOnly/i.test(r.headers.get("set-cookie") ?? ""), r.headers.get("set-cookie"));
r = await call("GET", "/api/admin/me");
check("/me پس از ورود → 200", r.status === 200 && r.data.username === "admin", r);

r = await call("POST", "/api/admin/tags", { name: "x" }, { headers: { Origin: "https://evil.example" } });
check("CSRF: Origin بیگانه رد می‌شود → 403", r.status === 403, r);

// ---------- ارز ----------
section("نرخ ارز");
r = await call("GET", "/api/admin/currency");
check("وضعیت ارز خوانده می‌شود", r.status === 200 && r.data.effectiveRate === 25000, r.data);
r = await call("POST", "/api/admin/currency", { action: "setManual", rate: 0 });
check("نرخ صفر رد می‌شود → 400", r.status === 400, r);
r = await call("POST", "/api/admin/currency", { action: "setManual", rate: -5 });
check("نرخ منفی رد می‌شود → 400", r.status === 400, r);
r = await call("POST", "/api/admin/currency", { action: "setManual", rate: 12.5 });
check("نرخ اعشاری رد می‌شود → 400", r.status === 400, r);

section("تبدیل درهم به تومان");
r = await call("GET", "/api/products?q=Oud");
const oud = r.data.items?.[0];
check("جستجوی انگلیسی (Oud) محصول را پیدا می‌کند", r.data.total === 1 && !!oud, r.data.total);
check("قیمت: 520 درهم، تخفیف ۱۵٪ → 442 درهم", oud?.finalPriceAed === 442, oud?.finalPriceAed);
check("تومان = 442 × 25000 = 11,050,000", oud?.priceToman === 11_050_000, oud?.priceToman);
check("قیمت اصلی درهمی حفظ شده (520)", oud?.priceAed === 520, oud?.priceAed);

r = await call("POST", "/api/admin/currency", { action: "setManual", rate: 30000 });
check("تغییر دستی نرخ به 30000 → 200", r.status === 200 && r.data.effectiveRate === 30000 && r.data.effectiveSource === "MANUAL", r.data);
r = await call("GET", "/api/products?q=Oud");
check("قیمت با نرخ جدید فوراً عوض می‌شود: 442×30000=13,260,000", r.data.items[0].priceToman === 13_260_000, r.data.items[0].priceToman);

section("بروزرسانی خودکار و خطاها");
await call("POST", "/api/admin/currency", { action: "setAutoUpdate", enabled: true });
r = await call("POST", "/api/admin/currency/refresh");
check("منبع تنظیم‌نشده → خطا گزارش می‌شود (502)، موفقیت جعلی نیست", r.status === 502 && r.data.ok === false, r.data);
r = await call("GET", "/api/admin/currency");
check("خطا ثبت شده و به مدیر نمایش داده می‌شود", r.data.lastStatus === "FAILED" && !!r.data.lastError, r.data.lastError);
check("نرخ معتبر قبلی (30000) دست‌نخورده ماند", r.data.effectiveRate === 30000, r.data.effectiveRate);
check("لاگ خطا در تاریخچه نرخ هست", r.data.logs.some((l: any) => l.success === false), r.data.logs.length);
r = await call("GET", "/api/products?q=Oud");
check("قیمت‌ها پس از خطا صفر/خراب نشدند", r.data.items[0].priceToman === 13_260_000, r.data.items[0].priceToman);

r = await call("POST", "/api/cron/update-rate", undefined, { auth: false });
check("cron بدون کلید → 401", r.status === 401, r);
r = await call("POST", "/api/cron/update-rate", undefined, { auth: false, headers: { Authorization: "Bearer wrong" } });
check("cron با کلید غلط → 401", r.status === 401, r);
r = await call("POST", "/api/cron/update-rate", undefined, { auth: false, headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
check("cron با کلید درست اجرا می‌شود (نتیجه: خطای منبع تنظیم‌نشده، 502)", r.status === 502 && r.data.ok === false, r);

section("بازگشت به نرخ خودکار");
r = await call("POST", "/api/admin/currency", { action: "restoreAutomatic" });
check("بدون نرخ خودکار موفق، قیمتی ساخته نمی‌شود (effectiveRate = null)", r.data.effectiveRate === null && r.data.manualOverrideEnabled === false, r.data);
r = await call("GET", "/api/products?q=Oud");
check("محصولات بدون نرخ، priceToman = null (نه صفر و نه عدد جعلی)", r.data.items[0].priceToman === null, r.data.items[0].priceToman);
r = await call("POST", "/api/orders", { customerName: "تست", phone: "09121234567", address: "تهران، خیابان آزمایشی ۱", items: [{ productId: oud.id, quantity: 1 }] }, { auth: false });
check("بدون نرخ، ثبت سفارش رد می‌شود → 503", r.status === 503, r);
r = await call("POST", "/api/admin/currency", { action: "setManual", rate: 25000 });
check("نرخ دستی ۲۵۰۰۰ دوباره فعال شد", r.data.effectiveRate === 25000, r.data);

// ---------- محصولات ----------
section("مدیریت محصول");
r = await call("GET", "/api/tags");
const tagMap = new Map<string, number>(r.data.tags.map((t: any) => [t.name, t.id]));
check("تگ‌های پیش‌فرض (۲۰ عدد) موجودند", r.data.tags.length === 20, r.data.tags.length);

const newProduct = {
  name: "تست محصول جدید",
  nameEn: "Test New Perfume",
  brand: "TestBrand",
  priceAed: 100,
  gender: "UNISEX",
  tagIds: [tagMap.get("گرم"), tagMap.get("شبانه")],
  availability: "AVAILABLE",
  featured: false,
};
r = await call("POST", "/api/admin/products", { ...newProduct, priceAed: -3 });
check("قیمت منفی رد می‌شود → 400", r.status === 400, r.data);
r = await call("POST", "/api/admin/products", { ...newProduct, name: "" });
check("نام خالی رد می‌شود → 400", r.status === 400, r.data);
r = await call("POST", "/api/admin/products", { ...newProduct, tagIds: [99999] });
check("تگ ناموجود رد می‌شود → 400", r.status === 400, r.data);
r = await call("POST", "/api/admin/products", { ...newProduct, discountPercent: 150 });
check("تخفیف ۱۵۰٪ رد می‌شود → 400", r.status === 400, r.data);
r = await call("POST", "/api/admin/products", newProduct);
check("ساخت محصول → 201", r.status === 201, r.data);
const pid = r.data.product?.id;
check("قیمت تومانی محاسبه شد: 100×25000 = 2,500,000", r.data.product?.priceToman === 2_500_000, r.data.product?.priceToman);

r = await call("PUT", `/api/admin/products/${pid}`, { ...newProduct, priceAed: 120, discountPercent: 10 });
check("ویرایش قیمت و تخفیف → 200", r.status === 200, r.data);
check("قیمت جدید: 120×0.9=108 درهم → 2,700,000 تومان", r.data.product?.priceToman === 2_700_000, r.data.product?.priceToman);

section("تاریخچه قیمت");
r = await call("GET", `/api/products/${r.data.product.slug}`);
const hist = r.data.priceHistory ?? [];
check("تاریخچه شامل ثبت اولیه و تغییر دستی درهم است", hist.map((h: any) => h.reason).join(",") === "INITIAL,AED_CHANGE", hist.map((h: any) => h.reason));
const slug = r.data.product.slug;
await call("POST", "/api/admin/currency", { action: "setManual", rate: 26000 });
r = await call("GET", `/api/products/${slug}`);
const hist2 = r.data.priceHistory;
check("تغییر نرخ ارز با دلیل RATE_CHANGE (جدا از تغییر قیمت درهمی) ثبت می‌شود", hist2.at(-1)?.reason === "RATE_CHANGE" && hist2.at(-1)?.rate === 26000, hist2.at(-1));
check("نمودار تاریخچه فقط با ≥۲ نقطه واقعی فعال است", r.data.priceHistoryChartReady === true, r.data.priceHistoryChartReady);
await call("POST", "/api/admin/currency", { action: "setManual", rate: 25000 });

section("آپلود و تعویض تصویر");
// یک PNG واقعی کوچک تولید می‌کنیم
const sharp = (await import("sharp")).default;
const png = await sharp({ create: { width: 400, height: 500, channels: 3, background: "#aa8844" } }).png().toBuffer();
const mkForm = (buf: Buffer | Uint8Array, name: string, type: string) => {
  const f = new FormData();
  f.append("file", new Blob([new Uint8Array(buf)], { type }), name);
  return f;
};
r = await call("POST", `/api/admin/products/${pid}/images`, undefined, { raw: mkForm(png, "a.png", "image/png") });
check("آپلود PNG معتبر → 201", r.status === 201, r.data);
const img1 = r.data.images?.[0];
check("خروجی WebP با نام تصادفی است", /^\/uploads\/[0-9a-f-]{36}\.webp$/.test(img1?.url ?? ""), img1);
let imgRes = await fetch(BASE + img1.url);
check("تصویر از /uploads قابل دریافت است (image/webp)", imgRes.status === 200 && imgRes.headers.get("content-type") === "image/webp", imgRes.status);

r = await call("POST", `/api/admin/products/${pid}/images`, undefined, { raw: mkForm(Buffer.from("<?php echo 1; ?>"), "shell.png", "image/png") });
check("فایل جعلی با پسوند png رد می‌شود → 400", r.status === 400, r.data);
r = await call("POST", `/api/admin/products/${pid}/images`, undefined, { raw: mkForm(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>"), "x.svg", "image/svg+xml") });
check("فایل SVG رد می‌شود → 400", r.status === 400, r.data);
const big = Buffer.alloc(6 * 1024 * 1024, 1);
r = await call("POST", `/api/admin/products/${pid}/images`, undefined, { raw: mkForm(big, "big.png", "image/png") });
check("فایل بیش از ۵ مگابایت رد می‌شود → 400", r.status === 400, r.data);

const png2 = await sharp({ create: { width: 300, height: 300, channels: 3, background: "#224488" } }).jpeg().toBuffer();
r = await call("PUT", `/api/admin/products/${pid}/images/${img1.id}`, undefined, { raw: mkForm(png2, "b.jpg", "image/jpeg") });
check("تعویض تصویر → 200 و آدرس جدید", r.status === 200 && r.data.image.url !== img1.url, r.data);
imgRes = await fetch(BASE + img1.url);
check("تصویر قدیمی از دیسک حذف شد (404)", imgRes.status === 404, imgRes.status);
imgRes = await fetch(BASE + r.data.image.url);
check("تصویر جدید در دسترس است", imgRes.status === 200, imgRes.status);
imgRes = await fetch(BASE + "/uploads/..%2F..%2F.env");
check("مسیر خطرناک (path traversal) به .env دسترسی نمی‌دهد", imgRes.status === 404 || imgRes.status === 400, imgRes.status);

// ---------- تگ‌ها ----------
section("مدیریت تگ‌ها");
r = await call("POST", "/api/admin/tags", { name: "تست‌تگ", group: "OTHER" });
check("ساخت تگ → 201", r.status === 201, r.data);
const tid = r.data.tag?.id;
r = await call("POST", "/api/admin/tags", { name: "تست‌تگ" });
check("تگ تکراری → 409", r.status === 409, r.data);
r = await call("PUT", `/api/admin/tags/${tid}`, { name: "تست‌تگ ویرایش", group: "OTHER" });
check("ویرایش تگ → 200", r.status === 200, r.data);
r = await call("DELETE", `/api/admin/tags/${tid}`);
check("حذف تگ → 200", r.status === 200, r.data);

// ---------- جستجو و فیلتر ----------
section("جستجو و فیلتر");
r = await call("GET", "/api/products?q=" + encodeURIComponent("رز"), undefined, { auth: false });
check("جستجوی فارسی (رز) کار می‌کند", r.data.items.some((p: any) => p.nameEn?.includes("Rose")), r.data.total);
r = await call("GET", "/api/products?q=" + encodeURIComponent("عود"), undefined, { auth: false });
check("جستجوی فارسی (عود)", r.data.total >= 1, r.data.total);
r = await call("GET", "/api/products?q=atr", undefined, { auth: false });
check("جستجوی برند (ATR)", r.data.total >= 8, r.data.total);
r = await call("GET", "/api/products?tags=" + encodeURIComponent("گرم,شبانه"), undefined, { auth: false });
const allHave = r.data.items.every((p: any) => ["گرم", "شبانه"].every((n) => p.tags.some((t: any) => t.name === n)));
check("فیلتر چندتگی: همه تگ‌ها الزامی است", r.data.total >= 2 && allHave, r.data.total);
r = await call("GET", "/api/products?gender=WOMEN", undefined, { auth: false });
check("فیلتر جنسیت زنانه (شامل یونیسکس)", r.data.items.every((p: any) => p.gender !== "MEN") && r.data.total >= 3, r.data.total);
r = await call("GET", "/api/products?sort=price_asc&limit=60", undefined, { auth: false });
const asc = r.data.items.map((p: any) => p.priceToman);
check("مرتب‌سازی ارزان‌ترین", asc.every((v: number, i: number) => i === 0 || v >= asc[i - 1]), asc);
r = await call("GET", "/api/products?sort=price_desc&limit=60", undefined, { auth: false });
const desc = r.data.items.map((p: any) => p.priceToman);
check("مرتب‌سازی گران‌ترین", desc.every((v: number, i: number) => i === 0 || v <= desc[i - 1]), desc);
r = await call("GET", "/api/products?minPrice=5000000&maxPrice=6000000", undefined, { auth: false });
check("فیلتر بازه قیمت (۵ تا ۶ میلیون)", r.data.items.length > 0 && r.data.items.every((p: any) => p.priceToman >= 5_000_000 && p.priceToman <= 6_000_000), r.data.items.map((p: any) => p.priceToman));
r = await call("GET", "/api/products?featured=1", undefined, { auth: false });
check("فیلتر ویژه‌ها", r.data.total === 3 && r.data.items.every((p: any) => p.featured), r.data.total);
r = await call("GET", "/api/products?q=%27%20OR%201%3D1%20--", undefined, { auth: false });
check("تزریق SQL در جستجو بی‌اثر است", r.status === 200 && r.data.total === 0, r.data);

section("محصولات مشابه");
r = await call("GET", "/api/products?q=Noir", undefined, { auth: false });
const noirSlug = r.data.items[0].slug;
r = await call("GET", `/api/products/${noirSlug}`, undefined, { auth: false });
check("محصولات مشابه برگردانده می‌شود و خودش در آن نیست", r.data.related.length > 0 && r.data.related.every((p: any) => p.slug !== noirSlug), r.data.related.length);

// ---------- موجودی و سفارش ----------
section("موجودی محصول و سبد خرید");
r = await call("GET", "/api/products?availability=UNAVAILABLE", undefined, { auth: false });
const unavailable = r.data.items[0];
r = await call("POST", "/api/cart/quote", { items: [{ productId: unavailable.id, quantity: 1 }] }, { auth: false });
check("محصول ناموجود در سبد/سفارش پذیرفته نمی‌شود → 409", r.status === 409, r.data);
r = await call("GET", "/api/products?availability=COMING_SOON", undefined, { auth: false });
r = await call("POST", "/api/cart/quote", { items: [{ productId: r.data.items[0].id, quantity: 1 }] }, { auth: false });
check("«به‌زودی» هم قابل خرید نیست → 409", r.status === 409, r.data);

r = await call("GET", "/api/products?q=Citrus", undefined, { auth: false });
const citrus = r.data.items[0];
r = await call("POST", "/api/cart/quote", { items: [{ productId: citrus.id, quantity: 2 }, { productId: oud.id, quantity: 1 }] }, { auth: false });
check("قیمت‌گذاری سبد در سرور: جمع کالاها", r.status === 200 && r.data.subtotalToman === 2 * 4_500_000 + 11_050_000, r.data);
check("هزینه ارسال جدا (150,000) و جمع کل", r.data.shippingToman === 150_000 && r.data.totalToman === r.data.subtotalToman + 150_000, r.data);

section("ثبت سفارش");
const order = { customerName: "علی تستی", phone: "۰۹۱۲۳۴۵۶۷۸۹", address: "تهران، خیابان آزمایشی، پلاک ۱", items: [{ productId: citrus.id, quantity: 2 }], price: 1 };
r = await call("POST", "/api/orders", { ...order, phone: "123" }, { auth: false });
check("شماره موبایل نامعتبر رد می‌شود → 400", r.status === 400, r.data);
r = await call("POST", "/api/orders", { ...order, items: [] }, { auth: false });
check("سبد خالی رد می‌شود → 400", r.status === 400, r.data);
r = await call("POST", "/api/orders", { ...order, items: [{ productId: citrus.id, quantity: 0 }] }, { auth: false });
check("تعداد صفر رد می‌شود → 400", r.status === 400, r.data);
r = await call("POST", "/api/orders", order, { auth: false });
check("ثبت سفارش → 201", r.status === 201, r.data);
check("شماره سفارش یکتا ساخته شد (ATR-…)", /^ATR-\d{6}-[A-Z0-9]{5}$/.test(r.data.orderNumber ?? ""), r.data.orderNumber);
check("وضعیت پرداخت UNPAID و پیام «ثبت درخواست = پرداخت نیست»", r.data.paymentStatus === "UNPAID" && /به معنی پرداخت نیست/.test(r.data.message), r.data);
check("جمع سفارش: 9,000,000 + ارسال 150,000", r.data.totalToman === 9_150_000, r.data);
const orderNumber = r.data.orderNumber;

section("مدیریت سفارش‌ها");
r = await call("GET", "/api/admin/orders");
const found = r.data.orders.find((o: any) => o.orderNumber === orderNumber);
check("سفارش در پنل مدیر دیده می‌شود", !!found && found.status === "NEW", r.data.total);
check("شماره موبایل با ارقام انگلیسی و نرمال ذخیره شد", found?.phone === "09123456789", found?.phone);
r = await call("GET", `/api/admin/orders/${found.id}`);
check("اقلام و تعداد سفارش در دسترس است", r.data.items.length === 1 && r.data.items[0].quantity === 2, r.data);
for (const st of ["REVIEWING", "CONFIRMED", "PREPARING", "SHIPPED", "COMPLETED"]) {
  r = await call("PATCH", `/api/admin/orders/${found.id}`, { status: st });
  check(`تغییر وضعیت به ${st}`, r.status === 200 && r.data.order.status === st, r.data);
}
r = await call("PATCH", `/api/admin/orders/${found.id}`, { status: "HACKED" });
check("وضعیت نامعتبر رد می‌شود → 400", r.status === 400, r.data);
// تغییر قیمت بعد از ثبت، سفارش قدیمی را عوض نمی‌کند
await call("POST", "/api/admin/currency", { action: "setManual", rate: 40000 });
r = await call("GET", `/api/admin/orders/${found.id}`);
check("سفارش قدیمی با تغییر نرخ عوض نمی‌شود", r.data.order.totalToman === 9_150_000 && r.data.order.rateUsed === 25000, r.data.order);
await call("POST", "/api/admin/currency", { action: "setManual", rate: 25000 });

section("محدودیت تعداد درخواست (Rate Limit)");
let limited = 0;
for (let i = 0; i < 8; i++) {
  const x = await call("POST", "/api/admin/login", { username: "nobody", password: "wrong-wrong" }, { auth: false });
  if (x.status === 429) limited++;
}
check("تلاش‌های متعدد ورود ناموفق مسدود می‌شود (429)", limited > 0, limited);

section("آمار و حذف");
r = await call("GET", "/api/admin/stats");
check("آمار داشبورد", r.status === 200 && r.data.products.total === 9 && r.data.orders.total === 1 && r.data.recentOrders.length === 1, r.data);
check("آمار موجود/ناموجود/به‌زودی", r.data.products.unavailable === 1 && r.data.products.comingSoon === 1, r.data.products);
r = await call("DELETE", `/api/admin/products/${pid}`);
check("حذف محصول → 200", r.status === 200, r.data);
r = await call("GET", `/api/products/${slug}`, undefined, { auth: false });
check("محصول حذف‌شده → 404", r.status === 404, r.status);

section("خروج");
r = await call("POST", "/api/admin/logout");
const oldCookie = cookie;
cookie = "";
r = await call("GET", "/api/admin/me", undefined, { headers: { Cookie: oldCookie } });
check("پس از خروج، حتی با کپی کوکی قدیمی دسترسی بسته است → 401", r.status === 401, r.status);

console.log(`\n══════ نتیجه: ${pass} موفق، ${fail} ناموفق ══════`);
if (fail) {
  console.log("ناموفق‌ها:\n - " + failures.join("\n - "));
  process.exit(1);
}
