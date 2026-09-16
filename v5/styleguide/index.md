# Wie diese Seite gebaut ist.

> Der Styleguide von mccain-digital.com: Farben, Typografie, Raster, Komponenten, dunkle Flächen und Bewegung – jede Angabe so, wie sie im Code steht.

Quelle: https://mccain-digital.com/styleguide/
Sprache: de

Styleguide

Farben, Typografie, Raster, Komponenten und Bewegung – alles, was auf mccain-digital.com verwendet wird, an einer Stelle. Jede Angabe ist die, die im Code steht; diese Seite ist aus denselben Bausteinen gebaut wie der Rest.

01 Farben

## Eine Leitfarbe, ein Tiefblau, drei Signale.

Violett trägt jede Aktion. Navy trägt die Flächen, auf denen etwas erklärt wird. Grün bestätigt, Orange markiert, Pink warnt – nie mehr als eine Signalfarbe pro Abschnitt.

Akzent

#635BFF

Buttons, Links, aktive Zustände

Akzent Text

#4D47C7

Textlinks auf Weiß, Eyebrows

Navy

#0A1F44

Dunkle Sektionen, Kontakt, Footer

Tinte

#0A2540

Überschriften und harte Kontraste

Fließtext

#425466

Absätze, Beschreibungen

Fläche

#F6F9FC

Karten, Hinweisfelder, Tabellenköpfe

Grün

#15BE53

Bestätigung, Haken, positive Listen

Orange

#C2410C

Eyebrows auf der Websites-Seite, Warnhinweise

02 Typografie

## Zwei Schriften, sechs Größen.

Instrument Sans für alles, was gelesen wird. JetBrains Mono für alles, was gemessen wird: Zahlen, Kürzel, Code, Marker. Überschriften laufen eng, Fließtext atmet.

Software, die in Produktion geht.

Display clamp(33–59px) · 600 · -.045em

Was Sie von uns bekommen.

H2 clamp(30–41px) · 600 · -.035em

Dashboards & interne Tools

H3 clamp(17–23px) · 600 · -.02em

Eine Aussage, ein Weg weiter.

Lead clamp(17–21px) · 400 · 1.55

Fließtext steht nie breiter als 62 Zeichen.

Body 15–16px · 400 · 1.6

LIEFERUMFANG · 01

Mono / Eyebrow JetBrains Mono · 11px · .14em · Versalien

03 Raster

## Ein Maßband, zwei Radien, drei Schatten.

Inhalt läuft maximal 1440 px breit mit 20–48 px Rand. Sektionen sind 72–116 px hoch gepolstert, dunkle Flächen 60–96 px. Alles dazwischen folgt der Skala.

Abstände

6–9 px Zwischen Chips und Icons

12–16 px Karten im Raster

20–32 px Innenabstand einer Karte

26–48 px Überschrift zu Inhalt

60–96 px Dunkle Sektionen

72–116 px Helle Sektionen

Radien

8px Buttons

11px Listenzeilen

16px Karten

18px Große Flächen

999px Chips, Pillen

Schatten

Rahmen

Karte

Angehoben

04 Komponenten

## Die Bausteine, aus denen jede Seite besteht.

Jede Komponente hat genau einen Zweck und einen aktiven Zustand. Was nicht anklickbar ist, sieht auch nicht so aus.

Buttons

Projekt anfragen Mehr erfahren Textlink

Ein primärer Button pro Abschnitt. Höhe 44–48 px, Radius 8 px, beim Überfahren wandert er 1 px nach oben.

Chips & Marker

Gewählt Offen STATUS · LIVE

Auswahl trägt den Akzent, Status trägt Grün, Messwerte stehen in Mono.

Eingaben

Fokus: 1,5 px Akzentrahmen plus 4 px Hof – nie der Browser-Standard.

05 Dunkle Flächen

## Navy heißt: hier wird erklärt.

Dunkle Sektionen tragen Beweise – Zahlen, Protokolle, Systeme. Überschriften werden weiß und eine Spur enger, Kennzahlen tragen den Verlauf, Marker stehen in Mono mit farbigem Punkt.

4×100

Lighthouse auf der eigenen Seite

0,9 s

Ladezeit im Mittel

0

Page-Builder im Einsatz

TLS 1.3 ✓ GET /api/v1 · 200 LLM → tool_call CLS 0.00

06 Bewegung

## Bewegung erklärt, sie schmückt nicht.

Jede Animation hat eine Aufgabe: zeigen, dass etwas geladen ist, dass etwas gewählt wurde oder dass etwas läuft. Alles außerhalb des Bildes pausiert, und wer weniger Bewegung eingestellt hat, bekommt keine.

Einblenden

fadeUp .7s cubic-bezier(.2,.8,.2,1)

Sektionen beim ersten Erscheinen, versetzt um 0,06 s je Karte.

Zustandswechsel

.22–.3s ease

Chips, Buttons, Aufklapper. Nie länger als eine Drittelsekunde.

Selbstlauf

3,0–3,8 s Takt · Pause 12 s

Listen und Diagramme laufen selbst, bis jemand klickt.

Pixelstrom

Canvas · 24 Partikel · Puls 5,2 s

Läuft hinter allem, immer gleich langsam, nie im Vordergrund.

07 Regeln

## Was gilt – und was nicht.

So machen wir es

- Ein Ziel pro Abschnitt, ein primärer Button
- Zahlen in Mono, Aussagen in Sans
- Grün nur für Bestätigtes, Akzent nur für Aktionen
- Fließtext maximal 62 Zeichen breit
- Jede Fläche trägt entweder Text oder Beweis – nichts dazwischen

So nicht

- Zwei gleich laute Buttons nebeneinander
- Farbverläufe auf Flächen, die Text tragen
- Schatten als Dekoration ohne Höhenunterschied
- Versalien im Fließtext
- Bewegung, die nichts erklärt

Marke, Dateien und das lebende Beispiel.

Logo, Wortmarke, Farbwerte und alle Dateien liegen im Markenleitfaden. Die Seite selbst ist der Beweis, dass die Regeln zusammenpassen.

[Zum Markenleitfaden](https://mccain-digital.com/v5/marke/) [Live ansehen](https://mccain-digital.com/)
