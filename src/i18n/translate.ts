import type { Locale } from "./config";
import type { Dict } from "./dictionaries/es";

export type { Dict };
export type MsgKey = keyof Dict["msg"];
export type MsgValues = Record<string, string | number>;

/**
 * A message from the data layer, translated where it is shown. Library code
 * returns these instead of text so it doesn't depend on the user's language.
 */
export type Msg = { key: MsgKey; values?: MsgValues };

export function msg(key: MsgKey, values?: MsgValues): Msg {
  return values ? { key, values } : { key };
}

/** Singular/plural pair; `{n}` is replaced with the count. */
export type Plural = { one: string; other: string };

/** Fill `{name}` placeholders. */
export function format(template: string, values?: MsgValues): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (all, key: string) =>
    key in values ? String(values[key]) : all,
  );
}

export function createI18n(locale: Locale, d: Dict) {
  const rules = new Intl.PluralRules(locale);
  return {
    locale,
    /** The dictionary: `d.nav.days`. */
    d,
    /** Fill placeholders: `f(d.station.registeredAs, { name })`. */
    f: format,
    /** Translate a data-layer message. */
    m: (message: Msg) => format(d.msg[message.key], message.values),
    /** Pick singular/plural for `n`: `p(d.history.count, total)`. */
    p: (forms: Plural, n: number, values?: MsgValues) =>
      format(rules.select(n) === "one" ? forms.one : forms.other, { n, ...values }),
  };
}

export type I18n = ReturnType<typeof createI18n>;
