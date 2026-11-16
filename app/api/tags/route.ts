import { handle, json } from "@/lib/api";
import { listTags } from "@/lib/products";

export async function GET() {
  return handle(async () => json({ tags: await listTags() }));
}
