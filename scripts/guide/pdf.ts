/** Renders the guide (content/<locale>.ts + screenshots) to an A4 PDF with Chromium. */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

export type GuideHelpers = {
  /** A screenshot with a numbered caption. `width` as CSS (default full width). */
  fig: (name: string, caption: string, opts?: { width?: string; float?: boolean }) => string;
  /** Data URL of a screenshot, for custom layouts. */
  src: (name: string) => string;
  /** Today's month and year, in the guide's language. */
  edition: string;
};

export type GuideContent = {
  file: string;
  title: string;
  subtitle: string;
  footer: string;
  /** "{page}" and "{pages}" are replaced by Chromium's counters. */
  pageOf: string;
  body: (h: GuideHelpers) => string;
};

export async function renderPdf(opts: {
  locale: string;
  imgDir: string;
  outDir: string;
  executablePath?: string;
}) {
  const { locale, imgDir, outDir } = opts;
  const content: GuideContent = (await import(`./content/${locale}.ts`)).default;
  const images = new Map<string, string>();
  const load = async (name: string) => {
    if (!images.has(name)) {
      const data = await readFile(path.join(imgDir, `${name}.png`));
      images.set(name, `data:image/png;base64,${data.toString("base64")}`);
    }
    return images.get(name)!;
  };
  // Load every image the content references before building the HTML.
  const used: string[] = [];
  content.body({ fig: (n) => (used.push(n), ""), src: (n) => (used.push(n), ""), edition: "" });
  await Promise.all(used.map(load));

  let n = 0;
  const edition = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date());
  const body = content.body({
    edition,
    src: (name) => images.get(name)!,
    fig: (name, caption, o = {}) => {
      n++;
      const style = o.width ? ` style="width:${o.width}"` : "";
      return `<figure class="${o.float ? "float" : ""}"${style}><img src="${images.get(name)}" alt=""><figcaption><b>${n}.</b> ${caption}</figcaption></figure>`;
    },
  });

  const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>${content.title}</title>
<style>${CSS}</style></head><body>${body}</body></html>`;

  const browser = await chromium.launch(opts.executablePath ? { executablePath: opts.executablePath } : {});
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const out = path.join(outDir, content.file);
    const pageOf = content.pageOf
      .replace("{page}", '<span class="pageNumber"></span>')
      .replace("{pages}", '<span class="totalPages"></span>');
    await page.pdf({
      path: out,
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: `<div style="font: 8px Inter, Helvetica, Arial, sans-serif; color:#888; width:100%; padding:0 18mm; display:flex; justify-content:space-between">
        <span>${content.footer}</span><span>${pageOf}</span></div>`,
      margin: { top: "16mm", bottom: "16mm", left: "18mm", right: "18mm" },
      tagged: true,
      outline: true,
    });
    return out;
  } finally {
    await browser.close();
  }
}

const CSS = `
@page { size: A4; }
@page :first { margin: 0; }
* { box-sizing: border-box; }
html { font-family: Inter, -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 10.5pt; color: #1c1c1e; line-height: 1.5; }
body { margin: 0; }
h1, h2, h3 { line-height: 1.2; break-after: avoid; }
h1 { font-size: 22pt; margin: 0 0 4mm; letter-spacing: -0.02em; }
h1.chapter { break-before: page; padding-bottom: 3mm; border-bottom: 2px solid #1d4ed8; margin-bottom: 6mm; }
h1.chapter small { display: block; font-size: 9pt; color: #1d4ed8; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 1mm; font-weight: 600; }
h2 { font-size: 14pt; margin: 8mm 0 2mm; color: #111; }
h3 { font-size: 11pt; margin: 5mm 0 1mm; }
p { margin: 0 0 2.5mm; }
ul, ol { margin: 0 0 3mm; padding-left: 6mm; }
li { margin-bottom: 1mm; }
code, kbd { font-family: "JetBrains Mono", Menlo, monospace; font-size: 9pt; background: #f1f3f5; border-radius: 3px; padding: 0.2mm 1.2mm; }
.ui { font-weight: 600; }
figure { margin: 4mm 0 6mm; break-inside: avoid; }
figure img { display: block; width: 100%; border: 1px solid #dee2e6; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
figure.float { float: right; margin: 0 0 4mm 6mm; }
figcaption { font-size: 8.5pt; color: #666; margin-top: 1.5mm; }
.clear { clear: both; }
.tip, .warn { break-inside: avoid; border-radius: 6px; padding: 3mm 4mm; margin: 3mm 0 5mm; font-size: 9.5pt; }
.tip { background: #eef4ff; border-left: 3px solid #1d4ed8; }
.warn { background: #fff4e6; border-left: 3px solid #e8590c; }
.tip b:first-child, .warn b:first-child { display: block; margin-bottom: 0.5mm; }
table.qa { break-inside: avoid; width: 100%; border-collapse: collapse; margin: 2mm 0 5mm; font-size: 9.5pt; }
table.qa td { border-top: 1px solid #e9ecef; padding: 2mm 2mm 2mm 0; vertical-align: top; }
table.qa td:first-child { width: 38%; font-weight: 600; }
.cover { height: 297mm; padding: 34mm 22mm 20mm; display: flex; flex-direction: column; background: linear-gradient(160deg, #1d4ed8 0%, #1e3a8a 100%); color: white; break-after: page; }
.cover .kicker { font-size: 10pt; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.8; font-weight: 600; }
.cover h1 { font-size: 40pt; margin: 3mm 0 2mm; letter-spacing: -0.03em; }
.cover .sub { font-size: 14pt; opacity: 0.9; }
.cover img { margin-top: auto; width: 100%; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.35); }
.cover .edition { margin-top: 8mm; font-size: 9pt; opacity: 0.8; }
.toc { list-style: none; padding: 0; margin: 4mm 0; }
.toc > li { font-weight: 600; margin: 3mm 0 1mm; font-size: 11pt; }
.toc ul { list-style: none; padding-left: 5mm; font-weight: 400; font-size: 10pt; margin: 1mm 0; }
.toc a { color: inherit; text-decoration: none; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
`;
