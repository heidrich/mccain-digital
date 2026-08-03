/* ============================================================
   McCain Digital — the command menu.

   Not a mega dropdown. One full-screen surface that does three
   things a link list cannot:

     1. TYPE TO JUMP  — every destination filters live.
     2. ASK INSTEAD   — if you type a question rather than a
        destination, it answers from the same knowledge base the
        AI console uses, and hands the query on to the real
        console if you hit enter.
     3. PREVIEW       — the pane on the right shows what is
        actually on the page you are pointing at.

   Keyboard first: ⌘K / Ctrl+K or "/" to open, ↑↓ to move,
   ⏎ to open, Esc to close. Injects its own markup, so all six
   pages get exactly the same menu from one file.

   Needs: data.js (window.MCD) and a [data-menu-open] trigger.
   Pages below the root set data-root=".." on <html>.
   ============================================================ */
(() => {
  "use strict";

  const d = document;
  const MCD = window.MCD;
  if (!MCD) return;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ROOT = d.documentElement.dataset.root || ".";
  const url = (p) => (/^(https?:|mailto:|#)/.test(p) ? p : ROOT + "/" + p);

  /* ---------- what the menu can reach ---------- */
  const ITEMS = [
    ...MCD.SERVICES.map((s) => ({
      g: "Services", n: s.n, t: s.h, to: s.href, d: s.p,
      get: s.get, proof: s.proof, k: s.k
    })),
    ...MCD.NAV.map((n) => ({ g: n.g, t: n.t, to: n.to, d: n.d, k: n.k }))
  ];

  /* ---------- markup, built once ---------- */
  const wrap = d.createElement("div");
  wrap.className = "cm";
  wrap.id = "cmenu";
  wrap.hidden = true;
  wrap.innerHTML = `
    <div class="cm-scrim" data-cm-close></div>
    <div class="cm-panel" role="dialog" aria-modal="true" aria-label="Menu and search">
      <div class="cm-head">
        <span class="cm-brand">mccain <i>digital</i></span>
        <button class="cm-x" type="button" data-cm-close aria-label="Close menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18"/>
          </svg>
        </button>
      </div>
      <div class="cm-search">
        <span class="cm-prompt" aria-hidden="true">&rsaquo;</span>
        <input id="cmInput" type="text" role="combobox" aria-expanded="true" aria-controls="cmList"
               aria-autocomplete="list" autocomplete="off" spellcheck="false"
               placeholder="Type to jump — or just ask us something">
        <span class="cm-count" id="cmCount" aria-live="polite"></span>
      </div>
      <div class="cm-body">
        <div class="cm-list" id="cmList" role="listbox" aria-label="Destinations"></div>
        <aside class="cm-prev" id="cmPrev"></aside>
      </div>
      <div class="cm-foot">
        <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
        <span><kbd>⏎</kbd> open</span>
        <span><kbd>esc</kbd> close</span>
        <span class="cm-foot-k"><kbd>${navigator.platform.indexOf("Mac") === 0 ? "⌘" : "Ctrl"}</kbd><kbd>K</kbd> from anywhere</span>
      </div>
    </div>`;
  d.body.appendChild(wrap);

  const panel = wrap.querySelector(".cm-panel");
  const input = wrap.querySelector("#cmInput");
  const list = wrap.querySelector("#cmList");
  const prev = wrap.querySelector("#cmPrev");
  const count = wrap.querySelector("#cmCount");

  let shown = [];          // items currently rendered
  let active = -1;
  let opener = null;       // element to hand focus back to
  let streamCancel = () => { };
  let decodeTimer = null;

  /* ---------- filtering ---------- */
  function match(q) {
    if (!q) return ITEMS.slice();
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return ITEMS.filter((it) => {
      const hay = (it.t + " " + (it.k || "") + " " + (it.d || "")).toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }

  function render(q) {
    const hits = match(q.trim());
    shown = hits.slice();
    // The ask row is always offered once you have typed something real, so the
    // menu never dead-ends on "no results" — it answers instead.
    if (q.trim().length >= 2) shown.push({ g: "Ask", t: q.trim(), ask: true });

    let html = "", group = "";
    shown.forEach((it, i) => {
      if (it.g !== group) {
        group = it.g;
        html += `<p class="cm-group">${group}</p>`;
      }
      html += `<div class="cm-row" role="option" id="cmOpt${i}" data-i="${i}"
                    aria-selected="false" style="--i:${i}">
                 <span class="cm-n">${it.ask ? "?" : (it.n || "→")}</span>
                 <span class="cm-t">${it.ask ? "Ask: “" + esc(it.t) + "”" : esc(it.t)}</span>
                 <span class="cm-go" aria-hidden="true">↵</span>
               </div>`;
    });
    list.innerHTML = html;
    count.textContent = hits.length
      ? hits.length + (hits.length === 1 ? " match" : " matches")
      : "no match — press enter to ask";
    setActive(0);
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  /* ---------- the preview pane ---------- */
  function setActive(i) {
    if (!shown.length) { prev.innerHTML = ""; return; }
    active = Math.max(0, Math.min(shown.length - 1, i));
    list.querySelectorAll(".cm-row").forEach((r) => {
      const on = Number(r.dataset.i) === active;
      r.setAttribute("aria-selected", String(on));
      if (on) r.scrollIntoView({ block: "nearest" });
    });
    input.setAttribute("aria-activedescendant", "cmOpt" + active);
    preview(shown[active]);
  }

  function preview(it) {
    streamCancel();
    clearInterval(decodeTimer);

    if (it.ask) {
      prev.innerHTML =
        `<p class="cm-p-eyebrow">Answer</p>
         <div class="cm-p-answer"></div>
         <p class="cm-p-foot">Press <kbd>⏎</kbd> to carry this over to the full console.</p>`;
      streamCancel = MCD.stream(prev.querySelector(".cm-p-answer"), MCD.lookup(it.t));
      return;
    }

    prev.innerHTML =
      `<p class="cm-p-eyebrow">${it.n ? "/" + it.n : it.g}</p>
       <h3 class="cm-p-h" aria-hidden="true"></h3>
       <p class="cm-p-d">${esc(it.d || "")}</p>
       ${it.get ? '<ul class="cm-p-get">' + it.get.map((g) => "<li>" + esc(g) + "</li>").join("") + "</ul>" : ""}
       ${it.proof ? '<p class="cm-p-proof">' + esc(it.proof) + "</p>" : ""}`;
    decode(prev.querySelector(".cm-p-h"), it.t);
  }

  /* The heading resolves out of noise, like a terminal locking on. Cheap —
     it only rewrites one text node — and it is aria-hidden, so a screen
     reader gets the settled name from the option row instead of the churn. */
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ/\\<>#*+-01";
  function decode(el, text) {
    if (!el) return;
    if (reduced) { el.textContent = text; return; }
    let step = 0;
    const steps = 9;
    decodeTimer = setInterval(() => {
      step += 1;
      const solid = Math.floor((text.length * step) / steps);
      let out = text.slice(0, solid);
      for (let i = solid; i < text.length; i += 1) {
        out += text[i] === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (step >= steps) { clearInterval(decodeTimer); el.textContent = text; }
    }, 26);
  }

  /* ---------- go ---------- */
  function go(it) {
    if (!it) return;
    if (it.ask) {
      // hand the question to the real console, already loaded
      location.href = url("index.html") + "?ask=" + encodeURIComponent(it.t) + "#ai";
      return;
    }
    location.href = url(it.to);
  }

  /* ---------- open / close ---------- */
  let scrollY = 0;

  function open(from) {
    if (!wrap.hidden) return;
    opener = from || d.activeElement;
    scrollY = window.scrollY;
    wrap.hidden = false;
    // lock the page without letting it jump: the scrollbar's width is given
    // back as padding, or the whole layout shifts by ~15px on open
    const sb = window.innerWidth - d.documentElement.clientWidth;
    d.body.style.overflow = "hidden";
    if (sb > 0) d.body.style.paddingRight = sb + "px";
    requestAnimationFrame(() => wrap.classList.add("cm-on"));
    // the match counter sits in the same row; the long placeholder ran under it
    // on narrow screens
    input.placeholder = window.innerWidth < 620
      ? "Type to jump — or ask"
      : "Type to jump — or just ask us something";
    input.value = "";
    render("");
    input.focus();
  }

  function close() {
    if (wrap.hidden) return;
    streamCancel();
    clearInterval(decodeTimer);
    wrap.classList.remove("cm-on");
    const done = () => {
      wrap.hidden = true;
      d.body.style.overflow = "";
      d.body.style.paddingRight = "";
      if (opener && opener.focus) opener.focus();
    };
    if (reduced) done(); else setTimeout(done, 260);
  }

  /* ---------- events ---------- */
  const MAC = navigator.platform.indexOf("Mac") === 0;
  d.querySelectorAll("[data-menu-key]").forEach((k) => { k.textContent = MAC ? "⌘K" : "Ctrl K"; });

  d.querySelectorAll("[data-menu-open]").forEach((b) => {
    b.addEventListener("click", (e) => { e.preventDefault(); open(b); });
  });

  wrap.addEventListener("click", (e) => {
    if (e.target.closest("[data-cm-close]")) { close(); return; }
    const row = e.target.closest(".cm-row");
    if (row) go(shown[Number(row.dataset.i)]);
  });

  list.addEventListener("pointermove", (e) => {
    const row = e.target.closest(".cm-row");
    if (row && Number(row.dataset.i) !== active) setActive(Number(row.dataset.i));
  });

  input.addEventListener("input", () => render(input.value));

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(shown.length - 1); }
    else if (e.key === "Enter") { e.preventDefault(); go(shown[active]); }
  });

  d.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === "k") { e.preventDefault(); wrap.hidden ? open() : close(); return; }
    if (wrap.hidden) {
      // "/" opens from anywhere — but not while someone is typing in a field
      const t = e.target;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (k === "/" && !typing && !e.metaKey && !e.ctrlKey) { e.preventDefault(); open(); }
      return;
    }
    if (k === "escape") { e.preventDefault(); close(); return; }
    // focus trap: only the input and the close button are tabbable in here
    if (k === "tab") {
      const f = [...panel.querySelectorAll("input, button")].filter((el) => el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
})();
