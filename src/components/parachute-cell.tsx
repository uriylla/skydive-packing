"use client";

import { useI18n } from "@/i18n/client";
import type { Kind } from "@/lib/kinds";
import { Link } from "./link";
import { Badge } from "./ui";

/** A pack's parachute: link to the registered one, or "Externo" + its description. */
export function ParachuteCell({
  parachuteId,
  parachuteNumber,
  externalLabel,
}: {
  parachuteId: number | null;
  parachuteNumber: string | null;
  externalLabel: string | null;
}) {
  const { d } = useI18n();
  if (parachuteId === null) {
    return (
      <span>
        <Badge tone="amber">{d.common.external}</Badge>{" "}
        <span className="font-normal">{externalLabel}</span>
      </span>
    );
  }
  return (
    <Link href={`/admin/parachutes/${parachuteId}`} className="hover:underline">
      {parachuteNumber}
    </Link>
  );
}

export function KindBadge({ kind }: { kind: Kind }) {
  const { d } = useI18n();
  return <Badge tone={kind === "tandem" ? "blue" : "gray"}>{d.kind[kind]}</Badge>;
}
