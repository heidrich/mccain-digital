# md-cms

> md-cms verwaltet die Websites, die McCain Digital baut: sichere Anmeldung, Site-Verwaltung und eine automatische Publish-Pipeline. Der Editor folgt.

Quelle: https://mccain-digital.com/md-cms/
Sprache: de

Eigenes Produkt · Im Aufbau v10.0.0-alpha.9

Das CMS für die Websites, die wir bauen.

md-cms verwaltet die Websites, die McCain Digital für Kunden baut: eine Anmeldung, eine Site-Übersicht für Studio und Team, und im Hintergrund eine automatische Kette von Push bis live. Läuft auf demselben Konto wie md-portal – mit eigener Anmeldung je App.

[Zum Login](https://cms.mccain-digital.com/)

ein Konto für CMS und Portal Rollen für Studio und Team keine offene Registrierung

GitHub-Repository → md-cms

 ✓ Webhook geprüft push-Ereignis aktiv
 ✓ Manifest importiert gültiges JSON, Schema ok
 ✓ Site angelegt in "Alle Sites" sichtbar

 Rollen: Studio (voller Zugriff) · Mitglied (zugewiesene Site)

läuft vollständig serverseitig · ohne eigene Bedienoberfläche

10.0.0-alpha.9

aktuelle Fassung, in aktiver Entwicklung

19.9.2026

seit wann md-cms auf dem echten Supabase läuft

1 Konto

für md-cms und md-portal gemeinsam

Wie es funktioniert

## Vom Push bis live, ohne Handarbeit.

Die Kette steht bereits vollständig auf dem Server – vom GitHub-Push bis zur veröffentlichten Seite. Nur die Bedienoberfläche zum Bearbeiten fehlt noch.

01 Repository verbinden GitHub Webhook

02 Job annehmen und bauen Claim · Dispatch · Callback

03 Live oder mit Log zurückmelden Cron · Nachprüfen

### Site meldet sich beim Push

Ein Webhook wird geprüft oder repariert, ein neues Geheimnis erst nach GitHubs Zusage gespeichert. Danach kommt jeder Push automatisch an.

route: /api/v1/webhooks/github/[siteId]
secret: gespeichert erst nach GitHub-Bestätigung
status: aktiv ab dem ersten Push

Funktionen

## Was heute schon läuft.

### Sichere Anmeldung

Login, Passwort-Reset und Einladungen – geprüft bei 1280 und 400 px, ohne Konsolenfehler.

### Site-Übersicht für Studio und Team

„Alle Sites“ für Studio, „Ihre Sites“ für Mitglieder – jede Site mit eigener Adresse und Rolle.

### Site anlegen

Ein Dialog, eine Adresse, sofort sichtbar in der Übersicht.

### Automatische Publish-Pipeline

Push → Webhook → Job → GitHub Action → live, vollständig serverseitig gebaut. Ohne eigene Bedienoberfläche heute nur über die Schnittstelle auslösbar.

### Ein Konto für CMS und Portal

Dieselben Zugangsdaten wie md-portal, im selben Supabase-Projekt – mit einer eigenen Anmeldung je App, nicht einem gemeinsamen Login.

### Einheitliches Design-System

Baut auf demselben @mccain/ui und @mccain/tokens wie md-portal und der md-recall-Dashboard-Optik.

Für unsere eigene Baukette

## Gebaut für die Websites, die wir liefern.

md-cms ist kein CMS von der Stange für beliebige Seiten. Es ist so gebaut, dass es genau zu der Baukette passt, mit der wir Websites entwerfen und ausliefern.

Gehört zur Übergabe eines mit McCain Digital gebauten Website-Projekts

Rollen statt Rätselraten Studio sieht und verwaltet alle Sites, ein Team-Mitglied nur die eigene – serverseitig geprüft, nicht nur in der Oberfläche versteckt.

Dasselbe Konto wie im Portal Wer md-portal nutzt, meldet sich bei md-cms mit denselben Zugangsdaten an – in einer eigenen, getrennten Sitzung je App.

Keine offene Registrierung Zugänge werden vom Studio angelegt, nicht selbst eröffnet – die Registrierung ist bewusst abgeschaltet.

Screens

## So sieht es heute aus.

Drei echte Ansichten aus dem laufenden Code. Klicken oder mit den Pfeiltasten durchgehen – mehr zu zeigen wäre erfunden.

1 / 3

01 · Übersicht

### „Alle Sites“ oder „Ihre Sites“, je nach Rolle

Studio sieht jede Site mit Rolle und Adresse, ein Mitglied nur die eigene. Von hier aus wird eine neue Site angelegt.

Studio Mitglied

Der Editor für Texte, Bilder und SEO ist noch nicht gebaut – sobald er steht, kommen die Screens hier dazu.

Zugang

## Ihr Zugang kommt mit dem Website-Projekt.

md-cms hat keine offene Registrierung. Wer eine Website bei McCain Digital baut oder betreut, bekommt eine Einladung vom Studio – mit denselben Zugangsdaten wie für md-portal.

Fassung 10.0.0-alpha.9 · aktiv in Entwicklung Login unter cms.mccain-digital.com Zugang nur per Einladung

[Zum Login](https://cms.mccain-digital.com/)

Zugang nur per Einladung – kommt mit dem Website-Projekt, nicht über eine offene Registrierung.

Konditionen

Preise für md-cms sind nicht gesondert veröffentlicht. Es ist heute Teil unserer Website-Projekte – sprechen Sie uns an, wenn Sie wissen wollen, was das für Ihr Projekt bedeutet.

Ehrlich gesagt

md-cms läuft seit dem 19.9.2026 auf dem echten Supabase-Projekt. Heute stehen Anmeldung, Site-Verwaltung und eine automatische Publish-Pipeline im Hintergrund. Der Bildschirm zum Bearbeiten von Texten, Bildern, Menü und SEO ist geplant, aber noch nicht gebaut.

Fragen zum Zugang stellen

Als Nächstes

## Was noch kommt.

Seiten bearbeiten — Texte, Bilder, Menü, Sichtbarkeit und Reihenfolge.

Medienbibliothek.

Live-Vorschau direkt im Editor.

Menü-Verwaltung, SEO/Tracking, Übersetzungen.

Versionen und Rückgängig-machen.

Benutzer- und Einladungsverwaltung als eigener Bildschirm.

KI-Anbindung („AI-Bridge“) für z. B. Claude Code.

Freigabe vor dem Veröffentlichen.

Fragen

## Was Interessenten vor md-cms fragen.

md-cms ist jung. Wenn eine Antwort fehlt: die Konsole oben oder schreiben Sie uns direkt.

Die Seite fragen

Fragen Sie, was heute schon geht – die Antwort erscheint im Chat.

Was kann ich mit md-cms heute schon tun?

Brauche ich eine Website von McCain Digital dafür?

Ist der Login derselbe wie im Portal?

**Was kann ich mit md-cms heute schon tun?**

Sich anmelden, Ihre Site oder – als Studio – alle Sites sehen, und eine neue Site anlegen. Im Hintergrund läuft bereits die vollständige Kette von einem GitHub-Push bis zur veröffentlichten Seite. Der Bildschirm zum Bearbeiten von Inhalten ist noch nicht da.

**Brauche ich eine Website von McCain Digital, um md-cms zu nutzen?**

Ja, nach heutigem Stand. md-cms ist für die Websites gebaut, die wir selbst entwerfen und ausliefern, nicht als eigenständiges CMS für eine bestehende Seite gedacht.

**Ist der Login derselbe wie im Portal?**

Die Zugangsdaten sind dieselben – ein Konto im selben Supabase-Projekt. Angemeldet sind Sie trotzdem getrennt: md-cms und md-portal führen jeweils ihre eigene Sitzung, aus Sicherheitsgründen ohne gemeinsames Cookie über beide Adressen hinweg.

**Was kostet md-cms?**

Das ist heute nicht gesondert beziffert. Sprechen Sie uns an, wenn Sie wissen wollen, was es für Ihr Projekt bedeutet.

**Wann kommt der Editor für Texte, Bilder und SEO?**

Er ist geplant und im Bauplan in mehrere Phasen aufgeteilt (Inhalte, Medien, Vorschau, danach Menü und SEO). Ein festes Datum gibt es noch nicht.

**Kommt eine KI-Anbindung?**

Geplant ist eine „AI-Bridge“ über das Model Context Protocol, mit der zum Beispiel Claude Inhalte, Medien und SEO pflegen könnte. Das ist bislang nur entworfen, nicht gebaut.

**Wer sieht was?**

Studio sieht und verwaltet alle Sites. Ein Team-Mitglied sieht nur die ihm zugewiesene Site – serverseitig geprüft, nicht nur in der Oberfläche verborgen.

Kontakt

## Erzählen Sie uns von Ihrem Vorhaben.

Eine Antwort innerhalb von 24 Stunden, ein Festpreis innerhalb von 48 – von einer der zwei Personen, die es bauen würden.

[info@mccain-digital.com](mailto:info@mccain-digital.com)

Holderweg 1 · 86869 Oberostendorf · Bayern

Mo–Fr · 9:00–18:00 Uhr (MEZ)

[Schon ein Projekt im Kopf? Im Konfigurator sehen Sie Größenordnung und Dauer sofort – und schicken die Aufstellung direkt an uns.](https://mccain-digital.com/preise/#rechner)

Ihre Angaben werden nur zur Beantwortung Ihrer Anfrage verwendet.
