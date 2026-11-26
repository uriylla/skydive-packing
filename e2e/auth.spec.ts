import { expect, test } from "@playwright/test";
import { ADMIN, loginAsAdmin, unique, visible } from "./helpers";

test("an unauthorized device can't register packs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Dispositivo no autorizado")).toBeVisible();
  await expect(page.getByLabel("Número de paracaídas")).toHaveCount(0);
});

test("admin pages require a supervisor login", async ({ page }) => {
  await page.goto("/admin/parachutes");
  await expect(page).toHaveURL(/\/es\/login\?next=%2Fes%2Fadmin%2Fparachutes/);
  await loginAsAdmin(page, "/admin/parachutes");
  await expect(page).toHaveURL(/\/es\/admin\/parachutes$/);
  await expect(visible(page.getByRole("heading", { name: "Paracaídas" }))).toBeVisible();

  await visible(page.getByRole("button", { name: "Salir" })).click();
  await expect(visible(page.getByRole("link", { name: "Entrar" }))).toBeVisible();
  await page.goto("/admin/parachutes");
  await expect(page).toHaveURL(/\/login/);
});

test("wrong passwords are rejected and repeated failures lock the account", async ({ page }) => {
  const username = unique("nobody");
  await page.goto("/login");
  const submit = async () => {
    await visible(page.getByLabel("Usuario")).fill(username);
    await visible(page.getByLabel("Contraseña")).fill("wrong-password");
    // Wait for each attempt to finish: the error from the previous one is already showing.
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/login")),
      visible(page.getByRole("button", { name: "Entrar" })).click(),
    ]);
  };
  for (let i = 0; i < 5; i++) {
    await submit();
    await expect(visible(page.getByRole("alert")).filter({ hasText: "incorrectos" })).toBeVisible();
  }
  await submit();
  await expect(
    visible(page.getByRole("alert")).filter({ hasText: "Demasiados intentos" }),
  ).toBeVisible();
  // Other accounts are unaffected.
  await visible(page.getByLabel("Usuario")).fill(ADMIN.username);
  await visible(page.getByLabel("Contraseña")).fill(ADMIN.password);
  await visible(page.getByRole("button", { name: "Entrar" })).click();
  await expect(visible(page.getByRole("button", { name: "Salir" }))).toBeVisible();
});
