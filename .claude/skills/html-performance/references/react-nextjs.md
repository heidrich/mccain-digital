# React/Next.js — html-performance

> Teil des Skills [[html-performance]] · Stand 2026-09-16 · Belege: mccain-digital (HANDOFF, CHANGELOG, Commits), weitere Projekte des Owners, Recherche mit Quell-URLs

Scope: der Framework-Delta für React/Next.js und Vercel — alles, was NUR entsteht, weil React/Next.js im Spiel ist: Hydration/SSR-Mechanik, Next.js-spezifische Loader-/Font-/Bundle-Regeln, GSAP/Lenis innerhalb einer React-Komponente, Vercel-Plattformdetails. Allgemeine LCP-/Bild-/Font-/Caching-Regeln gelten unverändert und stehen in [laden.md](laden.md), Laufzeit-/Animations-Mechanik in [rendern.md](rendern.md), Lighthouse/PSI-Scoring in [lighthouse-psi.md](lighthouse-psi.md), Mess-Methodik in [messen.md](messen.md). Die Hydration-Lektionen in Abschnitt 1 stammen überwiegend aus mccain-digitals Prerender-plus-Hydrate-Aufbau — das Projekt selbst ist seit v5 auf reines HTML ohne React umgestiegen; diese Datei dient den anderen, weiterhin auf Next.js laufenden Projekten des Owners (meza-website, mccain-cms, company-portal, 360).

## Kurzfassung

- **Bibliothekskosten und Hydrationskosten getrennt messen** — die React-Bibliothek kostet 1 Punkt, ein falsches Hydrationsverfahren 21 ([→](#1-bibliothekskosten-und-hydrationskosten-getrennt-messen-die-bibliothek-kostet-1-punkt-falsche-hydration-21))
- **Ein nachträglicher Headless-Browser-DOM-Abzug ist kein SSR** — hydrateRoot schlägt daran zwangsläufig fehl ([→](#2-ein-nachträglicher-headless-browser-dom-abzug-ist-kein-ssr--hydrateroot-schlägt-daran-zwangsläufig-fehl))
- **Vor einer SSR/Hydration-Umstellung eine Machbarkeitsprobe fahren** — über den vollen Datenbestand, nicht an einem Einzelfall entscheiden ([→](#3-vor-einer-ssrhydration-architekturumstellung-eine-machbarkeitsprobe-über-den-vollen-datenbestand-fahren))
- **Serverseitig immer aus denselben gepatchten Quellen rendern wie die Client-Runtime** — sonst driften Server- und Client-Markup auseinander ([→](#4-serverseitig-immer-aus-denselben-gepatchten-quellen-rendern-wie-die-client-runtime))
- **Mount-Anker beim Snapshotten nie durch den DOM-Austausch verlieren** — sonst hat die Hydration-Runtime nichts zum Andocken ([→](#5-beim-snapshotten-eines-hydrierenden-elements-den-mount-anker-nie-durch-den-dom-austausch-verlieren))
- **Aus einem Snapshot nur die style-Blöcke übernehmen** — der komplette head lädt die Runtime doppelt ([→](#6-aus-einem-gerenderten-snapshot-nur-die-style-blöcke-übernehmen-nie-den-kompletten-head))
- **Statisches, nicht-hydrierendes HTML für Seiten ohne Interaktivität bevorzugen** — eliminiert eine ganze Fehlerklasse ([→](#7-statisches-nicht-hydrierendes-html-für-seiten-ohne-interaktivität-bevorzugen))
- **Wenn UI-Zustände endlich aufzählbar sind, alle zur Bauzeit vorrendern und mergen, statt das Framework zur Laufzeit auszuliefern** — 8 Breiten × 4 Zustände vorgerendert und gemergt eliminieren React zur Laufzeit für diese eine Seite ([→](#8-wenn-ui-zustände-endlich-aufzählbar-sind-alle-zur-bauzeit-vorrendern-und-mergen-statt-das-framework-zur-laufzeit-auszuliefern))
- **Zwei parallele Render-Pfade driften auseinander**, wenn Fixes nicht in beiden nachgezogen werden ([→](#9-zwei-parallele-render-pfade-für-dieselbe-seite-driften-auseinander-wenn-fixes-nicht-in-beiden-nachgezogen-werden))
- **Client-seitige Helmet-Reinjection verdoppelt Head-Tags und TBT** nach der Hydration ([→](#10-client-seitige-helmet-reinjection-verdoppelt-head-tags-und-tbt-nach-der-hydration))
- **content-visibility behebt Layout-Kosten, nicht die Skriptkosten der Hydration selbst** ([→](#11-content-visibility-behebt-layout-kosten-nicht-die-skriptkosten-der-hydration-selbst))
- **Client-only-Werte dürfen den ersten Render nicht beeinflussen** — sonst Hydration-Mismatch ([→](#12-client-only-werte-dürfen-den-ersten-render-nicht-beeinflussen))
- **Wenn der Score an der Hydration-Skriptauswertung hängt, bewegen Ladereihenfolge-Fixes nichts** ([→](#13-wenn-der-score-an-der-hydration-skriptauswertung-hängt-bewegen-ladereihenfolge-fixes-nichts))
- **Reine CSR-SPA blockiert First Paint strukturell** — Server Components und ISR sind der strukturelle Fix ([→](#14-reine-csr-spa-blockiert-first-paint-strukturell--server-components-und-isr-sind-der-strukturelle-fix))
- **next/dynamic niemals für die Hero- oder LCP-Sektion einsetzen** ([→](#15-nextdynamic-niemals-für-die-hero--oder-lcp-sektion-einsetzen))
- **Kein Custom Image Loader auf Vercel** — zerstört den Edge-CDN-Vorteil ([→](#16-kein-custom-image-loader-auf-vercel--zerstört-den-edge-cdn-vorteil))
- **Preload und fetchpriority gezielt für kritische Marken- und Hero-Bilder setzen** ([→](#17-preload-und-fetchpriority-gezielt-für-kritische-marken--und-hero-bilder-setzen))
- **Client-Bundle zieht transitiv Server-Only-Dependencies mit**, wenn eine lib-Datei beides mischt ([→](#18-client-bundle-zieht-transitiv-server-only-dependencies-mit-wenn-eine-lib-datei-beides-mischt))
- **next/font statt externem Google-Fonts-Link verwenden** — self-hosted automatisch, kein Extra-Request ([→](#19-nextfont-statt-externem-google-fonts-link-verwenden))
- **experimental.inlineCss eliminiert render-blockierende Stylesheets pro Route** ([→](#20-experimentalinlinecss-eliminiert-render-blockierende-stylesheets-pro-route))
- **Next-16- und React-19-Breaking-Changes vorab einplanen** — Compile-Error, kein Lint-Hinweis ([→](#21-next-16--und-react-19-breaking-changes-vorab-einplanen))
- **GSAP nie statisch importieren** — lazy pro Seite/Feature, Plugins parallel laden ([→](#22-gsap-nie-statisch-importieren--lazy-pro-seitefeature-plugins-parallel-laden))
- **GSAP-Cleanup ist Pflicht** — gsap.context binden, ScrollTrigger-Instanzen mit aufräumen ([→](#23-gsap-cleanup-ist-pflicht-gsapcontext-binden-scrolltrigger-instanzen-mit-aufräumen))
- **Lenis statt bezahltem ScrollSmoother**, synchronisiert über den GSAP-Ticker ([→](#24-lenis-statt-bezahltem-scrollsmoother-synchronisiert-über-den-gsap-ticker))
- **vercel.json: Header explizit setzen, Nicht-Produktions-Ordner per .vercelignore ausschließen** ([→](#25-verceljson-edge-cache--und-security-header-explizit-setzen-nicht-produktions-ordner-per-vercelignore-ausschließen))
- **Cache-Strategie: immutable nur bei content-gehashten Namen** — kostet gemessen nichts gegenüber revalidate ([→](#26-cache-strategie-immutable-nur-bei-content-gehashten-namen-sonst-revalidate--kostet-gemessen-nichts))
- **Cold-Cache-Artefakt bei lokalem `next start` + Lighthouse** — erstes Bild kostet synchrones AVIF-Encoding ([→](#27-cold-cache-artefakt-bei-lokalem-next-start-plus-lighthouse-das-erste-bild-kostet-synchrones-avif-encoding))
- **FID ist tot** — INP ist seit März 2024 die Core-Web-Vital-Metrik ([→](#28-fid-ist-tot--inp-ist-seit-märz-2024-die-core-web-vital-metrik))
- **next/dynamic gehört nicht auf die Hero- oder LCP-Sektion** — Korrektur eines bestehenden Skill-Vorschlags ([→](#29-nextdynamic-gehört-nicht-auf-die-hero--oder-lcp-sektion))
- **CSP „unsafe-eval nötig für GSAP" ist durch Quellcode-Prüfung widerlegt** ([→](#30-csp-unsafe-eval-nötig-für-gsap-ist-durch-quellcode-prüfung-widerlegt))

## Inhalt

- [Hydration & SSR: die teuerste Lektion](#hydration--ssr-die-teuerste-lektion)
- [Next.js- und Vercel-Regeln mit gemessener Wirkung](#nextjs--und-vercel-regeln-mit-gemessener-wirkung)
- [GSAP, Lenis und ScrollTrigger in React/Next.js](#gsap-lenis-und-scrolltrigger-in-reactnextjs)
- [Vercel-Spezifika: Header, Caching, Build](#vercel-spezifika-header-caching-build)
- [Was in bestehenden Skills veraltet ist](#was-in-bestehenden-skills-veraltet-ist)

## Hydration & SSR: die teuerste Lektion

Die folgenden dreizehn Regeln stammen aus mccain-digitals mehrfach gescheitertem und am Ende korrigierten Prerender-plus-Hydrate-Aufbau (renderToString/hydrateRoot gegen einen Claude-Design-Export). Sie sind der teuerste einzelne Fehlerkomplex, den der Owner bisher dokumentiert hat, und gelten unverändert für jedes andere Projekt, das React/Next.js serverseitig rendert und dann hydriert.

### 1. Bibliothekskosten und Hydrationskosten getrennt messen: die Bibliothek kostet 1 Punkt, falsche Hydration 21
**Warum:** Um den Performance-Preis einer Bibliothek von dem Preis eines falschen Build-/Hydrationsverfahrens zu trennen (Ursache siehe Regel 2), wurden mehrere Varianten derselben Seite isoliert gemessen: wie tatsächlich ausgeliefert, Bibliothek geladen/geparst aber nicht gebootet, und reines Ziel-HTML ohne Bibliothek.
**Woran man es erkennt:** Die Score-Differenz zwischen „nur HTML+CSS" und „Bibliothek geladen, nie gebootet" ist der Bibliotheks-Preis; die Differenz zwischen „geladen, nie gebootet" und „wie ausgeliefert" ist der Hydrations-/Rendering-Preis.
**Fix:** `renderToString()` zur Bauzeit statt eines DOM-Abzugs, danach `hydrateRoot` statt `createRoot` — Mechanik und Fehlerbild in Regel 2.
**Beleg:** Mobil an derselben Seite gemessen: nur HTML+CSS 92 · Bibliothek geladen und geparst, bootet nie 91 · nur React 72 · wie ausgeliefert 70 — die Bibliothek kostet rechnerisch ~1 Punkt (92→91), der Rückfall auf volles Client-Rendering nach fehlgeschlagener Hydration die übrigen ~21 Punkte (91→70). mccain-digital, 2026-09-13; nach dem Fix 0 Konsolenfehler auf allen 21 Seiten. Quelle: HANDOFF.md „WAS AM 13.9. GEBAUT WURDE" Z. 600-602, 734-762, 889-962. · Sicherheit: gemessen
**Gilt für:** React/SSR

### 2. Ein nachträglicher Headless-Browser-DOM-Abzug ist kein SSR — hydrateRoot schlägt daran zwangsläufig fehl
**Warum:** Eine für Crawler gebaute Export-Pipeline lässt die Seite oft im Headless-Browser laufen, scrollt sie durch und serialisiert das fertige innerHTML als „SSR"-Markup. Das ist kein React-Server-Rendering, sondern ein DOM-Snapshot nach Sekunden Laufzeit — er entspricht garantiert nicht dem Zustand, den React bei seinem eigenen ersten Rendering-Commit erzeugen würde (rotierende Überschrift, Zähler-Endwerte, imperativ erzeugte Knoten).
**Woran man es erkennt:** React-Fehler #418/#425/#423 in der Konsole, stiller Rückfall auf volles Client-Rendering, kein Punktegewinn trotz vorhandenem „Server"-Markup.
**Fix:** Den Komponentenbaum zur Bauzeit mit `react-dom/server` `renderToString()` rendern statt eine DOM-Momentaufnahme aus einem Headless-Browser zu ziehen — das Ergebnis ist damit per Definition Reacts eigenes erstes Rendering. Danach `hydrateRoot` statt `createRoot` verwenden.
**Beleg:** siehe Regel 1 (gleicher Befund, gleiches Projekt, gleiche Zahlen) · Sicherheit: gemessen
**Gilt für:** React/SSR

### 3. Vor einer SSR/Hydration-Architekturumstellung eine Machbarkeitsprobe über den vollen Datenbestand fahren
**Warum:** Ein Einzelfall kann täuschen — ein Ausreißer bei einer Machbarkeitsprobe kann sich als bereits bekannter Bug entpuppen statt als Gegenbeweis für den Ansatz selbst.
**Woran man es erkennt:** Unsicherheit, ob ein SSR/Hydration-Ansatz mit dem realen Datenbestand überhaupt fehlerfrei läuft, bevor die erste Zeile Produktionscode geschrieben wird.
**Fix:** Vor der ersten Codezeile `renderToString` gegen die kompilierte Komponente laufen lassen, dann `hydrateRoot` dagegen testen — über den gesamten realen Datenbestand, nicht nur ein Beispiel. Fehlerzahlen zählen statt an einem Einzelfall zu entscheiden.
**Beleg:** mccain-digital, 2026-09-13: 20 von 21 Artboards ohne einen einzigen Hydrationsfehler (Ausreißer Brand Guide v2: 19 Fehler, ein bereits bekannter Bug); derselbe Test gegen den alten Abzug vom 12.9.: 32 Fehler. Quelle: HANDOFF.md „WAS AM 13.9. GEBAUT WURDE" Z. 604-619. · Sicherheit: gemessen
**Gilt für:** React/SSR

### 4. Serverseitig immer aus denselben gepatchten Quellen rendern wie die Client-Runtime
**Warum:** Wenn eine Export-Pipeline zur Laufzeit bekannte Bugs im Quellmaterial patcht (z. B. ungültige SVG-d-Attribute), muss serverseitiges Rendering exakt auf denselben gepatchten Quellen laufen wie die Client-Runtime — sonst driften Server- und Client-Markup auseinander. Strukturelle Voraussetzung dafür, dass SSR+Hydration überhaupt fehlerfrei laufen kann: Die Komponente darf keinen Konstruktor haben, der State synchron vor dem ersten Rendering setzt — State, das erst in `componentDidMount` gefüllt wird, ist unproblematisch, weil Server- und erstes Client-Rendering dann aus demselben leeren Zustand starten.
**Woran man es erkennt:** Der rohe, ungepatchte Export wirft eigene Konsolenfehler (im konkreten Fall 45 Fehler, 9 ungültige d-Attribute), behoben erst durch ein Laufzeit-Patch-Skript.
**Fix:** Architekturentscheidung festschreiben: gerendert wird immer aus den gepatchten Quellen, nie aus dem Roh-Export. Vor der Umstellung prüfen, ob State im Konstruktor oder erst in einem reinen Client-Lifecycle-Hook gesetzt wird.
**Beleg:** mccain-digital, 2026-09-13, HANDOFF.md Z. 604-623. · Sicherheit: gemessen
**Gilt für:** React/SSR

### 5. Beim Snapshotten eines hydrierenden Elements den Mount-Anker nie durch den DOM-Austausch verlieren
**Warum:** Eine Runtime, die per `querySelector` auf einem Mount-Element montiert und es dann ersetzt (`replaceWith`), hinterlässt danach kein Mount-Element mehr im DOM. Ein Snapshot, der NACH diesem Austausch gespeichert wird, enthält also keinen Ankerpunkt mehr, an dem die Hydration-Runtime beim nächsten Laden andocken könnte.
**Woran man es erkennt:** Seite lädt fehlerfrei (0 Konsolenfehler, alle Assets 200), aber kein Element reagiert — eine stille Inertheit, die reine Ladezeit-/Fehlerkanal-Checks nicht erkennen (siehe [messen.md](messen.md#fehlerkanäle-und-wächter-zuverlässigkeit)).
**Fix:** Beide Kopien ausliefern: die gesetzte Markup-Kopie malt zuerst (das, was Crawler lesen) und bleibt sichtbar; darunter der unangetastete Mount-Punkt mit dem Original-Template in einem inerten `<template>`. Ein MutationObserver entfernt die Vorschau erst ab einer Elementzahl-Schwelle im echten Root (im konkreten Fall > 40 Elemente), nicht schon beim ersten Kind — sonst verwechselt die Heuristik „React hat eine leere Hülle montiert" mit „React hat wirklich gerendert".
**Beleg:** mccain-digital, HANDOFF.md „Vier Fallen im Build" Punkt 1, Z. ~1357-1374. · Sicherheit: gemessen
**Gilt für:** React/SSR

### 6. Aus einem gerenderten Snapshot nur die style-Blöcke übernehmen, nie den kompletten head
**Warum:** Den kompletten `<head>` eines Snapshots zu übernehmen liefert dieselben Runtime-Skripte doppelt aus — zwei Laufzeiten laufen gegeneinander, die zweite kann den Komponenten-Code erreichen, bevor React fertig ist.
**Woran man es erkennt:** „Cannot read properties of null (reading 'useState')" in der Konsole, leerer Root-Container, keine für Nutzer sichtbare Fehlermeldung.
**Fix:** Aus dem Snapshot-`<head>` gezielt nur die `<style>`-Blöcke extrahieren, nie den ganzen Head blind kopieren.
**Beleg:** mccain-digital, HANDOFF.md „Vier Fallen im Build" Punkt 2, Z. ~1376-1381. · Sicherheit: gemessen
**Gilt für:** React/SSR

### 7. Statisches, nicht-hydrierendes HTML für Seiten ohne Interaktivität bevorzugen
**Warum:** Hydration ist eine wiederkehrende Fehler- und Kostenquelle — beide Ausfälle, die eine tote Startseite auslieferten (verlorener Mount-Anker, doppelter Head), waren Hydrationsfehler, kein Ausliefer-Bug.
**Woran man es erkennt:** Eine Seite braucht nach dem ersten Render keine clientseitige Interaktivität, wird aber trotzdem als hydrierende Komponente gebaut.
**Fix:** Seiten ohne Interaktivitätsbedarf als statisches HTML ohne jeden Hydrationsschritt bauen — eliminiert die gesamte Fehlerklasse, statt sie einzeln zu beheben.
**Beleg:** mccain-digital: fünf neue Seiten (`/kontakt.html`, vier `/services/*.html`) als statisches HTML → Performance/A11y/Best Practices je 100/100/100, gegenüber Performance 68 auf der weiterhin hydrierenden Startseite. Quelle: HANDOFF.md Z. ~1284-1286. · Sicherheit: gemessen
**Gilt für:** static HTML

### 8. Wenn UI-Zustände endlich aufzählbar sind, alle zur Bauzeit vorrendern und mergen, statt das Framework zur Laufzeit auszuliefern
**Warum:** Eine Root-Komponente mit vielen State-Feldern lässt sich nicht immer sinnvoll memoisieren oder in Subtrees aufteilen — jede State-Änderung rendert dann den kompletten Elementbaum neu, ohne dass Profiling einen einzelnen schuldigen Subtree zeigt. Sind die tatsächlich vorkommenden visuellen Zustände einer Seite aber endlich aufzählbar (Breakpoints × UI-Flags, keine unendliche Kombinatorik), lässt sich der gesamte Framework-Laufzeit-Preis für genau diese Seite eliminieren, ohne die Komponente von Hand nachzubauen.
**Woran man es erkennt:** Eine Seite mit vielen State-Feldern auf der Root-Komponente re-rendert bei jeder State-Änderung den kompletten Baum (kein Subtree zum Splitten vorhanden), während die tatsächlich sichtbaren Zustände eine kleine, feste Menge bilden.
**Fix:** Die Export-Komponente zur Bauzeit mit `react-dom/server` rendern — nicht einmal wie bei gewöhnlichem SSR, sondern einmal pro Kombination aus Breakpoint und UI-Zustand. Die Ergebnisse knotenweise mergen: Identität über die Template-Node-ID, was sich zwischen Breiten unterscheidet wird zur Media Query, was nur in einem Zustand existiert wird per Attribut markiert und über ein Flag auf `<html>` umgeschaltet, Hover-/Focus-Styles aus JS werden zu echten `:hover`/`:focus`-Regeln. Jede generierte Regel auf dieselbe Spezifität wie der ursprüngliche Inline-Style skalieren, damit sich an der Kaskade nichts ändert. Interaktives Verhalten läuft danach als eigenständiges JS, ganz ohne React zur Laufzeit.
**Beleg:** mccain-digital, `tools/v5build.mjs`: 8 Breiten (Breakpoints 520/600/620/760/960/1080/1180 px) × 4 Zustände (Basis, Consent sichtbar, Consent-Details offen, Mobile-Menü offen) = 32 Server-Renders derselben Komponente; Knoten-Identität über `data-dc-tpl` (1.605/1.605 gegen die Template-Tag-Reihenfolge verifiziert). Quelle: commit 0d3f091 2026-09-13 „preview: the start page as plain HTML, CSS and a little JS (v5, stage 1)", `tools/v5build.mjs` Kopfkommentar Z. 1-40. Kein isolierter Vorher/Nachher-Score für diesen einen Umbauschritt dokumentiert. · Sicherheit: dokumentiert
**Gilt für:** React/SSR, static HTML

### 9. Zwei parallele Render-Pfade für dieselbe Seite driften auseinander, wenn Fixes nicht in beiden nachgezogen werden
**Warum:** Ein separat generierter Build-Pfad (z. B. eine handoptimierte statische Variante) und der React/SSR-Pfad für dieselbe Seite propagieren Fixes NICHT automatisch ineinander — auch wenn der Code ursprünglich aus derselben Quelle kopiert wurde.
**Woran man es erkennt:** Ein Fix (IntersectionObserver in übersprungenen content-visibility-Blöcken, Marken-Priorität, entfernte Debug-Notizen im DOM) existiert nachweislich im einen Pfad, im anderen nicht.
**Fix:** Checkliste/Abgleich zwischen den Pfaden führen und bei jedem Performance-Fix explizit beide Pfade prüfen, nicht nur den gerade bearbeiteten.
**Beleg:** mccain-digital: die React-Seiten hatten nach dem v5-Umbau nur `motion-budget.js` übernommen, die Startseite rotiert dort weiterhin per JS. Quelle: HANDOFF.md, Zeile 158-160 / Zeile 47, als „weiterhin offen" vermerkt. · Sicherheit: dokumentiert
**Gilt für:** React/SSR

### 10. Client-seitige Helmet-Reinjection verdoppelt Head-Tags und TBT nach der Hydration
**Warum:** Eine Runtime, die den `<helmet>`-Block einer Komponente zur Laufzeit erneut in `document.head` schreibt, dupliziert alles, was der Build bereits ins Head geschrieben hat.
**Woran man es erkennt:** Zwei `<title>`, zwei `description`, zwei `og:url`, zwei JSON-LD-Graphen, zwei `canonical`-Links pro Seite — einer davon oft fehlerhaft (relativ statt absolut). Ein Audit gegen die reine Server-Antwort sieht das nicht; erst ein Audit gegen die HYDRIERTE Seite deckt es auf (siehe [messen.md](messen.md#fehlerkanäle-und-wächter-zuverlässigkeit)).
**Fix:** Build streicht aus dem Helmet alles, was der Head bereits besitzt — `title`, `description`, `robots`, `canonical`, `alternate`, `og:*`, `twitter:*`, JSON-LD (im konkreten Fall 18 Tags pro Seite). Zusätzlich zählt ein Build-Gate (`verify_site.mjs`) die Head-Tags auf der HYDRIERTEN Seite, nicht auf der Server-Antwort, und bricht bei jedem gefundenen Duplikat ab.
**Beleg:** mccain-digital, 2026-09-12: PageSpeed `/marke/` 49 → 64 (TBT 870 ms → 400 ms); Start 50 → 55. Quelle: commit 9060559. · Sicherheit: gemessen
**Gilt für:** React/SSR

### 11. content-visibility behebt Layout-Kosten, nicht die Skriptkosten der Hydration selbst
**Warum:** `content-visibility:auto` entlastet Layout und Paint für übersprungene Abschnitte (volle Mechanik und der LCP-Effekt stehen in [rendern.md](rendern.md#1-content-visibility-auto-auf-lange-off-screen-sektionen-anwenden)). Eine einzelne lange React-Hydration-Aufgabe ist dagegen reines Skript — content-visibility rührt Skriptauswertungskosten nicht an.
**Woran man es erkennt:** Nach allen Layout-Optimierungen bleibt eine einzelne dominante Long Task übrig, die exakt mit der Hydration zusammenfällt.
**Fix:** Für die verbleibende Skript-Blockierzeit helfen nur Code-Splitting/Suspense-Grenzen oder der Verzicht auf vollständige Runtime-Hydration — keine Layout-Maßnahme.
**Beleg:** mccain-digital: TBT 726 ms, 11 lange Aufgaben, längste 515 ms (4× CPU-Drosselung, mobil) — nach allen Layout-Fixes unverändert. Quelle: HANDOFF.md „STAND 13.9. 03:30" Z. 346-356. · Sicherheit: gemessen
**Gilt für:** React/SSR

### 12. Client-only-Werte dürfen den ersten Render nicht beeinflussen
**Warum:** `useState(() => JSON.parse(localStorage.getItem(...)))` liefert dem Server einen Default- und dem Client einen gespeicherten Wert — abweichende HTML-Bäume. Dasselbe Muster gilt für `{typeof window !== 'undefined' && ...}` direkt im JSX (Server rendert `false`, Client `true`) und für Werte, die von `matchMedia`/`prefers-reduced-motion` abhängen (Server kennt keine Präferenz, Client sofort).
**Woran man es erkennt:** React-Hydration-Errors auf Komponenten, die `localStorage`, `window`, `document` oder `matchMedia` beim ersten Rendering lesen — z. B. eine Sidebar mit gespeichertem `expandedGroups`-State, ein Toast-Portal, eine Fortschrittsanzeige mit reduced-motion-Wert.
**Fix:** State immer mit einem deterministischen Default initialisieren; den echten Wert (localStorage, matchMedia, Fensterbreite) erst in `useEffect` bzw. per `requestAnimationFrame` NACH dem Mount nachziehen. Portal-Rendering hinter einem `mounted`-useState+useEffect-Guard, nie hinter einem inline `typeof window`-Check im JSX.
**Beleg:** mccain-cms: Sidebar- und Toast-Portal-Hydrationsfehler behoben; whatever-recall: ChainProgress-Hydration-Mismatch behoben (Server/erster Client-Render liefern deterministisch `fill=0`, Snap auf Zielwert erst per rAF nach dem Mount). Quelle: ~/.claude memory feedback_hydration_localstorage.md, feedback_session_learnings_20260329.md; entspricht CLAUDE.md Stack-Defaults („Hydration & localStorage: NUR in useEffect lesen, nie direkt im Render-Body"). · Sicherheit: gemessen
**Gilt für:** React/SSR

### 13. Wenn der Score an der Hydration-Skriptauswertung hängt, bewegen Ladereihenfolge-Fixes nichts
**Warum:** Ein niedriger Performance-Score bei sauberer Auslieferung kann an der reinen Skriptauswertungszeit der Hydration eines großen Elementbaums hängen — das ist ein Architekturkosten-Punkt, kein Ausliefer-Bug, und lässt sich durch Defer/Preload nicht senken.
**Woran man es erkennt:** Score bleibt über mehrere Läufe praktisch unverändert, obwohl Skript-Ladereihenfolge (defer/preload) geändert wurde.
**Fix:** Vor jedem Ladereihenfolge-Fix mit mehreren Läufen prüfen, ob der Flaschenhals überhaupt beim Laden liegt oder bei der Ausführungsdauer selbst.
**Beleg:** mccain-digital: Startseite Performance 68 (FCP 349 ms, LCP 1.398 ms, TBT 663 ms, 1.493 ms Skriptauswertung für ~2.140 Elemente) gegen vier statische Unterseiten bei Performance 100; `support.js` deferred + React vorgeladen über drei Läufe 68/69/69, kein messbarer Unterschied. Quelle: HANDOFF.md Z. ~1232-1251, ~1247-1249. · Sicherheit: gemessen
**Gilt für:** React/SSR

## Next.js- und Vercel-Regeln mit gemessener Wirkung

### 14. Reine CSR-SPA blockiert First Paint strukturell — Server Components und ISR sind der strukturelle Fix
**Warum:** Eine rein clientseitig gerenderte SPA hat strukturell ein First-Paint-Problem: FCP/LCP müssen auf das komplette JS-Bundle warten, bevor überhaupt etwas gerendert wird (leeres `<div id="root">` bis JS lädt und ausführt) — kein Bild-/CSS-Tuning kann das kompensieren, solange der Rendering-Ansatz rein clientseitig bleibt.
**Woran man es erkennt:** FCP/LCP hängen eng an der Bundle-Ladezeit; zusätzlich schwer, wenn above-the-fold noch eine schwere Bibliothek (hier: ein Live-Three.js-Hero) mit auf dem kritischen Pfad läuft.
**Fix:** Migration zu Next.js App Router mit Server Components + ISR für alle öffentlichen Routen — echtes Server-HTML statt eines leeren Mount-Divs. Schwere, nicht kritische Elemente (der Three.js-Hero) durch ein statisches Poster ersetzen; WebGL lädt erst nach Interaktion.
**Beleg:** Baseline Vite-CSR-SPA: FCP 2,9 s, LCP 4,5 s, render-blocking ~1.430 ms, Hauptthread-Auslastung 4,8 s. Nach Migration auf Next.js 16 App Router (RSC+ISR): Mobile-Lighthouse 56 % → 95 %. Quelle: 360/.claude/docs/decisions.md ADR-28, ADR-29. · Sicherheit: gemessen
**Gilt für:** React/SSR, Vercel

### 15. next/dynamic niemals für die Hero- oder LCP-Sektion einsetzen
**Warum:** `next/dynamic` verschiebt das Laden einer Komponente hinter einen zusätzlichen JS-Chunk — richtig für Code, das beim initialen Render nicht gebraucht wird, aber der genaue Gegenfall für die Hero-/LCP-Sektion, die sofort sichtbar sein muss.
**Woran man es erkennt:** Ein LCP-Kandidat, der später und größer eintritt, sobald seine Sektion hinter `dynamic()` geladen wird; siehe die Hero-Rotation-Regression in [lighthouse-psi.md](lighthouse-psi.md#1-rechne-mit-einem-neuen-lcp-kandidaten-bis-klick-tap-taste-oder-scroll) (PSI-Absturz durch neue, größere LCP-Kandidaten).
**Fix:** `dynamic()` nur für Komponenten einsetzen, die beim initialen Render nachweislich nicht gebraucht werden (Modals, schwere Editoren, deutlich unterhalb der Falz) — nie für Hero-Bild/-Headline. Referenzbeispiel: [[vercel-react-best-practices]] `rules/bundle-dynamic-imports.md` demonstriert `dynamic()` konsequent nur an einer schweren, initial nicht sichtbaren Komponente (Monaco-Editor).
**Beleg:** siehe Regel 29 (Korrektur eines gegenteiligen Vorschlags in einem anderen Skill) · Sicherheit: dokumentiert
**Gilt für:** React/SSR, Vercel

### 16. Kein Custom Image Loader auf Vercel — zerstört den Edge-CDN-Vorteil
**Warum:** Ein custom Image-Loader (Supabase/Cloudinary o. ä.) für `next/image` umgeht die Vercel Edge CDN — jeder Bild-Request geht mit variabler Origin-Latenz statt über den optimierten Edge-Cache.
**Woran man es erkennt:** Schwankender LCP-Score (im konkreten Fall 79–95 %) ohne erkennbare Codeänderung.
**Fix:** Custom Loader entfernen; `next.config.ts` nutzt `remotePatterns` statt einer `loader`-Prop; `minimumCacheTTL` auf 86400 (24 h) statt Default 60 s; `formats` webp/avif; Wrapper-Komponente nur noch mit `unoptimized={isGif}`, keine `loader`-Prop mehr.
**Beleg:** meza-website: LCP 5,4 s → 2,3 s gemessen, Score-Varianz 79–95 % eliminiert. Quelle: ~/.claude memory feedback_no_custom_image_loader.md; als Regel auf neue-webseite/mccain-cms/company-portal übertragen; entspricht CLAUDE.md Stack-Defaults („Vercel Edge CDN nutzen, kein Custom Image Loader in next.config"). · Sicherheit: gemessen
**Gilt für:** Vercel

### 17. Preload und fetchpriority gezielt für kritische Marken- und Hero-Bilder setzen
**Warum:** Mehrere Maßnahmen zusammen senken TBT und Rohgröße einer hydrierenden Seite messbar: Bauzeit-Rendering+Hydration, ein „Bewegungsbudget" das Off-screen-Animationen pausiert (siehe [rendern.md](rendern.md#21-animationen-außerhalb-des-viewports-pausieren)), das Auslagern großer wiederkehrender Inline-SVGs in externe Dateien, und gezielte `preload`/`fetchpriority`-Hints für das eine kritische Bild-/Markenelement.
**Woran man es erkennt:** TBT und Rohgröße sinken gemeinsam, wenn alle vier Maßnahmen greifen — jede einzeln mit eigenen Vorher/Nachher-Zahlen belegen, nicht pauschal einer Ursache zuschreiben.
**Fix:** `preload` + `fetchpriority="high"` gezielt auf das eine kritische Bild-/Markenelement setzen, nicht großflächig; große wiederkehrende Inline-SVGs (hier: das Markenzeichen) in externe Dateien auslagern.
**Beleg:** mccain-digital: PageSpeed mobil 84 → 91 (TBT 320 → 80 ms, CLS 0); 25 laufende Animationen → 5; DOM 3.168 → 2.438 Knoten; index.html 905.070 → 676.109 B roh, 133.588 → 119.004 B gzip. Quelle: HANDOFF.md „STAND 13.9. NACHTS" Z. 507-520. · Sicherheit: gemessen
**Gilt für:** React/SSR

### 18. Client-Bundle zieht transitiv Server-Only-Dependencies mit, wenn eine lib-Datei beides mischt
**Warum:** Next bündelt beim Client-Import einer Datei IMMER deren kompletten transitiven Import-Graphen, nicht nur das genutzte Symbol — mischt eine `lib/*.ts`-Datei Server-Logik und eine kleine, auch vom Client gebrauchte Konstante/einen Typ, zieht eine `'use client'`-Komponente die Server-Dependency mit rein.
**Woran man es erkennt:** `npm run build` bricht mit „Module not found" gegen ein server-only-Modul (im konkreten Fall interne `postgres`-Module). `tsc --noEmit` findet diesen Fehler NICHT.
**Fix:** Reine Konstanten/Typen/Helper von Anfang an in eine eigene, schlanke `*-constants.ts`/`*-types.ts` auslagern, die der Client direkt importiert; die gemischte Haupt-lib-Datei re-exportiert sie nur noch für Server-Aufrufer.
**Beleg:** mccain-cms alpha.124. Quelle: ~/.claude memory feedback_client_bundle_import_graph.md. · Sicherheit: gemessen
**Gilt für:** React/SSR

### 19. next/font statt externem Google-Fonts-Link verwenden
**Warum:** `next/font/google` self-hostet die Schrift automatisch und setzt `display:swap` — kein externer `<link>`/`@import`-Request zu fonts.googleapis.com, der den Render blockieren und Font-Swap-Layout-Shift schwerer kontrollierbar machen würde. Die allgemeine Self-Hosting-Begründung steht in [laden.md](laden.md#15-self-hosting-statt-google-fonts-cdn--mit-ehrlicher-einschränkung); dies ist die Next.js-spezifische Umsetzung, die den Schritt automatisch erledigt.
**Woran man es erkennt:** Ein externer Font-`<link>` im `<head>` statt eines `next/font`-Imports.
**Fix:** `next/font/google` (im konkreten Fall Geist/Geist Mono, Host Grotesk/Inter) statt externem Font-Link verwenden.
**Beleg:** 360/.claude/docs/nextjs-migration-plan.md Abschnitt 1d, Referenz meza-website. · Sicherheit: dokumentiert
**Gilt für:** React/SSR

### 20. experimental.inlineCss eliminiert render-blockierende Stylesheets pro Route
**Warum:** Next.js liefert pro Route standardmäßig ein externes `<link>`-Stylesheet, das den Render blockiert, auch wenn die Datei klein und routenspezifisch ist.
**Woran man es erkennt:** Ein render-blockierender CSS-Request pro Route in Lighthouse trotz kleiner Dateigröße.
**Fix:** Next.js-Flag `experimental.inlineCss` setzen — inlined das CSS jeder Route direkt ins HTML statt als externen Link.
**Beleg:** ~600 ms gespart, 0 render-blockierende Stylesheet-Links pro Route gemessen. Quelle: CHANGELOG.md 2026-06-16, Commit 3d47f95. · Sicherheit: gemessen
**Gilt für:** React/SSR

### 21. Next-16- und React-19-Breaking-Changes vorab einplanen
**Warum:** Next 16 benennt `middleware.ts` in `proxy.ts` um (Funktion `middleware()` → `proxy()`); React 19 verlangt bei `useRef` zwingend einen Initialwert (`useRef<T>(null)`) — beides ist beim Upgrade ein Compile-Error, kein Lint-Hinweis, der sich stillschweigend ignorieren ließe.
**Woran man es erkennt:** Build bricht mit einem Typ-/Compile-Fehler auf `useRef()` ohne Argument, oder eine bestehende `middleware.ts` greift unter Next 16 nicht mehr.
**Fix:** Bei jedem Next-16-Upgrade `middleware.ts` → `proxy.ts` und `middleware()` → `proxy()` umbenennen; jeden `useRef` immer mit explizitem Initialwert aufrufen.
**Beleg:** CLAUDE.md Stack-Defaults (Owner-Regel, projektübergreifend für Next.js 16 + React 19). · Sicherheit: dokumentiert
**Gilt für:** React/SSR

## GSAP, Lenis und ScrollTrigger in React/Next.js

### 22. GSAP nie statisch importieren — lazy pro Seite/Feature, Plugins parallel laden
**Warum:** GSAP + Plugins (ScrollTrigger, Flip, Observer, SplitText, DrawSVG, MotionPath) statisch importiert bläht das initiale Bundle auf, obwohl die meisten Seiten nur eine Teilmenge der Plugins brauchen. Die allgemeine Lazy-Loading-Begründung für schwere Libraries steht in [laden.md](laden.md#36-eine-schwere-library-nie-statisch-importieren--komplett-lazy-plus-parallele-plugin-ladung); dies ist das React/Next.js-Scanner-Muster dafür.
**Woran man es erkennt:** GSAP-/Plugin-Code im initialen Bundle-Trace, obwohl die Seite erst nach einer Nutzerinteraktion animiert.
**Fix:** GSAP + alle Plugins per `dynamic import()` erst beim ersten `mountMotion()` laden (0 kB im initialen Bundle). Ein Seiten-Scanner (im konkreten Fall `analyzePageMotion()`) ermittelt vorab, welche Plugins eine konkrete Seite braucht; die benötigten Plugins parallel via `Promise.all` starten statt nacheinander — der kritische Pfad wird dadurch `max(core, plugin)` statt `core + plugin`. In Next.js/mdigital-Projekten GSAP ausschließlich über einen zentralen Einstiegspunkt importieren (z. B. `@/lib/gsap-init`), nie direkt aus `"gsap"`, damit Registrierung/Konfiguration an einer Stelle bleibt.
**Beleg:** mccain-cms Sprint 09.6 (`page-scanner.ts`, `gsap-loader.ts`; decisions.md ADR-028): Controller-Chunk ~12 kB lazy, Worst-Case-Seite mit allen Plugins ~96 kB nach `mountMotion()`. Widerlegte Annahme (1 von 2 aus mccain-cms): ein schweres Multi-Plugin-Animations-Setup lasse sich nicht vollständig aus dem initialen Bundle heraushalten. · Sicherheit: dokumentiert
**Gilt für:** React/SSR, allgemein

### 23. GSAP-Cleanup ist Pflicht: gsap.context binden, ScrollTrigger-Instanzen mit aufräumen
**Warum:** Ohne expliziten Cleanup überleben GSAP-Timelines und ScrollTrigger-Instanzen einen React-Unmount (Navigation, Re-Mount durch StrictMode/Fast Refresh) — doppelt laufende Timelines, Memory-Leaks, ScrollTrigger-Listener auf längst entfernten Elementen.
**Woran man es erkennt:** Animationen laufen nach einem Seitenwechsel doppelt oder rückwärts; ScrollTrigger-Callbacks feuern auf nicht mehr existierenden Refs.
**Fix:**
```js
useEffect(() => {
  const ctx = gsap.context(() => {
    // Timelines, ScrollTrigger.create(...) hier
  }, containerRef);
  return () => ctx.revert();
}, []);
```
`gsap.context().revert()` räumt automatisch auch die innerhalb des Contexts erzeugten ScrollTrigger-Instanzen mit auf.
**Beleg:** CLAUDE.md Stack-Defaults (Owner-Regel für meza, mdigital). · Sicherheit: dokumentiert
**Gilt für:** React/SSR

### 24. Lenis statt bezahltem ScrollSmoother, synchronisiert über den GSAP-Ticker
**Warum:** GSAP ScrollSmoother ist ein kostenpflichtiges Club-GreenSock-Plugin — auf einer Multi-Tenant-Plattform bräuchte jeder Kunde einen eigenen Lizenzvertrag. Ohne explizite Kopplung laufen Lenis und GSAP zudem auf getrennten `requestAnimationFrame`-Loops, was zu 1–2 Frames Versatz zwischen Scroll-Position und ScrollTrigger führt.
**Woran man es erkennt:** Scroll-getriggerte Animationen wirken einen Frame verzögert oder ruckeln leicht gegenüber der tatsächlichen Scroll-Position.
**Fix:** `lenis@1.3.23` (MIT) statt ScrollSmoother; `ScrollTrigger.scrollerProxy` verbindet Lenis mit bestehenden ScrollTriggern, damit die alte API weiterläuft; `smoothTouch:false` per Default, weil natives Touch-Scrolling bereits smooth ist und Software-Smoothing auf Low-End-Geräten Frames kostet. Synchronisation über den GSAP-Ticker statt eines eigenen rAF-Loops:
```js
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```
Beim Unmount Lenis-Instanz und Ticker-Callback wieder entfernen (siehe Regel 23).
**Beleg:** mccain-cms ADR-034, CHANGELOG.md alpha.96 Sprint 09.8: Lenis ~3 kB gzipped vs. lizenzpflichtiges Plugin. Ticker-Pattern dokumentiert in github.com/darkroomengineering/lenis. Widerlegte Annahme (2 von 2 aus mccain-cms): professioneller Smooth-Scroll brauche zwingend das offizielle bezahlte Plugin. · Sicherheit: dokumentiert
**Gilt für:** React/SSR

## Vercel-Spezifika: Header, Caching, Build

### 25. vercel.json: Edge-Cache- und Security-Header explizit setzen, Nicht-Produktions-Ordner per .vercelignore ausschließen
**Warum:** Vercel liest für den Production-Install die Root-`package.json` — Test-/Mess-/Audit-Tooling ohne eigenes `package.json` landet sonst ungewollt im deployten Bundle.
**Woran man es erkennt:** Ein Browser-Treiber oder Audit-Report taucht im Vercel-Production-Install auf, obwohl er nur lokal oder für Multi-Maschinen-Sync gebraucht wird.
**Fix:** `vercel.json` explizit für Edge-Cache- und Security-Header nutzen. Test-/Mess-Tooling in ein eigenes `package.json` außerhalb des Production-Install-Baums auslagern (z. B. `tools/package.json`). Nicht-Produktions-Ordner (Altbestand, interne Tools, Audit-Reports, Notizen) konsequent in `.vercelignore` eintragen — Audit-Reports dürfen dabei trotzdem in Git bleiben, nur nicht deployed werden.
**Beleg:** mccain-digital: `tools/package.json` getrennt von Root-`package.json`, `tools/` und `audit/` in `.vercelignore`. Quelle: commit a8ec5a8, commit 25304a7. · Sicherheit: dokumentiert
**Gilt für:** Vercel

### 26. Cache-Strategie: immutable nur bei content-gehashten Namen, sonst revalidate — kostet gemessen nichts
**Warum:** `Cache-Control: immutable` auf eine Datei ohne Hash im Namen (z. B. `v3.css`, `common.js`) pinnt wiederkehrende Besucher dauerhaft an einen veralteten Build, ohne Ausweg — nicht einmal per Reload, weil sich der Dateiname bei einer Änderung nicht ändert.
**Woran man es erkennt:** Ein Asset ändert sich unter gleichbleibendem Dateinamen und Nutzer sehen trotzdem die alte Version.
**Fix:** `immutable` (1 Jahr) nur für Assets mit Content-Hash/Größe im Dateinamen (Bilder, Fonts); CSS/JS ohne Hash im Namen revalidieren lassen (`max-age=0, must-revalidate`) statt `immutable`. Nach jedem performance-relevanten Deploy den `X-Vercel-Cache`-Header prüfen (STALE/HIT/MISS), bevor eine Messung als „wirkt/wirkt nicht" gilt.
**Beleg:** mccain-digital nach Vercel-Umzug: Lighthouse Desktop Performance blieb bei 99 trotz `max-age=0, must-revalidate` auf `v3.css`/`common.js` (LCP 0,7 s, TBT 0 ms, CLS 0,002) — die ursprünglich geplante `?v=`-Query-Versionierung wurde deshalb NICHT gebaut. Quelle: commit 645d034; HANDOFF.md Z. 2695-2699. · Sicherheit: gemessen
**Gilt für:** Vercel

### 27. Cold-Cache-Artefakt bei lokalem next start plus Lighthouse: das erste Bild kostet synchrones AVIF-Encoding
**Warum:** Beim allerersten Bild-Request kodiert `next start` das Bild synchron zu AVIF (via sharp) — teuer und einmalig. Danach liegt das Bild im lokalen Cache und Folgemessungen sind schnell; in Produktion cached die Vercel Edge CDN die optimierte Variante ohnehin.
**Woran man es erkennt:** Die allererste lokale Lighthouse-Messung gegen `next start` zeigt einen dramatischen Ausreißer (im konkreten Fall LCP ~9,4 s, Score 75), der wie eine echte Regression aussieht.
**Fix:** Nicht die erste (kalte) Messung als Wahrheit nehmen; mehrfach messen und den warmen Wert nutzen — der warme lokale Wert entspricht dem echten Prod-Steady-State.
**Beleg:** 360: erste Messung LCP ~9,4 s / Performance 75; Folgemessungen (warm) Performance 95, LCP 2,8 s, TBT 20 ms, CLS 0, FCP 1,2 s. Quelle: 360/CHANGELOG.md „Wave 6 KOMPLETT"; .claude/docs/session-handoff.md. · Sicherheit: gemessen
**Gilt für:** Vercel, React/SSR

## Was in bestehenden Skills veraltet ist

Beim Review von `neue-webseite` und `vercel-react-best-practices` gegen Recherche und Quellcode fielen drei Punkte auf. Die ersten beiden sind eindeutig falsch und hier korrigiert; der dritte wurde für diesen Skill eigens nachgeprüft (nicht nur vermutet).

### 28. FID ist tot — INP ist seit März 2024 die Core-Web-Vital-Metrik
**Warum:** `neue-webseite/SKILL.md` (Phase 7, Zielwerte) nennt „**FID/INP** (Interaction to Next Paint): < 200ms" als austauschbares Metrik-Paar mit gemeinsamem Schwellwert.
**Woran man es erkennt:** SKILL.md Zeile 575; im selben Skill widersprüchlich zu `references/seo.md` Zeile 277, die korrekt nur „INP (Interaction to Next Paint) < 200ms" ohne FID nennt.
**Fix:** INP hat FID am 12. März 2024 offiziell als Core Web Vital ersetzt; FID wird seither nicht mehr als CWV-/Ranking-Metrik erhoben. „Gut"-Schwelle für INP: < 200 ms. Selbst wenn FID separat gemeint wäre, läge dessen eigene „Gut"-Schwelle bei < 100 ms, nicht < 200 ms.
**Beleg:** web.dev/blog/inp-cwv-march-12, „Interaction to Next Paint becomes a Core Web Vital on March 12" · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 29. next/dynamic gehört nicht auf die Hero- oder LCP-Sektion
**Warum:** `neue-webseite/references/performance.md` (Abschnitt 1, Z. 40-46, und Abschnitt 10, Z. 251-260) zeigt `const Hero = dynamic(() => import("@/components/sections/Hero"))` als Beispiel-Pattern — die Hero-Sektion enthält aber typischerweise das LCP-Element und wird beim initialen Render sofort gebraucht, der genaue Gegenfall zu `next/dynamic`s eigentlichem Anwendungsfall. Widerspricht zudem der „Server Components First"-Regel im selben Dokument.
**Woran man es erkennt:** Siehe Regel 15 für den korrekten Einsatz von `next/dynamic`; siehe [lighthouse-psi.md](lighthouse-psi.md#1-rechne-mit-einem-neuen-lcp-kandidaten-bis-klick-tap-taste-oder-scroll) für die gemessene Hero-Rotation-LCP-Regression, die denselben Fehler-Mechanismus zeigt (Hero-/LCP-Inhalt wie nachrangigen Inhalt behandeln).
**Fix:** Regel 15 anwenden — `next/dynamic` nur für initial nicht sichtbare, schwere Komponenten.
**Beleg:** [[vercel-react-best-practices]] `rules/bundle-dynamic-imports.md` demonstriert `next/dynamic` ausschließlich an einem schweren, initial nicht sichtbaren Editor, nie an Hero-Content. · Sicherheit: dokumentiert
**Gilt für:** React/SSR

### 30. CSP „unsafe-eval nötig für GSAP" ist durch Quellcode-Prüfung widerlegt
**Warum:** `neue-webseite/SKILL.md` (Phase 6, Zeile 480) begründet `"script-src 'self' 'unsafe-inline' 'unsafe-eval'"` im CSP-Vorschlag mit dem Kommentar „unsafe-* nötig für GSAP". Jede CSP mit `unsafe-eval` öffnet dauerhaft die Angriffsfläche, gegen die `script-src` eigentlich schützen soll.
**Woran man es erkennt:** `unsafe-eval` im `script-src` einer Seite, die GSAP als Begründung nennt.
**Fix:** Direkt geprüft statt nur vermutet: Die ausgelieferten, minifizierten Bundles von `gsap@3.12.5` (`gsap.min.js`, Core inkl. CSSPlugin) und `ScrollTrigger.min.js` von unpkg enthalten null Vorkommen von `eval(` oder `new Function` — GSAP-Core und ScrollTrigger brauchen `script-src 'unsafe-eval'` also nicht. `unsafe-eval` aus der CSP entfernen. Die real dokumentierte GSAP/CSP-Reibung liegt woanders: `matrix.js` schreibt Stile über `setAttribute("style", ...)`, was unter einer strikten `style-src`/Trusted-Types-Policy anecken kann (GitHub-Issue greensock/GSAP#623) — eine andere Direktive als `script-src unsafe-eval`.
**Beleg:** Eigene Prüfung 2026-09-16: `curl unpkg.com/gsap@3.12.5/dist/gsap.min.js` + `.../ScrollTrigger.min.js`, `grep -o 'eval(\|new Function'` → 0 Treffer in beiden Dateien. Nicht geprüft: kostenpflichtige Club-GreenSock-Plugins (Draggable, MorphSVG u. a.) — dort ggf. separat nachprüfen, bevor die CSP-Lockerung projektübergreifend als „nie nötig" gilt. · Sicherheit: dokumentiert
**Gilt für:** React/SSR, allgemein

## Offene Fragen

- Ob ISR allein (ohne die gleichzeitige RSC-Migration) einen eigenständigen, isolierten Performance-Gewinn liefert, ist in den Quellen nicht getrennt gemessen — Regel 14 belegt nur den kombinierten Effekt (56 % → 95 %).
- Spätes Hydrieren als Alternative zu echtem Build-Time-SSR erreichte in einer Messung eine Obergrenze von Score 92 (Script Evaluation 1.528 ms · Other 1.373 ms · Style & Layout 1.342 ms · Rendering 571 ms), gilt aber laut Quelle als noch ungelöstes Risiko („genau das Risiko, das dieses Projekt zweimal getroffen hat") und braucht ein sichtbares Bereitschaftssignal, das nicht weiter spezifiziert ist. Quelle: HANDOFF.md Z. 964-968.
- Ob die Lücke aus Regel 9 (React-Seiten ohne die v5-Fixes für IntersectionObserver-in-content-visibility, Marken-Priorität, Debug-Notizen) inzwischen geschlossen wurde, ist im Stand vom 16.9. weiterhin als offen vermerkt.
- Regel 30 prüft nur GSAP-Core und ScrollTrigger; ob weitere Club-GreenSock-Plugins (Draggable, Flip, MorphSVG, SplitText) ebenfalls ohne `eval`/`new Function` auskommen, ist nicht geprüft.

## Quellen

- https://web.dev/blog/inp-cwv-march-12
- https://unpkg.com/gsap@3.12.5/dist/gsap.min.js
- https://unpkg.com/gsap@3.12.5/dist/ScrollTrigger.min.js
- https://github.com/greensock/GSAP/issues/623
- https://github.com/darkroomengineering/lenis
- mccain-digital: HANDOFF.md, CHANGELOG.md, Commits, `tools/v5build.mjs` (siehe Beleg-Zeilen der einzelnen Regeln)
- ~/.claude memory: feedback_no_custom_image_loader.md, feedback_hydration_localstorage.md, feedback_client_bundle_import_graph.md, feedback_session_learnings_20260329.md
- mccain-cms: CHANGELOG.md (Sprint 07/08/09), .claude/docs/decisions.md (ADR-028, ADR-034)
- 360: CHANGELOG.md, .claude/docs/decisions.md (ADR-28, ADR-29), .claude/docs/session-handoff.md, .claude/docs/nextjs-migration-plan.md
- meza-website: CHANGELOG.md
- ~/.claude/skills/neue-webseite/SKILL.md, references/performance.md, references/seo.md
- ~/.claude/skills/vercel-react-best-practices/rules/bundle-dynamic-imports.md
- ~/.claude/CLAUDE.md, Abschnitt 3 „Stack-Defaults"
