/* What is actually inside the shipped HTML, and what does it cost on the wire.
 *
 *   node tools/weigh.mjs
 *
 * Raw bytes alone mislead: the prerendered markup repeats the same inline style
 * strings hundreds of times and compresses far better than the component code
 * does. Decisions about what to cut belong on the compressed column.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const SITE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const kb = (n) => (n / 1024).toFixed(1).padStart(7) + " KB";
const br = (s) => zlib.brotliCompressSync(Buffer.from(s, "utf8")).length;

function slice(html, re) {
  const m = re.exec(html);
  return m ? m[0] : "";
}

for (const file of ["index.html", "brand-guide.html"]) {
  const p = path.join(SITE, file);
  if (!fs.existsSync(p)) continue;
  const html = fs.readFileSync(p, "utf8");

  const pre = slice(html, /<div id="dc-prerender">[\s\S]*?\n<x-dc/);
  /* The template moved into an inert <template> on 11.9.2026. Matching the old
   * <x-dc>...</x-dc> shape after that reported 406 KB for an empty element and
   * 0 KB for a page that carries 42 KB of template - a measuring tool quietly
   * measuring the wrong thing is worse than one that fails. */
  const tpl = slice(html, /<template id="dc-template">[\s\S]*?<\/template>/);
  if (!tpl) throw new Error(`weigh: no <template id="dc-template"> in ${file} - has the build changed?`);
  const scr = slice(html, /<script[^>]*data-dc-script[^>]*>[\s\S]*?<\/script>/);
  const sty = (html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []).join("");
  const comments = html.match(/<!--[\s\S]*?-->/g) || [];
  const commentBytes = comments.reduce((n, c) => n + c.length, 0);

  /* Comments inside the two embedded languages - they are shipped to every
   * visitor and no browser reads them. */
  const cssComments = (sty.match(/\/\*[\s\S]*?\*\//g) || []).reduce((n, c) => n + c.length, 0);
  const jsLine = (scr.match(/^[ \t]*\/\/[^\n]*$/gm) || []).reduce((n, c) => n + c.length, 0);
  const jsBlock = (scr.match(/\/\*[\s\S]*?\*\//g) || []).reduce((n, c) => n + c.length, 0);

  console.log(`\n${file}   ${kb(html.length)} raw   ${kb(br(html))} brotli`);
  const rows = [
    ["prerendered markup", pre],
    ["inert template", tpl],
    ["component script", scr],
    ["<style> blocks", sty],
  ];
  for (const [name, s] of rows) {
    if (!s) continue;
    console.log(
      `  ${name.padEnd(22)} ${kb(s.length)} raw  ${kb(br(s))} brotli` +
        `  ${((s.length / html.length) * 100).toFixed(0).padStart(3)}% of raw`
    );
  }
  console.log(`  ${"-".repeat(60)}`);
  console.log(`  HTML comments          ${kb(commentBytes)} in ${comments.length} blocks`);
  console.log(`  CSS comments           ${kb(cssComments)}`);
  console.log(`  JS comments            ${kb(jsLine + jsBlock)}  (${kb(jsLine)} line, ${kb(jsBlock)} block)`);
}

/* The same question for the standalone assets a visitor downloads. */
console.log("\nstandalone assets");
for (const f of ["v5/runtime.js", "logic.gen.js", "pixel-engine.js", "content.json", "fonts/fonts.css"]) {
  const p = path.join(SITE, f);
  if (!fs.existsSync(p)) continue;
  const s = fs.readFileSync(p, "utf8");
  const line = (s.match(/^[ \t]*\/\/[^\n]*$/gm) || []).reduce((n, c) => n + c.length, 0);
  const block = (s.match(/\/\*[\s\S]*?\*\//g) || []).reduce((n, c) => n + c.length, 0);
  console.log(
    `  ${f.padEnd(22)} ${kb(s.length)} raw  ${kb(br(s))} brotli   comments ${kb(line + block)}`
  );
}
