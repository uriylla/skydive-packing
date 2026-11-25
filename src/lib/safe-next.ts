/** Only allow same-site relative redirects ("/admin/days"), never "//evil.com" or URLs. */
export function safeNext(next: unknown, fallback = "/admin/days"): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) return fallback;
  if (next.includes("\\")) return fallback;
  return next;
}
