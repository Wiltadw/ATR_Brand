/**
 * تست منطق بروزرسانی خودکار نرخ با یک «منبع نرخ ساختگی» محلی و دیتابیس موقت (به دیتابیس اصلی دست نمی‌زند).
 *   npm run test:currency
 */
import http from "node:http";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const dir = mkdtempSync(path.join(tmpdir(), "atr-test-"));
const dbUrl = `file:${path.join(dir, "test.db")}`;
process.env.DATABASE_URL = dbUrl;
execFileSync("node", ["--env-file=.env", "--import", "tsx", "scripts/migrate.mts"], {
  env: { ...process.env, DATABASE_URL: dbUrl },
  stdio: "ignore",
});

// منبع ساختگی: پاسخ را از متغیر می‌خواند
let mockBody: unknown = { data: { aed: "27,000" } };
let mockStatus = 200;
const server = http.createServer((_req, res) => {
  res.statusCode = mockStatus;
  res.setHeader("content-type", "application/json");
  res.end(typeof mockBody === "string" ? mockBody : JSON.stringify(mockBody));
});
await new Promise<void>((r) => server.listen(0, r));
const port = (server.address() as { port: number }).port;
process.env.RATE_API_URL = `http://127.0.0.1:${port}/rate`;
process.env.RATE_JSON_PATH = "data.aed";
process.env.RATE_VALUE_DIVISOR = "1";
process.env.RATE_MAX_CHANGE_PERCENT = "30";

const cur = await import("../lib/currency");
const { createProduct } = await import("../lib/admin-products");
const { db, schema } = await import("../db");
const { eq } = await import("drizzle-orm");

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}`, JSON.stringify(detail));
  }
}

await createProduct({
  name: "تست", nameEn: "T", brand: "B", categoryId: null, priceAed: 10000, discountPercent: null, discountEndsAt: null,
  shortDescription: null, description: null, gender: "UNISEX", fragranceFamily: null, topNotes: null, middleNotes: null,
  baseNotes: null, longevity: null, projection: null, availability: "AVAILABLE", featured: false, bestSeller: false, tagIds: [],
});

console.log("\n■ بروزرسانی خودکار");
let s = await cur.getCurrencySettings();
check("در ابتدا هیچ نرخی وجود ندارد (null)", s.effectiveRate === null, s.effectiveRate);
let o = await cur.runAutoUpdate();
check("وقتی بروزرسانی خودکار غیرفعال است، اجرا نمی‌شود (skipped)", o.skipped === true, o);

await cur.setAutoUpdateEnabled(true);
o = await cur.runAutoUpdate();
s = await cur.getCurrencySettings();
check("نرخ \"27,000\" (رشته با کاما) درست خوانده شد", o.ok && s.autoRate === 27000, o);
check("بدون نرخ دستی، نرخ خودکار اعمال شد (AUTO)", s.effectiveRate === 27000 && s.effectiveSource === "AUTO", s);
check("وضعیت موفق و زمان آخرین موفقیت ثبت شد", s.lastStatus === "SUCCESS" && !!s.lastSuccessAt && s.lastError === null, s);
let hist = await db.select().from(schema.priceHistory);
check("اولین نرخ، تاریخچه قیمت INITIAL ساخت (قیمت = 100 درهم × 27000)", hist.length === 1 && hist[0].priceToman === 2_700_000 && hist[0].reason === "INITIAL", hist);

console.log("\n■ اولویت نرخ دستی");
await cur.setManualRate(30000);
s = await cur.getCurrencySettings();
check("نرخ دستی اعمال شد", s.effectiveRate === 30000 && s.effectiveSource === "MANUAL", s);
mockBody = { data: { aed: 28000 } };
o = await cur.runAutoUpdate();
s = await cur.getCurrencySettings();
check("نرخ خودکار جدید (28000) ذخیره شد ولی بر نرخ دستی غلبه نکرد", s.autoRate === 28000 && s.effectiveRate === 30000 && s.effectiveSource === "MANUAL", s);
await cur.restoreAutomatic();
s = await cur.getCurrencySettings();
check("با بازگشت به خودکار، نرخ ۲۸۰۰۰ اعمال شد", s.effectiveRate === 28000 && s.effectiveSource === "AUTO", s);
hist = await db.select().from(schema.priceHistory).orderBy(schema.priceHistory.id);
check("تاریخچه: INITIAL ← RATE_CHANGE(30000) ← RATE_CHANGE(28000)", hist.map((h) => `${h.reason}:${h.rate}`).join(" ") === "INITIAL:27000 RATE_CHANGE:30000 RATE_CHANGE:28000", hist.map((h) => `${h.reason}:${h.rate}`));

console.log("\n■ محافظ‌ها و خطاها (نرخ معتبر نباید خراب شود)");
async function expectFail(name: string, body: unknown, status = 200) {
  mockBody = body;
  mockStatus = status;
  const before = (await cur.getCurrencySettings()).effectiveRate;
  const r = await cur.runAutoUpdate();
  const after = await cur.getCurrencySettings();
  check(`${name} → خطا ثبت شد و نرخ ${before} دست‌نخورده`, r.ok === false && after.effectiveRate === before && after.lastStatus === "FAILED" && !!after.lastError, { r, after: after.effectiveRate });
  mockStatus = 200;
}
await expectFail("جهش ناگهانی +۷۰٪ (50000)", { data: { aed: 50000 } });
await expectFail("کاهش ناگهانی −۶۰٪ (11000)", { data: { aed: 11000 } });
await expectFail("نرخ صفر", { data: { aed: 0 } });
await expectFail("نرخ منفی", { data: { aed: -100 } });
await expectFail("متن نامعتبر", { data: { aed: "abc" } });
await expectFail("مسیر مقدار وجود ندارد", { other: 1 });
await expectFail("پاسخ JSON نیست", "<html>error</html>");
await expectFail("خطای سرور منبع (500)", { error: true }, 500);

console.log("\n■ بازیابی بعد از خطا");
mockBody = { data: { aed: 28500 } };
o = await cur.runAutoUpdate();
s = await cur.getCurrencySettings();
check("بروزرسانی بعدی موفق خطا را پاک می‌کند", o.ok && s.lastStatus === "SUCCESS" && s.lastError === null && s.effectiveRate === 28500, s);

console.log("\n■ منبع ساختگی در برابر منبع واقعی");
const logs = await db.select().from(schema.exchangeRateLogs);
check("هر تلاش (موفق و ناموفق) در تاریخچه نرخ ثبت شده", logs.filter((l) => !l.success).length >= 8 && logs.filter((l) => l.success).length >= 3, logs.length);
void eq;

server.close();
console.log(`\n══════ نتیجه: ${pass} موفق، ${fail} ناموفق ══════`);
process.exit(fail ? 1 : 0);
