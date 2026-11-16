import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { handle, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { getStoreSettings } from "@/lib/orders";
import { storeSettingsInput } from "@/lib/validation";

export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin(req);
    return json({ store: await getStoreSettings() });
  });
}

export async function PUT(req: Request) {
  return handle(async () => {
    await requireAdmin(req);
    await getStoreSettings();
    const input = storeSettingsInput.parse(await readJson(req));
    const [store] = await db.update(schema.storeSettings).set(input).where(eq(schema.storeSettings.id, 1)).returning();
    return json({ store });
  });
}
