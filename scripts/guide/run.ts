/**
 * Builds the user guide PDF: seeds a throwaway database, starts the
 * production build against it, takes screenshots and renders the PDF.
 *
 *   pnpm build && pnpm guide            # Spanish (default)
 *   pnpm guide --locale en              # English / ca for Catalan
 *
 * Needs the local Postgres (docker compose up -d) and a `packing_guide`
 * database, or GUIDE_DATABASE_URL pointing at another throwaway database.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { seedGuide } from "./seed";
import { takeScreenshots } from "./screenshots";
import { renderPdf } from "./pdf";

const PORT = 3200;
const DATABASE_URL =
  process.env.GUIDE_DATABASE_URL ?? "postgres://packing:packing@localhost:5433/packing_guide";
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const locale = arg("locale") ?? "es";
const skipShots = process.argv.includes("--pdf-only");
const root = path.resolve(import.meta.dirname, "../..");
const imgDir = path.join(root, "docs/guide/img", locale);
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

async function waitForServer(url: string) {
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server didn't start at ${url}`);
}

async function main() {
  if (!skipShots) {
    console.log("· seeding", DATABASE_URL.replace(/:[^:@/]+@/, ":***@"));
    await seedGuide(DATABASE_URL);
    const server = spawn("pnpm", ["start", "-p", String(PORT)], {
      cwd: root,
      stdio: ["ignore", "ignore", "inherit"],
      env: {
        ...process.env,
        DATABASE_URL,
        SESSION_SECRET: "guide-secret-guide-secret-guide-secret-guide",
        APP_TIMEZONE: "Europe/Madrid",
        REQUIRE_PACKER_PIN: "false",
        DEFAULT_LOCALE: locale,
      },
      detached: true,
    });
    try {
      const baseURL = `http://localhost:${PORT}`;
      await waitForServer(`${baseURL}/${locale}/login`);
      console.log("· taking screenshots");
      await takeScreenshots({ baseURL, outDir: imgDir, locale, executablePath });
    } finally {
      process.kill(-server.pid!, "SIGTERM");
    }
  }
  console.log("· rendering PDF");
  const out = await renderPdf({ locale, imgDir, outDir: path.join(root, "docs"), executablePath });
  console.log(`✓ ${path.relative(root, out)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
