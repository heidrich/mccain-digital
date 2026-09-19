(function () {
  "use strict";
  var NOTES = {
    1: ["Navy-Pille (dein Entwurf)", "Schwebt unter der Kopfzeile, weißer Ring 2 px, „Start“ 600, danach 400.", "+ auf jedem Grund sofort zu sehen", "− liegt über dem Inhalt (links oben ~290 × 44 px)"],
    2: ["Auf der Kante", "Die Pille sitzt halb auf der Unterkante der Kopfzeile; der Fortschritt ist ein kleiner Ring statt Linie.", "+ gehört sichtbar zur Kopfzeile, verdeckt kaum Inhalt", "− wirkt wie ein Aufkleber; eng unter dem Logo"],
    3: ["Angedockte Lasche", "Hängt an der Kopfzeile, gleicher Glasgrund, fährt beim Erscheinen darunter hervor.", "+ ruhig, eine Fläche mit der Kopfzeile", "− auf hellem Grund fast unsichtbar, verdeckt Inhalt wie 1"],
    4: ["Im Header (Smart Header)", "Beim Runterscrollen weichen die Menüpunkte den Brotkrumen; beim Hochscrollen oder mit der Maus auf der Kopfzeile sind sie sofort zurück. Der Fortschritt ist die Unterkante der Kopfzeile.", "+ verdeckt nichts, nutzt Platz, den es schon gibt", "− das Menü ist beim Runterscrollen kurz weg (ein Hauch nach oben holt es)"],
    5: ["Zweite Zeile", "Die Kopfzeile wächst beim Scrollen um eine 36-px-Leiste mit Pfad und „Nach oben“; Fortschritt als Unterkante.", "+ robust, viel Platz für lange Pfade", "− schwerer: 36 px mehr verdeckter Inhalt auf jeder Unterseite"]
  };
  var body = document.body, hdr = document.getElementById("hdr"), heroBc = document.getElementById("heroBc");
  var note = document.getElementById("note"), v = 1, lastY = 0, hoverHdr = false;
  var secs = [].slice.call(document.querySelectorAll(".sec"));
  function align() {
    var nav = document.querySelector(".nav"), inT = document.getElementById("inTrail");
    inT.style.marginLeft = (nav.getBoundingClientRect().left - hdr.querySelector(".hdr-in").getBoundingClientRect().left + 12) + "px";
  }
  addEventListener("resize", align);
  function set(n) {
    v = n;
    body.className = "m" + n;
    [].forEach.call(document.querySelectorAll("[data-v]"), function (el) { el.classList.toggle("on", el.getAttribute("data-v") === String(n)); });
    [].forEach.call(document.querySelectorAll("[data-set]"), function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-set") === String(n))); });
    var t = NOTES[n];
    note.innerHTML = "<b>" + t[0] + "</b>" + t[1] + '<div class="pc"><span>' + t[2] + "</span><span>" + t[3] + "</span></div>" + (n === 4 ? '<div class="rec">Meine Empfehlung: verdeckt nichts und braucht keinen neuen Platz.</div>' : "");
    try { history.replaceState(null, "", "#v" + n); } catch (e) {}
    tick();
  }
  function tick() {
    var y = window.scrollY, max = document.documentElement.scrollHeight - innerHeight;
    var p = max > 0 ? Math.min(1, y / max) : 0;
    document.documentElement.style.setProperty("--p", p.toFixed(4));
    hdr.classList.toggle("scrolled", y > 8);
    var show = heroBc.getBoundingClientRect().bottom < 72;
    body.classList.toggle("show", show);
    var name = "";
    secs.forEach(function (s) { if (s.getBoundingClientRect().top <= 160) name = s.querySelector(".eb").textContent; });
    [].forEach.call(document.querySelectorAll(".sec-name"), function (el) { el.textContent = name || "Handwerk"; });
    if (v === 4) {
      var down = y > lastY + 2, up = y < lastY - 6;
      if (!show || up || hoverHdr) body.classList.remove("crumbing");
      else if (down) body.classList.add("crumbing");
    }
    lastY = y;
  }
  hdr.addEventListener("mouseenter", function () { hoverHdr = true; body.classList.remove("crumbing"); });
  hdr.addEventListener("mouseleave", function () { hoverHdr = false; });
  addEventListener("scroll", tick, { passive: true });
  [].forEach.call(document.querySelectorAll("[data-set]"), function (b) { b.addEventListener("click", function () { set(+b.getAttribute("data-set")); }); });
  addEventListener("keydown", function (e) { if (/^[1-5]$/.test(e.key)) set(+e.key); });
  var m = /#v([1-5])/.exec(location.hash);
  set(m ? +m[1] : 1);
  addEventListener("hashchange", function () { var h = /#v([1-5])/.exec(location.hash); if (h && +h[1] !== v) set(+h[1]); });
  align();
})();
