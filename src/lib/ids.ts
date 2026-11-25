import { notFound } from "next/navigation";

/** Parses a route id param, or renders the 404 page. */
export function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  return id;
}
