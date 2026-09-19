/* A colour is written in ONE place: mccain-design-system/tokens/colors.css.
 *
 * Owner 19.9.2026, after the brand moved from indigo to navy and every page
 * had to be touched by hand: "wir können keine aufwendigen webseiten bauen,
 * wenn wir jede seite anfassen müssen, nur um eine farbe zu ändern". The pages
 * then carried 18,844 colour literals, 300 different ones, and the token file
 * existed next to them without a single page reading it. A rule without a
 * guard is a wish - this is the guard.
 *
 * SOURCES  every published artboard, the two hand-written pages and the build
 *          tools that write colours themselves: no hex, no rgb()/rgba(), no
 *          hsl()/hsla() - only var(--mc-…) and
 *          color-mix(in srgb, var(--mc-…) N%, transparent).
 * OUTPUT   what ships: no var(--mc-…) left, bare or in a color-mix - proof that the
 *          build resolved every token (tools/tokens.mjs) and the visitor gets
 *          the same fixed values as before.
 *
 *   node tools/color_guard.mjs            both checks, exit 1 on a finding
 *   node tools/color_guard.mjs --sources  only the sources (before a build)
 *
 * tools/v5build.mjs runs both; tools/verify_site.mjs runs both before a push.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PAGES } from "./pages.mjs";
import { loadTokens, TOKEN_FILE } from "./tokens.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.join(HERE, "..");
const EXPORT_DIR = path.join(SITE, "mccain-design-system");

/* Hex with 3, 6 or 8 digits - not 4: "#4133" is the suite number in Vercel's
 * address (Rechtliches), not a colour. The look-behind keeps HTML entities
 * (&#…) out. rgb()/hsl() in both syntaxes: commas or spaces, a slash before
 * the alpha, channels as numbers or percentages. */
const LITERAL = /(?<![\w&#])#(?:[0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})(?![\w-])|(?:rgba?|hsla?)\(\s*[\d.]+(?:deg|%)?(?:\s*,\s*|\s+)[\d.]+%?(?:\s*,\s*|\s+)[\d.]+%?(?:\s*[,/]\s*[\d.]+%?)?\s*\)/g;

/* colors.css also carries short semantic aliases without the mc- prefix
 * (--accent, --text-body …) for the design-system cards under guidelines/.
 * The build resolves only --mc-…: a page-local custom property may share a
 * short name, and resolving it would override the page. So a page that reads
 * one of them without defining it itself would ship it unresolved - the
 * sources check stops that. */
const SHORT_ALIASES = new Set(
  [...fs.readFileSync(TOKEN_FILE, "utf8").matchAll(/--([a-z][a-z0-9-]*)\s*:/g)].map((m) => m[1]).filter((n) => !n.startsWith("mc-")),
);

/* Each exception names the file, the exact text and why. */
const ALLOWED_OUTPUT = [
  /* The brand guide SHOWS developers how to use the tokens. The source writes
   * it var(\u002d-mc-navy) so the build leaves it alone; the minifier turns the
   * escape back into a hyphen in what ships. */
  { file: "marke/logic.gen.js", text: "color:var(--mc-navy); }", why: "code sample shown on /marke/" },
  { file: "marke/index.html", text: "color:var(--mc-navy); }", why: "the same sample, rendered into the page" },
];
/* Shipped files the guard does not read, with the reason. */
const NOT_OURS = {
  "pixel-engine.js": "vendored Claude Design pixel engine (minified); its colours are fallbacks the pages override",
  "image-slot.js": "vendored Claude Design image slot (minified); its colours are the design tool's editor chrome",
};

function sourceFiles() {
  const files = PAGES.map((p) => path.join(EXPORT_DIR, p.src));
  const statics = path.join(EXPORT_DIR, "static");
  if (fs.existsSync(statics)) for (const f of fs.readdirSync(statics)) if (f.endsWith(".html")) files.push(path.join(statics, f));
  for (const f of ["runtime.js", "prerender.mjs", "v5build.mjs"]) files.push(path.join(HERE, f));
  return files;
}

/* Build tools explain colours in their comments; only their code counts. */
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/[^\n]*/g, "$1");

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

export function checkSources() {
  const findings = [];
  for (const file of sourceFiles()) {
    let text = fs.readFileSync(file, "utf8");
    if (/\.(m?js)$/.test(file)) text = stripComments(text);
    for (const m of text.matchAll(LITERAL)) {
      findings.push(`${path.relative(SITE, file)}:${lineOf(text, m.index)}  ${m[0]}  →  a token from tokens/colors.css`);
    }
    for (const m of text.matchAll(/var\(\s*--(mc-[a-z0-9-]+)\s*\)/g)) {
      if (!loadTokens().has(m[1]) && m[1] !== "mc-ease") findings.push(`${path.relative(SITE, file)}:${lineOf(text, m.index)}  var(--${m[1]}) is not defined in tokens/colors.css`);
    }
    for (const m of text.matchAll(/var\(\s*--([a-z][a-z0-9-]*)\s*[,)]/g)) {
      if (SHORT_ALIASES.has(m[1]) && !new RegExp(`--${m[1]}\\s*:`).test(text)) {
        findings.push(`${path.relative(SITE, file)}:${lineOf(text, m.index)}  var(--${m[1]}) is a guidelines alias the build does not resolve  →  its --mc-… token`);
      }
    }
  }
  return findings;
}

function outputFiles() {
  const files = new Set();
  for (const p of PAGES) {
    const dir = path.dirname(path.join(SITE, p.out));
    for (const f of fs.readdirSync(dir)) if (/^(index\.html|logic\.gen\.js)$/.test(f)) files.add(path.join(dir, f));
  }
  for (const f of ["runtime.js", "404.html", "coming-soon/index.html"]) files.add(path.join(SITE, f));
  return [...files].filter((f) => fs.existsSync(f));
}

export function checkOutputs() {
  const findings = [];
  for (const file of outputFiles()) {
    const rel = path.relative(SITE, file).split(path.sep).join("/");
    let text = fs.readFileSync(file, "utf8");
    for (const a of ALLOWED_OUTPUT) if (a.file === rel) text = text.split(a.text).join("");
    /* A token reference, bare or inside a color-mix. color-mix over
     * currentColor is the page's own CSS (leistungen/: a tint of the text
     * colour) and is left to the browser on purpose. */
    const colours = loadTokens();
    for (const m of text.matchAll(/var\(--(mc-[a-z0-9-]+)\)/g)) {
      if (!colours.has(m[1])) continue; /* --mc-ease and friends: not a colour, a CSS custom property of the page */
      findings.push(`${rel}:${lineOf(text, m.index)}  ${m[0]} was not resolved - the build must run tools/tokens.mjs over this`);
    }
  }
  return findings;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const onlySources = process.argv.includes("--sources");
  const findings = [...checkSources(), ...(onlySources ? [] : checkOutputs())];
  if (findings.length) {
    console.error(`color_guard: ${findings.length} finding(s) - a colour is written in ONE place, mccain-design-system/tokens/colors.css`);
    for (const f of findings.slice(0, 40)) console.error("  " + f);
    if (findings.length > 40) console.error(`  … and ${findings.length - 40} more`);
    process.exit(1);
  }
  console.log(`color_guard: ok - ${sourceFiles().length} sources write tokens only${onlySources ? "" : `, ${outputFiles().length} shipped files carry resolved values`} (not read: ${Object.keys(NOT_OURS).join(", ")})`);
}
