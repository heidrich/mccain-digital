/* GENERATED from the chrome.html extraction artefact by
 * scratchpad/convert_chrome.py. The behaviour of the subpage header:
 * the six dropdown panels with their measured widths and the sliding
 * indicator, keyboard handling, the mobile drawer, the scrolled shadow
 * and the "Die Seite fragen" pill. Touches nothing outside [data-chrome].
 */
/* =====================================================================
   mccain-digital page chrome. No dependencies. ~250 lines.
   Everything is namespaced under one IIFE and touches only [data-chrome*].
   ===================================================================== */
(function () {
  'use strict';

  var DESKTOP = 960;                 /* isDesktop = vw >= 960 in the export   */
  var CLOSE_DELAY = 160;             /* navLeave's setTimeout, verbatim       */
  var MENU_W = { services: 780, work: 540, studio: 560,
                 process: 540, resources: 440, pricing: 480 };  /* MENU_W     */

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fine    = window.matchMedia('(hover:hover) and (pointer:fine)');

  var head   = document.querySelector('[data-chrome-header]');
  if (!head) return;
  var inner  = head.querySelector('[data-nav-inner]');
  var list   = head.querySelector('[data-nav-list]');
  var panel  = head.querySelector('[data-nav-panel]');
  var caret  = head.querySelector('[data-nav-caret]');
  var ind    = head.querySelector('[data-nav-ind]');
  var triggers = Array.prototype.slice.call(list.querySelectorAll('[data-menu]'));
  var ids = triggers.map(function (b) { return b.getAttribute('data-menu'); });

  var open = null;          /* id of the open menu, or null */
  var closeT = 0;

  function pane(id) { return panel.querySelector('[data-pane="' + id + '"]'); }
  function trigger(id) { return list.querySelector('[data-menu="' + id + '"]'); }

  /* ---- measurePanel(), 1:1 with the export -------------------------
     w      = MENU_W[id]
     center = trigger centre, relative to [data-nav-inner]
     left   = clamp(8, centre - w/2, wrapWidth - w - 8)
     caret  = centre - 7            (half of the 14px square)
     height = the pane's own offsetHeight                              */
  function measure(id) {
    var item = trigger(id), content = pane(id);
    if (!item || !content) return;
    var w  = MENU_W[id] || 520;
    var wr = inner.getBoundingClientRect();
    var ir = item.getBoundingClientRect();
    var nr = list.getBoundingClientRect();
    var centre = ir.left - wr.left + ir.width / 2;
    var left = Math.round(Math.max(8, Math.min(centre - w / 2, wr.width - w - 8)));
    panel.style.left = left + 'px';
    panel.style.width = w + 'px';
    panel.style.height = content.offsetHeight + 'px';
    caret.style.left = Math.round(centre - 7) + 'px';
    ind.style.left = Math.round(ir.left - nr.left) + 'px';
    ind.style.width = Math.round(ir.width) + 'px';
  }

  /* Panes that are not on slide away from the side you came from -
     sign = (i < activeIdx) ? -1 : 1, translateX(sign * -28px). */
  function placePanes(id) {
    var active = ids.indexOf(id);
    ids.forEach(function (pid, i) {
      var el = pane(pid);
      if (!el) return;
      var on = pid === id;
      el.setAttribute('data-on', on ? 'true' : 'false');
      if (!on) {
        var sign = active < 0 ? 1 : (i < active ? -1 : 1);
        el.style.transform = 'translateX(' + (sign * -28) + 'px)';
      } else {
        el.style.transform = '';
      }
    });
  }

  function setOpen(id) {
    if (id === open) return;
    var wasOpen = open !== null;
    open = id;
    /* fresh open -> no left/width/height animation (panelTransition) */
    panel.setAttribute('data-move', wasOpen && id ? 'true' : 'false');
    triggers.forEach(function (b) {
      b.setAttribute('aria-expanded', b.getAttribute('data-menu') === id ? 'true' : 'false');
    });
    list.setAttribute('data-open', id ? 'true' : 'false');
    panel.setAttribute('data-open', id ? 'true' : 'false');
    caret.setAttribute('data-open', id ? 'true' : 'false');
    if (id) { placePanes(id); measure(id); }
    else { placePanes(null); }
  }

  function close(focusTrigger) {
    var last = open;
    setOpen(null);
    if (focusTrigger && last) { var t = trigger(last); if (t) t.focus(); }
  }

  /* ---- pointer ---------------------------------------------------- */
  triggers.forEach(function (b) {
    var id = b.getAttribute('data-menu');
    b.addEventListener('mouseenter', function () {
      if (!fine.matches || window.innerWidth < DESKTOP) return;
      clearTimeout(closeT);
      setOpen(id);
    });
    b.addEventListener('click', function () {
      setOpen(open === id ? null : id);
    });
  });
  inner.addEventListener('mouseleave', function () {
    clearTimeout(closeT);
    closeT = setTimeout(function () { setOpen(null); }, CLOSE_DELAY);
  });
  panel.addEventListener('mouseenter', function () { clearTimeout(closeT); });

  /* ---- keyboard ---------------------------------------------------
     Not in the export - the export ships bare <button>s with no
     aria-expanded, no arrow keys and no focus return. */
  var FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';

  function focusInPane(id) {
    var el = pane(id);
    if (!el) return;
    var first = el.querySelector(FOCUSABLE);
    if (first) first.focus();
  }

  list.addEventListener('keydown', function (e) {
    var i = triggers.indexOf(document.activeElement);
    if (i < 0) return;
    var id = ids[i], next = -1;
    switch (e.key) {
      case 'ArrowRight': next = (i + 1) % triggers.length; break;
      case 'ArrowLeft':  next = (i - 1 + triggers.length) % triggers.length; break;
      case 'Home':       next = 0; break;
      case 'End':        next = triggers.length - 1; break;
      case 'ArrowDown':
      case 'Enter':
      case ' ':
        e.preventDefault();
        setOpen(id);
        if (e.key === 'ArrowDown') focusInPane(id);
        return;
      case 'Escape':
        if (open) { e.preventDefault(); close(true); }
        return;
      default: return;
    }
    e.preventDefault();
    triggers[next].focus();
    if (open) setOpen(ids[next]);
  });

  panel.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); close(true); }
  });

  /* Tab out of the header group -> close. focusout fires before the new
     element gets focus, hence relatedTarget. */
  inner.addEventListener('focusout', function (e) {
    if (!open) return;
    var to = e.relatedTarget;
    if (to && inner.contains(to)) return;
    setOpen(null);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (drawerOpen) closeDrawer(true);
    else if (dockOpen) toggleDock(false, true);
    else if (open) close(true);
  });

  /* ---- scrolled state --------------------------------------------
     onScroll in the export: scrolled = window.scrollY > 12, rAF-throttled. */
  var raf = 0;
  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      head.setAttribute('data-scrolled', window.scrollY > 12 ? 'true' : 'false');
      dock.setAttribute('data-show',
        (window.scrollY > 240 && window.innerWidth >= 600 && !drawerOpen) ? 'true' : 'false');
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  window.addEventListener('resize', function () {
    if (window.innerWidth < DESKTOP) { setOpen(null); }
    else if (open) { measure(open); }
    if (window.innerWidth >= DESKTOP && drawerOpen) closeDrawer(false);
    onScroll();
  });

  /* =================================================== mobile drawer */
  var burger = head.querySelector('[data-burger]');
  var drawer = document.querySelector('[data-drawer]');
  var drawerOpen = false;
  var scrollLock = '';

  function openDrawer() {
    drawerOpen = true;
    drawer.hidden = false;
    burger.setAttribute('aria-expanded', 'true');
    /* The export does NOT lock the body - the page scrolls behind the
       full-screen drawer. Locked here. */
    scrollLock = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    var first = drawer.querySelector(FOCUSABLE);
    if (first) first.focus();
    onScroll();
  }
  function closeDrawer(refocus) {
    drawerOpen = false;
    drawer.hidden = true;
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = scrollLock;
    if (refocus) burger.focus();
    onScroll();
  }
  if (burger && drawer) {
    burger.addEventListener('click', function () {
      drawerOpen ? closeDrawer(true) : openDrawer();
    });
    /* keep focus inside while it covers the page */
    drawer.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = Array.prototype.filter.call(
        drawer.querySelectorAll(FOCUSABLE),
        function (el) { return el.getClientRects().length > 0; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ====================================== "Die Seite fragen" pill ====
     localAnswer() from the export, verbatim - the regexes and the German
     strings are unchanged. There is NO fetch here and none is missing:
     the start page's ask() calls window.claude.complete(), which exists
     only inside Claude Design, so on the deployed site every answer
     already comes from this table. */
  var ANSWERS = [
    [/kost|preis|price|cost|budget|teuer/,
     'Es gibt keine Preisliste – Sie erhalten innerhalb von 48 Stunden ein ' +
     'Festpreisangebot. Eine kleine Website beginnt im niedrigen fünfstelligen ' +
     'Bereich; ein KI-Werkzeug auf Ihren Daten kostet mehr.'],
    [/lange|dauer|zeit|long|time|weeks|wochen|deadline/,
     'Website 3–6 Wochen, Web-App-MVP 6–12 Wochen, KI-Werkzeug 4–10 Wochen, ' +
     'interne Software 8–14 Wochen. Etwas Klickbares sehen Sie in der ersten Woche.'],
    [/wer |who|team|baut|build|christian|kathi/,
     'Die zwei Gründer: Christian entwickelt und betreibt, Kathi verantwortet ' +
     'Design und Marke. Keine Junioren, keine Account-Manager.'],
    [/host|server|daten|data|dsgvo|gdpr|cloud/,
     'Ja – für alles, was Ihre Daten berührt, empfehlen wir Self-Hosting. Ihre ' +
     'Schlüssel, Ihre Hardware, kein Lock-in. Sie erhalten Repository und Dokumentation.']
  ];
  var FALLBACK =
    'Dazu steht nichts in der Wissensbasis dieser Seite. Schreiben Sie an ' +
    'info@mccain-digital.com – Antwort in 24 Stunden, Festpreis in 48.';

  function answerFor(q) {
    var s = String(q || '').toLowerCase();
    for (var i = 0; i < ANSWERS.length; i++) {
      if (ANSWERS[i][0].test(s)) return ANSWERS[i][1];
    }
    return FALLBACK;
  }

  var dock     = document.querySelector('[data-dock]');
  var dockBtn  = dock.querySelector('[data-dock-toggle]');
  var dockLbl  = dock.querySelector('[data-dock-label]');
  var dockPan  = dock.querySelector('[data-dock-panel]');
  var dockList = dock.querySelector('[data-dock-list]');
  var dockForm = dock.querySelector('[data-dock-form]');
  var dockIn   = dock.querySelector('[data-dock-input]');
  var dockOpen = false;
  var typing   = 0;

  function toggleDock(next, refocus) {
    dockOpen = (typeof next === 'boolean') ? next : !dockOpen;
    dockPan.hidden = !dockOpen;
    dockBtn.setAttribute('aria-expanded', dockOpen ? 'true' : 'false');
    dockLbl.textContent = dockOpen ? 'Schließen' : 'Die Seite fragen';
    if (dockOpen) { setTimeout(function () { dockIn.focus(); }, 60); }
    else if (refocus) { dockBtn.focus(); }
  }
  dockBtn.addEventListener('click', function () { toggleDock(); });
  dock.querySelector('[data-dock-close]')
      .addEventListener('click', function () { toggleDock(false, true); });

  function bubble(cls, text) {
    var el = document.createElement('div');
    el.className = cls === 'u' ? 'msg-u' : 'msg-b';
    if (cls === 'u') { el.textContent = text; }
    else {
      el.innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true">' +
                     '<use href="#mcd-mark"></use></svg><p></p>';
    }
    dockList.appendChild(el);
    dockList.scrollTop = dockList.scrollHeight;
    return el;
  }

  /* typeInto(): 3 characters every 14 ms; whole string at once when the
     visitor asked for reduced motion. */
  function say(text) {
    var el = bubble('b', '');
    var p = el.querySelector('p');
    if (reduced.matches) { p.textContent = text; dockList.scrollTop = dockList.scrollHeight; return; }
    var k = 0;
    clearInterval(typing);
    typing = setInterval(function () {
      k += 3;
      p.textContent = text.slice(0, k);
      dockList.scrollTop = dockList.scrollHeight;
      if (k >= text.length) clearInterval(typing);
    }, 14);
  }

  function ask(q) {
    q = String(q || '').trim();
    if (!q) return;
    bubble('u', q);
    dockIn.value = '';
    setTimeout(function () { say(answerFor(q)); }, 220);
  }
  dockForm.addEventListener('submit', function (e) {
    e.preventDefault();
    ask(dockIn.value);
  });
  dock.querySelector('[data-dock-chips]').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (b) ask(b.textContent);
  });

  /* ---- go ---------------------------------------------------------- */
  onScroll();
})();
