# Next.js-Entwicklung für Produkte, die auch bei 10× Last schnell bleiben.

> Next.js mit Server Components, typisierter Datenschicht und Lighthouse-Budget in der CI. Prototyp in 7 Tagen, Code in Ihrem Repository.

Quelle: https://mccain-digital.com/leistungen/nextjs-entwicklung/
Sprache: de

Technologie · Next.js App Router · React 19 · TypeScript

Server Components, typisierte Datenschicht, indizierte Abfragen und ein Lighthouse-Budget in der CI. Wir bauen Next.js so, dass MVP und skalierte App dieselbe Codebasis sind.

[Zur Leistung Web-Apps](https://mccain-digital.com/v5/leistungen/web-apps/)

- Klickbarer Prototyp in 7 Tagen
- Core Web Vitals grün, erzwungen im Build
- Quellcode in Ihrem Repository, kein Lock-in

aus einem laufenden Projekt

// app/auftraege/page.tsx – Server Component, kein Client-JS
export default async function Page({ searchParams }) {
 const { status = "offen", page = "1" } = await searchParams;
 const rows = await listOrders({ status, page: Number(page) });

 return (
 <main>
 <OrderFilter value={status} /> {/* client, 2 kB */}
 <OrderTable rows={rows} /> {/* server-rendered */}
 </main>
 );
}

// Ergebnis: 84 kB JS auf der Seite, LCP 0,9 s

Einsatz

## Wofür wir Next.js nehmen – und wofür nicht.

Next.js ist unser Standard für Produkte mit Anmeldung, Daten und Abrechnung. Für eine reine Marketingseite ist es meist zu viel Maschine.

01

### SaaS mit Abo und Rollen

Auth, Mandantentrennung, Stripe-Abos, Admin-Bereich. Server Components halten die Bundles klein, obwohl die App viel kann.

02

### Plattformen mit Echtzeit-Status

Websockets für Live-Updates, optimistische Aktualisierung im UI, saubere Invalidierung des Caches – ohne dass die Seite bei jeder Änderung neu lädt.

03

### Kundenportale auf Altsystemen

Das Portal ist neu, die Daten kommen aus ERP oder SOAP. Next.js sitzt als typisierte Schicht davor und hält die Altlast vom Frontend fern.

04

### Nicht: die reine Broschürenseite

Fünf statische Seiten brauchen kein React-Framework. Dann bauen wir handgeschrieben und statisch – schneller, günstiger, weniger Wartung.

Lieferung

## Was am Ende bei Ihnen liegt.

Kein Zugriff auf unsere Infrastruktur nötig, keine Lizenz pro Nutzer – das Projekt läuft ohne uns weiter.

7 Tage

bis zum klickbaren Prototyp auf dem echten Stack

6–12 Wo.

typisch bis zum MVP in Produktion

[Größenordnung im Rechner ansehen](https://mccain-digital.com/v5/preise/)

Repository mit Historie, Dokumentation und Patch Notes

Typisierte Datenschicht (Prisma oder Drizzle) auf PostgreSQL

Auth mit Rollen, SSO oder Magic Link – nicht selbst gebastelt

Tests (Vitest, Playwright) und Lighthouse-Budget in der CI

Deployment auf Vercel, Cloudflare oder Ihrem eigenen Server

md-recall mit den Begründungen zu jeder wichtigen Zeile

Systemkarte

## Was in einer Next.js-App zusammenläuft.

Fahren Sie über die Knoten. Rechts steht, was der Baustein leistet – und was er Sie an Ladezeit oder Betrieb kostet.

Auth · SSO

CI · Vitals

Daten

### PostgreSQL

Eine typisierte Datenschicht (Prisma oder Drizzle) mit Migrationen und Indizes, die vor dem ersten Nutzer gesetzt sind – nicht nach der ersten Beschwerde.

Prisma Migrations Indizes

Alles davon liegt am Ende in Ihrem Repository, dokumentiert und ohne Lock-in.

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

## Was zu Next.js gefragt wird.

Fehlt etwas? Die Konsole antwortet, oder schreiben Sie uns.

Passt Next.js zu Ihrem Vorhaben?

Beschreiben Sie es in einem Satz – die Konsole sagt ehrlich, ob es das richtige Werkzeug ist.

Reicht eine statische Seite?

Was kostet ein MVP?

Übernehmen Sie eine bestehende App?

**App Router oder Pages Router?**

Neue Projekte bauen wir im App Router mit Server Components – deutlich kleinere Bundles und einfacheres Daten-Laden. Bestehende Pages-Router-Projekte migrieren wir nur, wenn es einen Grund gibt; ein Rewrite aus Prinzip ist verbranntes Budget.

**Müssen wir auf Vercel hosten?**

Nein. Vercel ist bequem, aber Next.js läuft auch in Docker auf Ihrem Server, bei Hetzner oder in Azure. Wenn Datenresidenz eine Rolle spielt, planen wir das von Anfang an so – ohne Vercel-spezifische Abhängigkeiten.

**Wie bleibt es bei viel Daten schnell?**

Durch Server Components (weniger JS), indizierte Abfragen statt N+1-Schleifen, Streaming der Antwort und Caching auf der richtigen Ebene. Gemessen wird im Build: Ein Budget-Verstoß lässt die Pipeline scheitern.

**Können Sie ein bestehendes Next.js-Projekt übernehmen?**

Ja, und wir fangen nicht mit „neu schreiben“ an: erst lesen, Tests um die kritischen Pfade, dokumentieren – dann reparieren, was wehtut. Ein Rewrite ist eine Entscheidung mit Belegen.

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
