/* Does the real domain actually serve the deployment?
 *
 *   node tools/domain_check.mjs
 *
 * WHY IT EXISTS
 * Everything in this repository was measured for two days against
 * mccain-digital.vercel.app and reported as "live". The canonical domain -
 * mccain-digital.com, the one in every canonical tag, in the sitemap, in the
 * JSON-LD and in the owner's browser - was serving a completely different site
 * the whole time: the English v2 from June, on SiteGround's nginx, indexable.
 * The owner found it the way owners find things: the new pages were 404.
 *
 * A deployment URL answering 200 says nothing about the address people type.
 * This asks the question directly, and it is cheap enough to run every time.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CONFIG = JSON.parse(fs.readFileSync(path.join(SITE, "site.config.json"), "utf8"));

const CANONICAL = (CONFIG.origin || "https://mccain-digital.com").replace(/\/$/, "");
const DEPLOY = (process.argv[2] || "https://mccain-digital.vercel.app").replace(/\/$/, "");

/* Cheap, stable fingerprints. Not the whole body - that changes on every build -
 * but things that differ between two different SITES. */
async function fingerprint(base) {
  const out = { base };
  try {
    const res = await fetch(base + "/", { redirect: "follow" });
    out.status = res.status;
    out.server = res.headers.get("server") || "-";
    out.robotsHeader = res.headers.get("x-robots-tag") || "-";
    const html = await res.text();
    out.bytes = html.length;
    out.title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, "-"])[1].trim().slice(0, 70);
    out.lang = (html.match(/<html[^>]*lang="([^"]+)"/i) || [, "-"])[1];
    out.robotsMeta = (html.match(/name="robots"\s+content="([^"]*)"/i) || [, "-"])[1];
    /* The relaunch is recognisable by its own structure, not by its copy. */
    out.isRelaunch = html.includes('id="dc-prerender"') && html.includes('id="dc-template"');
  } catch (e) {
    out.error = String(e.message || e).slice(0, 90);
  }
  return out;
}

/* Pages that exist in this build. If the canonical domain serves a different
 * site, these are exactly what a visitor gets a 404 for. */
const PAGES = [
  "/kontakt.html",
  "/services/ai-tools.html",
  "/services/web-apps.html",
  "/services/websites.html",
  "/services/software.html",
  "/brand-guide.html",
  "/legal/imprint.html",
];

async function status(url) {
  try {
    const res = await fetch(url, { redirect: "manual" });
    return res.status;
  } catch {
    return 0;
  }
}

const [a, b] = await Promise.all([fingerprint(CANONICAL), fingerprint(DEPLOY)]);

const row = (label, x, y) =>
  console.log(`  ${label.padEnd(16)} ${String(x).slice(0, 40).padEnd(42)} ${String(y).slice(0, 40)}`);

console.log(`\ndomain_check\n`);
console.log(`  ${"".padEnd(16)} ${CANONICAL.padEnd(42)} ${DEPLOY}`);
console.log("  " + "-".repeat(100));
row("status", a.status ?? a.error, b.status ?? b.error);
row("server", a.server, b.server);
row("title", a.title, b.title);
row("lang", a.lang, b.lang);
row("robots meta", a.robotsMeta, b.robotsMeta);
row("X-Robots-Tag", a.robotsHeader, b.robotsHeader);
row("bytes", a.bytes, b.bytes);
row("is the relaunch", a.isRelaunch, b.isRelaunch);

console.log("\n  pages of this build, on each host");
let missing = 0;
for (const p of PAGES) {
  const [sa, sb] = await Promise.all([status(CANONICAL + p), status(DEPLOY + p)]);
  const bad = sa >= 400 && sb < 400;
  if (bad) missing++;
  console.log(`    ${bad ? "GONE" : "ok  "} ${p.padEnd(30)} ${sa}   ${sb}`);
}

console.log();
if (a.isRelaunch && b.isRelaunch) {
  console.log("  the canonical domain serves this build.");
  process.exit(0);
}
console.log(`  THE CANONICAL DOMAIN DOES NOT SERVE THIS BUILD.`);
console.log(`  ${missing} page(s) of this build are 404 on ${CANONICAL} and 200 on the deployment.`);
console.log(`  Every canonical tag, the sitemap and the JSON-LD point at ${CANONICAL}.`);
console.log(`\n  Before switching the domain over, read the note in site.config.json:`);
console.log(`  this build is noindex, and pointing an INDEXED domain at a noindex`);
console.log(`  site asks Google to remove it.`);
process.exit(1);
