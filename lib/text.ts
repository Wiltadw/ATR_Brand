/** نرمال‌سازی متن فارسی/انگلیسی برای جستجو: ی/ک عربی، ارقام فارسی و عربی، فاصله‌ها، حروف بزرگ */
export function normalizeText(input: string): string {
  return input
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[‌‏‎]/g, " ")
    .replace(/[ً-ٰٟ]/g, "") // اعراب
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** اسلاگ لاتین امن برای URL؛ اگر چیزی نماند رشته خالی برمی‌گرداند */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function randomSuffix(len = 6): string {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

/** اسلاگ برای تگ‌ها و دسته‌ها: فارسی هم مجاز است */
export function slugifyUnicode(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[‌\s]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
