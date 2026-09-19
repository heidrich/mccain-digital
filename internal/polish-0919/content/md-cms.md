# Content-Entwurf /md-cms/ — DE + EN

Stand 19.9.2026. Recherche+Text: siehe Anhang „Quellen" für jede Tatsachenbehauptung.
Struktur spiegelt `mccain-design-system/McCain Digital md-recall.dc.html` (die einzige
Vorlage, keine andere Seite wurde als Struktur-Vorbild genommen). Section-IDs in
Klammern sind die von md-recall (`#inhalt`, `#funktion`, …), damit sich das hier
direkt in ein geklontes Artboard übertragen lässt.

**Wichtigster Befund vor dem Lesen:** md-cms ist heute Anmeldung + Site-Verwaltung
+ eine fertige, aber unsichtbare Publish-Pipeline. Der Editor (Texte, Bilder, Menü,
SEO) — das, was man landläufig unter „CMS" versteht — existiert nicht als Bildschirm,
nur als Plan. Die Seite ist deshalb bewusst als „im Aufbau" geschrieben, nicht als
fertiges Produkt. Siehe offene Frage 1, ob das so gewünscht ist oder ob die Seite
warten soll, bis der Editor steht.

---

## Meta

| Feld | DE | EN |
|---|---|---|
| SEO-Title (≤60) | `md-cms · Das CMS für Websites, die wir bauen` (44) | `md-cms · The CMS for the sites we build` (39) |
| Meta-Description (≤155) | `md-cms verwaltet die Websites, die McCain Digital baut: sichere Anmeldung, Site-Verwaltung und eine automatische Publish-Pipeline. Der Editor folgt.` (148) | `md-cms runs the websites McCain Digital builds: secure sign-in, site management and an automatic publish pipeline. The editor comes next.` (137) |
| Breadcrumb-Label | `md-cms` (mid-Ebene wie bei md-recall: „Produkte") | `md-cms` (mid: „Products") |
| Menü-Einzeiler „Software"-Mega-Menü (≤60) | `Unser CMS für Websites, die wir bauen – im Aufbau` (49) | `Our CMS for the sites we build — early build` (44) |
| Login-Dropdown-Einzeiler (≤45) | `Ihre Website verwalten` (22) | `Manage your website` (19) |

Platzierung des Menü-Einzeilers ist eine Annahme — siehe offene Frage 5. Es gibt
aktuell keine „Software"-Mega-Menü-Sektion auf der Site; die vier Leistungs-Kacheln
(KI, Web-Apps, Websites, Software für Unternehmen) heißen im Code „Leistungen", und
md-recall selbst sitzt separat im „Ressourcen"- und „Arbeiten"-Menü mit eigenem
`menu`-Feld (`CASES[].menu`, z. B. `'KI-natives Projektgedächtnis – live, self-hosted'`).
Der Einzeiler oben ist in genau diesem Format/dieser Länge geschrieben, damit er in
jede der drei Stellen passt, sobald der Owner entscheidet, wohin.

---

## hero (`#inhalt`)

md-recall-Felder: `eyebrow`, `version`, `tagline`, `lead`, `cta1`, `cta2`, `meta[3]`,
Terminal-Mockup (`term`), Stats-Reihe (`stats[3]`).

**eyebrow**
DE: `Eigenes Produkt · Im Aufbau`
EN: `Our own product · In progress`

**version** (echte Paket-Version, `apps/cms/package.json`)
`v10.0.0-alpha.9`

**tagline** (H1-Unterzeile)
DE: `Das CMS für die Websites, die wir bauen.`
EN: `The CMS for the sites we build.`

**lead**
DE: `md-cms verwaltet die Websites, die McCain Digital für Kunden baut: eine Anmeldung, eine Site-Übersicht für Studio und Team, und im Hintergrund eine automatische Kette von Push bis live. Läuft auf demselben Konto wie md-portal — mit eigener Anmeldung je App.`
EN: `md-cms runs the websites McCain Digital builds for clients: one sign-in, one site overview for studio and team, and behind it an automatic chain from push to live. Runs on the same account as md-portal — with its own sign-in per app.`

**cta1 / cta2**
DE: `Website-Projekt anfragen` / `So funktioniert die Anbindung`
EN: `Ask about a website project` / `See how the pipeline works`
(cta1 führt zu Kontakt, da es aktuell keine eigenständige Buchung/Registrierung für
md-cms gibt — Zugang kommt über ein Website-Projekt, siehe FAQ.)

**meta (3 Zeilen unter den CTAs)**
DE: `ein Konto für CMS und Portal` · `Rollen für Studio und Team` · `keine offene Registrierung`
EN: `one account for CMS and portal` · `roles for studio and team` · `no open sign-up`

**Terminal-Mockup** (ersetzt md-recalls CLI-Setup-Demo; md-cms hat keine CLI — gezeigt
wird stattdessen, was beim Veröffentlichen tatsächlich im Hintergrund passiert, Tabs
wie bei md-recall):

Tabs: `Verbinden` / `Veröffentlichen` / `Prüfen`
DE Tabs: `Verbinden` / `Veröffentlichen` / `Prüfen`
EN Tabs: `Connect` / `Publish` / `Check`

Code-Block 1 (Verbinden):
```
GitHub-Repository → md-cms

  ✓ Webhook geprüft        push-Ereignis aktiv
  ✓ Manifest importiert    gültiges JSON, Schema ok
  ✓ Site angelegt          in "Alle Sites" sichtbar

  Rollen: Studio (voller Zugriff) · Mitglied (zugewiesene Site)
```
EN:
```
GitHub repository → md-cms

  ✓ webhook checked       push event active
  ✓ manifest imported     valid JSON, schema ok
  ✓ site created          visible under "All sites"

  roles: studio (full access) · member (assigned site)
```

Code-Block 2 (Veröffentlichen):
```
Push auf main
  → Webhook → Job angenommen → Build angestoßen
  → GitHub Action baut & stellt bereit
  → Callback: live

  Bei Fehler: Callback "failed" mit den letzten 200 Log-Zeilen
```
EN:
```
Push to main
  → webhook → job claimed → build dispatched
  → GitHub Action builds & deploys
  → callback: live

  On failure: callback "failed" with the last 200 log lines
```

Code-Block 3 (Prüfen):
```
"Verbindung prüfen"
  ✓ Repository erreichbar
  ✓ Manifest vorhanden und gültig
  ✓ Webhook aktiv (push)

  Ein Cron-Lauf prüft offene Jobs automatisch nach.
```
EN:
```
"Check connection"
  ✓ repository reachable
  ✓ manifest present and valid
  ✓ webhook active (push)

  A cron job automatically re-checks open jobs.
```

**stats (3, echte Zahlen/Daten statt erfundener Kennzahlen)**
DE:
1. `10.0.0-alpha.9` — aktuelle Fassung, in aktiver Entwicklung
2. `19.9.2026` — seit wann md-cms auf dem echten Supabase läuft
3. `1 Konto` — für md-cms und md-portal gemeinsam
EN:
1. `10.0.0-alpha.9` — current version, in active development
2. `19.9.2026` — since when md-cms runs on the real Supabase project
3. `1 account` — shared by md-cms and md-portal

---

## how (`#funktion`, „Wie es funktioniert")

Zeigt die tatsächlich fertig gebaute Publish-Kette (Server-seitig komplett, ohne
Bedienoberfläche) — ehrlicher Kern-Inhalt für diese Sektion, weil es die einzige
Ende-zu-Ende-Funktion ist, die heute wirklich läuft.

**eyebrow / title / desc**
DE: `Wie es funktioniert` / `Vom Push bis live, ohne Handarbeit.` / `Die Kette steht bereits vollständig auf dem Server — vom GitHub-Push bis zur veröffentlichten Seite. Nur die Bedienoberfläche zum Bearbeiten fehlt noch.`
EN: `How it works` / `From push to live, no manual step.` / `The chain already stands complete on the server — from the GitHub push to the published page. Only the editing screen is still missing.`

**steps (3)**

1. DE: `01` · `Repository verbinden` · `GitHub Webhook` · `Site meldet sich beim Push` · `Ein Webhook wird geprüft oder repariert, ein neues Geheimnis erst nach GitHubs Zusage gespeichert. Danach kommt jeder Push automatisch an.`
   EN: `01` · `Connect the repository` · `GitHub webhook` · `The site hears every push` · `A webhook is checked or repaired, a new secret stored only after GitHub confirms it. From then on every push arrives automatically.`
2. DE: `02` · `Job annehmen und bauen` · `Claim · Dispatch · Callback` · `Der Server übernimmt den Job` · `Der Job wird beansprucht, der Stand heruntergeladen, die GitHub Action angestoßen. Bei einem Serverfehler wiederholt der Callback automatisch, nie bei einem Anwenderfehler.`
   EN: `02` · `Claim the job and build` · `Claim · dispatch · callback` · `The server takes the job` · `The job is claimed, the current state downloaded, the GitHub Action triggered. On a server error the callback retries automatically, never on a client error.`
3. DE: `03` · `Live oder mit Log zurückmelden` · `Cron · Nachprüfen` · `Nichts bleibt unbemerkt hängen` · `Ein Cron-Lauf prüft offene Jobs automatisch nach. Bei einem Fehler kommen die letzten 200 Log-Zeilen zurück — verschlüsselte Werte nie in einer Fehlermeldung.`
   EN: `03` · `Report back live or with a log` · `Cron · re-check` · `Nothing is left hanging unnoticed` · `A cron job automatically re-checks open jobs. On failure, the last 200 log lines come back — secrets never appear in an error message.`

---

## feat (`#funktionen`, „Funktionen") — NUR LIVE

md-recall hat 6 Karten; hier bewusst nur, was heute im Code auf `main` existiert.

1. DE: `Sichere Anmeldung` — `Login, Passwort-Reset und Einladungen — geprüft bei 1280 und 400 px, ohne Konsolenfehler.`
   EN: `Secure sign-in` — `Login, password reset and invitations — checked at 1280 and 400 px, no console errors.`
2. DE: `Site-Übersicht für Studio und Team` — `„Alle Sites" für Studio, „Ihre Sites" für Mitglieder — jede Site mit eigener Adresse und Rolle.`
   EN: `Site overview for studio and team` — `"All sites" for the studio, "Your sites" for members — each site with its own address and role.`
3. DE: `Site anlegen` — `Ein Dialog, eine Adresse, sofort sichtbar in der Übersicht.`
   EN: `Create a site` — `One dialog, one address, visible in the overview at once.`
4. DE: `Automatische Publish-Pipeline` — `Push → Webhook → Job → GitHub Action → live, vollständig serverseitig gebaut. Ohne eigene Bedienoberfläche noch nur über die Schnittstelle auslösbar.`
   EN: `Automatic publish pipeline` — `Push → webhook → job → GitHub Action → live, built fully server-side. Without its own screen yet, triggered through the API today.`
5. DE: `Ein Konto für CMS und Portal` — `Dieselben Zugangsdaten wie md-portal, im selben Supabase-Projekt — mit einer eigenen Anmeldung je App, nicht einem gemeinsamen Login.`
   EN: `One account for CMS and portal` — `The same credentials as md-portal, in the same Supabase project — with its own sign-in per app, not one shared login.`
6. DE: `Einheitliches Design-System` — `Baut auf demselben `@mccain/ui`/`@mccain/tokens` wie md-portal und der md-recall-Dashboard-Optik.`
   EN: `One shared design system` — `Built on the same @mccain/ui / @mccain/tokens as md-portal and the md-recall dashboard look.`

---

## proj (`#projekte`, „In jedem Projekt dabei" — angepasst zu „Für Websites, die wir bauen")

md-recall nutzt diesen Block, um zu zeigen, dass es Teil jeder Übergabe ist. Für
md-cms ist die Entsprechung: es ist für die Websites gebaut, die McCain Digital
selbst baut — nicht als eigenständiges Produkt für fremde Seiten (Quelle: Design-Dok
Zeile 3 + explizite Nicht-Ziele-Liste). Das ist eine bewusste Grenze, kein Nachteil,
und sollte so stehen bleiben, bis der Owner das ändert.

**eyebrow / title / desc**
DE: `Für unsere eigene Baukette` / `Gebaut für die Websites, die wir liefern.` / `md-cms ist kein CMS von der Stange für beliebige Seiten. Es ist so gebaut, dass es genau zu der Baukette passt, mit der wir Websites entwerfen und ausliefern.`
EN: `Built for our own pipeline` / `Built for the websites we deliver.` / `md-cms is not an off-the-shelf CMS for any site. It is built to match exactly the pipeline we use to design and ship websites.`

**cta / badge**
DE: `Website-Projekt anfragen` · `Gehört zur Übergabe eines mit McCain Digital gebauten Websites-Projekts` *(Formulierung bewusst ohne Preisaussage — siehe offene Frage 2)*
EN: `Ask about a website project` · `Comes with the hand-over of a website project built by McCain Digital`

**points (3)**
1. DE: `Rollen statt Rätselraten` — `Studio sieht und verwaltet alle Sites, ein Team-Mitglied nur die eigene — serverseitig geprüft, nicht nur in der Oberfläche versteckt.`
   EN: `Roles, not guesswork` — `The studio sees and manages every site, a team member only their own — checked server-side, not just hidden in the UI.`
2. DE: `Dasselbe Konto wie im Portal` — `Wer md-portal nutzt, meldet sich bei md-cms mit denselben Zugangsdaten an — in einer eigenen, getrennten Sitzung je App.`
   EN: `The same account as the portal` — `Anyone using md-portal signs in to md-cms with the same credentials — in its own, separate session per app.`
3. DE: `Keine offene Registrierung` — `Zugänge werden vom Studio angelegt, nicht selbst eröffnet — die Registrierung ist bewusst abgeschaltet.`
   EN: `No open sign-up` — `Access is created by the studio, not self-served — registration is deliberately switched off.`

---

## sh / screens (`#screens`) — nur real existierende Bildschirme

md-recall zeigt 10 Screens. md-cms hat heute genau drei echte, produktive
Bildschirme im Code — mehr zu zeigen wäre erfunden. Sobald der Editor steht, wächst
diese Liste; bis dahin lieber ehrlich kurz.

1. **Route:** `/` (Sites-Übersicht)
   DE: Tag `Übersicht` · `„Alle Sites" oder „Ihre Sites", je nach Rolle` · `Studio sieht jede Site mit Rolle und Adresse, ein Mitglied nur die eigene. Von hier aus wird eine neue Site angelegt.` · Chips: `Studio`, `Mitglied`
   EN: Tag `Overview` · `"All sites" or "your sites", by role` · `The studio sees every site with its role and address, a member only their own. A new site is created from here.` · Chips: `Studio`, `Member`
2. **Route:** `/anmelden`
   DE: Tag `Anmeldung` · `Eine Karte, ein Logo, vier Formulare` · `Anmelden, Passwort vergessen, Passwort setzen und Einladung annehmen laufen alle auf denselben Bausteinen — Feld, Eingabe, Knopf mit Ladezustand.` · Chips: `@mccain/ui`, `1280 · 400 px geprüft`
   EN: Tag `Sign-in` · `One card, one logo, four forms` · `Sign-in, forgot password, set password and accept invitation all run on the same building blocks — field, input, button with a loading state.` · Chips: `@mccain/ui`, `checked at 1280 · 400 px`
3. **Route:** `/` → Dialog „Site anlegen"
   DE: Tag `Dialog` · `Eine Site in einem Schritt` · `Name und Adresse, dann sofort in der Übersicht sichtbar. Die Regeln für gültige Adressen liegen in einer eigenen Datei, nicht verstreut im Formular.` · Chips: `Dialog`, `sofort sichtbar`
   EN: Tag `Dialog` · `One site in one step` · `Name and address, then visible in the overview at once. The rules for a valid address live in one file, not scattered across the form.` · Chips: `dialog`, `visible at once`

Hinweis für die Sektion (`note`-Feld wie bei md-recall):
DE: `Der Editor für Texte, Bilder und SEO ist noch nicht gebaut — sobald er steht, kommen die Screens hier dazu.`
EN: `The editor for text, images and SEO is not built yet — once it exists, its screens join this list.`

---

## dl / „Zugang" (`#download` → umbenannt, kein Download-Produkt)

md-recall lädt man herunter; md-cms meldet man sich an. Der Abschnitt übernimmt
Struktur (Eyebrow/Titel/Text, Status-Zeile, Lizenz-Kasten, „ehrlich gesagt"-Kasten),
aber keinen Download-Button.

**eyebrow / title / desc**
DE: `Zugang` / `Ihr Zugang kommt mit dem Website-Projekt.` / `md-cms hat keine offene Registrierung. Wer eine Website bei McCain Digital baut oder betreut, bekommt eine Einladung vom Studio — mit denselben Zugangsdaten wie für md-portal.`
EN: `Access` / `Your access comes with the website project.` / `md-cms has no open sign-up. Anyone building or running a website with McCain Digital gets an invitation from the studio — with the same credentials used for md-portal.`

**Status-Zeile** (statt `release`-Reihe)
DE: `Fassung 10.0.0-alpha.9 · aktiv in Entwicklung` / `Login unter cms.mccain-digital.com` / `Zugang nur per Einladung`
EN: `Version 10.0.0-alpha.9 · in active development` / `Sign in at cms.mccain-digital.com` / `Access by invitation only`

**Lizenz/Kosten-Kasten**
DE: `Konditionen` — `Preise für md-cms sind nicht gesondert veröffentlicht. Es ist heute Teil unserer Website-Projekte — sprechen Sie uns an, wenn Sie wissen wollen, was das für Ihr Projekt bedeutet.` *(Preisfrage ungeklärt — offene Frage 2)*
EN: `Terms` — `Pricing for md-cms is not published separately. Today it is part of our website projects — talk to us if you want to know what that means for your project.`

**„Ehrlich gesagt"-Kasten** (wie md-recalls Beta-Kasten)
DE: `Ehrlich gesagt` — `md-cms läuft seit dem 19.9.2026 auf dem echten Supabase-Projekt. Heute stehen Anmeldung, Site-Verwaltung und eine automatische Publish-Pipeline im Hintergrund. Der Bildschirm zum Bearbeiten von Texten, Bildern, Menü und SEO ist geplant, aber noch nicht gebaut.`
EN: `Honestly` — `md-cms has run on the real Supabase project since 19 Sep 2026. Today, sign-in, site management and an automatic publish pipeline behind the scenes are live. The screen for editing text, images, menu and SEO is planned but not built yet.`

---

## „mcp"-Sektion (`#mcp`, KI-Anbindung) — bewusst NICHT übernommen

md-recalls `#mcp`-Abschnitt bewirbt eine live MCP-Anbindung. Für md-cms ist die
„AI-Bridge" (MCP-Server, mit dem z. B. Claude Code Inhalte, Medien und SEO über
Sprache pflegen könnte) nur im Design-Dokument beschrieben (Phase 6 im Bauplan),
kein Code existiert dafür. Eine eigene Marketing-Sektion für eine ungebaute
KI-Funktion würde gegen „nichts auf dieser Seite ist erfunden" verstoßen. Die
AI-Bridge steht deshalb nur im „Als Nächstes"-Block unten, nicht als Hero-Sektion.

---

## ask (in FAQ eingebettete Konsole)

**title / desc**
DE: `Die Seite fragen` / `Fragen Sie, was heute schon geht — die Antwort erscheint im Chat.`
EN: `Ask the site` / `Ask what already works today — the answer appears in the chat.`

**chips**
DE: `Was kann ich mit md-cms heute schon tun?` · `Brauche ich eine Website von McCain Digital dafür?` · `Ist der Login derselbe wie im Portal?`
EN: `What can I already do with md-cms?` · `Do I need a McCain Digital website for it?` · `Is the login the same as the portal?`

---

## faq (`#faq`)

**eyebrow / title / desc**
DE: `Fragen` / `Was Interessenten vor md-cms fragen.` / `md-cms ist jung. Wenn eine Antwort fehlt: die Konsole oben oder schreiben Sie uns direkt.`
EN: `Questions` / `What people ask before md-cms.` / `md-cms is young. If an answer is missing: the console above, or write to us directly.`

**items (7)**

1. DE: `Was kann ich mit md-cms heute schon tun?` — `Sich anmelden, Ihre Site oder — als Studio — alle Sites sehen, und eine neue Site anlegen. Im Hintergrund läuft bereits die vollständige Kette von einem GitHub-Push bis zur veröffentlichten Seite. Der Bildschirm zum Bearbeiten von Inhalten ist noch nicht da.`
   EN: `What can I already do with md-cms?` — `Sign in, see your site or — as the studio — every site, and create a new one. Behind the scenes the full chain from a GitHub push to the published page already runs. The screen for editing content is not there yet.`
2. DE: `Brauche ich eine Website von McCain Digital, um md-cms zu nutzen?` — `Ja, nach heutigem Stand. md-cms ist für die Websites gebaut, die wir selbst entwerfen und ausliefern, nicht als eigenständiges CMS für eine bestehende Seite gedacht.`
   EN: `Do I need a McCain Digital website to use md-cms?` — `Yes, as things stand. md-cms is built for the websites we design and ship ourselves, not as a standalone CMS for an existing site.`
3. DE: `Ist der Login derselbe wie im Portal?` — `Die Zugangsdaten sind dieselben — ein Konto im selben Supabase-Projekt. Angemeldet sind Sie trotzdem getrennt: md-cms und md-portal führen jeweils ihre eigene Sitzung, aus Sicherheitsgründen ohne gemeinsames Cookie über beide Adressen hinweg.`
   EN: `Is the login the same as the portal?` — `The credentials are the same — one account in the same Supabase project. You are still signed in separately: md-cms and md-portal each run their own session, for security reasons without a shared cookie across both addresses.`
4. DE: `Was kostet md-cms?` — `Das ist heute nicht gesondert beziffert. Sprechen Sie uns an, wenn Sie wissen wollen, was es für Ihr Projekt bedeutet.`
   EN: `What does md-cms cost?` — `That is not separately priced today. Talk to us if you want to know what it means for your project.`
5. DE: `Wann kommt der Editor für Texte, Bilder und SEO?` — `Er ist geplant und im Bauplan in mehrere Phasen aufgeteilt (Inhalte, Medien, Vorschau, danach Menü und SEO). Ein festes Datum gibt es noch nicht.`
   EN: `When does the editor for text, images and SEO arrive?` — `It is planned and split into several phases in the build plan (content, media, preview, then menu and SEO). There is no fixed date yet.`
6. DE: `Kommt eine KI-Anbindung?` — `Geplant ist eine „AI-Bridge" über das Model Context Protocol, mit der zum Beispiel Claude Inhalte, Medien und SEO pflegen könnte. Das ist bislang nur entworfen, nicht gebaut.`
   EN: `Is an AI integration coming?` — `An "AI bridge" over the Model Context Protocol is planned, so that, for example, Claude could manage content, media and SEO. So far this is only designed, not built.`
7. DE: `Wer sieht was?` — `Studio sieht und verwaltet alle Sites. Ein Team-Mitglied sieht nur die ihm zugewiesene Site — serverseitig geprüft, nicht nur in der Oberfläche verborgen.`
   EN: `Who sees what?` — `The studio sees and manages every site. A team member sees only the site assigned to them — checked server-side, not just hidden in the interface.`

---

## Als Nächstes (GEPLANT — bewusst nicht in „Funktionen")

DE eyebrow/title: `Als Nächstes` / `Was noch kommt.`
EN: `Coming next` / `What is still coming.`

- DE: `Seiten bearbeiten` — Texte, Bilder, Menü, Sichtbarkeit und Reihenfolge. *(Design-Dok §1, Bauplan Phase 2)*
  EN: `Edit pages` — text, images, menu, visibility and order.
- DE: `Medienbibliothek` *(Bauplan Phase 3)*
  EN: `Media library`
- DE: `Live-Vorschau direkt im Editor` *(Design-Dok §4.2, Bauplan Phase 2.5)*
  EN: `Live preview inside the editor`
- DE: `Menü-Verwaltung, SEO/Tracking, Übersetzungen` *(Bauplan Phase 4)*
  EN: `Menu management, SEO/tracking, translations`
- DE: `Versionen und Rückgängig-machen` *(Design-Dok §7.3, Bauplan Phase 2.3/5.3)*
  EN: `Versions and undo`
- DE: `Benutzer- und Einladungsverwaltung als eigener Bildschirm` *(HANDOFF.md: nächster geplanter Schritt)*
  EN: `A dedicated screen for users and invitations`
- DE: `KI-Anbindung („AI-Bridge") für z. B. Claude Code` *(Design-Dok §4.4, Bauplan Phase 6)*
  EN: `AI integration ("AI bridge") for e.g. Claude Code`
- DE: `Freigabe vor dem Veröffentlichen` *(als Einstellungsfeld vorgesehen, keine Oberfläche)*
  EN: `Approval before publishing`

---

## contact (`#contact`)

Gemeinsame, seitenweite Komponente (`t.contact`) — für jede Seite identisch, hier
nicht neu getextet. Kein Handlungsbedarf.

---

## Anhang: Quellen

| Behauptung | Quelle |
|---|---|
| md-cms = CMS für Websites, die McCain Digital baut, nicht eigenständig | `mccain-cms/docs/plans/2026-09-18-md-cms-design.md` Zeile 3; Nicht-Ziele-Liste Zeile 28-30 |
| Login/Passwort-Reset/Einladung live, geprüft 1280/400px | `mccain-cms/apps/cms/src/app/(auth)/*`; `mccain-cms/CHANGELOG.md` (Eintrag „McCain brand, sign-in pages…", Z. ~144-150) |
| Sites-Übersicht „Alle Sites"/„Ihre Sites", Site anlegen | `mccain-cms/apps/cms/src/app/(app)/page.tsx`; `mccain-cms/CHANGELOG.md` Z. ~105-129; `mccain-cms/HANDOFF.md` Top-Block |
| Nur eine `page.tsx` unter `(app)/` — kein Editor, keine Medien, keine SEO-Seite | Verzeichnis-Scan `apps/cms/src/app/(app)/` (einziger Treffer: `page.tsx`) |
| Publish-Pipeline (Webhook, Job-Claim, Dispatch, Callback, Cron) vollständig serverseitig | `mccain-cms/apps/cms/src/app/api/v1/webhooks/github/[siteId]/route.ts`; `.../api/v1/jobs/[jobId]/claim`, `.../callback`; `.../api/cron/jobs`; `mccain-cms/HANDOFF.md`: „Die Kette steht auf der Server-Seite … Es fehlen: die Oberflächen; der Anwender-Schritt" |
| Ein Konto, getrennte Sitzungen (kein SSO) für CMS+Portal | `mccain-cms/docs/plans/2026-09-18-portal-schnittstellen.md` Z. 12-13; `2026-09-18-portal-design.md` Z. 25 |
| Registrierung abgeschaltet, Zugang nur per Einladung | `mccain-cms/HANDOFF.md` Top-Block: „Auth-URLs gesetzt, Registrierung aus" |
| Logo: `apps/cms/public/brand/mark.svg`, `components/brand.tsx` → `BrandLockup` aus `@mccain/ui/logo`, Quelle `mccain-digital/brand/mccain-mark-free-color.svg` | `mccain-cms` Commit `ef94c94`; `mccain-cms/HANDOFF.md` Abschnitt „Marke, Anmeldeseiten, Favicon"; `mccain-cms/docs/plans/2026-09-18-md-cms-design.md` Z. 289 (Marke als „Zwischenlösung", finale Marke von „Kathi" steht noch aus) |
| Version `10.0.0-alpha.9` | `mccain-cms/apps/cms/package.json` |
| Live seit 19.9.2026 auf echtem Supabase | `mccain-cms/HANDOFF.md` Top-Block: „Umzug ins echte Supabase (19.9., 11 Uhr, Owner-Freigabe)" |
| Editor/Medien/SEO/Menü/Versionen/AI-Bridge = GEPLANT, kein Code | `mccain-cms/docs/plans/2026-09-18-md-cms-build-plan.md` (Phasen 2-6); Verzeichnis-Scan ergab keine Routen `inhalte`, `medien`, `menue`, `seo`, `versionen`, `ai-bridge`, `benutzer` unter `apps/cms/src/app/(app)/`; keine Treffer für `mcp`/`ai-bridge` im Quellcode |
| Keine Preisangabe irgendwo im Repo | Durchsuchung aller `docs/plans/*`, `HANDOFF.md`, `CHANGELOG.md` — kein Preis, keine Zahl, kein Lizenzmodell gefunden |
| md-recall-Seitenstruktur (Sektionen, Reihenfolge, Feldnamen) | `mccain-digital/mccain-design-system/McCain Digital md-recall.dc.html` Zeilen 311-574 (Sektionen `#inhalt`…`#faq`), `PG`-Objekt Zeilen 1086-1206 |
| Tonalität/Format-Vorbild (Sie-Form, Menü-Einzeiler-Länge, Preis-Meta-Muster) | `mccain-digital/mccain-design-system/McCain Digital Websites.dc.html` Zeilen 1032-1051 (SERVICES), Zeile 951 (nav-Labels) |

---

## Offene Fragen für den Owner

1. **Soll diese Seite jetzt live gehen, obwohl der Editor fehlt?** Der ehrliche
   Kern von md-cms ist heute „Anmeldung + Site-Liste + unsichtbare Pipeline". Das
   ist wenig für eine Produktseite. Alternative: warten, bis mindestens der
   Seiten-Editor steht, und bis dahin nur intern/als „Coming soon" zeigen.
2. **Preis/Konditionen:** nirgends im Repo dokumentiert. Ist md-cms automatisch
   Teil jedes Website-Projekts (ohne Aufpreis), ein Zusatzpaket, oder noch nicht
   entschieden? Die Formulierungen oben vermeiden bewusst jede Preisaussage.
3. **Eigenständige Nutzung:** Der Design-Doc schließt es explizit aus, dass md-cms
   für eine nicht von McCain Digital gebaute Seite läuft. Bleibt das so, oder ist
   eine spätere Öffnung angedacht? (Beeinflusst FAQ-Antwort 2 und den `proj`-Block.)
4. **„AI-Bridge"-Zeitplan:** Phase 6 im Bauplan, kein Datum. Soll sie überhaupt
   schon in der Als-Nächstes-Liste stehen, oder ist das zu weit weg, um es jetzt
   zu bewerben?
5. **Mega-Menü-Platzierung:** Wo soll md-cms im Hauptmenü auftauchen — unter
   „Ressourcen" wie md-recall, unter „Arbeiten"/Cases, oder in einer neuen
   „Software"-Gruppe zusammen mit md-portal? Der gelieferte Einzeiler passt
   längenmäßig überall, aber die Zielsektion ist unklar.
6. **Login-Dropdown:** Existiert noch nicht im Code. Soll es zwei Einträge
   (md-cms, md-portal) in einem gemeinsamen Dropdown geben, oder zwei getrennte
   Knöpfe im Header?
