"use client";

import { Badge } from "@/components/ui";
import { useI18n } from "@/i18n/client";
import type { ParachuteStatus } from "@/lib/parachutes";

const tone = { active: "green", maintenance: "amber", out_of_service: "red" } as const;

export function StatusBadge({ status }: { status: ParachuteStatus }) {
  const { d } = useI18n();
  return <Badge tone={tone[status]}>{d.status[status]}</Badge>;
}
