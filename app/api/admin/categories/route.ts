import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { handle, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { randomSuffix, slugifyUnicode } from "@/lib/text";
import { categoryInput } from "@/lib/validation";

export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin(req);
    return json({ categories: await db.select().from(schema.categories).orderBy(schema.categories.sortOrder) });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    await requireAdmin(req);
    const input = categoryInput.parse(await readJson(req));
    let slug = slugifyUnicode(input.name) || `cat-${randomSuffix()}`;
    const [hit] = await db.select({ id: schema.categories.id }).from(schema.categories).where(eq(schema.categories.slug, slug));
    if (hit) slug = `${slug}-${randomSuffix(3)}`;
    const [category] = await db.insert(schema.categories).values({ ...input, slug }).returning();
    return json({ category }, { status: 201 });
  });
}
