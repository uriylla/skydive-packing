/** Supported languages. Safe to import anywhere (proxy, server and client code). */
export const LOCALES = ["es", "en", "ca"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "es";

/** Remembers the device's language (set by the proxy whenever a localized page is visited). */
export const LOCALE_COOKIE = "locale";
/** Request header the proxy sets so Server Actions know the page's language. */
export const LOCALE_HEADER = "x-locale";

/** Each language's name in that language, for the picker. */
export const LOCALE_NAME: Record<Locale, string> = {
  es: "Español",
  en: "English",
  ca: "Català",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Prefix an app path ("/admin/days?x=1") with a language ("/en/admin/days?x=1"). */
export function localePath(locale: Locale, path: string): string {
  if (!path.startsWith("/")) return path;
  if (path === "/") return `/${locale}`;
  if (path.startsWith("/?") || path.startsWith("/#")) return `/${locale}${path.slice(1)}`;
  return `/${locale}${path}`;
}

/** The language a path starts with, if any: "/en/admin" → "en". */
export function pathLocale(pathname: string): Locale | null {
  const first = pathname.split("/")[1];
  return isLocale(first) ? first : null;
}

/** Best supported match for an Accept-Language header ("ca-ES,ca;q=0.9,en;q=0.8"). */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale | null {
  if (!acceptLanguage) return null;
  const ranked = acceptLanguage
    .split(",")
    .map((part, i) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      const quality = q ? Number(q.trim().slice(2)) : 1;
      return { lang: tag.trim().toLowerCase().split("-")[0], quality, i };
    })
    .filter((x) => x.lang && Number.isFinite(x.quality) && x.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.i - b.i);
  return ranked.map((x) => x.lang).find(isLocale) ?? null;
}
