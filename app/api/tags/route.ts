import { asc, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { handle, json } from "@/lib/api";

export async function GET() {
  return handle(async () => {
    const rows = await db
      .select({
        id: schema.tags.id,
        name: schema.tags.name,
        slug: schema.tags.slug,
        group: schema.tags.group,
        productCount: sql<number>`(SELECT COUNT(*) FROM product_tags pt WHERE pt.tag_id = ${schema.tags.id})`,
      })
      .from(schema.tags)
      .orderBy(asc(schema.tags.sortOrder), asc(schema.tags.id));
    return json({ tags: rows.map((r) => ({ ...r, productCount: Number(r.productCount) })) });
  });
}
