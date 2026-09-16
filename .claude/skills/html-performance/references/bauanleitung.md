# Bauanleitung: HTML-Seiten mit Animationen, die PageSpeed 100 halten — html-performance

> Teil des Skills [[html-performance]] · Stand 2026-09-16 · Belege: mccain-digital (HANDOFF, v5/home.js, tools/motion-budget.js, tools/v5build.mjs, v5/index.html), Chromium-Quellcode, eigene Messungen mit Lighthouse 13.4.1 / Chrome for Testing 148.
> Diese Anleitung ist verbindlich für neue Seiten; Abweichungen werden gemessen begründet.

Diese Datei ist die Bauanleitung, nicht der Diagnose-Pfad. Wer eine bestehende Seite repariert, misst zuerst (`SKILL.md` → Ablauf) und liest dann gezielt nach. Wer neu baut, arbeitet die Abschnitte 0–8 der Reihe nach ab. Referenz-Fundament ist `v5/` in mccain-digital — die einzige Seite des Owners, die PageSpeed mobil **100** erreicht hat (16.9.2026, PSI, Lighthouse 13.4.1, Moto G Power: Performance 100 · A11y 100 · Best Practices 100 · FCP 0,9 s · LCP 1,6 s · TBT 10 ms · CLS 0,002 · Speed Index 2,0 s; SEO 69 kommt allein vom bewussten `noindex` einer Preview-Seite).

## Kurzfassung

- **Eine Headline, keine Rotation.** Kein Element, das nach dem Laden zu etwas Größerem wechselt. ([→](#0-bevor-gebaut-wird))
- **Above the fold ist statisches HTML ohne Reveal-Animation.** Was beim Laden schon sichtbar ist, blendet nicht ein. ([→](#0-bevor-gebaut-wird))
- **Motion-Budget vor dem ersten Pixel festlegen:** wie viele Endlos-Animationen, keine davon außerhalb des Viewports. ([→](#0-bevor-gebaut-wird))
- **Geräteklassen von Anfang an trennen:** `matchMedia`-Gates (`hover`/`pointer`/Breite kombiniert), nie eine Breitenregel allein. ([→](#0-bevor-gebaut-wird))
- **`<head>` preloadet nur Fonts und das eine LCP-Bild**, sonst nichts — kein React, keine Bibliothek. ([→](#1-dokument-und-head))
- **Das gesamte Seiten-CSS inline in einem `<style>`**, kein zusätzlicher render-blockierender Request. ([→](#1-dokument-und-head))
- **Drei kleine `defer`-Skripte, keine Runtime-Bibliothek im kritischen Pfad.** ([→](#1-dokument-und-head))
- **Keine render-blockierenden Drittanbieter:** Analytics/Marketing erst nach Consent tatsächlich einfügen, nicht nur gedrosselt. ([→](#1-dokument-und-head))
- **`content-visibility:auto` sitzt auf dem inneren Inhalts-Wrapper, nie auf einer Sektion mit eigenem Negativ-Z-Grund.** ([→](#2-seitengerüst-und-sektionen))
- **`contain-intrinsic-size` pro Sektion und Breite messen, nie raten oder pauschal setzen.** ([→](#2-seitengerüst-und-sektionen))
- **Genau ein Bild trägt `fetchpriority="high"`**, alles andere `loading="lazy" decoding="async"` mit festen Maßen. ([→](#3-bilder-und-grafik))
- **Geschlossene Panels `content-visibility:hidden`, geräte-exklusiver Deko-DOM in `<template>`.** ([→](#3-bilder-und-grafik))
- **Nur `transform`/`opacity`(/`filter`) animieren** — nie `top`, `width`, `color`, `box-shadow`. ([→](#4-animationen))
- **Endlos-Animationen halten nach dem Laden (~6 s) und laufen nur im Bild.** ([→](#4-animationen))
- **`prefers-reduced-motion` schaltet Dekoration komplett ab**, nicht nur schneller. ([→](#4-animationen))
- **Canvas/WebGL startet erst nach dem ersten Paint**, bis dahin ein CSS-Verlauf als Fallback. ([→](#5-canvas-und-webgl))
- **`getContext` nie im kritischen Pfad, DPR und Auflösung deckeln, Zeichnen pausiert außerhalb Sicht/Tab.** ([→](#5-canvas-und-webgl))
- **Framerate adaptiv drosseln und mit Backoff wieder hochtasten**, nie raten, ob mehr geht. ([→](#5-canvas-und-webgl))
- **Layout kommt aus einem Scroll-/Resize-Cache, nie aus einer Lesung pro Frame.** ([→](#6-javascript-architektur))
- **Beobachtungsziele bündeln und erst beobachten, wenn ein `content-visibility`-Block rendert.** ([→](#6-javascript-architektur))
- **Build-Assertions erzwingen die Regeln** (eine Headline, lazy Marks, Panel hidden, Template) statt sie zu hoffen. ([→](#7-build-und-auslieferung))
- **Vor jedem Push läuft die volle Skript-Kette gegen `prodserve.py`, beide Formfaktoren.** ([→](#8-prüfen-vor-dem-push))

## Inhalt

- [0. Bevor gebaut wird](#0-bevor-gebaut-wird)
- [1. Dokument und `<head>`](#1-dokument-und-head)
- [2. Seitengerüst und Sektionen](#2-seitengerüst-und-sektionen)
- [3. Bilder und Grafik](#3-bilder-und-grafik)
- [4. Animationen](#4-animationen)
- [5. Canvas und WebGL](#5-canvas-und-webgl)
- [6. JavaScript-Architektur](#6-javascript-architektur)
- [7. Build und Auslieferung](#7-build-und-auslieferung)
- [8. Prüfen vor dem Push](#8-prüfen-vor-dem-push)
- [9. Was diese Anleitung ausschließt](#9-was-diese-anleitung-ausschließt)
- [Quellen](#quellen)

## 0. Bevor gebaut wird

Bevor die erste Zeile HTML entsteht, werden vier Entscheidungen getroffen und aufgeschrieben — nicht während des Bauens improvisiert.

**Eine Headline, keine Rotation.** Owner-Entscheidung 16.9.2026, wörtlich: „wir nutzen nur noch einen headline". Der Grund ist gemessen: v5 hatte ursprünglich eine rotierende Hero-Headline (Varianten bei 13,5 / 20 / 26,5 s). Jede spätere Variante war optisch größer als die erste und wurde damit zum neuen, späteren LCP-Kandidaten. Owner-PageSpeed fiel dadurch von 95 auf 60, LCP lag bei 20,5 s. Nach der Streichung: über 30 s lokal genau ein LCP-Eintrag (256 ms Desktop, 240 ms mobil). Diese Entscheidung gilt für jedes LCP-kritische Element — Hero-Bild-Slider ebenso wie Text: Nur die erste, initial sichtbare Variante bekommt Priorität; alles Rotierende ist ausgeschlossen, solange es größer werden kann als das, was zuerst da war (Details und die Chromium-Zeitfenster-Mechanik: [messen.md](messen.md#20-ein-späterer-größerer-kandidat-wird-lcp-bis-fensterende-oder-eingabe), [lighthouse-psi.md](lighthouse-psi.md#1-rechne-mit-einem-neuen-lcp-kandidaten-bis-klick-tap-taste-oder-scroll)).

**Above the fold ist fertig, wenn es gemalt wird.** Inhalt, der beim Laden bereits im ersten Bildschirm steht, bekommt keine Fade-/Reveal-Animation. Begründung: eine Einblend-Animation auf sichtbarem Inhalt schafft ein Zeitfenster, in dem Kontrast-Audits einen Zwischenzustand messen, und verzögert die wahrgenommene Fertigstellung ohne Gegenwert — gemessen A11y 95/96 → 100 nach dieser Regel. Bereits sichtbarer Inhalt ist im Markup direkt im Endzustand da; Choreografie beginnt erst unterhalb der Falz.

**Motion-Budget vor dem ersten Pixel.** Jede Seite bekommt vorab eine Zahl: wie viele Endlos-Animationen darf sie gleichzeitig zeigen, und keine davon außerhalb des sichtbaren Bereichs. Referenzmessung v5-Startseite (13.9.2026, vor der Aufräumung): 72 CSS-Animationen insgesamt, davon 59 endlos (Dekoration) und 13 einmalig (Einblender); nur 14 davon im Bild, nur 6 davon gleichzeitig endlos UND im Bild — **mehr braucht ein Besucher nicht** (Owner-Zitat). Die Konsequenz ist Abschnitt 4: Einblender laufen sofort (sie starten bei `opacity:0`, sonst bleibt die Seite sichtbar leer), Dekoration hält nach dem Laden und läuft nur im Viewport.

**Geräteklassen von Anfang an trennen.** Ein Telefon bekommt keine rein dekorativen Extras. In v5 ist das über zwei `matchMedia`-Gates entschieden, nicht über Bildschirmbreite allein: Hover-Effekte (`pixel-engine.js`) laden nur bei `(hover: hover) and (pointer: fine)`, dekorative Stream-Notizen nur bei `(min-width:1280px) and (pointer:fine)` — ein Tablet im Querformat mit Touch bleibt damit korrekt ausgeschlossen, eine reine Breitenregel hätte es fälschlich eingeschlossen. Diese Entscheidung (welche Geräteklasse bekommt welche Dekoration) steht vor dem Bauen fest, nicht als nachträglicher Fix.

**Die Messkette steht, bevor die erste Sektion entsteht.** `python3 scripts/prodserve.py <ordner> <port>` liefert von Tag eins an echte Cache-/Kompressionsheader — niemals gegen einen Dev-Server mit `no-store` oder gegen `python -m http.server` messen (dev-Server verzerren: doppelte Downloads bei `no-store`, Speed Index 4,6 s statt 1,2 s ohne Kompression, beides **gemessen**). Ein eigener PageSpeed-Insights-API-Key liegt bereit (das geteilte Tageskontingent liefert sonst `429` bei wiederholten Abfragen, **dokumentiert**). Die Skript-Bibliothek (`SKILL.md` → Werkzeuge) ist einsatzbereit, bevor der erste Vorher-Wert gebraucht wird.

**Performance-Budget, als Zahl, nicht als Gefühl:**

| Budget | Zielwert | Beleg |
| --- | ---: | --- |
| Requests in den ersten ~12 s | ≤ 15 | v5 nach Deferring: 28 → 11 (Desktop, 4× CPU, 12 s), gemessen |
| DOM-Knoten | ≤ 2.300 | v5: ~2.540 → 2.206, gemessen |
| Beobachtete IO-Ziele | ≤ 30 | v5: 132 → 25, gemessen |
| IntersectionObserver-Zeit | ≤ 150 ms | v5: 508 ms → 97 ms (Desktop, 4× CPU, 12 s), gemessen |
| LCP (mobil, CrUX-Feld) | ≤ 2,5 s | CrUX-p75-Schwelle „gut"; Lighthouse-Gewicht 25 % |
| CLS | ≤ 0,1 | Lighthouse-p10-Kontrollpunkt (Score ≈ 0,9); Gewicht 25 % |
| TBT | ≤ 200 ms | Lighthouse-p10-Kontrollpunkt (Score ≈ 0,9); Gewicht 30 % |
| FCP | ≤ 1,8 s | Lighthouse-p10-Kontrollpunkt (Score ≈ 0,9); Gewicht 10 % |
| Speed Index | ≤ 3,4 s | Lighthouse-p10-Kontrollpunkt (Score ≈ 0,9); Gewicht 10 % |

Herkunft der Lighthouse-Gewichte und Details zu Feld- vs. Labdaten: [lighthouse-psi.md](lighthouse-psi.md). Ein Effekt, der dieses Budget sprengt, wird nicht gebaut — oder er ersetzt einen anderen, nicht addiert sich.

## 1. Dokument und `<head>`

Reihenfolge, wie sie `v5/index.html` tatsächlich ausliefert, mit Begründung pro Zeile.

1. `<meta charset="utf-8">`, `<meta name="viewport" content="width=device-width, initial-scale=1">`, `<title>` — zuerst, ohne Ausnahme.
2. `robots`/`canonical`/`description`/OG-/Twitter-Meta, Icons — projektabhängig, aber vor allem Schweren.
3. **Fonts.** Selbst gehostetes `woff2`, `font-display: swap`, nach `unicode-range` in `latin`/`latin-ext` aufgeteilt (kleinere erste Anfrage für lateinische Zeichen). Preload **nur** die 1–2 Schnitte, die tatsächlich above-the-fold gerendert werden — in v5 sind das genau zwei Dateien (`instrument-sans-normal-latin.woff2`, `jetbrains-mono-normal-latin.woff2`), alle weiteren Schnitte (italic, ext-Ranges, weitere Gewichte) stehen als `@font-face` im selben inline `<style>`, aber ohne eigenen `<link rel="preload">`. Jede Preload-Entscheidung wird einzeln geprüft: wird dieser Schnitt above-the-fold gerendert? Nein → kein Preload. Ist das above-the-fold-Element selbst LCP-Kandidat, ist ein System-Font-Stack oft schneller als jeder Webfont (**dokumentiert**, allgemeine Web-Erfahrung, in v5 nicht nötig, weil das LCP-Element ein Bild ist). Metrik-angepasste Fallback-Schriften (`size-adjust`/`ascent-override`) sind gegen CLS beim Font-Swap empfohlen; v5 setzt sie nicht ein, weil sein LCP-Element ein Bild und keine Textzeile ist — **vermutet**, dass sie bei einem Text-LCP nötig würden.
4. **Genau ein Preload für das LCP-Bild:** `<link rel="preload" as="image" href="/brand/mark-34-c.svg" fetchpriority="high">`. Kein weiteres `<link rel="preload">` im Dokument — insbesondere nicht für die Runtime-Bibliothek. Gemessen (v3, drei Läufe je Variante): Preload von React verschob den medianen FCP von 349 ms auf 485 ms, weil Dokument und Bibliothek um dieselbe Verbindung konkurrieren und das Dokument ist, was malt. Für einen externen Asset-Host (Bilder-CDN, Formular-Backend) gilt zusätzlich `<link rel="preconnect">`, um DNS/TLS vorzuziehen (~300 ms gespart, **dokumentiert**, meza-website) — in v5 selbst nicht nötig, weil alles same-origin liegt.
5. **Kritisches CSS.** v5 inlinet das **gesamte** Seiten-CSS in einem einzigen `<style id="v5-css">` — bei einer bauzeit-generierten Einzelseite ist „kritisch" hier „alles", also gibt es kein zusätzliches `<link rel="stylesheet">` und keinen FOUC-Reflow durch einen asynchronen CSS-Swap. Bei einer Mehrseiten-Site mit geteiltem CSS gilt die abgeschwächte Regel: das gemeinsame CSS liegt in einer cachebaren Datei, aber das Above-the-fold-CSS der jeweiligen Einstiegsseite bleibt inline (**dokumentiert**, v3-proposal). Ein `preload`+`onload`-Swap für layoutrelevantes CSS ist ausdrücklich **kein** Fortschritt: er verursacht einen FOUC-Reflow im Swap-Moment, der als CLS zählt — pixelidentisches Endrendering beweist nicht, dass der Swap sicher ist (**gemessen**, nur eine CLS-Messung, kein Screenshot-Vergleich, deckt das auf).
6. **Scripts, `defer`, minimale Zahl.** v5 lädt genau drei: `logic.gen.js` (generierte Seitenlogik), `home.js` (Verdrahtung) und `motion-budget.js` (Abschnitt 4), alle `defer`, alle same-origin, keine Runtime-Bibliothek im Kopf. `defer` reicht für „am Ende ausführen" — die Position im `<head>` ist unerheblich, weil `defer` die Ausführung ohnehin bis nach dem Parsen aufschiebt; v5 hält sie trotzdem im `<head>`, direkt nach dem CSS. Ein Support-/Bootstrap-Skript, das den Parser blockieren würde, wird ebenfalls `defer` (Kommentar im Quelltext: „it was blocking the parser in front of several hundred KB of document").
7. **Keine render-blockierenden Drittanbieter.** Analytics/Marketing-Skripte werden erst nach Consent tatsächlich eingefügt (nicht nur ihr Reporting gedrosselt) — vor Zustimmung null Bytes, null Requests (**dokumentiert**).
8. Strukturierte Daten (JSON-LD) dürfen früh inline stehen — sie blockieren nichts.

Minimales `<head>`-Gerüst (Platzhalter in eckigen Klammern):

```html
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>[Seitentitel]</title>
<meta name="description" content="[…]">
<link rel="canonical" href="https://[domain]/[pfad]/">
<meta name="theme-color" content="[#farbe]">
<!-- OG/Twitter/Icons wie gehabt -->

<!-- Fonts: NUR die 1-2 tatsächlich above-the-fold genutzten Schnitte preloaden -->
<link rel="preload" href="/fonts/[schrift]-normal-latin.woff2" as="font" type="font/woff2" crossorigin>
<style>
@font-face {
  font-family: '[Schrift]';
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url(/fonts/[schrift]-normal-latin.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122;
}
/* weitere Schnitte (italic, latin-ext, weitere Gewichte): @font-face ohne eigenen preload */
</style>

<!-- Das EINE LCP-Element -->
<link rel="preload" as="image" href="[lcp-bild]" fetchpriority="high">

<!-- Gesamtes Seiten-CSS inline (eine Seite = ein <style>) -->
<style id="page-css">[generiertes CSS]</style>

<script src="/logic.js" defer></script>
<script src="/behaviour.js" defer></script>
</head>
<body>
…
</body>
</html>
```

Kein `<link rel="preload">` für irgendetwas anderes — keine Bibliothek, kein zweites Bild, kein CSS-Fragment. Jeder zusätzliche Preload ist eine Behauptung, die gemessen werden muss (Regel 10 der zehn Grundsätze, `SKILL.md`); im Zweifel: weglassen.

## 2. Seitengerüst und Sektionen

Semantische Sektionen (`<header>`, `<section id="…" data-screen-label="…">`), above-the-fold-Inhalt direkt im HTML, keine Sektion, die erst durch JavaScript entsteht.

**`content-visibility:auto` sitzt auf dem inneren Inhalts-Wrapper, nie auf einer Sektion mit eigenem Negativ-Z-Grund.** `content-visibility` erzeugt einen neuen Stacking Context für das Element, das es trägt (**gemessen**, siehe unten). Hat eine Sektion einen eigenen Hintergrund-Layer als Kind mit negativem `z-index` — üblich, wenn ein global fixiertes Element (ein Canvas, ein Verlauf) hinter dem Text, aber vor diesem Hintergrund sichtbar bleiben soll —, reißt `content-visibility` auf der Sektion selbst diese Reihenfolge: die ganze Sektion samt Grund wird dann als ein Paket gemalt, und dieses Paket steht über dem global fixierten Element, ganz gleich, welchen `z-index` der Grund lokal trägt.

Genau das ist v5 am 16.9.2026 passiert und wieder repariert worden. Der global fixierte Strom:

```css
.s13 { position: fixed; inset: 0; z-index: -1; pointer-events: none; }
```

Die Sektion „KI-Konsole" hat einen eigenen dunklen Grund als erstes Kind:

```css
.s247 { position: relative; background: transparent; }         /* die Sektion selbst: transparent */
.s248 { position: absolute; inset: 0; z-index: -2; background: #0A1F44; }  /* der Grund: eine Stufe unter dem Strom */
```

✅ **Richtig — `data-cv` auf dem Inhalts-Wrapper, direkt nach dem Grund-Layer:**

```html
<section id="ai" class="s247">
  <div aria-hidden="true" class="s248"></div>   <!-- Grund, KEIN content-visibility -->
  <div data-cv class="s249">                     <!-- Inhalts-Wrapper NACH dem Grund -->
    … teurer Inhalt …
  </div>
</section>
```

❌ **Falsch — `data-cv` auf der Sektion, die den Grund enthält:**

```html
<section id="ai" data-cv class="s247">
  <div aria-hidden="true" class="s248"></div>   <!-- wird jetzt Teil des neuen Stacking Context -->
  <div class="s249">… teurer Inhalt …</div>
</section>
```

Im ❌-Fall wird `.s248` (Grund, autoriert mit `z-index:-2`) zusammen mit der ganzen Sektion als ein Paket auf der Stacking-Ebene der Sektion gemalt (effektiv „0"), also **über** dem global fixierten Strom bei `z-index:-1` — der Strom verschwindet hinter dem Grund. Fix in v5 (`deferSections` in `tools/prerender.mjs`): `data-cv` auf den Inhalts-Wrapper direkt nach dem Grund-Layer verschoben. Geprüft mit ausgeblendetem Strom bei 1440/1920/412 px: nichts abgeschnitten, nur Sub-Pixel-Textkanten. Build-Schutz: ein nicht-leerer Negativ-Layer ohne diese Struktur bricht den Build ab; Prüf-Tor `verify_site.mjs` testet auf jeder Seite „no background layer over the stream" (**gemessen**: Gegenprobe gegen den alten Stand lieferte 21 von 21 Seiten FAIL, danach alle grün).

Nicht jede Sektion braucht den Wrapper-Umweg: Sektionen ohne eigenen Negativ-Z-Grund (`background: transparent`, kein Kind mit `z-index < 0`) tragen `data-cv` gefahrlos direkt auf dem `<section>`-Element — in v5 sind das die Sektionen mit der gemeinsamen Klasse `.s138` (`background: transparent`, kein Grund-Kind). Die Regel ist also: **Wrapper-Umweg genau dann, wenn die Sektion selbst einen Negativ-Z-Hintergrund-Layer als Kind trägt**, sonst reicht `data-cv` auf der Sektion.

**`contain-intrinsic-size` pro Sektion und Breite messen, nie pauschal setzen.** Ein einziger geschätzter Wert für jede `[data-cv]`-Sektion (z. B. `contain-intrinsic-size: auto 900px` für alle) verzerrt die Dokumentlänge, bis jede Sektion einmal gerendert hat: gemessen an v5 lag die Seite direkt nach dem Laden am Desktop 3.095 px kürzer und mobil 3.402 px länger als nach einem vollständigen Scroll-Durchlauf — konkret sprang `#konfig-band` von 981 auf tatsächlich gerenderte 245 px, `div.s249` von 1.806 auf 2.274 px. Sprungmarken (`#anchor`-Links, „Zum Inhalt springen") landen in der Zwischenzeit daneben. CLS bleibt davon unberührt (der Sprung passiert unterhalb des sichtbaren Bereichs), aber die Schätzung ist trotzdem falsch. **Der korrekte Weg:** `contain-intrinsic-size` je Sektion **und** je Breite zur Bauzeit aus einem echten gerenderten Layout messen und als konkreten Pixelwert in den generierten CSS-Block schreiben — nicht als Autor-Schätzung im Quelltext stehen lassen. **Soll, in v5 noch offen:** `tools/v5build.mjs` öffnet für die Breiten-Merges ohnehin eine echte Browser-Seite, liest dort aber bislang nur HTML/CSS-Unterschiede zwischen Breiten aus (`ReactDOMServer.renderToString`, kein Layout) — die Pro-Sektion-Höhenmessung selbst ist noch nicht gebaut. `index.html` trägt deshalb bis auf Weiteres eine einzige pauschale Regel für jede Sektion (`[data-cv]{content-visibility:auto;contain-intrinsic-size:auto 900px}`) — genau der oben kritisierte Fall.

**Kein `position: fixed`/`absolute`-Kind, das von der Sektion als Containing Block abhängt, wenn die Sektion selbst `content-visibility` trägt oder tragen könnte** — ein solches Kind wird beim Überspringen mit übersprungen, auch wenn es eigentlich immer sichtbar bleiben sollte (z. B. eine sektionsweite Sticky-Leiste). Braucht ein Kind ein Containing Block außerhalb der übersprungenen Zone, gehört es strukturell außerhalb des `[data-cv]`-Wrappers.

**Der 150-%-Rand.** Chrome beginnt, einen `content-visibility:auto`-Block bereits zu rendern (Style, Layout, Bild-Fetches — alles außer Paint/Compositing bleibt normal), sobald er näher als 150 % der Sichtfensterhöhe an den sichtbaren Bereich heranrückt, und überspringt ihn wieder, sobald er weiter weg ist (Chromium: `display_lock_document_state.cc`, `kViewportMarginPercentage = 150.f`, dokumentiert in CSS Containment 2 §4.3: Elemente mit `content-visibility: auto`, deren Nähe zum Sichtfenster noch nicht bestimmt ist, müssen das im nächsten Rendering-Update tun). **Gemessen** an drei Sichtfensterhöhen (420, 900, 915 px): das Verhalten hält exakt bei 150 % Abstand. Für die Ladeplanung heißt das: „unterhalb der Falz" ist nicht dasselbe wie „wird nicht geladen" — eine Sektion 1,5 Bildschirmhöhen entfernt rendert bereits, ihre Bilder laden bereits. Wer eine Sektion bewusst erst bei tatsächlichem Eintritt in den Viewport aktivieren will (z. B. eine teure Canvas-Initialisierung), braucht einen eigenen, engeren Trigger (Abschnitt 5/6), nicht `content-visibility` allein. Mechanik und Messreihe im Detail: [rendern-hauptthread.md](rendern-hauptthread.md#3-die-150-prozent-vorrender-marge-von-chrome-einplanen).

## 3. Bilder und Grafik

**Genau ein Bild trägt `fetchpriority="high"`** — das LCP-Kandidat-Bild, mit expliziten `width`/`height` und im `<head>` vorab geladen (Abschnitt 1). v5s Bild-Export liefert allen fünf Markenzeichen-Vorkommen `fetchpriority="high"` (Kopfzeile, KI-Konsole, Stack-Diagramm, Footer, Consent-Hinweis); der Build (`tools/v5build.mjs`) korrigiert das hart: das erste behält `fetchpriority="high"` und muss mit dem im `<head>` vorgeladenen Bild übereinstimmen (sonst bricht der Build ab), alle weiteren werden zu `loading="lazy" decoding="async"` umgeschrieben. Eine Build-Assertion zählt die verbleibenden Marken (`marks < 2` bricht ab) — die Regel ist damit erzwungen, nicht nur dokumentiert.

**Alles andere: `loading="lazy" decoding="async"`, mit Maßen.** Jedes `<img>` unterhalb der Falz bekommt beide Attribute; `width`/`height` bleiben gesetzt, aber wenn das Seitenverhältnis zusätzlich über CSS `aspect-ratio` gesteuert wird, muss `height: auto` das feste `height`-Attribut aushebeln — sonst gewinnt das HTML-Attribut gegen `aspect-ratio` (**dokumentiert**, gelöste Falle). Bild-Boxen im Build auf das tatsächliche Anzeigeverhältnis zuschneiden, nicht nur skalieren: eine Box, deren Verhältnis nicht zum Originalbild passt, lädt volle Pixelzeilen, die `object-fit` sofort wieder verwirft — gemessen 43 % verworfene Bildzeilen bei einer Verhältnis-Abweichung. Icon-/Markenbilder werden auf die **größte** tatsächliche Verwendung im Projekt exportiert, nicht auf die kleinste (9,8 KB → 2,9 KB bei korrekt gewählten 128 px, **gemessen**). Format/Qualität: WebP, `quality=82, method=6` als LANCZOS-Resample-Kompromiss aus Größe und Schärfe (**dokumentiert**, reproduzierbares Build-Skript), `quality=75` ist für die meisten übrigen Bilder ein noch kleinerer, kaum sichtbar schlechterer Default (~15 % kleiner, **dokumentiert**).

**Sprites/Masken laden beim Style-Aufbau, nicht beim Layout oder Paint.** `mask-image`/`background-image` (auch SVG-Sprites, die per CSS referenziert werden) holt Chromium, sobald der `ComputedStyle` für das tragende Element aufgebaut wird (`CSSImageValue::CacheImage`, Style-Recalc) — nicht erst bei Layout oder Paint. Für ein Element in einem übersprungenen `content-visibility`-Block heißt das: **kein** Style wird gebaut, solange der Block übersprungen bleibt, also lädt auch keine Maske. Wird der Style aber vorzeitig erzwungen (siehe Abschnitt 6, `getBoundingClientRect` & Co. in einem übersprungenen Block), lädt in genau diesem Moment auch jede CSS-Maske dieses Blocks mit — das war der Mechanismus hinter dem 125-ms-Ladefund von 14 Logo-Masken in v5 (Details und die vollständige Chromium-Herleitung: [rendern-hauptthread.md](rendern-hauptthread.md#7-intersectionobserver-in-einem-content-visibility-block-die-korrigierte-regel)).

**Geschlossene Panels: `content-visibility:hidden`, mit lazy Bildern darin.** Ein geschlossenes Mega-Menü ist in v5 nicht einfach `opacity:0` — es ist ein ~320-Knoten-Panel, das der Browser sonst bei jedem Laden stylt und layoutet, mit zwei Bildern, die *im* Viewport liegen und `loading="lazy"` allein deshalb nicht respektieren würden. `content-visibility:hidden` (dauerhaft gesperrt, nicht `auto`) überspringt das Panel komplett, bis ein Zustandswechsel es aufhebt; die Build-Assertion sucht das Panel über seinen datengetriebenen Selektor (`data-dyn` enthält sowohl `height:panelHpx` als auch `opacity:panelOp`) und bricht ab, wenn nicht **genau ein** Treffer existiert oder das Panel kein einziges Bild enthält:

```css
#dc-root [data-dyn*="height:panelHpx"]:not([data-v5-open]) { content-visibility: hidden }
```

Wichtig für die Reihenfolge: der Zustandswechsel, der `content-visibility:hidden` aufhebt (hier: das Setzen von `data-v5-open`), muss **vor** dem sichtbaren Einblenden passieren, sonst poppt der Inhalt ungerendert bzw. verzögert auf (**vermutet**, als offener Implementierungshinweis im v5-Code vermerkt, noch nicht mit Zahlen belegt).

**Ein wiederholtes, DOM-lastiges Deko-SVG wird zur Bauzeit zu einem Bild.** Ein Marken-Logo als handgebautes SVG-Raster aus vielen einzeln inline-gestylten `<rect>`-Zellen (bekannter Fall: 146 Zellen für ein 34-px-Logo, fünffach auf der Seite wiederholt) kostet Style/Layout/Paint pro Knoten und Vorkommen, auch im Stillstand. Zur Bauzeit einmal als eigenständige SVG-Datei mit identischer Geometrie exportieren und nur noch per `<img>` referenzieren — ein einziger, cachebarer Request statt hunderter live gestylter DOM-Knoten je Vorkommen.

**Geräte-exklusiver Deko-DOM lebt in einem inerten `<template>`.** v5s Stream-Notizen (112 Textlabel, 336 Elemente, ~13 % des DOMs) erscheinen nur ab `(min-width:1280px) and (pointer:fine)`, 10 s nach dem Laden. Ein Telefon soll sie nie parsen, stylen oder zählen müssen — also liegen sie im Build als `<template data-v5-pt>…</template>`: ein `<template>` ist inert, sein Inhalt ist kein Teil des gerenderten Baums, bis Skript ihn explizit einsetzt (`layer.appendChild(tpl.content)`). Die Build-Assertion prüft die Struktur (genau ein Notizen-Layer, mindestens 20 `<span data-pt>`-Einträge) und bricht ab, wenn der Export nicht mehr danach aussieht. Die Gegenprobe, warum das nötig ist: ein `<x-dc>`-Custom-Element, das Platzhalter-Markup als **lebendigen** Teilbaum statt als `<template>` einbindet, lässt den Browser dieses Markup vollständig parsen, layouten und malen, obwohl es nie sichtbar wird — gemessen an einem verwandten Fund: ~4.200 statt ~2.200 Elemente beim Parsen, weil eine solche Zweitkopie der ganzen Seite lebendig im DOM hing.

## 4. Animationen

**Nur `transform`, `opacity` (und `filter`) animieren.** `top`, `left`, `width`, `height`, `background-position`, `color`/`background-color` und `clip-path` sind nicht compositor-only und kosten pro Frame Hauptthread-Zeit — Lighthouse markierte in einer v3-Messung 17 Elemente als „nicht-composited"; nicht-composited Animationen blieben danach der größte verbleibende Posten in `RunTask` (~390 ms, **gemessen**, nachdem alle Lade-/IO-Optimierungen bereits griffen). Ein Ersatz ist nicht immer 1:1: `top` → `translateY` bezieht sich auf unterschiedliche Referenzboxen (Prozentwerte insbesondere), das muss beim Umstellen nachgemessen werden, nicht angenommen.

**Der unanimierte Grundzustand im Markup ist immer der fertige Endzustand**, nie der versteckte Ausgangszustand — eine Animation ist Progressive Enhancement, kein Bauplan. Referenz-Zeitraster für einmalige Einblender (**dokumentiert**, v3-proposal/Refresh-Projekt, dort gemessen und gegen ein Zeitraster kalibriert, nicht aus v5 selbst): Mikro-Interaktionen 120–200 ms, UI-State-Wechsel 180–260 ms, Section-Entrance 400–800 ms, Hero 800–1600 ms, Stagger-Versatz 40–90 ms, Fade+Rise 12–24 px Versatz, Hover-Lift −2 bis −6 px. Einmalige Reveals laufen mit `fill: both` (oder der äquivalenten Kurzform in der deklarierten Animation), damit der Endzustand hält, ohne dass JavaScript ihn nach Ablauf erneut setzen muss.

**Einblender laufen sofort, Dekoration hält.** Die Trennlinie ist nicht „welche Animation sieht wichtig aus", sondern eine lesbare Eigenschaft: `animation.effect.getTiming().iterations` — `Infinity`/`null` heißt Dekoration (darf warten), jede endliche Zahl heißt Einblender (muss sofort laufen, weil er bei `opacity:0` startet und die Seite sonst sichtbar leer hält). Diese Unterscheidung aus einer Namensliste zu raten rottet beim nächsten Export; aus der Animation selbst gelesen nicht.

**Dekoration hält nach dem Laden (`HOLD_MS`, in v5 6.000 ms) und läuft nur, solange ihr Container im Bild ist.** Owner, wörtlich: „generell koennen alle animationen nach 6 sekunden starten oder 7, macht vorher doch eh kein sinn. die leute muessen sich auch orientieren." Wichtig ist der Bezugspunkt: der Timer läuft ab `load`, nicht ab Navigationsbeginn — auf einer langsamen Verbindung ist die Seite bei Sekunde 6 unter Umständen noch am Ankommen, und ein Countdown, der das ignoriert, ließe die Dekoration mitten in den Aufbau hinein starten. Das Halten selbst passiert **synchron beim Einreihen** einer neu entdeckten Animation, nicht erst im `IntersectionObserver`-Callback: `observe()` antwortet asynchron nach dem nächsten Layout, und bis dahin hätte die Animation bereits einen Frame oder mehr gelaufen, wäre gestylt und compositiert worden — genau die Arbeit, die das Halten vermeiden soll.

**Verhältnis zum Lighthouse/PSI-Messfenster: 6 s ist sicher, aber „nach dem Hold" ist nicht automatisch billig.** PSI im `simulate`-Modus braucht nur 1 s Netzwerk-/CPU-Ruhe, um den Trace zu beenden ([lighthouse-psi.md](lighthouse-psi.md#2-rechne-beim-psi-standard-mit-1000-ms-ruhefenster-nicht-5250-ms)); eine Aufgabe über 50 ms, die nach dem vermeintlich ruhigen Ladezeitpunkt anfällt, verlängert dieses Fenster trotzdem. Genau das ist v5 einmal passiert — nicht durch eine Endlos-Animation, sondern durch eine bei `load + 10 s` bewusst verzögerte Aufräumarbeit: Die Stream-Notizen berechneten beim Start ihre Ausweichliste über **jede** Überschrift, jeden Absatz und jeden Link der Seite, einschließlich der noch übersprungenen `content-visibility`-Blöcke, deren Layout diese Lesung dabei erzwang — eine 53–61-ms-Aufgabe bei 4× CPU, die einzige lange Aufgabe nach fünf Sekunden. Der Fix war nicht, den Timer zu verschieben, sondern die Arbeit selbst zu begrenzen: die Ausweichliste überspringt seither, was nicht gerendert ist, und wird nur neu gebaut, wenn ein Block tatsächlich gerendert wurde (`ptStale`). **Lehre:** Auch bewusst spät geplante Arbeit (10 s nach dem Laden ist weit jenseits jedes PSI-Ruhefensters) muss selbst billig bleiben und darf niemals in übersprungene Blöcke hineinlesen — sonst hält sie das Messfenster trotz guter Platzierung offen.

**Pausiert wird an drei Stellen, nicht an einer:** außerhalb des Sichtbereichs (Container-`IntersectionObserver`, Margin großzügig genug, dass Bewegung beginnt, bevor sie ankommt), bei verstecktem Tab (`visibilitychange`), und implizit in übersprungenen `content-visibility`-Blöcken — `document.getAnimations()` sieht CSS-Animationen in übersprungenen Blöcken schlicht nicht, bis der Block rendert (**gemessen**, beim Bau von `motion-budget.js` beobachtet), also braucht jeder Scan, der sich darauf verlässt, einen erneuten Lauf bei `contentvisibilityautostatechange`.

**`prefers-reduced-motion` zeigt den fertigen Zustand, nicht nur eine schnellere Animation.** Dekorative Endlos-Effekte (Dither-Wolken, Partikelfelder, wandernde Farbverläufe) werden komplett abgeschaltet, nicht nur verkürzt; das ganze Halte-/Pausier-System ist unter reduzierter Bewegung inert (`motion-budget.js` kehrt in Zeile 2 um, sobald `matchMedia("(prefers-reduced-motion: reduce)")` zutrifft — ein Pausierer, der gegen ein bereits reduziertes Stylesheet kämpft, addiert nur Arbeit ohne Nutzen).

**Zahl gleichzeitig laufender Animationen begrenzen.** Viele kleine, gleichzeitig endlos laufende Animationen auf denselben Elementen kosten trotz winziger sichtbarer Fläche echten Hauptthread — ein bekannter Fall: die Animation eines 34-px-Marken-Logos (ein SVG-Raster aus 146 `<rect>`-Zellen, vgl. Abschnitt 3) kostete 3,5 s Hauptthread (Abschnitt 9). Ein einzelner Zeichen-Loop (Canvas, ein Draw-Call pro Frame) ersetzt viele parallele Keyframe-Animationen bei gleichem visuellem Ergebnis deutlich günstiger, sobald die Elementzahl zweistellig wird.

**Keine layoutlesende Operation aus einem Animations-Callback.** `getComputedStyle()` während einer laufenden Transition/Animation liefert den **Zwischenwert**, nicht den Endwert — vor jeder Messung sicherstellen, dass keine Animation mehr läuft (`animation: none` setzen oder auf das Ende warten). `parseFloat()` auf einem laufenden `calc(...)`-Zwischenwert scheitert außerdem still und liefert `0` statt eines Fehlers — beides hat in der Praxis wiederholt falsche „funktioniert"-Messungen erzeugt.

**Scroll-gekoppelte Effekte:** Wo unterstützt, CSS Scroll-Driven Animations (`animation-timeline: scroll()` / `view()`) statt eines JS-`scroll`-Handlers — läuft off-main-thread, kompositiert, braucht keinen aktiven Listener. Zwei Grenzen davon, beide **gemessen**: (1) `view()` kann nichts animieren, was beim Laden bereits im Bild steht — sein `entry`-Bereich liegt vor dem ersten Frame; Above-the-fold-Inhalt bekommt eine zeitbasierte Sequenz, keine `view()`-Timeline. (2) Der `entry`-Bereich ist für ein niedriges/flaches Zielelement oft zu kurz (grobe Sprünge statt feiner Zwischenschritte) — dann `cover()` verwenden, das die gesamte Sichtbarkeitsdauer nutzt. `will-change: transform` ist bei Elementen gerechtfertigt, deren Scroll-Bereich **wiederholt** betreten werden kann (normale Reveal-on-Scroll-Elemente); für einmalige Hero-Sequenzen beim ersten Laden gilt die Begründung nicht, und `will-change` sollte dort nicht dauerhaft gebunden bleiben. Wo Scroll-Driven Animations fehlen oder nicht reichen: Scroll-/Resize-**Events** in einen Cache schreiben (Abschnitt 6), nie `scrollY`/`getBoundingClientRect` direkt im Animations- oder Zeichen-Callback lesen — das erzeugte in v5 exakt eine gemessene „52 ms erzwungener Umbruch"-Meldung, bis die Strom-Schleife auf den Cache umgestellt war.

**Referenzimplementierung, destilliert aus `tools/motion-budget.js`** (Container-Bündelung, Hold, Rescan bei `content-visibility` und DOM-Mutationen; gekürzt — Originaldatei mit vollständiger Begründung pro Zeile im mccain-digital-Repo unter `tools/motion-budget.js`, nicht Teil dieses Skills):

```js
(function () {
  "use strict";
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("IntersectionObserver" in window) || !document.getAnimations) return;

  var MARGIN = "300px 0px 300px 0px";   // Bewegung beginnt, bevor sie ankommt
  var HOLD_MS = 6000;                    // ab `load`, nicht ab Navigationsbeginn
  var released = false;
  var boxOf = new WeakMap(), members = new WeakMap(), known = new WeakSet(), visible = new WeakSet();

  function containerOf(el) { return el.closest("[data-cv], [data-screen-label]") || el.parentElement || el; }
  function seen(el) { var b = boxOf.get(el); return !!b && visible.has(b); }
  function loops(an) { try { var it = an.effect.getTiming().iterations; return it === Infinity || it == null; } catch (e) { return false; } }
  function cssAnimations(el) { return (el.getAnimations ? el.getAnimations() : []).filter(function (a) { return a.animationName && !a.__done; }); }

  function pause(el) { cssAnimations(el).forEach(function (a) { if (a.playState === "finished") a.__done = true; else if (a.playState === "running") a.pause(); }); }
  function play(el) { cssAnimations(el).forEach(function (a) { if (a.playState === "paused" && (released || !loops(a))) a.play(); }); }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var box = e.target; known.add(box);
      if (e.isIntersecting) visible.add(box); else visible.delete(box);
      (members.get(box) || []).forEach(function (el) { e.isIntersecting ? play(el) : pause(el); });
    });
  }, { rootMargin: MARGIN });

  function file(el, an) {
    var box = containerOf(el); boxOf.set(el, box);
    var set = members.get(box); if (!set) { set = new Set(); members.set(box, set); io.observe(box); }
    set.add(el);
    // synchron halten — observe() antwortet erst nach dem nächsten Layout
    if (an.playState === "running") { if (!released && loops(an)) an.pause(); else if (known.has(box) && !visible.has(box)) an.pause(); }
  }

  var watched = new WeakSet();
  function scan() {
    document.getAnimations().forEach(function (an) {
      if (!an.animationName) return;
      var el = an.effect && an.effect.target; if (!el) return;
      if (!watched.has(el)) { watched.add(el); file(el, an); }
      else if (!released && loops(an) && an.playState === "running") an.pause();
      else if (!seen(el) && an.playState === "running") an.pause();
    });
  }

  function release() {
    released = true;
    document.getAnimations().forEach(function (an) {
      var el = an.effect && an.effect.target;
      if (an.animationName && an.playState === "paused" && el && seen(el)) an.play();
    });
  }
  function armRelease() { setTimeout(release, HOLD_MS); }
  // readyState kann beim Einhängen bereits "complete" sein — dann feuert "load" nie mehr
  if (document.readyState === "complete") armRelease();
  else addEventListener("load", armRelease, { once: true });

  document.addEventListener("visibilitychange", function () {
    document.getAnimations().forEach(function (an) {
      if (!an.animationName) return;
      if (document.hidden) { if (an.playState === "running") an.pause(); return; }
      var el = an.effect && an.effect.target;
      if (an.playState === "paused" && el && seen(el) && (released || !loops(an))) an.play();
    });
  });

  var t = 0;
  function soon() { clearTimeout(t); t = setTimeout(scan, 250); }
  new MutationObserver(function (recs) {
    if (recs.some(function (r) { return Array.prototype.some.call(r.addedNodes, function (n) { return n.nodeType === 1; }); })) soon();
  }).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("contentvisibilityautostatechange", function (e) { if (!e.skipped) soon(); }, true);

  scan();
  addEventListener("load", soon);
})();
```

Kernidee: Animierte Elemente werden nicht einzeln beobachtet, sondern unter ihrem nächsten `[data-cv]`- oder `[data-screen-label]`-Container gebündelt — v5 senkte damit die IO-Ziele dieser einen Datei von 76 auf die Zahl der Container (Teil der 132 → 25 der ganzen Seite). Der Preis: ein hoher Container hält alle seine Loops an, solange irgendein Teil von ihm nah ist; bei einer langen Sektion ist das hinnehmbar, weit entfernte Sektionen sind ohnehin durch `content-visibility` bereits ganz übersprungen.

## 5. Canvas und WebGL

**Der erste Paint hängt an nichts, das WebGL oder eine GPU braucht.** Gemessen (mobil emuliert, Chrome for Testing 148, Produktionsheader): mit GPU (ANGLE Metal) kam der erste Paint bei 188 ms, `getContext("webgl")` dauerte 12 ms. Ohne GPU (`--use-angle=swiftshader`, Software-Rendering) sprang der erste Paint auf 2.216 ms (CPU 1×) bzw. 2.392 ms (CPU 4×) — `getContext("webgl")` allein blockierte in diesem Fall 230–311 ms direkt um den Aufruf, dazu je eine zweite, kürzere Long Task von 89–104 ms unmittelbar danach, obwohl `DOMContentLoaded` und `load` nach wenigen Dutzend Millisekunden längst durch waren. **Grund:** `getContext` ist synchron; ohne GPU muss der Software-Rasterizer initialisiert werden, und *der ganze erste Paint der Seite* wartet auf einen WebGL-Hintergrund, der im kritischen Pfad steht. In einer Lighthouse-Messung unter Maschinenlast (17 parallele Chrome-Prozesse) lag der beobachtete FCP derselben Seite bei 125.226 ms — ein später erster Paint verschiebt das gesamte Messfenster in die Zeit, in der spät erscheinende Inhalte zum LCP werden können.

**Konsequenz: Canvas/WebGL startet erst nach dem ersten Frame, nie im kritischen Pfad.** `getContext` und jede Shader-Initialisierung gehören in ein `requestAnimationFrame` nach `load` (oder nach dem ersten tatsächlichen Frame), nie synchron im Parse-Pfad. Bis dahin zeigt CSS einen Fallback — ein Verlauf oder eine Farbe, kein Canvas-Element, das auf seinen Kontext wartet. Getestet wird das gezielt mit `scripts/fps.mjs --software-gl` (Chrome mit `--use-angle=swiftshader` gestartet) zusammen mit `scripts/lcp-window.mjs` (FCP-Zeile) — CPU-Drosselung allein in DevTools/Lighthouse prüft das **nicht**: sie throttelt den Hauptthread, nicht den GPU-Prozess, in dem WebGL-Shader laufen (**gemessen**: CPU-Throttling allein veränderte die Shader-Framerate nicht).

**`getContext` behandeln, als könnte es scheitern.** Liefert `getContext("webgl")` `null` (kein WebGL verfügbar), fällt die Seite sichtbar und ohne Fehler auf den CSS-Verlauf zurück — kein Canvas-Element, das leer bleibt. (**Empfohlen**; im gelesenen v5-Code nicht mit einem expliziten Null-Pfad belegt, aber Voraussetzung dafür, dass „CSS-Fallback bis zum ersten Frame" tatsächlich ein Fallback und nicht nur eine Verzögerung ist. Kein theoretischer Fall: Der automatische SwiftShader-Fallback bei fehlender GPU gilt seit Chrome 130 als deprecated — DevTools warnt davor, Sicherheitsbegründung ist JIT-Code im GPU-Prozess —, wodurch `getContext("webgl")` in GPU-losen Umgebungen (Headless-CI, ältere/blockgelistete Hardware) heute häufiger `null` liefert als früher.)

**Device-Pixel-Ratio und interne Auflösung deckeln.** Unter Software-Rendering bleibt die interne Canvas-Auflösung der Flaschenhals, unabhängig von der CSS-Anzeigegröße: gemessen ~13 fps bei 2560×1440 unter SwiftShader trotz eines 30-fps-Ziels. Eine niedrigere interne Auflösung (nicht die CSS-Größe) ist der wirksamste Hebel gegen dieses Bild, zulasten der Schärfe — bei einem Effekt, der ohnehin pixelig/rasterisiert aussehen soll (Retro-/Mosaik-Optik), Zell- und Blockgrößen zusätzlich auf ganze Gerätepixel klemmen (`Math.round(wert * devicePixelRatio)`), sonst kann der Effekt bei bestimmten DPR-Kombinationen rechnerisch verschwinden.

**Der Zeichen-Loop läuft nur, während sein Canvas im Bild ist und der Tab sichtbar ist — mit einer Ausnahme.** Ein `position:fixed`-Canvas, das den gesamten Viewport füllt, ist per Konstruktion immer „intersecting" und braucht **keinen** `IntersectionObserver` — dort reicht `visibilitychange` (ein verstecktes Tab genügt bereits, um `requestAnimationFrame` anzuhalten). Ein Canvas, das nur einen Teil der Seite einnimmt (eine Karte, ein Diagramm), bekommt dagegen einen eigenen `IntersectionObserver`, der `visible` umschaltet und den Loop bei `false` gar nicht erst neu plant.

**`prefers-reduced-motion` gilt auch hier — eigenständig, nicht über `motion-budget.js`.** Das Halte-/Pausier-System aus Abschnitt 4 greift nur bei deklarativen CSS-Animationen (`animationName`); ein WebGL-Strom läuft über eigenes `requestAnimationFrame` und wird davon **nicht** erfasst (im v5-Quelltext ausdrücklich vermerkt: „WHAT IT DOES NOT TOUCH: the pixel stream […] It is a WebGL canvas driven by requestAnimationFrame […], not by CSS"). Der Zeichen-Loop selbst muss deshalb sein eigenes `prefers-reduced-motion`-Gate tragen — einmal beim Start gelesen und dort geprüft, wo der nächste Frame eingeplant würde: Ein Frame zeichnet so oder so (der fertige Zustand entsteht), aber ohne erneutes Einplanen bleibt es dabei.

**Adaptive Framerate, mit den v5-Zahlen als Referenzalgorithmus.** Ziel 60 fps, wo die Maschine mithält. Ein Fenster von 90 aufeinanderfolgenden Frames wird beobachtet; ein Frame gilt als „spät", wenn seine Dauer 25 ms überschreitet. Sind mehr als 18 von 90 Frames (ein Fünftel) spät, schaltet der Loop auf 30 fps (`data-v5-fps="30"` als Debug-Attribut). Aus stabilen 30-fps-Frames selbst lässt sich **nicht** ableiten, ob 60 fps wieder möglich wären — ein gedrosseltes Ziel läuft immer pünktlich (**gemessen**: unter SwiftShader blieb der Loop trotz Probe-Versuchen dauerhaft bei 30 fps; auf einer Apple-GPU schaltete er nie um, weil er nie musste). Deshalb wird 60 fps aktiv **ausprobiert**: nach 5 s bei 30 fps testet der Loop erneut für 90 Frames; scheitert der Test, verdoppelt sich die Wartezeit bis zum nächsten Versuch (10 s, 20 s, 40 s, danach alle 60 s) statt bei einem festen Intervall zu bleiben. Gedrosselte Frames werden über `setTimeout` erneut eingeplant, nicht innerhalb eines übersprungenen `requestAnimationFrame` — der Browser wird für ausgelassene Frames nicht geweckt.

**Uniforms/Zeichenwerte aus einem Cache, nie aus einer Layout-Lesung im Frame.** `scrollY`, `canvas.clientWidth/clientHeight`, `getBoundingClientRect()` gehören nicht in den Zeichen-Loop — sie kommen aus `scroll`/`resize`-Event-Listenern in ein einfaches Objekt (`{ sy, w, h }`), das der Loop nur liest. Die Canvas-Größe selbst kommt aus dem `ResizeObserver`, den der Loop ohnehin für sein Canvas hält (`contentRect`), nicht aus einer erneuten `getBoundingClientRect()`-Messung. Der Loop **startet** außerdem erst bei der ersten `ResizeObserver`-Meldung, nicht beim Mount — eine Größenlesung beim Mount selbst würde das erste Layout synchron erzwingen. Genau das Gegenteil kostete v5 eine gemessene „52 ms erzwungener Umbruch"-Warnung, bis die Schleife umgestellt war.

**Referenzimplementierung, destilliert aus dem Strom-Loop-Patch in `tools/v5build.mjs`** (Cache statt Layout-Lesung, ResizeObserver-Start, adaptive Framerate; gekürzt auf das Gerüst):

```js
function mountCanvasLoop(canvas, draw, { isGlobal = false, reduced = false } = {}) {
  var view = { sy: 0, w: 0, h: 0 }, cssW = 0, cssH = 0, started = false;
  var visible = true, raf = 0, timer = 0;
  var low = false, lastT = 0, frames = 0, late = 0, wait = 5000, probeAt = 0;

  addEventListener("scroll", function () { view.sy = scrollY || 0; }, { passive: true });
  addEventListener("resize", function () { view.w = innerWidth; view.h = innerHeight; });

  function mode(l, t) { low = l; frames = 0; late = 0; lastT = 0; if (l) { probeAt = t + wait; wait = Math.min(wait * 2, 60000); } canvas.setAttribute("data-v5-fps", l ? "30" : "60"); }
  function pace(t) {
    if (low) { if (t >= probeAt) mode(false, t); return; }
    var d = lastT ? t - lastT : 0; lastT = t;
    if (!d || d > 250) return;
    frames++; if (d > 25) late++;
    if (frames >= 90) { if (late > 18) mode(true, t); else { frames = 0; late = 0; } }
  }
  function schedule() { low ? (timer = setTimeout(function () { timer = 0; raf = requestAnimationFrame(loop); }, 26)) : (raf = requestAnimationFrame(loop)); }
  function loop(t) {
    raf = 0;
    if (!canvas.isConnected || !visible) return;
    if (t) pace(t);
    draw({ sy: view.sy, w: cssW, h: cssH });   // NIE scrollY/getBoundingClientRect hier lesen
    if (!reduced) schedule();   // reduced: ein Frame zeichnet den fertigen Zustand, dann bleibt es dabei
  }

  var ro = new ResizeObserver(function (en) {
    var b = en[0].contentRect; cssW = b.width; cssH = b.height;
    if (!started) { started = true; view.sy = scrollY || 0; view.w = innerWidth; view.h = innerHeight; loop(); }
    else draw({ sy: view.sy, w: cssW, h: cssH });
  });
  ro.observe(canvas);

  if (!isGlobal) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && !raf && !timer) loop();
    }).observe(canvas);
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden && visible && !raf && !timer) loop(); });

  return function cleanup() { cancelAnimationFrame(raf); clearTimeout(timer); ro.disconnect(); };
}
```

Getestet mit `scripts/fps.mjs --software-gl` (erzwingt SwiftShader) und, für die Framerate unter normaler GPU, `scripts/fps.mjs --cpu 1,4`.

## 6. JavaScript-Architektur

**Ein kleines, `defer`-geladenes Modul, keine Runtime-Bibliothek.** v5s gesamte Seitenlogik-Verdrahtung (`home.js`) ist eine einzige IIFE, 403 Zeilen, `"use strict"`, ohne Framework. Sie bindet State an Attribute (`data-dyn`, `data-on`), nicht an einen virtuellen DOM — die Begründung steht im Kopf der Datei: Eine React-Komponente mit ~40 State-Feldern auf ihrer Wurzel rendert bei jeder Änderung ~2.400 Knoten neu (gemessen: 15 volle Re-Renders in 30 s, 64–84 ms je Lauf bei 4× CPU), und nichts davon lässt sich memoisieren, weil es keine Subtrees gibt. Für eine Seite dieser Größe ist „kein Rahmenwerk im Runtime-Pfad" also kein Purismus, sondern die gemessen günstigere Architektur. Der Weg dahin ist reproduzierbar, sobald die Zustände einer Seite abzählbar sind (Breakpoints × UI-Zustände): `tools/v5build.mjs` rendert die React-Exportkomponente zur Bauzeit selbst — 8 Breiten × 4 Zustände — und führt die Ergebnisse zu einem statischen HTML+CSS-Dokument zusammen (Abschnitt 7); zur Laufzeit läuft dann kein Framework mehr, nur noch die kopierte Seitenlogik. Das entfernt nebenbei eine ganze Fehlerklasse, die Framework-Hydration mitbringt (doppelt injizierte Head-Tags, DOM-Snapshots, die nicht zur ersten Render passen) — nicht nur einen Geschwindigkeitsvorteil.

**Nichts Unsichtbares in den ersten 10 Sekunden.** Alles, was ein Besucher nicht sofort sieht oder bedienen kann, lädt entweder bei tatsächlicher Absicht (erste Mausbewegung) oder nach einer Ruhezeit, nie beim initialen Laden pauschal. v5s `armPixels()`-Muster für ein rein hover-abhängiges Feature (Bild: 42 KB zu parsen, 16 KB auf der Leitung):

```js
armPixels() {
  if (this.reduced() || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  var onMove = (e) => {
    if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;   // Touch zählt nicht als Hover-Absicht
    removeEventListener("pointermove", onMove);
    this.loadPixels();
  };
  addEventListener("pointermove", onMove, { passive: true });
  var later = () => setTimeout(() => {
    if (requestIdleCallback) requestIdleCallback(() => this.loadPixels(), { timeout: 2000 });
    else this.loadPixels();
  }, 10000);
  if (document.readyState === "complete") later();
  else addEventListener("load", later, { once: true });
}
```

Zwei unabhängige Trigger, der frühere gewinnt: eine echte Zeigerbewegung (jemand ist im Begriff, etwas zu hovern) **oder** 10 s nach `load`, dann über `requestIdleCallback` zusätzlich entkoppelt. Das `matchMedia`-Gate steht vor beidem — auf Touch oder mit reduzierter Bewegung lädt das Skript nie. Was diese 10-Sekunden-Schwelle sicher macht, ist nicht die Zahl allein, sondern was bei ihr passiert: Sie liegt weit jenseits jedes PSI-Ruhefensters (Abschnitt 4), aber die bei ihr ausgelöste Arbeit muss trotzdem selbst billig bleiben und darf nicht in übersprungene `content-visibility`-Blöcke hineinlesen — sonst hält sie das Messfenster trotz guter Platzierung offen (der gemessene Gegenbeweis: die Notizen-Ausweichliste bei genau diesem Zeitpunkt, Abschnitt 4).

**`matchMedia`-Gates vor jeder gerätespezifischen Ladeentscheidung**, nicht nur eine Breitenregel: `(hover: hover) and (pointer: fine)` für reine Maus-Effekte, zusätzlich `(min-width: …)` wo ein Effekt zusätzlich Platz braucht, immer kombiniert mit dem `prefers-reduced-motion`-Check (`this.reduced()`). Eine Breitenregel allein schließt ein Tablet im Querformat mit Touch nicht korrekt aus (Abschnitt 0).

**Beobachtet wird nur gerenderter Inhalt — das `whenShown`/`watchShown`-Muster.** Ein `IntersectionObserver`-Ziel innerhalb eines übersprungenen `content-visibility`-Blocks zwingt den Browser, dessen Style zu berechnen, sobald es beobachtet wird — das war der Mechanismus hinter dem 125-ms-Ladefund von 14 Logo-Masken (Chromium-Herleitung: [rendern-hauptthread.md](rendern-hauptthread.md#7-intersectionobserver-in-einem-content-visibility-block-die-korrigierte-regel); die scharfe Kurzform „jeder Frame" ist dabei **korrigiert**: im eingeschwungenen Zustand kostet ein Ziel in einem bereits gesperrten Block wenig, teuer ist die Bootstrap-Phase vor der ersten Nähe-Bestimmung sowie jede Layout-Lesung auf einem Knoten im gesperrten Block). Die Abhilfe aus `v5/home.js`, gekürzt:

```js
var shown = new WeakMap();   // [data-cv]-Block -> true, solange gerendert
var waiting = [];            // [el, fn]: fn erst ausführen, wenn el gerendert ist
var watchers = [];           // { io, el, on, away }: Beobachtungsziele in deferred Blöcken

function isSkipped(el) {
  for (var n = el.closest("[data-cv]"); n; n = n.parentElement && n.parentElement.closest("[data-cv]")) {
    if (shown.get(n) !== true) return true;
  }
  return false;
}
function whenShown(el, fn) { isSkipped(el) ? waiting.push([el, fn]) : fn(); }

// Beobachten, während der Block gerendert ist; loslassen, wenn nicht.
function watchShown(io, el, away) {
  if (!el.closest("[data-cv]")) { io.observe(el); return; }
  var o = { io, el, on: !isSkipped(el), away };
  watchers.push(o);
  if (o.on) io.observe(el); else if (away) away();
}

document.addEventListener("contentvisibilityautostatechange", function (e) {
  var isShown = !e.skipped;
  shown.set(e.target, isShown);
  if (isShown) waiting = waiting.filter(([el, fn]) => !(e.target.contains(el) && !isSkipped(el) && (fn(), true)));
  watchers.forEach(function (o) {
    if (!e.target.contains(o.el)) return;
    var want = isShown && !isSkipped(o.el);
    if (want === o.on) return;
    o.on = want;
    if (want) o.io.observe(o.el); else { o.io.unobserve(o.el); if (o.away) o.away(); }
  });
}, true);
```

`away` beantwortet, was der Observer für ein Ziel außerhalb seiner Reichweite melden würde: „nicht sichtbar". Das ist nötig, weil ein Ziel, das seinen Beobachtungsbereich verlässt, immer „not intersecting" meldet, **bevor** der Block überspringt — Chrome rendert und überspringt einen `content-visibility:auto`-Block erst ab 150 % Sichtfensterhöhe Entfernung (Abschnitt 2), kein Seiten-eigener Observer reicht üblicherweise so weit. Ohne `away` bliebe ein Zustand fälschlich auf „sichtbar" stehen.

Gekürzt gegenüber `v5/home.js`: Die echte Fassung prüft vor jedem `isSkipped`/`watchShown`-Aufruf zusätzlich Browser-Unterstützung (`CSS.supports("content-visibility","auto")`, `oncontentvisibilityautostatechange`, `checkVisibility`) und schaltet das ganze System ab, wenn eine davon fehlt — dann gilt nichts als übersprungen, und alles beobachtet/rendert wie ohne dieses System. Ohne diese Prüfung würde ein Browser ohne `content-visibility`-Unterstützung sonst fälschlich alles als dauerhaft übersprungen behandeln.

**View-Cache statt Layout-Lesung, in jedem Handler, nicht nur im Zeichen-Loop.** Ein einziges Objekt (`this.view = { sy, w, h }`), gefüllt aus `scroll`-/`resize`-Listenern, ist die einzige Quelle für Scroll-Position und Fenstergröße — nicht `scrollY`, `innerWidth`/`innerHeight` oder `getBoundingClientRect()` direkt im Handler. Periodische Vollscans, die bei jedem Tick `getBoundingClientRect()` über viele Elemente lesen (ein Kollisions-/Ausweich-Scan alle 2 s über jedes Text-Element etwa), skalieren mit der Elementzahl der Seite und sind eine erzwungene Layout-Quelle, die dieselbe Cache-Regel verletzt, auch wenn sie „nur" alle 2 s statt jeden Frame läuft.

**Kein Polling.** Ein `setTimeout`-Loop, der auf DOM-Elemente wartet, die vielleicht nie erscheinen, läuft als reine Verschwendung über die gesamte Sitzungsdauer, wenn er vorher nicht prüft, ob sein Ziel auf der aktuellen Seite überhaupt existiert. Wiederkehrende Arbeit gehört an ein Ereignis (`contentvisibilityautostatechange`, `MutationObserver` mit engem Scope, `ResizeObserver`), nicht an ein Intervall.

**Event-Listener passiv, wo sie nichts verhindern.** `scroll` und `pointermove` sind in jedem gezeigten Beispiel `{ passive: true }` — der Browser darf dann scrollen/zeichnen, ohne auf den Handler zu warten.

**Aufräumen ist Teil der Funktion, nicht optional.** Jeder `ResizeObserver`/`IntersectionObserver`/`MutationObserver`, jeder Timer, jede `requestAnimationFrame`-Kette bekommt einen Rückweg: `ro.disconnect()`, `clearTimeout`, `cancelAnimationFrame`, `io.unobserve` plus Entfernen aus der eigenen `watchers`-Liste (`unwatch()` in `home.js`). Ein Canvas, das beim erneuten Mounten nicht prüft, ob sein Host schon eines trägt, hält seinen alten `requestAnimationFrame`-Loop und Pointer-Handler unsichtbar für immer am Leben (**gemessen**, gelöste Falle).

## 7. Build und Auslieferung

**Der Build erzwingt die Regeln dieser Anleitung, statt sie zu hoffen.** `tools/v5build.mjs` bricht mit einem `Error` ab, sobald eine seiner Annahmen nicht mehr stimmt — Prinzip: eine gefundene Textstelle muss **genau einmal** vorkommen (`once()`-Helfer wirft bei 0 oder ≥2 Treffern), sonst hat sich die Quelle unbemerkt geändert. Konkrete Tore, die diese Anleitung durchsetzen:

- **Eine Headline:** Das erste Element der Hero-Wortliste wird ins `<h1>` geschrieben; fehlt `heroWords[0].w`/`.r` oder das `<h1 data-hero-h1>`, bricht der Build ab (Abschnitt 0).
- **Lazy Marks:** Von allen `fetchpriority="high"`-Bildern behält nur das erste diese Priorität; ab dem zweiten wird hart zu `loading="lazy" decoding="async"` umgeschrieben, mit einer Mindestzahl-Prüfung (Abschnitt 3).
- **Panel `content-visibility:hidden`:** Das Mega-Menü-Panel wird über seinen datengetriebenen Selektor gesucht; **genau ein** Treffer mit mindestens einem Bild wird verlangt (Abschnitt 3).
- **Template für Geräte-exklusiven DOM:** Der Notizen-Layer wird strukturell geprüft (ein Layer, ≥ 20 Einträge) und in `<template>` verpackt; weicht die Struktur ab, bricht der Build ab (Abschnitt 3).
- **Keine eager Scripts:** Der generierte `<head>` darf den on-demand geladenen Skriptpfad (`pixel-engine.js`) nicht enthalten — eine `includes()`-Prüfung nach dem Zusammenbau wirft, falls doch.
- **Generierter Code muss parsen:** `node --check` auf die generierte Logikdatei, bevor sie geschrieben gilt — ein Syntaxfehler im generierten Code würde sonst die ganze Seite lautlos im Browser scheitern lassen.
- **Kopierte Methoden dürfen keine Framework-Reste tragen:** eine Regex-Prüfung (`/\bReact\./`) auf den kopierten, von React befreiten Code.

Dasselbe Prinzip gilt unabhängig vom Werkzeug: Jede strukturelle Invariante dieser Anleitung (eine Headline, ein LCP-Bild, Panel gesperrt, Template statt lebendigem DOM) wird als **Assertion im Build** kodiert, nicht als Konvention, die beim nächsten Refactor vergessen werden kann.

**Ausgelieferte Bytes wiegen, nicht schätzen.** v5build.mjs protokolliert nach jedem Lauf die tatsächlichen Größen (gerenderte Varianten, CSS-Regeln, generierte Logikdatei) — diese Zahlen gehören ins CHANGELOG, nicht nur in die Konsole. Minifizierung wird bei **jedem** Build aus derselben Quelle neu abgeleitet, nie von Hand parallel gepflegt, und Property-Mangling bleibt aus, sobald Code zur Laufzeit dynamisch/namentlich auf Objekteigenschaften zugreift — sonst bricht die minifizierte Fassung, ohne dass die unminifizierte etwas davon zeigt (**gemessen**, gefundener und behobener Fall).

**Gehashte Assets `immutable`, HTML/JS ohne Hash `max-age=0, must-revalidate`.** Ein Asset darf nur dann langfristig/`immutable` gecacht werden, wenn sich sein Dateiname bei jeder Inhaltsänderung mitändert. Ändern sich HTML und die zugehörige Runtime-JS-Datei gemeinsam und teilen sich denselben (nicht gehashten) Namen, darf **keines von beiden** `immutable` sein — sonst kann ein Browser mit gecachtem altem HTML gegen eine neue Runtime laufen oder umgekehrt: gemessenes Symptom war sichtbares Doppel-Rendering nach einem Deploy, behoben durch Hard-Reload. v5 fährt deshalb bewusst mit revalidierendem statt gehashtem CSS/JS und verliert dadurch **keine** Performance (Live gemessen: Desktop 99 trotz `max-age=0, must-revalidate` auf `v3.css`/`common.js`) — eine geplante `?v=`-Versionierung wurde aus genau diesem Grund nicht gebaut. Bilder und Fonts bekommen `max-age=31536000, immutable`.

**Kompression gilt auch für Verzeichnis-Routen ohne Dateiendung.** Eine dateiendungsbasierte Kompressions-Middleware kann `/` (Verzeichnis-Route) stillschweigend unkomprimiert ausliefern, während `/index.html` korrekt komprimiert wird — beide Routen zeigen auf denselben Inhalt, nur eine davon ist schnell. Vor jeder Messreihe gegen einen lokalen Server prüfen, ob **beide** Formen tatsächlich komprimieren (gemessener Fall: 907 KB unkomprimiert vs. 134 KB komprimiert für dieselbe Seite — reine Messartefakt-Differenz, keine reale Regression, aber genug, um jede absolute Zahl aus der betroffenen Messreihe wertlos zu machen). `scripts/prodserve.py` ist genau deshalb Pflicht statt `python -m http.server` (Abschnitt 0).

**Keine Bild-Neukodierung ohne Determinismus-Check.** WebP-/PNG-Kompressionsschritte im Build können je nach Maschine/Bibliotheksversion leicht unterschiedliche Bytes für dasselbe Quellbild erzeugen (**gemessen**, wiederkehrend beim lokalen Bauen auf verschiedenen Rechnern). Vor dem Commit von Build-Ausgaben prüfen, ob sich der Bildinhalt tatsächlich geändert hat, und reines Kodierrauschen verwerfen (`git checkout --` auf unveränderte Bilder nach dem Build) — sonst wächst die Historie mit Diffs, die nichts bedeuten.

**CSP aus dem gebauten Build ableiten, nicht von Hand pflegen.** Inline-Skripte, die der Build selbst erzeugt, bekommen ihren Hash automatisch aus dem tatsächlich gebauten Inhalt (nicht aus einer von Hand aktualisierten Liste, die beim nächsten Refactor veraltet); `script-src 'self'` erlaubt same-origin nachgeladene Skripte (Abschnitt 6), `style-src 'unsafe-inline'` nur, wo tatsächlich zur Laufzeit Inline-Styles gesetzt werden (z. B. `data-dyn`-Bindings). Der lokale Messserver muss dieselben Header wie Produktion setzen — sonst wird eine CSP-Regression erst nach dem Deploy sichtbar, nicht in einer lokalen Messung. Eine für die Live-Site verschärfte CSP kann auch die eigene Build-Tooling treffen, wenn diese denselben lokalen Server nutzt: Lädt ein Zwischenschritt des Builds selbst externe Skripte (z. B. ein Design-Export, der React von einem CDN zieht, um eine Zwischenversion zu rendern), bricht er lautlos an derselben Regel — der Build-Ordner braucht dann eine explizite Ausnahme, weil er nie öffentlich ausgeliefert wird (**gemessen**, gefundener und behobener Fall).

## 8. Prüfen vor dem Push

Immer gegen `scripts/prodserve.py`, nie gegen einen Dev-Server (Abschnitt 0). Die Reihenfolge folgt der Reihenfolge dieser Anleitung; jeder Befehl hat ein klares Bestehen-Kriterium, kein „sieht gut aus".

| # | Befehl | Besteht, wenn … |
| --- | --- | --- |
| 1 | `node scripts/lighthouse-psi.mjs <url> --mobile`¹ | Performance ≥ 95 (Ziel 100), Best Practices/A11y grün, `observedTraceEnd` vor jedem geplanten späteren Ereignis (Abschnitt 4/0) |
| 2 | `node scripts/lcp-window.mjs <url> --for 30 --mobile --cpu 4` | genau **ein** LCP-Kandidat nach dem ersten Bild, keiner erscheint später größer (Abschnitt 0); TTI erreicht; CLS ≤ 0,1 |
| 3 | `node scripts/requests.mjs <url> --for 12` | nichts lädt in den ersten Sekunden, was nicht sichtbar ist (Abschnitt 3); keine Duplikate; Bild-Maße gesetzt |
| 4 | `node scripts/mainthread.mjs <url> --for 12 --cpu 4 --slices` | nach 5 s keine Long Task (Abschnitt 4/6); „Other" nicht dominant |
| 5 | `node scripts/observers.mjs <url> --for 15 --sweep` | keine Beobachtungsziele in übersprungenen Blöcken (Abschnitt 6); kein Polling; keine Layout-Lesung pro Frame |
| 6 | `node scripts/animations.mjs <url> --sweep --reduced-motion` | keine Endlos-Animation außerhalb des Viewports; unter `prefers-reduced-motion` läuft keine Dekoration mehr (Abschnitt 4) |
| 7 | `node scripts/cv-audit.mjs <url> --mobile` | kein Stacking-Befund (Abschnitt 2); `contain-intrinsic-size` nah an der gemessenen Höhe; 150-%-Umschaltabstand wie erwartet |
| 8 | `node scripts/fps.mjs <url> --for 8 --cpu 1,4 --software-gl` | erster Paint bricht unter Software-GL nicht ein (Abschnitt 5); Loop pausiert außerhalb Viewport/Tab; Framerate schaltet unter Last adaptiv herunter |

¹ `lighthouse-psi.mjs` ist in `SKILL.md` als Werkzeug für PSI-nahe Lighthouse-Läufe dokumentiert; zum Stand dieser Anleitung (16.9.2026) ist das Skript **geplant**, noch nicht in `scripts/` vorhanden. Bis dahin ersetzt ein Lighthouse-CLI-Lauf mit PSI-äquivalenten Flags (`--throttling-method=simulate`, `--form-factor=mobile`, `--screenEmulation.mobile`) denselben Schritt — Details und der exakte Befehl: [lighthouse-psi.md](lighthouse-psi.md).

**Danach, nicht stattdessen:** PageSpeed Insights auf der tatsächlichen Preview- oder Live-URL, **beide** Formfaktoren (mobil ist die Zahl, die zählt — Desktop allein ist kein Beleg). Beide Ergebnisse mit Datum, Lighthouse-/Chrome-Version und den sechs Kernmetriken (Performance, FCP, LCP, TBT, CLS, Speed Index) ins Projekt-HANDOFF bzw. CHANGELOG, neben die Vorher-Zahl aus Schritt 1 dieser Tabelle — eine Zahl ohne ihren Vorher-Wert ist keine Aussage über eine Änderung. Erst danach gilt „geprüft".

## 9. Was diese Anleitung ausschließt

Jeder Eintrag hier ist ein Muster, das in einem der Projekte des Owners tatsächlich gebaut, gemessen und wieder verworfen wurde — nicht eine Vermutung.

- **Rotierende Headlines oder Hero-Bilder, jede späte größere Einblendung.** PageSpeed 95 → 60, LCP 20,5 s, weil jede Rotationsvariante ein neuer, größerer LCP-Kandidat wurde (Abschnitt 0). Bei einem Bild-Slider bekommt **nur** das erste Slide `priority`/`fetchpriority="high"` — jedes weitere lässt mehrere High-Priority-Requests um Bandbreite konkurrieren und macht die LCP-Messung instabil.
- **`IntersectionObserver`-Ziele „vermeiden, weil sie in übersprungenen Blöcken angeblich jeden Frame Layout erzwingen".** Diese scharfe Lesart ist **widerlegt** (Chromium-Quellcode, `intersection_geometry.cc`): Im eingeschwungenen Zustand steigt die Geometrie-Berechnung für ein gesperrtes Ziel früh und günstig aus. Teuer sind zwei andere, echte Mechanismen: die Bootstrap-Phase vor der ersten Nähe-Bestimmung (Kosten skalieren mit der Zielzahl) und jede Layout-Lesung auf einem Knoten im gesperrten Block (erzwingt Style + Layout **und** lädt dessen CSS-Bilder). Die Abhilfe bleibt dieselbe — erst beobachten, wenn der Block rendert (Abschnitt 6) —, aber die Begründung „jeder Frame" gehört nicht in Code-Kommentare oder Reviews; sie ist nicht das, was tatsächlich passiert. Vollständige Herleitung: [rendern-hauptthread.md](rendern-hauptthread.md#7-intersectionobserver-in-einem-content-visibility-block-die-korrigierte-regel).
- **`ResizeObserver` auf `<body>`, wenn `html, body { height: 100% }` gilt.** `body` feuerte in einer Messung genau **einmal** beim ersten Scroll, das Wurzelelement (`documentElement`) **16-mal**, mit einer Höhendifferenz von 16.523 → 12.477 px, weil zurückgestellte Sektionen ihre echte Höhe erst beim Rendern bekommen. Beobachtet wird das Wurzelelement oder ein konkreter Inhalts-Container, nie `<body>` unter dieser Bedingung.
- **`MutationObserver` mit `subtree: true` auf `<body>` (oder einer anderen breiten Wurzel), solange irgendwo eine hochfrequente Text-Animation läuft.** Eine Schreibmaschinen-Animation ändert das DOM alle 9–16 ms; ein dokumentweiter Observer löst dann bei jeder dieser Änderungen eine teure Anfrage aus. Gemessen: TBT 260 ms → 120 ms, Mobile-Score 94 → 98, allein durch engeres Scoping des Observers.
- **Viele gleichzeitig endlos laufende CSS-/SVG-Animationen auf kleiner Fläche.** Die Animation eines 34-px-Marken-Logos (ein SVG-Raster aus 146 `<rect>`-Zellen, vgl. Abschnitt 3) kostete 3,5 s Hauptthread — nicht der parallel laufende WebGL-Hintergrund, dem die Schuld zuerst gegeben wurde (A/B-Messung mit nur einer geänderten Variable deckte das auf). Ein einzelner Canvas-Zeichen-Loop ersetzt das bei gleichem visuellem Ergebnis deutlich günstiger (Abschnitt 4).
- **Gegen einen Dev-Server mit `no-store` oder `python -m http.server` messen.** Beides täuscht Performance-Probleme vor, die in Produktion nicht existieren: doppelte Downloads von Fonts/Sprites unter `no-store`, Speed Index 4,6 s statt 1,2 s ohne Kompression. Jede Messung, die daraus folgt, ist wertlos, bis sie gegen `scripts/prodserve.py` wiederholt wird (Abschnitt 0).
- **Eine Route ohne Dateiendung (`/`) ungeprüft für „genauso komprimiert wie `/index.html`" halten.** Eine dateiendungsbasierte Kompressions-Middleware kann genau die Startseiten-Route unkomprimiert lassen — gemessener Fall: 907 KB statt 134 KB für dieselbe Seite, ein 6,8-faches Gewicht, das nichts mit der Seite selbst zu tun hatte (Abschnitt 7).
- **`will-change`/`translateZ(0)` auf einem WebGL-Canvas.** Das Canvas ist bereits `position: fixed` und läuft bereits über die GPU-Pipeline (WebGL) — ein zusätzlicher Compositor-Layer-Hinweis hat dort nichts zu heben. Ebenso ohne Wirkung, geprüft und verworfen: Object Pooling gegen „Other"-Kosten (der Strom ist ein Shader, es gibt keine Pixel-Objekte pro Frame, GC lag bereits bei 0–2 ms) und `scheduler.yield` gegen dieselbe Kostenklasse (es teilt nur eigenes JavaScript auf; die IO-Berechnung läuft browserintern und ist davon nicht erreichbar).
- **Ein `<template>` durch ein lebendiges Custom-Element mit `{{ }}`-Platzhaltern ersetzen.** Ein `<template>` ist inert; ein Custom-Element, das Platzhalter-Markup stattdessen als lebendigen Teilbaum einbindet, lässt den Browser diesen Teilbaum vollständig parsen, layouten und malen, obwohl er nie sichtbar wird — gemessen ~4.200 statt ~2.200 Elemente beim Parsen (Abschnitt 3).

## Quellen

- `v5/home.js`, `v5/index.html`, `tools/motion-budget.js`, `tools/v5build.mjs` — mccain-digital, Arbeitsstand 16.9.2026
- `HANDOFF.md` (mccain-digital), Abschnitte „STAND 16.9. ABENDS", „STAND 16.9. NACHMITTAGS", „STAND 16.9. — Pixelstrom …", „Bekannte Fallstricke der Scroll-Choreografie", „Lehren, die ich nicht nochmal lernen will", „Gelöste Fallen (nicht erneut hineinlaufen)"
- Chromium main, HEAD `cabdc32a717663075a71718eb8750f6abdaedb64` (`intersection_geometry.cc`, `display_lock_utilities.cc`, `display_lock_document_state.cc`, `document.cc`, `css_image_value.cc`), abgerufen 16.09.2026
- CSS Containment 2 (W3C), §4.3 und §4.5; IntersectionObserver-Spezifikation
- Eigene Messungen 16.09.2026: `scratchpad/swgl_fcp.mjs` (Software-GL/FCP), Lighthouse-CLI 13.4.1 auf Chrome for Testing 148.0.7778.96 (Trace-Fenster OLD/NEW, `--only-categories=performance`)
- w3c/csswg-drafts#8542 „content-visibility: auto visibility check timing needs details"; Mozilla Bugzilla 1807253 „Unreliable timing for content-visibility:auto"
- `SKILL.md` (html-performance) — Zielwerte, Werkzeug-Tabelle, Ablauf
- [[neue-webseite]], [[web-skills-suite]], [[browser-verify]], [[audit-website]] — angrenzende Skills in der Bau-/Prüfkette
- Vertiefung im selben Skill: [messen.md](messen.md), [lighthouse-psi.md](lighthouse-psi.md), [laden-kritischer-pfad.md](laden-kritischer-pfad.md), [laden-javascript.md](laden-javascript.md), [laden-auslieferung.md](laden-auslieferung.md), [rendern-hauptthread.md](rendern-hauptthread.md), [rendern-animationen.md](rendern-animationen.md), [rendern-canvas-webgl.md](rendern-canvas-webgl.md), [widerlegt.md](widerlegt.md), [fallstudien.md](fallstudien.md)
