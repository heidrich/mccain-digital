/* Which CSS rules apply to an element, from document.styleSheets.
 *
 * The browser does this for every element on every style pass; here it is
 * done once, for one element, when someone asks. Rules come back in cascade
 * order (the one that wins first), each declaration marked when a stronger
 * rule overrides it. Specificity is computed the way the spec counts
 * (ids, classes/attributes/pseudo-classes, elements), with :where() at zero
 * and the arguments of :is()/:not()/:has() counted as if they stood alone -
 * the same simplification DevTools shows. Shorthands and longhands are
 * treated as different properties, which they are for this purpose. */
import { isOwn } from "./ui.js";

const PSEUDO_ELEMENTS = /::?(before|after|marker|placeholder|selection|first-line|first-letter|backdrop|file-selector-button|highlight\([^)]*\)|part\([^)]*\)|slotted\([^)]*\)|cue|view-transition[\w-]*(\([^)]*\))?)/g;

/* Split "a, b" at top-level commas only - :is(a, b) stays whole. */
export function splitSelectors(text) {
  const out = [];
  let depth = 0, start = 0, quote = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === quote && text[i - 1] !== "\\") quote = null; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (c === "," && depth === 0) { out.push(text.slice(start, i).trim()); start = i + 1; }
  }
  out.push(text.slice(start).trim());
  return out.filter(Boolean);
}

/* Specificity as the spec counts it. :where() adds nothing; :is(), :not(), :has()
 * add the specificity of their most specific argument, not the sum. */
export function specificity(sel) {
  let s = sel.replace(/"[^"]*"|'[^']*'/g, '""');
  const acc = [0, 0, 0];
  const FN = /:(is|not|has|matches|where)\(/;
  for (let m; (m = FN.exec(s)); ) {
    const open = m.index + m[0].length;
    let depth = 1, i = open;
    for (; i < s.length && depth; i++) { if (s[i] === "(") depth++; else if (s[i] === ")") depth--; }
    const inner = s.slice(open, i - 1);
    if (m[1] !== "where") {
      let best = [0, 0, 0];
      for (const part of splitSelectors(inner)) {
        const sp = specificity(part);
        if (sp[0] > best[0] || (sp[0] === best[0] && (sp[1] > best[1] || (sp[1] === best[1] && sp[2] > best[2])))) best = sp;
      }
      for (let k = 0; k < 3; k++) acc[k] += best[k];
    }
    s = s.slice(0, m.index) + " " + s.slice(i);
  }
  acc[0] += (s.match(/#[\w-]+/g) || []).length;
  acc[1] += (s.match(/\.[\w-]+|\[[^\]]*\]|:(?!:)[\w-]+(\([^)]*\))?/g) || []).filter((x) => !/^:(before|after|first-line|first-letter)$/.test(x)).length;
  acc[2] += (s.match(/(^|[\s>+~(])[a-zA-Z][\w-]*|::[\w-]+|:(before|after|first-line|first-letter)\b/g) || []).length;
  return acc;
}

function cmp(x, y) {
  for (let i = 0; i < 3; i++) if (x.spec[i] !== y.spec[i]) return y.spec[i] - x.spec[i];
  return y.order - x.order;
}

function sourceOf(sheet, index) {
  const n = sheet.ownerNode;
  if (n && n.id) return `${n.tagName.toLowerCase()}#${n.id}`;
  if (n && n.hasAttribute && n.hasAttribute("data-dc-tpl")) return `style[data-dc-tpl=${n.getAttribute("data-dc-tpl")}]`;
  if (sheet.href) return sheet.href.split("/").pop();
  return `style (${index + 1})`;
}

function conditionOf(rule) {
  if (typeof CSSMediaRule !== "undefined" && rule instanceof CSSMediaRule) {
    const text = rule.media.mediaText;
    let active = null;
    try { active = matchMedia(text).matches; } catch (e) { active = null; }
    return { kind: "@media", text, active };
  }
  if (typeof CSSSupportsRule !== "undefined" && rule instanceof CSSSupportsRule) {
    let active = null;
    try { active = CSS.supports(rule.conditionText); } catch (e) { active = null; }
    return { kind: "@supports", text: rule.conditionText, active };
  }
  if (typeof CSSLayerBlockRule !== "undefined" && rule instanceof CSSLayerBlockRule) return { kind: "@layer", text: rule.name, active: true };
  if (typeof CSSContainerRule !== "undefined" && rule instanceof CSSContainerRule) return { kind: "@container", text: rule.conditionText, active: null };
  if (typeof CSSScopeRule !== "undefined" && rule instanceof CSSScopeRule) return { kind: "@scope", text: `(${rule.start || ""})`, active: null };
  return null;
}

/* From cssText, not by iterating the declaration: the iteration hands out
 * every longhand a shorthand expanded to (background → eight lines), cssText
 * folds them back into the shorthand the author wrote where that is possible. */
function declarations(style) {
  const out = [];
  const text = style.cssText || "";
  let depth = 0, quote = null, start = 0;
  const push = (chunk) => {
    const s = chunk.trim();
    if (!s) return;
    const c = s.indexOf(":");
    if (c < 0) return;
    let value = s.slice(c + 1).trim();
    const important = /!important$/.test(value);
    if (important) value = value.replace(/\s*!important$/, "");
    out.push({ prop: s.slice(0, c).trim(), value, important });
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) { if (ch === quote && text[i - 1] !== "\\") quote = null; continue; }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === ";" && depth === 0) { push(text.slice(start, i)); start = i + 1; }
  }
  push(text.slice(start));
  return out;
}

export function matchedRules(el) {
  const found = [];
  let order = 0;
  const sheets = Array.from(document.styleSheets);
  sheets.forEach((sheet, si) => {
    if (sheet.ownerNode && isOwn(sheet.ownerNode)) return;
    let rules;
    try { rules = sheet.cssRules; } catch (e) { return; }
    const src = sourceOf(sheet, si);
    walk(rules, [], src);
  });
  function walk(rules, conds, src) {
    for (const rule of rules) {
      order++;
      if (rule instanceof CSSStyleRule) {
        const parts = splitSelectors(rule.selectorText);
        let hit = null;
        for (const part of parts) {
          const plain = part.replace(PSEUDO_ELEMENTS, "").trim();
          try {
            if (plain && el.matches(plain)) { hit = part; break; }
            if (!plain && part && el.matches(part.replace(PSEUDO_ELEMENTS, "*"))) { hit = part; break; }
          } catch (e) { /* a selector the browser rejects cannot match */ }
        }
        if (hit) {
          found.push({ selector: hit, selectorList: rule.selectorText, decls: declarations(rule.style), source: src, conditions: conds, spec: specificity(hit), order, pseudo: PSEUDO_ELEMENTS.test(hit) && hit.replace(PSEUDO_ELEMENTS, "").trim() !== hit.trim() });
          PSEUDO_ELEMENTS.lastIndex = 0;
        }
        if (rule.cssRules && rule.cssRules.length) walk(rule.cssRules, conds, src);
      } else {
        const cond = conditionOf(rule);
        if (cond && rule.cssRules) walk(rule.cssRules, conds.concat([cond]), src);
      }
    }
  }
  const inline = el.getAttribute("style");
  if (inline) found.push({ selector: "style=\"…\"", inline: true, decls: declarations(el.style), source: "Attribut am Element", conditions: [], spec: [9, 0, 0], order: order + 1 });
  found.sort(cmp);
  /* Overrides: an !important declaration beats every normal one; otherwise the
   * first rule in cascade order wins. Rules under an inactive condition do not
   * take part. Pseudo-element rules style a different box and never override. */
  const winner = new Map();
  const takesPart = (r) => !r.pseudo && r.conditions.every((c) => c.active !== false);
  for (const pass of [true, false]) {
    for (const r of found) {
      if (!takesPart(r)) continue;
      for (const d of r.decls) {
        if (d.important !== pass) continue;
        if (!winner.has(d.prop)) winner.set(d.prop, d);
      }
    }
  }
  for (const r of found) for (const d of r.decls) d.overridden = takesPart(r) && winner.get(d.prop) !== d;
  return found;
}

/* CSS colour literal? Then the rule list shows a swatch next to it. */
export function isColorValue(v) {
  return /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\(|oklch\(|color\()/i.test(v.trim());
}
