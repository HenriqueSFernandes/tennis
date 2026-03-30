import type { Context } from "hono";
import type { BookRequest, CancelRequest } from "../../types/index.js";
import { book, cancel, getBookings } from "../accounts/service.js";

export async function handleGetBookings(c: Context) {
  const bookings = await getBookings();
  return c.json(bookings);
}

export async function handleBook(c: Context) {
  const body = await c.req.json<BookRequest>();
  const { accountId, courtId, date, dayIndex, turno, hora, semana } = body;

  const result = await book(
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
}

export async function handleCancel(c: Context) {
  const body = await c.req.json<CancelRequest>();
  const { accountId, courtId, date, dayIndex, turno, hora, semana } = body;

  const result = await cancel(
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
}
