# Content-Entwurf /md-portal/ — DE + EN

Stand 19.9.2026. Struktur spiegelt `mccain-design-system/McCain Digital md-recall.dc.html`
(einzige Struktur-Vorlage, wie beim md-cms-Entwurf). Section-IDs in Klammern sind
die von md-recall. Quellen je Behauptung im Anhang.

**Einordnung vor dem Lesen:** md-portal ist deutlich weiter als md-cms — echte,
laufende Bildschirme für Projekte, Aufgaben mit Freigabe, Anfragen, Kunden und
Rechnungen, live seit 19.9.2026 nachmittags. Die meistdiskutierte Zukunftsfunktion,
das Kanban-Board, ist aber **nicht** gebaut — nur vom Owner am 19.9. als Priorität
für v1 entschieden. Das muss in jeder Formulierung als „kommt noch", nie als „gibt
es schon" stehen.

---

## Meta

| Feld | DE | EN |
|---|---|---|
| SEO-Title (≤60) | `md-portal · Ihr Projekt bei McCain Digital` (42) | `md-portal · Your project at McCain Digital` (42) |
| Meta-Description (≤155) | `md-portal zeigt Ihr Projekt von der Anfrage bis zur Rechnung: Aufgaben mit Freigabe, Dateien, Anfragen und Rechnungen an einem Ort.` (131) | `md-portal shows your project from request to invoice: tasks with approval, files, requests and invoices in one place.` (117) |
| Breadcrumb-Label | `md-portal` (mid: „Produkte") | `md-portal` (mid: „Products") |
| Menü-Einzeiler „Software"-Mega-Menü (≤60) | `Ihr Kundenportal – Projekte, Aufgaben, Rechnungen` (49) | `Your client portal — projects, tasks, invoices` (46) |
| Login-Dropdown-Einzeiler (≤45) | `Ihr Projekt ansehen` (19) | `View your project` (17) |

Gleiche Platzierungs-Unsicherheit wie bei md-cms — siehe dortige offene Frage 5,
gilt identisch hier.

---

## hero (`#inhalt`)

**eyebrow**
DE: `Eigenes Produkt · Live`
EN: `Our own product · Live`

**version** (`apps/portal/package.json`)
`v0.13.2`

**tagline**
DE: `Ihr Projekt, sichtbar von der Anfrage bis zur Rechnung.`
EN: `Your project, visible from request to invoice.`

**lead**
DE: `md-portal zeigt jedes Projekt mit McCain Digital an einem Ort: Aufgaben mit Freigabe, Dateien, Anfragen und Rechnungen. Läuft auf demselben Konto wie md-cms — mit eigener Anmeldung je App, aus Sicherheitsgründen ohne gemeinsame Sitzung.`
EN: `md-portal shows every project with McCain Digital in one place: tasks with approval, files, requests and invoices. Runs on the same account as md-cms — with its own sign-in per app, without a shared session for security reasons.`

**cta1 / cta2**
DE: `Zugang anfragen` / `So ist ein Projekt aufgebaut`
EN: `Ask for access` / `See how a project is laid out`
(Kein öffentliches Selbst-Registrieren — Zugang kommt über eine Einladung, siehe FAQ.)

**meta (3 Zeilen)**
DE: `live seit 19.9.2026` · `sechs Bereiche je Projekt` · `ein Konto für Portal und CMS`
EN: `live since 19 Sep 2026` · `six areas per project` · `one account for portal and CMS`

**Mockup** (kein Terminal wie bei md-recall — md-portal hat keine CLI; stattdessen
eine als Beispiel gekennzeichnete Vorschau der Projekt-Reiter, im selben
Fenster-Rahmen/Tab-Muster wie md-recalls Terminal, damit die Vorlage strukturell
gleich bleibt)

Tabs: `Projekt` / `Aufgabe` / `Rechnung`
DE Tabs: `Projekt` / `Aufgabe` / `Rechnung`
EN Tabs: `Project` / `Task` / `Invoice`

Beispiel-Block 1 (Projekt):
```
Projekt · Website Relaunch

  Bereiche  Aufgaben · Dateien · Anfragen
            Rechnungen · Personen · Einstellungen

  Rolle     Kunde – sieht das eigene Projekt
  Rolle     Studio – sieht alle Projekte
```
EN:
```
Project · Website relaunch

  areas     Tasks · Files · Requests
            Invoices · People · Settings

  role      Client — sees their own project
  role      Studio — sees every project
```

Beispiel-Block 2 (Aufgabe):
```
Aufgabe · Startseite Text final

  Status     Freigabe angefragt
  Kommentar  "Bitte Absatz 2 kürzen"
  Aktionen   Freigeben · Änderung anfordern

  (Liste mit Filtern, kein Kanban-Board — das ist geplant)
```
EN:
```
Task · Homepage copy final

  status     approval requested
  comment    "Please shorten paragraph 2"
  actions    approve · request changes

  (list with filters, not a Kanban board — that is planned)
```

Beispiel-Block 3 (Rechnung):
```
Rechnung · Website Relaunch

  Datei      hochgeladen (PDF)
  Status     offen
  Projekt    verlinkt

  (Rechnungen werden hochgeladen, nicht im Portal erzeugt)
```
EN:
```
Invoice · Website relaunch

  file       uploaded (PDF)
  status     open
  project    linked

  (invoices are uploaded, not generated in the portal)
```

**stats (3)**
DE:
1. `19.9.2026` — live seit
2. `6 Bereiche` — Aufgaben, Dateien, Anfragen, Rechnungen, Personen, Einstellungen je Projekt
3. `1 Konto` — für md-portal und md-cms gemeinsam
EN:
1. `19 Sep 2026` — live since
2. `6 areas` — tasks, files, requests, invoices, people, settings per project
3. `1 account` — shared by md-portal and md-cms

---

## how (`#funktion`, „Wie es funktioniert")

**eyebrow / title / desc**
DE: `Wie es funktioniert` / `Von der Anfrage zum abgeschlossenen Projekt.` / `Ein Projekt bei McCain Digital läuft entlang derselben drei Stationen — sichtbar für Sie, nicht nur intern.`
EN: `How it works` / `From request to finished project.` / `A project with McCain Digital moves through the same three stations — visible to you, not just internally.`

**steps (3)**

1. DE: `01` · `Anfrage stellen` · `Anfragen-Postfach` · `Der erste Kontakt landet an einem Ort` · `Eine Anfrage kommt im Postfach an. Das Studio prüft sie und macht daraus bei Bedarf ein Projekt.`
   EN: `01` · `Send a request` · `Requests inbox` · `The first contact lands in one place` · `A request arrives in the inbox. The studio reviews it and turns it into a project when it is ready.`
2. DE: `02` · `Aufgaben mit Freigabe` · `Liste · Kommentare · Freigabe` · `Sie sehen, was ansteht — und geben frei` · `Jede Aufgabe zeigt Status und Kommentare. Freigeben oder eine Änderung anfordern geschieht direkt an der Aufgabe, nicht per E-Mail-Ping-Pong.`
   EN: `02` · `Tasks with approval` · `List · comments · approval` · `You see what is pending — and approve it` · `Every task shows status and comments. Approving or requesting a change happens right on the task, not in an email back-and-forth.`
3. DE: `03` · `Dateien und Rechnungen griffbereit` · `Dateien · Rechnungen` · `Alles zu einem Projekt an einem Ort` · `Dateien und Rechnungen hängen am Projekt, nicht verstreut in Postfächern. Rechnungen werden hochgeladen und mit Status verfolgt.`
   EN: `03` · `Files and invoices within reach` · `Files · invoices` · `Everything for a project in one place` · `Files and invoices hang off the project, not scattered across inboxes. Invoices are uploaded and tracked by status.`

---

## feat (`#funktionen`, „Funktionen") — NUR LIVE

1. DE: `Projekte mit sechs Bereichen` — `Aufgaben, Dateien, Anfragen, Rechnungen, Personen und Einstellungen — an einem Projekt, nicht verstreut.`
   EN: `Projects with six areas` — `Tasks, files, requests, invoices, people and settings — on one project, not scattered.`
2. DE: `Aufgabenliste mit Freigabe` — `Filter, Kommentare, und direkt an der Aufgabe: freigeben oder eine Änderung anfordern.`
   EN: `Task list with approval` — `Filters, comments, and right on the task: approve or request a change.`
3. DE: `Anfragen-Postfach` — `Neue Anfragen kommen an, das Studio macht daraus ein Projekt.`
   EN: `Requests inbox` — `New requests arrive, the studio turns them into a project.`
4. DE: `Kundenverwaltung fürs Studio` — `Stammdaten, Personen, Projekte und Rechnungen einer Kundin an einem Bildschirm.`
   EN: `Customer management for the studio` — `A client's details, people, projects and invoices on one screen.`
5. DE: `Rechnungen hochladen und verfolgen` — `Datei hochladen, Status verfolgen — heute kein automatisches Erzeugen von Rechnungen.`
   EN: `Upload and track invoices` — `Upload a file, track its status — no automatic invoice generation today.`
6. DE: `Verwaltung mit Protokoll` — `Ein Audit-Protokoll und Status-Vorlagen für das Studio unter „Verwaltung".`
   EN: `Admin with an audit log` — `An audit log and status templates for the studio under "Admin".`

---

## proj (`#projekte`, angepasst zu „Teil jedes Kundenprojekts")

**eyebrow / title / desc**
DE: `In jedem Kundenprojekt` / `Ihr Projekt ist sichtbar, nicht nur verwaltet.` / `Wo andere Agenturen E-Mail-Ketten schreiben, bekommen Sie ein Projekt, das Sie selbst einsehen — mit Aufgaben, Dateien und Rechnungen an einem Ort.`
EN: `In every client project` / `Your project is visible, not just managed.` / `Where other agencies write email chains, you get a project you can see for yourself — with tasks, files and invoices in one place.`

**cta / badge**
DE: `Zugang anfragen` · `Für Kundinnen und Kunden eines laufenden Projekts mit McCain Digital`
EN: `Ask for access` · `For clients of an active project with McCain Digital`

**points (3)**
1. DE: `Freigabe direkt an der Aufgabe` — `Kein Warten auf E-Mail-Antworten: Freigeben oder eine Änderung anfordern geschieht am Ort der Aufgabe.`
   EN: `Approval right on the task` — `No waiting on email replies: approving or requesting a change happens where the task lives.`
2. DE: `Dasselbe Konto wie im CMS` — `Wer auch md-cms nutzt, meldet sich mit denselben Zugangsdaten an — in einer eigenen, getrennten Sitzung.`
   EN: `The same account as the CMS` — `Anyone also using md-cms signs in with the same credentials — in its own, separate session.`
3. DE: `Kein offenes Selbst-Registrieren` — `Zugang kommt über eine Einladung, sobald ein Projekt läuft.`
   EN: `No open self-sign-up` — `Access comes through an invitation once a project is under way.`

---

## sh / screens (`#screens`)

Fünf reale, im Code bestätigte Bildschirme (statt md-recalls zehn — Ehrlichkeit vor
Vollständigkeit).

1. **Route:** `/projekte/[id]` (Reiter „Aufgaben")
   DE: Tag `Aufgaben` · `Die Aufgabenliste eines Projekts` · `Filterbare Liste mit Kommentaren und Freigabe-Aktionen direkt an der Aufgabe. Ein Kanban-Board ist geplant, heute ist es eine Liste.` · Chips: `Liste`, `Freigabe`
   EN: Tag `Tasks` · `A project's task list` · `A filterable list with comments and approval actions right on the task. A Kanban board is planned; today it is a list.` · Chips: `list`, `approval`
2. **Route:** `/projekte`
   DE: Tag `Projekte` · `Alle Projekte im Überblick` · `Das Studio sieht und durchsucht jedes laufende Projekt, eine Kundin nur die eigenen.` · Chips: `Studio`, `Filter`
   EN: Tag `Projects` · `Every project at a glance` · `The studio sees and searches every active project, a client only their own.` · Chips: `studio`, `filter`
3. **Route:** `/anfragen`, `/anfragen/[id]`
   DE: Tag `Anfragen` · `Das Anfragen-Postfach` · `Neue Anfragen kommen hier an. Das Studio prüft und macht daraus bei Bedarf ein Projekt.` · Chips: `Postfach`, `Detail`
   EN: Tag `Requests` · `The requests inbox` · `New requests land here. The studio reviews them and turns them into a project when needed.` · Chips: `inbox`, `detail`
4. **Route:** `/kunden/[id]` (nur Studio)
   DE: Tag `Kunden` · `Kundendetail fürs Studio` · `Stammdaten, Personen, Projekte und Rechnungen einer Kundin an einem Bildschirm.` · Chips: `Studio`, `nur intern`
   EN: Tag `Customers` · `Customer detail for the studio` · `A client's details, people, projects and invoices on one screen.` · Chips: `studio`, `internal only`
5. **Route:** `/rechnungen` bzw. `/projekte/[id]/rechnungen`
   DE: Tag `Rechnungen` · `Rechnungen je Projekt` · `Hochgeladene Rechnungen mit Status, verlinkt an das jeweilige Projekt.` · Chips: `Upload`, `Status`
   EN: Tag `Invoices` · `Invoices per project` · `Uploaded invoices with a status, linked to the relevant project.` · Chips: `upload`, `status`

Hinweis:
DE: `Ein Kanban-Board für Aufgaben ist für die erste Fassung fest eingeplant, aber noch nicht gebaut.`
EN: `A Kanban board for tasks is firmly planned for the first release, but not built yet.`

---

## dl / „Zugang" (`#download` → umbenannt)

**eyebrow / title / desc**
DE: `Zugang` / `Ihr Zugang kommt mit dem Projekt.` / `md-portal hat keine offene Registrierung. Sobald ein Projekt bei McCain Digital läuft, bekommen Sie eine Einladung — mit denselben Zugangsdaten wie für md-cms, falls Sie beides nutzen.`
EN: `Access` / `Your access comes with the project.` / `md-portal has no open sign-up. Once a project with McCain Digital is under way, you get an invitation — with the same credentials as md-cms, if you use both.`

**Status-Zeile**
DE: `Fassung 0.13.2 · live` / `Anmeldung unter portal.mccain-digital.com` / `Zugang per Einladung`
EN: `Version 0.13.2 · live` / `Sign in at portal.mccain-digital.com` / `Access by invitation`

**Konditionen-Kasten**
DE: `Konditionen` — `Ein gesonderter Preis für md-portal ist nicht veröffentlicht. Der Zugang gehört zu einem laufenden Projekt mit McCain Digital — sprechen Sie uns an.`
EN: `Terms` — `No separate price for md-portal is published. Access belongs to an active project with McCain Digital — talk to us.`

**„Ehrlich gesagt"-Kasten**
DE: `Ehrlich gesagt` — `md-portal ist live seit dem 19.9.2026 und läuft bereits mit echten Projekten. Aufgaben stehen heute als Liste da, nicht als Kanban-Board — das ist für die erste Fassung fest geplant. Benachrichtigungen erscheinen heute im Portal selbst; der E-Mail-Versand dazu ist in Arbeit.`
EN: `Honestly` — `md-portal has been live since 19 Sep 2026 and already runs real projects. Tasks appear as a list today, not a Kanban board — that is firmly planned for the first release. Notifications appear inside the portal today; email delivery for them is in progress.`

---

## „mcp"-Sektion (`#mcp`, KI-Anbindung) — bewusst weggelassen

Der Design-Doc nennt „KI-Funktionen" ausdrücklich als „Nicht in v1 (bewusst
später)". Es gibt keine geplante, geschweige denn gebaute KI-Funktion für
md-portal, die man ehrlich bewerben könnte. Diese Sektion entfällt komplett,
auch nicht im „Als Nächstes"-Block.

---

## ask (in FAQ eingebettete Konsole)

**title / desc**
DE: `Die Seite fragen` / `Fragen Sie, was Ihr Projekt zeigt — die Antwort erscheint im Chat.`
EN: `Ask the site` / `Ask what your project shows — the answer appears in the chat.`

**chips**
DE: `Sehe ich als Kundin ein Kanban-Board?` · `Ist mein Login derselbe wie im CMS?` · `Wie melde ich eine Rechnung hoch?`
EN: `Do I see a Kanban board as a client?` · `Is my login the same as the CMS?` · `How do I upload an invoice?`

---

## faq (`#faq`)

**eyebrow / title / desc**
DE: `Fragen` / `Was Kundinnen und Kunden vor md-portal fragen.` / `Wenn eine Antwort fehlt: die Konsole oben, oder schreiben Sie uns direkt.`
EN: `Questions` / `What clients ask before md-portal.` / `If an answer is missing: the console above, or write to us directly.`

**items (7)**

1. DE: `Was sehe ich in meinem Projekt?` — `Sechs Bereiche: Aufgaben, Dateien, Anfragen, Rechnungen, Personen und Einstellungen. Als Kundin sehen Sie Ihr eigenes Projekt, das Studio sieht alle.`
   EN: `What do I see in my project?` — `Six areas: tasks, files, requests, invoices, people and settings. As a client you see your own project, the studio sees every one.`
2. DE: `Gibt es ein Kanban-Board?` — `Heute nicht — Aufgaben stehen als filterbare Liste mit Freigabe-Aktionen da. Ein Kanban-Board ist für die erste Fassung fest eingeplant, aber noch nicht gebaut.`
   EN: `Is there a Kanban board?` — `Not today — tasks appear as a filterable list with approval actions. A Kanban board is firmly planned for the first release, but not built yet.`
3. DE: `Ist mein Login derselbe wie im CMS?` — `Die Zugangsdaten sind dieselben, wenn Sie beides nutzen — ein Konto im selben Supabase-Projekt. Angemeldet sind Sie trotzdem getrennt, aus Sicherheitsgründen ohne gemeinsames Cookie.`
   EN: `Is my login the same as the CMS?` — `The credentials are the same if you use both — one account in the same Supabase project. You are still signed in separately, without a shared cookie for security reasons.`
4. DE: `Wie bekomme ich Zugang?` — `Über eine Einladung von McCain Digital, sobald Ihr Projekt läuft, oder über das Anfragen-Postfach, wenn Sie noch am Anfang stehen.`
   EN: `How do I get access?` — `Through an invitation from McCain Digital once your project is under way, or through the requests inbox if you are still at the start.`
5. DE: `Was kostet der Zugang?` — `Ein gesonderter Preis ist nicht veröffentlicht. Der Zugang gehört zu einem laufenden Projekt — sprechen Sie uns an.`
   EN: `What does access cost?` — `No separate price is published. Access belongs to an active project — talk to us.`
6. DE: `Bekomme ich eine E-Mail, wenn sich etwas ändert?` — `Heute erscheinen Benachrichtigungen im Portal selbst. Der Versand per E-Mail ist in Arbeit.`
   EN: `Do I get an email when something changes?` — `Today, notifications appear inside the portal itself. Email delivery is in progress.`
7. DE: `Werden Rechnungen im Portal erstellt?` — `Nein, in der ersten Fassung werden Rechnungen hochgeladen und mit Status verfolgt, nicht im Portal erzeugt.`
   EN: `Are invoices created in the portal?` — `No, in the first release invoices are uploaded and tracked by status, not generated in the portal.`

---

## Als Nächstes (GEPLANT)

DE eyebrow/title: `Als Nächstes` / `Was noch kommt.`
EN: `Coming next` / `What is still coming.`

- DE: `Kanban-Board für Aufgaben` — Owner-Entscheidung 19.9., fest für die erste Fassung eingeplant.
  EN: `Kanban board for tasks` — decided by the owner on 19 Sep, firmly planned for the first release.
- DE: `Echter Kalender/Zeitleiste` — heute existiert die Route, die Funktion ist für eine spätere Welle vorgesehen.
  EN: `A working calendar/timeline` — the route exists today, the function is planned for a later wave.
- DE: `Schnellsuche per Tastenkombination (Strg+K)`
  EN: `Quick search via keyboard shortcut (Ctrl+K)`
- DE: `Zweiter Faktor für Studio-Konten`
  EN: `Two-factor authentication for studio accounts`
- DE: `E-Mail-Benachrichtigungen` — In-Portal-Benachrichtigungen sind live, der Versand per E-Mail (Resend) folgt.
  EN: `Email notifications` — in-portal notifications are live, email delivery (via Resend) follows.
- DE: `Automatisches Aufräumen abgebrochener Uploads` — bis dahin von Hand.
  EN: `Automatic cleanup of abandoned uploads` — done by hand until then.

---

## contact (`#contact`)

Gemeinsame, seitenweite Komponente — identisch für jede Seite, hier nicht neu
getextet.

---

## Anhang: Quellen

| Behauptung | Quelle |
|---|---|
| Ein Konto, getrennte Sitzungen für Portal+CMS, kein SSO | `mccain-cms/docs/plans/2026-09-18-portal-schnittstellen.md` Z. 12-13; `2026-09-18-portal-design.md` Z. 25 |
| Sechs Bereiche je Projekt (Aufgaben/Dateien/Anfragen/Rechnungen/Personen/Einstellungen) | Verzeichnis-Scan `apps/portal/src/app/(app)/projekte/[id]/` — Unterordner `aufgaben`, `dateien`, `anfragen`, `rechnungen`, `personen`, `einstellungen` |
| Aufgabenliste (kein Kanban) mit Kommentaren + Freigabe-Aktionen | `apps/portal/src/components/tasks/task-list.tsx`, `task-dialog.tsx`, `task-comment-form.tsx`, `task-approval-controls.tsx` |
| Kanban-Board ausdrücklich noch nicht gebaut, nur als v1-Priorität entschieden | Kommentar in `apps/portal/src/app/(app)/projekte/[id]/aufgaben/page.tsx` Z. 11-16; `mccain-cms/HANDOFF.md` (Portal-Abschnitt): „Kanban-Board ist das Kernstück und in v1" |
| Anfragen-Postfach mit Umwandlung in Projekt | Routen `apps/portal/src/app/(app)/anfragen`, `.../anfragen/[id]`, `.../anfragen/neu` |
| Kundenverwaltung nur für Studio | Routen `apps/portal/src/app/(app)/kunden`, `.../kunden/[id]`; Design-Dok Rechte-Matrix |
| Rechnungen: Upload, nicht Erzeugung | `mccain-cms/docs/plans/2026-09-18-portal-design.md` §E5: „In v1 hochladen, nicht erzeugen"; Routen `.../rechnungen` |
| Verwaltung: Protokoll (Audit-Log) und Status-Vorlagen | Routen `apps/portal/src/app/(app)/verwaltung/protokoll`, `.../verwaltung/status-vorlage` |
| Kalender-Route existiert, echte Funktion erst „Welle 2" | `mccain-cms/docs/plans/2026-09-19-portal-p4-plan.md` Z. ~100-108; Route `apps/portal/src/app/(app)/kalender` (Inhalt nicht geprüft) |
| In-Portal-Benachrichtigungen live, E-Mail-Versand (Resend) offen | `mccain-cms/docs/plans/2026-09-19-portal-p2-notes.md` (`portal_notifications`-Tabelle, DB-Trigger); `mccain-cms/HANDOFF.md` (Portal): „Mail-Versand (Resend) kommt … wenn der Schritt dran ist" |
| KI-Funktionen ausdrücklich „Nicht in v1" | `mccain-cms/docs/plans/2026-09-18-portal-design.md` §1.3 |
| Logo: `apps/portal/public/brand/mccain-mark.svg` + `portal-logo.tsx`, Quelle `mccain-digital/brand/mccain-mark-free-color.svg` | `apps/portal/src/components/portal-logo.tsx` (Kopfkommentar); Owner-Zitat vom 19.9. im selben Kommentar |
| Version `0.13.2` | `mccain-cms/apps/portal/package.json` |
| Live seit 19.9.2026, ca. 14:50 | `mccain-cms/HANDOFF.md` (Portal-Top-Block) |
| CI-Vorfall (SQLSTATE 23001/23503, Postgres 17 vs. 18) behoben, kein offener roter Lauf laut Doku | `mccain-cms/CHANGELOG.md`; `mccain-cms/docs/plans/2026-09-18-portal-handoff.md` Nachtrag 19.9. ~15:30 (Fix in 0.13.2, `src/server/pg-error.ts`) — nicht selbst live/CI geprüft, siehe Vorbehalt unten |
| Keine Preisangabe irgendwo im Repo | Durchsuchung aller `docs/plans/*`, `HANDOFF.md`, `CHANGELOG.md` — kein Preis, keine Zahl, kein Lizenzmodell gefunden |
| md-recall-Seitenstruktur (Sektionen, Reihenfolge, Feldnamen) | `mccain-digital/mccain-design-system/McCain Digital md-recall.dc.html` Zeilen 311-574, `PG`-Objekt Zeilen 1086-1206 |
| Tonalität/Format-Vorbild | `mccain-digital/mccain-design-system/McCain Digital Websites.dc.html` Zeilen 1032-1051, 951 |

**Vorbehalt:** Die CI-/Live-Status-Aussagen stammen aus den Repo-Dokumenten selbst
(HANDOFF, CHANGELOG), nicht aus einer eigenen Prüfung von GitHub Actions oder der
Live-URL in diesem Rechercheschritt. Vor Veröffentlichung kurz gegenprüfen, falls
Uptime/Stabilität in der finalen Seite behauptet werden soll.

---

## Offene Fragen für den Owner

1. **Demo-Zugang für die Seite:** Es existieren interne Demo-Konten
   (`info+demo-admin@…`, `info+demo-mitglied@…`) für Vorführzwecke. Sollen wir
   damit auf der Marketingseite werben (z. B. „Demo anfragen"), oder bleibt das
   intern? Ich habe die konkreten Adressen bewusst nicht in den sichtbaren
   Seitentext übernommen.
2. **Preis/Konditionen:** wie bei md-cms nirgends dokumentiert. Ist der
   Portal-Zugang automatisch Teil jedes Projekts, oder gibt es Fälle ohne Portal?
3. **Kalender-Route:** Ich konnte den tatsächlichen Inhalt von `/kalender` nicht
   verifizieren (nur die Route existiert, laut Plan-Dok kommt die echte Funktion
   erst in „Welle 2"). Vor einer Aussage dazu in der finalen Seite bitte den
   Bildschirm selbst ansehen.
4. **Zeitpunkt für den Kanban-Hinweis:** Die Seite nennt das Kanban-Board
   mehrfach als „kommt noch". Sobald es gebaut ist, muss das an mehreren Stellen
   gleichzeitig aktualisiert werden (Screens, FAQ, Als-Nächstes, `dl`-Ehrlich-
   gesagt-Kasten) — ggf. einen Platzhalter/Suchbegriff festlegen, damit nichts
   vergessen wird.
5. **Mega-Menü-Platzierung:** identische offene Frage wie bei md-cms (siehe
   dortige Frage 5) — beide Produkte sollten vermutlich zusammen entschieden
   werden, nicht einzeln.
6. **CI-/Live-Status vor Veröffentlichung gegenprüfen** (siehe Vorbehalt im
   Quellen-Anhang) — die Aussage „live und stabil" stützt sich ausschließlich auf
   die Selbstauskunft in HANDOFF/CHANGELOG, nicht auf eine unabhängige Prüfung.
