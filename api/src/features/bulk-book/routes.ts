import type { Context } from "hono";
import type { BulkBookRequest } from "../../types/index.js";
import { bulkBook } from "../accounts/service.js";
import { getUserIdFromContext } from "../auth/middleware.js";

export async function handleBulkBook(c: Context) {
  try {
    const userId = getUserIdFromContext(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json<BulkBookRequest>();
    const { bookings, forceCancel } = body;

    const result = await bulkBook(userId, bookings, forceCancel);
    return c.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: `Bulk book error: ${message}` }, 500);
  }
}
