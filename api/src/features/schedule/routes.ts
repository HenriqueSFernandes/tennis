import type { Context } from "hono";
import { getSchedule } from "../accounts/service";
import { getUserIdFromContext } from "../auth/middleware";

export async function handleGetSchedule(c: Context) {
  try {
    const userId = getUserIdFromContext(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const weekOffset = parseInt(c.req.query("week") ?? "0", 10);
    const result = await getSchedule(userId, weekOffset);

    if (!result) {
      return c.json({ error: "No accounts configured" }, 400);
    }

    return c.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: `Schedule error: ${message}` }, 500);
  }
}
