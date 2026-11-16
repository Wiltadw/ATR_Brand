/** قالب‌بندی عدد و متن فارسی برای نمایش در سایت */

const faNumber = new Intl.NumberFormat("fa-IR");

/** ۱۲٬۳۰۰٬۰۰۰ */
export function formatNumber(n: number): string {
  return faNumber.format(n);
}

/** ۶٬۲۵۰٬۰۰۰ تومان؛ اگر قیمت هنوز مشخص نیست «به‌زودی» */
export function formatToman(n: number | null | undefined): string {
  return typeof n === "number" ? `${faNumber.format(n)} تومان` : "قیمت به‌زودی";
}

export function formatAed(n: number): string {
  return `${faNumber.format(n)} درهم`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(iso));
}

export const GENDER_LABEL: Record<string, string> = {
  MEN: "مردانه",
  WOMEN: "زنانه",
  UNISEX: "یونیسکس",
};

export const AVAILABILITY_LABEL: Record<string, string> = {
  AVAILABLE: "موجود",
  UNAVAILABLE: "ناموجود",
  COMING_SOON: "به‌زودی موجود می‌شود",
};

export const PRICE_REASON_LABEL: Record<string, string> = {
  INITIAL: "ثبت اولیه",
  AED_CHANGE: "تغییر قیمت درهمی",
  DISCOUNT_CHANGE: "تغییر تخفیف",
  RATE_CHANGE: "تغییر نرخ ارز",
};

export const TAG_GROUP_LABEL: Record<string, string> = {
  FRAGRANCE: "ویژگی بو",
  USAGE: "کاربرد",
  SEASON: "فصل",
  AUDIENCE: "مناسب برای",
  OTHER: "سایر",
};
