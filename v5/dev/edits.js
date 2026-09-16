/* Everything the visitor changes, so that everything can be put back.
 *
 * Text, HTML, the knobs' style sheets and inline properties all go through
 * here. Undo runs in reverse order, because a later change may sit inside an
 * earlier one (an edited paragraph inside a re-written section). */
import { bus } from "./ui.js";

const history = [];
export const editBus = bus();

export const edits = {
  /* entry: { kind, label, node?, undo(): Node|void } */
  record(entry) {
    history.push(entry);
    editBus.emit("change", history.length);
    return entry;
  },
  get count() { return history.length; },
  forNode(node) { return history.filter((e) => e.node === node); },
  /* Undo the entries for one node, latest first; returns the node that now stands in its place. */
  undoNode(node) {
    let current = node;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].node !== current) continue;
      const res = history[i].undo();
      history.splice(i, 1);
      if (res && res.nodeType === 1) {
        /* Later entries pointed at the node that just got replaced. */
        for (const e of history) if (e.node === current) e.node = res;
        current = res;
      }
    }
    editBus.emit("change", history.length);
    return current;
  },
  /* An entry that was already undone by hand (a knob switched off) leaves the history without running again. */
  remove(entry) {
    const i = history.indexOf(entry);
    if (i >= 0) history.splice(i, 1);
    editBus.emit("change", history.length);
  },
  /* When a node is replaced (HTML edit), every older entry that pointed at it now points at its successor. */
  rebind(from, to) {
    for (const e of history) if (e.node === from) e.node = to;
  },
  undoAll() {
    while (history.length) {
      const e = history.pop();
      let res = null;
      try { res = e.undo(); } catch (err) { /* the node may be gone; the rest still counts */ }
      /* The undo of an HTML edit yields the restored node; older entries on the replaced one follow it. */
      if (res && res.nodeType === 1 && e.node) for (const x of history) if (x.node === e.node) x.node = res;
    }
    editBus.emit("change", 0);
  },
};

/* Replace an element by parsing its new outer HTML in a template: scripts in
 * the new markup are inert there, and the parent keeps the node's position. */
export function replaceOuterHtml(node, html) {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  const next = tpl.content.firstElementChild;
  if (!next) throw new Error("Das HTML enthält kein Element.");
  node.replaceWith(next);
  return next;
}
