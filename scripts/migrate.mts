import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { mkdirSync } from "node:fs";
import path from "node:path";

const url = process.env.DATABASE_URL ?? "file:./data/atr.db";
if (url.startsWith("file:")) mkdirSync(path.dirname(url.replace("file:", "")), { recursive: true });

const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });
await client.execute("PRAGMA foreign_keys = ON");
await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
console.log("✓ دیتابیس آماده است:", url);
client.close();
