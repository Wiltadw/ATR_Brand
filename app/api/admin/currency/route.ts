import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { ApiError, handle, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import {
  applyEffectiveRate,
  getCurrencySettings,
  restoreAutomatic,
  setAutoUpdateEnabled,
  setManualRate,
} from "@/lib/currency";
import { currencyInput } from "@/lib/validation";

async function state() {
  const s = await getCurrencySettings();
  const logs = await db.select().from(schema.exchangeRateLogs).orderBy(desc(schema.exchangeRateLogs.id)).limit(30);
  return {
    effectiveRate: s.effectiveRate,
    effectiveSource: s.effectiveSource, // MANUAL | AUTO | null
    manualOverrideEnabled: s.manualOverrideEnabled,
    manualRate: s.manualRate,
    autoUpdateEnabled: s.autoUpdateEnabled,
    autoRate: s.autoRate,
    autoRateSource: s.autoRateSource,
    providerConfigured: !!(process.env.RATE_API_URL && process.env.RATE_JSON_PATH),
    lastSuccessAt: s.lastSuccessAt?.toISOString() ?? null,
    lastAttemptAt: s.lastAttemptAt?.toISOString() ?? null,
    lastStatus: s.lastStatus,
    lastError: s.lastError,
    logs: logs.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
  };
}

export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin(req);
    return json(await state());
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    await requireAdmin(req);
    const body = currencyInput.parse(await readJson(req));
    if (body.action === "setManual") {
      if (body.rate === undefined) throw new ApiError(400, "نرخ ارسال نشده است");
      await setManualRate(body.rate);
    } else if (body.action === "restoreAutomatic") {
      await restoreAutomatic();
    } else {
      if (typeof body.enabled !== "boolean") throw new ApiError(400, "مقدار فعال/غیرفعال ارسال نشده است");
      await setAutoUpdateEnabled(body.enabled);
    }
    await applyEffectiveRate();
    return json(await state());
  });
}
