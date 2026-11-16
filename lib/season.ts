/** فصل فعلی به وقت تهران (تقریبی، بر پایه‌ی ابتدای فصل‌های ایرانی) */
export function currentSeason(now = new Date()): { name: string; tag: string } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tehran", month: "numeric", day: "numeric" }).formatToParts(now);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  const md = m * 100 + d;
  if (md >= 321 && md <= 621) return { name: "بهار", tag: "بهاری" };
  if (md >= 622 && md <= 922) return { name: "تابستان", tag: "تابستانی" };
  if (md >= 923 && md <= 1221) return { name: "پاییز", tag: "پاییزی" };
  return { name: "زمستان", tag: "زمستانی" };
}
