/**
 * ساخت فایل .env با کلیدهای تصادفی و یک رمز مدیر تصادفی (فقط اگر .env وجود نداشته باشد).
 *   npm run init-env
 */
import { randomBytes, randomInt } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const target = process.argv[2] ?? ".env";
if (existsSync(target)) {
  console.log(`• فایل ${target} از قبل وجود دارد و دست‌نخورده ماند.`);
  process.exit(0);
}

const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const password = Array.from({ length: 14 }, () => alphabet[randomInt(alphabet.length)]).join("") + "7a";

const template = readFileSync(".env.example", "utf8")
  .replace(/^SESSION_SECRET=.*$/m, `SESSION_SECRET="${randomBytes(32).toString("hex")}"`)
  .replace(/^CRON_SECRET=.*$/m, `CRON_SECRET="${randomBytes(24).toString("hex")}"`)
  .replace(/^ADMIN_PASSWORD=.*$/m, `ADMIN_PASSWORD="${password}"`);
writeFileSync(target, template);

console.log(`✓ فایل ${target} ساخته شد.`);
console.log("");
console.log("   نام کاربری مدیر:  admin");
console.log(`   رمز عبور مدیر:    ${password}`);
console.log("");
console.log("   این رمز را همین الان جایی یادداشت کنید (بعد از اولین ورود از پنل عوضش کنید).");
