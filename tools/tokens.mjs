/* The site's colour tokens, resolved at build time.
 *
 * mccain-design-system/tokens/colors.css is the only file that writes a colour
 * down. The artboards reference it as
 *
 *   var(--mc-navy)                                         a token
 *   color-mix(in srgb, var(--mc-navy) 6%, transparent)     a translucent step of it
 *
 * and resolveColors() turns both back into the fixed values the site has
 * always shipped (#0A2540, rgba(10,37,64,.06)). Nothing of this reaches the
 * visitor: no custom property to look up, no color-mix to compute, the same
 * bytes as before - owner 19.9.2026: "ohne die performance zu beeinflussen".
 *
 * The resolution is textual on purpose. The artboards use their colours in CSS,
 * in inline styles, in JS strings handed to a canvas or to WebGL, even glued to
 * an alpha suffix (c + 'B3'); one textual pass before anything runs covers all
 * of them, where CSS custom properties would reach only the first two.
 *
 * Only names defined in colors.css are resolved. Anything else - --mc-ease,
 * the brand guide's code sample that SHOWS var(--mc-navy) to a developer
 * (written var(--mc-navy) there so it survives) - passes untouched.
 *
 *   node tools/tokens.mjs --check            every token resolves, no cycles
 *   node tools/tokens.mjs --resolve <file>   the file with its tokens resolved (stdout)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const TOKEN_FILE = path.join(HERE, "..", "mccain-design-system", "tokens", "colors.css");

const VAR = /var\(\s*--(mc-[a-z0-9-]+)\s*\)/g;
const MIX = /color-mix\(\s*in srgb\s*,\s*(var\(\s*--mc-[a-z0-9-]+\s*\)|#[0-9A-Fa-f]{6})\s+(\d+(?:\.\d+)?)%\s*,\s*transparent\s*\)/g;
const HEX6 = /^#[0-9A-F]{6}$/;

/* .06, .055, 1, 0 - the notation the export always used, so an rgba that
 * went through a token comes back byte for byte. */
export function alphaText(pct) {
  const a = Number((pct / 100).toFixed(4));
  if (a <= 0) return "0";
  if (a >= 1) return "1";
  return String(a).replace(/^0\./, ".");
}

function hexToRgb(hex) {
  const h = hex.slice(1);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

let cache = null;

/* name -> fully resolved value. Reads colors.css once per process; mtime
 * checked so a long-running process (the dev server's helper) sees edits. */
export function loadTokens(file = TOKEN_FILE) {
  const mtime = fs.statSync(file).mtimeMs;
  if (cache && cache.file === file && cache.mtime === mtime) return cache.values;
  const css = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const raw = new Map();
  for (const m of css.matchAll(/--(mc-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    if (raw.has(m[1])) throw new Error(`tokens: --${m[1]} is defined twice in ${path.basename(file)}`);
    raw.set(m[1], m[2].trim());
  }
  const values = new Map();
  const resolving = new Set();
  const resolveName = (name) => {
    if (values.has(name)) return values.get(name);
    if (!raw.has(name)) return null;
    if (resolving.has(name)) throw new Error(`tokens: --${name} refers to itself (${[...resolving].join(" -> ")})`);
    resolving.add(name);
    const v = substitute(raw.get(name), resolveName);
    resolving.delete(name);
    values.set(name, v);
    return v;
  };
  for (const name of raw.keys()) resolveName(name);
  cache = { file, mtime, values };
  return values;
}

function substitute(text, lookup) {
  const mixed = text.replace(MIX, (all, colour, pct) => {
    const hex = colour.startsWith("#") ? colour.toUpperCase() : lookup(colour.replace(/^var\(\s*--|\s*\)$/g, ""));
    if (!hex) return all;
    if (!HEX6.test(hex)) throw new Error(`tokens: color-mix over ${colour} needs a plain colour, the token is "${hex}"`);
    return `rgba(${hexToRgb(hex).join(",")},${alphaText(Number(pct))})`;
  });
  return mixed.replace(VAR, (all, name) => {
    const v = lookup(name);
    return v == null ? all : v;
  });
}

/* The one call the build makes: every token reference in `text` becomes its value. */
export function resolveColors(text, file = TOKEN_FILE) {
  const values = loadTokens(file);
  return substitute(text, (name) => (values.has(name) ? values.get(name) : null));
}

/* A single token's value, for the few colours the build tools write themselves. */
export function token(name, file = TOKEN_FILE) {
  const v = loadTokens(file).get(name.replace(/^--/, ""));
  if (v == null) throw new Error(`tokens: --${name.replace(/^--/, "")} is not defined in ${path.basename(file)}`);
  return v;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [flag, arg] = process.argv.slice(2);
  if (flag === "--resolve" && arg) {
    process.stdout.write(resolveColors(fs.readFileSync(arg, "utf8")));
  } else if (flag === "--check") {
    const values = loadTokens();
    const bad = [...values].filter(([, v]) => /var\(|color-mix\(/.test(v));
    if (bad.length) { for (const [n, v] of bad) console.error(`--${n}: unresolved "${v}"`); process.exit(1); }
    console.log(`tokens: ${values.size} colour tokens, all resolve`);
  } else {
    console.error("usage: node tools/tokens.mjs --check | --resolve <file>");
    process.exit(2);
  }
}
