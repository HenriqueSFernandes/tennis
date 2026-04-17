import type { Context } from "hono";
import { generateIcsContent } from "../../utils/ics.js";
import { getUserIdFromContext } from "../auth/middleware.js";
import { fetchAllBookings } from "./service.js";

export async function handleExportBookings(c: Context) {
  const userId = getUserIdFromContext(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const accountId = c.req.query("accountId");

  try {
    let bookings = await fetchAllBookings(userId);

    if (accountId) {
      bookings = bookings.filter((b) => b.accountId === accountId);
    }

    if (bookings.length === 0) {
      return c.json({ error: "No bookings found" }, 404);
    }

    const icsContent = generateIcsContent(bookings);

    c.header("Content-Type", "text/calendar; charset=utf-8");
    c.header(
      "Content-Disposition",
      'attachment; filename="riotinto-bookings.ics"',
    );
    return c.body(icsContent);
  } catch {
    return c.json({ error: "Failed to generate calendar file" }, 500);
  }
}
