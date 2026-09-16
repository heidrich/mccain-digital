/* The DOM as a tree: the real one, from <html> down, drawn lazily.
 *
 * Only expanded branches exist as rows, so 2.200 elements cost nothing until
 * someone opens them. The tree follows the WAI-ARIA tree pattern: one row in
 * the tab order, arrows move, Enter selects. Hovering a row highlights the
 * node on the page; selecting on the page opens the path here. */
import { T } from "./texte.js";
import { h, clear, isOwn, pill, textPreview, shortLabel } from "./ui.js";

const SHOW_ATTRS = ["id", "class", "data-cv", "data-screen-label", "role", "aria-label", "href", "src", "type", "name", "data-on", "data-ref", "for", "alt"];
const PAGE_SIZE = 120;

export function mountTree(W) {
  const el = h("div");
  const stats = h("p.wk-hint", { style: { margin: "0 0 8px" } });
  const list = h("ul.wk-tree", { role: "tree", aria: { label: T.tree.title } });
  el.append(stats, list);
  const rows = new Map(); // node -> { li, row, group, built, depth }
  let focused = null;

  function visibleChildren(node) {
    const out = [];
    for (const c of node.childNodes) {
      if (c.nodeType === 1 && !isOwn(c)) out.push(c);
      else if (c.nodeType === 3 && c.nodeValue.trim()) out.push(c);
    }
    return out;
  }

  function rowLabel(node) {
    if (node.nodeType === 3) return [h("span.wk-tree-text", `“${textPreview(node, 70)}”`)];
    const parts = [h("span.wk-tree-tag", "<" + node.tagName.toLowerCase())];
    for (const a of SHOW_ATTRS) {
      if (!node.hasAttribute(a)) continue;
      let v = node.getAttribute(a);
      if (a === "class") v = v.split(/\s+/).filter(Boolean).slice(0, 3).join(" ") + (node.classList.length > 3 ? " …" : "");
      if (v.length > 40) v = v.slice(0, 39) + "…";
      parts.push(h("span.wk-tree-attr", " " + a, h("b", v === "" ? "" : `="${v}"`)));
    }
    parts.push(h("span.wk-tree-tag", ">"));
    if (node.hasAttribute("data-cv")) parts.push(cvPill(node));
    return parts;
  }

  function cvPill(block) {
    let skipped = false;
    try { skipped = !Array.prototype.some.call(block.children, (c) => c.checkVisibility({ contentVisibilityAuto: true })); } catch (e) { skipped = false; }
    return pill(skipped ? T.perf.cvSkipped : T.perf.cvRendered, skipped ? "warn" : "good");
  }

  function makeRow(node, depth) {
    const kids = node.nodeType === 1 ? visibleChildren(node) : [];
    const row = h("div.wk-tree-row", {
      role: "treeitem", tabindex: "-1",
      aria: { level: String(depth + 1), selected: "false", expanded: kids.length ? "false" : null },
      style: { "--depth": String(depth) },
    }, h("span.wk-tree-tog", { "data-leaf": kids.length ? null : "", aria: { hidden: "true" } }), rowLabel(node));
    const li = h("li", { role: "none" }, row);
    const entry = { li, row, group: null, built: false, depth, node, kids };
    rows.set(node, entry);
    row.addEventListener("click", (e) => {
      if (e.target.closest(".wk-tree-tog") && kids.length) { toggle(entry); return; }
      W.select(node.nodeType === 1 ? node : node.parentElement);
    });
    row.addEventListener("dblclick", () => { if (kids.length) toggle(entry); });
    row.addEventListener("mouseenter", () => W.hover(node.nodeType === 1 ? node : node.parentElement));
    row.addEventListener("mouseleave", () => W.hover(null));
    row.addEventListener("focus", () => { focused = entry; });
    return entry;
  }

  function build(entry) {
    if (entry.built) return;
    entry.built = true;
    entry.group = h("ul", { role: "group" });
    entry.li.appendChild(entry.group);
    fill(entry, 0);
  }
  function fill(entry, from) {
    const kids = entry.kids;
    const upto = Math.min(kids.length, from + PAGE_SIZE);
    for (let i = from; i < upto; i++) entry.group.appendChild(makeRow(kids[i], entry.depth + 1).li);
    if (upto < kids.length) {
      const more = h("li", { role: "none" }, h("button.wk-tree-more", { type: "button", style: { "--depth": String(entry.depth + 1) } }, `${kids.length - upto} ${T.tree.more} …`));
      more.firstChild.addEventListener("click", () => { more.remove(); fill(entry, upto); });
      entry.group.appendChild(more);
    }
  }
  function expand(entry) {
    if (!entry.kids.length) return;
    build(entry);
    entry.group.hidden = false;
    entry.row.setAttribute("aria-expanded", "true");
  }
  function collapse(entry) {
    if (!entry.kids.length || !entry.built) return;
    entry.group.hidden = true;
    entry.row.setAttribute("aria-expanded", "false");
  }
  function toggle(entry) { if (entry.row.getAttribute("aria-expanded") === "true") collapse(entry); else expand(entry); }

  /* Open every ancestor's branch so the node has a row, then mark it. */
  function reveal(target, focus) {
    if (!target || isOwn(target)) return;
    const chain = [];
    for (let n = target; n; n = n.parentNode) { if (n.nodeType === 1) chain.unshift(n); if (n === document.documentElement) break; }
    let entry = rows.get(document.documentElement);
    for (let i = 1; i < chain.length && entry; i++) {
      expand(entry);
      let next = rows.get(chain[i]);
      while (!next && entry.group && entry.group.querySelector(".wk-tree-more")) {
        entry.group.querySelector(".wk-tree-more").click();
        next = rows.get(chain[i]);
      }
      entry = next;
    }
    for (const e of rows.values()) e.row.setAttribute("aria-selected", "false");
    if (!entry) return;
    entry.row.setAttribute("aria-selected", "true");
    entry.row.tabIndex = 0;
    if (focused && focused !== entry) focused.row.tabIndex = -1;
    focused = entry;
    entry.row.scrollIntoView({ block: "center", behavior: "auto" });
    if (focus) entry.row.focus();
  }

  function visibleRows() { return Array.from(list.querySelectorAll(".wk-tree-row")).filter((r) => r.offsetParent !== null); }
  list.addEventListener("keydown", (e) => {
    const row = e.target.closest(".wk-tree-row");
    if (!row) return;
    const entry = Array.from(rows.values()).find((x) => x.row === row);
    if (!entry) return;
    const vis = visibleRows();
    const i = vis.indexOf(row);
    let next = null;
    switch (e.key) {
      case "ArrowDown": next = vis[i + 1]; break;
      case "ArrowUp": next = vis[i - 1]; break;
      case "ArrowRight": if (row.getAttribute("aria-expanded") === "false") expand(entry); else next = vis[i + 1]; break;
      case "ArrowLeft": if (row.getAttribute("aria-expanded") === "true") collapse(entry); else { const p = entry.li.parentElement && entry.li.parentElement.closest("li"); next = p && p.querySelector(".wk-tree-row"); } break;
      case "Home": next = vis[0]; break;
      case "End": next = vis[vis.length - 1]; break;
      case "Enter": case " ": W.select(entry.node.nodeType === 1 ? entry.node : entry.node.parentElement); break;
      default: return;
    }
    e.preventDefault();
    if (next) { row.tabIndex = -1; next.tabIndex = 0; next.focus(); const ne = Array.from(rows.values()).find((x) => x.row === next); if (ne) W.hover(ne.node.nodeType === 1 ? ne.node : ne.node.parentElement); }
  });

  /* Build: <html> open, <head> closed, the page wrapper open down to #top. */
  const root = makeRow(document.documentElement, 0);
  list.appendChild(root.li);
  const top = document.getElementById("top") || document.body;
  reveal(top, false);
  const topEntry = rows.get(top);
  if (topEntry) expand(topEntry);
  root.row.tabIndex = 0;

  const count = document.body.getElementsByTagName("*").length - document.querySelectorAll("#v5-dev *, #v5-dev-layer *, #v5-dev, #v5-dev-layer, [data-v5-dev-switch]").length;
  let depth = 0;
  (function walk(n, d) { if (d > depth) depth = d; for (const c of n.children) if (!isOwn(c)) walk(c, d + 1); })(document.body, 0);
  stats.textContent = T.tree.stats(count.toLocaleString("de-DE"), depth);

  const offSelect = W.bus.on("select", (target) => reveal(target, false));
  const onCv = (e) => {
    const entry = rows.get(e.target);
    if (!entry) return;
    const old = entry.row.querySelector(".wk-pill");
    if (old) old.replaceWith(cvPill(e.target));
  };
  document.addEventListener("contentvisibilityautostatechange", onCv, true);

  return {
    el,
    show() { if (W.selected) reveal(W.selected, false); },
    dispose() { offSelect(); document.removeEventListener("contentvisibilityautostatechange", onCv, true); rows.clear(); clear(list); },
  };
}

export { shortLabel };
