/* A small tokenizer for the code views: HTML, CSS, JavaScript, GLSL, JSON,
 * Markdown. It colours, it does not parse; a wrong colour on an exotic line
 * is fine, a wrong line count is not. So tokens are produced over the whole
 * text and then cut at newlines, which keeps block comments and multi-line
 * strings intact across lines. */
import { h } from "./ui.js";

const JS_KW = new Set("break case catch class const continue debugger default delete do else export extends finally for function if import in instanceof let new return static super switch this throw try typeof var void while with yield await async of get set null undefined true false".split(" "));
const GLSL_KW = new Set("attribute uniform varying precision mediump highp lowp float int vec2 vec3 vec4 mat2 mat3 mat4 void return if else for while break continue discard in out inout const bool sampler2D gl_Position gl_FragColor gl_FragCoord true false".split(" "));

function pushTok(out, type, text) {
  if (!text) return;
  const last = out[out.length - 1];
  if (last && last.type === type && type === "") last.text += text;
  else out.push({ type, text });
}

function tokenizeJs(src, kw) {
  const out = [];
  const re = /(\/\/[^\n]*)|(\/\*[\s\S]*?\*\/)|(`(?:\\[\s\S]|[^`\\])*`)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b|\B\.\d+\b)|([A-Za-z_$][\w$]*)(?=\s*\()|([A-Za-z_$][\w$]*)|([{}()[\];,.:=<>+\-*\/%!&|?^~])/g;
  let i = 0, m;
  while ((m = re.exec(src))) {
    pushTok(out, "", src.slice(i, m.index));
    i = re.lastIndex;
    if (m[1] || m[2]) pushTok(out, "t-com", m[0]);
    else if (m[3] || m[4]) pushTok(out, "t-str", m[0]);
    else if (m[5]) pushTok(out, "t-num", m[0]);
    else if (m[6]) pushTok(out, kw.has(m[6]) ? "t-kw" : "t-fn", m[0]);
    else if (m[7]) pushTok(out, kw.has(m[7]) ? "t-kw" : "", m[0]);
    else pushTok(out, "t-pun", m[0]);
  }
  pushTok(out, "", src.slice(i));
  return out;
}

function tokenizeCss(src) {
  const out = [];
  const re = /(\/\*[\s\S]*?\*\/)|(@[\w-]+[^{;]*)|([^{}]+?)(?=\s*\{)|(\{|\})|([\w-]+)\s*:\s*([^;{}]+)(;?)/g;
  let i = 0, m;
  while ((m = re.exec(src))) {
    pushTok(out, "", src.slice(i, m.index));
    i = re.lastIndex;
    if (m[1]) pushTok(out, "t-com", m[0]);
    else if (m[2]) pushTok(out, "t-kw", m[0]);
    else if (m[3]) pushTok(out, "t-sel", m[0]);
    else if (m[4]) pushTok(out, "t-pun", m[0]);
    else { pushTok(out, "t-prop", m[5]); pushTok(out, "t-pun", ": "); pushTok(out, "t-val", m[6]); pushTok(out, "t-pun", m[7]); }
  }
  pushTok(out, "", src.slice(i));
  return out;
}

function tokenizeHtml(src) {
  const out = [];
  const re = /(<!--[\s\S]*?-->)|(<!DOCTYPE[^>]*>)|(<\/?)([a-zA-Z][\w:-]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?>)/g;
  let i = 0, m;
  while ((m = re.exec(src))) {
    pushTok(out, "", src.slice(i, m.index));
    i = re.lastIndex;
    if (m[1]) { pushTok(out, "t-com", m[0]); continue; }
    if (m[2]) { pushTok(out, "t-kw", m[0]); continue; }
    pushTok(out, "t-pun", m[3]);
    pushTok(out, "t-tag", m[4]);
    const attrs = m[5];
    const ar = /(\s+)([^\s=>\/]+)(?:(\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+))?/g;
    let a;
    while ((a = ar.exec(attrs))) {
      pushTok(out, "", a[1]);
      pushTok(out, "t-attr", a[2]);
      if (a[3]) { pushTok(out, "t-pun", a[3]); pushTok(out, "t-val", a[4]); }
    }
    pushTok(out, "t-pun", m[6]);
  }
  pushTok(out, "", src.slice(i));
  return out;
}

function tokenizeJson(src) {
  const out = [];
  const re = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)|\b(true|false|null)\b|([{}[\],])/g;
  let i = 0, m;
  while ((m = re.exec(src))) {
    pushTok(out, "", src.slice(i, m.index));
    i = re.lastIndex;
    if (m[1]) { pushTok(out, m[2] ? "t-attr" : "t-str", m[1]); if (m[2]) pushTok(out, "t-pun", m[2]); }
    else if (m[3]) pushTok(out, "t-num", m[0]);
    else if (m[4]) pushTok(out, "t-kw", m[0]);
    else pushTok(out, "t-pun", m[0]);
  }
  pushTok(out, "", src.slice(i));
  return out;
}

function tokenizeMd(src) {
  const out = [];
  const re = /(^#{1,6} .*$)|(^> .*$)|(\[[^\]]*\]\([^)]*\))|(`[^`\n]+`)|(\*\*[^*\n]+\*\*)/gm;
  let i = 0, m;
  while ((m = re.exec(src))) {
    pushTok(out, "", src.slice(i, m.index));
    i = re.lastIndex;
    if (m[1]) pushTok(out, "t-kw", m[0]);
    else if (m[2]) pushTok(out, "t-com", m[0]);
    else if (m[3]) pushTok(out, "t-fn", m[0]);
    else if (m[4]) pushTok(out, "t-str", m[0]);
    else pushTok(out, "t-tag", m[0]);
  }
  pushTok(out, "", src.slice(i));
  return out;
}

export function tokenize(src, lang) {
  switch (lang) {
    case "js": return tokenizeJs(src, JS_KW);
    case "glsl": return tokenizeJs(src, GLSL_KW);
    case "css": return tokenizeCss(src);
    case "html": return tokenizeHtml(src);
    case "json": return tokenizeJson(src);
    case "md": return tokenizeMd(src);
    default: return [{ type: "", text: src }];
  }
}

/* Lines of spans, from tokens cut at every newline. */
export function toLines(tokens) {
  const lines = [[]];
  for (const t of tokens) {
    const parts = t.text.split("\n");
    parts.forEach((p, i) => {
      if (i > 0) lines.push([]);
      if (p) lines[lines.length - 1].push({ type: t.type, text: p });
    });
  }
  return lines;
}

/* Render up to `max` lines into an <ol>; returns the <li> elements by line number (1-based). */
export function renderCode(text, lang, opts) {
  const o = Object.assign({ from: 1, max: 20000, mark: null }, opts || {});
  const lines = toLines(tokenize(text, lang));
  const pre = h("pre.wk-code", { "data-lang": lang });
  if (o.small) pre.classList.add(o.small === "inline" ? "wk-code-inline" : "wk-code-small");
  const ol = h("ol");
  const upto = Math.min(lines.length, o.from - 1 + o.max);
  for (let n = o.from - 1; n < upto; n++) {
    const li = h("li", { "data-n": String(n + 1) });
    for (const t of lines[n]) li.appendChild(t.type ? h("span." + t.type, t.text) : document.createTextNode(t.text));
    if (!lines[n].length) li.appendChild(document.createTextNode(" "));
    ol.appendChild(li);
  }
  pre.appendChild(ol);
  return { el: pre, ol, count: lines.length, lineEl: (n) => ol.children[n - o.from] || null };
}
