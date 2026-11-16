import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type Metadata } from "sharp";
import { ApiError } from "./api";

const MAX_BYTES = 5 * 1024 * 1024; // ۵ مگابایت
const MAX_PIXELS = 40_000_000;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);
export const FILE_NAME_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

export function uploadDir() {
  return path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? "./storage/uploads");
}

/**
 * تصویر را امن ذخیره می‌کند: نوع فایل از روی محتوای واقعی بررسی می‌شود (نه پسوند)،
 * اندازه محدود است، اطلاعات پنهان (EXIF) حذف و تصویر به WebP بازنویسی می‌شود.
 * نام فایل تصادفی است، پس نام ارسالی کاربر هرگز استفاده نمی‌شود.
 */
export async function saveImage(file: File): Promise<string> {
  if (file.size === 0) throw new ApiError(400, "فایل خالی است");
  if (file.size > MAX_BYTES) throw new ApiError(400, "حجم تصویر باید کمتر از ۵ مگابایت باشد");
  const input = Buffer.from(await file.arrayBuffer());
  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: MAX_PIXELS }).metadata();
  } catch {
    throw new ApiError(400, "فایل انتخاب‌شده تصویر معتبر نیست");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw new ApiError(400, "فقط تصویرهای JPG، PNG و WebP پذیرفته می‌شوند");
  }
  const output = await sharp(input, { limitInputPixels: MAX_PIXELS })
    .rotate() // اعمال جهت EXIF قبل از حذف آن
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
  const filename = `${randomUUID()}.webp`;
  await mkdir(uploadDir(), { recursive: true });
  await writeFile(path.join(uploadDir(), filename), output);
  return filename;
}

export async function deleteImageFile(filename: string) {
  if (!FILE_NAME_RE.test(filename)) return;
  try {
    await unlink(path.join(uploadDir(), filename));
  } catch {
    /* فایل از قبل وجود نداشته؛ مشکلی نیست */
  }
}

export async function readImageFile(filename: string): Promise<Buffer | null> {
  if (!FILE_NAME_RE.test(filename)) return null;
  try {
    return await readFile(path.join(uploadDir(), filename));
  } catch {
    return null;
  }
}

export function imageUrl(filename: string) {
  return `/uploads/${filename}`;
}
