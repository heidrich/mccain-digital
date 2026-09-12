repo: heidrich/mccain-digital
branch: main

## Last sync
date: 2026-09-10T23:53:09Z

### Updated in this project
- Stimmen-Sektion nach dem Prinzip der Live-Seite (index.html: drei ehrlich reservierte Testimonial-Slots); Kontaktdaten aus legal/imprint.html und contact.html in Signatur, Visitenkarte, Briefbogen, OG
- Brand Guide (McCain Digital Brand Guide.dc.html) nach dem Aufbau der Hallvern-/brand-Seite (apps/site/app/brand/page.tsx): Konstruktion, Fassungen, Farbe, Typo, Icons, Bewegung, Anwendungen, Social, Code, Dateien mit Downloads
- brand/: 41 Asset-Dateien (SVG/PNG/HTML) generiert; Deck-Vorlage, Signatur, Visitenkarte, Briefbogen
- Neues Zeichen in McCain Digital v2.dc.html eingebaut (Navigation, Footer, Favicon)
- Logo-Runde 1 (McCain Digital Logo.dc.html) nach dem Hallvern-Prinzip aus heidrich/creator (packages/tokens/brand.css, packages/ui/src/logo.tsx): Regel statt Bild, Kachel 23,4 %, drei Bewegungszustände
- pixel-engine.js (PixelFX) übernommen: Pixel-Buttons, Foto-Mosaik auf Studio-Bild und Portraits; Team-/Studio-Fotos kopiert
- v2: Stripe-Palette (Indigo/Navy), Verlaufs-Kacheln mit großen Modals, dunkler Integrations-/Zahlen-Block; Leistungs-Inhalte aus services/*.html in content.json (DE/EN) übernommen
- Redesign der Startseite als Design Component (Stripe-inspiriert, hell, Mega-Menüs, Modals)
- Inhalte (Leistungen, FAQ, Ablauf, Fakten) aus data.js und llms.txt übernommen und neu getextet (DE/EN)
- UI-Verlaufsfarben (--wave-stops in v3.css) als Hero-Gradient übernommen; Gelb durch Pink ersetzt
- Stack-Logos aus img/logos/ kopiert

## Screen map
| Screen | Repo files |
| --- | --- |
| McCain Digital.dc.html (Startseite, Menüs, Modals, KI-Konsole) | index.html, data.js, llms.txt, api/ask.js, v3.css (--wave-stops), img/logos/*.svg, favicon.svg |
| McCain Digital v2.dc.html + content.json (Kacheln, große Modals, Integrationen, Zahlen) | services/ai-tools.html, services/web-apps.html, services/websites.html, services/software.html, img/logos/*.svg |
| McCain Digital v2.dc.html (Pixel-Effekte, Studio-Fotos) | pixel-engine.js, common.js (Wiring-Muster), v3.css (.pxbtn/.px-active), team/portrait-*.webp, img/studio-wide-1200.webp |
