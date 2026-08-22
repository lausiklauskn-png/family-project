# Family Projekt — Sitzungs-Anker

**Kurz-Verfassung.** Ausführliches steht netzweit in **Sage-Protokol**; hier steht nur,
was eine Sitzung wissen muss, **bevor** sie hier etwas anfasst.

## Was dieses Repo ist

Die öffentliche Website `family-projekt.de` — Startseite plus drei Räume
(**Netzwerk · Werkzeuge · Marktplatz**), echter three.js-Mycel-Hintergrund, drei Themen,
DE/EN. Zugleich SBKIM-Knoten (DB-Schublade `familyprojekt`).

**Läuft NICHT auf GitHub Pages**, sondern auf Klaus' Hetzner-Server über Caddy im
Docker. Das ändert alles, was mit Auslieferung zu tun hat.

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
- **Der Gerätename** wird vom app-eigenen Glue ins Verbinden-Panel gehängt — hier `sbkim/sbkim-init.js`, **nie** in eine byte-kopierte Panel-Datei. Regel: [NETZWEIT § 2](https://github.com/lausiklauskn-png/Sage-Protokol/blob/main/docs/NETZWEIT.md).

## Dieses Repo trägt seine eigenen Rezepte

Unter `.claude/skills/` liegen fünf Skills — Marktplatz-Karten, saubere
Netz-Anmeldung, Seiten-Bauregeln, Siegel/Status-Leiste, verschlüsselter
Schlüssel-Tresor. **Sie werden nur auf Abruf geladen.** Wer hier an einer Seite, am
Marktplatz oder an der Ladezeit arbeitet, schlägt sie **zuerst** auf — sonst baut er
Wissen nach, das längst aufgeschrieben ist.

## Netzweit — gilt in jedem Repo, steht in Sage

Freibrief zum Selbst-Mergen · Gerätename im Verbinden-Panel · frisch von
`origin/main` vor jeder Arbeit · Ton · kein PII · Ehrlichkeit:
**[`Sage-Protokol/docs/NETZWEIT.md`](https://github.com/lausiklauskn-png/Sage-Protokol/blob/main/docs/NETZWEIT.md)**

Verbindliche Verträge: **[`INTERFACES.md`](https://github.com/lausiklauskn-png/Sage-Protokol/blob/main/docs/INTERFACES.md)** (Andock §11,
Briefkasten §11.6, Gerätename §11.7). Die Fallen beim Abzweigen und
Veröffentlichen: **[`LEHREN.md`](https://github.com/lausiklauskn-png/Sage-Protokol/blob/main/docs/LEHREN.md)**.

Das Kurze davon, weil es täglich gebraucht wird:

```bash
git fetch origin --quiet && git checkout -B <branch> origin/main
git push -u origin refs/heads/<branch>:refs/heads/<branch>
git diff --stat origin/main origin/<branch>     # leer = der PR wäre leer
```

> **Bis 2026-08-22 stand das hier ausgeschrieben** — und wortgleich in bis zu
> 19 weiteren Repos. Zwanzig Kopien einer Regel sind nicht zwanzigmal so
> verbindlich; sie sind zwanzig Stellen, an denen sie auseinanderlaufen kann.
> Genau das war passiert. Die alte Fassung dieser Datei steht vollständig in
> [`docs/archiv/CLAUDE-2026-08-22.md`](docs/archiv/CLAUDE-2026-08-22.md).
