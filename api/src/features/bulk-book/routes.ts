import type { Context } from "hono";
import type { BulkBookRequest } from "../../types/index.js";
import { bulkBook } from "../accounts/service.js";

export async function handleBulkBook(c: Context) {
  try {
    const body = await c.req.json<BulkBookRequest>();
    const { bookings, forceCancel } = body;

    const result = await bulkBook(bookings, forceCancel);
    return c.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: `Bulk book error: ${message}` }, 500);
  }
}
