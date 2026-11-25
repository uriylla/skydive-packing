import Link from "next/link";
import { KIND_LABEL, type Kind } from "@/lib/kinds";
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
  if (parachuteId === null) {
    return (
      <span>
        <Badge tone="amber">Externo</Badge> <span className="font-normal">{externalLabel}</span>
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
  return <Badge tone={kind === "tandem" ? "blue" : "gray"}>{KIND_LABEL[kind]}</Badge>;
}
