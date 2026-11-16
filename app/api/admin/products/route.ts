import { handle, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { createProduct } from "@/lib/admin-products";
import { hydrate, listProducts } from "@/lib/products";
import { productInput } from "@/lib/validation";

const num = (v: string | null) => (v && Number.isFinite(Number(v)) ? Number(v) : undefined);

/** لیست محصولات برای پنل مدیریت (شامل ناموجودها و آزمایشی‌ها) */
export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin(req);
    const sp = new URL(req.url).searchParams;
    const sort = sp.get("sort");
    return json(
      await listProducts({
        q: sp.get("q")?.slice(0, 100) || undefined,
        gender: sp.get("gender") || undefined,
        availability: sp.get("availability") || undefined,
        featured: sp.get("featured") === "1",
        tagSlugs: sp.get("tags")?.split(",").filter(Boolean),
        sort: sort === "price_asc" || sort === "price_desc" ? sort : "newest",
        page: num(sp.get("page")),
        pageSize: num(sp.get("limit")) ?? 20,
      }),
    );
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    await requireAdmin(req);
    const input = productInput.parse(await readJson(req));
    const created = await createProduct(input);
    const [product] = await hydrate([created]);
    return json({ product }, { status: 201 });
  });
}
