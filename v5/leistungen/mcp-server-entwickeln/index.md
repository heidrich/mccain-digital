# MCP-Server entwickeln lassen: Ihre Systeme als Werkzeuge für Claude.

> MCP-Server, die ERP, CRM und interne APIs als Werkzeuge für Claude bereitstellen – mit Rechten, Rate-Limits, Freigaben und Audit-Log.

Quelle: https://mccain-digital.com/leistungen/mcp-server-entwickeln/
Sprache: de

Technologie · Model Context Protocol MCP · Tools · Auth · Audit-Log

Ein MCP-Server macht aus ERP, CRM oder interner API ein Werkzeug, das ein KI-Assistent aufrufen darf – mit Rechten, Rate-Limits und Protokoll. Damit hört die KI auf zu reden und fängt an zu arbeiten.

[Zur Leistung KI](https://mccain-digital.com/v5/leistungen/ki-automatisierung/)

- Läuft auch rein lokal – keine Daten in die Cloud
- Jeder Aufruf protokolliert und begrenzt
- Wir betreiben eigene MCP-Server in md-recall

gekürzt, aus einem Kundenprojekt

// server/tools/orders.ts – ein Werkzeug, klar beschrieben
server.tool({
 name: "orders.find",
 description: "Offene Aufträge zu einem Kunden suchen",
 input: z.object({
 customer: z.string().min(2),
 status: z.enum(["offen", "geliefert", "storniert"]).default("offen"),
 limit: z.number().int().max(50).default(20),
 }),
 handler: async (args, ctx) => {
 await requireRole(ctx, "vertrieb"); // Rechte des Nutzers
 const rows = await erp.findOrders(args); // echtes System
 return { rows: rows.map(redact) }; // nichts Ungefragtes
 },
});

Ablauf

## Was zwischen Frage und Antwort passiert.

Fünf Schritte, einmal durchgeklickt. Rechts steht, was auf der Leitung liegt – und was das Modell nie zu sehen bekommt.

01 Frage im Client Claude, lokal

02 Werkzeug wählen MCP-Manifest

03 Leitplanken prüfen Ihr Server

04 System antwortet ERP · CRM · DB

05 Antwort & Protokoll Client + Log

01 · Claude, lokal

### Frage im Client

Jemand fragt in normaler Sprache. Bis hierher hat kein System etwas gesehen und kein Datensatz das Haus verlassen.

Wichtig: Der Client entscheidet, ob überhaupt ein Werkzeug nötig ist – Smalltalk erreicht Ihre Systeme nie.

Nutzerin: "Welche offenen Aufträge hat Nordlicht
 und was ist der Gesamtwert?"

Werkzeuge

## Ein Werkzeug ist ein Versprechen mit Schema.

Klicken Sie sich durch vier typische Werkzeuge: was hineingeht, was herauskommt, wer darf – und wo ein Mensch bestätigen muss.

orders.find lesend Aufträge zu einem Kunden suchen

orders.write schreibend Auftrag anlegen oder Status ändern

stock.check lesend Verfügbarkeit und Lieferzeit prüfen

docs.search lesend Handbücher und Verträge durchsuchen

orders.find lesend

Der Alltagsfall: eine gefilterte Liste mit genau den Feldern, die zur Frage gehören. Rechte des Nutzers gelten, Rate-Limit greift.

input { customer: string, status?: "offen"|"geliefert",
 limit?: int ≤ 50 }
output { rows: [{ id, due, total, currency }] }

Rolle „vertrieb" oder höher

30 Aufrufe pro Minute und Nutzer

Keine Freigabe nötig – es wird nichts verändert

Anbindungen

## Ihr System, unser Weg hinein.

Wählen Sie, was bei Ihnen läuft. Wir zeigen den Weg, den Aufwand und was es dafür braucht – auch wenn es keine API gibt.

HubSpot · Salesforce

Dateien & Postfach

Weg hinein

OData · RFC · CPI

Über OData-Dienste oder die Integration Suite, bei älteren Ständen über RFC. Schreibend immer in Absprache mit Ihrem SAP-Partner – wir liefern die Spezifikation dafür.

Lesen gut

Schreiben mit Freigabe

Aufwand 4–8 Tage

Einsatz

## Was ein MCP-Server bei Ihnen übernimmt.

Vier Anbindungen, die wir am häufigsten bauen. Jede beginnt mit der Frage: Welche Aufgabe soll die KI wirklich erledigen dürfen?

01

### Lesen aus ERP und CRM

Aufträge, Bestände, Kontakte, Angebote – der Assistent beantwortet Fragen mit echten Zahlen statt mit Erfundenem, und nur was die fragende Person sehen darf.

02

### Schreiben mit Freigabe

Angebot anlegen, Status setzen, Buchung vorschlagen: Schreibende Werkzeuge bekommen eine Schwelle, oberhalb der ein Mensch bestätigt.

03

### Eigene Wissensquellen

Wiki, Handbücher, Verträge als Werkzeug statt als Prompt-Anhang – mit Quellenangabe und ohne dass jemand Dateien hochlädt.

04

### Werkzeuge für eigene Agenten

Dieselben MCP-Werkzeuge nutzen auch Ihre automatisierten Abläufe – ein Vertrag für Chat und Automatisierung, nicht zwei Integrationen.

Lieferung

## Was Sie bekommen.

Der Server läuft bei Ihnen – lokal auf den Rechnern der Nutzer oder auf Ihrem Server. Schlüssel und Daten bleiben in Ihrer Hand.

1–2 Wo.

für eine erste Anbindung mit zwei bis drei Werkzeugen

0

Daten, die über unsere Infrastruktur laufen

[Größenordnung im Rechner ansehen](https://mccain-digital.com/v5/preise/)

MCP-Server mit dokumentierten Werkzeugen und Schemata

Rechte aus Ihrem Verzeichnis (Entra ID, LDAP, eigene Rollen)

Rate-Limits, Freigabeschwellen und Audit-Log je Aufruf

Konfiguration für Claude Desktop, Cursor und eigene Clients

Tests für jedes Werkzeug – auch für den Fehlerfall

Übergabe als Git-Projekt mit Dokumentation und Patch Notes

Systemkarte

## Was am MCP-Server hängt.

Der Server ist die einzige Stelle, an der KI und Ihre Systeme sich treffen. Fahren Sie über die Knoten – rechts steht, was dort passiert.

Claude · Cursor

Client

### Claude · Cursor

Der Assistent liest die Werkzeugliste und ruft auf, was zur Frage passt. Er sieht Schemata, keine Daten – und nie Ihre Zugangsdaten.

tools/list stdio · http

Jeder Weg hinein ist protokolliert und begrenzt. Was Sie nicht anbieten, kann die KI nicht anfassen.

Warum wir

## Wir verkaufen nichts, was wir nicht selbst betreiben.

Drei Belege statt drei Behauptungen – alle drei können Sie auf dieser Seite nachprüfen.

Eigenes Produkt

108.412

### Anker in unserem eigenen MCP-Server

md-recall bringt einen MCP-Server mit, der bei uns täglich läuft. Was im Betrieb wehtut, wissen wir aus eigener Erfahrung – nicht aus einer Präsentation.

[md-recall ansehen](https://mccain-digital.com/v5/md-recall/)

Diese Seite

Live

### Der Chat unten rechts läuft über Werkzeuge

Kein Video, keine Demo-Umgebung: Die Konsole auf dieser Seite beantwortet Fragen aus unserer Wissensbasis. Fragen Sie etwas, das wir nicht wissen – sie sagt es.

Seit 2016

2

### Senior-Gründer, keine Übergaben

Wer das Angebot schreibt, baut es und betreibt es danach. Und sagt ab, wenn ein fertiges Produkt Ihnen besser dient – das kommt regelmäßig vor.

[Studio ansehen](https://mccain-digital.com/v5/studio/)

Sie sprechen direkt mit den beiden, die es bauen.

Christian verantwortet Architektur, Entwicklung und Betrieb, Kathi Design, Marke und Projektführung. Kein Vertrieb, keine Junioren, keine wechselnden Teams – und nach dem Launch dieselben Ansprechpartner.

[Studio & Arbeitsweise](https://mccain-digital.com/v5/studio/)

Fragen

## Was zu MCP gefragt wird.

Fehlt etwas? Die Konsole antwortet, oder schreiben Sie uns.

Welches System zuerst?

Nennen Sie Ihr System – die Konsole sagt, über welchen Weg wir anbinden würden.

Geht das mit unserem SAP?

Was kostet ein MCP-Server?

Darf die KI auch schreiben?

**Was ist MCP eigentlich genau?**

Das Model Context Protocol ist ein offener Standard, über den ein KI-Client – Claude, Cursor, eigene Agenten – Werkzeuge und Datenquellen aufruft. Statt für jedes Modell eine eigene Integration zu bauen, beschreiben Sie Ihre Systeme einmal, und jeder MCP-fähige Client kann sie nutzen.

**Verlassen unsere Daten das Haus?**

Der Server läuft bei Ihnen und spricht direkt mit Ihren Systemen. Ins Modell geht nur, was ein Werkzeug als Antwort zurückgibt – und das begrenzen wir bewusst. Wer ganz ohne externe Modelle arbeiten muss, kombiniert MCP mit offenen Gewichten auf eigener Hardware.

**Wie verhindern Sie, dass die KI Unsinn auslöst?**

Drei Ebenen: Schema-Validierung der Eingaben, Rechte des angemeldeten Nutzers und eine Freigabeschwelle für alles Schreibende oder Teure. Jeder Aufruf steht im Audit-Log, mit Nutzer, Werkzeug und Argumenten.

**Funktioniert das auch mit ChatGPT oder eigenen Agenten?**

Mit jedem Client, der MCP spricht – und für alles andere legen wir dieselben Werkzeuge zusätzlich als HTTP-Schnittstelle mit Function-Calling-Schema aus. Ein Server, mehrere Wege hinein.

Übergabe

## Jedes Projekt geht als Git-Projekt raus.

Vollständiger Quellcode, Dokumentation und Patch Notes gehören zur Lieferung – nicht zum Zusatzpaket. Zusammen mit md-recall steigt Ihr Team sofort ein, statt sich durch fremden Code zu arbeiten.

[md-recall ansehen](https://mccain-digital.com/v5/md-recall/)

git

Ihr Repository, Ihre Historie

Saubere Commits, Branches und Tags – kein ZIP-Archiv am Ende des Projekts.

docs

Dokumentation und Patch Notes

Architektur, Betrieb und jede Änderung nachvollziehbar dokumentiert, Release für Release.

recall

Das Warum liegt bei

md-recall hängt die Begründungen an die Zeile – für Ihr Team und für Ihre KI-Assistenten.

Kontakt

## Erzählen Sie uns von Ihrem Vorhaben.

Eine Antwort innerhalb von 24 Stunden, ein Festpreis innerhalb von 48 – von einer der zwei Personen, die es bauen würden.

[info@mccain-digital.com](mailto:info@mccain-digital.com)

Holderweg 1 · 86869 Oberostendorf · Bayern

Mo–Fr · 9:00–18:00 Uhr (MEZ)

[Schon ein Projekt im Kopf? Im Konfigurator sehen Sie Größenordnung und Dauer sofort – und schicken die Aufstellung direkt an uns.](https://mccain-digital.com/v5/preise/#rechner)

Ihre Angaben werden nur zur Beantwortung Ihrer Anfrage verwendet.
