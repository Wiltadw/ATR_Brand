import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ApiError } from "./api";
import { aedMinorToToman, finalAedMinor } from "./pricing";

export type CurrencyState = typeof schema.currencySettings.$inferSelect;

export async function getCurrencySettings(): Promise<CurrencyState> {
  const [row] = await db.select().from(schema.currencySettings).where(eq(schema.currencySettings.id, 1));
  if (row) return row;
  await db.insert(schema.currencySettings).values({ id: 1, lastStatus: "NEVER" }).onConflictDoNothing();
  const [created] = await db.select().from(schema.currencySettings).where(eq(schema.currencySettings.id, 1));
  return created;
}

/** نرخ فعلی برای قیمت‌گذاری؛ null یعنی هنوز هیچ نرخ معتبری تعیین نشده است (قیمتی ساخته نمی‌شود). */
export async function getEffectiveRate(): Promise<number | null> {
  return (await getCurrencySettings()).effectiveRate;
}

function pickEffective(s: CurrencyState): { rate: number | null; source: "MANUAL" | "AUTO" | null } {
  // نرخ دستی همیشه بر خودکار اولویت دارد
  if (s.manualOverrideEnabled && s.manualRate && s.manualRate > 0) {
    return { rate: s.manualRate, source: "MANUAL" };
  }
  if (s.autoRate && s.autoRate > 0) return { rate: s.autoRate, source: "AUTO" };
  return { rate: null, source: null };
}

/**
 * بعد از هر تغییر در تنظیمات، نرخ مؤثر را دوباره حساب می‌کند.
 * اگر نرخ تغییر کرده باشد، برای همه محصولات یک ردیف تاریخچه قیمت با دلیل «تغییر نرخ ارز» ثبت می‌شود.
 */
export async function applyEffectiveRate(): Promise<{ changed: boolean; rate: number | null }> {
  const s = await getCurrencySettings();
  const { rate, source } = pickEffective(s);
  if (rate === s.effectiveRate && source === s.effectiveSource) return { changed: false, rate };

  await db
    .update(schema.currencySettings)
    .set({ effectiveRate: rate, effectiveSource: source })
    .where(eq(schema.currencySettings.id, 1));

  if (rate && rate !== s.effectiveRate) {
    const all = await db.select().from(schema.products);
    const hasHistory = new Set(
      (await db.select({ id: schema.priceHistory.productId }).from(schema.priceHistory).groupBy(schema.priceHistory.productId)).map(
        (r) => r.id,
      ),
    );
    const now = new Date();
    const rows = all.map((p) => ({
      productId: p.id,
      priceAedMinor: p.priceAedMinor,
      discountPercent: p.discountPercent,
      rate,
      priceToman: aedMinorToToman(finalAedMinor(p, now), rate),
      reason: (hasHistory.has(p.id) ? "RATE_CHANGE" : "INITIAL") as "RATE_CHANGE" | "INITIAL",
      createdAt: now,
    }));
    for (let i = 0; i < rows.length; i += 100) {
      await db.insert(schema.priceHistory).values(rows.slice(i, i + 100));
    }
  }
  return { changed: true, rate };
}

/** ثبت یک ردیف تاریخچه برای محصول (هنگام ساخت یا تغییر دستی قیمت/تخفیف) */
export async function recordPrice(
  product: {
    id: number;
    priceAedMinor: number;
    discountPercent: number | null;
    discountEndsAt: Date | null;
  },
  reason: "INITIAL" | "AED_CHANGE" | "DISCOUNT_CHANGE",
) {
  const rate = await getEffectiveRate();
  if (!rate) return; // بدون نرخ، قیمت تومانی جعلی ثبت نمی‌کنیم
  await db.insert(schema.priceHistory).values({
    productId: product.id,
    priceAedMinor: product.priceAedMinor,
    discountPercent: product.discountPercent,
    rate,
    priceToman: aedMinorToToman(finalAedMinor(product), rate),
    reason,
  });
}

async function log(entry: {
  rate?: number | null;
  source: string;
  kind: "AUTO" | "MANUAL" | "SYSTEM";
  success: boolean;
  message?: string;
}) {
  await db.insert(schema.exchangeRateLogs).values({
    rate: entry.rate ?? null,
    source: entry.source,
    kind: entry.kind,
    success: entry.success,
    message: entry.message ?? null,
  });
}

const MIN_RATE = 1;
const MAX_RATE = 100_000_000;

export function validateRate(rate: unknown): number {
  if (typeof rate !== "number" || !Number.isInteger(rate) || rate < MIN_RATE || rate > MAX_RATE) {
    throw new ApiError(400, "نرخ باید یک عدد صحیح مثبت (تومان به‌ازای هر درهم) باشد");
  }
  return rate;
}

/** تعیین نرخ دستی؛ همزمان حالت «دستی» را فعال می‌کند و بر نرخ خودکار اولویت دارد */
export async function setManualRate(rate: number) {
  validateRate(rate);
  await db
    .update(schema.currencySettings)
    .set({ manualRate: rate, manualOverrideEnabled: true })
    .where(eq(schema.currencySettings.id, 1));
  await getCurrencySettings();
  await log({ rate, source: "MANUAL", kind: "MANUAL", success: true, message: "نرخ دستی توسط مدیر تنظیم شد" });
  return applyEffectiveRate();
}

/** بازگشت به نرخ خودکار (نرخ دستی ذخیره می‌ماند ولی اعمال نمی‌شود) */
export async function restoreAutomatic() {
  await getCurrencySettings();
  await db
    .update(schema.currencySettings)
    .set({ manualOverrideEnabled: false })
    .where(eq(schema.currencySettings.id, 1));
  await log({ source: "MANUAL", kind: "SYSTEM", success: true, message: "نرخ دستی غیرفعال شد؛ نرخ خودکار اعمال می‌شود" });
  return applyEffectiveRate();
}

export async function setAutoUpdateEnabled(enabled: boolean) {
  await getCurrencySettings();
  await db
    .update(schema.currencySettings)
    .set({ autoUpdateEnabled: enabled })
    .where(eq(schema.currencySettings.id, 1));
  await log({
    source: "SYSTEM",
    kind: "SYSTEM",
    success: true,
    message: enabled ? "بروزرسانی خودکار فعال شد" : "بروزرسانی خودکار غیرفعال شد",
  });
}

// ---------------- دریافت نرخ از منبع بیرونی ----------------

type ProviderResult = { rate: number; source: string };

function pickPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((cur, key) => {
    if (cur && typeof cur === "object") return (cur as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

/**
 * منبع عمومی JSON. هیچ نرخی ساخته نمی‌شود: فقط اگر آدرس و مسیر مقدار در .env تنظیم شده باشد
 * و پاسخ واقعاً عدد معتبر داشته باشد، نرخ پذیرفته می‌شود.
 */
async function fetchFromConfiguredProvider(): Promise<ProviderResult> {
  const url = process.env.RATE_API_URL?.trim();
  const jsonPath = process.env.RATE_JSON_PATH?.trim();
  if (!url || !jsonPath) {
    throw new Error("منبع نرخ خودکار تنظیم نشده است (RATE_API_URL و RATE_JSON_PATH در فایل .env)");
  }
  const headers: Record<string, string> = { Accept: "application/json" };
  const key = process.env.RATE_API_KEY?.trim();
  if (key) headers[process.env.RATE_API_KEY_HEADER?.trim() || "Authorization"] = key;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  let res: Response;
  try {
    res = await fetch(url, { headers, signal: ctrl.signal, cache: "no-store" });
  } catch (e) {
    throw new Error(`اتصال به منبع نرخ ناموفق بود: ${e instanceof Error ? e.message : "خطای ناشناخته"}`);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(`منبع نرخ خطای ${res.status} برگرداند`);
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new Error("پاسخ منبع نرخ JSON معتبر نبود");
  }
  const raw = pickPath(body, jsonPath);
  const num = typeof raw === "string" ? Number(raw.replace(/,/g, "")) : (raw as number);
  if (typeof num !== "number" || !Number.isFinite(num) || num <= 0) {
    throw new Error(`مقدار نرخ در مسیر «${jsonPath}» پیدا نشد یا عدد معتبر نبود`);
  }
  const divisor = Number(process.env.RATE_VALUE_DIVISOR ?? "1") || 1;
  const rate = Math.round(num / divisor);
  return { rate, source: new URL(url).host };
}

export type UpdateOutcome = { ok: boolean; skipped?: boolean; message: string; rate?: number };

/**
 * بروزرسانی خودکار نرخ. در صورت هر خطا نرخ قبلی دست‌نخورده می‌ماند،
 * خطا ثبت می‌شود و در پنل مدیر نمایش داده می‌شود.
 */
export async function runAutoUpdate(opts: { force?: boolean } = {}): Promise<UpdateOutcome> {
  const s = await getCurrencySettings();
  if (!s.autoUpdateEnabled && !opts.force) {
    return { ok: true, skipped: true, message: "بروزرسانی خودکار غیرفعال است" };
  }
  const attemptAt = new Date();
  try {
    const { rate, source } = await fetchFromConfiguredProvider();

    // محافظ: تغییر ناگهانی غیرعادی را نمی‌پذیریم
    const maxChange = Number(process.env.RATE_MAX_CHANGE_PERCENT ?? "30");
    const prev = s.autoRate ?? s.effectiveRate;
    if (prev && maxChange > 0) {
      const change = (Math.abs(rate - prev) / prev) * 100;
      if (change > maxChange) {
        throw new Error(
          `نرخ دریافتی (${rate}) بیش از ${maxChange}٪ با نرخ قبلی (${prev}) تفاوت دارد و برای ایمنی پذیرفته نشد`,
        );
      }
    }

    await db
      .update(schema.currencySettings)
      .set({
        autoRate: rate,
        autoRateSource: source,
        lastSuccessAt: attemptAt,
        lastAttemptAt: attemptAt,
        lastStatus: "SUCCESS",
        lastError: null,
      })
      .where(eq(schema.currencySettings.id, 1));
    const manualActive = s.manualOverrideEnabled && !!s.manualRate;
    await log({
      rate,
      source,
      kind: "AUTO",
      success: true,
      message: manualActive ? "نرخ دریافت شد ولی نرخ دستی فعال است و اعمال نشد" : "نرخ با موفقیت بروزرسانی شد",
    });
    await applyEffectiveRate();
    return { ok: true, rate, message: manualActive ? "نرخ دریافت شد (نرخ دستی همچنان اعمال می‌شود)" : "نرخ بروزرسانی شد" };
  } catch (e) {
    const message = e instanceof Error ? e.message : "خطای ناشناخته";
    await db
      .update(schema.currencySettings)
      .set({ lastAttemptAt: attemptAt, lastStatus: "FAILED", lastError: message })
      .where(eq(schema.currencySettings.id, 1));
    await log({ source: "AUTO", kind: "AUTO", success: false, message });
    return { ok: false, message };
  }
}
