# v3-proposal — Stand 2026-08-03

Neuer Homepage-Entwurf. **Nicht live.** `upload/` (live) und `upload-v2/`
(4×100-Vorwelle) sind unangetastet.

## Git

Alles liegt auf **`v2-homepage-refresh`**, gepusht nach `origin`
(`heidrich/mccain-digital`). Der v3-Commit ist `16dabe6`, 62 Dateien.
Der Branch ist zwei Commits vor `main`: der v2-Refresh und dieser hier.
PR-Link steht in der Push-Ausgabe bereit, ist aber noch nicht angelegt.

**Nicht committet und mit Absicht liegengelassen:** drei geänderte Dateien in
`upload/` (`services/ai-tools.html`, `styles.css`, `svc-page.js`, zusammen
+717 Zeilen). Die stammen aus einer Session im Juni, nicht aus dieser Arbeit —
wer sie einsammelt, sollte vorher wissen, was da halbfertig ist.

`CHANGELOG.md` steht in `.gitignore` (bewusst: nur intern), wird aber trotzdem
gepflegt — der v3-Eintrag steht unter `[Unreleased]`.

## Starten

**Zwei Server, zwei Zwecke — nicht verwechseln:**

```bash
cd v3-proposal && python prodserve.py 8898 --dev   # ANSCHAUEN, Cache-Control: no-store
cd v3-proposal && python prodserve.py 8897         # MESSEN (Lighthouse), Produktions-Header
cd upload-v2   && python -m http.server 8899       # Vorwelle, 4×100
cd _v2-preview && python -m http.server 8890       # Claude-Design-Vorlage "Fresh v2"
```

**Zum Anschauen NIE 8897 benutzen.** Der Messserver schickt für `.css`/`.js`
`max-age=31536000, immutable` — richtig für ein CDN, im Browser eine Falle: eine
geänderte Datei wird ein Jahr lang nicht neu geholt. Ein nacktes
`python -m http.server` ist keine Rettung, es schickt gar keine Cache-Header,
worauf der Browser heuristisch über `Last-Modified` zwischenspeichert und
ebenfalls alte Dateien liefert. Beides hat schon je eine Stunde Fehlersuche an
einem längst behobenen Fehler gekostet. `--dev` schickt `no-store`.

Hell/Dunkel: Sonnen-Icon in der Nav (Zustand in `localStorage`).

## Entscheidungen (Owner)

| Thema | Entscheidung |
| --- | --- |
| Stack | **Vanilla bleibt.** React/Next war im Gespräch, einziges starkes Argument wäre Dogfooding von Whatever-CMS gewesen — CMS ist aber nicht fertig und kommt erst nach den anderen Projekten. |
| WebGL | **Verworfen.** GPU-Wortmarke, Ink→Paper-Shader und Bild-Displacement gefielen nicht. Code liegt in `_parked/webgl.js`, ist nicht eingebunden. |
| Services | **Vier statt sechs:** AI Tools · Web Apps · Websites · Software für Firmen. Mobile Apps und Design & Brand raus. |
| Logo | Unsere Wortmarke `mccain` weiß + `digital` gelb. Die `mccain digital®`-Pille der Vorlage war falsch. |
| Nav-Auto-Hide | **Entfernt und bleibt entfernt** — es hat Pac-Man kaputt gemacht. |
| Serifen | Keine. Hausschrift Schibsted Grotesk überall. |

## Dateien

- `data.js` — **eine Quelle für alle Seiten.** `window.MCD` = `{ SERVICES, NAV,
  FAQ, KB, FALLBACK, TIPS, lookup, stream }`. Preise, Versprechen, Service-Namen
  und der Typewriter stehen **nur hier**. Konsole, FAQ und Menü teilen sich
  dieselbe Wissensbasis. `NAV` enthält auch die vier Rechtsseiten.
- `common.js` — **die geteilte Laufzeit jeder Seite**: Webfont-Einbettung,
  Theme, Nav, magnetische Buttons, Marquee, Chip-Tooltips, FAQ-Widget,
  Kontaktformular-Hinweis, Pixel-Boot. Veröffentlicht `window.MCDUI`.
- `v3.js` — **nur** die Startseite: KI-Konsole, Work-Slider, Sticky-Service-
  Karten, Score-Chips.
- `menu.js` — Kommando-Menü, **auf jeder Seite**
- `index.html` — Startseite
- `contact.html` — Kontakt
- `services/*.html` — vier Service-Seiten (ai-tools, web-apps, websites, software)
- `legal/*.html` — Impressum, Datenschutz, AGB, Widerruf.
  **Der Fließtext ist wörtlich aus `upload/legal/` übernommen** — juristisch
  geprüfte Formulierung, nicht neu tippen. Neu erzeugen statt von Hand
  bearbeiten: `scratchpad/build_legal.py` (siehe unten).
- `v3.css` — Designsystem (Tokens, zwei Themes, Scroll-Choreografie, Menü,
  Service-Bausteine, Rechtsseiten-Typografie)
- `pacman.js` — Scroll-Fortschritt, 1:1 aus dem Live-Stand extrahiert
- `pixel-engine.js` — Kopie der Live-Engine **plus drei Patches** (siehe unten)
- `prodserve.py` — Mess-Server mit gzip + Cache-Headern (siehe Lighthouse)
- `img/logos/*.svg` — echte Herstellermarken (simple-icons), per CSS-Mask getönt

**Skript-Reihenfolge ist bindend** (alle `defer`, laufen also der Reihe nach):

```html
<script src="data.js" defer></script>       <!-- MUSS zuerst: alle lesen daraus -->
<script src="pixel-engine.js" defer></script><!-- common.js hängt sich sync ein -->
<script src="common.js" defer></script>      <!-- setzt window.MCDUI -->
<script src="pacman.js" defer></script>
<script src="menu.js" defer></script>
<script src="v3.js" defer></script>          <!-- NUR index.html -->
```

Eine Service-, Kontakt- oder Rechtsseite braucht **kein eigenes Skript**:
`common.js` verdrahtet ein FAQ, dessen Reiter schon im HTML stehen, selbst
(`#faqList` + `#faqSrc`). Die Startseite rendert ihre Reiter aus `data.js` und
ruft `MCDUI.faq()` danach selbst auf — ein Widget, zwei Inhaltsquellen.

**Rechtsseiten neu erzeugen** (nach einer Änderung an `upload/legal/`):

```bash
python tools/build_legal.py     # liest upload/legal/, schreibt v3-proposal/legal/
```

Das Skript hebt den `<main>`-Inhalt unverändert heraus und setzt ihn in die
v3-Hülle. Es schreibt **nur** Hrefs um (`/legal/x.html` → `x.html`, `/` →
`../index.html`), damit die Seiten auch aus einem Unterordner funktionieren —
nie ein Wort des Textes.

## Das Kommando-Menü (`menu.js`)

Bewusst **kein** Mega-Dropdown. Eine Vollbildfläche, die drei Dinge kann, die
eine Linkliste nicht kann:

1. **Tippen zum Springen** — filtert über Titel, Stichwörter (`k`) und
   Beschreibung aller Services und `NAV`-Ziele.
2. **Fragen statt navigieren** — ab zwei Zeichen gibt es immer eine
   „Ask"-Zeile. Sie beantwortet die Frage aus `MCD.lookup()` direkt in der
   Vorschau. Es gibt kein „keine Treffer".
3. **Vorschau** — rechts steht, was auf der Zielseite steht: Nummer,
   Beschreibung, „what you get", Proof-Zeile. Die Überschrift decodiert sich
   aus Rauschen (`aria-hidden`, damit der Screenreader nicht das Flackern
   vorgelesen bekommt — der echte Name steht in der Option-Zeile).

Enter auf der Ask-Zeile geht auf `index.html?ask=…#ai`; `v3.js` nimmt den
Parameter auf, lässt die Konsole antworten und putzt ihn per `replaceState`
wieder aus der URL.

Tastatur: **⌘K / Strg+K** von überall, `/` zum Öffnen (nicht während man in
einem Feld tippt), ↑↓, Home/End, Enter, Esc. Sauberes Combobox-Muster:
`aria-activedescendant` statt fokussierbarer Optionen, Fokus-Falle,
Scroll-Sperre mit Scrollbar-Ausgleich (sonst springt das Layout um ~15px),
Fokus geht an den Auslöser zurück.

**Seiten unterhalb der Wurzel brauchen `data-root=".."` am `<html>`** — daraus
baut `menu.js` alle Pfade. Auslöser ist ein beliebiges Element mit
`data-menu-open`; ein `<kbd data-menu-key>` darin bekommt automatisch ⌘ oder
Ctrl je nach Plattform.

## Patches an der Engine (nur hier, nicht live)

1. **Canvas-Versatz auf die Textbox.** `build()` setzt jetzt `cv.style.top/left`
   auf `textRect - hostRect`. Ohne das sitzt das Pixelfeld bei `line-height`
   unter dem Glyphen-Ratio (~1.23em) zu tief und schmiert in die nächste Zeile.
   **Die Live-Engine hat den Bug noch** — dort fällt er nur nicht auf.
2. **Webfont-Einbettung** für den Rasterizer (`window.PixelFXFontCSS`), sonst
   rasterisiert der foreignObject-Pfad in der Fallback-Schrift.
3. **`pixelImage().reveal()`** — die Fresh-v2-Mechanik nachgebaut: das scharfe
   Bild wird für einen Frame versteckt, der Mosaik-Schwarm fliegt aus einer
   Streuung zusammen (easeOutCubic, 0.9 s + 0.5 s Versatz pro Partikel) und
   übergibt dann an das echte Foto. Hover re-pixelt sofort und öffnet das
   schwarze Loch; beim Verlassen federn die Pixel heim und das Foto kommt
   zurück. **Nicht** an Hover-Fähigkeit gekoppelt — Touch bekommt den Reveal,
   nur kein Loch. Schlägt `build()` fehl (Bild noch nicht geladen, tainted,
   zu klein), bleibt das scharfe Foto sichtbar; kein Zustand lässt es hängen.
4. **Bild-Zeichenpfad kostet das Loch, nicht das Bild** (2026-08-03). Vorher
   wurde pro Frame das ganze Feld neu gemalt: bei der Work-Karte 14 157
   Partikel, 5,15 ms bei DPR 1 und 6,75 ms bei DPR 2 — davon zwei Drittel
   allein das Setzen von `fillStyle` (ein `"rgb(...)"`-String pro Partikel,
   pro Frame). Das ist der ganze Unterschied zu den Buttons, die dieselbe
   Schleife mit ~400 Partikeln fahren. Jetzt: das ruhende Mosaik einmal in ein
   Offscreen-Canvas (`home`), pro Frame **ein** `drawImage`, und nur die vom
   Loch berührten Zellen (~1 370) werden gelöscht und einzeln neu gemalt →
   **0,54 ms bzw. 0,70 ms**. Die Zeichenkosten hängen ab jetzt am Radius des
   Lochs, nicht an der Bildgröße; eine doppelt so große Karte kostet gleich
   viel. Buchführung: `dirty`-Box in Rasterkoordinaten, die jeden Frame um die
   Zeigerscheibe wächst und auf das schrumpft, was noch nicht daheim ist —
   „nicht daheim" zählt, nicht „bewegt sich", sonst malt der nächste Blit einen
   im Krater geparkten Pixel hinter seinem Rücken wieder nach Hause.
5. **Der Bildausschnitt kam per Ziel-Rechteck, nie per Quell-Rechteck**
   (2026-08-03) — der Fehler, den der Owner als „das Bild zoomt gewaltig" sah.
   `build()` hatte den Cover-Ausschnitt aus `naturalWidth/naturalHeight`
   gerechnet und als 9-Argument-Quellrechteck an `drawImage` gegeben. Für jedes
   `<img>` mit `srcset` ist das falsch: **`naturalWidth` meldet die
   dichte-korrigierte Größe in CSS-Pixeln, `drawImage` liest sein Quellrechteck
   in rohen Bitmap-Pixeln.** `code-screen-640.webp` ist 640×440 auf der Platte
   und meldet 559×384 — der Ausschnitt griff also die linken oberen 87 %.
   Auf einer Anzeige, die per DPR die 1200w-Variante mit Dichte 2,14 wählt,
   griff er ein **Viertel**: das Bild erschien bei 200 %, oben links verankert.
   Jetzt die 5-Argument-Form, die das **ganze** Bild in ein Ziel-Rechteck
   skaliert — es wird nie eine Größe im Bitmap-Raum genannt, nur das
   Seitenverhältnis aus `natural*` gelesen, und ein Verhältnis ist
   dichte-unabhängig. **Testfalle:** ein Abgleich, der nur nach Verschiebung
   sucht, findet das nie (eine reine Skalierung hat ihr Optimum bei dx=dy=0) —
   und auf DPR 1 mit der 640er Variante beträgt der Fehler nur 1,14×. Der Test
   in `tools/` sucht deshalb über **Skalierung**.
6. **Weiche Blende zwischen Foto und Mosaik — im Canvas, nicht in CSS.**
   Erst probiert und verworfen: harter Schnitt in beide Richtungen (wie
   `PixelFX.button`). Grund für den Verwurf war der Owner-Wunsch „viel viel
   weicher". CSS-Deckkraft geht dafür nicht: zwei deckende Ebenen, die
   aneinander vorbeiblenden, ergeben `a + b(1-a)`, in der Mitte ~75 % — auf den
   dunklen Karten ein sichtbarer dunkler Puls. Lösung: das scharfe Foto liegt
   als **undurchsichtiger Boden** (`photoCv`, Alpha 1) im Canvas, das Mosaik
   darüber mit Alpha `mix`. Die Deckung ist damit in jedem Moment 100 %
   (gemessen: Helligkeit konstant 40,2–40,4 über den ganzen Verlauf). Im
   Dauer `FADE = 640 ms`, easeInOutCubic — **das ist der einzige Regler für
   „weicher"**: als hart empfindet man die steilste Stelle in der Mitte, und die
   liegt bei `3/FADE`. 460 → 640 ms senkte sie von 15,3 auf 11,9 (Blockigkeit
   pro 100 ms). Der `<img>`-Tausch passiert nur noch bei `mix` 0 oder 1, wo
   Canvas und Foto dasselbe Bild zeigen — also unsichtbar. Federschwanz-Timer
   und Rückgabe-Kappe sind damit ersatzlos entfallen: die Blende entscheidet,
   nicht die Physik.
7. **Der Effekt liegt auf einer eigenen Ebene (`fxCv`)** — sonst sieht man die
   aufgeräumte Box. Erster Anlauf von Patch 6 hat die gestörte Box direkt auf
   die Hauptfläche gerechnet: Foto mit `1-mix` **innerhalb**, mit `1`
   **außerhalb**. Damit bekam die Box eine andere Mischung als ihre Umgebung
   und stand mitten in der Blende als schwaches Rechteck im Bild — der Owner
   hat es gesehen, bevor ich es gemessen hatte. (Meine ersten beiden
   Herleitungen waren falsch: die Deckung ist überall 255, es war ein reiner
   Farbunterschied.) Jetzt in zwei Schritten: **(1)** die ganze Wirkung wird
   deckend auf `fxCv` gebaut — Mosaik, Box freigeräumt, mit `voidCol` gefüllt,
   Partikel darüber; nichts davon kennt `mix`. **(2)** die Hauptfläche bekommt
   genau zwei Befehle: Foto mit Alpha 1, `fxCv` mit Alpha `mix`. Kein Bereich
   hat mehr ein eigenes Rezept, also kann es keine Kante geben — das ist eine
   Eigenschaft der Konstruktion, nicht eine gut eingestellte Zahl.
   `voidCol` ist der Hintergrund des ersten Vorfahren, der wirklich einen hat
   (`readVoid()`, bei jedem `activate()` neu wegen Themenwechsel) — geprüft:
   Krater `rgb(21,20,15)` = `.case`-Hintergrund. Kosten: zwei zusätzliche
   Vollflächen-`drawImage` pro Frame, in der Messung nicht nachweisbar
   (Median 16,7 ms, 0 Frames > 20 ms).
8. **Zwei Anleihen bei der Claude-Design-Vorlage** (`_v2-preview/assets/
   5e7a8095-*.js`) — die Architektur dort **nicht** übernehmen, sie malt jedes
   Frame das ganze Feld neu und ruckelt entsprechend (vom Owner bestätigt).
   - **Zellweise Mittelung statt Punktabtastung.** Das Bild wird jetzt in ein
     Offscreen von genau `COLS × ROWS` gezeichnet, ein Texel pro Rasterzelle;
     der Browser mittelt beim Verkleinern. Vorher wurde je Zelle das linke obere
     Pixel gegriffen, was auf feinem Inhalt (Code, Platinen) sprenkelte. Der
     Rückleseaufwand fällt von `W*H` auf `COLS*ROWS` — 14 k statt 224 k Pixel
     auf einer Work-Karte. Nebenbei entfällt die alte Bruchzahl-`GAP`-Falle:
     Zellen werden über ganzzahlige Indizes adressiert, keine Koordinate kann
     mehr zwischen RGBA-Bytes landen. **Wichtig:** der Cover-Ausschnitt wird
     weiterhin aus `W/H` gerechnet und nur durch `GAP` geteilt — `COLS/ROWS`
     trägt einen Rundungsfehler und würde `tools/pixel_scale.sh` brechen.
   - **Der Krater ist kein Ausstanzen mehr, sondern eine Abdunklung.**
     `VOID = 0.62` (`opts.voidStrength`): die gestörte Box wird mit `voidCol`
     bei dieser Deckkraft überzogen, die lebenden Pixel danach deckend darüber.
     Kein `clearRect` mehr — eine Zelle, deren Pixel daheim ist, wird ohnehin
     wieder überdeckt; eine, deren Pixel weg ist, behält einen verblassten
     Abdruck, und **dieser Abdruck ist der Krater**. Bei `VOID = 1` ist es
     wieder das harte Loch von vorher. Grund: im hellen Modus stand sonst eine
     harte weiße Scheibe mitten im dunklen Foto. Die Vorlage löst dasselbe
     anders — ihre Blöcke sind kleiner als das Raster (`size = gap - 1.2`), der
     Hintergrund scheint überall zu 36 % durch, das Loch ist dort nie ein
     Fremdkörper. Das schleiert aber jedes Bild zur Seitenfarbe hin, was das
     dichte Mosaik hier bewusst nicht tut — daher der Regler statt des Rasters.

6. **Ein rotiertes Bild wird in seiner LAYOUT-Box gemessen, nie im
   `getBoundingClientRect`.** Owner (2026-08-31): „unter 05 wenn ich da über die
   bilder gehe, dann transformiert der die bilder höhe leicht. das darf nicht
   passieren." Die Porträts unter (05) sind rotiert, und ihre Scroll-Drift
   **animiert** die Rotation (`pdA` −6,5° → −1,2°). `getBoundingClientRect`
   liefert für ein transformiertes Element die achsenparallele **Hülle**: bei
   −6,5° sind das 428 × 513 statt 381 × 477 — 12 % zu breit, 8 % zu hoch, und
   der Betrag hängt am Scrollstand. Das Canvas hängt per CSS an der Box
   (`inset:0; width:100%`), also wurde ein in Hüllgröße gebautes Feld
   **ungleichmäßig gestaucht** dargestellt: das Bild änderte sichtbar die Höhe,
   sobald der Hover an das Canvas übergab. `build()` nimmt jetzt `boxSize()` —
   `getComputedStyle().width/height`, also Used Values im eigenen
   Koordinatensystem des Elements, transformfrei per Definition und stabil
   während die Drift läuft. Die Work-Karten waren nie betroffen, weil sie nicht
   rotiert sind.

   Derselbe Denkfehler steckte im **Maus-Handler**: `clientX − rect.left`
   stimmt nur für eine achsenparallele Box. Gemessen saß der Krater **18 px
   (Porträt 1) bzw. 22,5 px (Porträt 2)** neben dem Cursor — bei `R = 46` ein
   halber Radius. Die Matrix aus den Computed Styles zu rekonstruieren wäre
   brüchig (`translate`/`rotate`/`scale` sind eigene Eigenschaften neben
   `transform`, und die Drift animiert sie), also wird die Abbildung
   **gemessen**: eine 0×0-Sonde an drei bekannten lokalen Punkten meldet ihre
   transformierte Lage, das ergibt die affine Vorwärtsmatrix, die einmal
   invertiert und zwischengespeichert wird. Fehler danach **1,0–1,1 px**. Der
   Cache fällt bei `activate()`, `resize` und `scroll` — der Scroll-Listener
   hängt nur, solange die Karte aktiv ist, und die Sonde lebt so lange wie die
   Karte (kein DOM-Müll pro Mausbewegung). Kosten: keine — Hover-Sweep p90
   16,7 ms, 0 Frames über 20 ms, auch beim Sweep **während** des Scrollens, dem
   Fall, der pro Bewegung neu misst.

   **Der Wächter war auf diesen Defekt blind** und ist nachgeeicht:
   `tools/pixel_scale_probe.js` maß selbst mit `getBoundingClientRect` und
   verglich damit Hülle gegen Hülle — er blieb grün, während das Mosaik
   gestaucht angezeigt wurde. Er rechnet jetzt in der Layout-Box und prüft
   zusätzlich direkt `Canvas-Backing (CSS-px) == Layout-Box` (`boxOk`).
   Gegenprobe gefahren: mit dem alten `build()` schlägt er fehl, mit dem neuen
   ist er grün.

## Die Tafeln unter (04) sind ganzflächig anklickbar

Owner (2026-08-31): „die tafeln, die sollten alle hover pointer aktiv sein,
nicht nur der more on this link. gerade auch weil mobile das sich wiederholt."

Die Work-Karten machen das seit jeher (`.case .scard-link::after { inset: 0 }`,
Kommentar dort: „the card is the click target, the visible link is only its
label"). Die Service-Karten hatten es nie. **Gemessen vorher: 30 von 126
Prüfpunkten** über eine Tafel landeten auf dem Link; danach 126 von 126,
Zeigerhand überall, Desktop wie Telefon.

**Warum das nicht mit einer Zeile ging.** `.scard > *:not(.scard-ghost)` stand
auf `position: relative` (damit der Text über Spotlight und Geisterziffer
liegt). Ein positionierter Vorfahre wird zum **Bezugsrahmen** für das
`::after`-Overlay des Links — das Overlay spannte deshalb über die mittlere
Spalte (544 × 133) statt über die Tafel (1325 × 225). Statt den Text zu heben,
liegt die Deko jetzt **darunter**:

- `.scard::after` (Spotlight) und `.scard-ghost` auf `z-index: -1`.
- `.scard { isolation: isolate }` — sonst hinge es daran, dass `v3.js` ein
  `z-index` inline schreibt; ohne Stacking-Context fiele die Deko hinter die
  Sektion.
- Die Regel, die den Inhalt anhob, ist ersatzlos weg.

**Optik unverändert — belegt, nicht behauptet:** Pixel-Diff der gehoverten
Sektion vorher/nachher ergibt **null** abweichende Pixel unterhalb der
Kopfzeile; die einzigen Unterschiede waren die Pacman-Leiste und die animierte
Pixel-Headline, die beide ohnehin laufen.

Dazu: jeder Link trägt `aria-label="More on this — <Service>"`, damit vier
gleichlautende Beschriftungen unterscheidbar sind, ohne den sichtbaren Text zu
ändern (der sichtbare Text bleibt im zugänglichen Namen enthalten, WCAG 2.5.3).

**Preis des Musters:** Text innerhalb einer Tafel lässt sich nicht mehr
markieren — das Overlay liegt darüber. Bei den Work-Karten ist das seit jeher
so akzeptiert.

## Die Banderole unter (05)

Owner (2026-08-31): „das ein und ausblenden des textes unten ist viel zu
schnell und wirkt abgehackt, ich würde sagen, den text setzen wir wie eine
schöne Banderole unten an das Bild."

**Es hat nie geblendet.** Die `figcaption` stand auf `z-index: auto`, das
Canvas der Engine steht auf 2 — beim Hover wurde der Text schlicht **verdeckt**
und beim Verlassen wieder freigegeben. Kein Übergang, ein Schalter. Deshalb
wirkte es abgehackt, und deshalb hätte eine längere Transition das Problem auch
nicht gelöst.

Gebaut ist **Variante B** aus `_parked/banderole-mockup.html` (vier Entwürfe,
mit den echten Fotos und laufender Engine; liegt in `_parked/`, weil
`build_sitemap.py` und `check_links.py` diesen Ordner überspringen — eine
zusätzliche HTML-Datei anderswo bricht den Sitemap-Wächter):

- Band über die volle Bildbreite, `z-index: 3`, also **über** dem Canvas.
- **Deckend** (`rgba(13,12,10,.94)`), kein Verlauf: dahinter läuft im Hover ein
  Mosaik mit einem Krater darin, über dem ein Verlauf unlesbar wird.
- 2 px Oberkante in `--acc`.
- Name links, Rolle rechts über `margin-left: auto` statt `text-align` — so
  sitzt sie hart rechts, solange beide eine Zeile teilen, und bleibt an Ort und
  Stelle, wenn die Karte zu schmal wird und sie umbricht (mobil bei 203 px
  Kartenbreite: zwei Zeilen, kein Überlauf).

Kontrast im schlechtesten Fall (helles Foto hinter dem 94-%-Band): Rolle
**6,8:1**, Name **15,3:1**, gelbe Kante 10,6:1.

**Wenn je eine überstehende Banderole gewünscht wird** (Varianten A/C/D im
Mockup): `.pcard` muss dann `overflow: visible` bekommen, und der Eck-Radius
muss auf `.px-img` wandern — sonst verlieren die Fotos ihre runden Ecken, weil
das Clipping der Karte sie bisher rundet. Das Canvas erbt den Radius bereits
(`.px-canvas { border-radius: inherit }`). Zu bedenken: die zwei Karten in (05)
überlappen sich, ein überstehendes Band legt sich also über die Nachbarkarte.

## Bekannte Fallstricke der Scroll-Choreografie

- `.rv` / `.rv-s` / `.stagger` animieren **`translate`/`scale`/`rotate`**, nicht
  `transform`. Eine Animation auf `transform` schlägt jeden `:hover`-Transform
  auf demselben Element — damit waren Chip- und Karten-Lifts still tot.
- Bänder mit `position: sticky`-Kindern (`#services`, `#faq`) bekommen
  **`fx-dim`** (nur Opazität). `fx-out` setzt `translate`/`scale` und würde die
  Sticky-Boxen umhängen.
- `#contact` bekommt **gar keinen** Band-Ausblender — nichts darf abdunkeln,
  während jemand das Formular ausfüllt.
- Der Marquee-Track wird zur Laufzeit dupliziert. Deshalb sechs Elemente, nicht
  fünf: bei ungerader Anzahl kippt die voll/hohl-Parität an der Naht.
- `.worktrack` hat `overflow-x: auto` — damit wird `overflow-y` **rechnerisch
  auch `auto`**, die Box clippt also vertikal. Ohne `padding-block: 14px 36px`
  wird beim Hover die obere Kante der Karte abgeschnitten und der Schatten
  unten gekappt.
- `.console` hat **bewusst kein** `overflow: hidden`: der Send-Button zerfällt
  wie jeder gelbe Button und braucht ~64px Flugraum für seine Pixel.
- **Jeder gelbe Button** bekommt den Pixel-Zerfall: `.btn:not(.btn--ghost)`,
  `.console-send`, `.case-peek`. Die „Open →"-Pille ist dafür ein echtes `<a>`
  **über** dem gestreckten Karten-Link (z-index 6) und nur bei `:hover` der
  Karte klickbar — sonst würde die Engine auf einer unsichtbaren Pille feuern.
  `aria-hidden` + `tabindex="-1"`, damit es für Tastatur und Screenreader
  weiterhin genau ein Link pro Karte ist.
- Die Tool-Leiste hängt **unter** dem `.ai-grid`, nicht in der Textspalte. In
  einer halben Spalte brechen fünf Marken immer um; über die volle Breite mit
  `flex-wrap: nowrap` + `space-between` läuft sie als eine Schiene durch
  (ab 1000px; darunter darf sie umbrechen).
- Die Testimonial-Karten sind **Papier-Inseln in beiden Themes** — lokale
  Token-Overrides (`--bg/--fg/--muted/--line`), damit Avatar-Scheibe,
  Sekundärtext und Haarlinien automatisch mitkippen.
- **Work-Slider ist endlos** (beide Richtungen). Der Satz liegt dreifach im
  DOM, die **Originale in der Mitte** — so behalten ihre Pixel-Engine-Instanzen
  ihre Element-Identität. Geklont wird in Abschnitt 11, also **vor** dem
  Engine-Boot; dadurch verdrahtet die Engine alle zwölf Karten von selbst.
  Klone tragen `aria-hidden` und `tabindex="-1"` auf jedem Link (ein
  `aria-hidden`-Teilbaum darf nichts Fokussierbares enthalten).
  Der Sprung um genau eine Satzbreite passiert **erst im Scroll-Leerlauf**
  (160 ms): ein `scrollBy({behavior:"smooth"})` läuft auf ein *absolutes* Ziel
  zu — verschiebt man ihm den Boden mitten im Flug, landet es auf der falschen
  Karte. Beim Trackpad-Schwung ist der Sprung dagegen unsichtbar, weil der
  Inhalt an dieser Stelle identisch ist.

## Lighthouse (2026-08-03, alle zehn Seiten)

Gemessen gegen `prodserve.py` — einen kleinen Server, der **gzip + Cache-Header**
schickt. `python -m http.server` liefert alles roh und uncached und misst damit
grob falsch: derselbe Stand kam dort auf Speed Index **4.6 s** statt **1.2 s**.
Immer so messen:

```bash
python prodserve.py 8897        # in v3-proposal/
npx -y lighthouse http://127.0.0.1:8897/services/ai-tools.html   --preset=desktop --quiet --output=json --output-path=lh.json || true
```

Das `|| true` ist nötig: Lighthouse beendet sich mit Code 1, weil
chrome-launcher sein Temp-Verzeichnis unter Windows nicht löschen kann
(`EPERM … lighthouse.86294882`). **Der Report ist zu dem Zeitpunkt längst
geschrieben** — ohne `|| true` bricht die Kette ab und man sucht einen Fehler,
den es nicht gibt.

| Seite | Perf | A11y | Best Pr. | SEO¹ | Agentic |
| --- | --- | --- | --- | --- | --- |
| index (Desktop) | **100** | **100** | **100** | 63 | **100** |
| contact | **100** | **100** | **100** | 60 | **100** |
| services/* (alle vier) | **100** | **100** | **100** | 63 | **100** |
| legal/* | **100** | **100** | **100** | 60 | **100** |
| index (mobil) | **98** | **100** | **100** | 63 | **100** |
| services/ai-tools (mobil) | 94 | **100** | **100** | 63 | **100** |
| contact (mobil) | 91–97² | **100** | **100** | 60 | **100** |

¹ Einziges SEO-Manko ist `Page is blocked from indexing` — das bewusste
`<meta name="robots" content="noindex">` des Entwurfs. **Beim Livegang
entfernen, dann steht SEO auf 100.**

² Mobile Messungen streuen deutlich (4× CPU-Drosselung): drei Läufe derselben
Seite ergaben 91 / 97 / 91. Bei mobilen Zahlen immer mehrfach messen, bevor man
einer Änderung eine Wirkung zuschreibt.

**Was in dieser Welle behoben wurde:**

- **A11y 96 → 100 auf allen Seiten:** Das `⌘K`-Kürzel im Menü-Auslöser hatte
  `opacity: .75` auf `--muted` — effektiv 4.15:1 gegen die dunkle Nav, also
  unter den geforderten 4.5:1. Opazität raus; die kleinere Mono-Größe trennt
  den Tastenhinweis ohnehin ausreichend.
- **A11y 95/96 → 100 auf contact und den Service-Seiten:** axe misst
  `.rv`-Elemente **mitten in der Einblend-Animation** und liest die halb
  transparente Farbe als Kontrastfehler. Betroffen war jeweils das erste Band
  nach dem Hero, weil es (mobil erst recht) noch im ersten Bildschirm steht.
  Dort ist die Reveal-Animation jetzt raus — Inhalt an der Falzkante soll
  ohnehin nicht einblenden.
- **Mobil 94 → 98 (TBT 260 → 120 ms):** Die Tooltip-Verdrahtung in `common.js`
  hing an einem `MutationObserver` auf `<body>` mit `subtree: true`. Die
  Schreibmaschine schreibt alle ~9 ms `innerHTML` — der Observer feuerte also
  pro getipptem Zeichen ein dokumentweites `querySelectorAll`. Jetzt ein
  einziger Durchlauf auf `DOMContentLoaded` (läuft nach allen `defer`-Skripten,
  erwischt also auch die von `v3.js` gerenderten Score-Chips).
- **Erzwungene Reflows:** Marquee 125 ms (`scrollWidth` direkt nach dem
  Verdoppeln des Markups — misst jetzt im ersten Frame), Konsole 79 ms
  (`scrollHeight` direkt nach `appendChild` — jetzt im rAF), Pac-Man 25 ms
  (erste `measure()` jetzt im ersten Frame).

**Bewusst nicht behoben:**

- Der Work-Slider liest beim Start eine Kartenbreite, um auf dem mittleren Satz
  zu landen. Das erzwingt die erste Layout-Berechnung der Seite und taucht als
  „Forced reflow" auf. In einen rAF verschoben würde ein Frame mit
  `scrollLeft: 0` gezeigt, wo `scroll-snap` die erste Karte linksbündig stellt,
  bevor sie in die Mitte springt. Ein sichtbarer Sprung ist schlimmer als eine
  Diagnosemeldung auf einer Seite, die 100 mit TBT 0 ms erreicht.
- `v3.css` bleibt render-blockierend — asynchrones Nachladen reflowt beim
  Ankommen und kostet CLS.
- Minify für CSS/JS fehlt (kein Build-Schritt); bei Bedarf beim Deploy
  erledigen, nicht im Repo.

**Bilder neu erzeugen** (wenn echte Fotos kommen, Dateinamen beibehalten):

```python
from PIL import Image
im = Image.open('img/foo.jpg').convert('RGB')       # dann mittig auf 16/11
im.resize((1200, 825), Image.LANCZOS).save('img/foo-1200.webp','WEBP',quality=82,method=6)
im.resize((640, 440),  Image.LANCZOS).save('img/foo-640.webp', 'WEBP',quality=82,method=6)
```

Porträts: 4/5, Breiten 840 und 440.

## Nächster Schritt (Stand 2026-08-03)

Design ist vom Owner **abgenommen und eingefroren** — keine unaufgeforderten
Optik-Änderungen mehr, nur noch Umsetzung.

**Alle zehn Seiten stehen.** Was jetzt fehlt, hängt an Inhalten und an
Infrastruktur, nicht mehr am Entwurf:

1. **Drei Kundenzitate und zwei Work-Cases** — liefert der Owner.
2. **`/api/ask`** als Serverless-Funktion, dann `AI_MODE` in `v3.js` auf
   `"live"`. Key server-only, Rate-Limit.
3. **Kontaktformular verdrahten** (live läuft Web3Forms).
4. **Echte Porträts** nach `team/`, WebP @840 und @440.
5. **`noindex` entfernen** — auf allen elf Seiten (`tools/add_meta.py` fasst es
   nicht an, es steht direkt im `<head>` jeder Seite). Dann steht SEO auf 100.
6. **Live-Aufräumen für die Service-Reduktion:** `upload/services/apps.html`
   und `design-brand.html` löschen, dazu Mega-Menü, Footer, `sitemap.xml`,
   `llms.txt` und „Related services" nachziehen.
7. **Cookie-Banner** — `upload/consent.js` (235 Zeilen) ist noch nicht
   portiert. Solange der Entwurf nichts trackt, braucht er auch keinen.

## SEO, Social und Maschinenlesbarkeit

Alles davon wird **generiert**, nicht von Hand gepflegt — sonst driftet es.

| Datei | Erzeugt von | Inhalt |
| --- | --- | --- |
| `robots.txt` | von Hand | AI-Crawler ausdrücklich erlaubt (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended, CCBot …), Sitemap-Verweis |
| `sitemap.xml` | `tools/build_sitemap.py` | 10 URLs mit `lastmod` aus der Dateizeit. **Bricht ab**, wenn eine HTML-Datei auf der Platte nicht in der Liste steht oder umgekehrt — eine neue Seite kann nicht vergessen werden |
| `llms.txt` | von Hand | Vollständige Prosa-Zusammenfassung für AI-Agenten: alle Seiten, die vier Services, die FAQ-Antworten, das eigene Produkt, plus der UWG-Hinweis zur Brand-Leiste |
| Social-Block in jedem `<head>` | `tools/add_meta.py` | canonical, OG, Twitter-Card, `theme-color`, `apple-touch-icon`, Sitemap-Link. **Liest Titel und Description aus der Seite zurück** — Titel ändern, Skript laufen lassen, Karten stimmen |
| JSON-LD Startseite | `tools/build_jsonld.py` | ProfessionalService (mit OfferCatalog aus den vier Services), WebSite, **FAQPage** — alles aus `data.js` gelesen |
| JSON-LD Unterseiten | in der Seite bzw. `build_legal.py` | Service + BreadcrumbList je Service-Seite, ContactPage, Organization im Impressum |

**Warum FAQPage wichtig ist:** Auf der Startseite rendert `v3.js` die FAQ zur
Laufzeit aus `data.js`. Ein Crawler ohne JavaScript sieht dort ein leeres Panel.
Das JSON-LD trägt dieselben Fragen und Antworten im Markup — und `llms.txt`
dieselben noch einmal als Prosa. Damit ist der Inhalt dreifach erreichbar, ohne
`data.js` als einzige Quelle aufzugeben.

**404.html** liegt im v3-Look vor, wird aus jeder Tiefe ausgeliefert und nutzt
deshalb **root-absolute Pfade** (`/v3.css`, `/data.js`). Sie bekommt bewusst
**kein** canonical und **kein** Open Graph: eine Fehlerseite soll weder indexiert
noch geteilt werden. `noindex, follow` ist gesetzt, damit die Links darauf
trotzdem verfolgt werden.

Nach jeder inhaltlichen Änderung:

```bash
python tools/build_legal.py     # nur wenn upload/legal/ sich geändert hat
python tools/build_jsonld.py    # nach jeder Änderung an SERVICES oder FAQ
python tools/build_sitemap.py   # nach jeder neuen oder gelöschten Seite
python tools/add_meta.py        # IMMER zuletzt — überschreibt seinen eigenen Block
python tools/check_links.py
```

Die Reihenfolge ist wichtig: `add_meta.py` läuft zum Schluss, weil
`build_legal.py` die Rechtsseiten komplett neu schreibt und den Social-Block
dabei verlieren würde.

**SEO-Score:** 69 statt 100, und der einzige Grund ist weiterhin
`Page is blocked from indexing` — das bewusste `noindex` auf allen elf Seiten.

## Testen

Drei Skripte, alle ohne Abhängigkeiten:

```bash
python  tools/check_links.py          # jede Datei, jeder Anker, doppelte IDs
bash    tools/sweep.sh 1280 820 d     # alle 11 Seiten: Konsolenfehler,
bash    tools/sweep.sh  390 844 m     # Widgets, Overflow, A11y-Basics
bash    tools/pixel_scale.sh          # sitzt jedes Mosaik auf seinem Foto?
```

`pixel_scale.sh` prüft alle acht Pixelbilder (Work-Karten, Team-Porträts,
Service-Aufnahmen) und **sucht über Skalierung, nicht über Verschiebung** —
sonst findet es den srcset-Dichte-Fehler aus Patch 5 nie, denn eine reine
Skalierung hat ihr Optimum bei dx=dy=0. Erwartet `bestScale 1.00` überall;
Exit-Code ≠ 0, sobald eine Karte abweicht.

Stand 2026-08-03: 10 Seiten × 2 Viewports, **keine Seitenfehler, keine
Konsolenfehler, kein horizontaler Overflow, kein fehlendes `alt`, kein
namenloser Button, genau ein `h1` pro Seite.**

Interaktionen sind einzeln geprüft: Kommando-Menü aus zwei Ebenen Tiefe
(Pfad-Auflösung über `data-root`), Filter auf deutsche Stichwörter
(„widerruf" → Withdrawal), Pfeil-/Home-/End-Navigation im FAQ, Theme-Wechsel
über Seitengrenzen, `?ask=`-Übergabe von einer Service-Seite an die Konsole,
Formular-Hinweis.

## Offen — nach Wichtigkeit

1. **Drei Review-Slots und zwei Work-Cases sind leer.** Im ganzen Repo liegt
   **keine einzige echte Kundenreferenz** — geprüft über alle Ordner inklusive
   `mockup/` und `_v2-preview/`. Die Slots sagen das offen, statt etwas zu
   erfinden. Owner liefert Zitat + Name + Rolle + Firma, dann fällt
   `testi--open` weg.
2. Die Brand-Leiste unter (07) ist eine **Karriere-Referenz, keine Kundenliste**
   (UWG §5). Der Hinweis steht sichtbar darunter und im `aria-label`. **Nicht**
   zu „trusted by" oder „unsere Kunden" weichspülen.
3. Tool-Logos in der Stack-Leiste sind echte simple-icons SVGs; die Marken in
   `.tagset` bewusst nur Text — für jede davon eine Wortmarke nachzuzeichnen
   war genau das, was vorher falsch aussah.
4. Offene Frage an den Owner: „das black hole ist viel zu groß" — beim
   Zurückrollen auf die Original-Werte `R=46, FORCE=2.4` gesetzt, weil unklar
   war, ob der WebGL-Krater oder das 2D-Loch gemeint war.

## Gelöste Fallen (nicht erneut hineinlaufen)

- `width`/`height`-Attribute am `<img>` hebeln `aspect-ratio` aus → `height:auto`.
- `PixelFX.headline()` spielt nicht von selbst; IntersectionObserver muss
  `.play()` rufen.
- `PixelFX.button()` braucht die `.pxbtn .pxc { position:absolute }`-Regel,
  sonst steht sein Canvas im Fluss und der Button wird ~340px hoch.
- Die Engine setzt `display:block` **inline** — CSS-Klassen können ihre
  Canvases nicht abschalten.
- **Ein Element kann nicht gleichzeitig ein CSS-`transform` und ein Pixelfeld
  fahren.** `.case:hover .case-img img { transform: scale(1.04) }` lief 0,9 s
  lang, während das Mosaik im Canvas bei Skalierung 1 festgenagelt blieb — die
  beiden Ebenen schoben sich bei jedem Wechsel 23 px auseinander, rein wie
  raus. Das las sich als „das Bild zoomt und ruckelt". Regel entfernt;
  `PixelFX.button` macht dasselbe seit jeher über
  `.pxbtn.px-active { transform: none !important }`. Wer den Zoom zurückwill,
  muss ihn auf **beide** Ebenen legen und die Zeigerkoordinaten in `onMove`
  gegenrechnen (`x * W / rect.width`) — das Mosaik wird dabei weichgerechnet.
- Nach einem Theme-Wechsel erst **nach** dem 0.5s-Farbübergang neu sampeln,
  sonst wird die Headline im Hellmodus unsichtbar.
- Bänder-Polster: zwei Sektionen à `11vw` ergaben ~280px Leere dazwischen.
  Jetzt `7vw`; Seitenhöhe fiel von 9142px auf 6361px.
- `agent-browser set viewport` hängt **nur, wenn eine Seite schon offen ist.**
  In einer frischen Session **vor** dem `open` gesetzt, läuft es sofort durch:
  `agent-browser --session mob set viewport 390 844` → dann `open`. Damit ist
  mobil endlich prüfbar; Playwright braucht es dafür nicht.
- `:hover`-Zustände lassen sich nicht klicken. Zum Prüfen die `:hover`-Regeln
  einmalig auf eine Testklasse spiegeln (alle `cssRules` durchgehen,
  `:hover` → `.fh` ersetzen, als `<style>` anhängen, Klasse setzen).
- **`.rv`/`.stagger` an der Falzkante = Kontrastfehler.** axe misst die
  halb eingeblendete Farbe. Alles, was im ersten Bildschirm stehen kann,
  bekommt keine Reveal-Animation.
- **Kein `MutationObserver` auf `<body>`,** solange irgendwo eine
  Schreibmaschine läuft: sie ändert das DOM alle 9 ms.
- **Lighthouse endet unter Windows immer mit Code 1** (`EPERM` beim Aufräumen
  des Chrome-Temp-Ordners). Report ist trotzdem geschrieben → `|| true`.
- **Der Bash-Heredoc dieses Setups frisst Backslashes.** Ein `
` in einer
  Python-Regex kommt als echtes Newline an. Für alles mit Escapes: Datei per
  Write-Tool anlegen und ausführen, nicht per Heredoc.
- **`scroll-snap` korrigiert ein gesetztes `scrollLeft` nach.** Wer den
  Wert danach zurückliest und mit seiner Rechnung vergleicht, findet einen
  Fehler, der keiner ist — die Differenz ist die Zentrierung.
