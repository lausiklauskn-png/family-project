# BRIEF für die nächste Sitzung — „Auto-Deploy per Knopf" für family-projekt.de

**Thema (Klaus 2026-07-26):** Klaus will einen **Automatismus / Knopf („Pille" oder
„Hochladen"-Button)**, mit dem Änderungen am Repo **automatisch live** auf
`family-projekt.de` gehen — **ohne dass er dafür jedes Mal eine Claude-Sitzung
anstoßen muss.** Wörtlich: *„Ich verändere etwas an 'nem Repo und mit einem Button
wird das dann hochgeladen … sodass ich dich nicht mehr dazu animieren muss, sondern
dass es dann automatisch läuft."*

**Freibrief gilt** (Sage `CLAUDE.md` § Freibrief, netzweit): eigenständig bauen +
eigene PRs selbst mergen, wenn getestet (Smoke / `node --check` grün), abgegrenzt und
nicht architektonisch zweifelhaft. **ABER dieser Auftrag hat einen echten Zweifels-Punkt
(was genau der Knopf tun soll) UND einen sicherheits-sensiblen Teil (GitHub-Token) →
erst Klaus fragen, dann bauen.** Nie stillschweigend (Commit/PULS dokumentieren).

---

## Der wichtigste Befund zuerst: die „letzte Meile" ist schon automatisch

Bevor irgendetwas Neues gebaut wird — **prüfen, was schon da ist.** `family-projekt.de`
ist **kein GitHub Pages**, sondern **Hetzner + Caddy** (statisches Ausliefern aus
`/srv/family-project`, einem `git clone`). Es existieren bereits **zwei** fertige
Bausteine für genau Klaus' Wunsch:

1. **Auto-Deploy-Cron (server-seitig, schon dokumentiert):**
   `deploy/AUTO_DEPLOY.md` + `deploy/auto-pull.sh`. Ein 2-Minuten-Cron auf dem Hetzner-
   Server zieht `git fetch origin main && git reset --hard origin/main`. **Ist der Cron
   installiert, geht jeder Merge auf `main` innerhalb von 2 Minuten von selbst live —
   ganz ohne Sitzung.** Der README sagt selbst: *„Wenn das Server-Update mal hängt, ist
   die Seite dort veraltet."* → **Verdacht: der Cron ist evtl. gar nicht (mehr) aktiv,
   und genau DAS ist Klaus' eigentlicher Schmerz.**

2. **Server-Commit per GitHub-Token (schon gebaut, bewährt):**
   `server/freigabe.php` + `server/freigabe-config.example.php`. Das nimmt einen Klick
   entgegen und **schreibt server-seitig per Fine-grained-GitHub-Token einen Commit nach
   `main`** (aktuell in `assets/config/listings.js`) → der Auto-Deploy schaltet ihn live.
   Das ist **exakt das „Knopf → Repo-Änderung → live"-Muster**, nur bisher nur für
   Marktplatz-Einträge. Der Token liegt **NUR auf dem Server** (`freigabe-config.php`,
   nie im Repo), die Seite ist per `.htpasswd` geschützt.

**Erste Aufgabe der Folge-Sitzung ist also NICHT bauen, sondern klären + prüfen:**
Läuft der Auto-Deploy-Cron? Wenn nein → mit Klaus in der Hetzner-Konsole die eine Zeile
aus `deploy/AUTO_DEPLOY.md` einrichten. **Das allein könnte Klaus' Wunsch schon zu 90 %
erfüllen** (merge → 2 Min → live, keine Sitzung nötig).

---

## Die echte offene Frage an Klaus (mit `AskUserQuestion` klären)

„Ich verändere etwas an 'nem Repo" ist mehrdeutig — Klaus hat **keinen Code-Editor**
(Tablet, Chrome + GitHub-Web-UI + Termux). Es gibt drei plausible Lesarten, die zu
**sehr verschiedenen** Bauten führen. Vor dem Bauen abfragen, welche gemeint ist:

- **Lesart A — „Die Automatik nur einschalten."** Klaus ändert etwas (über eine
  Sitzung oder die GitHub-Web-UI → Merge auf `main`), und die Live-Seite soll sich
  **von allein** aktualisieren. → **Lösung:** Auto-Deploy-Cron einrichten/prüfen
  (Baustein 1 oben). Kein neuer Code nötig, nur Server-Einrichtung + ein sichtbarer
  Nachweis, dass es läuft. **Wahrscheinlich das, was Klaus meint — zuerst anbieten.**

- **Lesart B — „Ein sichtbarer Knopf, der sofort deployt / den Stand zeigt."** Ein
  `workflow_dispatch`-Knopf (GitHub → Actions → „Jetzt live schalten", wie der schon
  existierende „Embedding-Modell holen"-Workflow in `.github/workflows/modell-holen.yml`)
  **oder** eine kleine **Status-Pille** auf der Seite/einer Admin-Seite, die anzeigt
  „live == main? / zuletzt aktualisiert vor X Min". Hinweis-Grenze: ein Deploy-Knopf
  kann nur ausliefern, **was schon auf `main` ist** — er kann keine un-gemergten
  Änderungen zaubern.

- **Lesart C — „In-Seite bearbeiten + Hochladen-Knopf (Mini-CMS)."** Klaus bearbeitet
  **Inhalte selbst** (Texte, Marktplatz-Einträge, Werkzeug-Links, Tagesbild) über ein
  Formular auf der Seite oder einer geschützten Admin-Seite, klickt **„Hochladen"**, und
  es wird **per Server-Token nach `main` committet** → Auto-Deploy schaltet es live. Das
  ist die „Pille/Button"-Lesart und passt am besten zu *„damit ich dich nicht mehr
  animieren muss"* — Klaus **selbst** ist der Autor. **Baut das `freigabe.php`-Muster
  aus** (nicht neu erfinden). **Sicherheits-sensibel → eigene, sorgfältige Sitzung.**

---

## 🔒 Sicherheits-Leitplanke (unverhandelbar, in JEDER Lesart)

- **Ein GitHub-Schreib-Token gehört NIE in den Browser / nie in Client-JS / nie ins
  Repo.** Die öffentliche Seite ist für jeden lesbar — ein dort eingebetteter Token
  = jeder könnte ins Repo pushen. Der **einzige** korrekte Ort ist **server-seitig**
  (Hetzner-Webhosting-PHP, `freigabe-config.php` hinter `.htaccess`/`.htpasswd`),
  genau wie beim bestehenden `freigabe.php`. Fine-grained-Token, **nur** Repo
  `family-project`, **nur** `Contents: Read and write`.
- **Auth:** jede „schreibende" Seite/Endpunkt hinter **Basic Auth (`.htpasswd`)** —
  sonst kann jeder deployen.
- **Fail-soft + Marktplatz-Brille:** ohne Server/Token darf nichts crashen (kopierbarer
  Fallback wie beim Einreich-Formular). **Kein PII, kein Secret** in Commits/Repo.
- **`git reset --hard origin/main`** auf dem Server verwirft bewusst lokale Änderungen —
  im Deploy-Verzeichnis wird **nie** von Hand editiert; alles läuft über `main`.

---

## Marktplatz-Brille (Klaus' stehender Hintergedanke)

Family-Projekt ist die **Vorlage für den family-projekt.de-Marktplatz**. Ein sauberer
„ändern → Knopf → live"-Weg hier ist zugleich das Muster, das **andere Betreiber**
(mit/ohne Mycel) für ihre eigenen Apps übernehmen können. Also **app-agnostisch,
ohne Hardcodes, offline-first, klar benannt** (was passiert, wo der Token bleibt).

---

## Empfohlene Reihenfolge (Vorschlag der Folge-Sitzung an Klaus)

1. **Klären** (AskUserQuestion): Lesart A / B / C? — und ob der Hetzner-Auto-Deploy-Cron
   schon läuft.
2. **A zuerst umsetzen** (fast gratis): Auto-Deploy-Cron prüfen/einrichten (`deploy/
   AUTO_DEPLOY.md`), damit „Merge → live" schon ohne Sitzung geht. Sichtbarer Nachweis.
3. **B als Bequemlichkeit** (klein): `workflow_dispatch`-„Jetzt live schalten"-Knopf
   und/oder eine Deploy-Status-Anzeige/Pille — nur falls Klaus einen sichtbaren Knopf
   will.
4. **C nur wenn Klaus Inhalte selbst redigieren will** — eigene, sicherheits-sorgfältige
   Sitzung: `freigabe.php`-Muster zu einem geschützten „Bearbeiten & Hochladen"-Endpunkt
   ausbauen (Token server-seitig, `.htpasswd`, fail-soft).

---

## Pflichtlektüre VOR dem Bauen (in dieser Reihenfolge)

1. `README.md` (§ „Zwei Adressen — Produktion + Vorschau") — Hetzner vs. Pages.
2. `docs/DEPLOY.md` — der volle Deploy-Weg (Caddy, `/srv/family-project`, Webhosting).
3. `deploy/AUTO_DEPLOY.md` + `deploy/auto-pull.sh` — der schon existierende Auto-Deploy.
4. `server/README.md` + `server/freigabe.php` + `server/freigabe-config.example.php` —
   das bewährte Server-Commit-per-Token-Muster (Grundlage für Lesart C).
5. `.github/workflows/modell-holen.yml` — Beispiel für einen `workflow_dispatch`-Knopf
   (Grundlage für Lesart B).
6. `docs/PULS.md` — aktueller Stand.

---

## Start & Abschluss

- **Branch:** frisch von `origin/main` abzweigen (`git fetch origin main &&
  git checkout -B claude/<scope> origin/main`). Nie auf altem Klon bauen.
- **Sichttest:** Klaus' Browser-Lauf auf `family-projekt.de` bleibt unersetzbar;
  Server-Einrichtung prüft Klaus in der Hetzner-Konsole (Einzelschritte, keine
  Block-Anweisungen).
- **Abschluss-Befehl:** `PULS.md` fortschreiben, **neuen Brief** für die Folge-Sitzung
  schreiben (Pflichtlektüre + diesen Abschluss-Befehl wiederholen — die Kette reißt nie
  ab), den vollständigen Brief **als Codeblock im Chat** ausgeben.
