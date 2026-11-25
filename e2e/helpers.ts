import { expect, type Locator, type Page } from "@playwright/test";

export const ADMIN = { username: "admin", password: "e2e-password-123" };

/**
 * Next.js keeps the previous page mounted but hidden (for instant back
 * navigation), so scope lookups to what's visible.
 */
export const visible = (l: Locator) => l.filter({ visible: true });

export async function loginAsAdmin(page: Page, next = "/admin/days") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await visible(page.getByLabel("Usuario")).fill(ADMIN.username);
  await visible(page.getByLabel("Contraseña")).fill(ADMIN.password);
  await visible(page.getByRole("button", { name: "Entrar" })).click();
  await expect(visible(page.getByRole("button", { name: "Salir" }))).toBeVisible();
}

/** Logs in and authorizes this browser as a packing station, ending on "/". */
export async function setUpStation(page: Page, name = "PC e2e") {
  await loginAsAdmin(page, "/station/setup");
  await visible(page.getByLabel("Nombre del dispositivo")).fill(name);
  await visible(page.getByRole("button", { name: "Autorizar este dispositivo" })).click();
  await expect(visible(page.getByText(`Dispositivo: ${name}`))).toBeVisible();
}

export function unique(prefix = "") {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}
