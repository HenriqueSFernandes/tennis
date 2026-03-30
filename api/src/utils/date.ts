export function parseDateTime(dateStr: string, timeStr: string): Date {
  const [dd = 1, mm = 1, yyyy = 1970] = dateStr.split("-").map(Number);
  const [hh = 0, min = 0] = timeStr.split(":").map(Number);
  return new Date(yyyy, mm - 1, dd, hh, min);
}

export function isPastDate(dateStr: string): boolean {
  const [dd = 1, mm = 1, yyyy = 1970] = dateStr.split("-").map(Number);
  const slotDate = new Date(yyyy, mm - 1, dd);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return slotDate < today;
}

export function toIsoDate(ddmmyyyy: string): string {
  const [dd, mm, yyyy] = ddmmyyyy.split("-");
  return dd && mm && yyyy ? `${yyyy}-${mm}-${dd}` : ddmmyyyy;
}
