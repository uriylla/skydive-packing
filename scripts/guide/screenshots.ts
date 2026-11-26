/**
 * Drives a running app (seeded by seed.ts) and saves the user-guide screenshots.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, devices, type Browser, type Locator, type Page } from "@playwright/test";
import { GUIDE_ADMIN } from "./seed";

const visible = (l: Locator) => l.filter({ visible: true });

/** Rings an element in the brand accent for the screenshot. */
async function highlight(l: Locator) {
  await l.evaluate((el: HTMLElement) => {
    el.dataset.guideHighlight = "1";
    el.style.outline = "3px solid #e8590c";
    el.style.outlineOffset = "3px";
    el.style.borderRadius ||= "6px";
  });
}
async function clearHighlights(page: Page) {
  await page.evaluate(() =>
    document.querySelectorAll<HTMLElement>("[data-guide-highlight]").forEach((el) => {
      el.style.outline = "";
      el.style.outlineOffset = "";
      delete el.dataset.guideHighlight;
    }),
  );
}

export async function takeScreenshots(opts: {
  baseURL: string;
  outDir: string;
  locale: string;
  executablePath?: string;
}) {
  const { baseURL, outDir, locale } = opts;
  await mkdir(outDir, { recursive: true });
  const browserLocale = locale === "ca" ? "ca-ES" : locale === "en" ? "en-GB" : "es-ES";
  const browser: Browser = await chromium.launch({
    // Date inputs follow the browser's UI language, not the page's.
    args: [`--lang=${browserLocale}`],
    ...(opts.executablePath ? { executablePath: opts.executablePath } : {}),
  });
  const t = (await import(`../../src/i18n/dictionaries/${locale}.ts`))[locale];
  const L = (p: string) => `/${locale}${p === "/" ? "" : p}`;
  /**
   * Screenshot cropped to the page's content (at most `maxHeight` CSS px),
   * optionally starting a bit above `around` instead of at the top.
   */
  const shot = async (
    page: Page,
    name: string,
    o: { clip?: Locator; maxHeight?: number; around?: Locator } = {},
  ) => {
    await page.waitForLoadState("networkidle");
    // Let transitions and fonts settle.
    await page.waitForTimeout(250);
    const file = path.join(outDir, `${name}.png`);
    if (o.clip) {
      await o.clip.screenshot({ path: file });
    } else {
      const { width } = page.viewportSize()!;
      // Content height: the bottom of the last element in <main> (pages may have min-height).
      const height = await page.evaluate(() => {
        const els = [...document.querySelectorAll("header, main *")] as HTMLElement[];
        const bottom = Math.max(...els.map((e) => e.getBoundingClientRect().bottom + window.scrollY));
        return Math.ceil(bottom + 24);
      });
      let y = 0;
      if (o.around) {
        const box = (await o.around.boundingBox())!;
        y = Math.max(0, Math.round(box.y + (await page.evaluate(() => window.scrollY)) - 260));
      }
      const h = Math.min(height - y, o.maxHeight ?? 760);
      await page.screenshot({ path: file, fullPage: true, clip: { x: 0, y, width, height: h } });
    }
    await clearHighlights(page);
  };

  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1100, height: 700 },
    deviceScaleFactor: 2,
    locale: browserLocale,
    timezoneId: "Europe/Madrid",
    colorScheme: "light",
  });
  const page = await context.newPage();

  // --- Device not authorized, then supervisor login and device authorization.
  await page.goto(L("/"));
  await visible(page.getByText(t.station.unauthorizedTitle)).waitFor();
  await shot(page, "station-unauthorized");

  await page.goto(`${L("/login")}?next=${encodeURIComponent(L("/station/setup"))}`);
  await visible(page.getByLabel(t.field.username)).fill(GUIDE_ADMIN.username);
  await visible(page.getByLabel(t.field.password)).fill("••••••••••••");
  await shot(page, "login");
  await visible(page.getByLabel(t.field.password)).fill(GUIDE_ADMIN.password);
  await visible(page.getByRole("button", { name: t.login.submit })).click();
  const deviceName = visible(page.getByLabel(t.setup.nameLabel));
  await deviceName.waitFor();
  await deviceName.fill(t.setup.namePlaceholder);
  await highlight(visible(page.getByRole("button", { name: t.setup.authorize })));
  await shot(page, "setup");
  await visible(page.getByRole("button", { name: t.setup.authorize })).click();
  await visible(page.getByText(t.station.device.replace("{name}", t.setup.namePlaceholder))).waitFor();

  // Supervisors see the admin menu; packers use the station logged out.
  await visible(page.getByRole("button", { name: t.nav.logout })).click();
  await visible(page.getByRole("link", { name: t.nav.login })).waitFor();

  // --- Packing station.
  await page.goto(L("/"));
  await highlight(visible(page.getByRole("button", { name: "Carlos" })));
  await shot(page, "station-select");

  await visible(page.getByRole("button", { name: "Carlos" })).click();
  const input = visible(page.getByLabel(t.station.numberLabel));
  await input.fill("23");
  await input.press("Enter");
  const ok = visible(page.getByRole("status")).filter({ hasText: "Carlos — 023" });
  await ok.waitFor();
  await highlight(ok);
  await shot(page, "station-registered");

  await visible(page.getByRole("button", { name: t.station.openExternal })).click();
  await visible(page.getByRole("button", { name: t.kind.normal, exact: true })).click();
  await visible(page.getByLabel(t.station.externalLabel)).fill("Pedro – Javelin azul");
  await highlight(visible(page.getByRole("button", { name: t.station.registerExternal })));
  await shot(page, "station-external");
  await visible(page.getByRole("button", { name: t.station.registerExternal })).click();
  await visible(page.getByRole("status")).filter({ hasText: "Pedro – Javelin azul" }).waitFor();

  await input.fill("999");
  await input.press("Enter");
  const err = visible(page.getByRole("alert"));
  await err.waitFor();
  await highlight(err);
  await shot(page, "station-error");

  await context.setOffline(true);
  await input.fill("31");
  await input.press("Enter");
  const pending = visible(page.getByText(t.station.pending.one.replace("{n}", "1")));
  await pending.waitFor();
  await highlight(pending);
  await shot(page, "station-offline");
  await context.setOffline(false);
  await page.waitForFunction(() => !document.body.innerText.match(/\d+ (plegado|pack|plegat)/));

  await shot(page, "language", {
    clip: page.locator("header nav"),
  });

  // Phone layout, same authorized device.
  const phone = await browser.newContext({
    ...devices["iPhone 13"],
    baseURL,
    locale: browserLocale,
    timezoneId: "Europe/Madrid",
    storageState: await context.storageState(),
  });
  const phonePage = await phone.newPage();
  await phonePage.goto(L("/"));
  await visible(phonePage.getByLabel(t.station.numberLabel)).waitFor();
  await shot(phonePage, "station-phone", { maxHeight: 844 });
  await phone.close();

  // --- Supervisor pages.
  await page.goto(`${L("/login")}?next=${encodeURIComponent(L("/admin/days"))}`);
  await visible(page.getByLabel(t.field.username)).fill(GUIDE_ADMIN.username);
  await visible(page.getByLabel(t.field.password)).fill(GUIDE_ADMIN.password);
  await visible(page.getByRole("button", { name: t.login.submit })).click();
  await visible(page.getByRole("heading", { name: t.days.title })).waitFor();
  await shot(page, "days");

  // Yesterday's (second) jornada: a full day.
  const dayLinks = visible(page.locator("table a[href*='/admin/days/']"));
  await dayLinks.nth(1).click();
  await visible(page.getByRole("link", { name: t.day.filterInHistory })).waitFor();
  await shot(page, "day", { maxHeight: 640 });

  await page.goto(L("/admin/history"));
  await visible(page.getByRole("heading", { name: t.history.title })).waitFor();
  // Filter: Carlos, tandems, whole range.
  const packerSelect = visible(page.getByLabel(t.field.packer));
  await packerSelect.selectOption({ label: "Carlos" });
  await visible(page.getByLabel(t.field.kind)).selectOption({ label: t.kind.tandem });
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date());
  await visible(page.getByLabel(t.history.from, { exact: true })).fill(`${today.slice(0, 8)}01`);
  await visible(page.getByLabel(t.history.to, { exact: true })).fill(today);
  await visible(page.getByRole("button", { name: t.common.filter })).click();
  await page.waitForURL(/packerId=/);
  await shot(page, "history", { maxHeight: 560 });

  await page.goto(`${L("/admin/history")}?includeVoided=1`);
  const voided = visible(page.locator("tr", { hasText: t.common.voided })).first();
  await voided.waitFor();
  await highlight(voided);
  await shot(page, "history-voided", { around: voided, maxHeight: 420 });

  // A pack from an earlier day, not one logged a moment ago.
  await page.goto(L("/admin/days"));
  await dayLinks.nth(1).click();
  await visible(page.getByRole("link", { name: t.common.correct })).nth(3).click();
  await visible(page.getByRole("heading", { name: t.pack.correctTitle })).waitFor();
  await shot(page, "pack");

  await page.goto(L("/admin/parachutes"));
  await visible(page.getByRole("heading", { name: t.parachutes.title })).waitFor();
  await shot(page, "parachutes");

  await visible(page.getByRole("link", { name: "012" })).first().click();
  await visible(page.getByRole("heading", { name: t.parachutes.detailTitle.replace("{number}", "012") })).waitFor();
  await shot(page, "parachute", { maxHeight: 600 });

  await page.goto(L("/admin/parachutes/new"));
  await visible(page.getByRole("heading", { name: t.parachutes.newTitle })).waitFor();
  await shot(page, "parachute-new");

  await page.goto(L("/admin/packers"));
  await visible(page.getByRole("heading", { name: t.packers.title })).waitFor();
  await shot(page, "packers");

  await visible(page.getByRole("link", { name: "Carlos" })).first().click();
  await visible(page.getByRole("heading", { name: "Carlos" })).waitFor();
  await shot(page, "packer", { maxHeight: 640 });

  await page.goto(L("/admin/stations"));
  await visible(page.getByRole("heading", { name: t.stations.title })).waitFor();
  await shot(page, "stations");

  await browser.close();
}
