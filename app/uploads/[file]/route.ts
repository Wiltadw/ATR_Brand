import { readImageFile } from "@/lib/uploads";

export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const data = await readImageFile(file); // نام فایل فقط با الگوی UUID.webp پذیرفته می‌شود
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/webp",
      // نام فایل با هر تعویض تصویر عوض می‌شود، پس کش طولانی امن است
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
