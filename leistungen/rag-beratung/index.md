# RAG auf Ihren eigenen Daten – mit Quellenangabe, nicht mit Bauchgefühl.

> Retrieval über Ihre Dokumente: hybrider Index, Re-Ranking, Zitate auf Abschnittsebene, Evals in der CI. Proof of Value in 2–4 Wochen.

Quelle: https://mccain-digital.com/leistungen/rag-beratung/
Sprache: de

Technologie · RAG pgvector · Qdrant · Re-Ranking · Evals

Wir bauen Retrieval so, dass jede Antwort belegt ist: Anker in Ihren Dokumenten, Re-Ranking vor dem Modell, Konfidenzpfad statt Erfindung. Und wir messen, ob es besser wird.

Proof of Value anfragen

[Zur Leistung KI](https://mccain-digital.com/leistungen/ki-automatisierung/)

- Antworten zitieren Datei, Abschnitt und Version
- Rechte werden mitgelesen, nicht nachträglich gefiltert
- Self-hostbar bis hin zu offenen Modellen

vereinfachte Auszüge

// retrieve.ts – hybrid, dann re-ranken
const dense = await vectors.search(q, { k: 40, filter: acl(user) });
const sparse = await fts.search(q, { k: 40, filter: acl(user) });

const merged = rrf([dense, sparse]); // Reciprocal Rank Fusion
const top = await reranker.score(q, merged).slice(0, 6);

// Kontextbudget: 6 Treffer, nicht 60
return top.map((t) => ({
 text: t.chunk, source: t.file, section: t.heading,
 version: t.version, score: t.score,
}));

Einsatz

## Wo Retrieval den Unterschied macht.

Vier Fälle, in denen ein Chatfenster nicht reicht, weil die Antwort aus Ihren Unterlagen kommen muss.

01

### Support, der aus dem Handbuch antwortet

Erstlinien-Antworten mit Fundstelle, damit die Kollegin die Auskunft prüfen kann, bevor sie sie weitergibt.

02

### Vertrags- und Aktensuche

Klauseln über hunderte Dokumente hinweg finden – mit Version und Datum, weil die Fassung von 2021 eine andere Antwort gibt.

03

### Wissensassistent über Wiki und Laufwerk

Neue Mitarbeitende fragen das System statt das Team. Mit Rechten: Wer den Ordner nicht sehen darf, bekommt daraus nichts zitiert.

04

### Nicht: Rechnen und Berichten

Summen, Auswertungen und Kennzahlen holt man aus der Datenbank, nicht aus Text. Dafür bauen wir eine Abfrage – und keinen Retrieval-Umweg.

Lieferung

## Was in einem RAG-Projekt entsteht.

Erst ein Proof of Value auf Ihren echten Daten, dann die Härtung. Sie urteilen mit Zahlen, bevor Sie sich festlegen.

2–4 Wo.

bis zum Proof of Value auf Ihren Unterlagen

120

echte Fragen im Eval-Datensatz, nicht drei Beispiele

[Größenordnung im Rechner ansehen](https://mccain-digital.com/preise/#rechner)

Aufbereitung: Chunking, OCR, Tabellen, Metadaten, Versionen

Hybrider Index (pgvector oder Qdrant plus Volltext)

Re-Ranking und gedeckeltes Kontextbudget

Zitate auf Abschnittsebene und Konfidenzpfad

Eval-Datensatz aus Ihren echten Fragen, in der CI

Oberfläche für das Team plus MCP-Zugang für Assistenten

Systemkarte

## Der Weg von der Datei zur belegten Antwort.

Sechs Stationen, an denen Qualität entsteht oder verloren geht. Fahren Sie über die Knoten.

Eingang

### Quellen

SharePoint, Wiki, Ticketsystem, Dateiablage, Datenbank. Angebunden wird, was Sie schon haben – kein zweiter Datentopf.

SharePoint S3 Postgres

Ohne belastbare Quelle gibt es keine Antwort – das ist eine Einstellung, nicht eine Hoffnung.

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

## Was zu RAG gefragt wird.

Fehlt etwas? Die Konsole antwortet, oder schreiben Sie uns.

Proof of Value anfragen

Reicht Retrieval für Ihren Fall?

Beschreiben Sie Ihre Unterlagen in einem Satz – die Konsole schätzt ein, was nötig ist.

Wir haben viele Scans – geht das?

Wie verhindern Sie Halluzinationen?

Was kostet ein Proof of Value?

**Wie viele Dokumente braucht es, damit sich das lohnt?**

Nicht die Menge entscheidet, sondern die Häufigkeit der Fragen. Zwanzig Handbücher, in die täglich jemand schaut, lohnen sich – zehntausend Dateien, die niemand braucht, nicht. Wir schauen zuerst auf die Fragen, dann auf den Bestand.

**Unsere Unterlagen sind Scans und Excel-Chaos.**

Das ist der Normalfall. OCR, Tabellenerkennung und Metadaten sind Teil der Arbeit – und der größte Kostenfaktor. Deshalb prüfen wir im Proof of Value genau daran, ob die Trefferqualität reicht.

**Wie stellen Sie sicher, dass niemand Falsches sieht?**

Die Rechte kommen aus Ihrem Verzeichnis und wirken im Retrieval, nicht als Filter danach. Ein Dokument, das eine Person nicht sehen darf, kommt für sie gar nicht in die Trefferliste – und taucht folglich auch in keinem Zitat auf.

**Was passiert, wenn sich die Dokumente ändern?**

Der Index wird versioniert und inkrementell nachgezogen; ein vollständiger Re-Index ist ein geplanter Job. Antworten nennen die Fassung, aus der sie stammen – das ist bei Verträgen der halbe Wert.

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
