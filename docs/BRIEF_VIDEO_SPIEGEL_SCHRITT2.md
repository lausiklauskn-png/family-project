# Brief · Video-Spiegel Schritt 2 — die Apps holen ihre Videos vom eigenen Server

**Stand 2026-10-06.** Gegen `main` geschrieben (nach PR #349 und dem Doku-Nachtrag dieses Briefs).

## Was schon steht (gemessen)

- `videos.family-projekt.de` läuft auf Klaus' Hetzner **Cloud**-Server (Container `videos`, Caddy).
  Der Server holt alle 10 Minuten selbst von GitHub Pages (`server/videos/spiegeln.mjs`, Liste
  `server/videos/quellen.json`, Cron `# videos-spiegel`, Protokoll `/var/log/videos-spiegel.log`).
- 2026-10-06: **37 Dateien, 0 Fehler** in sechs Ordnern. Von außen: `family-project/videos.json` 200,
  `workfloh-pdf/workfloh-pdf-quer.mp4` 200, `.spiegel/stand.json` 404.
- CORS erlaubt nur github.io, family-projekt.de, www.family-projekt.de, pwa-toolpoint.de — nie `*`.

## Auftrag

Jede Stelle, die heute ein Video (samt Poster/Kapitel/Teile-Liste) von github.io lädt, nimmt **zuerst**
`https://videos.family-projekt.de/<ordner>/<datei>` und fällt **auf die github.io-Adresse zurück**, wenn
der Server nicht antwortet. **github.io bleibt die Quelle** — der Spiegel ist nur die schnellere Leitung.

## Fundstellen (gesucht auf origin/main am 2026-10-06 — vor dem Bau neu suchen)

| Depot | Stelle | heute | Ordner auf dem Spiegel |
|---|---|---|---|
| family-project | `sw.js` `VIDEO_BASIS` (Werbevideo, Teile über den Worker) | `…/Family-Projekt.de-Video/` | `family-project/` (nur `videos.json` + Teile, die der Spiegel zusammensetzt — prüfen, was genau dort liegt) |
| family-project | `apps/eigen-workflow-pdf/index.html`, `assets/config/listings.js` (`video.quer/hoch/poster`) | `…/Workfloh-PDF-Page/assets/…` | `workfloh-pdf/` (flach, ohne `assets/`) |
| PWA-Toolpoint | dieselben zwei Stellen | dito | `workfloh-pdf/` |
| Workflow-PDF | `assets/app.js` `WEBSEITE` (🎬 Erklärvideo) | `…/Workfloh-PDF-Page/` | `workfloh-pdf/` |
| Mein-Mixarium | `index.html` + QC-Datei, `<source src="mixarium_intro.*">` (relativ) | eigene Adresse | `mein-mixarium/` |
| Mein-Mixarium-Page | `index.html` `assets/demo.mp4` | relativ | `mein-mixarium/seite-demo.mp4` (umbenannt!) |
| Mein-Rezeptbuch-Page | `index.html` `assets/demo.(mp4\|webm)` | relativ | `mein-rezeptbuch/` |
| Tomys-Hub | `index.html` / `showcase/index.html` `…demo.webm` | relativ | `tomys-hub/` |
| Alis-Moderaum | `app.js` `assets/img/demo-runway.mp4` | relativ | `alis-moderaum/` |

⚠ **Der Spiegel legt flach ab** (`von` → Dateiname, oder `als`). Pfade sind also NICHT einfach
austauschbar: `assets/workfloh-pdf-quer.mp4` heißt dort `workfloh-pdf/workfloh-pdf-quer.mp4`.
Die Zuordnung steht in `quellen.json` — **von dort ableiten, nicht abtippen.**

## Offene Fragen an Klaus (vor dem Bau stellen)

1. **Reihenfolge der Depots:** zuerst nur family-project + PWA-Toolpoint (dort ist der Gewinn am
   größten, Werbevideo + Workfloh PDF), dann die anderen? Vorschlag: ja.
2. **Wie wird zurückgefallen?** `<video>` mit zwei `<source>` fällt nur zurück, wenn die erste Quelle
   **fehlschlägt** (DNS/404) — ein langsamer Server zählt nicht. Ein Riegel mit Frist wäre Skript.
   Vorschlag: zwei `<source>`, keine Frist.
3. **Relative Videos in den Apps** (Mixarium, Rezeptbuch-Page, Tomys, Alis): liegen dort ohnehin auf
   derselben Adresse wie die App. Lohnt der Umweg über den Spiegel? Vorschlag: nur, wenn Klaus es will.

## Was hier leicht kaputtgeht

- **Service-Worker:** fremde Adressen dürfen nicht in den Vorrat (Videos sind groß, Range → 206).
  Jede App prüfen, dass `videos.family-projekt.de` durchgereicht wird. Cache-Bump in jeder geänderten App.
- **Mixarium** hat zwei byte-gleiche Dateien (QC + index.html), md5 vergleichen.
- **Byte-1:1-Dateien** (z. B. `assets/abspielen-kern.js` aus FP-Videos) nicht abwandeln — wenn der
  Abspielkern die Basis kennen muss, dort ändern und neu kopieren.
- Eine neue Video-Datei in einer App muss **auch in `quellen.json`** eingetragen werden, sonst
  fehlt sie auf dem Spiegel und der Rückfall greift dauerhaft (still). Eine Probe sollte das bewachen.
- Nach jeder Änderung an `quellen.json`: auf dem Server `git -C /srv/family-project pull`
  (der Cron zieht das Depot **nicht** nach).

## Akzeptanz

- Je umgestellter Stelle: Probe, dass zuerst die Spiegel-Adresse und als zweites github.io steht,
  und Gegenprobe-Fall (Rückfall entfernt → rot, Reihenfolge vertauscht → rot).
- Wächter: jede Spiegel-Adresse, die eine App nennt, steht in `quellen.json` (und umgekehrt benannt).
- ⚠ Ob es am Tablet schneller lädt, misst nur Klaus.

## Abschluss

PULS/CLAUDE.md der geänderten Depots nachziehen, je Depot ein PR (Freibrief: selbst mergen),
Abschlussbrief mit gemessener Spanne, nächster Brief als Codeblock im Chat.
