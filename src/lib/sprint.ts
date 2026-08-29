// Sprint status / capacity math — see "How the numbers are computed" in the blueprint.

export type SprintStatus = "Planning" | "Started" | "Completed";

export function sprintStatus(
  devStart: Date | null,
  devEnd: Date | null,
  today: Date = new Date(),
): SprintStatus {
  if (!devStart || today < devStart) return "Planning";
  if (devEnd && today > devEnd) return "Completed";
  return "Started";
}

/** Whole days between two dates (can be negative), ignoring time-of-day. */
function dayDiff(a: Date, b: Date): number {
  const ms =
    Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) -
    Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round(ms / 86_400_000);
}

export function daysRemaining(devEnd: Date | null, today: Date = new Date()): number | null {
  if (!devEnd) return null;
  return Math.max(0, dayDiff(devEnd, today));
}

/**
 * Count working days (Sun–Thu) between start and end, inclusive — Bangladesh's
 * standard work week, not the Mon–Fri default. Friday and Saturday are the
 * weekend. No public-holiday calendar is subtracted; add one here (a
 * `public.holidays` lookup, checked per-date) if specific holidays inside a
 * sprint should also be excluded from capacity.
 */
export function countWorkdays(start: Date | null, end: Date | null): number {
  if (!start || !end || end < start) return 0;
  let count = 0;
  const cur = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()));
  const last = new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()));
  while (cur <= last) {
    const day = cur.getUTCDay(); // 0=Sun .. 6=Sat
    if (day !== 5 && day !== 6) count += 1; // exclude Fri, Sat
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

export const HOURS_PER_DAY = 6.5;
