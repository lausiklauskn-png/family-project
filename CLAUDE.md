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
node tests/smoke_all.mjs       # die Seiten im echten Browser (110 Prüfungen)
node tests/smoke_*.mjs         # ⚠ die ÜBRIGEN Proben — smoke_all ruft sie NICHT auf
bash tests/gegenprobe_*.sh     # jede Gegenprobe baut Fehler ein, die auffallen MÜSSEN
```

⚠ **`smoke_all.mjs` ist NICHT „die Prüfung".** Es lädt die Seiten und fasst die
anderen `tests/smoke_*.mjs` **nicht an**. Gemessen am 2026-09-16: dadurch stand
`smoke_cache_version.mjs` rot, ohne dass es jemandem auffiel — `ASSET_V` war auf
**110** stehengeblieben, während die `CACHE_VERSION` bei **v115** war. *Eine
Probe, die im Sammellauf nicht mitläuft, ist eine Probe, die niemand fährt.*

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

## 🛠 WARTUNG — eine App unsichtbar schalten und wieder zurück (Klaus 2026-09-18)

> *„Angenommen, ein Kunde bittet mich darum, seine App vorläufig unsichtbar zu
> schalten … damit er an der App arbeiten kann und keine weiteren negativen
> Bewertungen kommen oder Messungen … auch durch einen einfachen Klick und auch
> wieder anzuschalten."*

Im Studio steht an jeder Zeile **🛠 Wartung**, und wenn sie läuft, **✅ Wartung
beenden**. Ein Klick hin, ein Klick zurück, **kein Grund-Feld**. Öffentlich wird
es wie jede Schaltung erst mit „Veröffentlichen".

⚠ **SIE IST KEINE AMPEL, und darf deshalb in BEIDE Richtungen.** Die Ampel ist
ein **Urteil** des Marktplatzes über eine App und geht aus dem Browser nur nach
oben („ein Fehlgriff beim Lösen ist still"). Die Wartung ist eine **Bitte** ihres
Anbieters, und sie kann **nur wegnehmen, nie freigeben**: wer sie ausschaltet,
stellt genau den Zustand her, den die Ampel ohnehin vorgibt.

⚠ **DIE SPERRE GEHT VOR.** Ein rot geschalteter Eintrag wird **nicht**
unsichtbar — sonst wäre „erst sperren, dann Wartung" der Weg, eine Sperre
spurlos verschwinden zu lassen.

### Vier Stellen, und jede hat ihren eigenen Grund

| | was sie tut |
|---|---|
| `tools/waechter.mjs` | **sieht während der Wartung gar nicht nach** |
| `tools/statische-listen.mjs` | lässt die Karte aus der gebauten Seite weg |
| `markt.html` | lässt sie **sofort** weg, ohne auf die Nacht zu warten |
| `assets/studio-markt.js` | der Knopf, der schaltet (de/en) |

⚠ **OHNE DIE ERSTE WÄRE ALLES ÜBRIGE AN SEINEM ZWECK VORBEIGEBAUT**, und zwar
schlimmer als wirkungslos: wer seine App zum Arbeiten offline nimmt, antwortet
nicht, und der nächtliche Lauf sperrt sie nach **zwei** Nächten auf ROT
(`nicht_erreichbar`) — die Sperre geht der Wartung vor, also bekäme der Kunde
statt Unsichtbarkeit eine öffentliche Sperre. Während der Wartung bleibt der
Befund von vorher stehen, die Fehlschläge werden **eingefroren statt gezählt**,
und der Grund heißt `in_wartung`.

⚠ **DER UNTERSCHIED ZUR HAND-FREIGABE IST DER ZÄHLER**, und daran hängt die
Schärfe der Probe: bei `hand_freigegeben` läuft er im Stillen weiter (2), in der
Wartung steht er still (0). Wäre die Wartung nur eine zweite Art Freigabe, sähe
man es an genau dieser Zahl.

### ⚠ Zwei Quellen für dieselbe Frage — und nur eine wurde gefragt

**Der teuerste Befund dieses Baus, und gefunden hat ihn die Browser-Probe.**
`inWartung()` in `markt.html` las die **Wartung** aus der Arbeitskopie
(`wache-hand.json`) und die **Ampel** nur aus dem nächtlichen Bericht
(`spore-stand.json`). Eine frisch im Studio gesetzte Sperre steht dort aber noch
gar nicht — dorthin trägt sie erst der nächtliche Lauf. Damit war „erst sperren,
dann Wartung" genau der Weg, eine Sperre spurlos verschwinden zu lassen, gegen
den der Riegel gebaut ist.

**Im Quelltext stand der Riegel da und sah richtig aus.** Eine Textsuche hätte
ihn bestätigt. Gemessen wird er jetzt im echten Browser — beide Quellen, beide
Richtungen.

### ⚠ Und der Anker, der den Anfang eines anderen trifft — zum vierten Mal

Der Studio-Wächter „sie schaltet in BEIDE Richtungen" suchte
`delete neu.wartung` **ohne Semikolon** — und traf damit auch
`delete neu.wartungSeit`, das eine Zeile weiter steht. Er blieb grün, als die
Aus-Richtung ausgebaut war. *Ein Name, der der Anfang eines anderen ist, wird
mitgefangen*; die Falle steht netzweit dreimal aufgeschrieben.

### ⚠ Und eine Sabotage, die den Riegel nicht erreicht, misst nichts

Der Gegenprobe-Fall „die Sperre geht der Wartung nicht mehr vor" hängte zuerst
`|| handAmpel === "rot"` an die Wartungs-Bedingung — **wirkungslos**, weil der
rot-Zweig **darüber** steht und den Fall längst gefangen hat. *Die Reihenfolge
IST der Riegel*, also dreht die Sabotage sie um.

### Geprüft

```bash
node tests/smoke_wartung.mjs              # echter Browser: verschwindet und kommt zurück
node tests/smoke_stufe3_waechter.mjs      # der nächtliche Lauf, Fall 7c
node tests/smoke_statische_listen.mjs     # das Bau-Werkzeug, vier Lagen
node tests/smoke_studio_markt.mjs         # der Knopf im Studio
bash tests/gegenprobe_wartung.sh          # 14 Fälle über alle vier Stellen
```

⚠ **BENANNTE GRENZE:** `smoke_studio_markt.mjs` ist eine **Struktur**-Probe, sie
liest den Quelltext. Ob ein Klick im Studio wirklich schaltet, ist damit **nicht**
gemessen — gemessen ist die Wirkung dort, wo sie zählt: im Marktplatz, im echten
Browser.

⚠ **BENANNTE GRENZE:** statisch wirkt die Wartung erst nach dem nächsten
nächtlichen Lauf (02:40 UTC), weil `tools/statische-listen.mjs` nur
`spore-stand.json` liest. Im Browser wirkt sie **sofort**. Das Aufblitzen einer
Karte für den Bruchteil einer Sekunde ist der Preis; ein zweiter Leseweg im
Bau-Werkzeug wäre eine zweite Quelle für dieselbe Frage — und genau die hat oben
den Riegel gebrochen.

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
