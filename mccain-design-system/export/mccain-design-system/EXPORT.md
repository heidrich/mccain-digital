# McCain Digital Design System – Export für VS Code / Claude Code

Als Agent-Skill nutzen: Ordner nach `.claude/skills/mccain-digital-design/` kopieren (oder den Pfad in der Projekt-CLAUDE.md nennen). `SKILL.md` ist der Einstieg, `readme.md` der Guide.

- `styles.css` + `tokens/` – alle Farben, Schriften, Abstände, Radien, Schatten, Bewegung als CSS-Variablen (`--mc-*`, semantische Aliase `--text-*`, `--surface-*`, `--accent`).
- `components/` – React-Komponenten (JSX, nur Inline-Styles auf Basis der Tokens) mit `.d.ts`-Props und `.prompt.md`-Kurzanleitung.
- `guidelines/` – Foundation-Karten als kleine HTML-Dateien (Farben, Type, Abstände, Motion, Marke).
- `assets/` – Logos, Icon-Sprite (`icons/mccain-icons.svg` + `icons.json`), Stack-Logos, Bilder, `pixel-engine.js`.
- `brand/` – alle Marken-Exporte (Zeichen, Lockups, Wortmarken, Social, Visitenkarte, Briefbogen, Signatur).
- `reference/` – die fertige Startseite als Design Component (`McCain Digital v2.dc.html` + `support.js` + `content.json`), Brand Guide und Deck. Lokal per kleinem Static-Server öffnen (z. B. `npx serve reference`), nicht per `file://`, da `content.json` per fetch geladen wird.

Unterseiten (Impressum, Datenschutz, AGB, Widerruf, Kontakt, About): Rechtstexte liegen im Repo unter `legal/imprint.html`, `legal/privacy.html`, `legal/terms.html`. Aufbau-Empfehlung: schmaler Textspalten-Container (`--content-narrow` 720 px), `SectionHeader` als Seitenkopf, Fließtext 17/1.65 in `--text-body`, Zwischentitel `--fs-h4`, derselbe Header/Footer wie die Startseite, kein Pixelstrom hinter Rechtstexten (nur im Kopfbereich ausblenden lassen).
