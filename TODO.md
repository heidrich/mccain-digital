# TODO — Stand 4. September 2026

Abgeleitet aus dem Award-Audit vom 2.9. (`audit/2026-09-02-findings.json`, 68 Funde) plus den
offenen Owner-Entscheidungen aus `HANDOFF.md`. Gegen `4b91833` geschrieben.

**Die Rohdaten bleiben die Quelle.** Diese Datei ist der Arbeitszettel: was noch offen ist, in
welcher Reihenfolge, mit heute nachgeprüften Zeilennummern. Beleg, Vorschlag und Aufwand zu jedem
Fund stehen in der JSON unter seiner `id`.

## Wie belastbar das ist

Die Skeptiker-Stufe des Audits ist nie gelaufen — alle vier Prüfer sind am Session-Limit
gescheitert. **Von den 58 offenen Punkten sind 4 von Hand nachgemessen, 54 sind ungeprüft.**
Erfahrungswert dieser Methode: 30–60 % Fehlalarm. Die schwersten Funde (P0, die härtesten P1) sind
nachgemessen; ab P2 gilt: **vor dem Bauen selbst nachsehen.**

Das `status`-Feld in der JSON ist seit dem Audit **nicht** nachgeführt. Es sagt zu vier Funden noch
„offen", die längst erledigt sind — die Wahrheit steht unten und ist im Code geprüft.

---

## Erledigt seit dem Audit (im Code verifiziert, 4.9.)

| Fund | Was | Beleg heute |
|---|---|---|
| UI-1 / FX-2 (P0/P1) | CTA-Hover war unsichtbar — Gradient wird jetzt gelesen | `pixel-engine.js:332` |
| FX-1 (P1) | `--d-micro` / `--d-ui` fehlten, 5 Übergänge liefen auf `0s` | `v3.css:77-78` |
| LM-1 (P0) | Index-Footer brach unter 760 px | `v3.css:5251` |
| UI-4 / AW-5 (P2) | Default-Scrollbars in Menü, Konsole und Dock | `v3.css:1489-1503` |
| AP-2 (P2) | **Widerlegt** — die doppelte Font-Ladung war ein `--dev`-Artefakt | — |

Merke daraus: **Netzwerk-Befunde gegen Produktion messen, nicht gegen `prodserve.py --dev`.**

---

## P0 — einer offen

### 1. IA-1 · Der Kauf-Funnel endet im Altdesign

Jeder „Start a project"-Klick von einer Unterseite, alle Legal-Footer, die 404 und das ⌘K-Menü
zeigen auf `contact.html` — gerasterte Pixel-Überschrift, alte Statusleiste, direkt neben dem neuen
Look. Der Punkt der höchsten Kaufabsicht ist der einzige mit sichtbarem Systembruch.

**Auftrag:** `contact.html` im neuen System neu aufbauen (`hero--stage`-Kopf wie
`services/ai-tools.html`). Der `#contact`-Anker auf der Startseite bleibt der Schnellweg
(Formular + Mail) — **beides**, nicht statt.

**Drei fertige Module liegen exklusiv dort** und sind von der Startseite aus unerreichbar. Die
Texte existieren wortgleich — das ist Spiegeln, kein Erfinden:

| Modul | liegt in |
|---|---|
| 4-Schritte-Prozess „(02) — What happens next" | `contact.html:207-260` |
| Anti-Fit-Liste „(03) — Being straight about it" | `contact.html:261` |
| Service-Router „Not sure which one it is?" | `contact.html:287` |

**Blockiert von Owner-Entscheidung 2** (Formulardaten, siehe unten).

---

## P1 — 15 offen

### Hängen an P0 (dieselbe Datei, gleicher Zug)

- **SC-2** — `contact.html`: drei konkrete Abstände zum Refresh-System (Raster-Headlines, kein Stage-Dither, …)
- **SC-4** — `contact.html`: das „Presence"-Label überlappt sichtbar seinen Beschreibungstext
- **AW-4** — `contact.html` + `404.html` brechen die Typo an den zwei emotionalsten Punkten
- **SC-3** — `404.html`: gerasterte H1 plus Inline-Styles statt Systemklassen

Danach ist `data-pixel` auf den Live-Seiten bei **0** (heute: 4× `contact.html`, 1× `404.html`;
der Rest steckt in `old/` und `preview/`). Erst dann können `PixelFX.headline` und `voidReveal`
zusammen raus — **also nicht vor AW-2.**

### Kaufpfad-Struktur

- **IA-2** (M) — kein Prozess-/Ablauf-Modul auf der Startseite
- **IA-3** (S) — Anti-Fit auf `index` nicht auffindbar. Der ⌘K-Eintrag verspricht den Inhalt
  bereits (`data.js:58`: „why you might not want us"), landet aber auf `index.html#faq` — und dort
  steht die Liste nicht. Vorschlag des Audits: als siebter FAQ-Tab.
- **IA-4** (M) — keine Work-Detailform. 3 von 4 Work-Karten enden auf `#contact`; für die zwei
  geplanten Kundenfälle gibt es keine Seitenform. Die Schablone (`work/<slug>.html` im System der
  Service-Seiten) gehört jetzt festgelegt, nicht erst wenn der Content freigegeben ist.

### Mobil (alle drei nachgemessen)

- **LM-2** (S) — Eingabefelder auf 12,8 px: **iOS Safari zoomt beim Fokus.** Formular und AI-Konsole.
- **LM-3** (M) — ~50 Flächen unter 44 px bei 390 px (Konsolen-Chips 34, Karten-Links 23, Header 36/38)
- **LM-4** (M) — Command-Menü auf 390: die Hover-Vorschau frisst das halbe Panel, die Nav-Liste zeigt ~35 %

### Award-Hebel (alle billig)

- **AW-2** (S) — **zweiter typografischer Höhepunkt fehlt.** `voidReveal` liegt fertig in
  `pixel-engine.js:1847` (Export `:3061`), im Kommentar selbst „the AI-section signature" — und wird
  **nirgends aufgerufen** (heute geprüft: 0 Verwendungen außerhalb der Engine). Genau **einmal**
  einsetzen, hinten: Billboard-Zeile der (03)-Sektion oder das Footer-Statement. Auslösung per
  IntersectionObserver nach dem Muster von `bootPixels` in `common.js`, hinter dem reduced-Guard.
  Nicht loopen — sonst konkurriert er mit dem Hero.
- **AW-3** (S) — jede interne Navigation ist ein harter Schnitt. `@view-transition { navigation: auto }`
  plus kurze Fade-Regel hinter `prefers-reduced-motion`. Null JS, null Dependencies.
- **SC-1** (M) — zwei Footer-Architekturen: `index` Mega-Footer, die 9 anderen Seiten schmal

### Rest

- **UI-2** (S) — verwaistes „A" mit hängendem Caret bei jedem Menü→Konsole-Handoff
- **AP-1** (M) — LCP-Element (Hero-H1) durch den Wort-Stagger um ~715 ms verzögert

---

## P2 — 26 offen (Politur, alle ungeprüft)

**Diese Liste ist nicht nachgemessen.** Je Punkt vor dem Bauen selbst nachsehen.

- **UI-8** (M) — Kontaktformular ohne jede Validierung: kein `required`, keine Fehlerzustände
- **UI-7 / AP-3** (S) — kein Skip-Link (heute geprüft: repo-weit keiner). Doppelt gemeldet, ein Fix.
- **LM-8** (M) — hover-gebundene Inhalte auf Touch unerreichbar, obwohl die Copy zum Hovern auffordert
- **LM-5** (M) — Hero-Lesefolge auf 390: die drei Fakten stehen **zwischen** Intro und H1
- **LD-4 / LD-5** (M) — Score-Band: rechte Hälfte auf beiden Breiten leer; im Light-Theme
  verschwindet es als Band ganz
- **FX-3** (S) — Reduced-Motion-Lücken: Studio-Wavetext, Status-Punkt-Pulse, Scroll-Cue laufen trotzdem
- **FX-4** (M) — die ersten 3 Sekunden zeigen kein einziges Pixel-Moment
- **AW-7** (M) — 90-Sekunden-Problem: Brief-Tab, Palette-Ask, Favicon-Dissolve, Pac-Man und die 404
  sind die besten Momente der Seite und alle versteckt
- **AW-8** (L) — Kaufpfad-Module: kein Preisrahmen, keine interne Referenzstrecke
- weiter: LD-1, LD-2, LD-3, LM-6, LM-7, FX-5, UI-3, UI-5, UI-6, IA-5, IA-6, AW-6, SC-5, AP-4–AP-8

## P3 — 16 offen (Ideen)

- **FX-8** (S) — `--wave-stops-quiet` ist toter Code, steht heute noch in `v3.css`
- **FX-7** (M) — Timing-System nur dem Namen nach: 25 Literal-Durations
- **FX-6** (S) — Marquee friert beim Verlassen des Viewports mit vollem Skew ein
- **UI-9** (S) — ⌘K kennt keine deutschen Suchbegriffe („kontakt" → 0 Treffer)
- **AP-6** (S) — Theme-Toggle kommuniziert seinen Zustand nicht an Screenreader
- weiter: LD-6, LD-7, LM-9, UI-10, IA-7, IA-8, IA-9, AW-9, AW-10, AW-11, AP-7
- **keine Aufgaben:** AW-1 (Juror-Note), SC-6 (Positiv-Befund: keine Token-Drift), LM-10 (verifiziert, keine Aktion)

---

## Owner-Entscheidungen — blockieren Arbeit

1. **Das Braun ist nicht überall weg.** Auf Papier tönt `legibleStops` die Welle so weit herunter,
   dass ihr gelbes Ende als Senf landet — „Map where **AI** actually pays off" steht dort goldbraun.
   Die Ziffern sind erledigt, der Rest ist eine Systementscheidung: entweder das warme Ende der
   Welle auf Papier neutralisieren, **oder** dort eine Tinten-Basis mit Farbschimmer fahren (das
   Gegenstück zur Weiß-Basis in der Nav).
2. **Die Formulardaten.** Owner: „das sind die gleichen Daten wie beim Kontaktformular auf
   mccain-digital.com". Die alte Seite muss dafür abgeglichen werden. **Hängt vor P0.**

## Meta

**Punkt 10 des Audits steht aus: die Skeptiker-Runde auf die 54 ungeprüften Funde**, bevor daran
gebaut wird. Die P0/P1-Reihe ist davon kaum betroffen — die schwersten sind nachgemessen.

**Nicht verwechseln:** `tools/accent_audit.sh` fällt unter Last an genau einer Stelle aus —
`contact.html [dark]`, mit `accent nodes 0` und „NOTHING MEASURED", **nie** mit einem Kontrast-Fund.
Das ist die Seite mit den 4 verbliebenen `data-pixel`-Rastern, dem teuersten Boot im Repo. Ein FAIL
mit „NOTHING MEASURED" ist **kein** Kontrast-Fund — erst nachsehen, welche Zeile es ist.
Verschwindet vermutlich mit P0.

**Die Screenshots aus dem Audit gibt es nicht mehr** — sie lagen im Scratchpad der Audit-Sitzung.
Die Messwerte in `evidence` stehen für sich.
