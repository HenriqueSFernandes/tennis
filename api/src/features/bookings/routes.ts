import type { Context } from "hono";
import type { BookRequest, CancelRequest } from "../../types/index";
import { book, cancel, getBookings } from "../accounts/service";
import { getUserIdFromContext } from "../auth/middleware";

export async function handleGetBookings(c: Context) {
  try {
    const userId = getUserIdFromContext(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const bookings = await getBookings(userId);
    return c.json(bookings);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: `Bookings error: ${message}` }, 500);
  }
}

export async function handleBook(c: Context) {
  try {
    const userId = getUserIdFromContext(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json<BookRequest>();
    const { accountId, courtId, date, dayIndex, turno, hora, semana } = body;

    const result = await book(
      userId,
      accountId,
      courtId,
      date,
      dayIndex,
      turno,
      hora,
      semana,
    );

    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }
    return c.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: `Booking error: ${message}` }, 500);
  }
}

export async function handleCancel(c: Context) {
  try {
    const userId = getUserIdFromContext(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json<CancelRequest>();
    const { accountId, courtId, date, dayIndex, turno, hora, semana } = body;

    const result = await cancel(
      userId,
      accountId,
      courtId,
      date,
      dayIndex,
      turno,
      hora,
      semana,
    );

    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }
    return c.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: `Cancel error: ${message}` }, 500);
  }
}
