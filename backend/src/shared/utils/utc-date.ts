/** Return UTC midnight without changing the supplied date. */
export function startOfDayUtc(date: Date = new Date()): Date {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

/** Weeks start on Sunday at UTC midnight. */
export function startOfWeekUtc(date: Date = new Date()): Date {
  const start = startOfDayUtc(date);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  return start;
}
