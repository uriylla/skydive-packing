import { expect, test } from "@playwright/test";
import { loginAsAdmin, setUpStation, unique, visible } from "./helpers";

test("creates a parachute with a type and finds it by filter", async ({ page }) => {
  await loginAsAdmin(page, "/admin/parachutes/new");
  const number = String(100 + Math.floor(Math.random() * 800));
  await visible(page.getByLabel("Número", { exact: true })).fill(number);
  await visible(page.getByRole("button", { name: "Crear paracaídas" })).click();
  await expect(visible(page.getByText("Elige el tipo."))).toBeVisible();
  await visible(page.getByLabel("Tipo")).selectOption("tandem");
  await visible(page.getByRole("button", { name: "Crear paracaídas" })).click();
  await expect(page).toHaveURL(/\/admin\/parachutes\/\d+$/);

  await page.goto("/admin/parachutes?kind=tandem");
  await expect(visible(page.getByRole("link", { name: number, exact: true }))).toBeVisible();
});

test("a new packer appears on the packing screen", async ({ page }) => {
  const name = unique("Plegador ");
  await loginAsAdmin(page, "/admin/packers/new");
  await visible(page.getByLabel("Nombre")).fill(name);
  await visible(page.getByRole("button", { name: "Crear" })).click();
  await expect(page).toHaveURL(/\/admin\/packers\/\d+$/);

  await setUpStation(page, "PC packers");
  await expect(visible(page.getByRole("button", { name }))).toBeVisible();
});

test("voids and corrects packs from the history", async ({ page }) => {
  await setUpStation(page, "PC corrections");
  await visible(page.getByRole("button", { name: "Ana" })).click();
  const input = visible(page.getByLabel("Número de paracaídas"));
  for (const n of ["023", "031"]) {
    await input.fill(n);
    await input.press("Enter");
    await expect(visible(page.getByRole("status")).filter({ hasText: n })).toBeVisible();
  }

  // Void the latest pack.
  await page.goto("/admin/history?packerId=2");
  await visible(page.locator("tbody tr")).first().getByRole("link", { name: "Corregir" }).click();
  await visible(page.getByLabel("Motivo", { exact: true })).fill("Registrado dos veces");
  await visible(page.getByRole("button", { name: "Anular plegado" })).click();
  await expect(visible(page.getByRole("button", { name: "Deshacer anulación" }))).toBeVisible();

  // Correct the other one to an external tandem.
  await page.goto("/admin/history?packerId=2");
  await visible(page.locator("tbody tr")).first().getByRole("link", { name: "Corregir" }).click();
  await visible(page.getByLabel("Externo (no registrado)")).check();
  await visible(page.getByLabel("Tipo")).selectOption("tandem");
  await visible(page.getByLabel("Descripción")).fill("Cliente Luis");
  await visible(page.getByRole("button", { name: "Guardar corrección" })).click();
  await expect(visible(page.getByText("registro anterior"))).toBeVisible();

  await page.goto("/admin/history?packerId=2&parachuteId=external");
  await expect(visible(page.locator("tbody tr")).filter({ hasText: "Cliente Luis" })).toBeVisible();
  await page.goto("/admin/history?packerId=2&includeVoided=1");
  await expect(visible(page.locator("tbody tr")).filter({ hasText: "Anulado" })).toHaveCount(2);
});
