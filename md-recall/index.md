# md-recall

> md-recall hält fest, warum Code so gebaut wurde – am Git-Commit, in Mikrosekunden abrufbar, ohne Tokens. HTML-Dashboard, self-hosted.

Quelle: https://mccain-digital.com/md-recall/
Sprache: de

Eigenes Produkt · Download v0.9 · beta

![md-recall](https://mccain-digital.com/brand/md-recall-mark.svg)

Projektgedächtnis, das am Commit hängt.

md-recall hält fest, warum Code so gebaut wurde – gestempelt an den Git-Commit, zurückgelesen in Mikrosekunden, ohne einen einzigen Token. Self-hosted, ohne Telemetrie.

Holen & starten

Installation per Claude-Befehl Dashboard im Browser keine Cloud, kein Konto

Sie in Claude:
 „Richte md-recall in diesem Repository ein."

Claude:
 ✓ Repository gelesen mccain-digital/md-recall
 ✓ Abhängigkeiten geprüft node 20 · git 2.43
 ✓ Git-Hook gesetzt .git/hooks/post-commit
 ✓ Index angelegt .recall/anchors.db
 ✓ MCP-Server eingetragen claude_desktop_config.json
 ✓ Dashboard gestartet http://127.0.0.1:7333

 Fertig. Soll ich die ersten Anker aus der Git-Historie
 erzeugen?

läuft lokal · Claude richtet es ein, danach ohne Netz

0

Tokens pro Abruf – der Kontext kostet nichts

0,25 ms

Lookup über 108.000+ Anker

100 %

self-hosted, keine Telemetrie, kein Upload

Wie es funktioniert

## Drei Schritte, kein Wiki, das veraltet.

Wissen entsteht beim Schreiben. md-recall nimmt es dort auf, bindet es an die Zeile und den Commit – und gibt es zurück, wenn jemand die Stelle wieder anfasst.

01 Am Commit festhalten git post-commit hook

02 Anker statt Vektoren SQLite · pgvector optional

03 Zurücklesen – Mensch oder KI CLI · Editor · MCP

### Die Begründung wird gestempelt, nicht dokumentiert

Eine Notiz im Editor oder per CLI, während die Entscheidung noch frisch ist. md-recall hängt sie an Datei, Zeile, Commit und Autor – ohne Copy-Paste in ein Wiki.

hook: .git/hooks/post-commit
anchor: {file, line, sha, author, ts}
store: ./.recall/anchors.db (SQLite)

Funktionen

## Was drin ist.

### Anker, die Refactorings überleben

Verschieben, Umbenennen, Formatieren: Der Anker folgt der Zeile über den Git-Verlauf.

### MCP-Server inklusive

Claude, Cursor oder eigene Agenten greifen über Model Context Protocol direkt auf das Gedächtnis zu.

### Kein Token-Verbrauch beim Abruf

Der Lookup ist eine Datenbankabfrage, kein Modellaufruf. Kontext wird nicht bezahlt, sondern gefunden.

### Team-Sync über Ihr Repository

Anker liegen im Repository oder auf Ihrem Server – Austausch läuft über Git, nicht über unsere Infrastruktur.

### Editor-Anbindung

VS Code und Terminal heute, weitere Editoren über die offene HTTP-Schnittstelle.

### Ohne Telemetrie gebaut

Keine Konten, keine Analyse, keine ausgehende Verbindung. Was im Repository bleibt, bleibt im Repository.

In jedem Projekt dabei

## Wir bauen damit – und übergeben es mit.

md-recall läuft in jedem unserer eigenen Projekte und in jedem Kundenprojekt. Sie bekommen also nicht nur Code, sondern die Begründungen dazu – an der Zeile, an der sie hingehören.

Projekt mit Gedächtnis anfragen

ohne Aufpreis Teil der Übergabe

Git-Projekt, Dokumentation, Patch Notes Jedes Projekt geht als Repository raus – mit Historie, Doku und Änderungsnotizen. md-recall legt die Begründungen daneben, während wir bauen.

Ihr Team ist sofort auf dem Stand Wer md-recall benutzt, sieht bei jeder Zeile, warum sie so aussieht. Einarbeitung in Stunden statt in Wochen – auch Monate nach dem Launch.

Auch Ihre KI-Assistenten lesen mit Über den MCP-Server bekommen Claude oder Cursor denselben Kontext wie Ihr Team. Das ist der Unterschied zwischen „Code geerbt“ und „Code verstanden“.

Screens

## So sieht es im Einsatz aus.

Zehn Ansichten aus dem laufenden Betrieb. Klicken oder mit den Pfeiltasten durchgehen – der Text rechts gehört zum jeweiligen Bild.

1 / 10

01 · Editor

### Die Begründung steht, wo der Code steht

Im Editor hängt der Anker an der Zeile. Wer die Stelle anfasst, sieht sofort, warum sie so aussieht – ohne im Wiki oder in alten Tickets zu suchen.

VS Code inline

Die Bilder folgen, sobald der Umbau fertig ist. Bis dahin lassen sich die Felder direkt befüllen.

Holen & starten

## Einen Satz an Claude – der Rest passiert von selbst.

Sie bekommen ein Repository mit Dashboard, MCP-Server, Hook und Installationsdateien. Claude liest es, richtet alles ein und startet das Dashboard. Keine Desktop-App, kein Konto, keine Cloud.

Fassung v0.9.0 · beta HTML-Dashboard, keine App Einrichtung über Claude

Mit Claude einrichten

Nur das Dashboard

Repository öffnen empfohlen · dauert etwa zwei Minuten

Das sagen Sie Claude

`Richte md-recall aus <repo-url> in diesem Projekt ein.`

SHA-256 Repository-URL wird ergänzt Voraussetzungen: Claude mit Dateizugriff, Git 2.30+, Node 20+

Lizenz & Nutzung

Kostenlos für einzelne Entwickler und Teams bis fünf Personen. Für größere Teams und On-Premise-Betrieb mit Support: sprechen Sie uns an.

Beta – ehrlich gesagt

md-recall läuft bei uns täglich im Einsatz, ist aber jung. Die Anker-Datenbank ist stabil, das Dashboard ändert sich noch. Eine Desktop-App gibt es bewusst nicht – ein HTML-Dashboard ist weniger, das dazwischenstehen kann.

Frage zum Einsatz im Team stellen

KI-Anbindung

## Ihr Assistent fragt das Gedächtnis, nicht das Repository.

Der MCP-Server liegt im Repository und wird bei der Einrichtung automatisch eingetragen. Claude, Cursor oder ein eigener Agent bekommen drei Werkzeuge – und damit den Kontext, der zur Zeile gehört.

- recall.why, recall.note, recall.search als MCP-Werkzeuge
- Läuft auf 127.0.0.1 – keine Daten verlassen das Gerät
- Konfiguration schreibt Claude bei der Einrichtung selbst

[MCP-Server für Ihre Systeme bauen lassen](https://mccain-digital.com/leistungen/ki-automatisierung/)

// claude_desktop_config.json – schreibt die Einrichtung
{
 "mcpServers": {
 "md-recall": {
 "command": "node",
 "args": ["./md-recall/mcp-server.js"],
 "env": { "RECALL_REPO": "/pfad/zum/repo" }
 }
 }
}

Fragen

## Was Teams vor dem Einsatz fragen.

Wenn etwas fehlt: Die Konsole antwortet, oder schreiben Sie uns – wir betreiben md-recall selbst.

Passt md-recall zu Ihrem Team?

Fragen Sie die Konsole nach Einsatz, Lizenz oder Betrieb. Die Antwort erscheint im Chat unten rechts.

Wie funktioniert der Team-Sync?

Was kostet es für 20 Entwickler?

Verlassen Daten das Gerät?

**Wie wird es installiert?**

Sie bekommen ein Repository mit Dashboard, MCP-Server, Hook und Installationsdateien. Dann sagen Sie Claude einen Satz – „Richte md-recall in diesem Projekt ein." – und Claude erledigt den Rest: Abhängigkeiten prüfen, Hook setzen, Index anlegen, MCP eintragen, Dashboard starten. Wer lieber selbst tippt, ruft setup.sh auf.

**Verlassen unsere Daten das Gerät?**

Nein. md-recall speichert Anker in einer lokalen Datei im Repository oder auf Ihrem Server. Es gibt keine Telemetrie, kein Konto und keine ausgehende Verbindung. Der MCP-Server bindet ausschließlich auf 127.0.0.1.

**Warum keine Vektorsuche als Standard?**

Weil die Frage meistens „warum steht das hier so?“ ist und nicht „was ist ähnlich?“. Ein Anker an Datei und Zeile antwortet exakt, in 0,25 ms und ohne Tokens. Semantische Suche ist zuschaltbar – lokal über pgvector, wenn Sie über Dateien hinweg suchen wollen.

**Was passiert bei Refactorings?**

Anker folgen der Zeile über den Git-Verlauf, inklusive Umbenennungen und Verschiebungen. Wo eine Zeile wirklich verschwindet, bleibt der Anker am letzten bekannten Commit erhalten und ist als historisch markiert.

**Wie arbeitet ein Team damit?**

Die Anker-Datei liegt im Repository und wird mit gepusht – oder Sie betreiben md-recall serve zentral. Beides ohne unsere Infrastruktur. Konflikte werden zeilenweise zusammengeführt, wie Code.

**Was kostet md-recall?**

Für einzelne Entwickler und Teams bis fünf Personen kostenlos. Für größere Teams, On-Premise-Betrieb, Anpassungen oder Support sprechen wir über eine Lizenz – eine Zahl, keine Nutzerstaffel mit Überraschungen.

**Ist es Open Source?**

Heute nicht. Das Dashboard ist frei nutzbar, der Quellcode liegt bei uns. Wenn Sie den Code für den Betrieb brauchen – etwa als Auflage Ihrer IT – reden wir darüber, das ist verhandelbar.

Kontakt

## Erzählen Sie uns von Ihrem Vorhaben.

Eine Antwort innerhalb von 24 Stunden, ein Festpreis innerhalb von 48 – von einer der zwei Personen, die es bauen würden.

[info@mccain-digital.com](mailto:info@mccain-digital.com)

Holderweg 1 · 86869 Oberostendorf · Bayern

Mo–Fr · 9:00–18:00 Uhr (MEZ)

[Schon ein Projekt im Kopf? Im Konfigurator sehen Sie Größenordnung und Dauer sofort – und schicken die Aufstellung direkt an uns.](https://mccain-digital.com/preise/#rechner)

Ihre Angaben werden nur zur Beantwortung Ihrer Anfrage verwendet.
