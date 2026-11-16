import { handle, json } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  return handle(async () => {
    const admin = await requireAdmin(req);
    return json({ id: admin.id, username: admin.username });
  });
}
