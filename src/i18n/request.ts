import "server-only";
import { cookies, headers } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE, LOCALE_HEADER, type Locale } from "./config";
import { getDictionary } from "./dictionaries";
import { createI18n } from "./translate";

/**
 * The language of the page that made this request, for code where route
 * params aren't available (Server Actions, auth redirects). The proxy sets
 * the header from the URL; the cookie is a fallback.
 */
export async function getRequestLocale(): Promise<Locale> {
  const fromHeader = (await headers()).get(LOCALE_HEADER);
  if (isLocale(fromHeader)) return fromHeader;
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(fromCookie) ? fromCookie : defaultLocale();
}

/** Translations for Server Actions. */
export async function getRequestI18n() {
  const locale = await getRequestLocale();
  return createI18n(locale, getDictionary(locale));
}
