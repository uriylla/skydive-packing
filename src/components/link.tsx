"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";
import { localePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

/**
 * next/link that keeps the current language: `href="/admin/days"` points to
 * "/en/admin/days" on an English page. Use it for every internal link.
 */
export function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const { locale } = useI18n();
  const localized = typeof href === "string" ? localePath(locale, href) : href;
  return <NextLink href={localized} {...props} />;
}
