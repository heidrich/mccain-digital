/* ============================================================================
 * Mega-menu controller — opens the full-screen overlay from any "Menu" trigger
 * (button with [data-mega-open]), focus-traps it, closes on Esc / close button /
 * backdrop click / link navigation, and locks body scroll while open.
 * Shared on every page. No deps.
 * ========================================================================== */
(function () {
  "use strict";

  var mega = document.getElementById("mega");
  if (!mega) return;
  var closeBtn = document.getElementById("megaClose");
  var openers = [].slice.call(document.querySelectorAll("[data-mega-open]"));
  var lastFocus = null;

  // sync the year in the mega footer
  [].forEach.call(mega.querySelectorAll(".mega-year"), function (s) {
    s.textContent = new Date().getFullYear();
  });

  function focusables() {
    return [].slice.call(
      mega.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
    ).filter(function (el) { return el.offsetParent !== null; });
  }

  function open() {
    lastFocus = document.activeElement;
    mega.classList.add("open");
    mega.setAttribute("aria-hidden", "false");
    document.body.classList.add("mega-open");
    openers.forEach(function (o) { o.setAttribute("aria-expanded", "true"); });
    // focus the close button after the open transition starts
    setTimeout(function () { if (closeBtn) closeBtn.focus(); }, 60);
    document.addEventListener("keydown", onKey);
  }

  function close() {
    mega.classList.remove("open");
    mega.setAttribute("aria-hidden", "true");
    document.body.classList.remove("mega-open");
    openers.forEach(function (o) { o.setAttribute("aria-expanded", "false"); });
    document.removeEventListener("keydown", onKey);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function onKey(e) {
    if (e.key === "Escape") { close(); return; }
    if (e.key === "Tab") {
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  openers.forEach(function (o) {
    o.setAttribute("aria-haspopup", "dialog");
    o.setAttribute("aria-expanded", "false");
    o.addEventListener("click", function (e) { e.preventDefault(); open(); });
  });
  if (closeBtn) closeBtn.addEventListener("click", close);

  // backdrop click (clicking the overlay itself, not its content) closes
  mega.addEventListener("click", function (e) {
    if (e.target === mega) close();
  });

  // navigating via a same-page hash link (e.g. #product) should close the overlay
  [].forEach.call(mega.querySelectorAll('a[href*="#"]'), function (a) {
    a.addEventListener("click", function () {
      // let the navigation happen, then close
      setTimeout(close, 10);
    });
  });
})();
