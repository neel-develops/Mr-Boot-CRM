// The shop runs on India time, but Vercel servers run on UTC.
// Every "today" / "overdue" / date label must go through these helpers.

export const SHOP_TZ = "Asia/Kolkata";
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Start (inclusive) and end (exclusive) of the India-time day containing `at`, as real instants. */
export function istDayBounds(at: Date = new Date()): { start: Date; end: Date } {
  const ist = new Date(at.getTime() + IST_OFFSET_MS);
  const start = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_OFFSET_MS;
  return { start: new Date(start), end: new Date(start + DAY_MS) };
}

/** Bounds of an India-time calendar day given as YYYY-MM-DD. */
export function istDayBoundsFor(ymd: string): { start: Date; end: Date } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  const start = Date.UTC(+m[1], +m[2] - 1, +m[3]) - IST_OFFSET_MS;
  if (isNaN(start)) return null;
  return { start: new Date(start), end: new Date(start + DAY_MS) };
}

/** YYYY-MM-DD for the India-time day of `at` (for <input type="date"> and grouping). */
export function istYmd(at: Date | string = new Date()): string {
  return new Date(at).toLocaleDateString("en-CA", { timeZone: SHOP_TZ });
}

/** An order is overdue once its due *day* (India time) has passed. */
export function isOverdue(dueDate: Date | string, now: Date = new Date()): boolean {
  return istYmd(dueDate) < istYmd(now);
}

/** Whole India-time days between the due day and today (0 if not overdue). */
export function daysOverdue(dueDate: Date | string, now: Date = new Date()): number {
  const due = istDayBoundsFor(istYmd(dueDate))!.start.getTime();
  const today = istDayBounds(now).start.getTime();
  return Math.max(0, Math.round((today - due) / DAY_MS));
}

export function formatIstDate(at: Date | string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  return new Date(at).toLocaleDateString("en-IN", { ...opts, timeZone: SHOP_TZ });
}

export function formatIstDateTime(at: Date | string): string {
  return new Date(at).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: SHOP_TZ,
  });
}
