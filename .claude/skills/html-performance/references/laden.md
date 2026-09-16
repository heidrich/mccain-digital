# Laden — html-performance

> Teil des Skills [[html-performance]] · Stand 2026-09-16 · Belege: mccain-digital (HANDOFF, CHANGELOG, Commits), weitere Projekte des Owners, Recherche mit Quell-URLs

Scope: alles vom ersten Byte bis zum stabilen ersten Bild — LCP-Pfad, kritisches CSS, Fonts, Bilder, JavaScript-Ladereihenfolge, Caching/Auslieferung, Build-Pipeline-Effekte. Laufzeitverhalten NACH dem ersten Render (Hauptthread, Animationen, content-visibility-Mechanik, Canvas/WebGL-Details) gehört zu [rendern.md](rendern.md) und wird hier nur verlinkt.

## Kurzfassung

- **LCP in vier Phasen denken und pro Phase gezielt eingreifen** — LCP hat vier Phasen mit je eigenem Fix — nicht pauschal optimieren ([→](#1-lcp-in-vier-phasen-denken-und-pro-phase-gezielt-eingreifen))
- **Text-LCP und Bild-LCP brauchen unterschiedliche Hebel** — Text-LCP hängt am Font, Bild-LCP an Auffindbarkeit im HTML ([→](#2-text-lcp-und-bild-lcp-brauchen-unterschiedliche-hebel))
- **Der erste Paint darf nicht von WebGL, Canvas oder dem GPU-Prozess abhängen** — Ohne GPU blockiert getContext(webgl) den ersten Paint um ~2 s ([→](#3-der-erste-paint-darf-nicht-von-webgl-canvas-oder-dem-gpu-prozess-abhängen))
- **fetchpriority gezielt und sparsam einsetzen, nie zusammen mit loading=lazy auf demselben Bild** — high sparsam (1–2 Bilder), low für Karussell-Nachbarn, nie high+lazy kombiniert ([→](#4-fetchpriority-gezielt-und-sparsam-einsetzen-nie-zusammen-mit-loadinglazy-auf-demselben-bild))
- **Nach dem ersten Render darf kein Element größer werden als der LCP-Kandidat** — Browser meldet größere LCP-Kandidaten bis zur ersten Interaktion weiter ([→](#5-nach-dem-ersten-render-darf-kein-element-größer-werden-als-der-lcp-kandidat))
- **Kritisches CSS inline, den Rest auslagern — und den Trade-off kennen** — Above-the-fold-CSS inline, Rest in eine cachebare Datei auslagern ([→](#6-kritisches-css-inline-den-rest-auslagern--und-den-trade-off-kennen))
- **@import in CSS vermeiden** — @import lädt seriell, <link> lädt parallel — −32,7 % FCP im Praxisbeispiel ([→](#7-import-in-css-vermeiden))
- **Nicht-kritisches CSS nicht-blockierend nachladen** — media=print + onload lädt ein Stylesheet non-blocking nach ([→](#8-nicht-kritisches-css-nicht-blockierend-nachladen))
- **Ein persistiertes Theme-Flag gehört synchron inline in den <head>, vor dem ersten Stylesheet** — Theme-Flag im Head vor dem Stylesheet setzen, sonst falsche Farben in der Transition ([→](#9-ein-persistiertes-theme-flag-gehört-synchron-inline-in-den-head-vor-dem-ersten-stylesheet))
- **Font-preload nur für die tatsächlich above-the-fold gerenderte Schrift setzen** — next/font preloadet standardmäßig jede Font — nur die above-the-fold-Schrift darf das ([→](#10-font-preload-nur-für-die-tatsächlich-above-the-fold-gerenderte-schrift-setzen))
- **crossorigin ist beim Font-Preload Pflicht, auch bei self-hosted Fonts** — ohne crossorigin lädt ein gepreloadeter Font ein zweites Mal ([→](#11-crossorigin-ist-beim-font-preload-pflicht-auch-bei-self-hosted-fonts))
- **font-display bewusst wählen: swap gegen optional abwägen** — swap = sofort sichtbar, aber CLS-Risiko; optional = 0 CLS, Font evtl. gar nicht ([→](#12-font-display-bewusst-wählen-swap-gegen-optional-abwägen))
- **Metrik-Override-Deskriptoren gegen Layout-Sprung beim Fontwechsel** — Fallback-Metriken per size-adjust/ascent-override an die Webfont angleichen ([→](#13-metrik-override-deskriptoren-gegen-layout-sprung-beim-fontwechsel))
- **Font-Dateigröße gezielt reduzieren: Subsetting oder Variable Font statt vieler Schnitte** — unicode-range subsetten oder eine Variable Font statt vieler Schnitte laden ([→](#14-font-dateigröße-gezielt-reduzieren-subsetting-oder-variable-font-statt-vieler-schnitte))
- **Self-Hosting statt Google-Fonts-CDN — mit ehrlicher Einschränkung** — Self-Hosting spart zwei Fremd-Origins, Effekt in der Praxis aber nicht garantiert groß ([→](#15-self-hosting-statt-google-fonts-cdn--mit-ehrlicher-einschränkung))
- **Bei generierten Font-Dateinamen auf Groß-/Kleinschreibungs-Kollisionen prüfen** — Google-Fonts-Dateinamen kollidieren auf case-insensitiven Dateisystemen still ([→](#16-bei-generierten-font-dateinamen-auf-groß-kleinschreibungs-kollisionen-prüfen))
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
- **defer, async und type=module unterscheiden und gezielt wählen** — defer für reihenfolgeabhängige DOM-Skripte, async für unabhängige, module+modulepreload für Graphen ([→](#29-defer-async-und-typemodule-unterscheiden-und-gezielt-wählen))
- **Dynamic import() bei Interaktion oder im Leerlauf nachladen** — import() bei Interaktion/Idle statt statischem Import, v. a. für Drittanbieter-Code ([→](#30-dynamic-import-bei-interaktion-oder-im-leerlauf-nachladen))
- **requestIdleCallback hat in Safari keinen verlässlichen Boden — Fallback einplanen** — Safari aktiviert requestIdleCallback bis 27.1 nicht standardmäßig — Polyfill nötig ([→](#31-requestidlecallback-hat-in-safari-keinen-verlässlichen-boden--fallback-einplanen))
- **Nachladen strikt an echte Nutzerabsicht und Zeit koppeln** — Interaktions-Skripte per matchMedia(hover/pointer) + 10s-Timer gaten, Touch bekommt sie nie ([→](#32-nachladen-strikt-an-echte-nutzerabsicht-und-zeit-koppeln))
- **Einmalige Einblender sofort laufen lassen, nur Endlos-Dekoration darf warten** — Endlos-Deko darf warten, ein bei opacity:0 startender Einblender nicht ([→](#33-einmalige-einblender-sofort-laufen-lassen-nur-endlos-dekoration-darf-warten))
- **Eine choreografierte Reveal-Animation braucht einen zeitbasierten Notausgang** — ohne Zeit-Notausgang hält eine Defer-Ketten-Animation sichtbaren Content bis zu 2,4 s zurück ([→](#34-eine-choreografierte-reveal-animation-braucht-einen-zeitbasierten-notausgang))
- **Schwere Animations-/3D-Bibliotheken für reine Deko-Effekte vermeiden** — für reine Deko-Effekte eigenes CSS/Canvas statt three.js/GSAP/Vanta prüfen ([→](#35-schwere-animations-3d-bibliotheken-für-reine-deko-effekte-vermeiden))
- **Eine schwere Library nie statisch importieren — komplett lazy plus parallele Plugin-Ladung** — schwere Libs nur bei Gebrauch laden, Plugins parallel statt seriell — max() statt Summe ([→](#36-eine-schwere-library-nie-statisch-importieren--komplett-lazy-plus-parallele-plugin-ladung))
- **Third-Party-Facades für schwere Embeds** — statische Facade statt sofortigem Voll-Embed, echtes Embed erst bei Klick ([→](#37-third-party-facades-für-schwere-embeds))
- **Teure, asset-abhängige Vorbereitung ins Idle legen, nicht in die erste Interaktion** — asset-abhängige teure Vorbereitung beim Idle vorwegnehmen statt bei der ersten Interaktion ([→](#38-teure-asset-abhängige-vorbereitung-ins-idle-legen-nicht-in-die-erste-interaktion))
- **JS-Splitting ohne Deferring spart keine Auswertungszeit — nur Attribution** — Splitten allein spart keine ms — der Wert liegt im dadurch möglichen Deferring ([→](#39-js-splitting-ohne-deferring-spart-keine-auswertungszeit--nur-attribution))
- **Analytics-/Marketing-Skript-Injection selbst hinter Consent gaten** — Tracking-Skript darf erst NACH Consent überhaupt eingefügt werden, nicht nur deaktiviert sein ([→](#40-analytics-marketing-skript-injection-selbst-hinter-consent-gaten))
- **Eine kleine, feste Menge Marken-Logos als Inline-SVG statt externer Requests** — feste Logo-Menge als Inline-SVG einbetten statt externer Requests/Icon-Font ([→](#41-eine-kleine-feste-menge-marken-logos-als-inline-svg-statt-externer-requests))
- **Ein dokumentiertes Bundle-Größen-Budget als laufende Guardrail** — ein Byte-Budget mit fester Schwelle prüft sich bei jedem PR, "so klein wie möglich" nicht ([→](#42-ein-dokumentiertes-bundle-größen-budget-als-laufende-guardrail))
- **Vor dem Löschen von scheinbar ungenutztem JS: unreached ist nicht dasselbe wie tot** — eine Coverage-Messung zeigt "unerreicht in dieser Aufnahme", nicht "tot" — 63 % Beispielquote ([→](#43-vor-dem-löschen-von-scheinbar-ungenutztem-js-unreached-ist-nicht-dasselbe-wie-tot))
- **Resource Hints (preconnect/dns-prefetch/Early Hints) nur für wirklich bald gebrauchte Origins** — preconnect nur für bald wirklich gebrauchte Origins, sonst dns-prefetch oder nichts ([→](#44-resource-hints-preconnectdns-prefetchearly-hints-nur-für-wirklich-bald-gebrauchte-origins))
- **immutable nur für Assets mit Content-Hash im Dateinamen** — immutable nur bei Content-Hash im Namen — sonst kann eine geänderte Datei nie ankommen ([→](#45-immutable-nur-für-assets-mit-content-hash-im-dateinamen))
- **HTML und die zugehörige Runtime-JS-Datei nie gemeinsam immutable cachen** — HTML+JS gemeinsam immutable cachen kann zu sichtbarem Doppel-Rendering nach Deploy führen ([→](#46-html-und-die-zugehörige-runtime-js-datei-nie-gemeinsam-immutable-cachen))
- **Content-Hash-Umbenennung bringt nur etwas, wenn die referenzierende HTML selbst langfristig cachebar ist** — Hash-Umbenennung lohnt sich nur, wenn auch die referenzierende HTML langfristig cachebar ist ([→](#47-content-hash-umbenennung-bringt-nur-etwas-wenn-die-referenzierende-html-selbst-langfristig-cachebar-ist))
- **Cache-Header-Wirkung nur gegen einen produktionsnah konfigurierten Server prüfen** — no-store verhindert Wiederverwendung auch innerhalb einer Seite — Dev-Server täuscht Duplikate vor ([→](#48-cache-header-wirkung-nur-gegen-einen-produktionsnah-konfigurierten-server-prüfen))
- **Cache-Buster per Query-String als Notlösung auf Hosts ohne granulare Cache-Kontrolle** — Query-String-Versionierung als Notlösung, wenn der Host selbst lange Cache-Zeiten erzwingt ([→](#49-cache-buster-per-query-string-als-notlösung-auf-hosts-ohne-granulare-cache-kontrolle))
- **Verzeichnis-Routen vor der Kompressionsprüfung auf index.html auflösen** — Verzeichnis-Route ohne Auflösung auf index.html maß sich in einem Fall 6,8× zu schwer ([→](#50-verzeichnis-routen-vor-der-kompressionsprüfung-auf-indexhtml-auflösen))
- **bfcache kennen und nicht versehentlich ausschließen** — bfcache spart bei Zurück/Vorwärts komplett Netzwerk+Skriptstart — no-store/unload schließen aus ([→](#51-bfcache-kennen-und-nicht-versehentlich-ausschließen))
- **Kompression: Brotli ist Standard, Zstd wächst, beide schlagen gzip** — Brotli praktisch überall verfügbar und ~14 % kleiner als gzip, Zstd wächst aber noch lückenhaft ([→](#52-kompression-brotli-ist-standard-zstd-wächst-beide-schlagen-gzip))
- **Speculation Rules API für Mehrseiten-Sites erwägen, aber Support-Lücken einplanen** — prerendert die wahrscheinliche nächste Seite, aber nur in Chromium wirklich verbreitet ([→](#53-speculation-rules-api-für-mehrseiten-sites-erwägen-aber-support-lücken-einplanen))
- **Minifizierung bei jedem Build aus derselben Quelle ableiten, Property-Mangling gezielt abschalten** — Minifizierung aus einer Quelle je Build ableiten, Property-Mangling bei dynamischem Zugriff aus ([→](#54-minifizierung-bei-jedem-build-aus-derselben-quelle-ableiten-property-mangling-gezielt-abschalten))
- **Gewichtsanteil je Datei einzeln nachmessen statt zu vermuten** — der reale Gewichtsfund kann in einer ganz anderen Datei liegen als vermutet ([→](#55-gewichtsanteil-je-datei-einzeln-nachmessen-statt-zu-vermuten))
- **Inhalt nicht doppelt oder dreifach ausliefern — zur Bauzeit kompilieren statt zur Laufzeit interpretieren** — Design-Tool-Exporte liefern denselben Inhalt teils dreifach — zur Bauzeit kompilieren spart 24 KB gz/Seite ([→](#56-inhalt-nicht-doppelt-oder-dreifach-ausliefern--zur-bauzeit-kompilieren-statt-zur-laufzeit-interpretieren))
- **Build-Reihenfolge: Alle Runtime-Assets vor dem Browserstart an ihrem Ort** — Runtime-Assets müssen vor dem Start eines rendernden Browser-Prozesses am Ort liegen ([→](#57-build-reihenfolge-alle-runtime-assets-vor-dem-browserstart-an-ihrem-ort))
- **Moderne CSS-Parser können bei unausgeglichenen Klammern ganze Blöcke lautlos verschlucken** — Lightning CSS & Co. verschlucken bei Klammerfehlern ganze Regel-Blöcke ohne Fehlermeldung ([→](#58-moderne-css-parser-können-bei-unausgeglichenen-klammern-ganze-blöcke-lautlos-verschlucken))
- **Bild-Encoding zwischen Maschinen ist nicht deterministisch — inhaltlich prüfen, nicht nur per Byte-Diff** — WebP/PNG-Encoding erzeugt je nach Maschine leicht andere Bytes trotz gleichem Bildinhalt ([→](#59-bild-encoding-zwischen-maschinen-ist-nicht-deterministisch--inhaltlich-prüfen-nicht-nur-per-byte-diff))
- **Bild-Assets zentral verwalten und auf Duplikate, Auflösung und größte Verwendung prüfen** — Bildreferenzen zentral verwalten, per Hash auf Duplikate und auf größte Verwendungsbox prüfen ([→](#60-bild-assets-zentral-verwalten-und-auf-duplikate-auflösung-und-größte-verwendung-prüfen))
- **Sitemap- und llms.txt-Generierung vom Performance-Build trennen** — sitemap.xml/llms.txt beeinflussen die Ladezeit der Seite selbst nicht ([→](#61-sitemap--und-llmstxt-generierung-vom-performance-build-trennen))
- **Drittanbieter-Laufzeit-Bibliotheken selbst hosten, nicht nur Fonts** — dieselbe Origin-Logik wie bei Fonts gilt auch für CDN-geladene JS-Libraries wie React ([→](#62-drittanbieter-laufzeit-bibliotheken-selbst-hosten-nicht-nur-fonts))
- **Ein Preload für ein großes Skript kann den FCP verschlechtern statt verbessern** — der Preload konkurriert mit dem Dokument selbst um Priorität — vorher/nachher messen ([→](#63-ein-preload-für-ein-großes-skript-kann-den-fcp-verschlechtern-statt-verbessern))

## Inhalt

- [Der LCP-Pfad: Phasen, Text vs. Bild, und was danach noch erscheinen darf](#der-lcp-pfad-phasen-text-vs-bild-und-was-danach-noch-erscheinen-darf)
- [Kritisches CSS und Render-Blocking](#kritisches-css-und-render-blocking)
- [Fonts](#fonts)
- [Bilder](#bilder)
- [JavaScript-Ladereihenfolge](#javascript-ladereihenfolge)
- [Caching und Auslieferung](#caching-und-auslieferung)
- [Build-Pipeline-Effekte](#build-pipeline-effekte)

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
**Woran man es erkennt:** Mobil emuliert (Chrome for Testing 148, 412×915, dpr 1,75) gegen http://localhost:8897/v5/: mit GPU (ANGLE Metal) FCP 188 ms (getContext 12 ms Dauer); mit SwiftShader FCP 2.216–2.392 ms (getContext-Long-Task 230–311 ms) — CPU-Drosselung ändert daran fast nichts, weil der GPU-Prozess davon nicht betroffen ist. Unter Maschinenlast kann daraus in einem Lighthouse-Lauf sogar NO_FCP werden. Volle Messreihe, Null-Checks, Safari/OffscreenCanvas-Details: [rendern.md](rendern.md#46-getcontext-ist-synchron-der-erste-paint-darf-nicht-auf-canvas-oder-webgl-warten).
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
**Woran man es erkennt:** scripts/lcp-window.mjs protokolliert JEDEN LCP-Kandidaten über ein Zeitfenster, nicht nur den letzten — ein später, größerer Kandidat nach FCP ist der typische Fund. Die detaillierten Fallstudien zu rotierenden Hero-Headlines gehören zu [lighthouse-psi.md](lighthouse-psi.md) und [rendern.md](rendern.md).
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
**Fix:** IO-Beobachtung eines Blocks erst starten, wenn er tatsächlich rendert (contentvisibilityautostatechange, skipped === false), statt jedes Kindelement von Anfang an einzeln zu beobachten — das vermeidet die Bootstrap-Phase-Kosten. Nie getBoundingClientRect, offsetTop, clientWidth o. Ä. auf einem Knoten innerhalb eines aktuell übersprungenen Blocks aufrufen. Voller Mechanismus (Chromium-Quellcode, alle Fälle): [rendern.md](rendern.md#7-intersectionobserver-in-einem-content-visibility-block-die-korrigierte-regel).
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

## JavaScript-Ladereihenfolge

### 29. defer, async und type=module unterscheiden und gezielt wählen
**Warum:** defer ist non-blocking für den Parser und führt das Skript nach vollständigem Parsing in Dokumentreihenfolge aus, vor DOMContentLoaded — richtig für Skripte, die das ganze DOM brauchen oder deren Reihenfolge wichtig ist. async ist ebenfalls non-blocking, führt aber sofort nach Fetch-Ende aus; die Reihenfolge zwischen mehreren async-Skripten ist NICHT garantiert — richtig für unabhängige Skripte wie Zähler/Ads. type="module" verhält sich für Einstiegsmodule wie defer, löst aber zuerst den kompletten Abhängigkeitsgraphen auf; rel="modulepreload" kann diesen Graphen zusätzlich vorab holen UND parsen/kompilieren, sodass Modulbäume parallel statt sequenziell aufgelöst werden.
**Woran man es erkennt:** Ein <script> ohne defer/async/type=module im <head> blockiert den Parser sichtbar im Waterfall; mehrere async-Skripte mit versehentlicher Reihenfolgeabhängigkeit zeigen sich als gelegentlich fehlschlagende Initialisierung.
**Fix:** Reihenfolgeabhängige, DOM-nutzende Skripte: defer. Unabhängige Drittanbieter-Skripte: async. Modul-Code mit größerem Abhängigkeitsbaum: type="module", ergänzt um <link rel="modulepreload"> für die wichtigsten Einstiegsmodule.
**Beleg:** MDN, <script>-Referenz / Community-Konsens. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 30. Dynamic import() bei Interaktion oder im Leerlauf nachladen
**Warum:** import() kann gezielt bei Nutzerinteraktion nachgeladen werden; für First-Party-Code nur empfohlen, wenn ein Prefetch vor der Interaktion nicht möglich ist. Für Drittanbieter-Code passt "bei Interaktion" oder "im Leerlauf" dagegen sehr gut, weil dessen Code ohnehin nicht zum Erstrender beiträgt.
**Woran man es erkennt:** Ein statisch importiertes, aber erst bei Klick/Hover benötigtes Modul im initialen Bundle (Bundle-Analyzer).
**Fix:** Interaktionsgebundenen First-Party- und praktisch jeden Drittanbieter-Code per import() statt statischem Import laden. Ergänzend per Bundler-Hinweis (z. B. webpackPrefetch: true) einen Resource-Hint einfügen, der das Modul schon im Leerlauf vorlädt, um die Interaktions-Latenz zu verstecken.
**Beleg:** web.dev, Code-splitting JavaScript. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 31. requestIdleCallback hat in Safari keinen verlässlichen Boden — Fallback einplanen
**Warum:** requestIdleCallback hat global ca. 81 % Unterstützung, ist in Safari (Desktop und iOS) aber bis mindestens Version 27.1 weiterhin NICHT standardmäßig aktiv, sondern nur hinter einem WebKit-Feature-Flag — nur die Technology-Preview-Version unterstützt es aktiv.
**Woran man es erkennt:** Feature-Detection ("requestIdleCallback" in window) fehlt vor dem Aufruf; auf Safari fällt der Code dann entweder auf einen Fehler oder unbeabsichtigt auf sofortige Ausführung zurück.
**Fix:** Für produktive Safari-Nutzer immer einen setTimeout-Polyfill bereithalten, statt requestIdleCallback ungeprüft aufzurufen.
**Beleg:** caniuse.com, requestIdleCallback (Stand 2026, Safari bis 27.1 hinter Flag). · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 32. Nachladen strikt an echte Nutzerabsicht und Zeit koppeln
**Warum:** Alles, was nicht angezeigt wird, muss auch nicht in den ersten Sekunden geladen werden — Owner-Vorgabe "alles was nicht angezeigt wird, muss auch nicht in den ersten 10 Sekunden geladen werden". Funktionalität, die nur für Desktop-Maus-Nutzer sichtbar/nutzbar ist (Hover-Effekte, dekorative Maus-Interaktion), braucht auf Touch-Geräten überhaupt keine Bytes.
**Woran man es erkennt:** scripts/requests.mjs --interact N zeigt, was erst bei echter Interaktion nachlädt, und markiert dies auf der Zeitleiste. Vorher/Nachher gemessen: Requests in 12 s (Desktop) 28 → 11 (davon die schwerste Engine erst bei 10 s); DOM-Elemente ~2.540 → 2.206.
**Fix:** Ein schweres Interaktions-Skript erst bei der ersten echten Mausbewegung ODER 10 s nach load laden, zusätzlich per Media Query auf (hover:hover) and (pointer:fine) beschränken — auf Touch-Geräten lädt es dann nie. Inhalte, die erst bei Interaktion eingesetzt werden, als inertes <template> im initialen Markup halten statt sie serverseitig fertig zu rendern. Bei mehreren gleichartigen Bildern nur das above-the-fold-Bild mit fetchpriority="high" markieren, den Rest loading="lazy". Achtung: Der Trace bleibt für PSI/CLI-Default (simulate) bis 1.000 ms Ruhe offen, für CLI mit --throttling-method=devtools bis 5.250 ms (siehe Regel "Nach dem ersten Render darf kein Element größer werden ...") — beide Werte liegen weit unter 10 Sekunden, ein requestIdleCallback-Timer ist also kein Freibrief gegenüber der Messung, nur gegenüber der wahrgenommenen Ladezeit.
**Beleg:** mccain-digital, HANDOFF STAND 16.9.: Requests in 12 s 28 → 11, DOM ~2.540 → 2.206; nur das Header-Markenzeichen behält fetchpriority="high", vier weitere Vorkommen laden lazy; geschlossenes Mega-Menü (321 Knoten) bekommt content-visibility:hidden. · Sicherheit: gemessen
**Gilt für:** allgemein

### 33. Einmalige Einblender sofort laufen lassen, nur Endlos-Dekoration darf warten
**Warum:** Viele Deko-/Hinweis-Elemente starten zu früh und beanspruchen Hauptthread/Layout während des von PSI gemessenen kritischen Ladefensters — sie lassen sich aber nicht pauschal verzögern: Ein Einblender, der bei opacity:0 startet, darf NICHT pausiert werden, sonst wirkt die Seite sichtbar leer. Endlosschleifen dürfen dagegen gefahrlos warten.
**Woran man es erkennt:** Iterationszahl der Animation prüfen (nur am lebenden Animation-Objekt ablesbar, meist nicht aus CSS grep-bar): Infinity = Dekoration, darf warten; jede endliche Zahl ist ein Einblender, der laufen MUSS. Reine Geräte-Breitenregeln reichen für "nur Desktop/Maus" nicht aus — sie lassen Tablets im Querformat durch, (pointer:fine) kombinieren.
**Fix:** Beim Verzögern von Deko-/Hinweiselementen strikt trennen: einmalige Einblender (enden bei einer endlichen Iterationszahl, starten oft bei opacity:0) laufen sofort; Endlosschleifen dürfen per Timer/Interaktion verzögert werden. Zusätzlich (pointer:fine) mit einer Breitenschwelle kombinieren, um Tablets im Querformat korrekt auszuschließen.
**Beleg:** mccain-digital, HANDOFF "STAND 13.9. 03:00": TBT 1.440 → 1.185 ms nach Cookie-Verzögerung (auf 7 s) + Engine-Deferring; Layoutlesungen 4.010 → 1.823 nach Notizen-Anpassung. · Sicherheit: gemessen
**Gilt für:** allgemein

### 34. Eine choreografierte Reveal-Animation braucht einen zeitbasierten Notausgang
**Warum:** Wartet eine choreografierte Hero-Animation auf ein Startsignal, das erst nach einer langen Defer-Kette verfügbar wird, hält sie bei kaltem Ladezustand sichtbaren Inhalt zurück und wirkt wie ein Rendering-Fehler statt wie Absicht.
**Woran man es erkennt:** Kalt gemessen: FCP ~1.130 ms, ein drittes defer-Skript (wartet auf eine 140-KB-Engine) bei ~1.100 ms, die Reveal-Sequenz hält alles auf 0 und wird erst bei ~2.400 ms fertig — bis dahin nur Rahmen-/Guide-Elemente sichtbar. Warm gemessen (Paint 72–80 ms) bleibt das volle Schauspiel unauffällig.
**Fix:** Die Choreografie zusätzlich zum eigentlichen Trigger gegen performance.now() > Schwelle prüfen (Projektwert: 600 ms) — ist die Schwelle überschritten UND FCP bereits erfolgt, gilt Inhalt als "überfällig" und wird sofort gezeigt statt weiter choreografiert zu werden.
**Beleg:** mccain-digital, HANDOFF NACHTRAG 2: kalt FCP ~1.130 ms / fertige Choreografie erst ~2.400 ms, warm Paint 72–80 ms. · Sicherheit: gemessen
**Gilt für:** allgemein

### 35. Schwere Animations-/3D-Bibliotheken für reine Deko-Effekte vermeiden
**Warum:** Effekt-Rezept-Sammlungen binden für reine Hintergrund-Dekoration oft three.js, GSAP, Vanta oder ähnliche Bibliotheken ein — zusätzliches Bundle-Gewicht für etwas, das sich häufig auch mit eigenem CSS/Canvas erreichen lässt. Existiert im Projekt bereits ein library-freies Reveal-/Animationsmuster (CSS + IntersectionObserver/MutationObserver), deckt es neue UI-Bereiche oft ohne neue Abhängigkeit ab.
**Woran man es erkennt:** Bundle-Analyzer zeigt eine schwere Animationsbibliothek, deren Einsatz sich auf einen einzelnen Deko-Effekt beschränkt.
**Fix:** Vor dem Hinzuziehen einer Animationslibrary für einen neuen UI-Bereich prüfen, ob ein bereits vorhandenes, library-freies Pattern denselben Effekt liefert; für neue Deko-Effekte handgebaute CSS-/Canvas-Rezepte bevorzugen.
**Beleg:** mccain-digital, Commit d73393b: von rund 90 verfügbaren Effekt-Rezepten (die Hälfte davon three.js/GSAP/Vanta/Unicorn Studio) nur zwei CSS/Canvas-eigene übernommen — Projekt hatte sich bereits zweimal gegen schwere Bibliotheken für Hintergrundeffekte entschieden | 360, CHANGELOG: bestehendes data-reveal + useReveal(MutationObserver)-Pattern der Homepage 1:1 im Backend-Bereich statt GSAP wiederverwendet. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 36. Eine schwere Library nie statisch importieren — komplett lazy plus parallele Plugin-Ladung
**Warum:** Wird eine schwere Library nur auf manchen Seiten/Features gebraucht, kostet ein statischer Import sie auf JEDER Seite. Werden mehrere Teilmodule (Plugins) zusätzlich seriell importiert, addieren sich ihre Ladezeiten, statt dass der kritische Pfad nur vom langsamsten Einzel-Chunk abhängt.
**Woran man es erkennt:** Bundle-Analyzer zeigt die Library im initialen Bundle, obwohl sie nur auf einem Teil der Seiten aktiv genutzt wird.
**Fix:** Library + alle Plugins per dynamic import erst beim ersten tatsächlichen Gebrauch laden (0 KB im initialen Bundle). Vorab je Seite/Feature ermitteln, welche Teilmodule wirklich gebraucht werden, und diese dann parallel per Promise.all statt nacheinander importieren — der kritische Pfad wird dadurch max(core, plugin) statt core + plugin. Einen Modul-Cache führen, damit wiederholte Mounts nicht erneut importieren.
**Beleg:** mccain-cms, CHANGELOG Sprint 09.6 (page-scanner.ts, gsap-loader.ts), ADR-028: Controller-Chunk ~12 KB lazy, Worst-Case-Seite mit allen Plugins ~96 KB nach dem ersten Mount. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 37. Third-Party-Facades für schwere Embeds
**Warum:** Eine Facade ist ein statisches Platzhalter-Element, das optisch dem echten Drittanbieter-Embed ähnelt, aber erst bei Interaktion durch das echte, schwere Embed ersetzt wird — z. B. lite-youtube-embed für YouTube.
**Woran man es erkennt:** Ein vollständiges Drittanbieter-Embed (Video-Player, Karten-Widget) lädt bereits beim ersten Seitenaufruf, obwohl es meist gar nicht angeklickt wird.
**Fix:** Schweres Embed durch eine leichte Facade ersetzen; üblich zusätzlich: beim mouseover schon zum Anbieter preconnecten, erst beim Klick das eigentliche Embed laden.
**Beleg:** web.dev, Third-party facades. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 38. Teure, asset-abhängige Vorbereitung ins Idle legen, nicht in die erste Interaktion
**Warum:** Hängt ein Effekt von asynchron ladenden Assets ab (z. B. ein SVG, das erst laden muss, bevor seine Pixel gescannt werden können), blockiert eine synchron beim ersten Interaktionsmoment gebaute Vorbereitung genau diesen Moment sichtbar.
**Woran man es erkennt:** Ein spürbarer Ruckler oder eine Verzögerung exakt beim ersten Hover/Tab-Wechsel, der/die verschwindet, sobald die Vorbereitung vorgezogen wird.
**Fix:** Die teure Vorbereitung (Asset laden, zeichnen, Pixel scannen o. ä.) einmalig ausführen, sobald die Seite idle ist, und das Ergebnis danach bereithalten — nicht an den ersten Interaktionsmoment binden. Jeden Fehlerpfad (Ladefehler, fehlende API) so behandeln, dass der Ausgangszustand unverändert bleibt.
**Beleg:** mccain-digital, Commit b463ff4: Favicon-Dissolve-Effekt — Canvas-Aufbau läuft einmalig bei Seiten-Idle, 182 Glyph-Pixel gefunden, 1.050-Byte PNG-Data-URL erzeugt. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 39. JS-Splitting ohne Deferring spart keine Auswertungszeit — nur Attribution
**Warum:** Reines Aufteilen einer JS-Datei in mehrere Dateien ändert nicht die Gesamtbytezahl, die geparst/ausgewertet werden muss — die Auswertungszeit bleibt gleich. Der Nutzen liegt in besserer Performance-Attribution und darin, dass einzelne Teile danach ÜBERHAUPT erst gezielt deferrt werden können.
**Woran man es erkennt:** Ein Performance-Trace vor/nach einem reinen Split ohne begleitendes Deferring zeigt dieselbe Gesamt-Skriptzeit, nur auf mehrere benannte Dateien verteilt.
**Fix:** JS-Splitting explizit als Vorbereitung für echtes Deferring einzelner Teile einplanen, nicht als eigenständige Performance-Maßnahme verkaufen oder erwarten.
**Beleg:** mccain-digital, HANDOFF "STAND 13.9. 03:00": "JS splitten: bringt keine Auswertungszeit (dieselben Bytes), aber Zuordnung und echtes Deferring." · Sicherheit: gemessen
**Gilt für:** allgemein

### 40. Analytics-/Marketing-Skript-Injection selbst hinter Consent gaten
**Warum:** Naive Consent-Banner laden Tracking-Skripte oft sofort und deaktivieren nur die Funktionalität danach — das tatsächliche <script>-Einfügen kostet dann trotzdem Bytes und Hauptthread-Zeit, auch ohne Einwilligung.
**Woran man es erkennt:** Ein Analytics-/Marketing-Skript erscheint im Network-Panel, bevor der Nutzer eine Consent-Wahl getroffen hat.
**Fix:** Das tatsächliche Einfügen des <script>-Tags hinter den Consent-Status gaten, nicht nur dessen Reporting-Verhalten — vor/ohne Zustimmung soll das Skript null Bytes/Requests kosten.
**Beleg:** mccain-digital, Commit 092bdc1: "Google Analytics loads only after the user grants analytics consent." · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 41. Eine kleine, feste Menge Marken-Logos als Inline-SVG statt externer Requests
**Warum:** Drittanbieter-Logos (z. B. Tool-/Partner-Marken) als externe Bilddateien oder Icon-Font-Glyphen kosten jeweils einen eigenen Request und riskieren Icon-Font-FOUT/FOIT. Das gilt nur für wirklich kleine, einfache Marken (wenige Pfade, wenige Verwendungsstellen pro Seite) — ein komplexes, aus vielen Zellen/Pfaden aufgebautes Icon, das zusätzlich mehrfach auf derselben Seite wiederholt wird, multipliziert sein Markup bei jeder Wiederholung und wird selbst zur DOM-/Byte-Last.
**Woran man es erkennt:** Mehrere kleine, separate Bild-Requests für Marken-/Tool-Icons im Network-Panel, oder eine Icon-Font nur für eine Handvoll Symbole. Umgekehrter Fund: ein komplexes Inline-SVG (viele <rect>/<path>-Kindelemente mit Inline-Styles), das mehrfach auf einer Seite wiederholt wird, treibt DOM-Knotenzahl und HTML-Gewicht spürbar hoch.
**Fix:** Eine kleine, feste Menge an Marken-/Tool-Logos direkt als Inline-SVG im HTML/JS einbetten statt als externe Datei oder Icon-Font-Glyphe zu laden. Ist das Icon selbst komplex (viele Zellen/Pfade) und wird mehrfach pro Seite wiederholt, stattdessen einmalig zu einem einzelnen, cachebaren <img> rastern statt es pro Vorkommen als Inline-SVG zu vervielfachen.
**Beleg:** mccain-digital, Commit 9d2ec11: "real Claude / Cursor / ChatGPT marks as inline SVG (no external requests)" | mccain-digital: ein 146-Zellen-Inline-SVG-Mark, 5× pro Seite wiederholt, kostete 730 von 3.168 DOM-Knoten (23 %) und 138 von 845 KB — nach Rasterung zu einem gecachten <img>: DOM 3.168 → 2.438 Knoten, index.html 125.578 → 119.004 B gzip (Commit e34127b, 2026-09-13). · Sicherheit: dokumentiert + gemessen
**Gilt für:** allgemein

### 42. Ein dokumentiertes Bundle-Größen-Budget als laufende Guardrail
**Warum:** "So klein wie möglich" ist kein prüfbares Kriterium. Ein konkretes, dokumentiertes Bundle-Budget (z. B. Initial-Paint-Bundle ≤110 KB gzip, LCP mobil 4G <2,5 s) lässt sich bei jedem Feature-PR tatsächlich gegen den Build-Output prüfen.
**Woran man es erkennt:** npm run build-Output (Bundle-Größe pro Route/Chunk) gegen keine dokumentierte Schwelle, sondern nur gegen ein Bauchgefühl.
**Fix:** Ein festes Budget pro Projekt dokumentieren (Initial-Bundle-Grenze, Grenze für Chunks) und als Faustregel definieren: reine UI-Komponenten dürfen ins Initial-Bundle, jeder Library-Import über einer festen Schwelle (Projektbeispiel: >20 KB) wird ein eigener Lazy-Chunk.
**Beleg:** 360, wiki/architecture/overview.md und .claude/docs/feedback.md: Initial-Paint-Bundle ≤110 KB gzip, Supabase-JS + Three.js dynamic-imported außerhalb des Initial-Paints, LCP mobil 4G <2,5 s. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 43. Vor dem Löschen von scheinbar ungenutztem JS: unreached ist nicht dasselbe wie tot
**Warum:** Coverage-Werkzeuge zeigen nur, was während der konkreten Aufzeichnung tatsächlich ausgeführt wurde. Eine breite API-Oberfläche, von der eine Seite nur einen Teil aufruft, ist "unerreicht", aber potenziell jederzeit erreichbar — kein wirklich toter Code.
**Woran man es erkennt:** Eine hohe "ungenutzt"-Quote in einer Coverage-Messung (z. B. Chrome DevTools Coverage), während die Aufzeichnung nur einen einzelnen Nutzerpfad (etwa Scrollen) abbildet.
**Fix:** Vor dem Löschen scheinbar ungenutzten Codes jeden potenziellen Eingang gegen ALLE Seiten UND gegen echte Interaktion prüfen, nicht nur gegen eine reine Scroll-Aufzeichnung.
**Beleg:** mccain-digital, HANDOFF "STAND 13.9. 03:30": 221,3 KB JS ausgeliefert, 139,4 KB (63 %) nie ausgeführt; pixel-engine.js zu 92 % nie ausgeführt (bietet 16 Eingänge, die Seite ruft auf 21 Seiten nur zwei davon auf), react-dom zu 60 %, support.js zu 46 %. · Sicherheit: gemessen
**Gilt für:** allgemein

### 44. Resource Hints (preconnect/dns-prefetch/Early Hints) nur für wirklich bald gebrauchte Origins
**Warum:** preconnect baut DNS+TCP+TLS zu einem Origin vorab auf — der Browser schließt eine ungenutzte Verbindung nach 10 Sekunden wieder, und zu viele preconnects verzögern andere wichtige Ressourcen, weil sie aus demselben begrenzten Socket-/TLS-Pool bedient werden. dns-prefetch (nur DNS-Lookup, günstiger) ist die Alternative für weniger kritische Drittanbieter-Domains. HTTP-Statuscode 103 Early Hints (RFC 8297) erlaubt dem Server zusätzlich, vor der endgültigen Antwort bereits Link-Header zu senden, damit der Browser Ressourcen noch früher vorzieht — unterstützt seit Chrome 103 (2022) und Firefox 123 (2024), empfohlen nur über HTTP/2 oder neuer.
**Woran man es erkennt:** Mehr als drei bis vier <link rel="preconnect">-Einträge im <head>, oder ein preconnect zu einem Origin, der erst Sekunden später oder gar nicht gebraucht wird.
**Fix:** <link rel="preconnect"> gezielt für jeden externen Host setzen, von dem above-the-fold Assets (Bilder, Fonts, API) geladen werden; für weniger kritische Drittanbieter-Domains stattdessen dns-prefetch. Die "richtige" Obergrenze ist uneinheitlich belegt (siehe Offene Fragen) — Praxis-Konsens tendiert zu 2–4 wirklich kritischen Origins pro Seite. Ob 103 Early Hints auf der eigenen Plattform ankommt, per curl -v gegen eine echte Deployment-URL verifizieren, nicht annehmen.
**Beleg:** meza-website, CHANGELOG "Performance": <link rel=preconnect> zu Supabase Storage ergänzt, ~300 ms DNS/TLS gespart (dokumentiert, nicht gemessen) | web.dev, Preconnect and dns-prefetch | MDN, HTTP 103. · Sicherheit: dokumentiert
**Gilt für:** allgemein

## Caching und Auslieferung

### 45. immutable nur für Assets mit Content-Hash im Dateinamen
**Warum:** Cache-Control: immutable unterdrückt die Revalidierungs-Anfrage beim manuellen Reload (Firefox ab 49 über HTTPS, Safari ab 11; Chrome implementiert das Schlüsselwort gar nicht separat, ignoriert es aber folgenlos). Das ist nur sicher, wenn sich der Inhalt hinter der URL per Definition nie ändert — also bei einem Content-Hash oder einer Versionsnummer im Dateinamen. Vercel setzt genau dafür standardmäßig public, max-age=31536000, immutable; Next.js-Dateien im public/-Ordner ohne Hash bekommen dagegen nur max-age=0.
**Woran man es erkennt:** Ein Asset trägt immutable/eine sehr lange max-age, obwohl sein Dateiname sich bei einer Inhaltsänderung NICHT automatisch ändert.
**Fix:** Nur Dateien mit Content-Hash/Versionsnummer im Namen (z. B. app.a1b2c3.js, hero.png?v=deadbeef) mit Cache-Control: public, max-age=31536000, immutable ausliefern. Alles andere braucht entweder eine andere Cache-Strategie oder muss erst gehasht werden.
**Beleg:** mccain-digital, Commit 645d034: vercel.json lässt CSS/JS revalidieren statt immutable, Bilder/Fonts (Name trägt Größe) bleiben 1 Jahr immutable — Performance blieb bei 99 auf dem Edge, ganz ohne die ursprünglich geplante ?v=-Versionierung | MDN, Cache-Control | caniuse.com, immutable | vercel.com/docs, Cache-Control-Headers. · Sicherheit: gemessen
**Gilt für:** allgemein

### 46. HTML und die zugehörige Runtime-JS-Datei nie gemeinsam immutable cachen
**Warum:** Können sich HTML und die zugehörige Runtime-JS-Datei gemeinsam ändern und wird eine davon mit langem Cache-Header ausgeliefert, kann ein Browser mit gecachtem altem HTML gegen eine neue Runtime laufen (oder umgekehrt) — mit sichtbar inkonsistentem Ergebnis.
**Woran man es erkennt:** Nach einem Deploy erscheint der Seiteninhalt kurzzeitig doppelt oder transparent versetzt; ein Hard-Reload behebt es sofort (klares Cache-Symptom).
**Fix:** .html UND die zugehörige .js-Datei auf max-age=0, must-revalidate setzen, solange beide keinen Content-Hash im Namen tragen. Nur wirklich versionierte, dateinamen-gehashte Assets (z. B. /vendor/) dürfen immutable sein.
**Beleg:** mccain-digital, HANDOFF "WAS AM 13.9. GEBAUT WURDE": Owner sah nach Deploy kurz alles zweimal, transparent, um die Hero-Höhe versetzt — der Browser hielt das gecachte alte Dokument, der neue support.js fand darin kein gefülltes Root-Element und legte eines an, die alte Kopie blieb liegen. Fix: .html und .js auf max-age=0, must-revalidate, nur /vendor/ und Bilder immutable. · Sicherheit: gemessen
**Gilt für:** allgemein

### 47. Content-Hash-Umbenennung bringt nur etwas, wenn die referenzierende HTML selbst langfristig cachebar ist
**Warum:** Ist die HTML-Datei ohnehin must-revalidate, kostet jeder Besuch bereits eine Rundreise auf derselben warmen Verbindung. Der einzige Zusatzgewinn von Content-Hash-Dateinamen für die referenzierten Skripte wären dann nur ein paar 304-Antworten bei Wiederbesuch — kein Effekt auf den kritischen Pfad des ersten Aufrufs.
**Woran man es erkennt:** Eine geplante Umbenennungs-/Hash-Maßnahme für Skripte, während die referenzierende HTML-Datei bereits max-age=0, must-revalidate trägt.
**Fix:** Vor einer riskanten Mehrstellen-Umbenennung auf Content-Hash-Dateinamen prüfen, ob die referenzierende HTML-Datei überhaupt langfristig cachebar (immutable) ist oder werden kann — sonst das Risiko (Umbenennung trifft an vielen Stellen genau die Datei, deren Fehlen die Seite lahmlegen kann) gegen einen Gewinn abwägen, der nur den Wiederbesuch betrifft.
**Beleg:** mccain-digital, HANDOFF Zeile 1077-1083: Umbenennung bewusst zurückgestellt, weil die HTML-Datei ohnehin must-revalidate bleibt und die Umbenennung an sechs Stellen genau die Datei träfe, deren Fehlen das Projekt schon zweimal komplett lahmgelegt hatte. · Sicherheit: vermutet
**Gilt für:** allgemein

### 48. Cache-Header-Wirkung nur gegen einen produktionsnah konfigurierten Server prüfen
**Warum:** Cache-Control: no-store bedeutet laut MDN, dass "Caches jeder Art (privat oder geteilt)" die Antwort nicht speichern dürfen — das schließt den In-Memory-Cache des Browsers INNERHALB eines einzelnen Seitenaufrufs ein, nicht nur den Festplatten-Cache über Navigationen hinweg. Referenziert eine Seite dieselbe Ressource mehrfach (Font in mehreren Kontexten, ein Sprite in mehreren Elementen), muss der Browser ohne jede Cache-Speicherung jedes Mal erneut über das Netz laden. Ein nacktes python -m http.server ist keine Rettung: es schickt gar keine Cache-Header, der Browser cached dann heuristisch über Last-Modified und liefert ebenso irreführende Ergebnisse.
**Woran man es erkennt:** Mit einem Dev-Server (no-store oder keine Cache-Header) gemessen: Schriften/Sprite/Assets werden scheinbar doppelt angefragt. Gegen einen produktionsnah konfigurierten Server (echte Cache-Header) gemessen: je eine Anfrage.
**Fix:** Zwei Server strikt trennen: einen mit Cache-Control: no-store NUR zum Ansehen von Änderungen während der Entwicklung, einen mit echten Produktions-Headern NUR für Performance-Messungen (Lighthouse, eigene Skripte). Nie gegen den Dev-Server messen und ein "Duplikat" für einen echten Bug halten. Details zur Mess-Methodik: [messen.md](messen.md).
**Beleg:** mccain-digital: mit --dev (no-store) Schriften/Sprite doppelt angefragt, mit prodserve.py (Produktions-Header) je einmal — kein Code-Fehler | claim_check (confirmed): MDN-Definition von no-store erklärt den Mechanismus exakt. · Sicherheit: gemessen
**Gilt für:** allgemein

### 49. Cache-Buster per Query-String als Notlösung auf Hosts ohne granulare Cache-Kontrolle
**Warum:** Setzt die Hosting-Umgebung selbst eine lange, nicht kontrollierbare Cache-Lebensdauer für statische Assets (z. B. klassischer Apache-Webspace mit 7 Tagen für JS), erreicht eine reine Code-Änderung die Nutzer sonst tagelang nicht.
**Woran man es erkennt:** Eine aktualisierte JS-/CSS-Datei zeigt bei Nutzern mit warmem Cache weiterhin den alten Stand, ohne dass eine erneute Auslieferung erzwingbar wäre.
**Fix:** Einen versionierten Query-String (datei.js?v=h1) oder Dateinamen als Cache-Buster einsetzen, um eine erzwungene Neu-Auslieferung sicherzustellen. Sobald möglich auf eine Plattform mit granularer/immutabler Cache-Kontrolle (Content-Hash im Dateinamen, Edge-Cache-Header) migrieren, statt dauerhaft mit Query-Strings zu arbeiten.
**Beleg:** mccain-digital, CHANGELOG 2026-06-12 "Welle H": Cache-Buster pixel-engine.js?v=h1 wegen 7-tägigem JS-Caching auf dem alten Apache-Webspace eingesetzt. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 50. Verzeichnis-Routen vor der Kompressionsprüfung auf index.html auflösen
**Warum:** Ein lokaler Messserver, der Verzeichnis-Routen (/pfad/) nicht vor der Gzip-Prüfung auf index.html auflöst, liefert sie unkomprimiert aus — dieselbe Seite misst sich dadurch krass zu schwer, obwohl derselbe Inhalt unter dem vollen Pfad korrekt komprimiert wird.
**Woran man es erkennt:** Eine Seite ist unter /pfad/ deutlich schwerer als unter /pfad/index.html, obwohl der Inhalt identisch ist; Response-Header der Verzeichnis-Route zeigen keine Content-Encoding.
**Fix:** Im lokalen Mess-/Prod-Server die Route ZUERST auf die tatsächliche Datei auflösen (Verzeichnis → index.html) und erst danach über Kompression und Cache-Header entscheiden.
**Beleg:** mccain-digital, scripts/prodserve.py (Docstring): eine Startseite maß sich dadurch 6,8× zu schwer, obwohl derselbe Inhalt unter "/pfad/index.html" korrekt komprimiert auslief. · Sicherheit: gemessen
**Gilt für:** allgemein

### 51. bfcache kennen und nicht versehentlich ausschließen
**Warum:** Alle drei großen Engines unterstützen den Back/Forward-Cache (Chrome seit Version 96, Firefox, Safari) — eine Rückkehr per Zurück/Vorwärts kann dann komplett ohne Netzwerk-Request und ohne Skript-Neustart erfolgen. Cache-Control: no-store schließt eine Seite grundsätzlich vom bfcache aus; seit einem vollständigen Chrome-Rollout (März/April 2025) erlaubt Chrome bfcache dort dennoch, wo es sicher ist — dann mit auf 3 statt 10 Minuten reduziertem Timeout, weiterhin ausgeschlossen bei Cookie-/Auth-Änderungen, WebSocket/WebTransport/WebRTC oder no-store-Antworten auf Fetch/XHR. Andere Disqualifizierer bestehen fort, z. B. ein unload-Listener auf dem Desktop bei Chrome/Firefox.
**Woran man es erkennt:** Chrome DevTools → Application → Back/forward cache zeigt den Status und ggf. den Ausschlussgrund einer Seite.
**Fix:** unload-Listener vermeiden (pagehide/visibilitychange verwenden), offene Verbindungen (WebSocket etc.) beim Verstecken sauber behandeln statt sie zu erzwingen, und no-store nur dort einsetzen, wo es wirklich nötig ist — nicht pauschal auf HTML.
**Beleg:** developer.chrome.com, bfcache and Cache-Control:no-store | web.dev, bfcache (inkl. Update Juni 2026: offene WebSocket-Verbindungen schließen eine Seite nicht mehr zwingend aus, der Browser schließt sie beim bfcache-Eintritt automatisch). · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 52. Kompression: Brotli ist Standard, Zstd wächst, beide schlagen gzip
**Warum:** Brotli ist praktisch universell unterstützt (Chrome 50+, Firefox 44+, Safari 11+, Edge 15+, ~96 % global) und komprimiert JS-Dateien im Schnitt ca. 14 % kleiner als gzip, weil es serverseitig ein gemeinsames Wörterbuch häufiger Web-Begriffe nutzt. Zstd ist neuer (Chrome seit 123, 118–122 hinter Flag; Firefox seit 129; Edge seit 124; Safari erst ab 26.1 teilweise) und wird von Chrome nur über HTTPS angeboten.
**Woran man es erkennt:** Content-Encoding-Response-Header prüfen: gzip statt br/zstd, obwohl der Client sie im Accept-Encoding anbietet.
**Fix:** Textbasierte Assets (HTML/CSS/JS) serverseitig mit Brotli ausliefern, sofern die Plattform es unterstützt; Zstd zusätzlich anbieten, wo verfügbar, mit Gzip als Fallback. Ob Vercels Edge Network vorkomprimierte Brotli-Dateien direkt ausliefert oder nur on-the-fly komprimiert, ist offiziell nicht eindeutig geklärt (siehe Offene Fragen).
**Beleg:** testmuai.com, Brotli browser support (Sekundärquelle) | Chromium Intent-to-Ship, Zstd Content-Encoding. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 53. Speculation Rules API für Mehrseiten-Sites erwägen, aber Support-Lücken einplanen
**Warum:** Die Speculation Rules API lässt den Browser eine wahrscheinliche nächste Navigation vorab prefetchen oder komplett vorrendern (prerender) — ein Klick auf die tatsächlich vorgerenderte Seite wirkt dann praktisch instant, wie eine Auslieferung aus dem Cache. Sie gilt bei MDN aber als "Limited availability" und ist NICHT Baseline: stabil nur in Chromium-Engines (Chrome/Edge ab 109), Firefox unterstützt sie nicht, Safari laut einer Sekundärquelle ab 26.2 nur hinter einem standardmäßig deaktivierten Flag.
**Woran man es erkennt:** <script type="speculationrules"> im Quelltext prüfen; auf nicht unterstützten Browsern (Firefox, die meisten Safari-Versionen) hat die Regel keinerlei Effekt — normale Navigation als Fallback, kein Fehler.
**Fix:** Für Mehrseiten-Sites mit klaren, wahrscheinlichen Navigationspfaden (z. B. Startseite → am häufigsten angeklickte Unterseite) <script type="speculationrules"> mit prerender- oder prefetch-Regeln ergänzen. Da nicht unterstützende Browser die Regeln folgenlos ignorieren, ist das Risiko gering — aber auch der Nutzen nur für einen Teil der Besucher (aktuell primär Chromium) real.
**Beleg:** MDN, Speculation Rules API. · Sicherheit: dokumentiert
**Gilt für:** allgemein

## Build-Pipeline-Effekte

### 54. Minifizierung bei jedem Build aus derselben Quelle ableiten, Property-Mangling gezielt abschalten
**Warum:** Greift ein Skript zur Laufzeit namentlich auf Objekt-Eigenschaften zu, bricht Property-Mangling (das Umbenennen von Objekt-Eigenschaften bei der Minifizierung) diese Zugriffe lautlos — sichtbar nur an der minifizierten Fassung, nicht an der unminifizierten.
**Woran man es erkennt:** Eine interne (kommentierte) und eine externe (minifizierte) Fassung desselben Skripts laufen auseinander, oder ein Feature funktioniert nur in der Dev-Version.
**Fix:** Bei jedem Build sowohl die interne als auch die externe Fassung aus derselben Quelle neu ableiten, statt sie von Hand parallel zu pflegen. Property-Mangling im Minifizierer abschalten, sobald Code dynamisch/namentlich auf Objekteigenschaften zugreift; nur Bezeichner (Variablennamen) umbenennen lassen.
**Beleg:** mccain-digital, HANDOFF Zeile 1337-1349: support.js 67,5 KB → 36,4 KB roh (16,3 → 12,3 KB brotli), pixel-engine.js 137,3 KB → 42,1 KB roh (37,2 → 14,4 KB brotli) — zusammen 26,8 KB weniger über die Leitung, 126 KB weniger zu parsen. · Sicherheit: gemessen
**Gilt für:** allgemein

### 55. Gewichtsanteil je Datei einzeln nachmessen statt zu vermuten
**Warum:** Bei der Frage "wo steckt unnötiges Gewicht" liegt der reale Fund oft in einer ganz anderen Datei als der naheliegendsten (z. B. HTML) vermuteten.
**Woran man es erkennt:** Eine Vermutung über die Gewichtsquelle (etwa "viele Kommentare in der Live-Seite") ohne tatsächlichen Datei-für-Datei-Vergleich.
**Fix:** Jede ausgelieferte Datei einzeln auf ihren Gewichtsanteil (z. B. Kommentaranteil, Whitespace, tote Abschnitte) prüfen, bevor optimiert wird — kompromierte Bytes zählen, nicht rohe.
**Beleg:** mccain-digital, HANDOFF Zeile 1351-1353: In der HTML waren es 0,9 KB von 661 KB — nichts. In pixel-engine.js waren es 55 KB von 137 KB — das war der reale Fund. · Sicherheit: gemessen
**Gilt für:** allgemein

### 56. Inhalt nicht doppelt oder dreifach ausliefern — zur Bauzeit kompilieren statt zur Laufzeit interpretieren
**Warum:** Ein Build, der zur Crawler-Unterstützung einen gerenderten DOM-Snapshot abzieht, aber zusätzlich weiterhin die Design-Tool-Export-Vorlage plus den Interpreter-Code ausliefert, sendet denselben Inhalt bis zu dreifach über die Leitung — und lässt ihn zur Laufzeit ein drittes Mal vom Hauptthread neu aufbauen.
**Woran man es erkennt:** Eine index.html enthält gleichzeitig einen fertig gerenderten DOM-Bereich, ein <template> mit derselben Seite unkompiliert und ein <script type="text/x-...">, das dieselbe Seite zur Laufzeit ein drittes Mal erzeugt — jeweils einzeln in Bytes/gzip nachmessbar.
**Fix:** Den Komponentenbaum zur BAUZEIT serverseitig kompilieren (z. B. renderToString) und danach weder Vorlage noch Laufzeit-Interpreter mit ausliefern, statt zur Laufzeit per generischem Interpreter dieselbe Seite neu zu erzeugen.
**Beleg:** mccain-digital, HANDOFF Abschnitt "DER NÄCHSTE DURCHGANG": index.html 905.070 B roh/133.588 B gzip, davon #dc-prerender 563.511 B/47.003 B gz, <template> 147.219 B/23.670 B gz, Interpreter-Script 172.113 B/56.768 B gz — geplante Kompilierung zur Bauzeit spart 24 KB gz je Seite. · Sicherheit: gemessen
**Gilt für:** allgemein

### 57. Build-Reihenfolge: Alle Runtime-Assets vor dem Browserstart an ihrem Ort
**Warum:** Startet ein Build einen Browser-Prozess zum Rendern und werden Runtime-Assets (Skripte, die dieser Browser lädt) erst DANACH kopiert, rendert der bereits laufende Browser-Kontext noch gegen den alten Stand aus dem vorherigen Lauf.
**Woran man es erkennt:** Ein Build-Ergebnis entspricht sporadisch nicht dem aktuellen Quellcode, obwohl die Quelle korrekt aktualisiert wurde.
**Fix:** Im Build strikt festlegen: alle Runtime-Assets werden VOR dem Start des rendernden Browser-Prozesses final kopiert.
**Beleg:** mccain-digital, HANDOFF "WAS AM 13.9. GEBAUT WURDE": als "tragende" Build-Regel geführt. · Sicherheit: gemessen
**Gilt für:** statisches HTML

### 58. Moderne CSS-Parser können bei unausgeglichenen Klammern ganze Blöcke lautlos verschlucken
**Warum:** Wird ein CSS-Block maschinell angehängt/verschoben (z. B. per sed) und entsteht dabei eine falsche Klammerverschachtelung, interpretiert ein moderner CSS-Parser wie Lightning CSS (von Tailwind v4/Next.js genutzt) alles darunter fälschlich als in den vorherigen Selektor verschachtelt und verwirft betroffene Regeln — ohne Fehlermeldung.
**Woran man es erkennt:** Sichtbar kaputtes Layout oder fehlende Animationen nach einem automatisierten CSS-Merge, ohne dass der Build einen Fehler meldet.
**Fix:** Beim maschinellen Anhängen/Verschieben großer CSS-Blöcke die Klammerbalance vorher/nachher zählen und verifizieren (Anzahl öffnender gleich Anzahl schließender Klammern), statt nur visuell zu prüfen.
**Beleg:** 360, session-handoff-archive.md (Cream-Migration Phase 2, Commit bcddf66): 27 @keyframes per sed-Append angehängt, 9 davon fielen mitten im Build lautlos weg (Grid kaputt); Ursache waren zwei off-by-N-Klammerfehler. Fix verifiziert über einen Klammer-Balance-Zähler (849==849 vorher/nachher). · Sicherheit: gemessen
**Gilt für:** allgemein

### 59. Bild-Encoding zwischen Maschinen ist nicht deterministisch — inhaltlich prüfen, nicht nur per Byte-Diff
**Warum:** Bild-Encoding-Schritte in Build-Pipelines (WebP-/PNG-Kompression) können je nach Maschine/Encoder-Version nicht-deterministische Bytes erzeugen, auch bei identischem Quellbild und identischem Inhalt.
**Woran man es erkennt:** Nach einem lokalen Build unterscheiden sich Bilddateien minimal von der committeten Version (Git zeigt einen Diff), obwohl sich am Bildinhalt sichtbar nichts geändert hat.
**Fix:** Vor dem Committen von Build-Ausgaben prüfen, ob sich der Bildinhalt tatsächlich geändert hat, und rein encoding-bedingte Diffs verwerfen (z. B. git checkout -- auf die betroffenen Dateien), statt sie als echte Änderung zu committen.
**Beleg:** mccain-digital, HANDOFF "STAND 16.9. Pixelstrom, Geprüft": beobachtet als wiederkehrende Falle beim lokalen Bauen auf dem Mac gegenüber der Referenzmaschine/CI. · Sicherheit: gemessen
**Gilt für:** allgemein

### 60. Bild-Assets zentral verwalten und auf Duplikate, Auflösung und größte Verwendung prüfen
**Warum:** Ohne zentrale Verwaltung können Bildvarianten inkonsistent verlinkt werden oder ein Bild wird nur teilweise verdrahtet; ohne Duplikat-/Auflösungsprüfung schleichen sich byte-identische Dateien unter verschiedenen Namen oder zu klein beschaffte Quellbilder ein.
**Woran man es erkennt:** Mehrere Bildpfade im Code statt einer zentralen Referenz; identische MD5-Hashes bei unterschiedlich benannten Bilddateien; ein Quellbild schmaler als seine größte Anzeige-Box im responsiven Layout.
**Fix:** Abgeleitete Bildvarianten über eine einzige, build-seitige Verweistabelle auflösen statt Pfade an mehreren Codestellen zu duplizieren. Bilddateien regelmäßig per Hash-Vergleich (z. B. MD5) auf Duplikate prüfen. Bei der Export-Auflösung eines wiederverwendeten Bildes/Icons ALLE Verwendungsstellen im Projekt berücksichtigen — die größte Anzeige-Box gewinnt, nicht die Stelle, an der gerade optimiert wird. Ist ein Quellbild kleiner als seine größte Anzeige-Box, hilft keine Build-Optimierung — ein höher aufgelöstes Original beschaffen.
**Beleg:** mccain-digital, HANDOFF Zeilen 988-1003: Badge auf 128 px statt 48 px optimiert (9,8 KB PNG → 2,9 KB WebP), weil eine andere Seite dieselbe Grafik in einer 58-px-Box zeigt; zwei Portrait-Bilder byte-identisch (MD5 25edd2c1…); ein Studiofoto mit 1200 px Originalbreite für eine 1344-px-Box zu klein. · Sicherheit: dokumentiert
**Gilt für:** statisches HTML

### 61. Sitemap- und llms.txt-Generierung vom Performance-Build trennen
**Warum:** sitemap.xml und llms.txt werden von Crawlern bzw. Agenten gelesen, nicht vom Browser beim Seitenaufbau — ihre Generierung im selben Build-Lauf hat keinen Einfluss auf TTFB, LCP, TBT oder CLS der ausgelieferten Seite.
**Woran man es erkennt:** Diskussionen über Format/Inhalt von llms.txt/sitemap.xml im selben Kontext wie ein Performance-Build-Review.
**Fix:** Anforderungen an llms.txt/sitemap.xml (z. B. echte Markdown-Links statt Prosa) getrennt vom Performance-Budget behandeln — Details dazu gehören zu SEO-/Agentic-Browsing-Audits, nicht zu diesem Dokument.
**Beleg:** Scope-Klarstellung ohne eigene Projektmessung. · Sicherheit: vermutet
**Gilt für:** allgemein

### 62. Drittanbieter-Laufzeit-Bibliotheken selbst hosten, nicht nur Fonts
**Warum:** Genau wie bei Fonts (Regel 15) kostet jede von einem fremden CDN geladene Laufzeit-Bibliothek (z. B. React von unpkg.com) einen zusätzlichen DNS-/TCP-/TLS-Handshake zu einem fremden Origin — und macht die Seite zusätzlich von der Verfügbarkeit und den Cache-Regeln dieses Drittanbieters abhängig.
**Woran man es erkennt:** Externe Script-Quellen wie unpkg.com oder cdn.jsdelivr.net im Network-Panel oder Quelltext, neben oder statt fonts.googleapis.com.
**Fix:** Laufzeit-Bibliotheken ins eigene Origin vendoren statt sie von einem fremden CDN zu laden (z. B. über einen Resource-Hook, der Imports auf die eigene, gebaute Kopie umleitet); per Build-Gate automatisiert verifizieren, dass die ausgelieferte Seite null Drittanbieter-Hosts kontaktiert.
**Beleg:** mccain-digital: verify_site.mjs-Gate bestätigt 0 Drittanbieter-Hosts über 21 Seiten (Commit 2cfdc85, 2026-09-12); nach dem v4-Relaunch kontaktiert die gebaute Seite 32 URLs, alle same-origin (Commit 95fbcb6, 2026-09-11) — vorher lud React standardmäßig von unpkg.com. · Sicherheit: gemessen
**Gilt für:** allgemein

### 63. Ein Preload für ein großes Skript kann den FCP verschlechtern statt verbessern
**Warum:** <link rel="preload" as="script"> konkurriert um Netzwerkpriorität und Bandbreite mit dem Dokument selbst — und das Dokument ist es, was den ersten Paint tatsächlich bringt. Ein vorab geladenes, großes Skript ist deshalb nicht automatisch neutral oder hilfreich; es kann dem Dokument-Request Priorität wegnehmen und den FCP verzögern.
**Woran man es erkennt:** FCP vor und nach dem Hinzufügen eines Skript-Preloads vergleichen, nicht nur die Bytegröße des Preloads betrachten.
**Fix:** Preload für ein großes Skript nur nach einer Vorher/Nachher-FCP-Messung einsetzen und beibehalten, nie aus reiner Vorsicht oder Hoffnung auf Wirkung.
**Beleg:** mccain-digital: React-Preload für die Startseite getestet, Median-FCP 349 ms → 485 ms (schlechter) — Preload wieder entfernt (Commit 5448b74, 2026-09-11). · Sicherheit: gemessen
**Gilt für:** allgemein

## Offene Fragen

- Ob Vercel als Plattform tatsächlich 103 Early Hints ausliefert, bleibt ungeklärt: Die eigene, aktuelle Vercel-Doku zu Response-Headern (Stand 2026-08-11) erwähnt es nicht, und der Next.js-Feature-Request (vercel/next.js#36071) ist geschlossen, ohne dass eine Umsetzung im abgerufenen Auszug bestätigt wird. Nur ein direkter Test gegen eine Vercel-Deployment-URL (curl -v auf eine 103-Zwischenantwort) kann das klären.
- Die exakten Millisekunden-Werte der font-display-Block-/Swap-Perioden (für swap/fallback/optional) sind in der CSS-Fonts-4-Spec nicht normativ fixiert (nur qualitativ: "extrem kurz", "kurz", "unendlich") — oft zitierte Zahlen (~100 ms/~3 s) konnten nicht an einer Primärquelle verifiziert werden und wurden deshalb bewusst weggelassen.
- Der Safari-Status der Speculation Rules API (Version 26.2, standardmäßig deaktiviert) stammt nur aus einer Sekundärquelle und wurde nicht gegen WebKit-eigene Release Notes oder den WebKit-Bugtracker gegengeprüft.
- Ob mask-image exakt denselben Lade-Zeitpunkt-Mechanismus wie background-image hat, ist nur indirekt über den gemeinsamen <image>-Werttyp der CSS-Spec sowie die projekteigene Messung (14 Logo-Masken bei 125 ms) belegt — eine explizite Chromium- oder WHATWG-Aussage dazu wurde nicht gefunden.
- Die "richtige" Anzahl gleichzeitiger preconnect-Hints wird in Sekundärquellen uneinheitlich beziffert (2–4 vs. 6–8); web.dev selbst nennt nur qualitative Kriterien (10-Sekunden-Timeout, "sparsam einsetzen"), keine feste Zahl.
- Ob Vercels Edge Network vorkomprimierte Brotli-Dateien direkt ausliefert oder ausschließlich on-the-fly komprimiert, ist in der offiziellen Doku nicht eindeutig geklärt — ein Community-Thread berichtet von Problemen mit vorkomprimierten Brotli-Assets.

## Quellen

https://developer.chrome.com/docs/performance/insights/lcp-breakdown
https://web.dev/articles/optimize-lcp
https://web.dev/articles/fetch-priority
https://web.dev/articles/lcp
https://github.com/GoogleChrome/lighthouse/blob/main/core/config/constants.js
https://github.com/GoogleChrome/lighthouse/blob/main/core/config/config.js
https://web.dev/articles/extract-critical-css
https://www.debugbear.com/blog/avoid-css-import
https://www.filamentgroup.com/lab/load-css-simpler/
https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decoding
https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display
https://fontcompressor.com/blog/font-display-swap-vs-optional
https://www.debugbear.com/blog/web-font-layout-shift
https://web.dev/articles/font-best-practices
https://web.dev/learn/design/responsive-images
https://web.dev/articles/browser-level-image-lazy-loading
https://www.phpied.com/image-requests-in-hidden-content/
https://bugzilla.mozilla.org/show_bug.cgi?id=1807253
https://github.com/web-platform-tests/wpt/blob/master/css/css-contain/content-visibility/content-visibility-forced-layout-client-rects.html
https://developer.mozilla.org/en-US/docs/Web/CSS/image/image-set
https://elementor.com/blog/webp-vs-avif/
https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script
https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/modulepreload
https://web.dev/learn/performance/code-split-javascript
https://caniuse.com/requestidlecallback
https://web.dev/third-party-facades/
https://web.dev/articles/preconnect-and-dns-prefetch
https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/103
https://vercel.com/docs/headers/response-headers
https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control
https://caniuse.com/mdn-http_headers_cache-control_immutable
https://vercel.com/docs/caching/cache-control-headers
https://developer.chrome.com/docs/web-platform/bfcache-ccns
https://web.dev/articles/bfcache
https://www.testmuai.com/learning-hub/brotli-browser-support/
https://groups.google.com/a/chromium.org/g/blink-dev/c/GFFOLCF12a4
https://web.dev/articles/tbt
https://web.dev/articles/cls
https://www.tunetheweb.com/blog/critical-resources-and-the-first-14kb/
https://developer.mozilla.org/en-US/docs/Web/API/Speculation_Rules_API
