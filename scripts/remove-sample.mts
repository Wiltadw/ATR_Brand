import { eq, inArray } from "drizzle-orm";
import { db, schema } from "../db";
import { deleteImageFile } from "../lib/uploads";

const samples = await db.select().from(schema.products).where(eq(schema.products.isSample, true));
if (!samples.length) {
  console.log("محصول آزمایشی‌ای وجود ندارد.");
  process.exit(0);
}
const ids = samples.map((s) => s.id);
const images = await db.select().from(schema.productImages).where(inArray(schema.productImages.productId, ids));
await db.delete(schema.products).where(inArray(schema.products.id, ids));
await Promise.all(images.map((i) => deleteImageFile(i.filename)));
console.log(`✓ ${samples.length} محصول آزمایشی و تصاویرشان حذف شد.`);
console.log("• اطلاعات تماس، هزینه ارسال و نرخ ارز آزمایشی دست‌نخورده ماند؛ از پنل مدیریت آن‌ها را واقعی کنید.");
