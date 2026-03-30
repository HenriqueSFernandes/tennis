// Date utilities

export function isDateToday(dateStr: string): boolean {
  const [dd, mm, yyyy] = dateStr.split("-").map(Number);
  const date = new Date(yyyy ?? 0, (mm ?? 1) - 1, dd ?? 1);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export function computeDateForWeek(
  weekOffset: number,
  dayOfWeek: number,
): string {
  const today = new Date();
  const todayDay = today.getDay();
  const todayMon = todayDay === 0 ? 6 : todayDay - 1;

  const daysSinceMonday = todayMon;
  const startOfCurrentWeek = new Date(today);
  startOfCurrentWeek.setDate(today.getDate() - daysSinceMonday);

  const startOfTargetWeek = new Date(startOfCurrentWeek);
  startOfTargetWeek.setDate(startOfCurrentWeek.getDate() + weekOffset * 7);

  const targetDate = new Date(startOfTargetWeek);
  targetDate.setDate(startOfTargetWeek.getDate() + dayOfWeek);

  return `${String(targetDate.getDate()).padStart(2, "0")}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${targetDate.getFullYear()}`;
}

export function parseDate(dateStr: string): Date | null {
  const [day, month, year] = dateStr.split("-").map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
}
