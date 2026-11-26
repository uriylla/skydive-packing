import { expect, test } from "@playwright/test";
import { setUpStation, visible } from "./helpers";

test.beforeEach(async ({ page }) => {
  await setUpStation(page);
});

test("registers packs, blocks out-of-service parachutes and splits by type", async ({ page }) => {
  await visible(page.getByRole("button", { name: "Carlos" })).click();
  const input = visible(page.getByLabel("Número de paracaídas"));
  const status = visible(page.getByRole("status"));

  await input.fill("23");
  await input.press("Enter");
  await expect(status.filter({ hasText: /Carlos — 023 \(Normal\)/ })).toBeVisible();

  await input.fill("12");
  await input.press("Enter");
  await expect(status.filter({ hasText: /Carlos — 012 \(Tándem\)/ })).toBeVisible();

  await input.fill("045");
  await input.press("Enter");
  await expect(
    visible(page.getByRole("alert")).filter({ hasText: "fuera de servicio" }),
  ).toBeVisible();

  // The packer stays selected after a reload.
  await page.reload();
  await expect(visible(page.getByRole("button", { name: "Carlos" }))).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const panel = page.locator("section[aria-labelledby=today-heading]");
  await expect(panel.getByText(/Carlos/).first()).toBeVisible();
});

test("registers an external (unregistered) parachute", async ({ page }) => {
  await visible(page.getByRole("button", { name: "Ana" })).click();
  await visible(page.getByRole("button", { name: /Paracaídas externo/ })).click();
  const register = visible(page.getByRole("button", { name: "Registrar externo" }));
  await visible(page.getByLabel("Descripción del paracaídas externo")).fill("Pedro – Javelin");
  await expect(register).toBeDisabled(); // type not chosen yet
  await visible(page.getByRole("button", { name: "Tándem", exact: true })).click();
  await register.click();
  await expect(
    visible(page.getByRole("status")).filter({ hasText: "Externo: Pedro – Javelin (Tándem)" }),
  ).toBeVisible();
  await expect(visible(page.getByLabel("Número de paracaídas"))).toBeVisible();
});

test("queues packs while offline and sends them when back online", async ({ page, context }) => {
  await visible(page.getByRole("button", { name: "Juan" })).click();
  await context.setOffline(true);
  const input = visible(page.getByLabel("Número de paracaídas"));
  await input.fill("031");
  await input.press("Enter");
  await expect(visible(page.getByText(/1 plegado pendiente de enviar/))).toBeVisible();
  const offlineNotice = visible(page.getByText(/Sin conexión\. El plegado se ha guardado/));
  await expect(offlineNotice).toBeVisible();

  await context.setOffline(false);
  await expect(visible(page.getByText(/pendiente de enviar/))).toHaveCount(0, { timeout: 30_000 });
  // The offline notice goes away by itself once the queue is sent.
  await expect(offlineNotice).toHaveCount(0);
  await page.reload();
  const panel = page.locator("section[aria-labelledby=today-heading]");
  await expect(panel.getByText(/Juan — 031/)).toBeVisible();
});
