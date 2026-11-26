"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "./config";
import { createI18n, type Dict, type I18n } from "./translate";

const I18nContext = createContext<I18n | null>(null);

/** Makes the route's language and dictionary available to Client Components. */
export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dict;
  children: ReactNode;
}) {
  const value = useMemo(() => createI18n(locale, dict), [locale, dict]);
  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>");
  return value;
}
