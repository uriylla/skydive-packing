/** Time zone that defines a jornada's calendar date. */
export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "Europe/Madrid";

/** Calendar date (YYYY-MM-DD) of `at` in the app time zone. */
export function dayKey(at: Date = new Date(), timeZone = APP_TIMEZONE): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** "14:37" in the app time zone. */
export function formatTime(at: Date, timeZone = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
}

/** "22/09/2026" for a YYYY-MM-DD date string. */
export function formatDayKey(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

/** "22/09/2026 14:37" in the app time zone. */
export function formatDateTime(at: Date, timeZone = APP_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("es-ES", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value;
  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}`;
}
