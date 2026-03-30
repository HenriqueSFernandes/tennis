import type { Context } from "hono";
import type { BulkBookRequest } from "../../types/index.js";
import { bulkBook } from "../accounts/service.js";

export async function handleBulkBook(c: Context) {
  const body = await c.req.json<BulkBookRequest>();
  const { bookings, forceCancel } = body;

  const result = await bulkBook(bookings, forceCancel);
  return c.json(result);
}
