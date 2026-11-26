"use client";

import { useI18n } from "@/i18n/client";

export function PageLoading({ className = "text-sm opacity-50" }: { className?: string }) {
  const { d } = useI18n();
  return <p className={className}>{d.common.loading}</p>;
}
