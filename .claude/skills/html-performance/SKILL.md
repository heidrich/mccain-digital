---
name: html-performance
description: >
  Web-Performance für JEDES Webprojekt (statisches HTML, React/Next.js, Canvas/WebGL,
  Vercel): so BAUEN wir HTML-Seiten mit Animationen von Anfang an für PageSpeed 100
  (verbindliche Bauanleitung), und so messen, finden und beheben wir Probleme. IMMER
  anwenden, wenn eine neue Seite, Landingpage oder Sektion mit Animationen, Canvas oder
  Nachladen gebaut wird, vor dem ersten Deploy, nach jeder Änderung an Hero,
  Bildern, Fonts, Animationen, Nachladen oder content-visibility, und sobald PageSpeed,
  Lighthouse, Core Web Vitals (LCP, INP, CLS, TBT, FCP) oder "die Seite ruckelt/lädt
  langsam" auftauchen. Enthält die gesammelten Lehren und Widerlegungen aus den
  Projekten des Owners (mccain-digital v5: PageSpeed mobil 100) plus geprüfte Fakten
  zu Lighthouse 13 / PageSpeed Insights und eine Skript-Bibliothek zum Messen. CORE P1.
---

# html-performance — messen, verstehen, eingreifen, nachmessen

> Owner-Prioritäten bei Websites: **PageSpeed > SEO > A11y > CMS-Funktionalität** (globale CLAUDE.md).
> Zielwert des Owners: PageSpeed **mobil** ≥ 95, angestrebt 100; Desktop allein zählt nicht.
> Stand 2026-09-16. Dieser Skill wächst: neue Lehren kommen in `references/fallstudien.md`, dann als Regel in die passende Referenzdatei (siehe „Pflege“).

## Wann anwenden

- Vor dem ersten Deploy jeder Website und nach jeder Änderung an Hero, Headline-Wechseln, Bildern, Fonts, Animationen, Nachladen, `content-visibility`, Canvas/WebGL, Observern.
- Wenn ein PageSpeed-/Lighthouse-Wert fällt oder eine Metrik rot ist (LCP, INP, CLS, TBT, FCP, Speed Index).
- Wenn eine Optimierung geplant ist: erst messen, dann ändern. Eine Optimierung ohne Vorher-Zahl ist eine Vermutung.
- Bei jedem Verdacht „das ist doch offensichtlich schneller“ (Object Pooling, `will-change`, `scheduler.yield`, Preload für alles): erst `references/widerlegt.md` lesen.

Im Ablauf der Web-Skills ([[web-skills-suite]]) gilt dieser Skill zweimal: beim **Bauen** (Bauanleitung, bevor die erste Sektion entsteht) und als **Performance-Pass** zwischen Bauen und Browser-DoD ([[browser-verify]]); der Post-Deploy-Audit läuft weiter über [[audit-website]].

## Neu bauen: die Bauanleitung ist verbindlich

Für jede neue HTML-Seite mit Animationen gilt `references/bauanleitung.md`: Reihenfolge im `<head>`, Sektionsgerüst mit `content-visibility` auf dem inneren Wrapper, ein LCP-Bild mit `fetchpriority`, alles andere lazy, Animationen nur auf `transform`/`opacity` mit Halten nach dem Laden und Pause außerhalb des Viewports, Canvas/WebGL erst nach dem ersten Paint, JavaScript als ein kleines `defer`-Modul, das nichts Unsichtbares in den ersten 10 s lädt, Build-Assertions und die Prüfsequenz vor dem Push. Abweichungen werden gemessen begründet, nicht behauptet.

Die 20 Bauregeln in Kurzform (Details, Begründung und Code in `references/bauanleitung.md`):

| Nr. | Regel | Abschnitt |
| --- | --- | --- |
| 1 | Eine Headline, keine Rotation; kein Element wechselt nach dem Laden zu etwas Größerem | 0 |
| 2 | Above the fold ist statisches HTML im Endzustand, ohne Reveal-Animation | 0 |
| 3 | Motion-Budget vor dem ersten Pixel: Zahl der Endlos-Animationen, keine außerhalb des Viewports | 0 |
| 4 | Geräteklassen per `matchMedia` trennen (`hover`/`pointer`, `min-width`, `prefers-reduced-motion`), Telefone bekommen keine Dekoration | 0 |
| 5 | Messkette ab Tag 1: `prodserve.py`, Skripte, PSI; Budget als Zahlen (Requests ≤ 15 in 12 s, DOM ≤ 2.300, IO-Ziele ≤ 30) | 0 |
| 6 | `<head>`: Fonts self-hosted, nur die 1–2 sichtbaren Schnitte preloaden, genau ein Preload für das LCP-Bild, sonst keines | 1 |
| 7 | Seiten-CSS inline in einem `<style>`; kein `preload`+`onload`-Swap für layoutrelevantes CSS | 1 |
| 8 | Wenige kleine `defer`-Skripte (v5: Logik, Verdrahtung, Motion-Budget), keine Runtime-Bibliothek im kritischen Pfad, Drittanbieter erst nach Consent | 1 |
| 9 | `content-visibility:auto` auf dem inneren Inhalts-Wrapper nach dem Hintergrund-Layer, nie auf einer Sektion mit Negativ-Z-Grund | 2 |
| 10 | `contain-intrinsic-size` pro Sektion und Breite aus gemessenen Inhaltshöhen (`cv-heights.mjs`, ohne Padding), nie pauschal | 2 |
| 11 | Genau ein Bild mit `fetchpriority="high"`; alles andere `loading="lazy" decoding="async"` mit festen Maßen | 3 |
| 12 | Geschlossene Panels `content-visibility:hidden`; geräte-exklusiver Deko-DOM in `<template>` | 3 |
| 13 | Nur `transform`/`opacity`(/`filter`) animieren, nie `top`/`width`/`color`/`box-shadow` | 4 |
| 14 | Endlos-Animationen halten ~6 s nach dem Laden und laufen nur im Bild; Einblender sofort | 4 |
| 15 | `prefers-reduced-motion` schaltet Dekoration ganz ab | 4 |
| 16 | Canvas/WebGL in einen Worker (`OffscreenCanvas`), Start erst nach dem `first-contentful-paint`-Eintrag, davor CSS-Verlauf; ohne Worker bewusst vor FCP lassen, nie nur per rAF aufschieben (verschiebt die Blockade in TBT) | 5 |
| 17 | DPR und Auflösung deckeln, Zeichnen pausiert außerhalb Sicht und Tab, Framerate adaptiv mit Backoff | 5 |
| 18 | Layout-Werte aus einem Scroll-/Resize-Cache, nie pro Frame lesen; Beobachtungsziele bündeln und erst beobachten, wenn der Block rendert | 6 |
| 19 | Build-Assertions erzwingen die Regeln (eine Headline, lazy Marks, Panel hidden, Template, keine eager Scripts) | 7 |
| 20 | Vor jedem Push die volle Skript-Kette gegen `prodserve.py`, beide Formfaktoren, Zahlen ins HANDOFF | 8 |

Erst bauen, dann messen (Ablauf unten), dann das Tor. Wer eine bestehende Seite optimiert, beginnt beim Ablauf.

## Die zehn Grundsätze

1. **Zeitachse statt Summe.** Nicht „wie viel Hauptthread insgesamt“, sondern **wann** etwas passiert. Ein Trace in 250-ms-Scheiben zeigt, was in den ersten 10 s läuft und dort nichts zu suchen hat. (`scripts/mainthread.mjs --slices`)
2. **Nichts Unsichtbares in den ersten Sekunden.** Was der Besucher nicht sieht, wird weder geladen noch gerendert noch beobachtet: Bilder unter der Falz `loading="lazy"`, geschlossene Menüs `content-visibility:hidden`, Sektionen unterhalb `content-visibility:auto`, Zusatzskripte erst bei Interaktion oder Idle.
3. **Nach dem ersten Bild darf nichts Größeres mehr erscheinen.** Jeder spätere, größere Paint wird zum neuen LCP-Kandidaten, solange der Trace läuft und kein Klick/Tap/Tastendruck/Scroll kam (Mausbewegung zählt nicht). Rotierende Headlines, späte Reveals, nachgeladene Hero-Bilder sind LCP-Fallen. (mccain-digital 16.9.2026: 95 → 60 durch Hero-Rotation.)
4. **Keine Dauerlast nach dem Laden.** Endlos-Animationen, Polling, `requestAnimationFrame`-Schleifen ohne Sichtbarkeitsprüfung, Layout-Lesen pro Frame: alles verhindert die Ruhe, die TTI/TBT und der Lighthouse-Trace brauchen, und kostet Akku.
5. **Der erste Paint hängt an nichts Schwerem.** Kein WebGL/Canvas, kein Font-Block, kein synchrones Skript im kritischen Pfad. Ohne GPU verzögert ein WebGL-Hintergrund den ersten Paint von 188 ms auf 2,2 s (gemessen).
6. **Lesen und Schreiben trennen.** Layout-Werte (`scrollY`, `innerWidth`, `getBoundingClientRect`, `offset*`) kommen aus Scroll-/Resize-Events in einen Cache, nie pro Frame nach einem DOM-Schreibzugriff. Schleifen starten mit der ersten `ResizeObserver`-Meldung.
7. **Beobachten kostet pro Ziel, nicht pro Observer.** 132 → 25 IntersectionObserver-Ziele halbierten „Other“. Ziele in übersprungenen `content-visibility`-Blöcken erst beobachten und vermessen, wenn der Block rendert (`contentvisibilityautostatechange`, `skipped === false`).
8. **Produktionsnah messen.** Lokal nur gegen einen Server mit echten Cache- und Kompressionsheadern (`scripts/prodserve.py`), mobil mit Touch-Emulation, CPU-Drosselung als Stresstest (PSI rechnet mit 1,2×), nie während anderes auf der Maschine läuft.
9. **Eine Änderung, eine Messung, ein Tor.** Vorher-Zahl, Eingriff, Nachher-Zahl, dann das Prüf-Tor (Funktions- und Stacking-Checks). Zwei Änderungen auf einmal lassen sich nicht zuordnen.
10. **Echte Zahlen vor Vermutungen.** Was Gemini, ein Blog oder das Bauchgefühl vorschlägt, wird gemessen. Drei „offensichtliche“ Vorschläge waren 2026 messbar wirkungslos (`references/widerlegt.md`).

## Ablauf

1. **Messen (Ist-Stand).** PageSpeed Insights mobil + Desktop auf der Live- oder Preview-URL. Lokal: `scripts/lighthouse-psi.mjs <url>` (PSI-Einstellungen) und `scripts/lcp-window.mjs <url> --for 30` (LCP-Kandidaten über die Zeit, Long Tasks, TTI/TBT/CLS). Zahlen notieren.
2. **Ursache finden.** Je nach Symptom:
   - LCP spät oder wandert → `lcp-window.mjs`, `requests.mjs` (was lädt wann, sichtbar?), `references/laden-kritischer-pfad.md`
   - TBT/„Other“ hoch, Seite wird nicht ruhig → `mainthread.mjs --slices`, `observers.mjs`, `animations.mjs`, `references/rendern-hauptthread.md`, `references/rendern-animationen.md`
   - Ruckeln, Canvas/WebGL → `fps.mjs --cpu 1,4 --software-gl`, `references/rendern-canvas-webgl.md`
   - `content-visibility` im Spiel → `cv-audit.mjs` (Stacking-Falle, Platzhalterhöhen, 150-%-Rand); meldet er Höhen-Drift, liefert `cv-heights.mjs` die gemessenen Werte je Breite
   - Lighthouse-Insight rot (forced reflow, render-blocking, font display …) → `references/lighthouse-psi.md`
3. **Eingreifen.** Die kleinste Änderung, die die Ursache trifft. Regeln und Code-Muster stehen in den drei `laden-*`- und drei `rendern-*`-Referenzen (Regelindex unten); für React/Next.js zusätzlich `references/react-nextjs.md`.
4. **Nachmessen.** Dieselben Skripte, dieselben Bedingungen, ruhige Maschine. Beide Formfaktoren. Zahlen neben die Vorher-Zahlen.
5. **Tor und Doku.** Funktions-/Stacking-Tor des Projekts, `CHANGELOG`, HANDOFF mit Zahlen. Nach dem Deploy: PageSpeed erneut, `squirrel audit` ([[audit-website]]). Neue Lehre? → „Pflege“.

## Zielwerte

| Metrik | Gut (CrUX p75) | Lighthouse-Gewicht | Hinweis |
| --- | ---: | ---: | --- |
| LCP | ≤ 2,5 s | 25 % | Text-LCP: Render-Delay ist der Hebel; Bild-LCP: `fetchpriority="high"`, nie lazy |
| INP | ≤ 200 ms | 0 % (nur Feld) | Ersetzt FID seit März 2024; im Lab-Score nicht enthalten |
| CLS | ≤ 0,1 | 25 % | Maße für Bilder/Embeds, Font-Fallbacks metrisch anpassen, keine späten Einschübe oben |
| TBT | ≤ 200 ms | 30 % | Σ(Task − 50 ms) zwischen FCP und TTI; TTI braucht 5 s ohne Long Task und ≤ 2 Requests |
| FCP | ≤ 1,8 s | 10 % | Kritisches CSS, Fonts, kein Canvas im kritischen Pfad |
| Speed Index | ≤ 3,4 s | 10 % | Sichtbarer Fortschritt; leidet unter spätem ersten Paint |

PageSpeed Insights misst mit Lighthouse-Lightrider-Einstellungen: `simulate`, Moto G Power (412×823, DSF 1,75), Slow 4G (150 ms RTT, 1,6 Mbit/s), CPU 1,2×, Ruhefenster 1 s, `maxWaitForLoad` 35 s. Die DevTools/CLI-Voreinstellung (CPU 4×, Ruhefenster 5,25 s bei `devtools`) ist ein anderes, strengeres Fenster. Details: `references/lighthouse-psi.md`.

## Fehlerkatalog (die teuersten Fallen zuerst)

| Woran man es erkennt | Regel | Fix | Details |
| --- | --- | --- | --- |
| Hoher LCP, obwohl das LCP-Element selbst klein/früh ist | content-visibility:auto überspringt Layout/Paint für Nicht-Sichtbares und senkt LCP messbar. | content-visibility: auto (mit contain-intrinsic-size) auf lange Off-Screen-Sektionen, fixierte Over… | [Hauptthread](references/rendern-hauptthread.md#1-content-visibility-auto-auf-lange-off-screen-sektionen-anwenden) |
| Fixierter Hintergrund-Canvas verschwindet hinter Sektionen mit eigenem negativ gestacktem Grund-Layer | Negative z-index-Layer in einer content-visibility-Sektion können nicht mehr mit einem außen fixier… | content-visibility auf inneren Inhalts-Wrapper setzen, nicht auf die Sektion selbst; Build-Guard ge… | [Hauptthread](references/rendern-hauptthread.md#4-content-visibility-erzeugt-einen-stacking-context-und-einen-containing-block) |
| Beobachter/Nachladen laufen unabhängig davon, ob ihr Block gerade gerendert ist | Arbeit pro Sektion an das Event koppeln statt an Timer-Polling; checkVisibility nur für den initial… | contentvisibilityautostatechange abonnieren, checkVisibility({contentVisibilityAuto:true}) als Star… | [Hauptthread](references/rendern-hauptthread.md#6-auf-contentvisibilityautostatechange-hören-checkvisibility-nur-als-start-fallback) |
| Ressourcen (z.B. Masken-Bilder) laden früher als erwartet trotz übersprungenem Block | Nicht jedes observe() im Skip-Bereich erzwingt Arbeit; Layout-Reads auf Knoten darin schon, und lad… | Container statt Kinder beobachten, erst messen wenn der Block rendert, nie getBoundingClientRect/of… | [Hauptthread](references/rendern-hauptthread.md#7-intersectionobserver-in-einem-content-visibility-block-die-korrigierte-regel) |
| scripts/observers.mjs zeigt hohe Zielzahl über wenige Observer-Instanzen | computeIntersections kostet pro beobachtetem Ziel, ein Observer mit 400 Zielen kostet wie 400 Obser… | Ziele auf gemeinsame Container statt jedes animierte Einzelelement bündeln | [Hauptthread](references/rendern-hauptthread.md#16-intersectionobserver-kosten-skalieren-mit-der-zielzahl-nicht-der-instanzzahl) |
| Hoher TBT ohne einzelnen auffälligen Task, korreliert mit Tippgeschwindigkeit | Jede Mutation einer Typewriter-Animation löst eine dokumentweite Query aus. | Observer eng scopen oder einmaligen Durchlauf auf DOMContentLoaded statt Dauer-Observer | [Hauptthread](references/rendern-hauptthread.md#20-mutationobserver-mit-subtreetrue-neben-hochfrequenten-textänderungen-treibt-tbt-hoch) |
| scripts/mainthread.mjs zeigt hohe Other- und Gesamtzeit im ersten 10-12s-Fenster | Zu viele gleichzeitig aktive Beobachter/Effekte im Ladefenster summieren sich zu spürbarer Hauptthr… | Beobachter bündeln, schwere Engines erst bei Interaktion/Timeout laden, Deko aus dem initialen DOM;… | [Hauptthread](references/rendern-hauptthread.md#22-nicht-kritische-beobachter-und-schwere-effekte-erst-nach-interaktion-aktivieren) |
| Vergleich zweier Rendering-Ansätze zeigt nahezu identische Other-Werte bei geteilter Ursache | Other ist nur RunTask/ProcessTaskFromWorkQueue/DoWork; Object Pooling, will-change und scheduler.yi… | Vor Other-Optimierung prüfen ob RunTask/ProcessTaskFromWorkQueue/DoWork wirklich sinkt, nicht GC/Co… | [Hauptthread](references/rendern-hauptthread.md#26-other-im-trace-richtig-einordnen--und-wissen-was-es-nicht-senkt) |
| Hoher TBT bei einer Seite mit fast keiner Skript-Auswertungszeit | Style-Auflösung und Layout von tausenden Inline-Attributen kosten TBT unabhängig von Skript-Ausführ… | Wiederkehrende Inline-Styles als Klassen in ein gemeinsames Stylesheet auslagern | [Hauptthread](references/rendern-hauptthread.md#27-tausende-individuelle-inline-styles-kosten-tbt-auch-ganz-ohne-javascript) |
| Konsolenfehler pro Platzhalter-Attribut, doppelt geladene Ressourcen, zu hohe Elementzahl beim Parsen | Ein Custom-Element mit lebendigem Platzhalter-Teilbaum rendert eine unsichtbare Zweitkopie der ganz… | Platzhalter-Markup in <template> kapseln statt als lebendigen Teilbaum auszuliefern | [Hauptthread](references/rendern-hauptthread.md#28-platzhalter-markup-gehört-in-ein-inertes-template-nie-in-einen-lebendigen-custom-element-teilbaum) |
| LCP hoch, aber unklar warum | LCP hat vier Phasen mit je eigenem Fix — nicht pauschal optimieren | Phase per DevTools-Breakdown identifizieren, phasenspezifisch fixen | [Kritischer Pfad](references/laden-kritischer-pfad.md#1-lcp-in-vier-phasen-denken-und-pro-phase-gezielt-eingreifen) |
| LCP-Element ist Text oder Bild, generischer Fix greift nicht | Text-LCP hängt am Font, Bild-LCP an Auffindbarkeit im HTML | Font preloaden (Text) bzw. Quelle im Server-HTML sichtbar halten (Bild) | [Kritischer Pfad](references/laden-kritischer-pfad.md#2-text-lcp-und-bild-lcp-brauchen-unterschiedliche-hebel) |
| FCP >2 s nur in Software-GL/Headless, Lighthouse liefert NO_FCP unter Last | Ohne GPU blockiert getContext(webgl) den ersten Paint um ~2 s | `OffscreenCanvas` im Worker, Start nach dem FCP-Eintrag, CSS-Fallback bis dahin; ein Aufschub per rAF bringt keinen früheren FCP, sondern 2,3 s Long Task nach FCP (TBT) | [Kritischer Pfad](references/laden-kritischer-pfad.md#3-der-erste-paint-darf-nicht-von-webgl-canvas-oder-dem-gpu-prozess-abhängen) |
| mehrere fetchpriority=high pro Seite, oder high+lazy am selben Bild | high sparsam (1–2 Bilder), low für Karussell-Nachbarn, nie high+lazy kombiniert | high nur aufs LCP-Bild, low fürs Karussell, Rest lazy+async | [Kritischer Pfad](references/laden-kritischer-pfad.md#4-fetchpriority-gezielt-und-sparsam-einsetzen-nie-zusammen-mit-loadinglazy-auf-demselben-bild) |
| PSI-Score bricht ohne Codeänderung ein, LCP-Element wechselt zwischen Läufen | Browser meldet größere LCP-Kandidaten bis zur ersten Interaktion weiter | nichts nach dem ersten Render größer als den LCP-Kandidaten einsetzen | [Kritischer Pfad](references/laden-kritischer-pfad.md#5-nach-dem-ersten-render-darf-kein-element-größer-werden-als-der-lcp-kandidat) |
| externer CSS-Request blockiert den ersten Render, oder Inline-Block ist riesig | Above-the-fold-CSS inline, Rest in eine cachebare Datei auslagern | kritisches CSS klein inline, Design-System in geteilte Datei | [Kritischer Pfad](references/laden-kritischer-pfad.md#6-kritisches-css-inline-den-rest-auslagern--und-den-trade-off-kennen) |
| verschachtelte @import-Ketten im CSS, serielle Requests im Waterfall | @import lädt seriell, <link> lädt parallel — −32,7 % FCP im Praxisbeispiel | @import durch <link rel=stylesheet> ersetzen oder zur Build-Zeit bundlen | [Kritischer Pfad](references/laden-kritischer-pfad.md#7-import-in-css-vermeiden) |
| Theme-Flash beim Laden, oder Kontrast/Canvas-Farbe nur beim ersten Element falsch | Theme-Flag im Head vor dem Stylesheet setzen, sonst falsche Farben in der Transition | Theme per Inline-Script im <head> vor dem Stylesheet setzen | [Kritischer Pfad](references/laden-kritischer-pfad.md#9-ein-persistiertes-theme-flag-gehört-synchron-inline-in-den-head-vor-dem-ersten-stylesheet) |
| Mehrere largestContentfulPaint::Candidate-Events im Trace statt einem; LCP wandert nach spät erscheinenden, g… | Ein neuer, größerer Paint wird LCP-Kandidat, bis Klick/Tap/Taste/Scroll kommt — in einem automatisi… | Fix siehe laden-kritischer-pfad.md, Regel 5 — kein Element darf nach dem ersten sichtbaren Laden größer neu erscheinen. | [Lighthouse/PSI](references/lighthouse-psi.md#1-rechne-mit-einem-neuen-lcp-kandidaten-bis-klick-tap-taste-oder-scroll) |
| Falsche Erwartung, PSI schließe das Messfenster nach ~5,25 s — widerlegte Annahme aus HANDOFF.md. | Die 5250-ms-Ruhefenster gelten nur für throttlingMethod≠simulate; PSI bleibt immer bei simulate mit… | n/a — 35-s-Obergrenze statt 5,25 s im Kopf behalten. Details: widerlegt.md. | [Lighthouse/PSI](references/lighthouse-psi.md#2-rechne-beim-psi-standard-mit-1000-ms-ruhefenster-nicht-5250-ms) |
| Long Task nach der 5-s-Marke im mainthread.mjs/lcp-window.mjs-Report. | TTI braucht 5 s ohne Long Task und ≤2 Requests; eine späte Long Task setzt diesen Timer zurück und… | Fix siehe laden-javascript.md (Regel 4) und rendern-hauptthread.md (Regel 22) — deferred Code ereignisgetrieben statt gebündelt initialisieren. | [Lighthouse/PSI](references/lighthouse-psi.md#3-rechne-damit-dass-eine-späte-aufgabe-das-tti-fenster-neu-startet) |
| Lokaler Trace endet bei simulate ~2,4 s, bei devtools ~13,3 s — beide vor/knapp vor der 13,5-s-Rotation; kein… | Der 95→60-Fall (rotierende Headline, PSI-LCP 20,5 s) reproduzierte sich in keiner von sechs lokalen… | Nicht als 'kein Bug' werten; vier Kandidaten (VM-Timing, Near-Miss devtools, echte lr-Config fehlt,… | [Lighthouse/PSI](references/lighthouse-psi.md#4-verlass-dich-bei-einer-psi-regression-nicht-auf-einen-stillen-lokalen-lauf) |
| Zehn Stunden Summenanalyse fanden den Engpass nicht; erst 250-ms-Scheiben zeigten eine einzelne 466-von-510-m… | Eine Summe zeigt nur DASS der Hauptthread beschäftigt war, nie WANN welche Phase dominiert. | node scripts/mainthread.mjs <url> --slices | [Messen](references/messen-methode.md#1-miss-in-250-ms-zeitscheiben-nicht-in-summen-über-den-ganzen-lauf) |
| Hover auf Lab-Seite maß „nichts Messbares"; Scroll auf echter Seite maß 50 ms Median, 65% Frames > 20 ms. | Eine Messung gilt strikt nur für die konkrete Seite und Geste, mit der gemessen wurde. | Auf der echten Ziel-URL mit der echten Geste messen (--scroll bei scripts/fps.mjs), Instrument vorh… | [Messen](references/messen-methode.md#2-miss-exakt-die-seite-und-die-geste-mit-der-ausgeliefert-wird) |
| Score blieb über drei Shipping-Stände bei 68-71, während Hauptthread-Zeit stetig von 4.210 auf 3.910 ms sank. | Ein einzelnes Vorher/Nachher-Delta vermischt Ursachen; der Score allein kann eine stetige Verbesser… | Vor einem Fix die theoretische Obergrenze messen (Feature abschalten); Ursachen über kontrollierte… | [Messen](references/messen-methode.md#5-kontrollierte-zwischenzustände-und-die-theoretische-obergrenze-messen-nicht-nur-ein-vorhernachher) |
| Verzeichnis-Routen liefen unkomprimiert, weil Route erst nach der Kompressionsprüfung auf index.html aufgelös… | Ein unkomprimierter Server macht eine Seite bis zu 6,8x zu schwer. | python3 scripts/prodserve.py <ordner> 8897 (ohne --dev), Header aus vercel.json spiegeln. | [Messen](references/messen-methode.md#6-gegen-einen-produktionsnahen-server-messen-nie-gegen-den-blanken-dev-server) |
| Niedriger Performance-Score trotz SSR, unklar ob Bibliothek oder Hydration schuld ist | Die React-Bibliothek kostet 1 Punkt, ein falsches Hydrationsverfahren 21 | Drei Varianten isoliert messen: nur HTML, Bibliothek ungebootet, wie ausgeliefert | [React/Next](references/react-nextjs.md#1-bibliothekskosten-und-hydrationskosten-getrennt-messen-die-bibliothek-kostet-1-punkt-falsche-hydration-21) |
| React-Fehler #418/#425/#423, Rückfall auf volles Client-Rendering | Ein DOM-Snapshot nach Laufzeit ist kein React-Server-Rendering | renderToString() zur Bauzeit statt Headless-Browser-Snapshot, dann hydrateRoot | [React/Next](references/react-nextjs.md#2-ein-nachträglicher-headless-browser-dom-abzug-ist-kein-ssr--hydrateroot-schlägt-daran-zwangsläufig-fehl) |
| CLS-Regression trotz 'pixelidentischem' finalem Rendering; Nav-Layout springt kurz beim Stylesheet-Swap. | Glaube: preload→onload-CSS-Swap vermeidet render-blocking ohne Nachteil — Realität: FOUC-Reflow bei… | Layoutrelevantes CSS render-blocking oder inline lassen, async-Swap nur für nicht-layoutrelevante S… | [Widerlegt](references/widerlegt.md#1-async-css-swap-per-preload-und-onload-ist-eine-sichere-optimierung) |
| Keine Veränderung in FCP/LCP nach dem Inlinen. | Glaube: fonts.css in den head inlinen bringt Ladevorteil — Realität: gemessen ohne Wirkung. | Nicht ungeprüft inlinen; vor/nach messen statt vermuten. | [Widerlegt](references/widerlegt.md#2-fontscss-inline-ziehen-verbessert-die-performance) |

30 Zeilen, nach Wirkung gewichtet (Rendern 10, Laden 8, Lighthouse/PSI, Messen, React/Next, Widerlegt). Jede Referenzdatei listet alle ihre Regeln in `## Kurzfassung`.

## Werkzeuge

Skript-Bibliothek in `scripts/` (Node 22, `playwright-core`, ein vorhandenes Chromium; einmal pro Maschine `npm install` im Ordner `scripts/`; Chromium aus dem ms-playwright-Cache oder per `HP_CHROME`). Alle Skripte: `<url>` als erstes Argument, `--help`, `--json`, `--mobile` (Touch + isMobile), `--cpu N`.

| Skript | Frage | Typischer Aufruf |
| --- | --- | --- |
| `lighthouse-psi.mjs` | Was sagt Lighthouse mit PSI-Einstellungen, beobachtet vs. simuliert, wann endete der Trace? | `node scripts/lighthouse-psi.mjs <url> [--desktop] [--method devtools]` |
| `lcp-window.mjs` | Welches Element ist wann LCP-Kandidat, wird die Seite je ruhig (TTI/TBT), wo sind Layout-Shifts? | `node scripts/lcp-window.mjs <url> --for 30 [--mobile --cpu 4 --software-gl]` |
| `mainthread.mjs` | Wohin gehen die Hauptthread-Millisekunden, was steckt in „Other“, wann ist die Seite beschäftigt? | `node scripts/mainthread.mjs <url> --for 12 --cpu 4 --slices` |
| `requests.mjs` | Was lädt wann, wie groß, doppelt, und sieht man es überhaupt? | `node scripts/requests.mjs <url> --for 12 [--interact 6]` |
| `observers.mjs` | Wer beobachtet wie viele Ziele, wer liest Layout, wer pollt? | `node scripts/observers.mjs <url> --for 15 [--sweep]` |
| `cv-audit.mjs` | Was tut `content-visibility` wirklich: Zustände, Stacking-Falle, Platzhalterhöhen, Umschaltabstand? | `node scripts/cv-audit.mjs <url> [--mobile]` |
| `cv-heights.mjs` | Wie hoch ist jede `content-visibility`-Sektion wirklich, je Breite? Liefert fertige `contain-intrinsic-size`-Regeln für den Build | `node scripts/cv-heights.mjs <url> [--widths 412,768,1024,1350]` |
| `animations.mjs` | Was animiert, wie lange, sichtbar oder nicht, Compositor oder Hauptthread? | `node scripts/animations.mjs <url> --sweep [--reduced-motion]` |
| `fps.mjs` | Hält die Seite ihre Bildrate unter CPU-Last und ohne GPU, drosselt sie sich selbst? | `node scripts/fps.mjs <url> --for 8 --cpu 1,4 --software-gl` |
| `prodserve.py` | Lokaler Server mit Produktionsheadern (gzip, Cache, CSP aus `vercel.json`) | `python3 scripts/prodserve.py <ordner> 8897 [--headers vercel.json]` |

Dazu: PageSpeed Insights (Feld- und Labdaten), Chrome DevTools Performance-Panel (Insights „Forced reflow“, „LCP breakdown“), `squirrel audit <url> -C surface --refresh --format llm` nach dem Deploy ([[audit-website]]). Wie man die Ergebnisse liest: `references/messen-methode.md`, `references/messen-lighthouse-fenster.md`, `references/messen-hauptthread-observer.md`.

## Vor jedem Push

- [ ] PageSpeed mobil ≥ 95 (Ziel 100) auf Preview oder lokal `lighthouse-psi.mjs`; Desktop grün
- [ ] `lcp-window.mjs --for 30`: genau ein LCP-Kandidat nach dem ersten Bild, keiner > 3 s nach FCP; TTI erreicht; CLS ≤ 0,1
- [ ] `requests.mjs`: nichts lädt in den ersten Sekunden, was nicht sichtbar ist; keine Duplikate; Bild-Maße gesetzt
- [ ] `mainthread.mjs --slices`: nach 5 s keine Long Tasks; „Other“ nicht dominant
- [ ] `observers.mjs`: keine Ziele in übersprungenen Blöcken, kein Polling, keine Layout-Lesungen pro Frame
- [ ] `animations.mjs`: keine Endlos-Animation außerhalb des Viewports, `prefers-reduced-motion` respektiert
- [ ] Bei `content-visibility`: `cv-audit.mjs` ohne Stacking- oder Höhen-Befund
- [ ] Bei Canvas/WebGL: `fps.mjs --software-gl` ohne Einbruch des ersten Paints; Schleife pausiert außerhalb des Viewports
- [ ] Projekt-Tor (Funktion, Stacking, Konsole) grün, CHANGELOG aktualisiert, Zahlen im HANDOFF

## Was NICHT tun

- Keine Headline- oder Hero-Rotation, keine späten größeren Einblendungen (LCP wandert).
- Kein `will-change`/`translateZ(0)` auf einem WebGL-Canvas, kein Object Pooling gegen „Other“, kein `scheduler.yield` als „Other“-Fix: gemessen wirkungslos, Mechanismus in `references/widerlegt.md`.
- Kein Messen gegen `python -m http.server` oder einen `no-store`-Dev-Server: 6,8× zu schwere Seiten, doppelte Downloads.
- Kein `next/dynamic` für die Hero-Sektion (das LCP-Element), kein Custom Image Loader statt Vercel Edge CDN.
- Keine Desktop-Zahl als Beleg: Mobil ist die Zahl, die zählt.
- Keine Messung, während andere Browser, Builds oder Agenten die Maschine auslasten (NO_FCP, erster Paint bei 125 s beobachtet).
- Kein ESLint-Ausnahme-Kommentar, kein „TODO später“ für eine Performance-Regression: sofort beheben oder ausdrücklich als Scope-Entscheidung melden.

## Referenzen

| Datei | Inhalt |
| --- | --- |
| `references/bauanleitung.md` | **Verbindlich für neue Seiten:** so bauen wir HTML mit Animationen für PageSpeed 100, Schritt für Schritt mit Code |
| `references/messen-methode.md` | Messen 1/3: Grundmethode, produktionsnah messen, ruhige Maschine, Fehlerkanäle/Wächter-Zuverlässigkeit, Prozess |
| `references/messen-lighthouse-fenster.md` | Messen 2/3: Lighthouse-CLI/PSI/DevTools, observed vs. simuliert, Messfenster, TTI/TBT |
| `references/messen-hauptthread-observer.md` | Messen 3/3: Hauptthread lesen, Beobachter, content-visibility messen, fps/Software-GL, Mobile-Emulation |
| `references/lighthouse-psi.md` | Wie Lighthouse 13 und PSI bewerten: Metriken, Gewichte, Insights, CrUX, PSI lokal nachstellen |
| `references/laden-kritischer-pfad.md` | Laden 1/3: LCP-Pfad, kritisches CSS, Fonts, Bilder |
| `references/laden-javascript.md` | Laden 2/3: JavaScript-Ladereihenfolge, Nachladen, Bibliotheken, Resource Hints |
| `references/laden-auslieferung.md` | Laden 3/3: Caching, Kompression, bfcache, Build-Pipeline |
| `references/rendern-hauptthread.md` | Laufzeit 1/3: content-visibility, Forced Reflow, Observer, Hauptthread/„Other“, DOM-Größe |
| `references/rendern-animationen.md` | Laufzeit 2/3: CSS-/JS-Animationen, will-change, reduced-motion, Scroll-Choreografien |
| `references/rendern-canvas-webgl.md` | Laufzeit 3/3: Canvas/WebGL, getContext, GPU-Prozess, Raster-Techniken |
| `references/react-nextjs.md` | Framework-Delta: Hydration/SSR, Next.js-Regeln, GSAP, Vercel; veraltete Skill-Aussagen |
| `references/widerlegt.md` | Was nicht stimmt: widerlegte und präzisierte Annahmen mit Beleg |
| `references/fallstudien.md` | Datiertes Fall-Log mit Zahlen: warum die Regeln so lauten |

## Regelindex

Jede Referenzdatei beginnt mit einer `## Kurzfassung`, die alle Regeln als Liste mit Ankern zeigt (1–2k Tokens). Erst dort nachsehen, dann gezielt eine Regel lesen.

- [bauanleitung.md](references/bauanleitung.md#kurzfassung) — 20 Bauregeln, 10 Abschnitte
- [messen-methode.md](references/messen-methode.md#kurzfassung) — 26 Regeln
- [messen-lighthouse-fenster.md](references/messen-lighthouse-fenster.md#kurzfassung) — 12 Regeln
- [messen-hauptthread-observer.md](references/messen-hauptthread-observer.md#kurzfassung) — 20 Regeln
- [lighthouse-psi.md](references/lighthouse-psi.md#kurzfassung) — 24 Regeln
- [laden-kritischer-pfad.md](references/laden-kritischer-pfad.md#kurzfassung) — 29 Regeln
- [laden-javascript.md](references/laden-javascript.md#kurzfassung) — 16 Regeln
- [laden-auslieferung.md](references/laden-auslieferung.md#kurzfassung) — 19 Regeln
- [rendern-hauptthread.md](references/rendern-hauptthread.md#kurzfassung) — 33 Regeln
- [rendern-animationen.md](references/rendern-animationen.md#kurzfassung) — 16 Regeln
- [rendern-canvas-webgl.md](references/rendern-canvas-webgl.md#kurzfassung) — 25 Regeln
- [react-nextjs.md](references/react-nextjs.md#kurzfassung) — 30 Regeln
- [widerlegt.md](references/widerlegt.md#kurzfassung) — 60 Regeln
- [fallstudien.md](references/fallstudien.md#kurzfassung) — 25 datierte Fälle, neueste zuerst

## Pflege (der Skill wächst)

1. Nach jeder Performance-Runde: Fall mit Datum, Projekt, Vorher/Nachher-Zahlen und Werkzeug in `references/fallstudien.md` eintragen (neueste zuerst).
2. Gilt die Lehre über das Projekt hinaus, wird sie eine Regel in der passenden `laden-*`-, `rendern-*`- oder `messen-*`-Datei oder in `lighthouse-psi.md` (Form: Regel · Warum · Woran man es erkennt · Fix · Beleg · Gilt für) und eine Zeile im Fehlerkatalog oben.
3. Stellt sich eine Annahme als falsch heraus, kommt sie in `widerlegt.md`, mit Herkunft und Beleg. Vermutungen werden als „vermutet“ markiert, bis sie gemessen sind.
4. Braucht die Runde ein neues Messwerkzeug, wird es generisch (URL, `--for`, `--cpu`, `--mobile`, `--json`, `--help`) in `scripts/` abgelegt und gegen zwei verschiedene Seiten getestet.
5. Lighthouse-Version und Chrome-Version der Messung notieren; Schwellen und Insights ändern sich mit Major-Versionen (Stand hier: Lighthouse 13.4.1, Chrome 148).
6. Der Skill liegt im Sync-Repo `~/.claude` (heidrich/dotclaude). Änderungen dort committen und pushen, damit jede Maschine denselben Stand hat; Projekte, die eine Kopie tragen, aktualisieren sie aus dieser Quelle.
