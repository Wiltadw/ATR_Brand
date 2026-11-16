import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// در توسعه، اتصال بین ری‌لود‌ها تکرار نشود
const g = globalThis as unknown as { __atrClient?: ReturnType<typeof createClient> };

const client =
  g.__atrClient ?? createClient({
    url: process.env.DATABASE_URL ?? "file:./data/atr.db",
    // فقط برای دیتابیس ابری libSQL/Turso لازم است (برای فایل محلی خالی بماند)
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  });
if (process.env.NODE_ENV !== "production") g.__atrClient = client;

export const db = drizzle(client, { schema });
export { schema };
