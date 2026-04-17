import * as ics from "ics";
import type { BookingWithAccount } from "../types/index";

export function dateToIcsArray(date: Date): ics.DateArray {
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
  ];
}

export function generateIcsContent(bookings: BookingWithAccount[]): string {
  const events: ics.EventAttributes[] = bookings.map((booking) => {
    const startDate = parseDateTime(booking.date, booking.time);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    return {
      start: dateToIcsArray(startDate),
      end: dateToIcsArray(endDate),
      title: `Tennis Court ${booking.courtId}`,
      location: "Rio Tinto",
      description: `Court ${booking.courtId} booking\nAccount: ${booking.displayName} (${booking.username})\nPhone: ${booking.phone}`,
      uid: `${booking.accountId}-${booking.courtId}-${booking.date.replace(/-/g, "")}-${booking.time.replace(/:/g, "")}@riotinto.pt`,
    };
  });

  const { error, value } = ics.createEvents(events);
  if (error || !value) {
    throw new Error(error ? String(error) : "Failed to generate ICS file");
  }

  return value;
}

function parseDateTime(dateStr: string, timeStr: string): Date {
  const [dd = 1, mm = 1, yyyy = 1970] = dateStr.split("-").map(Number);
  const [hh = 0, min = 0] = timeStr.split(":").map(Number);
  return new Date(yyyy, mm - 1, dd, hh, min);
}
