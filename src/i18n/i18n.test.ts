import { describe, expect, it } from "vitest";
import { localePath, negotiateLocale, pathLocale } from "./config";
import { ca } from "./dictionaries/ca";
import { en } from "./dictionaries/en";
import { es } from "./dictionaries/es";
import { createI18n, msg } from "./translate";

describe("locale helpers", () => {
  it("prefixes paths", () => {
    expect(localePath("en", "/")).toBe("/en");
    expect(localePath("en", "/admin/days")).toBe("/en/admin/days");
    expect(localePath("ca", "/?x=1")).toBe("/ca?x=1");
    expect(localePath("ca", "https://example.com")).toBe("https://example.com");
  });

  it("reads the language from a path", () => {
    expect(pathLocale("/en/admin")).toBe("en");
    expect(pathLocale("/ca")).toBe("ca");
    expect(pathLocale("/admin")).toBeNull();
    expect(pathLocale("/")).toBeNull();
  });

  it("negotiates Accept-Language", () => {
    expect(negotiateLocale("ca-ES,ca;q=0.9,es;q=0.8,en;q=0.7")).toBe("ca");
    expect(negotiateLocale("en-US,en;q=0.9")).toBe("en");
    expect(negotiateLocale("fr-FR,fr;q=0.9,es;q=0.5")).toBe("es");
    expect(negotiateLocale("de;q=0.9,en;q=0.1,ca;q=0.5")).toBe("ca");
    expect(negotiateLocale("fr")).toBeNull();
    expect(negotiateLocale("en;q=0")).toBeNull();
    expect(negotiateLocale(null)).toBeNull();
  });
});

describe("translate", () => {
  it("fills placeholders, messages and plurals", () => {
    const i = createI18n("en", en);
    expect(i.f(i.d.pagination.page, { page: 2, pages: 5 })).toBe("Page 2 of 5");
    expect(i.m(msg("parachuteRetired", { number: "045" }))).toBe("Parachute 045 is retired.");
    expect(i.p(i.d.station.pending, 1)).toBe("1 pack waiting to be sent");
    expect(i.p(i.d.station.pending, 3)).toBe("3 packs waiting to be sent");
    expect(createI18n("es", es).p(es.station.pending, 0)).toBe("0 plegados pendientes de enviar");
  });
});

/** Every string, keyed by its dotted path. */
function flatten(obj: object, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") out[prefix + k] = v;
    else Object.assign(out, flatten(v, `${prefix}${k}.`));
  }
  return out;
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe.each([
  ["en", en],
  ["ca", ca],
])("%s dictionary", (_, dict) => {
  const source = flatten(es);
  const target = flatten(dict);

  it("has the same keys as Spanish", () => {
    expect(Object.keys(target).sort()).toEqual(Object.keys(source).sort());
  });

  it("uses the same placeholders as Spanish", () => {
    for (const [key, text] of Object.entries(source)) {
      expect(placeholders(target[key]), key).toEqual(placeholders(text));
    }
  });

  it("has no empty strings", () => {
    for (const [key, text] of Object.entries(target)) {
      if (text === "") expect.fail(`${key} is empty`);
    }
  });
});
