# McCain Digital Design System

**McCain Digital** ist ein Digital-Produktstudio in Oberostendorf (Bayern), gegründet 2016, zwei Gründer (Christian: Engineering & Betrieb, Kathi: Design & Produkt), keine Juniors, keine Account-Manager. Leistungen: KI-Tools (RAG, Agenten, MCP-Server, lokale Modelle), Web-Apps, Websites (Lighthouse 4×100) und Unternehmenssoftware. Eigenes Produkt: **whatever-recall** (Projektgedächtnis am Commit). Dieses System dokumentiert den 2026er Relaunch der Website – Stripe-inspiriert, hell, mit dem **Pixelstrom** als Signatur-Motiv.

## Quellen
- GitHub `heidrich/mccain-digital` (main): `index.html`, `services/*.html`, `data.js`, `v3.css`, `pixel-engine.js`, `img/logos/*.svg`, `team/*.webp`
- Dieses Projekt: `McCain Digital v2.dc.html` (Startseite + Modals + Konsole), `content.json` (Leistungsinhalte DE/EN), `McCain Digital Brand Guide.dc.html`, `McCain Digital Marke.dc.html`, `McCain Digital Logo.dc.html`, `McCain Digital Deck.dc.html`, `brand/` (alle Marken-Exporte)

## Index
| Pfad | Inhalt |
| --- | --- |
| `styles.css` | Einstieg, nur `@import` – bindet alle Tokens und Fonts ein |
| `tokens/` | `colors.css`, `typography.css`, `spacing.css` (inkl. Radien, Schatten, Breakpoints), `motion.css` (Easing, Dauern, Keyframes), `fonts.css` |
| `components/core/` | Button, Badge, DataNode, Input |
| `components/content/` | SectionHeader, Tile, Stat, FaqItem |
| `components/overlay/` | Modal |
| `guidelines/` | Foundation-Karten (Colors, Type, Spacing, Motion, Brand) |
| `ui_kits/website`, `ui_kits/brand-guide`, `ui_kits/deck` | Live-Wrapper der Design Components |
| `assets/logos` | Zeichen, Lockups, Wortmarken (dark/light/indigo/navy/gradient), Favicon |
| `assets/icons` | `mccain-icons.svg` (Sprite, 24 Icons) + `icons.json` (Pfaddaten) |
| `assets/stack` | Technologie-Logos (mono, für CSS-Masken) |
| `assets/pixel-engine.js` | PixelFX: Pixel-Buttons, Bild-Mosaik, Sand-Effekte |
| `assets/imagery` | Studio-Foto, Code-Screen |

## Content Fundamentals
- **Sprache:** Deutsch zuerst, Englisch als Umschalter; nie gemischt innerhalb einer Ansicht. Sie-Form, direkt, ohne Floskeln.
- **Ton:** Sachlich, technisch präzise, selbstbewusst. Ein technischer Anspruch wird mit einem menschlichen Ergebnis gepaart: „Ein Support-Bot, der aus Ihren eigenen Dokumenten antwortet“ → „80 % der Tickets beantworten sich selbst.“
- **Versprechen, die immer wiederkehren:** Antwort in 24 h, Festpreis in 48 h, 30 Tage Support, Code gehört dem Kunden, kein Lock-in. Zahlen werden gemessen, nicht behauptet („4×100 Lighthouse“, „0,25 ms“, „0 Tokens“).
- **Schreibweise:** Satzschreibung in Überschriften und Buttons („KI-Tools ansehen“, „Die Seite fragen“). Versalien nur nie. Eyebrows in Indigo-Text, 600, kein Uppercase. Mono für Daten, Metriken, Terminal, Datenknoten (`recall read auth · 0.25 ms`).
- **Typografische Details:** Halbgeviertstrich mit Leerzeichen („ – “), Mittelpunkt als Trenner („ · “), deutsche Zahlenformate („1.204 Zeilen“, „0,25 ms“), Prozent mit Leerzeichen („80 %“).
- **Keine Emojis.** Status nur über Badges (`● Live`), Häkchen als SVG-Icon.
- **Branchen in Beispielen sind illustrativ**, nie Kundenreferenzen – wird im Modal explizit gesagt.

## Visual Foundations
- **Palette:** Weiß-dominiert. Text Navy `#0A2540`, Fließtext Slate `#425466`, gedämpft `#727F96`. Ein Akzent: Indigo `#635BFF` (Buttons, Expand-Icons, Eyebrows als `#4D47C7`). Flächen `#F6F9FC`, Linien `#E3E8EE`. Der Pixelstrom bringt Farbe: Orange → Pink → Violett → Sky (`#FFB46B #FF5A8C #C05CFF #5FC3FF`). Grün `#15BE53` nur für Status/Lighthouse. Orange `#FF7A45` nur für Checklisten-Häkchen im Modal.
- **Dunkle Sektion:** Ein Block pro Seite: `#0A1F44`, Konsole `#10285A`, Knoten `#14275F`, Text `#EEF1FA`/`#C5D0F5`, gedämpft `#8DA2E0`, Akzent `#9F99FF`. Große Zahlen als Verlaufstext (Orange→Pink, Pink→Violett, Violett→Periwinkle).
- **Typografie:** Instrument Sans für alles (400–700), JetBrains Mono (400/500) für Daten, Chips, Terminal, Schrittnummern. Überschriften 700 mit −0,03 em, Kachel-Titel 600 mit −0,025 em, Lead 18/1,6, Body 15/1,55. `text-wrap: balance` auf Titeln, `pretty` auf Absätzen.
- **Hintergründe:** Flach weiß; dahinter läuft ein fixer WebGL-Canvas mit dem Pixelstrom (3-px-Pixel, diagonale Bahn, Simplex-Noise, langsam) und darüber eine Ebene mit **Datenknoten** (Mono-Chips wie `LLM → tool_call`), die endlos über die Seite wandern, hinter Modulen abtauchen und per Hover/Klick die zugehörige Leistung öffnen. Keine Fotografie außer Studio/Team, keine Illustrationen. Verläufe nur als weiche, langsam driftende Farbfelder in Kacheln/Modal-Bühnen (zwei Radial-Ebenen, Blur 36–46 px, 26 s/32 s) – nie auf Buttons oder Text-Flächen.
- **Bewegung:** Ease `cubic-bezier(.2,.8,.2,1)`, Ausklang `cubic-bezier(.16,1,.3,1)`. Micro .2 s, State .3 s, Lift .45 s, Sheet .55 s. Scroll-Reveal nach Rolle: Überschriften 18 px/.7 s, Kacheln 34 px/.9 s, Stagger .08 s. Modal: erst landet die Fläche (wächst aus der Kachel/dem Knoten), dann Kopf → Checkliste → Bühne gestaffelt (.12 s → .28 s). `prefers-reduced-motion` deaktiviert alles.
- **Hover:** Kacheln heben −4 px mit weichem Schatten `0 34px 70px -30px rgba(10,37,64,.35)`; Primär-Buttons `#7A73FF` und −1 px; Ghost-Buttons Rahmen von .35 → 1.0 Deckung. Pixel-Buttons (PixelFX) zerfallen in Pixel und ziehen sich beim Klick zusammen. Bilder: Cursor als Pixel-Wurmloch.
- **Press:** Kein Shrink; Farbe flacht ab. **Fokus:** Rahmen Indigo + Ring `0 0 0 4px rgba(99,91,255,.28)`.
- **Rahmen:** Hairline `#E3E8EE` als `box-shadow: 0 0 0 1px` (nicht border), dunkel `rgba(255,255,255,.08)`. **Schatten:** nur weich, tief, negativer Spread (siehe Tokens). Kein Inner-Shadow.
- **Radien:** Buttons Pill, Kacheln 16, Modal 20 (mobil 20 20 0 0 als Bottom-Sheet), Mockups 12, Inputs 8, Icon-Kästen 8, Chips 6.
- **Karten:** Weiß, Hairline-Ring, 16 px, Kopf (Titel + Expand-Icon 40 px in `#EEF0FF`) → Absatz → Bühne mit Verlauf und UI-Mockup (Browser-Chrome, Chat, Lighthouse-Ringe, Ops-Tabelle, Terminal). Kein linker Farbbalken.
- **Layout:** Container 1440, Gutter clamp(20px,4vw,48px), Sektionen clamp(72px,8vw,120px), Sektions-Kopf max 720 px linksbündig. Header fixiert, 72 px, weiß .92 mit Blur 14 px, Mega-Menüs ab 880 px, DE/EN ab 1080 px. Chat-Dock fixiert unten rechts (mobil volle Breite).
- **Transparenz & Blur:** Nur Header (.92 + blur 14) und Modal-Backdrop (Navy .55 + blur 6). Sonst flach.
- **Bildsprache:** Abstrakte UI-Mockups statt Fotos; Fotos nur Studio (breit, 21:8) und Portraits (96×120) mit Pixel-Mosaik beim Hover.

## Iconography
- **System:** Eigener Sprite `assets/icons/mccain-icons.svg` mit 24 Lucide-artigen Outline-Icons (24×24, Stroke 2–2,4, runde Kappen, `currentColor`): arrow-right, arrow-up-right, check, x, plus, menu, chevron-down, chevron-right, search, mail, phone, globe, code, database, cpu, zap, shield, message, calendar, download, external-link, sparkles, layers, terminal. Pfaddaten in `icons.json`, Nutzung `<svg><use href="assets/icons/mccain-icons.svg#check"/></svg>` oder inline.
- **Größen:** 12 (Häkchen in 22-px-Kreisen), 15–16 (in Buttons), 18 (Expand/Close-Icons), 22–24 (Menü).
- **Farbe:** Nie gefüllt. Indigo auf `#EEF0FF`-Kästen, Weiß auf Indigo/Navy, `#727F96` für Meta.
- **Technologie-Logos:** `assets/stack/*.svg` mono, als CSS-Maske (`mask: url() center/contain`) in Weiß .55 → 1.0 beim Hover.
- **Unicode als Icon:** nur `●` (Live), `·` (Trenner), `→` (in Datenknoten und Ergebnis-Zeilen), `✓` innerhalb von Mono-Chips. Keine Emojis.

## Intentional additions
- Komponenten wurden aus der Startseite (`McCain Digital v2.dc.html`) abgeleitet, nicht aus einer externen Bibliothek: Button, Badge, DataNode, Input, SectionHeader, Tile, Stat, FaqItem, Modal. Nav/Mega-Menü, Chat-Konsole und Integrations-Diagramm bleiben Teil des Website-Kits.

## Caveats
- Fonts nur per Google-Fonts-Import, keine lokalen Dateien.
- Team-Portraits im Repo sind identisch (Platzhalter) – echte Fotos fehlen.
- UI-Kits binden die Design Components per iframe ein (Live-Stand statt Kopie).
