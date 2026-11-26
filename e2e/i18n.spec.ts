import { expect, test } from "@playwright/test";
import { ADMIN, visible } from "./helpers";

test.describe("browser language", () => {
  test.use({ locale: "ca-ES" });

  test("a Catalan browser lands on the Catalan site", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/ca$/);
    await expect(page.getByText("Dispositiu no autoritzat")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "ca");
  });
});

test("the language picker switches language and the device remembers it", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/\/es\/login/);
  await visible(page.getByRole("link", { name: "en", exact: true })).click();
  await expect(page).toHaveURL(/\/en\/login/);
  await expect(visible(page.getByRole("heading", { name: "Supervisor login" }))).toBeVisible();

  // Paths without a language now go to English, even though the browser prefers Spanish.
  await page.goto("/admin/days");
  await expect(page).toHaveURL(/\/en\/login\?next=%2Fen%2Fadmin%2Fdays/);

  // Messages from Server Actions come back in the page's language.
  await visible(page.getByLabel("Username")).fill(ADMIN.username);
  await visible(page.getByLabel("Password")).fill("not-the-password");
  await visible(page.getByRole("button", { name: "Log in" })).click();
  await expect(
    visible(page.getByRole("alert")).filter({ hasText: "Wrong username or password." }),
  ).toBeVisible();

  await visible(page.getByLabel("Password")).fill(ADMIN.password);
  await visible(page.getByRole("button", { name: "Log in" })).click();
  await expect(page).toHaveURL(/\/en\/admin\/days$/);
  await expect(visible(page.getByRole("heading", { name: "Days" }))).toBeVisible();

  // Links keep the language.
  await visible(page.getByRole("link", { name: "Parachutes" })).click();
  await expect(page).toHaveURL(/\/en\/admin\/parachutes$/);
  await expect(visible(page.getByRole("cell", { name: "Tandem" })).first()).toBeVisible();

  // Switching keeps the page and its query string.
  await page.goto("/en/admin/parachutes?kind=tandem");
  await visible(page.getByRole("link", { name: "ca", exact: true })).click();
  await expect(page).toHaveURL(/\/ca\/admin\/parachutes\?kind=tandem$/);
  await expect(visible(page.getByRole("heading", { name: "Paracaigudes" }))).toBeVisible();
});

test("the packing station works in English", async ({ page }) => {
  await page.goto("/en/login?next=%2Fen%2Fstation%2Fsetup");
  await visible(page.getByLabel("Username")).fill(ADMIN.username);
  await visible(page.getByLabel("Password")).fill(ADMIN.password);
  await visible(page.getByRole("button", { name: "Log in" })).click();
  await visible(page.getByLabel("Device name")).fill("English tablet");
  await visible(page.getByRole("button", { name: "Authorize this device" })).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(visible(page.getByText("Device: English tablet"))).toBeVisible();

  await visible(page.getByRole("button", { name: "Ana" })).click();
  const number = visible(page.getByLabel("Parachute number"));
  await number.fill("999");
  await number.press("Enter");
  await expect(
    visible(page.getByRole("alert")).filter({ hasText: "There's no parachute “999”" }),
  ).toBeVisible();

  await number.fill("12");
  await number.press("Enter");
  await expect(
    visible(page.getByRole("status")).filter({ hasText: "Ana — 012 (Tandem)" }),
  ).toBeVisible();
});
