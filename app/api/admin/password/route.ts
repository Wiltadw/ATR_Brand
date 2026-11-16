import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ApiError, handle, json, readJson } from "@/lib/api";
import { createSession, requireAdmin } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { passwordChangeInput } from "@/lib/validation";

/** تغییر رمز؛ همه نشست‌های قبلی (روی دستگاه‌های دیگر) بی‌اعتبار می‌شوند */
export async function POST(req: Request) {
  return handle(async () => {
    const admin = await requireAdmin(req);
    rateLimit(`pw-change:${admin.id}`, 5, 15 * 60_000);
    const { currentPassword, newPassword } = passwordChangeInput.parse(await readJson(req));
    if (!(await argon2.verify(admin.passwordHash, currentPassword).catch(() => false))) {
      throw new ApiError(400, "رمز فعلی اشتباه است");
    }
    const [updated] = await db
      .update(schema.adminUsers)
      .set({
        passwordHash: await argon2.hash(newPassword),
        sessionVersion: admin.sessionVersion + 1,
      })
      .where(eq(schema.adminUsers.id, admin.id))
      .returning();
    await createSession(updated);
    return json({ ok: true });
  });
}
