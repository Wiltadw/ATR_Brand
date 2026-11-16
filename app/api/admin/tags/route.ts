import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ApiError, handle, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { randomSuffix, slugifyUnicode } from "@/lib/text";
import { tagInput } from "@/lib/validation";

export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin(req);
    return json({ tags: await db.select().from(schema.tags).orderBy(schema.tags.sortOrder, schema.tags.id) });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    await requireAdmin(req);
    const input = tagInput.parse(await readJson(req));
    const [dup] = await db.select({ id: schema.tags.id }).from(schema.tags).where(eq(schema.tags.name, input.name));
    if (dup) throw new ApiError(409, "تگی با این نام از قبل وجود دارد");
    let slug = slugifyUnicode(input.name) || `tag-${randomSuffix()}`;
    const [slugHit] = await db.select({ id: schema.tags.id }).from(schema.tags).where(eq(schema.tags.slug, slug));
    if (slugHit) slug = `${slug}-${randomSuffix(3)}`;
    const [tag] = await db.insert(schema.tags).values({ ...input, slug }).returning();
    return json({ tag }, { status: 201 });
  });
}
