/* Runs HTML_TO_MARKDOWN against the already-built, already-served v5 page
 * and checks the result the way a crawler would read it: structurally (does
 * it even parse as clean markdown) and, printed to the terminal, by eye
 * (does it read like the page).
 *
 *   node tools/markdown-check.mjs
 *   node tools/markdown-check.mjs --url http://127.0.0.1:8897/v5/ --out v5/index.md
 *   node tools/markdown-check.mjs --all [--base http://127.0.0.1:8897]
 *
 * --all is a different, lighter check: it fetches the already-built twin
 * (/v5<route>index.md, plain HTTP - no browser, no HTML_TO_MARKDOWN) for
 * every route in tools/pages.mjs's PAGES and reports words/headings/links per
 * route. A twin that 404s is listed as "not built yet", not a failure - not
 * every route need be built in every run. One that answers with anything
 * else must come back as text/markdown with >= 120 words and >= 1 heading, or
 * it fails. The default (no flags) behaviour - render one live page's HTML
 * through HTML_TO_MARKDOWN via a real browser and check it in depth, down to
 * the start page's own section phrases and FAQ count - is unchanged.
 *
 * The dev server (python prodserve.py 8897 --dev, per the owner) is assumed
 * to be running already - this script only reads from it, the way
 * tools/browser.mjs's requireServer() would, but requireServer() checks a
 * different hardcoded port (BASE, 8898) than the one the v5 build actually
 * serves from here, so it is not used; the check below is scoped to
 * whatever --url (or, for --all, --base) points at.
 */
import { launch, open } from "./browser.mjs";
import { HTML_TO_MARKDOWN } from "./markdown.mjs";
import { PAGES } from "./pages.mjs";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const ALL = args.includes("--all");
const BASE_ARG = flag("base", "http://127.0.0.1:8897").replace(/\/$/, "");
const URL_ARG = flag("url", "http://127.0.0.1:8897/v5/");
const OUT_ARG = flag("out", null);

async function reachable(url) {
  try {
    const r = await fetch(url);
    return r.ok;
  } catch (e) {
    return false;
  }
}

/* --all: one HTTP round trip per route against the twin the build already
 * wrote, no browser involved - the in-depth single-page path below is what
 * exercises HTML_TO_MARKDOWN itself. */
if (ALL) {
  console.log(`markdown-check --all: ${PAGES.length} route(s) at ${BASE_ARG}\n`);
  let builtCount = 0;
  let anyFail = false;
  for (const { route } of PAGES) {
    const mdUrl = `${BASE_ARG}/v5${route}index.md`;
    let status = -1;
    let type = "";
    let text = "";
    try {
      const res = await fetch(mdUrl);
      status = res.status;
      type = res.headers.get("content-type") || "";
      if (status === 200) text = await res.text();
    } catch (e) {
      status = -1;
      type = e.message;
    }
    if (status === 404) {
      console.log(`  not built yet   404  ${route}`);
      continue;
    }
    builtCount++;
    const words = (text.match(/\S+/g) || []).length;
    const headings = (text.match(/^#{1,6} .+$/gm) || []).length;
    const links = (text.match(/!?\[[^\]]*\]\([^)]+\)/g) || []).length;
    const isMarkdown = type.startsWith("text/markdown");
    const routeFails = [];
    if (status !== 200) routeFails.push(`HTTP ${status}`);
    if (!isMarkdown) routeFails.push(`content-type "${type || "none"}" (want text/markdown)`);
    if (words < 120) routeFails.push(`${words} words (need >= 120)`);
    if (headings < 1) routeFails.push(`${headings} headings (need >= 1)`);
    const good = routeFails.length === 0;
    if (!good) anyFail = true;
    console.log(
      `  ${good ? "ok  " : "FAIL"} ${route.padEnd(45)} words=${words} headings=${headings} links=${links}` +
        (good ? "" : `  -> ${routeFails.join("; ")}`)
    );
  }
  console.log(`\n${builtCount} of ${PAGES.length} route(s) built, ${PAGES.length - builtCount} not built yet`);
  console.log(anyFail ? "\nFAILED" : "\nall checks passed.");
  process.exit(anyFail ? 1 : 0);
}

if (!(await reachable(URL_ARG))) {
  console.error(
    `markdown-check: ${URL_ARG} is not answering.\n` +
      `  this script does not start the server itself - start it first, e.g.:\n` +
      `  python prodserve.py 8897 --dev`
  );
  process.exit(2);
}

const { browser, context } = await launch(1280, 900);
const page = await open(context, URL_ARG);

const meta = await page.evaluate(() => {
  const q = (sel) => document.querySelector(sel);
  const description = q('meta[name="description"]');
  const canonical = q('link[rel="canonical"]');
  return {
    title: document.title || "",
    description: description ? description.getAttribute("content") || "" : "",
    canonical: canonical ? canonical.getAttribute("href") || "" : "",
    lang: document.documentElement.getAttribute("lang") || "",
  };
});

/* page.evaluate(string) evaluates an EXPRESSION, not a function call - it
 * will not treat a second argument as something to pass in. The call has to
 * be spelled out as one expression string: an IIFE over the function source
 * plus its own JSON-literal arguments. */
const expr = `(${HTML_TO_MARKDOWN})(document.body, ${JSON.stringify(meta)})`;
const result = await page.evaluate(expr);
await browser.close();

const md = result.markdown;
const lines = md.split("\n");
const fails = [];
const notes = [];

// exactly one document title
const h1Lines = lines.filter((l) => /^# /.test(l));
if (h1Lines.length !== 1) fails.push(`expected exactly one "# " heading, found ${h1Lines.length}`);

// h2 count is reported, not gated - the section count is content, not a contract
const h2Count = lines.filter((l) => /^## /.test(l)).length;
notes.push(`## headings: ${h2Count}`);

// no empty heading of any level
const emptyHeadings = lines.filter((l) => /^#{1,6}\s*$/.test(l));
if (emptyHeadings.length) fails.push(`${emptyHeadings.length} empty heading line(s)`);

// no literal HTML tags leaked through
const tagMatch = md.match(/<\/?[a-zA-Z][a-zA-Z0-9]*(?:\s[^<>]*)?>/);
if (tagMatch) fails.push(`literal HTML tag leaked into markdown: ${tagMatch[0].slice(0, 80)}`);

// no whitespace-only lines (an empty line is fine, a line of only spaces/tabs is not)
const wsOnly = lines.filter((l) => l.length > 0 && l.trim() === "");
if (wsOnly.length) fails.push(`${wsOnly.length} whitespace-only line(s)`);

// enough words to be worth serving as a twin
const wordCount = (md.match(/\S+/g) || []).length;
if (wordCount <= 500) fails.push(`only ${wordCount} words (need > 500)`);

// every link/image URL is absolute (http/https/mailto/tel)
const urlRe = /!?\[[^\]]*\]\(([^)]+)\)/g;
const badUrls = [];
let um;
while ((um = urlRe.exec(md))) {
  const u = um[1];
  if (!/^(https?:|mailto:|tel:)/i.test(u)) badUrls.push(u);
}
if (badUrls.length) fails.push(`${badUrls.length} non-absolute link URL(s): ${badUrls.slice(0, 5).join(", ")}`);

// never more than one blank line in a row
if (md.includes("\n\n\n")) fails.push("three or more consecutive blank lines found");

// exactly one trailing newline
if (!md.endsWith("\n") || md.endsWith("\n\n")) fails.push("markdown does not end in exactly one newline");

/* Content sanity: the 14 sections v5build renders (Hero, Leistungen, Ein
 * Fall, KI-Konsole, Arbeiten, Stimmen, Studio, Preise, Ablauf,
 * Konfigurator-Hinweis, FAQ, Uebergabe, News, Kontakt) each have to leave a
 * recognisable trace. Hero has no h2 of its own (the h1 IS the hero), so it
 * is covered by the "exactly one #" check above instead of a phrase here. */
const expectedPhrases = [
  "Vier Leistungen",
  "Projektgedächtnis, das am Commit hängt",
  "Fragen Sie diese Seite",
  "Ausgewählte Projekte",
  "Was Kunden sagen",
  "Zwei Gründer",
  "Ein Festpreis in 48 Stunden",
  "Vom ersten Kontakt zum Festpreis",
  "Starten Sie hier mit der Konfiguration",
  "Klare Antworten",
  "Jedes Projekt geht als Git-Projekt raus",
  "Zuletzt aus dem Studio",
  "Erzählen Sie uns von Ihrem Vorhaben",
];
const missingPhrases = expectedPhrases.filter((p) => !md.includes(p));
if (missingPhrases.length) fails.push(`missing section content: ${missingPhrases.join(" | ")}`);

// FAQ pattern: exactly 8 accordion questions, each its own bold-only line
const faqLines = lines.filter((l) => /^\*\*.+\*\*$/.test(l));
if (faqLines.length !== 8) fails.push(`expected 8 FAQ question lines, found ${faqLines.length}`);

// the inert stream-notes ticker and the tech-logo tooltips must not leak
// (both are excluded structurally - a <template> wrapper and role="tooltip" -
// this is the regression check for that exclusion holding)
const forbidden = ["tool_call", "LLM →", "modelcontextprotocol", "TLS 1.3"];
const leaked = forbidden.filter((s) => md.includes(s));
if (leaked.length) fails.push(`ticker/tooltip noise leaked: ${leaked.join(", ")}`);

// no run of the marquee-duplicated testimonial content survives twice in a row
if ((md.match(/Reserviert für ein echtes/g) || []).length > 1) {
  fails.push("testimonial marquee duplicate was not collapsed");
}

console.log("--- first 60 lines -------------------------------------------");
console.log(lines.slice(0, 60).join("\n"));
console.log("----------------------------------------------------------------");
console.log(`words: ${result.words} (independent recount: ${wordCount})`);
console.log(`headings: ${result.headings} (${notes.join(", ")})`);
console.log(`links: ${result.links}`);
console.log(`skipped: nav=${result.skipped.nav} hidden=${result.skipped.hidden}`);

if (OUT_ARG) {
  const outPath = path.resolve(OUT_ARG);
  fs.writeFileSync(outPath, md, "utf8");
  console.log(`wrote ${md.length} bytes to ${outPath}`);
}

if (fails.length) {
  console.error("\nFAILED:");
  for (const f of fails) console.error(`  - ${f}`);
  process.exitCode = 1;
} else {
  console.log("\nall checks passed.");
}
