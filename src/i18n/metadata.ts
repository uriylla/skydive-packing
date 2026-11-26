import type { Metadata } from "next";
import type { Dict } from "./dictionaries/es";
import { getI18n } from "./server";

/** `export const generateMetadata = pageTitle((d) => d.days.title);` → "Jornadas · Plegados". */
export function pageTitle(pick: (d: Dict) => string) {
  return async function generateMetadata(): Promise<Metadata> {
    const { d } = await getI18n();
    return { title: `${pick(d)} · ${d.app.name}` };
  };
}
