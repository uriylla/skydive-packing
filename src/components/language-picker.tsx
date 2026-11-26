"use client";

import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { LOCALE_NAME, LOCALES, localePath } from "@/i18n/config";

/**
 * Links to the same page in each language. A full page load (plain <a>)
 * switches the whole layout; the proxy then remembers the choice.
 */
export function LanguagePicker() {
  const { locale, d } = useI18n();
  const pathname = usePathname();
  const rest = pathname.replace(/^\/[^/]+/, "") || "/";

  return (
    <ul aria-label={d.common.language} className="flex gap-1">
      {LOCALES.map((l) => (
        <li key={l}>
          {l === locale ? (
            <span
              aria-current="true"
              title={LOCALE_NAME[l]}
              className="rounded px-1.5 py-0.5 text-xs font-semibold uppercase bg-black/10 dark:bg-white/15"
            >
              {l}
            </span>
          ) : (
            <a
              href={localePath(l, rest)}
              // Keep the query string (e.g. history filters) when switching.
              onClick={(e) => {
                e.currentTarget.href = localePath(l, rest) + window.location.search;
              }}
              hrefLang={l}
              lang={l}
              title={LOCALE_NAME[l]}
              className="rounded px-1.5 py-0.5 text-xs uppercase opacity-60 hover:opacity-100"
            >
              {l}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
