import "server-only";
import type { Locale } from "../config";
import { ca } from "./ca";
import { en } from "./en";
import { es, type Dict } from "./es";

const dictionaries: Record<Locale, Dict> = { es, en, ca };

export function getDictionary(locale: Locale): Dict {
  return dictionaries[locale];
}
