# Laden: Kritischer Pfad (LCP, CSS, Fonts, Bilder) — html-performance

> Teil des Skills [[html-performance]] · Stand 2026-09-16 · Belege: mccain-digital (HANDOFF, CHANGELOG, Commits), weitere Projekte des Owners, Recherche mit Quell-URLs

Scope: alles vom ersten Byte bis zum stabilen ersten Bild — die vier LCP-Phasen, Text- gegen Bild-LCP, der erste Paint ohne WebGL-Abhängigkeit, `fetchpriority`, kein Nachwachsen des LCP-Kandidaten, kritisches CSS und Render-Blocking, Fonts (Preload, `font-display`, Metrik-Overrides, Subsetting, Self-Hosting) und Bilder (Zuschnitt, `srcset`/`sizes`, Lazy Loading, CSS-Bilder, Formate, CLS-Maße, externe Platzhalterdienste, kleine Marken-Logos als Inline-SVG). JavaScript-Ladereihenfolge und Nachladen stehen in [laden-javascript.md](laden-javascript.md), Caching, Auslieferung und Build-Pipeline in [laden-auslieferung.md](laden-auslieferung.md). Laufzeitverhalten nach dem ersten Render: [rendern-hauptthread.md](rendern-hauptthread.md), [rendern-animationen.md](rendern-animationen.md), [rendern-canvas-webgl.md](rendern-canvas-webgl.md); Lighthouse/PSI-Scoring in [lighthouse-psi.md](lighthouse-psi.md), Mess-Methodik in [messen.md](messen.md), der Framework-Delta in [react-nextjs.md](react-nextjs.md).

Bis zum 16.9.2026 stand dieser Inhalt zusammen mit den anderen `Laden`-Themen in `laden.md`; die Regeln sind hier neu von 1 durchnummeriert, alte Verweise gelten nicht mehr.

## Kurzfassung

**LCP-Pfad**
- **LCP in vier Phasen denken und pro Phase gezielt eingreifen** — LCP hat vier Phasen mit je eigenem Fix — nicht pauschal optimieren ([→](#1-lcp-in-vier-phasen-denken-und-pro-phase-gezielt-eingreifen))
- **Text-LCP und Bild-LCP brauchen unterschiedliche Hebel** — Text-LCP hängt am Font, Bild-LCP an Auffindbarkeit im HTML ([→](#2-text-lcp-und-bild-lcp-brauchen-unterschiedliche-hebel))
- **Der erste Paint darf nicht von WebGL, Canvas oder dem GPU-Prozess abhängen** — Ohne GPU blockiert getContext(webgl) den ersten Paint um ~2 s ([→](#3-der-erste-paint-darf-nicht-von-webgl-canvas-oder-dem-gpu-prozess-abhängen))
- **fetchpriority gezielt und sparsam einsetzen, nie zusammen mit loading=lazy auf demselben Bild** — high sparsam (1–2 Bilder), low für Karussell-Nachbarn, nie high+lazy kombiniert ([→](#4-fetchpriority-gezielt-und-sparsam-einsetzen-nie-zusammen-mit-loadinglazy-auf-demselben-bild))
- **Nach dem ersten Render darf kein Element größer werden als der LCP-Kandidat** — Browser meldet größere LCP-Kandidaten bis zur ersten Interaktion weiter ([→](#5-nach-dem-ersten-render-darf-kein-element-größer-werden-als-der-lcp-kandidat))

**Kritisches CSS und Render-Blocking**
- **Kritisches CSS inline, den Rest auslagern — und den Trade-off kennen** — Above-the-fold-CSS inline, Rest in eine cachebare Datei auslagern ([→](#6-kritisches-css-inline-den-rest-auslagern--und-den-trade-off-kennen))
- **@import in CSS vermeiden** — @import lädt seriell, <link> lädt parallel — −32,7 % FCP im Praxisbeispiel ([→](#7-import-in-css-vermeiden))
- **Nicht-kritisches CSS nicht-blockierend nachladen** — media=print + onload lädt ein Stylesheet non-blocking nach ([→](#8-nicht-kritisches-css-nicht-blockierend-nachladen))
- **Ein persistiertes Theme-Flag gehört synchron inline in den <head>, vor dem ersten Stylesheet** — Theme-Flag im Head vor dem Stylesheet setzen, sonst falsche Farben in der Transition ([→](#9-ein-persistiertes-theme-flag-gehört-synchron-inline-in-den-head-vor-dem-ersten-stylesheet))

**Fonts**
- **Font-preload nur für die tatsächlich above-the-fold gerenderte Schrift setzen** — next/font preloadet standardmäßig jede Font — nur die above-the-fold-Schrift darf das ([→](#10-font-preload-nur-für-die-tatsächlich-above-the-fold-gerenderte-schrift-setzen))
- **crossorigin ist beim Font-Preload Pflicht, auch bei self-hosted Fonts** — ohne crossorigin lädt ein gepreloadeter Font ein zweites Mal ([→](#11-crossorigin-ist-beim-font-preload-pflicht-auch-bei-self-hosted-fonts))
- **font-display bewusst wählen: swap gegen optional abwägen** — swap = sofort sichtbar, aber CLS-Risiko; optional = 0 CLS, Font evtl. gar nicht ([→](#12-font-display-bewusst-wählen-swap-gegen-optional-abwägen))
- **Metrik-Override-Deskriptoren gegen Layout-Sprung beim Fontwechsel** — Fallback-Metriken per size-adjust/ascent-override an die Webfont angleichen ([→](#13-metrik-override-deskriptoren-gegen-layout-sprung-beim-fontwechsel))
- **Font-Dateigröße gezielt reduzieren: Subsetting oder Variable Font statt vieler Schnitte** — unicode-range subsetten oder eine Variable Font statt vieler Schnitte laden ([→](#14-font-dateigröße-gezielt-reduzieren-subsetting-oder-variable-font-statt-vieler-schnitte))
- **Self-Hosting statt Google-Fonts-CDN — mit ehrlicher Einschränkung** — Self-Hosting spart zwei Fremd-Origins, Effekt in der Praxis aber nicht garantiert groß ([→](#15-self-hosting-statt-google-fonts-cdn--mit-ehrlicher-einschränkung))
- **Bei generierten Font-Dateinamen auf Groß-/Kleinschreibungs-Kollisionen prüfen** — Google-Fonts-Dateinamen kollidieren auf case-insensitiven Dateisystemen still ([→](#16-bei-generierten-font-dateinamen-auf-groß-kleinschreibungs-kollisionen-prüfen))

**Bilder**
- **Bilder im Build auf das tatsächliche Seitenverhältnis der Anzeige-Box zuschneiden** — Box- und Bildverhältnis passen nicht zusammen — 43 % der Zeilen wurden weggeworfen ([→](#17-bilder-im-build-auf-das-tatsächliche-seitenverhältnis-der-anzeige-box-zuschneiden))
- **Eine reproduzierbare Bildpipeline mit festen Breiten und fester WebP-Qualität führen** — feste Breiten/Verhältnis/WebP-Qualität als Skript, nicht von Hand pro Bild ([→](#18-eine-reproduzierbare-bildpipeline-mit-festen-breiten-und-fester-webp-qualität-führen))
- **srcset und sizes immer gemeinsam einsetzen** — ohne sizes nimmt der Browser 100vw an, auch wenn das Bild schmaler dargestellt wird ([→](#19-srcset-und-sizes-immer-gemeinsam-einsetzen))
- **width/height oder aspect-ratio an jedem Bild gegen CLS** — ohne width/height reserviert der Browser keinen Platz — Sprung beim Laden ([→](#20-widthheight-oder-aspect-ratio-an-jedem-bild-gegen-cls))
- **loading=lazy: Distanzschwellen kennen, nie oberhalb der Falz einsetzen** — Chrome lädt lazy-Bilder ab 1.250 px (4G) / 2.500 px (3G) Nähe vor — nie aufs LCP-Bild ([→](#21-loadinglazy-distanzschwellen-kennen-nie-oberhalb-der-falz-einsetzen))
- **loading=lazy in einem versteckten Container lädt gar nicht — bis er sichtbar wird** — content-visibility:hidden + loading=lazy verhindert das Laden zuverlässig, visibility:hidden nicht ([→](#22-loadinglazy-in-einem-versteckten-container-lädt-gar-nicht--bis-er-sichtbar-wird))
- **decoding=async ergänzt loading, ersetzt es nicht** — decoding=async steuert nur den Decode-Zeitpunkt, nicht den Fetch-Zeitpunkt ([→](#23-decodingasync-ergänzt-loading-ersetzt-es-nicht))
- **CSS-Hintergrund- und Maskenbilder laden erst bei der Stilberechnung — auch überraschend früh** — ein IO-Ziel im content-visibility-Block kann dessen Hintergrund-/Maskenbild vorzeitig laden ([→](#24-css-hintergrund--und-maskenbilder-laden-erst-bei-der-stilberechnung--auch-überraschend-früh))
- **image-set() für auflösungsbasierte Bildauswahl nutzen** — image-set() wählt die CSS-Hintergrundvariante nach Gerätepixeldichte ([→](#25-image-set-für-auflösungsbasierte-bildauswahl-nutzen))
- **AVIF gegen WebP abwägen** — AVIF ca. 20–30 % kleiner als WebP, aber langsamer zu encodieren und etwas jünger unterstützt ([→](#26-avif-gegen-webp-abwägen))
- **Bildqualität 75 statt 80/85 als Default** — quality=75 spart ~15 % Bytes bei kaum sichtbarem Verlust gegenüber 80 ([→](#27-bildqualität-75-statt-8085-als-default))
- **Externe Platzhalterbild-Dienste sind ein versteckter Hauptkostentreiber** — picsum & Co. sind externe Requests ohne eigene Format-/Cache-Kontrolle — 4,9 von 8,9 MB in einem Fall ([→](#28-externe-platzhalterbild-dienste-sind-ein-versteckter-hauptkostentreiber))
- **Eine kleine, feste Menge Marken-Logos als Inline-SVG statt externer Requests** — feste Logo-Menge als Inline-SVG einbetten statt externer Requests/Icon-Font ([→](#29-eine-kleine-feste-menge-marken-logos-als-inline-svg-statt-externer-requests))

## Inhalt

- [Der LCP-Pfad: Phasen, Text vs. Bild, und was danach noch erscheinen darf](#der-lcp-pfad-phasen-text-vs-bild-und-was-danach-noch-erscheinen-darf)
- [Kritisches CSS und Render-Blocking](#kritisches-css-und-render-blocking)
- [Fonts](#fonts)
- [Bilder](#bilder)
- [Offene Fragen](#offene-fragen)
- [Quellen](#quellen)

## Der LCP-Pfad: Phasen, Text vs. Bild, und was danach noch erscheinen darf

### 1. LCP in vier Phasen denken und pro Phase gezielt eingreifen
**Warum:** Chrome zerlegt den Largest Contentful Paint in vier Sub-Phasen: TTFB (Zeit bis zum ersten HTML-Byte), Resource Load Delay (reine Discovery-Latenz zwischen TTFB und Ladestart der LCP-Ressource), Resource Load Duration (tatsächliche Ladezeit der LCP-Ressource) und Element Render Delay (vom Ladeende bis zum fertigen Rendern). Jede Phase hat eine andere Ursache und einen anderen Fix — ein pauschales "LCP ist zu hoch" führt ins Leere.
**Woran man es erkennt:** Chrome-DevTools-Performance-Panel → Insights → LCP-Breakdown zeigt alle vier Phasen mit Millisekundenwerten; scripts/lcp-window.mjs protokolliert zusätzlich jeden LCP-Kandidaten über die Zeit.
**Fix:** Empfohlene Zielverteilung: TTFB ~40 %, Resource Load Delay <10 %, Resource Load Duration ~40 %, Element Render Delay <10 % der Gesamtzeit. Je nach dominanter Phase: TTFB hoch → Redirects entfernen, Server-/CDN-Antwortzeit senken. Load Delay hoch → LCP-Ressource so früh wie das erste Dokument-Byte referenzierbar machen (fetchpriority="high", <link rel="preload">). Load Duration hoch → Kompression, moderne Bildformate, CDN. Render Delay hoch → render-blockierendes CSS/JS entfernen, serverseitig rendern.
**Beleg:** web.dev: "Die überwiegende Mehrheit der LCP-Zeit sollte für das Laden des HTML-Dokuments und der LCP-Quelle verwendet werden" — die beiden Delay-Phasen gelten als reiner, zu minimierender Leerlauf. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 2. Text-LCP und Bild-LCP brauchen unterschiedliche Hebel
**Warum:** Ist das LCP-Element Text, liegt der Hebel beim Web Font (Preload, font-display ungleich auto/block). Ist es ein Bild, muss die Quelle aus dem initialen HTML auffindbar sein — sichtbares src/srcset, kein Nachladen per JavaScript, kein loading="lazy".
**Woran man es erkennt:** LCP-Element im DevTools-Performance-Panel identifizieren (Text-Node vs. <img>/Hintergrundbild); bei Text-LCP zusätzlich prüfen, ob die zugehörige @font-face erst spät im Netzwerk-Wasserfall auftaucht.
**Fix:** Text-LCP: Font preloaden (siehe Fonts-Sektion) und font-display bewusst wählen. Bild-LCP: Quelle direkt im Server-HTML als <img src/srcset> ausliefern, nie hinter einem JS-Rendering-Schritt verstecken, und niemals loading="lazy" auf das wahrscheinliche LCP-Bild setzen — "Never lazy-load your LCP image, as that will always lead to unnecessary resource load delay."
**Beleg:** web.dev, Optimize LCP. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 3. Der erste Paint darf nicht von WebGL, Canvas oder dem GPU-Prozess abhängen
**Warum:** getContext("webgl") ist synchron und kann den Hauptthread hunderte Millisekunden blockieren, wenn keine echte GPU verfügbar ist (Software-Rendering via SwiftShader — z. B. in Headless-/CI-Umgebungen oder auf schwacher Hardware). Hängt der erste Paint der gesamten Seite an einem WebGL-Hintergrund, wartet er auf genau diesen Block — das ist zuerst eine Lade-Reihenfolge-Frage (CSS zuerst sichtbar, Canvas danach), kein Rendering-Detail.
**Woran man es erkennt:** Mobil emuliert (Chrome for Testing 148, 412×915, dpr 1,75) gegen http://localhost:8897/v5/: mit GPU (ANGLE Metal) FCP 188 ms (getContext 12 ms Dauer); mit SwiftShader FCP 2.216–2.392 ms (getContext-Long-Task 230–311 ms) — CPU-Drosselung ändert daran fast nichts, weil der GPU-Prozess davon nicht betroffen ist. Unter Maschinenlast kann daraus in einem Lighthouse-Lauf sogar NO_FCP werden. Volle Messreihe, Null-Checks, Safari/OffscreenCanvas-Details: [rendern-canvas-webgl.md](rendern-canvas-webgl.md#1-getcontext-ist-synchron-der-erste-paint-darf-nicht-auf-canvas-oder-webgl-warten).
**Fix:** Canvas-/WebGL-Hintergründe erst nach dem ersten Frame initialisieren (requestAnimationFrame nach load, oder requestIdleCallback), bis dahin einen reinen CSS-Fallback zeigen (Verlauf/Flächenfarbe). getContext gehört damit nie in den kritischen Pfad vor dem ersten Paint.
**Beleg:** mccain-digital, Messung 16.9.2026 (v5, mobil emuliert, 3 Szenarien à 1 Lauf, ruhige Maschine) · scratchpad/skill/raw/swgl_fcp_finding.md. · Sicherheit: gemessen
**Gilt für:** WebGL/Canvas

### 4. fetchpriority gezielt und sparsam einsetzen, nie zusammen mit loading=lazy auf demselben Bild
**Warum:** fetchpriority="high" hebt ein Bild im Ressourcen-Scheduler an — wirkt aber nur, wenn es auf "ein oder zwei" wirklich kritische Bilder pro Seite beschränkt bleibt, sonst verwässert sich die Wirkung. loading="lazy" verzögert den Request dagegen bis kurz vor dem Sichtbarwerden — kombiniert mit fetchpriority="high" bleibt ein außerhalb des Viewports liegendes Bild trotzdem verzögert, während ein sichtbares Bild vom Browser nach dem Layout ohnehin automatisch hochpriorisiert wird. Für Karussell-Bilder 2–4, die knapp außerhalb des Viewports liegen und sonst fälschlich als "nah genug" hochgestuft würden, ist umgekehrt fetchpriority="low" die richtige Lösung.
**Woran man es erkennt:** Network-Panel/scripts/requests.mjs: Priorität und Ladezeitpunkt jeder Bildanfrage prüfen; mehr als zwei fetchpriority="high"-Bilder auf einer Seite oder die Kombination loading="lazy" + fetchpriority="high" am selben <img> sind ein Fund.
**Fix:** Nur das tatsächliche LCP-Bild (i. d. R. das erste sichtbare Marken-/Hero-Bild) bekommt fetchpriority="high"; alle anderen Vorkommen desselben Bildes bzw. alles außerhalb des ersten Viewports bekommen loading="lazy" plus decoding="async". Karussell-Bilder 2–4: fetchpriority="low" statt high. Referenziert eine Seite ihr LCP-Bild nur aus CSS/JS, zusätzlich preloaden: <link rel="preload" fetchpriority="high" as="image" href="...">.
**Beleg:** web.dev, Fetch Priority — bestätigt für den eigenen Anwendungsfall in claim_checks: "nur das erste/sichtbare Logo-Bild fetchpriority=high, alle anderen loading=lazy" = confirmed. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 5. Nach dem ersten Render darf kein Element größer werden als der LCP-Kandidat
**Warum:** Der Browser meldet neue, größere LCP-Kandidaten so lange weiter, bis der Nutzer zum ersten Mal interagiert (Tap, Scroll, Tastendruck) — Mausbewegungen zählen dabei NICHT als Interaktion. Ein automatisierter Lighthouse-/PSI-Lauf interagiert nie, also bleibt das Fenster offen: Ein rotierender Hero-Text, eine später nachladende Bildvariante oder ein spät eingesetztes <template> kann jederzeit zum neuen, gemessenen LCP werden — auch wenn es rein optisch nur eine Kleinigkeit ist.
**Woran man es erkennt:** scripts/lcp-window.mjs protokolliert JEDEN LCP-Kandidaten über ein Zeitfenster, nicht nur den letzten — ein später, größerer Kandidat nach FCP ist der typische Fund. Die detaillierten Fallstudien zu rotierenden Hero-Headlines gehören zu [lighthouse-psi.md](lighthouse-psi.md) und [rendern-animationen.md](rendern-animationen.md#14-früher-first-paint-später-speed-index-durch-weiterlaufende-einblend-animationen).
**Fix:** Above-the-fold darf sich nach dem ersten Render kein Element vergrößern oder neu einsetzen, das größer als der aktuelle LCP-Kandidat ist — das gilt für rotierende Headlines, nachträglich eingeblendete Bild-/Textvarianten und spät gerenderte content-visibility-Blöcke gleichermaßen. Selbst per requestIdleCallback erst nach 10 Sekunden nachgeladene Arbeit zählt noch: PSI und der Lighthouse-CLI-Default (throttlingMethod simulate) beenden die Aufzeichnung erst nach 1.000 ms Ruhe ohne Long Tasks und ohne neue Netzwerkaktivität, die CLI-Option --throttling-method=devtools erst nach 5.250 ms — beide Schwellen liegen weit unter 10 Sekunden, der Trace läuft über eine idle-verzögerte Aktivität also in jedem Fall hinweg. Ein Zeitversatz per Idle-Callback ist damit kein Freibrief gegenüber der Messung, nur gegenüber der wahrgenommenen Ladezeit. Modus-Details: [lighthouse-psi.md](lighthouse-psi.md#2-rechne-beim-psi-standard-mit-1000-ms-ruhefenster-nicht-5250-ms).
**Beleg:** web.dev, LCP (Interaktionsgrenze) · GoogleChrome/lighthouse core/config/constants.js (Basiswerte) und core/config/config.js::overrideThrottlingWindows (wendet die 5.250-ms-Werte nur bei throttlingMethod ≠ simulate an) · lokal reproduziert (scratchpad/skill/raw/lighthouse_window.md): Trace-Ende derselben Seite 2.410–2.413 ms bei simulate, 13.266–13.279 ms bei devtools. Die frühere Annahme "PSI wartet 5,25 s" war zu grob, siehe [widerlegt.md](widerlegt.md#1-psi-wartet-525-sekunden-auf-netzwerk-cpu-ruhe). · Sicherheit: dokumentiert (Quellcode) + gemessen (lokal reproduziert)
**Gilt für:** allgemein

## Kritisches CSS und Render-Blocking

### 6. Kritisches CSS inline, den Rest auslagern — und den Trade-off kennen
**Warum:** Inline-CSS erspart einen Extra-Request und damit einen Roundtrip vor dem ersten Render, verhindert aber, dass der Browser dieses CSS für spätere Seitenaufrufe cachen kann; ist der Inline-Block zu groß, verzögert er selbst die Auslieferung des restlichen HTML. Die verbreitete "unter 14 KB halten"-Faustregel (TCP-Slow-Start, ursprünglich ~10 Segmente im ersten Roundtrip) gilt als überholt: TLS-/HTTP2-Handshake-Overhead frisst bereits 2 der 10 Pakete, und reales ACK-Verhalten lässt das Congestion-Window oft schon vor Ende der HTML-Übertragung auf 28–57 KB wachsen — eine harte 14-KB-Grenze ist damit kein verlässliches technisches Kriterium mehr, "klein halten" bleibt trotzdem richtig.
**Woran man es erkennt:** scripts/requests.mjs zeigt, ob vor dem ersten Paint noch ein externer CSS-Request in der Kette hängt; Größe des Inline-<style>-Blocks im HTML-Quelltext direkt ablesbar.
**Fix:** Above-the-fold-CSS einer performance-kritischen Einstiegsseite inline im <head> halten, das gemeinsame Design-System für alle übrigen Seiten in eine geteilte, browsercachebare styles.css auslagern. Kritisches CSS dabei klein halten (nur, was für den ersten sichtbaren Ausschnitt nötig ist) — sonst kehrt sich der Vorteil um. Als Zielgröße zählt der tatsächliche Inhalt, nicht eine starre 14-KB-Schwelle.
**Beleg:** mccain-digital: Das Design-System wurde 2026-06 vom Inline-<style> in ein geteiltes styles.css (~70 KB) ausgelagert (CHANGELOG 2026-06-28) — Stand 16.9.2026 ist sowohl im aktuellen Live-index.html als auch im v5-Rebuild das CSS wieder vollständig inline (v5: ein <style>-Block, ~75 KB), ohne externe Stylesheet-Datei; das unten empfohlene Auslagerungs-Pattern zeigt der aktuelle Code nicht (mehr). | web.dev, Extract Critical CSS (Trade-off-Beschreibung) | tunetheweb.com (Barry Pollard): 14-KB-Regel "outdated and overstated". Für Next.js siehe experimental.inlineCss in [react-nextjs.md](react-nextjs.md). · Sicherheit: dokumentiert (Empfehlung) + gemessen (Code-Stand 16.9.2026)
**Gilt für:** allgemein

### 7. @import in CSS vermeiden
**Warum:** @import erzwingt sequenzielles statt parallelisiertes Laden verschachtelter Stylesheets — jedes verschachtelte @import kostet einen zusätzlichen Round-Trip, bevor der Browser weiß, was als Nächstes zu laden ist. <link rel="stylesheet">-Tags im HTML laden dagegen parallel.
**Woran man es erkennt:** Im CSS-Quelltext nach @import url(...) suchen, insbesondere verschachtelt (eine importierte Datei importiert selbst wieder eine); im Network-Waterfall erscheinen die importierten Dateien dann sichtbar seriell statt parallel.
**Fix:** Jedes @import durch ein eigenes <link rel="stylesheet"> im HTML <head> ersetzen, oder die Dateien zur Build-Zeit zusammenführen (bundlen).
**Beleg:** Praxisbeispiel: mobile FCP-Verbesserung von 2.782 ms auf 1.872 ms (−32,7 %) nach Entfernen von @import. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 8. Nicht-kritisches CSS nicht-blockierend nachladen
**Warum:** Ein Stylesheet mit media="print" stuft der Browser als für die aktuelle Umgebung nicht zutreffend ein und lädt es non-blocking mit niedriger Priorität; onload schaltet media danach auf all, sodass es sofort angewendet wird, sobald es da ist.
**Woran man es erkennt:** Render-blockierende <link rel="stylesheet">-Einträge ohne media-Attribut im Kopf des Dokuments, für Bereiche, die nicht above-the-fold sind.
**Fix:** 
```html
<link rel="stylesheet" href="non-critical.css" media="print" onload="this.media='all'; this.onload=null;">
<noscript><link rel="stylesheet" href="non-critical.css"></noscript>
```
this.onload=null ergänzen, damit der Handler in manchen Browsern nicht doppelt feuert.
**Nicht für layoutrelevantes CSS:** Sobald das nachgeladene Stylesheet Maße, Abstände oder Schriften der sichtbaren Seite bestimmt, verschiebt der Swap-Moment das Layout und zählt als CLS. Gemessen 2026-07-20 (mccain-digital, Homepage v2): der asynchrone Swap des Designsystem-CSS war die CLS-Ursache, obwohl das Endbild pixelidentisch war; erst mit blockierendem bzw. inline geliefertem Layout-CSS lag CLS bei 0. Nur wirklich nachrangiges CSS (Below-the-fold-Module, Print, Themes) so laden; Details in [widerlegt.md](widerlegt.md#1-async-css-swap-per-preload-und-onload-ist-eine-sichere-optimierung).
**Beleg:** Filament Group, Loading Web Fonts / CSS the simpler way — Nachfolgemuster des klassischen loadCSS-Helfers, weiterhin Referenzmuster 2026; CLS-Fall mccain-digital 2026-07-20 ([fallstudien.md](fallstudien.md)). · Sicherheit: dokumentiert (Muster), gemessen (CLS-Falle)
**Gilt für:** allgemein

### 9. Ein persistiertes Theme-Flag gehört synchron inline in den <head>, vor dem ersten Stylesheet
**Warum:** Wird ein gespeichertes Theme (z. B. aus localStorage) erst nach dem DOM-Parsen per JavaScript umgeschaltet, startet eine sichtbare Farbübergangsanimation (FOUC-Analogon). Jeder Code, der in diesem Übergangsfenster getComputedStyle() abfragt — eine Canvas-Textrasterisierung, eine Kontrastmessung — fängt eine Zwischenfarbe der laufenden Transition ein und behält sie danach dauerhaft.
**Woran man es erkennt:** Ein kurzes falsches Theme beim Laden sichtbar (Flash); Kontrastwerte oder gerasterte Canvas-Farben, die nur bei der ERSTEN Überschrift jeder Seite und nur in einem bestimmten Modus falsch sind, sind ein typisches Symptom. Konkret gemessen: schlechteste Zelle 1,03:1 statt der nötigen 3:1.
**Fix:** Das gespeicherte Theme per synchronem Inline-<script> im <head> setzen, BEVOR das Haupt-Stylesheet verlinkt wird — nicht per DOMContentLoaded- oder Framework-Hook danach. Nach jedem Theme-Wechsel keinesfalls sofort von berechneten Stilen sampeln, sondern erst nach Abschluss einer laufenden Farbübergangsanimation.
**Beleg:** mccain-digital, HANDOFF: Kontrast schlechteste Zelle dunkel 3,42:1 / hell 4,21:1 nach dem Fix (nötig 3:1), gegenüber 1,03:1 vorher; Nebeneffekt: dunkles Aufblitzen im Hellmodus (FOUC) ebenfalls behoben. · Sicherheit: gemessen
**Gilt für:** allgemein

## Fonts

### 10. Font-preload nur für die tatsächlich above-the-fold gerenderte Schrift setzen
**Warum:** next/font (und viele andere Font-Loader) preloaden standardmäßig jede deklarierte Font-Instanz, unabhängig davon, ob sie above-the-fold oder überhaupt gerendert wird. Jeder unnötige Font-Preload konkurriert um Bandbreite mit der tatsächlich LCP-kritischen Ressource. "Above-the-fold" allein ist dabei kein ausreichender Filter: Auch innerhalb einer above-the-fold-Familie sind unicode-range-gated Subsets (z. B. latin-ext) und nicht-primäre Schnitte (z. B. italic) nur bedingt nötig — der Browser lädt sie ohnehin nur nach, wenn die Seite die betroffenen Zeichen bzw. den Schnitt tatsächlich braucht.
**Woran man es erkennt:** Chrome-DevTools-Konsole meldet "was preloaded but not used" für ungenutzte Font-Preloads; im Network-Waterfall liegen mehrere .woff2-Dateien vor dem eigentlichen LCP-Bild/-Text — auch mehrere Subsets/Schnitte derselben above-the-fold-Familie sind ein Fund.
**Fix:** Jede Font-Deklaration einzeln prüfen: wird sie above-the-fold gerendert? Wenn nein → preload:false. Auch bei einer above-the-fold-Familie zusätzlich prüfen, ob wirklich jeder gepreloadete Schnitt gebraucht wird: unicode-range-gated Subsets und nicht-primäre Schnitte (italic) i. d. R. nicht preloaden, nur die tatsächlich above-the-fold gerenderten — im Build idealerweise per Assertion erzwungen. Für das tatsächliche above-the-fold-Element gilt zusätzlich: ein System-Font-Stack ist oft die schnellere Wahl als ein Webfont, wenn ausgerechnet dieses Element LCP-Kandidat ist.
**Beleg:** whatever-recall: Mobile-LCP vorher 3,2 s / Speed Index 4,1 s mit drei JetBrains-Mono-.woff2 in der Preload-Chain, obwohl die einzige above-the-fold-Mono-Stelle (Hero-Eyebrow) danach komplett auf System-Mono-Stack umgestellt wurde und <head> nur noch Inter preloadet | mccain-cms: next/font preloadete Instrument_Serif, obwohl im Visual Editor nie gerendert — behoben (P2) | mccain-digital: latin-ext + italic preloadeten unnötig 40 KB trotz above-the-fold-Familie, Build-Assertion erzwingt seitdem genau zwei aufrechte Lateinisch-Schnitte vor dem Preload (Commit 1919705, 2026-09-11). · Sicherheit: gemessen
**Gilt für:** allgemein

### 11. crossorigin ist beim Font-Preload Pflicht, auch bei self-hosted Fonts
**Warum:** Fonts werden vom Browser immer im "anonymous"-Modus angefragt — fehlt crossorigin am <link rel="preload">, erkennt der Browser die vorgeladene Ressource nicht als dieselbe wieder und lädt die Font-Datei ein zweites Mal nach.
**Woran man es erkennt:** Im Network-Panel erscheint dieselbe .woff2-URL zweimal: einmal durch den Preload, einmal durch die eigentliche @font-face-Anwendung.
**Fix:** 
```html
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
```
Ohne Bedarf an Alt-Browser-Support genügt WOFF2 als einziges Format; preload ignoriert dabei jede unicode-range-Deklaration vollständig, lädt also immer die ganze Datei.
**Beleg:** web.dev, Best practices for fonts. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 12. font-display bewusst wählen: swap gegen optional abwägen
**Warum:** font-display definiert je @font-face eine Block- und eine Swap-Periode. swap zeigt sofort Fallback-Text (gut für LCP/FCP), tauscht später gegen den Webfont und riskiert dabei CLS. optional gibt dem Font nur eine kurze Ladezeit; kommt er nicht rechtzeitig, bleibt für den ganzen Seitenaufruf der Fallback (0 CLS durch Fontwechsel) — der Webfont erscheint beim Erstbesuch dann eventuell gar nicht.
**Woran man es erkennt:** CLS-Werte um einen Font-Swap herum im Performance-Trace; sichtbarer Sprung beim Fontwechsel deutet auf swap ohne Metrik-Override hin.
**Fix:** swap wählen, wenn sofort sichtbarer Text wichtiger ist als ein garantiert stabiles Layout (Standardfall für Fließtext); optional wählen, wenn 0 CLS Vorrang hat und ein gelegentlich fehlender Webfont akzeptabel ist. Exakte Millisekundenwerte für Block-/Swap-Perioden sind in der Spec nicht normativ fixiert (siehe Offene Fragen) — nur qualitativ vergleichbar: block = kurze Block- + unendliche Swap-Periode, swap = extrem kurze Block- + unendliche Swap-Periode, fallback = extrem kurze Block- + kurze Swap-Periode, optional = extrem kurze Block-Periode ohne Swap-Periode.
**Beleg:** MDN, @font-face/font-display | fontcompressor.com, font-display swap vs. optional. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 13. Metrik-Override-Deskriptoren gegen Layout-Sprung beim Fontwechsel
**Warum:** size-adjust, ascent-override, descent-override und line-gap-override passen die Metriken einer Fallback-Schrift an die Ziel-Webfont-Metriken an, sodass Zeilenhöhe und Zeichenbreite beim swap-Wechsel gleich bleiben und kein Layout-Sprung entsteht.
**Woran man es erkennt:** CLS-Beitrag exakt zum Zeitpunkt des Font-Ladens, obwohl width/height an Bildern bereits korrekt gesetzt sind — Verdacht fällt dann auf Font-Metrik-Unterschiede.
**Fix:** Für die Fallback-@font-face-Deklaration die vier Override-Deskriptoren passend zur Ziel-Schrift setzen. Tools wie Capsize berechnen die passenden Werte automatisch aus den Metriken beider Fonts, statt sie von Hand zu schätzen.
**Beleg:** debugbear.com, Web font layout shift. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 14. Font-Dateigröße gezielt reduzieren: Subsetting oder Variable Font statt vieler Schnitte
**Warum:** unicode-range sagt dem Browser, für welche Zeichen eine @font-face-Datei zuständig ist — bei Content in nur einem Schriftsystem lässt sich die Datei per Subsetting entsprechend verkleinern, der Browser lädt dann nur die tatsächlich im Text vorkommenden Blöcke nach. Variable Fonts bündeln dagegen mehrere Schnitte (Gewicht, Breite, eigene Achsen) einer Familie in einer Datei, deren Eigenschaften per CSS dynamisch gesteuert werden — sinnvoll, wenn eine Seite ohnehin viele Schnitte derselben Familie einsetzt.
**Woran man es erkennt:** Mehrere .woff2-Dateien derselben Familie (Regular/Medium/Bold/Italic ...) im Network-Panel, obwohl nur ein Teil davon tatsächlich verwendet wird; oder eine Font-Datei, die sichtbar mehr Zeichensätze abdeckt als der tatsächliche Seiteninhalt enthält.
**Fix:** Bei nicht-lateinischem oder gemischtem Content unicode-range je @font-face-Block setzen, statt eine ungeteilte Datei auszuliefern. Werden mehrere statische Schnitte derselben Familie gebraucht, stattdessen eine Variable-Font-Datei einbinden und Gewicht/Breite per CSS steuern.
**Beleg:** web.dev, Best practices for fonts. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 15. Self-Hosting statt Google-Fonts-CDN — mit ehrlicher Einschränkung
**Warum:** Google Fonts braucht zwei separate Origins (fonts.googleapis.com für das CSS, fonts.gstatic.com für die Dateien) — jede zusätzliche DNS-/TCP-/TLS-Kette kostet grob 200–600 ms, bevor das erste Font-Byte ankommt. Self-Hosting eliminiert beide externen Origins.
**Woran man es erkennt:** Zwei zusätzliche Fremd-Origins im Network-Panel beim ersten Laden der Schrift; preconnect/dns-prefetch-Einträge zu Google-Fonts-Domains im <head>.
**Fix:** Schrift selbst hosten statt per <link>/@import zu fonts.googleapis.com einzubinden (z. B. next/font/google, das self-hosted mit display:swap ausliefert). Web.dev relativiert allerdings: "auf dem Papier" sollte Self-Hosting schneller sein, in der Praxis ist der Unterschied "less clear cut" und hängt davon ab, ob die eigene Seite bereits CDN + HTTP/2 nutzt — vor einer aufwendigen Migration den tatsächlichen Effekt messen. Next.js-Implementierungsdetails: [react-nextjs.md](react-nextjs.md).
**Beleg:** web.dev, Best practices for fonts. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 16. Bei generierten Font-Dateinamen auf Groß-/Kleinschreibungs-Kollisionen prüfen
**Warum:** Google Fonts benennt den römischen und den kursiven Schnitt teils fast identisch (z. B. pxitypc9vs gegen pxiTypc9vs). Auf einem case-insensitiven Dateisystem (NTFS) überschreibt der zweite Download den ersten still — ohne Fehlermeldung beim Vendoring-Schritt.
**Woran man es erkennt:** Weniger Font-Dateien auf der Platte als erwartet; ein fehlender Schnitt liefert 404 im Deploy, weil die referenzierte Datei nie ankam.
**Fix:** Vendoring-Skript nach Familie-Stil-Subset statt nach der Original-URL benennen lassen und beim Bau hart abbrechen, wenn zwei Quell-URLs auf denselben Zieldateinamen fallen.
**Beleg:** mccain-digital, HANDOFF "Vier Fallen im Build": vier statt sechs erwartete Font-Dateien auf der Platte, fehlender Schnitt lieferte 404 im Deploy. · Sicherheit: gemessen
**Gilt für:** allgemein

## Bilder

### 17. Bilder im Build auf das tatsächliche Seitenverhältnis der Anzeige-Box zuschneiden
**Warum:** Passt das Bild-Seitenverhältnis nicht zum CSS-Box-Verhältnis, lädt der Browser die vollen Bilddaten und verwirft danach den durch object-fit/Overflow überschüssigen Teil beim Rendern — verschwendete Bytes und Dekodierzeit.
**Woran man es erkennt:** Seitenverhältnis von Originalbild und Ziel-Box vergleichen; eine Differenz lässt sich direkt in verworfene Zeilen umrechnen.
**Fix:** Bilder im Build-Schritt exakt auf das Seitenverhältnis der jeweiligen Anzeige-Box zuschneiden, nicht nur skalieren.
**Beleg:** mccain-digital, HANDOFF "✔ B — Bilder": Studiofoto Original 1200×800 in einer Box mit Verhältnis 2,625 (dargestellt als 1200×457) — 43 % der geladenen Bildzeilen wurden verworfen, berechnet aus Box- vs. Bildverhältnis. Nach dem Zuschnitt auf 1200×457 exakt passend zur Box. · Sicherheit: gemessen
**Gilt für:** allgemein

### 18. Eine reproduzierbare Bildpipeline mit festen Breiten und fester WebP-Qualität führen
**Warum:** Ohne festes Skript bekommen neue Fotos abweichende Größen/Kompression und machen Lighthouse-Ergebnisse zwischen Foto-Lieferungen nicht mehr vergleichbar.
**Woran man es erkennt:** Neue Bilder im Repo mit uneinheitlichen Zielbreiten, Formaten oder Qualitätsstufen gegenüber bereits geprüften Bildern.
**Fix:** Bilder mit PIL mittig auf ein festes Seitenverhältnis je Bildtyp zuschneiden (Projektbeispiel: 16/11 für Werk-Bilder, 4/5 für Porträts) und in zwei Breiten als WebP exportieren (z. B. 1200×825 + 640×440 bzw. Breiten 840/440), mit quality=82, method=6 und LANCZOS-Resampling — als wiederholbares Skript, nicht von Hand.
**Beleg:** mccain-digital, HANDOFF Zeile 3588-3597: konkretes, wiederholbares Python-Snippet dokumentiert, damit Dateinamen und Verhältnisse bei neuen Fotos exakt reproduziert werden. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 19. srcset und sizes immer gemeinsam einsetzen
**Warum:** srcset listet dem Browser nur die verfügbaren Bild-Optionen; erst sizes sagt ihm, wie breit das Bild tatsächlich dargestellt wird. Ohne sizes fällt der Browser bei w-Deskriptoren auf 100vw zurück — und wählt damit potenziell ein viel größeres Bild als nötig.
**Woran man es erkennt:** <img srcset> ohne sizes-Attribut im Quelltext, während das Bild in einer schmaleren Spalte/Karte dargestellt wird.
**Fix:** 
```html
<img srcset="a-640.webp 640w, a-1200.webp 1200w"
     sizes="(min-width: 768px) 50vw, 100vw"
     src="a-1200.webp" alt="...">
```
**Beleg:** web.dev, Learn responsive images. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 20. width/height oder aspect-ratio an jedem Bild gegen CLS
**Warum:** Ohne width/height (oder CSS aspect-ratio) kennt der Browser vor dem Laden der Bilddaten das Seitenverhältnis nicht und reserviert keinen Platz — beim Nachladen entsteht ein Layout-Sprung. Der CLS-Score eines Sprungs ist impact fraction × distance fraction; Schwellen (75. Perzentil): ≤0,1 gut, 0,1–0,25 verbesserungswürdig, >0,25 schlecht.
**Woran man es erkennt:** Sichtbarer Sprung beim Bildladen; CLS-Beitrag im Performance-Trace exakt zum Zeitpunkt des Bild-Renderns.
**Fix:** width/height aus den echten Bilddimensionen setzen, dazu height:auto; max-width:100% in CSS, nie width:auto. Vorsicht: explizite width/height-Attribute am <img> können ein per CSS gesetztes aspect-ratio aushebeln, wenn beide widersprüchliche Werte tragen — Details dazu und zu Fremd-Markup ohne diese Attribute: [lighthouse-psi.md](lighthouse-psi.md).
**Beleg:** web.dev, CLS und Learn responsive images (Konsens). · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 21. loading=lazy: Distanzschwellen kennen, nie oberhalb der Falz einsetzen
**Warum:** Chrome lädt lazy-loaded Bilder/Iframes ab einer Entfernung von 1.250 px zum Viewport bei effektivem 4G vor, bei 3G/langsamer bei 2.500 px (Werte seit Juli 2020, vorher 3.000/4.000 px) — Ziel ist, dass das Bild idealerweise fertig geladen ist, bevor der Nutzer dorthin scrollt. Bilder, die beim Laden voraussichtlich im sichtbaren Bereich liegen — allen voran das LCP-Bild — dürfen dagegen nie loading="lazy" bekommen.
**Woran man es erkennt:** scripts/requests.mjs zeigt den tatsächlichen Ladezeitpunkt relativ zum Scroll-Fortschritt; ein loading="lazy" auf dem LCP-Bild ist der schwerwiegendste Einzelfund in dieser Kategorie.
**Fix:** loading="lazy" auf alles unterhalb des ersten Viewports setzen (Standardfall), aber niemals auf das wahrscheinliche LCP-Bild oder sonstige above-the-fold-Bilder.
**Beleg:** web.dev, Browser-level image lazy-loading (seit Juli 2020, weiterhin gültig 2026). · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 22. loading=lazy in einem versteckten Container lädt gar nicht — bis er sichtbar wird
**Warum:** content-visibility:hidden wirkt für lazy-Bilder wie display:none: Solange der Container keine Layout-Box hat, feuert die geometrie-/viewportbasierte Lazy-Loading-Logik nicht, das Bild bleibt ungeladen. Bei visibility:hidden laden lazy-Bilder dagegen trotzdem, weil der Container weiterhin Layout-Raum belegt.
**Woran man es erkennt:** Bilder in einem geschlossenen Mega-Menü/Akkordeon prüfen: mit loading="lazy" + content-visibility:hidden auf dem Container bleiben sie beim Start unangefragt (scripts/requests.mjs); nicht-lazy Bilder werden dagegen in Chrome, Firefox und Safari sofort geladen, unabhängig vom Versteck-Mechanismus.
**Fix:** Geschlossene Panels (Mega-Menüs, Akkordeons, Tabs) mit content-visibility:hidden versehen und ihre Bilder zusätzlich mit loading="lazy" markieren — die Kombination verhindert das Laden zuverlässig, bis das Panel sichtbar wird. decoding="async" ist dabei kein Ersatz, siehe nächste Regel.
**Beleg:** claim_check (confirmed, Verdikt): entscheidender Faktor ist loading=lazy, nicht decoding=async | phpied.com, Image requests in hidden content (empirischer Cross-Browser-Test) | mccain-digital: geschlossenes Mega-Menü-Panel (321 Knoten) bekam content-visibility:hidden, Bilder laden lazy. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 23. decoding=async ergänzt loading, ersetzt es nicht
**Warum:** decoding beeinflusst ausschließlich den Zeitpunkt des Bild-DECODINGS nach dem Laden, nicht den Fetch-Zeitpunkt. async heißt: das Decodieren blockiert nicht die Darstellung anderer DOM-Inhalte — es hat aber keinerlei Einfluss darauf, OB oder WANN der Download beginnt.
**Woran man es erkennt:** decoding="async" ohne loading="lazy" auf einem außerhalb des Viewports liegenden Bild — das Attribut allein bewirkt hier nichts gegen unnötig frühes Laden.
**Fix:** decoding="async" als sinnvolle Ergänzung zu loading="lazy" einsetzen, nie als dessen Ersatz erwarten.
**Beleg:** MDN, HTMLImageElement.decoding | claim_check (confirmed): fetchpriority=high nur aufs Logo, Rest loading=lazy + decoding=async — decoding trägt zum Fetch-Zeitpunkt nichts bei, schadet aber auch nicht. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 24. CSS-Hintergrund- und Maskenbilder laden erst bei der Stilberechnung — auch überraschend früh
**Warum:** Ein per background-image referenziertes Bild wird nicht beim CSS-Parsen geladen, sondern erst, wenn der zugehörige Selektor auf ein Element im DOM matcht und dessen Stil berechnet wird (Blink: CSSImageValue::CacheImage beim Style-Recalc) — existiert kein passendes Element, lädt das Bild gar nicht. Das gilt vermutlich analog für mask-image über den gemeinsamen <image>-Werttyp, ist dafür aber nicht wortwörtlich extern belegt (nur durch eine Projektmessung gestützt). Ein IntersectionObserver-Ziel in einem BEREITS gesperrten content-visibility:auto-Block kostet im eingeschwungenen Zustand dagegen wenig und erzwingt NICHTS — Chromium bricht für Ziele in gesperrten Subtrees früh ab, ohne Style/Layout auszulösen (eine frühere, zu scharfe Projektannahme dazu ist widerlegt). Zwei andere, belegte Mechanismen laden ein Hintergrund-/Maskenbild trotzdem überraschend früh: In der Bootstrap-Phase, bevor content-visibility:auto seine Nähe zum Viewport überhaupt bestimmt hat, durchläuft JEDES Beobachtungsziel eine echte Geometrie-Berechnung inklusive Style/Bild-Fetch — die Kosten skalieren mit der Zielzahl; und jedes Layout-lesende API (getBoundingClientRect, offsetTop u. Ä.) auf einem Knoten IM gesperrten Block erzwingt Style und Layout der gesperrten Vorfahren und lädt dabei deren Bilder.
**Woran man es erkennt:** scripts/cv-audit.mjs zeigt content-visibility-Zustände und deren Wechsel; ein Hintergrund-/Maskenbild, das lädt, obwohl sein Block laut content-visibility:auto noch übersprungen sein sollte, deutet auf eines der beiden obigen Muster hin — nicht auf das bloße Vorhandensein eines IO-Ziels. Konkret gemessen: 14 Logo-Masken luden bei 125 ms statt gar nicht.
**Fix:** IO-Beobachtung eines Blocks erst starten, wenn er tatsächlich rendert (contentvisibilityautostatechange, skipped === false), statt jedes Kindelement von Anfang an einzeln zu beobachten — das vermeidet die Bootstrap-Phase-Kosten. Nie getBoundingClientRect, offsetTop, clientWidth o. Ä. auf einem Knoten innerhalb eines aktuell übersprungenen Blocks aufrufen. Voller Mechanismus (Chromium-Quellcode, alle Fälle): [rendern-hauptthread.md](rendern-hauptthread.md#7-intersectionobserver-in-einem-content-visibility-block-die-korrigierte-regel).
**Beleg:** web.dev warnt vor DOM-APIs, die Rendering in einem übersprungenen Subtree erzwingen; WPT-Test und Mozilla-Bugzilla #1807253 zum verwandten Timing-Problem | mccain-digital: 14 Logo-Masken luden bei 125 ms statt gar nicht, Ursache über Chromium-Quellcode verifiziert (scratchpad/skill/raw/chromium_io_verdict.md) — eine frühere, zu scharfe Lesart des Mechanismus ist widerlegt, siehe [widerlegt.md](widerlegt.md#6-intersectionobserver-ziele-in-gesperrten-subtrees-erzwingen-pro-frame-layout). · Sicherheit: gemessen (Zahlen) + dokumentiert (Mechanismus)
**Gilt für:** allgemein

### 25. image-set() für auflösungsbasierte Bildauswahl nutzen
**Warum:** Die CSS-Funktion image-set() liefert dem Browser mehrere Bildoptionen mit je einer Auflösungsangabe, aus denen er die zum Gerät passende wählt — Auflösung dient dabei als Proxy für Dateigröße, statt pauschal die größte Variante an alle Geräte zu senden.
**Woran man es erkennt:** Ein einzelnes hochauflösendes CSS-Hintergrundbild (background-image), das für alle Displays gleich groß ausgeliefert wird.
**Fix:** 
```css
background-image: image-set(
  "bg-1x.webp" 1x,
  "bg-2x.webp" 2x
);
```
**Beleg:** MDN, CSS image/image-set(). · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 26. AVIF gegen WebP abwägen
**Warum:** AVIF komprimiert bei gleicher visueller Qualität ca. 20–30 % kleiner als WebP und ca. 50 % kleiner als JPEG; WebP encodiert dafür schneller und läuft in mehr älteren Browsern.
**Woran man es erkennt:** Bildformat der ausgelieferten Dateien im Network-Panel (content-type/Dateiendung) gegen die erreichbare Kompression prüfen.
**Fix:** AVIF als primäres Format erwägen, wenn Encoding-Zeit im Build unkritisch ist; WebP als breiter unterstützte Alternative, wenn Encoding-Geschwindigkeit oder ältere Browser eine Rolle spielen. Support 2026: AVIF in Chrome 85+, Firefox 93+, Safari 16+ (~93–95 % global); WebP >97 % global — beide brauchen also ohnehin meist ein Fallback-Format oder <picture>.
**Beleg:** elementor.com, WebP vs. AVIF (Sekundärquelle). · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 27. Bildqualität 75 statt 80/85 als Default
**Warum:** Eine Reduktion des Qualitätsparameters von 80 auf 75 erzeugt einen kaum wahrnehmbaren Qualitätsverlust bei spürbar kleineren Dateien.
**Woran man es erkennt:** Aktuell verwendeter quality-Parameter im Bildoptimierer/Loader (z. B. Next.js Image, WebP-Export) über 75 ohne dokumentierten Grund.
**Fix:** quality=75 als Startwert für Website-Bilder setzen (Next.js Image quality-Parameter bzw. äquivalenter Encoder-Parameter), WebP-Format erzwingen und AVIF-Support in der Bild-Konfiguration zusätzlich aktivieren.
**Beleg:** meza-website, CHANGELOG "Performance"-Block: ~15 % kleinere Dateien bei laut Owner-Dokumentation kaum sichtbarem Qualitätsverlust. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 28. Externe Platzhalterbild-Dienste sind ein versteckter Hauptkostentreiber
**Warum:** Kostenlose Platzhalter-Bilddienste (picsum.photos, unsplash-source u. ä.) wirken performance-harmlos, bringen aber keine eigene Kontrolle über Format/Größe/CDN-Caching und zusätzlich einen weiteren Drittanbieter-DNS-/TLS-Handshake.
**Woran man es erkennt:** Domain eines Bild-Hosts im Network-Panel, der nicht die eigene Seite ist; auffällig hoher Anteil eines einzelnen externen Hosts am Gesamt-Payload.
**Fix:** Für Demo-/Platzhalter-Content immer selbst gehostete, optimierte Bilder verwenden (z. B. lizenzfreie Quellen wie Poly Haven über den eigenen Bild-Optimizer), nie einen externen Platzhalterdienst live schalten.
**Beleg:** 360, Next.js-Migrationsplan: 4,9 MB der 8,9 MB Mobile-Payload stammten aus externen picsum.photos-Bildern; nach Ersatz durch 10 selbst gehostete CC0-Panoramen über next/image stieg Mobile-Lighthouse von 56 % auf 95 %. · Sicherheit: gemessen
**Gilt für:** allgemein

### 29. Eine kleine, feste Menge Marken-Logos als Inline-SVG statt externer Requests
**Warum:** Drittanbieter-Logos (z. B. Tool-/Partner-Marken) als externe Bilddateien oder Icon-Font-Glyphen kosten jeweils einen eigenen Request und riskieren Icon-Font-FOUT/FOIT. Das gilt nur für wirklich kleine, einfache Marken (wenige Pfade, wenige Verwendungsstellen pro Seite) — ein komplexes, aus vielen Zellen/Pfaden aufgebautes Icon, das zusätzlich mehrfach auf derselben Seite wiederholt wird, multipliziert sein Markup bei jeder Wiederholung und wird selbst zur DOM-/Byte-Last.
**Woran man es erkennt:** Mehrere kleine, separate Bild-Requests für Marken-/Tool-Icons im Network-Panel, oder eine Icon-Font nur für eine Handvoll Symbole. Umgekehrter Fund: ein komplexes Inline-SVG (viele <rect>/<path>-Kindelemente mit Inline-Styles), das mehrfach auf einer Seite wiederholt wird, treibt DOM-Knotenzahl und HTML-Gewicht spürbar hoch.
**Fix:** Eine kleine, feste Menge an Marken-/Tool-Logos direkt als Inline-SVG im HTML/JS einbetten statt als externe Datei oder Icon-Font-Glyphe zu laden. Ist das Icon selbst komplex (viele Zellen/Pfade) und wird mehrfach pro Seite wiederholt, stattdessen einmalig zu einem einzelnen, cachebaren <img> rastern statt es pro Vorkommen als Inline-SVG zu vervielfachen.
**Beleg:** mccain-digital, Commit 9d2ec11: "real Claude / Cursor / ChatGPT marks as inline SVG (no external requests)" | mccain-digital: ein 146-Zellen-Inline-SVG-Mark, 5× pro Seite wiederholt, kostete 730 von 3.168 DOM-Knoten (23 %) und 138 von 845 KB — nach Rasterung zu einem gecachten <img>: DOM 3.168 → 2.438 Knoten, index.html 125.578 → 119.004 B gzip (Commit e34127b, 2026-09-13). · Sicherheit: dokumentiert + gemessen
**Gilt für:** allgemein

## Offene Fragen

- Die exakten Millisekunden-Werte der font-display-Block-/Swap-Perioden (für swap/fallback/optional) sind in der CSS-Fonts-4-Spec nicht normativ fixiert (nur qualitativ: "extrem kurz", "kurz", "unendlich") — oft zitierte Zahlen (~100 ms/~3 s) konnten nicht an einer Primärquelle verifiziert werden und wurden deshalb bewusst weggelassen.
- Ob mask-image exakt denselben Lade-Zeitpunkt-Mechanismus wie background-image hat, ist nur indirekt über den gemeinsamen <image>-Werttyp der CSS-Spec sowie die projekteigene Messung (14 Logo-Masken bei 125 ms) belegt — eine explizite Chromium- oder WHATWG-Aussage dazu wurde nicht gefunden.

## Quellen

- https://developer.chrome.com/docs/performance/insights/lcp-breakdown
- https://web.dev/articles/optimize-lcp
- https://web.dev/articles/fetch-priority
- https://web.dev/articles/lcp
- https://github.com/GoogleChrome/lighthouse/blob/main/core/config/constants.js
- https://github.com/GoogleChrome/lighthouse/blob/main/core/config/config.js
- https://web.dev/articles/extract-critical-css
- https://www.debugbear.com/blog/avoid-css-import
- https://www.filamentgroup.com/lab/load-css-simpler/
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decoding
- https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display
- https://fontcompressor.com/blog/font-display-swap-vs-optional
- https://www.debugbear.com/blog/web-font-layout-shift
- https://web.dev/articles/font-best-practices
- https://web.dev/learn/design/responsive-images
- https://web.dev/articles/browser-level-image-lazy-loading
- https://www.phpied.com/image-requests-in-hidden-content/
- https://bugzilla.mozilla.org/show_bug.cgi?id=1807253
- https://github.com/web-platform-tests/wpt/blob/master/css/css-contain/content-visibility/content-visibility-forced-layout-client-rects.html
- https://developer.mozilla.org/en-US/docs/Web/CSS/image/image-set
- https://elementor.com/blog/webp-vs-avif/
- https://web.dev/articles/cls
- https://www.tunetheweb.com/blog/critical-resources-and-the-first-14kb/
