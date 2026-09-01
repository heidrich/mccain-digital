/* ============================================================
   McCain Digital — the home page.
   Only what this one page owns: the AI console, the work track,
   the sticky service cards, the score chips and the contact form.
   Everything shared (theme, nav, marquee, tooltips, pixel boot,
   the FAQ widget) lives in common.js and loads before this file.

   Vanilla, no build step, no dependencies. Everything degrades:
   without JS the page is still readable, without scroll timelines
   it just loses the choreography.
   ============================================================ */
(() => {
  "use strict";

  const d = document;
  const { reduced, fine } = window.MCDUI;

  /* ---------- AI mode ----------
     "auto"  asks /api/ask first and falls back to the local knowledge base
             whenever the endpoint says it cannot answer — no key configured,
             rate limited, budget spent, provider down. Nothing to flip when
             the key is added or removed: the endpoint reports which it is.
     "local" never touches the network.
     "live"  is the same as "auto" today, kept because the handover names it.

     The endpoint answers 200 with `{fallback:true}` rather than an error
     status precisely so this stays a normal path and not an exception. */
  const AI_MODE = "auto";
  const AI_ENDPOINT = "/api/ask";
  // Set once the endpoint reports it has no key: asking again every question
  // would spend a round trip per question to learn the same thing.
  let aiOffThisSession = false;

  /* ============================================================
     1) DATA — services, scores, FAQ, knowledge base
     ============================================================ */
  // services, FAQ, knowledge base and chip texts live in data.js — one source
  // for every page, so a price or a promise is only ever edited once
  const { SERVICES, FAQ } = window.MCD;

  const ICONS = {
    bolt: "M13 2 4.5 13.2H11l-1 8.8 8.5-11.2H12z",
    a11y: "M12 4.4a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2M4.6 7.2c2.4.8 4.8 1.2 7.4 1.2s5-.4 7.4-1.2M12 8.4v5.2m0 0-3 8m3-8 3 8",
    shield: "M12 2.6 4.4 5.8v6c0 4.6 3.2 8.4 7.6 9.6 4.4-1.2 7.6-5 7.6-9.6v-6z",
    search: "M11 3.6a7.4 7.4 0 1 0 0 14.8 7.4 7.4 0 0 0 0-14.8m5.4 12.8L21 21",
    bot: "M8 4.5h8a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3m1 5v2m6-2v2M12 1.6v2.9M9 21h6"
  };

  const SCORES = [
    { v: "100", k: "Performance", i: "bolt", t: "performance" },
    { v: "100", k: "Accessibility", i: "a11y", t: "accessibility" },
    { v: "100", k: "Best practices", i: "shield", t: "practices" },
    { v: "100", k: "SEO", i: "search", t: "seo" },
    { v: "3/3", k: "Agentic browsing", i: "bot", t: "agentic" }
  ];


  const CHIPS = {
    ask: ["What does it cost?", "Why should I NOT hire you?", "Do you really do AI?", "Who builds it?"],
    brief: ["A shop for our bakery", "AI that reads our invoices", "Internal dashboard for 40 staff"]
  };

  /* ============================================================
     2) RENDER — services, scores, FAQ
     ============================================================ */
  const stackList = d.getElementById("stackList");
  stackList.innerHTML = SERVICES.map((s, i) => `
    <article class="scard" style="top:calc(var(--nav) + 2.2rem + ${i * 12}px);z-index:${i + 1}">
      <span class="scard-ghost" aria-hidden="true">${s.n}</span>
      <p class="scard-n">/${s.n}</p>
      <div>
        <h3 class="scard-h">${s.h}</h3>
        <p class="scard-p">${s.p}</p>
        <a class="scard-link" href="${s.href}"
           aria-label="More on this — ${s.h}">More on this →</a>
      </div>
      <div class="scard-get">
        <p class="label">What you get</p>
        ${s.get.map((g) => `<span><em>→</em>${g}</span>`).join("")}
      </div>
    </article>`).join("");

  d.getElementById("scores").innerHTML = SCORES.map((s, i) => `
    <span class="score" style="--i:${i}" data-tip="${s.t}" tabindex="0">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="${ICONS[s.i]}"></path>
      </svg>${s.k}<b>${s.v}</b>
    </span>`).join("");

  /* The tabs come from data.js here; a service page authors the same markup
     by hand. Either way common.js drives them — one widget, two sources. */
  const faqList = d.getElementById("faqList");
  faqList.innerHTML = FAQ.map((f, i) => `
    <button class="faq-q" type="button" role="tab" style="--i:${i}"
            id="faqTab${i}" aria-controls="faqPanel" data-q="${f.q.replace(/"/g, "&quot;")}"
            aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}"><em>0${i + 1}</em>${f.q}</button>`).join("");
  window.MCDUI.faq(faqList, d.getElementById("faqPanel"), FAQ.map((f) => f.a));

  /* the spotlight that follows the pointer across a service card */
  if (fine && !reduced) {
    stackList.addEventListener("pointermove", (e) => {
      const card = e.target.closest(".scard");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 100).toFixed(1) + "%");
      card.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 100).toFixed(1) + "%");
    }, { passive: true });
  }

  /* ============================================================
     3) AI CONSOLE
     ============================================================ */
  // one typewriter for the console, the FAQ and the menu — see data.js
  const stream = window.MCD.stream;

  const body = d.getElementById("consoleBody");
  const form = d.getElementById("consoleForm");
  const input = d.getElementById("consoleInput");
  const chipBox = d.getElementById("chips");
  const tabAsk = d.getElementById("tabAsk");
  const tabBrief = d.getElementById("tabBrief");
  let mode = "ask";
  let cancel = () => { };

  function renderChips() {
    chipBox.innerHTML = CHIPS[mode]
      .map((c) => `<button class="chip" type="button">${c}</button>`).join("");
  }

  // q omitted → the console speaks first, without faking a user prompt
  function push(q) {
    const wrap = d.createElement("div");
    wrap.className = "msg";
    wrap.innerHTML = (q ? `<div class="msg-q">${q}</div>` : "") + '<div class="msg-a"></div>';
    body.appendChild(wrap);
    // Reading scrollHeight straight after the append forces a synchronous
    // layout of the console — 79 ms of it at boot, when the greeting is
    // pushed. A frame later the layout already exists and the read is free;
    // nobody can see a scroll arriving one frame late.
    requestAnimationFrame(() => { body.scrollTop = body.scrollHeight; });
    return wrap.querySelector(".msg-a");
  }

  // the same lookup the menu's "ask" uses — one knowledge base, two surfaces
  const lookup = window.MCD.lookup;
  const FALLBACK = window.MCD.FALLBACK;

  /* the brief generator — deterministic, honest about being an estimate */
  function brief(q) {
    const s = q.toLowerCase();
    const kind =
      /shop|store|commerce|bakery|sell/.test(s) ? { t: "Online shop", w: "6–10 weeks", b: "€15–35k" } :
        /invoice|extract|document|pdf|rag|ai|ki|assistant|agent/.test(s) ? { t: "AI tool on your data", w: "4–10 weeks", b: "€20–60k" } :
          /dashboard|internal|staff|erp|crm|tool|portal/.test(s) ? { t: "Internal software", w: "8–14 weeks", b: "€25–70k" } :
            /app|ios|android|mobile/.test(s) ? { t: "Mobile app", w: "8–14 weeks", b: "€30–70k" } :
              { t: "Website", w: "3–6 weeks", b: "€8–25k" };

    return `<b>${kind.t}</b> — here's how we'd run it.\n` +
      `<div class="brief-row"><span class="k">Phase 1</span><span>Scope &amp; a clickable prototype — you see it, not a document. <b>Week 1</b></span></div>` +
      `<div class="brief-row"><span class="k">Phase 2</span><span>Design + build in weekly slices you can click through.</span></div>` +
      `<div class="brief-row"><span class="k">Phase 3</span><span>Hardening — tests, a11y, Lighthouse, security pass.</span></div>` +
      `<div class="brief-row"><span class="k">Phase 4</span><span>Launch + handover: the repo, the docs and the keys are yours.</span></div>` +
      `<div class="brief-row"><span class="k">Timeframe</span><span><b>${kind.w}</b></span></div>` +
      `<div class="brief-row"><span class="k">Budget band</span><span><b>${kind.b}</b> — an honest band, not a quote. The real number comes within 48 hours.</span></div>` +
      `\nWant this properly? <b>info@mccain-digital.com</b>`;
  }

  // The typewriter has just rewritten innerHTML, so reading scrollHeight in the
  // same tick would force a layout — defer it, exactly as push() does.
  const toBottom = () => {
    requestAnimationFrame(() => { body.scrollTop = body.scrollHeight; });
  };

  function answer(q) {
    cancel();
    const out = push(q);

    // The brief generator is a local form, not a conversation — it never asks
    // the model, in "auto" as much as in "local".
    const wantsModel = AI_MODE !== "local" && mode !== "brief" && !aiOffThisSession;

    if (wantsModel) {
      out.textContent = "…";
      const local = () => { cancel = stream(out, lookup(q), toBottom); };
      fetch(AI_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q, mode })
      })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("ai"))))
        .then((j) => {
          if (j && j.answer) { cancel = stream(out, j.answer, toBottom); return; }
          // No key means it will not answer for the rest of the visit either.
          if (j && j.reason === "no key configured") aiOffThisSession = true;
          local();
        })
        // Falling back to lookup(), NOT to FALLBACK: the local knowledge base
        // answers this question today, so a failed request must never make the
        // console worse than it is with no endpoint at all.
        .catch(local);
      return;
    }
    cancel = stream(out, mode === "brief" ? brief(q) : lookup(q), toBottom);
  }

  function setMode(next) {
    mode = next;
    tabAsk.setAttribute("aria-selected", String(next === "ask"));
    tabBrief.setAttribute("aria-selected", String(next === "brief"));
    input.placeholder = next === "brief"
      ? "Describe your project in one line…"
      : "Ask us anything…";
    body.innerHTML = "";
    renderChips();
    const out = push();
    cancel = stream(out, next === "brief"
      ? "Tell me what you want built — one line is enough — and I'll lay out how we'd run it, what it takes and roughly what it costs.\n\nTry one of the examples below."
      : "Ask me about cost, timelines, who actually builds it, or why you should <b>not</b> hire us. I'll give you the same answer a human would.");
  }

  tabAsk.addEventListener("click", () => setMode("ask"));
  tabBrief.addEventListener("click", () => setMode("brief"));

  chipBox.addEventListener("click", (e) => {
    const c = e.target.closest(".chip");
    if (c) answer(c.textContent);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    input.value = "";
    answer(q);
  });

  setMode("ask");

  // A question asked in the command menu arrives here as ?ask=… — the console
  // picks it up and answers it, so the handover doesn't lose the thought.
  const asked = new URLSearchParams(location.search).get("ask");
  if (asked) {
    answer(asked);
    // drop the parameter again: a reload should not re-ask, and the URL is
    // something people copy and share
    history.replaceState(null, "", location.pathname + location.hash);
  }

  /* ============================================================
     3b) THE DOCKED ASSISTANT

     Owner: "ich moechte das unsere ai konsole, wenn ich 01. verlasse und nach
     unten scrolle, als persoenlichen assi am rand der seite mit laufen haben.
     zum ausklappen etc. den ich jederzeit fragen stellen kann wann ich es
     will, das quasi ein chat fenster aufgeht."

     So the console MOVES to the edge of the page rather than a second one
     being built there. Everything above binds to #console, #consoleBody,
     #consoleInput and friends, so moving the node carries the handlers, the
     typewriter, the mode and - the point of it - the conversation so far. A
     copy would have been a second console that starts empty and drifts out of
     step with the first the moment anyone types in either of them.

     It appears only BELOW section 01. Scrolling up into the hero also takes
     the section off screen, and summoning a floating console one screen above
     the real one would be answering "where am I" with "somewhere else".
     ============================================================ */
  (() => {
    const consoleEl = d.getElementById("console");
    const section = d.getElementById("ai");
    // where it lives in section 01: inside its own travelling rim, which stays
    // behind when the console leaves rather than being carried along - the
    // dock has a rim of its own and two of them 1.5px apart is a mistake
    const home = d.getElementById("consoleIn");
    const homeHold = d.getElementById("consoleHold");
    if (!consoleEl || !section || !home || !homeHold) return;

    /* While the console is away, something its size stands in its place. Two
       reasons, and the second one is the one that bites: section 01 would
       otherwise change height the moment the console leaves it, which moves
       the very edge this whole thing is measured against - and a threshold
       that moves when you cross it is a threshold you cross twice. */
    const spacer = d.createElement("div");
    spacer.setAttribute("aria-hidden", "true");

    const dock = d.createElement("div");
    dock.className = "dock";
    dock.innerHTML =
      '<div class="rim-hold dock-hold" id="dockHold" hidden>' +
      '<span class="rim-glow" aria-hidden="true"></span>' +
      '<div class="rim dock-panel" id="dockPanel" role="region" aria-label="Your assistant">' +
      '<span class="rim-sheet" aria-hidden="true"></span>' +
      '<div class="rim-in"><div class="dock-slot" id="dockSlot"></div></div>' +
      '<button class="dock-x" type="button" id="dockX" aria-label="Collapse the assistant">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">' +
      '<path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
      '</div></div>' +
      '<div class="rim-hold dock-orb-hold">' +
      '<span class="dock-hint" id="dockHint" aria-hidden="true">Ask anything</span>' +
      '<span class="rim-glow" aria-hidden="true"></span>' +
      '<button class="dock-orb rim" id="dockOrb" type="button" aria-expanded="false" aria-controls="dockPanel">' +
      '<span class="rim-sheet" aria-hidden="true"></span>' +
      '<span class="rim-in">' +
      '<svg class="ic-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + ICONS.bot + '"/></svg>' +
      '<svg class="ic-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
      'stroke-linecap="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>' +
      '</span><span class="sr-only" id="dockOrbLabel">Open the assistant</span></button>' +
      '</div>';
    d.body.appendChild(dock);

    const hold = dock.querySelector("#dockHold");
    const orb = dock.querySelector("#dockOrb");
    const slot = dock.querySelector("#dockSlot");
    const hint = dock.querySelector("#dockHint");
    const orbLabel = dock.querySelector("#dockOrbLabel");

    let docked = false, open = false, hinted = false;
    let hintT = 0;

    function setOpen(next) {
      if (next === open) return;
      open = next;
      hold.hidden = !next;
      orb.setAttribute("aria-expanded", String(next));
      orb.classList.toggle("is-open", next);
      // the icon swaps, so the name has to swap with it: a button that still
      // says "open" while it closes is a button that lies to a screen reader
      orbLabel.textContent = next ? "Collapse the assistant" : "Open the assistant";
      if (!next) return;
      clearTimeout(hintT);
      hint.classList.remove("on");
      // a chat that opens with the cursor somewhere else is a chat you have to
      // click twice to use
      requestAnimationFrame(() => input.focus({ preventScroll: true }));
    }

    function setDocked(next) {
      if (next === docked) return;
      docked = next;
      if (next) {
        spacer.style.height = homeHold.offsetHeight + "px";
        homeHold.parentNode.insertBefore(spacer, homeHold);
        homeHold.hidden = true;          // an empty glowing frame is not a frame
        slot.appendChild(consoleEl);
        dock.classList.add("on");
        if (!hinted && !reduced) {
          hinted = true;
          requestAnimationFrame(() => hint.classList.add("on"));
          hintT = setTimeout(() => hint.classList.remove("on"), 4600);
        }
        return;
      }
      // collapse before moving, so the panel is never seen empty
      setOpen(false);
      home.appendChild(consoleEl);
      homeHold.hidden = false;
      if (spacer.parentNode) spacer.remove();
      dock.classList.remove("on");
      clearTimeout(hintT);
      hint.classList.remove("on");
    }

    orb.addEventListener("click", () => setOpen(!open));
    dock.querySelector("#dockX").addEventListener("click", () => { setOpen(false); orb.focus(); });

    /* Escape only while the focus is inside the dock. The command menu listens
       for Escape too, and a key that closes two unrelated things at once is a
       key nobody trusts. */
    dock.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || !open) return;
      setOpen(false);
      orb.focus();
    });

    /* Where section 01 ends, in page coordinates.

       This was an IntersectionObserver first, and it was wrong in a way that
       only shows up when you jump: an observer reports THRESHOLD CROSSINGS,
       and "below the viewport" and "above the viewport" are both ratio zero.
       Landing on a deep link, reloading half way down the page or scripting a
       jump moves between two states it considers the same, so it says nothing
       at all and the assistant simply is not there. Scrolling by hand always
       passes through the section, which is exactly why the hole was invisible
       until something jumped.

       So the edge is measured instead, and the state is derived from where we
       are rather than from having been seen to arrive. A ResizeObserver keeps
       the number honest across font loading, reflow and the reveal
       animations; the scroll handler itself only compares two numbers, and
       never reads layout. */
    let edge = 0;
    const measure = () => { edge = section.getBoundingClientRect().bottom + window.scrollY; };
    measure();

    let queued = false;
    const evaluate = () => {
      queued = false;
      // a band around the edge, so a page that settles a pixel or two while
      // sitting exactly on the boundary cannot flap the console in and out
      if (window.scrollY > edge) setDocked(true);
      else if (window.scrollY < edge - 24) setDocked(false);
    };
    addEventListener("scroll", () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(evaluate);
    }, { passive: true });

    new ResizeObserver(() => { measure(); evaluate(); }).observe(section);
    evaluate();

    /* The spacer's height is frozen at the moment the console leaves, and a
       viewport change while it is away turns that number into a lie. Measured:
       docked at 1440x1000, then shrunk to 1440x620, section 01 still claimed
       926px while its real height had become 782px - so scrolling back up
       collapsed it by 144px, far past the 24px band, and moved the very edge
       the visitor was in the middle of crossing. Which is the exact defect the
       spacer exists to prevent, let back in through the side door.

       So the number is taken again: the console goes home for one measurement
       and comes straight back. It is off screen the whole time a visitor can
       be docked, so there is nothing to see - and the caret is put back
       afterwards, because somebody may be typing in the dock while they resize
       the window. */
    let remeasure = null;
    addEventListener("resize", () => {
      if (!docked) return;
      clearTimeout(remeasure);
      remeasure = setTimeout(() => {
        const typing = d.activeElement === input;
        const caret = typing ? [input.selectionStart, input.selectionEnd] : null;
        homeHold.hidden = false;
        home.appendChild(consoleEl);
        spacer.style.height = homeHold.offsetHeight + "px";
        slot.appendChild(consoleEl);
        homeHold.hidden = true;
        if (caret) {
          input.focus({ preventScroll: true });
          input.setSelectionRange(caret[0], caret[1]);
        }
        measure();
        evaluate();
      }, 180);
    }, { passive: true });
  })();

  /* ============================================================
     4) WORK — an endless track with arrows and a counter
     ============================================================ */
  const track = d.getElementById("worktrack");
  const cur = d.getElementById("wCur");
  const cases = [...track.querySelectorAll(".case")];
  const total = cases.length;
  d.getElementById("wTot").textContent = String(total).padStart(2, "0");

  /* Endless in BOTH directions. The set is tripled and the originals stay in
     the middle, so their pixel-engine instances keep their element identity.
     Once the scroll settles outside the middle set we shift by exactly one set
     width — the content there is identical, so the jump cannot be seen.
     Cloned here, BEFORE the engine boots, so it wires every copy by itself. */
  function cloneSet() {
    return cases.map((c) => {
      const n = c.cloneNode(true);
      n.setAttribute("aria-hidden", "true");
      // an aria-hidden subtree must not contain anything focusable
      n.querySelectorAll("a, button, [tabindex]")
        .forEach((el) => el.setAttribute("tabindex", "-1"));
      return n;
    });
  }
  /* Measured BEFORE the clones go in. A card is `flex: 0 0 min(88vw,1080px)`
     and the gap is viewport-relative, so neither depends on how many cards sit
     in the track — measuring first just keeps the forced layout down to the
     four real cards instead of twelve.

     The read itself stays: it triggers the page's first layout, which is what
     Lighthouse still reports as a forced reflow. Deferring it to a rAF would
     remove the report but paint one frame with the track scrolled to 0, where
     `scroll-snap` left-aligns the first card before it jumps to centre. A
     visible jump is worse than a diagnostic on a page that scores 100 with
     TBT at 0 ms. */
  const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
  const cardW = () => cases[0].getBoundingClientRect().width + gap;
  const setW = () => cardW() * total;
  const startAt = setW();

  track.prepend(...cloneSet());
  track.append(...cloneSet());

  let idx = 0;                          // logical card, 0…total-1
  /* Lands on the middle set. The value is snapped afterwards by
     `scroll-snap-type: x mandatory`, so scrollLeft reads back a little lower
     than startAt — that is the snap centring the first original card, not a
     miscalculation. */
  track.scrollLeft = startAt;

  const step = (dir) => {
    track.scrollBy({ left: dir * cardW(), behavior: reduced ? "auto" : "smooth" });
  };
  d.getElementById("wNext").addEventListener("click", () => step(1));
  d.getElementById("wPrev").addEventListener("click", () => step(-1));

  let idleT = null;
  track.addEventListener("scroll", () => {
    const mid = track.scrollLeft + track.clientWidth / 2;
    const kids = track.children;
    for (let n = 0; n < kids.length; n += 1) {
      const el = kids[n];
      if (el.offsetLeft <= mid && el.offsetLeft + el.offsetWidth > mid) {
        idx = n % total;
        cur.textContent = String(idx + 1).padStart(2, "0");
        break;
      }
    }
    // Wrap only once the scrolling has actually STOPPED. A smooth programmatic
    // scroll animates toward an absolute target — moving the ground under it
    // mid-flight lands it on the wrong card. Waiting for idle also means a
    // trackpad fling wraps mid-momentum without any visible seam.
    clearTimeout(idleT);
    idleT = setTimeout(() => {
      const w = setW();
      if (track.scrollLeft < w * 0.5) track.scrollLeft += w;
      else if (track.scrollLeft > w * 1.5) track.scrollLeft -= w;
    }, 160);
  }, { passive: true });

  // card width is viewport-relative, so every resize invalidates the offsets
  let wrz = null;
  addEventListener("resize", () => {
    clearTimeout(wrz);
    wrz = setTimeout(() => { track.scrollLeft = setW() + idx * cardW(); }, 180);
  });

})();
