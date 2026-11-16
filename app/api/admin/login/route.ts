import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ApiError, handle, json, readJson } from "@/lib/api";
import { assertSameOrigin, createSession } from "@/lib/auth";
import { clientIp, rateLimit, resetRateLimit } from "@/lib/ratelimit";
import { loginInput } from "@/lib/validation";

let dummyHash: Promise<string> | null = null;

export async function POST(req: Request) {
  return handle(async () => {
    assertSameOrigin(req);
    const ip = clientIp(req);
    rateLimit(`login-ip:${ip}`, 20, 15 * 60_000);
    const { username, password } = loginInput.parse(await readJson(req));
    const userKey = `login-user:${username.toLowerCase()}`;
    rateLimit(userKey, 5, 15 * 60_000); // ۵ تلاش در ۱۵ دقیقه برای هر نام کاربری

    const [admin] = await db
      .select()
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.username, username));

    // اگر کاربر وجود نداشت هم یک هش را بررسی می‌کنیم تا زمان پاسخ چیزی را لو ندهد
    dummyHash ??= argon2.hash("not-a-real-password");
    const ok = await argon2.verify(admin?.passwordHash ?? (await dummyHash), password).catch(() => false);
    if (!admin || !ok) throw new ApiError(401, "نام کاربری یا رمز عبور اشتباه است");

    resetRateLimit(userKey);
    await createSession(admin);
    return json({ ok: true, username: admin.username });
  });
}
