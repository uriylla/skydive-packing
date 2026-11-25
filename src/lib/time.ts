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
