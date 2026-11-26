import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { isLocale } from "./config";
import { getDictionary } from "./dictionaries";
import { createI18n } from "./translate";

/** The current route's language (the `[lang]` segment). Server Components only. */
export async function getLocale() {
  const value = await lang();
  if (!isLocale(value)) notFound();
  return value;
}

/** Translations for Server Components. */
export async function getI18n() {
  const locale = await getLocale();
  return createI18n(locale, getDictionary(locale));
}
