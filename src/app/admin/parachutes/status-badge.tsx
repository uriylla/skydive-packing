import { Badge } from "@/components/ui";
import { STATUS_LABEL, type ParachuteStatus } from "@/lib/parachutes";

const tone = { active: "green", maintenance: "amber", out_of_service: "red" } as const;

export function StatusBadge({ status }: { status: ParachuteStatus }) {
  return <Badge tone={tone[status]}>{STATUS_LABEL[status]}</Badge>;
}
