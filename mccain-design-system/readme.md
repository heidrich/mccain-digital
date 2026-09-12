# McCain Digital – Website

Statisches Projekt, 22 Seiten. Keine Build-Kette, kein Paketmanager: Jede Seite ist eine eigenständige HTML-Datei und läuft direkt im Browser.

## Starten

```bash
# irgendein statischer Server, z. B.
npx serve .
# oder in VS Code: Rechtsklick auf "McCain Digital v2.dc.html" → "Open with Live Server"
```

Direkt per Doppelklick geht auch, dann lädt `content.json` je nach Browser nicht (CORS). Für die Deep-Inhalte der Leistungsseiten deshalb einen lokalen Server benutzen.

## Aufbau

| Datei / Ordner | Inhalt |
| --- | --- |
| `McCain Digital v2.dc.html` | Startseite |
| `McCain Digital KI / Web-Apps / Websites / Software` | Leistungsseiten |
| `McCain Digital Preise` | Konfigurator und Preisrechner |
| `McCain Digital Tech *` | MCP, RAG, ERP, Next.js |
| `McCain Digital Vergleich *` | WordPress, RAG gegen Feintuning |
| `McCain Digital Styleguide` | Styleguide der Seite |
| `McCain Digital Brand Guide v2` | Markenleitfaden mit allen Dateien |
| `McCain Digital News*`, `md-recall`, `Studio`, `Kontakt`, `Recht`, `Uebersicht` | übrige Seiten |
| `content.json` | Inhalte der Leistungsseiten (Anwendungsfälle, Fähigkeiten, Schritte, FAQ) |
| `brand/` | Logo, Icon-Sprite, Favicons, OG-Bilder |
| `img/`, `team/`, `assets/` | Bildmaterial |
| `pixel-engine.js` | Partikel-Effekte (Buttons, Bilder, Hintergrundstrom) |
| `support.js` | Laufzeit für die Seitenkomponenten |
| `styles.css`, `tokens/` | Basisstile und Token |
| `sitemap.xml`, `robots.txt`, `llms.txt` | Suchmaschinen und KI-Lesbarkeit |

## Struktur einer Seite

Jede Datei enthält drei Teile:

1. `<helmet>` – Meta-Daten, JSON-LD, Schriften, Basis-CSS
2. Das Markup der Seite, Abschnitt für Abschnitt
3. Eine Klasse `Component` am Ende – Zustand, Daten und Interaktion der Seite

Texte stehen zweisprachig als `{ de: …, en: … }` direkt in der Klasse; `content.json` liefert die längeren Inhalte der Leistungsseiten nach.

## Was beim Umbau zu beachten ist

- Farben und Radien stehen in `:root` am Anfang jeder Datei (`--acc`, `--acc-text`, `--acc-soft`, `--acc-ring`).
- Die Breiten der Mega-Menü-Panels stehen fest in `Component.MENU_W`.
- Alle Animationen pausieren außerhalb des Sichtbereichs und respektieren `prefers-reduced-motion`.
- Der Konfigurator übergibt seine Auswahl über `?kind=…&opts=…` bzw. `?plan=…` an die Preisseite.

Der Styleguide (`McCain Digital Styleguide.dc.html`) dokumentiert Farben, Typografie, Raster, Komponenten, dunkle Flächen und Bewegung mit den Werten, die im Code stehen.
