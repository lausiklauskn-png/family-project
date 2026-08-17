# Family Projekt — Sitzungs-Anker

**Kurz-Verfassung.** Ausführliches steht netzweit in **Sage-Protokol**; hier steht nur,
was eine Sitzung wissen muss, **bevor** sie hier etwas anfasst.

## Was dieses Repo ist

Die öffentliche Website `family-projekt.de` — Startseite plus drei Räume
(**Netzwerk · Werkzeuge · Marktplatz**), echter three.js-Mycel-Hintergrund, drei Themen,
DE/EN. Zugleich SBKIM-Knoten (DB-Schublade `familyprojekt`).

**Läuft NICHT auf GitHub Pages**, sondern auf Klaus' Hetzner-Server über Caddy im
Docker. Das ändert alles, was mit Auslieferung zu tun hat.

## Pflicht vor jeder Arbeit — frisch von `origin/main`

Die Klone im Container können **Monate alt** sein. Eine Aussage über den Stand dieses
Repos ohne vorheriges `fetch` ist **kein Beweis**.

```bash
git fetch origin --quiet
git checkout -B <branch> origin/main
```

Beim Veröffentlichen mit ausdrücklicher Refspec pushen und **danach** prüfen, ob der
Branch gegenüber `main` überhaupt etwas trägt — ein leerer PR lässt sich mergen und
meldet Erfolg:

```bash
git push -u origin refs/heads/<branch>:refs/heads/<branch>
git diff --stat origin/main origin/<branch>     # leer = der PR wäre leer
```

## Prüfen

Dieses Repo hat **keine `package.json`**. Die Proben werden aufgerufen:

```bash
node tests/smoke_all.mjs
bash tests/gegenprobe_*.sh     # jede Gegenprobe baut Fehler ein, die auffallen MÜSSEN
```

## Was hier leicht kaputtgeht

- **Ein statisch ausliefernder Server gibt JEDE Datei als Klartext heraus** — auch
  `.php`, wenn kein PHP-Handler läuft. Unter `server/` liegen `einreichung.php`,
  `freigabe.php` und die Konfig-Vorlage; die **echten** Geheimnisse (GitHub-Token)
  liegen auf dem Hetzner-**Webhosting** (Apache), nicht hier. Eine `.htaccess` wirkt
  **nur** bei Apache — Caddy ignoriert sie kommentarlos.
- **Drei Maschinen auseinanderhalten:** Tablet/Termux (`pkg`) · Hetzner Cloud-Server
  mit Caddy im Docker (`apt`, Prompt `root@ubuntu…`) · Hetzner Webhosting mit PHP.
  Wer einen Befehl gibt, sagt **immer dazu, wo er hingehört**.
- **Cache-Bump:** `CACHE_VERSION` in `sw.js` (`family-projekt-vNNN`).

## Dieses Repo trägt seine eigenen Rezepte

Unter `.claude/skills/` liegen fünf Skills — Marktplatz-Karten, saubere
Netz-Anmeldung, Seiten-Bauregeln, Siegel/Status-Leiste, verschlüsselter
Schlüssel-Tresor. **Sie werden nur auf Abruf geladen.** Wer hier an einer Seite, am
Marktplatz oder an der Ladezeit arbeitet, schlägt sie **zuerst** auf — sonst baut er
Wissen nach, das längst aufgeschrieben ist.


## Selbst-Merge-Freibrief (Klaus 2026-06-28, netzweit für ALLE Repos)

Die Sitzung merget ihre **eigenen** PRs selbstständig nach `main`, sobald sie getestet,
abgegrenzt und nicht architektonisch zweifelhaft sind — **ohne** auf ein „X mergen" zu
warten (Draft-PR → ready → squash). **Nicht** bei echtem Zweifel (Richtungsentscheid,
schwer umkehrbar, mehrere gleich gute Wege) oder wenn Klaus vorher draufschauen will.
Klaus' Browser-Sichttest läuft **nach** dem Merge auf der Live-Seite — nicht darauf
warten, sondern mergen und ihn dann sehen lassen.

Jede selbst getroffene Entscheidung wird **dokumentiert** — Commit-Nachricht, PR-Text.
Selbstständig heißt nicht unsichtbar.

## Netzweite Regeln liegen in Sage

Verbindlich für alle Knoten: **[`Sage-Protokol/docs/INTERFACES.md`](https://github.com/lausiklauskn-png/Sage-Protokol/blob/main/docs/INTERFACES.md)**
— Andock-Konventionen §11, Briefkasten-Pflege §11.6, Gerätename §11.7.

**🏷️ Gerätename gehört ins Verbinden-Panel (§11.7):** wer ein Panel „Mit dem Netz
verbinden" hat, hat auch das Gerätenamen-Feld **darin**. Das Feld hängt der
**app-eigene Glue** hinein (`sbkim/sbkim-init.js`) — **niemals** in eine byte-kopierte
Panel-Datei schreiben. Jedes Feld trägt `data-sbkim-geraetename`; der Name geht **nur**
an Anzeige und Anmeldung, **nie** an `generateOwnSpore` (kein Spore-Re-Sign).

## Ton

Klaus ist **kein Programmierer** (lernt gern): Antworten auf **Deutsch**, ruhig und
präzise, **Einzelschritte** mit klarem Erfolgsmerkmal. **Keine Terminal-Kommandos für
Klaus** — Bedien-Flüsse laufen über benannte Knöpfe in der Seite. Nach jedem Pull
Hard-Reload, Service-Worker und HTTP-Cache sind hartnäckig.

## Kein PII, keine Geheimnisse

Keine echten personenbezogenen Fremddaten in Commits, kein privater Schlüssel, kein
Passwort, kein Token im Repo. Klaus' eigenes Impressum/Copyright ist gewollt.
