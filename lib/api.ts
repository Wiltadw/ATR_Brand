import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) },
  });
}

/** همه خطاها را به پاسخ JSON فارسی تبدیل می‌کند و جزئیات داخلی را فاش نمی‌کند */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError) {
      return json({ error: e.message, ...(e.extra ?? {}) }, { status: e.status });
    }
    if (e instanceof ZodError) {
      return json(
        {
          error: "اطلاعات واردشده معتبر نیست",
          fields: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
        { status: 400 },
      );
    }
    console.error("[api] unexpected error:", e);
    return json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, "بدنه درخواست باید JSON معتبر باشد");
  }
}

export function intParam(v: string | undefined | null, name = "شناسه"): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new ApiError(400, `${name} نامعتبر است`);
  return n;
}
