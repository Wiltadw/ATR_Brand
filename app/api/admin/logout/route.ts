import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { handle, json } from "@/lib/api";
import { assertSameOrigin, destroySession, getAdmin } from "@/lib/auth";

/** خروج: کوکی پاک می‌شود و نشست در سرور هم بی‌اعتبار می‌شود (کپی کوکی بعد از خروج بی‌فایده است) */
export async function POST(req: Request) {
  return handle(async () => {
    assertSameOrigin(req);
    const admin = await getAdmin();
    if (admin) {
      await db
        .update(schema.adminUsers)
        .set({ sessionVersion: admin.sessionVersion + 1 })
        .where(eq(schema.adminUsers.id, admin.id));
    }
    await destroySession();
    return json({ ok: true });
  });
}
