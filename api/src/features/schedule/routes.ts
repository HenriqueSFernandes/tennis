import type { Context } from "hono";
import { getSchedule } from "../accounts/service.js";

export async function handleGetSchedule(c: Context) {
  try {
    const weekOffset = parseInt(c.req.query("week") ?? "0", 10);
    const result = await getSchedule(weekOffset);

    if (!result) {
      return c.json({ error: "No accounts configured" }, 400);
    }

    return c.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: `Schedule error: ${message}` }, 500);
  }
}
