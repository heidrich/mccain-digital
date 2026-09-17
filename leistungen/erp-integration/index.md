# ERP-Integration, die auch das System überlebt, das niemand anfassen will.

> Anbindung an SAP, Business Central, CRM und Altsysteme – über API, OData, SOAP oder Datenbank-Adapter. Idempotent, protokolliert, überwacht.

Quelle: https://mccain-digital.com/leistungen/erp-integration/
Sprache: de

Technologie · Integrationen REST · OData · SOAP · DB-Adapter

SAP, Business Central, Odoo oder eine gewachsene Branchenlösung: Wir binden an, was da ist – über API, wo es eine gibt, sonst über Adapter auf Datenbank oder Export. Idempotent, protokolliert, ohne den laufenden Betrieb zu ändern.

[Zur Leistung Software](https://mccain-digital.com/leistungen/individualsoftware/)

- Kein Eingriff in Ihr ERP – wir lesen und schreiben definiert
- Retries und Idempotenz, damit nichts doppelt bucht
- Cloud oder On-Premise, Quellcode bei Ihnen

gekürzt, Muster aus Projekten

// adapter.ts – ein Vertrag, drei mögliche Wege dahinter
export interface OrderSource {
 find(q: Query): Promise<Order[]>;
 upsert(o: Order): Promise<{ id: string }>;
}

export const source: OrderSource =
 cfg.mode === "odata" ? new ODataAdapter(cfg) // Business Central
: cfg.mode === "soap" ? new SoapAdapter(cfg) // Altsystem
: new SqlAdapter(cfg); // direkt auf der DB

// Die App kennt nur das Interface. Der Weg ist Konfiguration.

Einsatz

## Was wir typischerweise anbinden.

Vier Muster, die fast jedes Projekt enthält – einzeln oder in Kombination.

01

### Aufträge und Belege hinein

Formular, Postfach oder Portal erfasst den Auftrag; die Anbindung schreibt ihn ins ERP – geprüft, ohne Doppelerfassung, mit Protokoll.

02

### Stammdaten und Bestände heraus

Artikel, Preise, Verfügbarkeit für Portal, Shop oder Dashboard – zwischengespeichert, damit das ERP nicht bei jedem Klick antworten muss.

03

### Zwei Systeme abgleichen

CRM und ERP führen dieselben Kunden mit anderen Nummern. Wir bauen die Zuordnung samt Konfliktfall statt einer nächtlichen Excel-Runde.

04

### Berichte, die selbst laufen

Kennzahlen aus dem ERP in eine eigene Datenbank spiegeln, damit Auswertungen schnell sind und das ERP nicht unter Last gerät.

Lieferung

## Was eine Anbindung mitbringt.

Integrationen fallen nicht auf, wenn sie gut sind – deshalb gehört Überwachung von Anfang an dazu.

3–6 Tage

für ein System mit dokumentierter API

5–10 Tage

für ein Altsystem ohne Schnittstelle

[Größenordnung im Rechner ansehen](https://mccain-digital.com/preise/#rechner)

Adapter hinter einem klaren Interface – der Weg ist austauschbar

Idempotenz, Retries und eine Dead-Letter-Warteschlange

Feldzuordnung dokumentiert, inklusive Sonderfälle

Überwachung mit Alarm auf Mail und Chat

Testumgebung gegen Ihre Testinstanz, nicht gegen Produktion

Übergabe als Git-Projekt mit Dokumentation und Patch Notes

Systemkarte

## Wie zwei Welten zusammenkommen.

Die Anbindung sitzt in der Mitte und hält beide Seiten sauber. Fahren Sie über die Knoten.

SAP · BC

Kernsystem

### SAP · BC

OData, REST oder RFC. Schreibend in Absprache mit Ihrem ERP-Partner, mit Spezifikation, die er prüfen kann.

OData RFC

Nichts davon greift in Ihr ERP ein. Wir lesen und schreiben auf definierten Wegen – oder gar nicht.

Warum wir

## Wir verkaufen nichts, was wir nicht selbst betreiben.

Drei Belege statt drei Behauptungen – alle drei können Sie auf dieser Seite nachprüfen.

Eigenes Produkt

108.412

### Anker in unserem eigenen MCP-Server

md-recall bringt einen MCP-Server mit, der bei uns täglich läuft. Was im Betrieb wehtut, wissen wir aus eigener Erfahrung – nicht aus einer Präsentation.

[md-recall ansehen](https://mccain-digital.com/md-recall/)

Diese Seite

Live

### Der Chat unten rechts läuft über Werkzeuge

Kein Video, keine Demo-Umgebung: Die Konsole auf dieser Seite beantwortet Fragen aus unserer Wissensbasis. Fragen Sie etwas, das wir nicht wissen – sie sagt es.

Seit 2016

2

### Senior-Gründer, keine Übergaben

Wer das Angebot schreibt, baut es und betreibt es danach. Und sagt ab, wenn ein fertiges Produkt Ihnen besser dient – das kommt regelmäßig vor.

[Studio ansehen](https://mccain-digital.com/studio/)

Sie sprechen direkt mit den beiden, die es bauen.

Christian verantwortet Architektur, Entwicklung und Betrieb, Kathi Design, Marke und Projektführung. Kein Vertrieb, keine Junioren, keine wechselnden Teams – und nach dem Launch dieselben Ansprechpartner.

[Studio & Arbeitsweise](https://mccain-digital.com/studio/)

Fragen

## Was IT-Verantwortliche fragen.

Fehlt etwas? Die Konsole antwortet, oder schreiben Sie uns.

Welches System soll sprechen?

Nennen Sie System und Aufgabe – die Konsole sagt, welcher Weg realistisch ist.

SAP ohne API – geht das?

Wie lange dauert eine Anbindung?

**Unser ERP hat keine brauchbare Schnittstelle.**

Dann bauen wir den Adapter: lesend direkt auf der Datenbank, über einen bestehenden Export oder – im härtesten Fall – über eine definierte Zwischentabelle, die Ihr Dienstleister füllt. Schreibend nur auf Wegen, die Ihr ERP-Partner freigibt.

**Was passiert, wenn das ERP kurz nicht erreichbar ist?**

Nichts geht verloren. Aufträge landen in einer Warteschlange, Wiederholungen laufen mit exponentiellem Abstand, und was endgültig scheitert, liegt in der Dead-Letter-Queue mit Fehlergrund – plus Alarm, bevor jemand anruft.

**Müssen wir unseren ERP-Dienstleister einbeziehen?**

Für lesende Zugriffe meist nicht, für schreibende fast immer – und das ist gut so. Wir liefern die Spezifikation, die Ihr Dienstleister prüfen kann, statt am System vorbei zu arbeiten.

**Wie testen Sie, ohne den Betrieb zu stören?**

Gegen Ihre Testinstanz, mit anonymisierten Daten und klar getrennten Zugängen. Erst wenn die Zuordnung samt Sonderfällen dort stimmt, gehen wir mit einem begrenzten Datenbereich in Produktion.

Übergabe

## Jedes Projekt geht als Git-Projekt raus.

Vollständiger Quellcode, Dokumentation und Patch Notes gehören zur Lieferung – nicht zum Zusatzpaket. Zusammen mit md-recall steigt Ihr Team sofort ein, statt sich durch fremden Code zu arbeiten.

[md-recall ansehen](https://mccain-digital.com/md-recall/)

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

[Schon ein Projekt im Kopf? Im Konfigurator sehen Sie Größenordnung und Dauer sofort – und schicken die Aufstellung direkt an uns.](https://mccain-digital.com/preise/#rechner)

Ihre Angaben werden nur zur Beantwortung Ihrer Anfrage verwendet.
