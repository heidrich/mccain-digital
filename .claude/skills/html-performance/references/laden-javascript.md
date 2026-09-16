# Laden: JavaScript-Ladereihenfolge und Nachladen — html-performance

> Teil des Skills [[html-performance]] · Stand 2026-09-16 · Belege: mccain-digital (HANDOFF, CHANGELOG, Commits), weitere Projekte des Owners, Recherche mit Quell-URLs

Scope: wie JavaScript geladen und nachgeladen wird — `defer`/`async`/`type=module`, dynamisches `import()` bei Absicht oder im Leerlauf (mit `requestIdleCallback`-Fallback für Safari), Notausgänge für choreografierte Reveals, schwere Bibliotheken und Embeds, Consent-gegatete Skripte, JS-Splitting nur zusammen mit Deferring, Bundle-Budget, Coverage-Fallstricke vor dem Löschen von Code, Resource Hints. LCP-Pfad, kritisches CSS, Fonts und Bilder stehen in [laden-kritischer-pfad.md](laden-kritischer-pfad.md), Caching, Auslieferung und Build-Pipeline in [laden-auslieferung.md](laden-auslieferung.md). Laufzeitverhalten nach dem ersten Render: [rendern-hauptthread.md](rendern-hauptthread.md), [rendern-animationen.md](rendern-animationen.md), [rendern-canvas-webgl.md](rendern-canvas-webgl.md); Lighthouse/PSI-Scoring in [lighthouse-psi.md](lighthouse-psi.md), Mess-Methodik in [messen.md](messen.md), der Framework-Delta in [react-nextjs.md](react-nextjs.md).

Bis zum 16.9.2026 stand dieser Inhalt zusammen mit den anderen `Laden`-Themen in `laden.md`; die Regeln sind hier neu von 1 durchnummeriert, alte Verweise gelten nicht mehr.

## Kurzfassung

**JavaScript-Ladereihenfolge**
- **defer, async und type=module unterscheiden und gezielt wählen** — defer für reihenfolgeabhängige DOM-Skripte, async für unabhängige, module+modulepreload für Graphen ([→](#1-defer-async-und-typemodule-unterscheiden-und-gezielt-wählen))
- **Dynamic import() bei Interaktion oder im Leerlauf nachladen** — import() bei Interaktion/Idle statt statischem Import, v. a. für Drittanbieter-Code ([→](#2-dynamic-import-bei-interaktion-oder-im-leerlauf-nachladen))
- **requestIdleCallback hat in Safari keinen verlässlichen Boden — Fallback einplanen** — Safari aktiviert requestIdleCallback bis 27.1 nicht standardmäßig — Polyfill nötig ([→](#3-requestidlecallback-hat-in-safari-keinen-verlässlichen-boden--fallback-einplanen))
- **Nachladen strikt an echte Nutzerabsicht und Zeit koppeln** — Interaktions-Skripte per matchMedia(hover/pointer) + 10s-Timer gaten, Touch bekommt sie nie ([→](#4-nachladen-strikt-an-echte-nutzerabsicht-und-zeit-koppeln))
- **Einmalige Einblender sofort laufen lassen, nur Endlos-Dekoration darf warten** — Endlos-Deko darf warten, ein bei opacity:0 startender Einblender nicht ([→](#5-einmalige-einblender-sofort-laufen-lassen-nur-endlos-dekoration-darf-warten))
- **Eine choreografierte Reveal-Animation braucht einen zeitbasierten Notausgang** — ohne Zeit-Notausgang hält eine Defer-Ketten-Animation sichtbaren Content bis zu 2,4 s zurück ([→](#6-eine-choreografierte-reveal-animation-braucht-einen-zeitbasierten-notausgang))
- **Schwere Animations-/3D-Bibliotheken für reine Deko-Effekte vermeiden** — für reine Deko-Effekte eigenes CSS/Canvas statt three.js/GSAP/Vanta prüfen ([→](#7-schwere-animations-3d-bibliotheken-für-reine-deko-effekte-vermeiden))
- **Eine schwere Library nie statisch importieren — komplett lazy plus parallele Plugin-Ladung** — schwere Libs nur bei Gebrauch laden, Plugins parallel statt seriell — max() statt Summe ([→](#8-eine-schwere-library-nie-statisch-importieren--komplett-lazy-plus-parallele-plugin-ladung))
- **Third-Party-Facades für schwere Embeds** — statische Facade statt sofortigem Voll-Embed, echtes Embed erst bei Klick ([→](#9-third-party-facades-für-schwere-embeds))
- **Teure, asset-abhängige Vorbereitung ins Idle legen, nicht in die erste Interaktion** — asset-abhängige teure Vorbereitung beim Idle vorwegnehmen statt bei der ersten Interaktion ([→](#10-teure-asset-abhängige-vorbereitung-ins-idle-legen-nicht-in-die-erste-interaktion))
- **JS-Splitting ohne Deferring spart keine Auswertungszeit — nur Attribution** — Splitten allein spart keine ms — der Wert liegt im dadurch möglichen Deferring ([→](#11-js-splitting-ohne-deferring-spart-keine-auswertungszeit--nur-attribution))
- **Analytics-/Marketing-Skript-Injection selbst hinter Consent gaten** — Tracking-Skript darf erst NACH Consent überhaupt eingefügt werden, nicht nur deaktiviert sein ([→](#12-analytics-marketing-skript-injection-selbst-hinter-consent-gaten))
- **Ein dokumentiertes Bundle-Größen-Budget als laufende Guardrail** — ein Byte-Budget mit fester Schwelle prüft sich bei jedem PR, "so klein wie möglich" nicht ([→](#13-ein-dokumentiertes-bundle-größen-budget-als-laufende-guardrail))
- **Vor dem Löschen von scheinbar ungenutztem JS: unreached ist nicht dasselbe wie tot** — eine Coverage-Messung zeigt "unerreicht in dieser Aufnahme", nicht "tot" — 63 % Beispielquote ([→](#14-vor-dem-löschen-von-scheinbar-ungenutztem-js-unreached-ist-nicht-dasselbe-wie-tot))
- **Resource Hints (preconnect/dns-prefetch/Early Hints) nur für wirklich bald gebrauchte Origins** — preconnect nur für bald wirklich gebrauchte Origins, sonst dns-prefetch oder nichts ([→](#15-resource-hints-preconnectdns-prefetchearly-hints-nur-für-wirklich-bald-gebrauchte-origins))

## Inhalt

- [JavaScript-Ladereihenfolge](#javascript-ladereihenfolge)
- [Offene Fragen](#offene-fragen)
- [Quellen](#quellen)

## JavaScript-Ladereihenfolge

### 1. defer, async und type=module unterscheiden und gezielt wählen
**Warum:** defer ist non-blocking für den Parser und führt das Skript nach vollständigem Parsing in Dokumentreihenfolge aus, vor DOMContentLoaded — richtig für Skripte, die das ganze DOM brauchen oder deren Reihenfolge wichtig ist. async ist ebenfalls non-blocking, führt aber sofort nach Fetch-Ende aus; die Reihenfolge zwischen mehreren async-Skripten ist NICHT garantiert — richtig für unabhängige Skripte wie Zähler/Ads. type="module" verhält sich für Einstiegsmodule wie defer, löst aber zuerst den kompletten Abhängigkeitsgraphen auf; rel="modulepreload" kann diesen Graphen zusätzlich vorab holen UND parsen/kompilieren, sodass Modulbäume parallel statt sequenziell aufgelöst werden.
**Woran man es erkennt:** Ein <script> ohne defer/async/type=module im <head> blockiert den Parser sichtbar im Waterfall; mehrere async-Skripte mit versehentlicher Reihenfolgeabhängigkeit zeigen sich als gelegentlich fehlschlagende Initialisierung.
**Fix:** Reihenfolgeabhängige, DOM-nutzende Skripte: defer. Unabhängige Drittanbieter-Skripte: async. Modul-Code mit größerem Abhängigkeitsbaum: type="module", ergänzt um <link rel="modulepreload"> für die wichtigsten Einstiegsmodule.
**Beleg:** MDN, <script>-Referenz / Community-Konsens. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 2. Dynamic import() bei Interaktion oder im Leerlauf nachladen
**Warum:** import() kann gezielt bei Nutzerinteraktion nachgeladen werden; für First-Party-Code nur empfohlen, wenn ein Prefetch vor der Interaktion nicht möglich ist. Für Drittanbieter-Code passt "bei Interaktion" oder "im Leerlauf" dagegen sehr gut, weil dessen Code ohnehin nicht zum Erstrender beiträgt.
**Woran man es erkennt:** Ein statisch importiertes, aber erst bei Klick/Hover benötigtes Modul im initialen Bundle (Bundle-Analyzer).
**Fix:** Interaktionsgebundenen First-Party- und praktisch jeden Drittanbieter-Code per import() statt statischem Import laden. Ergänzend per Bundler-Hinweis (z. B. webpackPrefetch: true) einen Resource-Hint einfügen, der das Modul schon im Leerlauf vorlädt, um die Interaktions-Latenz zu verstecken.
**Beleg:** web.dev, Code-splitting JavaScript. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 3. requestIdleCallback hat in Safari keinen verlässlichen Boden — Fallback einplanen
**Warum:** requestIdleCallback hat global ca. 81 % Unterstützung, ist in Safari (Desktop und iOS) aber bis mindestens Version 27.1 weiterhin NICHT standardmäßig aktiv, sondern nur hinter einem WebKit-Feature-Flag — nur die Technology-Preview-Version unterstützt es aktiv.
**Woran man es erkennt:** Feature-Detection ("requestIdleCallback" in window) fehlt vor dem Aufruf; auf Safari fällt der Code dann entweder auf einen Fehler oder unbeabsichtigt auf sofortige Ausführung zurück.
**Fix:** Für produktive Safari-Nutzer immer einen setTimeout-Polyfill bereithalten, statt requestIdleCallback ungeprüft aufzurufen.
**Beleg:** caniuse.com, requestIdleCallback (Stand 2026, Safari bis 27.1 hinter Flag). · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 4. Nachladen strikt an echte Nutzerabsicht und Zeit koppeln
**Warum:** Alles, was nicht angezeigt wird, muss auch nicht in den ersten Sekunden geladen werden — Owner-Vorgabe "alles was nicht angezeigt wird, muss auch nicht in den ersten 10 Sekunden geladen werden". Funktionalität, die nur für Desktop-Maus-Nutzer sichtbar/nutzbar ist (Hover-Effekte, dekorative Maus-Interaktion), braucht auf Touch-Geräten überhaupt keine Bytes.
**Woran man es erkennt:** scripts/requests.mjs --interact N zeigt, was erst bei echter Interaktion nachlädt, und markiert dies auf der Zeitleiste. Vorher/Nachher gemessen: Requests in 12 s (Desktop) 28 → 11 (davon die schwerste Engine erst bei 10 s); DOM-Elemente ~2.540 → 2.206.
**Fix:** Ein schweres Interaktions-Skript erst bei der ersten echten Mausbewegung ODER 10 s nach load laden, zusätzlich per Media Query auf (hover:hover) and (pointer:fine) beschränken — auf Touch-Geräten lädt es dann nie. Inhalte, die erst bei Interaktion eingesetzt werden, als inertes <template> im initialen Markup halten statt sie serverseitig fertig zu rendern. Bei mehreren gleichartigen Bildern nur das above-the-fold-Bild mit fetchpriority="high" markieren, den Rest loading="lazy". Achtung: Der Trace bleibt für PSI/CLI-Default (simulate) bis 1.000 ms Ruhe offen, für CLI mit --throttling-method=devtools bis 5.250 ms (siehe Regel 5 in [laden-kritischer-pfad.md](laden-kritischer-pfad.md#5-nach-dem-ersten-render-darf-kein-element-größer-werden-als-der-lcp-kandidat)) — beide Werte liegen weit unter 10 Sekunden, ein requestIdleCallback-Timer ist also kein Freibrief gegenüber der Messung, nur gegenüber der wahrgenommenen Ladezeit.
**Beleg:** mccain-digital, HANDOFF STAND 16.9.: Requests in 12 s 28 → 11, DOM ~2.540 → 2.206; nur das Header-Markenzeichen behält fetchpriority="high", vier weitere Vorkommen laden lazy; geschlossenes Mega-Menü (321 Knoten) bekommt content-visibility:hidden. · Sicherheit: gemessen
**Gilt für:** allgemein

### 5. Einmalige Einblender sofort laufen lassen, nur Endlos-Dekoration darf warten
**Warum:** Viele Deko-/Hinweis-Elemente starten zu früh und beanspruchen Hauptthread/Layout während des von PSI gemessenen kritischen Ladefensters — sie lassen sich aber nicht pauschal verzögern: Ein Einblender, der bei opacity:0 startet, darf NICHT pausiert werden, sonst wirkt die Seite sichtbar leer. Endlosschleifen dürfen dagegen gefahrlos warten.
**Woran man es erkennt:** Iterationszahl der Animation prüfen (nur am lebenden Animation-Objekt ablesbar, meist nicht aus CSS grep-bar): Infinity = Dekoration, darf warten; jede endliche Zahl ist ein Einblender, der laufen MUSS. Reine Geräte-Breitenregeln reichen für "nur Desktop/Maus" nicht aus — sie lassen Tablets im Querformat durch, (pointer:fine) kombinieren.
**Fix:** Beim Verzögern von Deko-/Hinweiselementen strikt trennen: einmalige Einblender (enden bei einer endlichen Iterationszahl, starten oft bei opacity:0) laufen sofort; Endlosschleifen dürfen per Timer/Interaktion verzögert werden. Zusätzlich (pointer:fine) mit einer Breitenschwelle kombinieren, um Tablets im Querformat korrekt auszuschließen.
**Beleg:** mccain-digital, HANDOFF "STAND 13.9. 03:00": TBT 1.440 → 1.185 ms nach Cookie-Verzögerung (auf 7 s) + Engine-Deferring; Layoutlesungen 4.010 → 1.823 nach Notizen-Anpassung. · Sicherheit: gemessen
**Gilt für:** allgemein

### 6. Eine choreografierte Reveal-Animation braucht einen zeitbasierten Notausgang
**Warum:** Wartet eine choreografierte Hero-Animation auf ein Startsignal, das erst nach einer langen Defer-Kette verfügbar wird, hält sie bei kaltem Ladezustand sichtbaren Inhalt zurück und wirkt wie ein Rendering-Fehler statt wie Absicht.
**Woran man es erkennt:** Kalt gemessen: FCP ~1.130 ms, ein drittes defer-Skript (wartet auf eine 140-KB-Engine) bei ~1.100 ms, die Reveal-Sequenz hält alles auf 0 und wird erst bei ~2.400 ms fertig — bis dahin nur Rahmen-/Guide-Elemente sichtbar. Warm gemessen (Paint 72–80 ms) bleibt das volle Schauspiel unauffällig.
**Fix:** Die Choreografie zusätzlich zum eigentlichen Trigger gegen performance.now() > Schwelle prüfen (Projektwert: 600 ms) — ist die Schwelle überschritten UND FCP bereits erfolgt, gilt Inhalt als "überfällig" und wird sofort gezeigt statt weiter choreografiert zu werden.
**Beleg:** mccain-digital, HANDOFF NACHTRAG 2: kalt FCP ~1.130 ms / fertige Choreografie erst ~2.400 ms, warm Paint 72–80 ms. · Sicherheit: gemessen
**Gilt für:** allgemein

### 7. Schwere Animations-/3D-Bibliotheken für reine Deko-Effekte vermeiden
**Warum:** Effekt-Rezept-Sammlungen binden für reine Hintergrund-Dekoration oft three.js, GSAP, Vanta oder ähnliche Bibliotheken ein — zusätzliches Bundle-Gewicht für etwas, das sich häufig auch mit eigenem CSS/Canvas erreichen lässt. Existiert im Projekt bereits ein library-freies Reveal-/Animationsmuster (CSS + IntersectionObserver/MutationObserver), deckt es neue UI-Bereiche oft ohne neue Abhängigkeit ab.
**Woran man es erkennt:** Bundle-Analyzer zeigt eine schwere Animationsbibliothek, deren Einsatz sich auf einen einzelnen Deko-Effekt beschränkt.
**Fix:** Vor dem Hinzuziehen einer Animationslibrary für einen neuen UI-Bereich prüfen, ob ein bereits vorhandenes, library-freies Pattern denselben Effekt liefert; für neue Deko-Effekte handgebaute CSS-/Canvas-Rezepte bevorzugen.
**Beleg:** mccain-digital, Commit d73393b: von rund 90 verfügbaren Effekt-Rezepten (die Hälfte davon three.js/GSAP/Vanta/Unicorn Studio) nur zwei CSS/Canvas-eigene übernommen — Projekt hatte sich bereits zweimal gegen schwere Bibliotheken für Hintergrundeffekte entschieden | 360, CHANGELOG: bestehendes data-reveal + useReveal(MutationObserver)-Pattern der Homepage 1:1 im Backend-Bereich statt GSAP wiederverwendet. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 8. Eine schwere Library nie statisch importieren — komplett lazy plus parallele Plugin-Ladung
**Warum:** Wird eine schwere Library nur auf manchen Seiten/Features gebraucht, kostet ein statischer Import sie auf JEDER Seite. Werden mehrere Teilmodule (Plugins) zusätzlich seriell importiert, addieren sich ihre Ladezeiten, statt dass der kritische Pfad nur vom langsamsten Einzel-Chunk abhängt.
**Woran man es erkennt:** Bundle-Analyzer zeigt die Library im initialen Bundle, obwohl sie nur auf einem Teil der Seiten aktiv genutzt wird.
**Fix:** Library + alle Plugins per dynamic import erst beim ersten tatsächlichen Gebrauch laden (0 KB im initialen Bundle). Vorab je Seite/Feature ermitteln, welche Teilmodule wirklich gebraucht werden, und diese dann parallel per Promise.all statt nacheinander importieren — der kritische Pfad wird dadurch max(core, plugin) statt core + plugin. Einen Modul-Cache führen, damit wiederholte Mounts nicht erneut importieren.
**Beleg:** mccain-cms, CHANGELOG Sprint 09.6 (page-scanner.ts, gsap-loader.ts), ADR-028: Controller-Chunk ~12 KB lazy, Worst-Case-Seite mit allen Plugins ~96 KB nach dem ersten Mount. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 9. Third-Party-Facades für schwere Embeds
**Warum:** Eine Facade ist ein statisches Platzhalter-Element, das optisch dem echten Drittanbieter-Embed ähnelt, aber erst bei Interaktion durch das echte, schwere Embed ersetzt wird — z. B. lite-youtube-embed für YouTube.
**Woran man es erkennt:** Ein vollständiges Drittanbieter-Embed (Video-Player, Karten-Widget) lädt bereits beim ersten Seitenaufruf, obwohl es meist gar nicht angeklickt wird.
**Fix:** Schweres Embed durch eine leichte Facade ersetzen; üblich zusätzlich: beim mouseover schon zum Anbieter preconnecten, erst beim Klick das eigentliche Embed laden.
**Beleg:** web.dev, Third-party facades. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 10. Teure, asset-abhängige Vorbereitung ins Idle legen, nicht in die erste Interaktion
**Warum:** Hängt ein Effekt von asynchron ladenden Assets ab (z. B. ein SVG, das erst laden muss, bevor seine Pixel gescannt werden können), blockiert eine synchron beim ersten Interaktionsmoment gebaute Vorbereitung genau diesen Moment sichtbar.
**Woran man es erkennt:** Ein spürbarer Ruckler oder eine Verzögerung exakt beim ersten Hover/Tab-Wechsel, der/die verschwindet, sobald die Vorbereitung vorgezogen wird.
**Fix:** Die teure Vorbereitung (Asset laden, zeichnen, Pixel scannen o. ä.) einmalig ausführen, sobald die Seite idle ist, und das Ergebnis danach bereithalten — nicht an den ersten Interaktionsmoment binden. Jeden Fehlerpfad (Ladefehler, fehlende API) so behandeln, dass der Ausgangszustand unverändert bleibt.
**Beleg:** mccain-digital, Commit b463ff4: Favicon-Dissolve-Effekt — Canvas-Aufbau läuft einmalig bei Seiten-Idle, 182 Glyph-Pixel gefunden, 1.050-Byte PNG-Data-URL erzeugt. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 11. JS-Splitting ohne Deferring spart keine Auswertungszeit — nur Attribution
**Warum:** Reines Aufteilen einer JS-Datei in mehrere Dateien ändert nicht die Gesamtbytezahl, die geparst/ausgewertet werden muss — die Auswertungszeit bleibt gleich. Der Nutzen liegt in besserer Performance-Attribution und darin, dass einzelne Teile danach ÜBERHAUPT erst gezielt deferrt werden können.
**Woran man es erkennt:** Ein Performance-Trace vor/nach einem reinen Split ohne begleitendes Deferring zeigt dieselbe Gesamt-Skriptzeit, nur auf mehrere benannte Dateien verteilt.
**Fix:** JS-Splitting explizit als Vorbereitung für echtes Deferring einzelner Teile einplanen, nicht als eigenständige Performance-Maßnahme verkaufen oder erwarten.
**Beleg:** mccain-digital, HANDOFF "STAND 13.9. 03:00": "JS splitten: bringt keine Auswertungszeit (dieselben Bytes), aber Zuordnung und echtes Deferring." · Sicherheit: gemessen
**Gilt für:** allgemein

### 12. Analytics-/Marketing-Skript-Injection selbst hinter Consent gaten
**Warum:** Naive Consent-Banner laden Tracking-Skripte oft sofort und deaktivieren nur die Funktionalität danach — das tatsächliche <script>-Einfügen kostet dann trotzdem Bytes und Hauptthread-Zeit, auch ohne Einwilligung.
**Woran man es erkennt:** Ein Analytics-/Marketing-Skript erscheint im Network-Panel, bevor der Nutzer eine Consent-Wahl getroffen hat.
**Fix:** Das tatsächliche Einfügen des <script>-Tags hinter den Consent-Status gaten, nicht nur dessen Reporting-Verhalten — vor/ohne Zustimmung soll das Skript null Bytes/Requests kosten.
**Beleg:** mccain-digital, Commit 092bdc1: "Google Analytics loads only after the user grants analytics consent." · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 13. Ein dokumentiertes Bundle-Größen-Budget als laufende Guardrail
**Warum:** "So klein wie möglich" ist kein prüfbares Kriterium. Ein konkretes, dokumentiertes Bundle-Budget (z. B. Initial-Paint-Bundle ≤110 KB gzip, LCP mobil 4G <2,5 s) lässt sich bei jedem Feature-PR tatsächlich gegen den Build-Output prüfen.
**Woran man es erkennt:** npm run build-Output (Bundle-Größe pro Route/Chunk) gegen keine dokumentierte Schwelle, sondern nur gegen ein Bauchgefühl.
**Fix:** Ein festes Budget pro Projekt dokumentieren (Initial-Bundle-Grenze, Grenze für Chunks) und als Faustregel definieren: reine UI-Komponenten dürfen ins Initial-Bundle, jeder Library-Import über einer festen Schwelle (Projektbeispiel: >20 KB) wird ein eigener Lazy-Chunk.
**Beleg:** 360, wiki/architecture/overview.md und .claude/docs/feedback.md: Initial-Paint-Bundle ≤110 KB gzip, Supabase-JS + Three.js dynamic-imported außerhalb des Initial-Paints, LCP mobil 4G <2,5 s. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 14. Vor dem Löschen von scheinbar ungenutztem JS: unreached ist nicht dasselbe wie tot
**Warum:** Coverage-Werkzeuge zeigen nur, was während der konkreten Aufzeichnung tatsächlich ausgeführt wurde. Eine breite API-Oberfläche, von der eine Seite nur einen Teil aufruft, ist "unerreicht", aber potenziell jederzeit erreichbar — kein wirklich toter Code.
**Woran man es erkennt:** Eine hohe "ungenutzt"-Quote in einer Coverage-Messung (z. B. Chrome DevTools Coverage), während die Aufzeichnung nur einen einzelnen Nutzerpfad (etwa Scrollen) abbildet.
**Fix:** Vor dem Löschen scheinbar ungenutzten Codes jeden potenziellen Eingang gegen ALLE Seiten UND gegen echte Interaktion prüfen, nicht nur gegen eine reine Scroll-Aufzeichnung.
**Beleg:** mccain-digital, HANDOFF "STAND 13.9. 03:30": 221,3 KB JS ausgeliefert, 139,4 KB (63 %) nie ausgeführt; pixel-engine.js zu 92 % nie ausgeführt (bietet 16 Eingänge, die Seite ruft auf 21 Seiten nur zwei davon auf), react-dom zu 60 %, support.js zu 46 %. · Sicherheit: gemessen
**Gilt für:** allgemein

### 15. Resource Hints (preconnect/dns-prefetch/Early Hints) nur für wirklich bald gebrauchte Origins
**Warum:** preconnect baut DNS+TCP+TLS zu einem Origin vorab auf — der Browser schließt eine ungenutzte Verbindung nach 10 Sekunden wieder, und zu viele preconnects verzögern andere wichtige Ressourcen, weil sie aus demselben begrenzten Socket-/TLS-Pool bedient werden. dns-prefetch (nur DNS-Lookup, günstiger) ist die Alternative für weniger kritische Drittanbieter-Domains. HTTP-Statuscode 103 Early Hints (RFC 8297) erlaubt dem Server zusätzlich, vor der endgültigen Antwort bereits Link-Header zu senden, damit der Browser Ressourcen noch früher vorzieht — unterstützt seit Chrome 103 (2022) und Firefox 123 (2024), empfohlen nur über HTTP/2 oder neuer.
**Woran man es erkennt:** Mehr als drei bis vier <link rel="preconnect">-Einträge im <head>, oder ein preconnect zu einem Origin, der erst Sekunden später oder gar nicht gebraucht wird.
**Fix:** <link rel="preconnect"> gezielt für jeden externen Host setzen, von dem above-the-fold Assets (Bilder, Fonts, API) geladen werden; für weniger kritische Drittanbieter-Domains stattdessen dns-prefetch. Die "richtige" Obergrenze ist uneinheitlich belegt (siehe Offene Fragen) — Praxis-Konsens tendiert zu 2–4 wirklich kritischen Origins pro Seite. Ob 103 Early Hints auf der eigenen Plattform ankommt, per curl -v gegen eine echte Deployment-URL verifizieren, nicht annehmen.
**Beleg:** meza-website, CHANGELOG "Performance": <link rel=preconnect> zu Supabase Storage ergänzt, ~300 ms DNS/TLS gespart (dokumentiert, nicht gemessen) | web.dev, Preconnect and dns-prefetch | MDN, HTTP 103. · Sicherheit: dokumentiert
**Gilt für:** allgemein

## Offene Fragen

- Ob Vercel als Plattform tatsächlich 103 Early Hints ausliefert, bleibt ungeklärt: Die eigene, aktuelle Vercel-Doku zu Response-Headern (Stand 2026-08-11) erwähnt es nicht, und der Next.js-Feature-Request (vercel/next.js#36071) ist geschlossen, ohne dass eine Umsetzung im abgerufenen Auszug bestätigt wird. Nur ein direkter Test gegen eine Vercel-Deployment-URL (curl -v auf eine 103-Zwischenantwort) kann das klären.
- Die "richtige" Anzahl gleichzeitiger preconnect-Hints wird in Sekundärquellen uneinheitlich beziffert (2–4 vs. 6–8); web.dev selbst nennt nur qualitative Kriterien (10-Sekunden-Timeout, "sparsam einsetzen"), keine feste Zahl.

## Quellen

- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/modulepreload
- https://web.dev/learn/performance/code-split-javascript
- https://caniuse.com/requestidlecallback
- https://web.dev/third-party-facades/
- https://web.dev/articles/preconnect-and-dns-prefetch
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/103
- https://vercel.com/docs/headers/response-headers
- https://web.dev/articles/tbt
