import { handle, json } from "@/lib/api";
import { listProducts } from "@/lib/products";

const num = (v: string | null) => {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export async function GET(req: Request) {
  return handle(async () => {
    const sp = new URL(req.url).searchParams;
    const sort = sp.get("sort");
    const result = await listProducts({
      q: sp.get("q")?.slice(0, 100) || undefined,
      gender: sp.get("gender") || undefined,
      tagSlugs: sp.get("tags")?.split(",").map((s) => s.trim()).filter(Boolean),
      minToman: num(sp.get("minPrice")),
      maxToman: num(sp.get("maxPrice")),
      sort: sort === "price_asc" || sort === "price_desc" ? sort : "newest",
      featured: sp.get("featured") === "1",
      onSale: sp.get("onSale") === "1",
      bestSeller: sp.get("bestSeller") === "1",
      availability: sp.get("availability") || undefined,
      page: num(sp.get("page")),
      pageSize: num(sp.get("limit")),
    });
    return json(result);
  });
}
