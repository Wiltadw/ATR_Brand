import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ApiError } from "./api";

const COOKIE = "atr_admin";
const MAX_AGE_SECONDS = 60 * 60 * 8; // ۸ ساعت

function secretKey() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET باید حداقل ۳۲ کاراکتر باشد (فایل .env را بررسی کنید)");
  }
  return new TextEncoder().encode(s);
}

export async function createSession(admin: { id: number; sessionVersion: number }) {
  const token = await new SignJWT({ v: admin.sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(admin.id))
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** مدیر واردشده را برمی‌گرداند یا null. اعتبار همیشه سمت سرور و با دیتابیس بررسی می‌شود. */
export async function getAdmin() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const id = Number(payload.sub);
    if (!Number.isInteger(id)) return null;
    const [admin] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.id, id));
    if (!admin || admin.sessionVersion !== payload.v) return null;
    return admin;
  } catch {
    return null;
  }
}

/**
 * برای همه APIهای مدیریت: ورود مدیر را الزامی می‌کند و برای درخواست‌های تغییردهنده،
 * منشأ (Origin) را برای جلوگیری از CSRF بررسی می‌کند.
 */
export async function requireAdmin(req: Request) {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) assertSameOrigin(req);
  const admin = await getAdmin();
  if (!admin) throw new ApiError(401, "برای این کار باید وارد پنل مدیریت شوید");
  return admin;
}

export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return; // درخواست‌های غیرمرورگری (مثلاً cron/تست) Origin ندارند و کوکی هم ندارند
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ApiError(403, "درخواست نامعتبر است");
  }
  if (originHost !== host) throw new ApiError(403, "درخواست از منبع غیرمجاز ارسال شده است");
}
