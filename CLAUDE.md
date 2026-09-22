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

## ⏱ DIE MESSUNG STAND SIEBEN TAGE — und die Reihenfolge war nicht schuld (Klaus 2026-09-18)

Klaus: *„Ich sehe, dass im Family Project die letzten vier nicht gemessen
wurden, schon mehrere Tage. Und genauso in PWA Toolpoint. … Die Reihenfolge der
Messung sollte festgeregelt werden, sonst werden die ja nie gemessen."*

**Der Befund stimmte, die vermutete Ursache nicht.** Nachgerechnet an den echten
Daten standen die vier nie gemessenen Einträge auf den **Plätzen 1 bis 4** — sie
wären sofort drangekommen. `reihenfolge()` sortiert seit jeher nach ältestem
Messdatum, nie Gemessene mit `""` ganz vorn.

**Gestorben ist der nächtliche LAUF.** Sechs Nächte in Folge (Läufe 44–49,
12.–17.09.), jedes Mal mit `Cannot find package 'playwright'` — **nach** der
Messung (*„12 gemessen, 2 veraltet"*) und **vor** dem Commit. Die Arbeit war
jede Nacht getan und jede Nacht weg. Das letzte Messdatum aller vierzehn
Einträge war deshalb der **11.09.**

### Die Ursache: zwei `npm install --no-save` hintereinander

Dieses Repo hat **keine `package.json`**. Ein nicht gespeichertes Paket gilt beim
nächsten `npm install` deshalb als überzählig und wird **entfernt**. Der Schritt
„Lighthouse bereitstellen" räumte also jede Nacht `playwright` weg.

**Gemessen am 2026-09-18, nicht vermutet:**

| | `node_modules` danach |
|---|---|
| `npm install A --no-save` ; `npm install B --no-save` | **nur B** |
| `npm install A B --no-save` | **A und B** |

⚠ **UND PWA TOOLPOINT STAND DAMIT STILL MIT.** Es misst nicht selbst, sondern
liest `family-project/forschung/messreihe.json`. **Eine Ursache, zwei
Symptome** — genau wie Klaus es an beiden Seiten gesehen hat.

### ⚠ Ein Lauf, der mittendrin stirbt, wirft weg, was er schon getan hat

Das ist die Lehre über den Einzelfall hinaus, und sie steht in Kimhubs
Verfassung an anderer Stelle schon: die Messung lief durch, die Zahlen lagen
vor, und weil ein **späterer** Schritt starb, kam der Commit nie dran.

Deshalb steht jetzt **vor** der Arbeit ein Schritt „Werkzeuge nachzählen", der
mit einer Meldung abbricht, die den Grund nennt, statt mit einem Stacktrace
nach getaner Arbeit. *Was die Arbeit voraussetzt, wird geprüft, bevor gearbeitet
wird.*

⚠ **Lighthouse darf weiter fehlen** (Stufe 5, Weg A) — dann wird nicht gemessen
und der Bericht sagt ehrlich „nicht gemessen". Der Rückfall hinter `||` holt in
dem Fall wenigstens `playwright`: ohne das stünde die ganze nächtliche Arbeit
still, nicht nur die Messung.

### ⚠ Ein Wächter auf die Reihenfolge allein wäre sechs Nächte grün gewesen

`tests/smoke_messreihenfolge.mjs` misst deshalb **beides**: die Sortierung (die
stimmte) und die Voraussetzung dafür, dass sie überhaupt je angewandt wird (die
fehlte). Dazu die Zusicherung, um die Klaus gebeten hat, an den **echten**
Daten: *jeder nie gemessene Eintrag kommt im nächsten Lauf dran.*

Und ein Gegenprobe-Fall stellt **genau Klaus' vermutete Ursache** nach — ein
Deckel, der für die Alten reicht, aber nicht für alle Neuen. Er schlägt an:
*„jeder NIE gemessene Eintrag kommt im nächsten Lauf dran → markt-pwa-toolpoint"*.

```bash
node tests/smoke_messreihenfolge.mjs        # 10 grün · 0 rot
bash tests/gegenprobe_messreihenfolge.sh    # 6 schlagen an · 0 blind · 0 tote Anker
```


## 🔎 DIE MESS-LISTE WIRD GEFUNDEN, NICHT GEPFLEGT (2026-09-21)

Der Befund kam aus dem SEO-Plan für PWA Toolpoint: **dieser Marktplatz misst
nicht selbst.** Er *holt* seine Zahlen aus `forschung/messreihe.json`. Steht ein
Eintrag dort nicht, gibt `juengsteMessung()` nichts zurück, und seine
Detailseite bleibt leer — also genau die dünne Seite, gegen die der ganze Plan
gebaut ist.

**Nachgezählt am 2026-09-21, nicht geschätzt:** von 29 Einträgen bei PWA
Toolpoint hatte **einer** keine Messreihe (`eigen-kim-hub-company`). Die anderen
28 tragen dieselbe Kennung wie ein Eintrag hier im Marktplatz oder in
`forschung/messziele.json` und werden dadurch längst gemessen.

⚠ **HEUTE EIN EINZELFALL, MORGEN DIE REGEL.** Jeder fremde Eintrag, den Klaus
bei PWA Toolpoint freigibt, steht **nur** dort. Eine von Hand gepflegte
Mess-Liste macht dabei denselben Fehler wie ein vergessener Eintrag — nur
dauerhaft, und niemand merkt es, weil eine gepflegte Liste immer vollständig
*aussieht*. Dieselbe Lehre wie beim Kanon-Verteiler in Sage, wo genau das am
2026-09-14 BookLedgerPro aus einem Rollout hat fallen lassen.

`tools/lib/fremdmarkt.mjs` liest deshalb die Liste des fremden Marktes und hängt
die Einträge, die **niemand** misst, an `--messen` an.

### ⚠ Die Netz-Adresse ist die ausgelieferte SEITE, nicht das Depot

Mein erster Anlauf nahm `raw.githubusercontent.com/…/PWA-Toolpoint/main/…` und
bekam **HTTP 404**. Kein Tippfehler: das Depot steht auf **privat** (über die
GitHub-API nachgesehen, `"private": true`), und `raw` gibt einem privaten Depot
ohne Token genau diese 404. Zum Vergleich in derselben Messung: family-projects
eigene `messreihe.json` über `raw` antwortet mit **200**.

Die Seite wird trotzdem ausgeliefert — dieselbe Lage, die in Kimhubs Verfassung
unter *„PRIVAT STELLEN IST EIN HALBER SCHRITT"* steht. **Der Plan hatte es
vorgegeben** (*„gelesen aus der öffentlich ausgelieferten `listings.js`"*), und
ich bin daran vorbeigebaut. Genommen wird jetzt `pwa-toolpoint.de`.

⚠ **BENANNTE GRENZE:** aus dem Behälter einer Sitzung ist diese Adresse **nicht**
erreichbar (der Ausgangs-Proxy sperrt sie, gemessen HTTP 000). Der Netz-Weg ist
deshalb nur an einem **gestellten Server** gemessen — die Mechanik, nicht die
Adresse. Ob sie im GitHub-Lauf antwortet, sagt erst der erste nächtliche Lauf;
tut sie es nicht, steht „Liste nicht erreichbar" im Protokoll, statt dass etwas
still fehlt.

### Drei Riegel, und jeder hat seinen eigenen Schaden

| | |
|---|---|
| **Nichts wird überstimmt** | eine Kennung, die in `messziele.json` steht, wird übersprungen — **auch mit `aktiv: false`**. Dort hängen Entscheidungen mit Begründung dran (*„steht seit 2026-09-13 selbst im Marktplatz und wird dort gemessen"*). Ein gefundenes Ziel, das eine davon still wieder anschaltet, wäre der leiseste Weg, eine Entscheidung zurückzunehmen |
| **Nichts wird doppelt gemessen** | der eigene Marktplatz zählt mit in die Menge „misst schon jemand". Ohne diese Hälfte liefe dieselbe Adresse zweimal je Nacht durch die Messung, und die Reihe bekäme für denselben Tag zwei Punkte aus zwei Wegen |
| **Fail-soft, ausnahmslos** | kommt der fremde Markt nicht herein, wird das **gesagt** und mit den eigenen Zielen weitergemessen. Es wird nie geworfen. Der Grund steht eine Überschrift weiter oben: dieser Lauf ist im September sechs Nächte hintereinander gestorben, und die Arbeit war jedes Mal weg |

⚠ **UND DAS FINDEN ALLEIN NÜTZT NICHTS.** Ein Ziel, das zwar in der Liste steht,
aber hinter dem Deckel liegt, wird trotzdem nie gemessen. Es trägt, weil
`reihenfolge()` nie Gemessene ganz vorn einsortiert — **gemessen an genau diesem
Fall:** beim ersten Lauf stand `Kim Hub Company` auf Platz 1.

### ⚠ Ein Wächter war blind, und gefunden hat ihn nur das Nachstellen von Hand

*„Der Lauf fragt die fremden Märkte überhaupt"* suchte `PWA Toolpoint` im
Protokoll — und traf ein **Mess-Ziel**, das zufällig so heißt
(`Auslieferungsprüfer (PWA Toolpoint)`). Er wäre grün geblieben, während gar
nichts gefragt wurde. Der Gegenprobe-Lauf hat es **nicht** gemeldet: der Fall
fiel über den Zähler daneben und galt damit als gefangen.

> *„Gefangen" allein ist keine Messung.* Die Zahl sagt, ob die Probe rot wird —
> nicht, ob die rote Zeile den Namen ihrer Zusicherung trägt. Gemessen wird
> jetzt die **Meldung dieses Blocks**, die kein Ziel-Name tragen kann.

### Geprüft

```bash
node tests/smoke_fremdmarkt.mjs           # 27 grün · 0 rot
bash tests/gegenprobe_fremdmarkt.sh       # 16 schlagen an · 0 blind · 0 tote Anker
node tools/forschung.mjs --messen         # FORSCHUNG_MAX=0 macht daraus einen Trockenlauf
```

Vier Fälle zusätzlich **von Hand** nachgestellt und die roten Zeilen gelesen;
einer davon hat den blinden Wächter oben ans Licht gebracht.

⚠ **FÜNF PROBEN DIESES DEPOTS SIND ROT, UND KEINE DAVON GEHÖRT DIESER ARBEIT.**
Gemessen am 2026-09-21 gegen einen Auszug von `origin/main` mit verwiesenem
`node_modules` — **zahlengleich** in beiden Bäumen: `smoke_all` 121/122 ·
`smoke_start` 13/15 · `smoke_markt_vecpack` 6/3 · `smoke_stufe5_messung` 152/1 ·
`smoke_wortkarte` stürzt ab. Eingereiht, nicht nebenbei repariert.

⚠ **Und `smoke_wortkarte` ist OHNE `node_modules` grün und MIT rot** — der
Auszug ohne Pakete meldete „4 grün, 0 rot, 1 nicht lauffähig". Das ist kein
Befund über den Code, sondern einer über die Umgebung, und er steht hier, damit
die nächste Sitzung nicht denselben Vergleich zweimal falsch zieht.

## 🔘 DIE KNÖPFE EINER KARTE SIND EINE FAMILIE (Klaus 2026-09-22)

Klaus mit Bild: *„Die Button in Family Project Einzelheiten und zur Seite so
fett sein. Bei Einzelheiten steht der Pfeil unten unter dem Wort und bei zur
[Seite] links. Macht bitte einheitlich die Höhe. Maximal so hoch wie Bewertung
nachlesen. Genauso den Meldebutton auch nicht so eine bombenfunktionösen,
riesigen Button machen."* Und gleich danach: *„Und Einzelheiten steht auch
nicht in der Mitte vom Button. Vielleicht musst du auch den Pfeil gar nicht
mit reinmachen."*

**Gemessen über fünf Breiten, nicht geschätzt:**

| Breite | „Bewertung nachlesen" | „Einzelheiten →" | „→ Zur Seite" |
|---|---|---|---|
| 380 px | 44 px, 1 Zeile | **65 px, 2 Zeilen** | 60 px, 2 Zeilen |
| 412 px | 44 px | **65 px** | 60 px |
| 900 px | 44 px | **65 px** | 60 px |
| 1280 px | 44 px | **65 px** | 60 px |
| 560 px | 44 px | 46 px, 1 Zeile | 44 px, 1 Zeile |

⚠ **VIER VON FÜNF BREITEN BRACHEN UM, und die fünfte ist der Grund für die
eigene Probe.** Bei 560 px steht die Karte einspaltig und breit — dort war
auch vorher alles einzeilig. **Ein Wächter, der nur eine Breite misst, hätte
den Befund nie gemacht**; dieselbe Falle hat in PWA Toolpoint am 2026-09-11
einen Wächter bei 1280 px blind gelassen. Ein **Selbst-Riegel** besteht
deshalb darauf, dass mindestens eine gemessene Breite eine schmale Karte
ergibt.

### Drei Knöpfe, die gleich aussehen sollen, brauchen EINE Regel

Vorher stand die Schrift an **zwei** Stellen (`.listing .ext` und
`.listing .mk-ms-btn`) und „Einzelheiten" an **gar keiner** — es erbte `.btn`
mit `.96rem` und `13px 22px` und war damit als einziges anders. Genau das misst
`smoke_stufe5_messung` seit dem 2026-08-01 (C2d/C2e: gleiche Schrift, gleiches
Polster, gleiche Rundung) — nur eben an zwei von drei Knöpfen.

| | vorher | nachher |
|---|---|---|
| Höhe (alle drei) | 44 · 65 · 60 px | **37 · 37 · 37 px** |
| Umbruch | 2 Zeilen | **1 Zeile, über alle Breiten** |
| Ausrichtung | links | **mittig** |
| Melde-Knopf | 68 × 44 px | **52 × 44 px** |
| Pfeil | „Einzelheiten →" · „→ Zur Seite" | **keiner** |

### ⚠ Die Höhe des Melde-Knopfes kann NICHT unter 44 — und das hat eine Probe gesagt

Mein erster Anlauf setzte ihn auf 52 × **37**, damit alle vier gleich hoch
sind. `smoke_markt_melden` wurde prompt rot: *„Klickfläche mindestens 44×44
(52×37)"*. Der Wächter steht dort seit langem und hat recht — **ein Knopf, den
ein Finger nicht sicher trifft, ist kein kleinerer Knopf, sondern ein
schlechterer.** Kleiner geworden ist er deshalb in der **Breite**: 68 → 52 px,
ein Viertel schmaler, dazu leichterer Schatten und kleinere Schrift. Das
Dreieck wird dadurch spitzer statt wuchtiger.

⚠ **Der `clip-path` ist neu gerechnet, nicht gequetscht.** Sein eigener
Kommentar verlangt es: *„Maße fest 68×44, weil path() in absoluten Pixeln
rechnet. Wer die Größe ändert, MUSS den Pfad neu rechnen."* Die Rechnung steht
jetzt daneben — Ecken, Längen, Einheitsvektoren.

### ⚠ Vier eigene Fehler, alle in der MESSUNG — keiner im Code

Das ist der Befund dieses Durchgangs, und er gehört so aufgeschrieben: **der
Code stand nach dem ersten Bau; viermal falsch war die Prüfung.** Gefunden hat
sie kein Nachdenken, sondern die Gegenprobe und das Lesen der roten Zeilen.

| Was | warum es nichts (oder das Falsche) maß |
|---|---|
| `white-space:nowrap` | **am Bestand nicht messbar.** Mit dem kleineren Polster passt „Einzelheiten" ohnehin in jede Karte — nimmt man den Riegel heraus, ändert sich nichts. *Ein Riegel, den keine Probe von seinem Fehlen unterscheiden kann, ist eine Behauptung.* Gemessen wird er jetzt an einer **gestellten Lage**: ein langer Text muss einzeilig bleiben |
| „der Knopf ragt aus der Karte" | **kann mit `flex-wrap` nie eintreten** — die Reihe bricht um, statt überzustehen. Mein Fall-Name log |
| „ohne `flex-wrap` ragt es hinaus" | **blind, und der Grund ist der eigentliche Fund:** `.btn` trägt `overflow:hidden`, also darf ein Flex-Kind unter seine Textbreite schrumpfen (`min-width:auto` = 0). Der Knopf ragt **nicht** hinaus, sein Text wird **still abgeschnitten** — die schlimmere Sorte, weil man sie nicht sieht. Gemessen wird jetzt `scrollWidth > clientWidth` |
| „alle Knöpfe sind gleich hoch" | **strukturell blind gegen eine Polster-Änderung:** seit die drei in EINER Regel stehen, wachsen sie gemeinsam, und „gleich hoch" bleibt wahr. Daneben steht jetzt ein **Nagel** (höchstens 40 px), ausdrücklich als Nagel benannt — 37 ist der Stand, 43 wäre das alte Polster |

⚠ **UND EIN WÄCHTER MASS `undefined`.** „… nicht mehr so breit wie früher"
las `m.melde.w`, und meine Mess-Funktion gab keine Breite zurück.
`undefined <= 56` ist `false`, also wurde er rot statt still durchzugehen —
diesmal hat die Richtung gestimmt.

⚠ **UND DAS DEUTSCHE ANFÜHRUNGSZEICHEN HAT ZUM VIERTEN MAL EINEN STRING
BEENDET.** `"… „Einzelheiten""` in einer JS-Zeichenkette → `SyntaxError`. Die
Falle steht in PWA Toolpoints Verfassung dreimal; `node --check` meldet sie in
Sekunden.

### Ein Wächter, der einen Fund gemacht hat, den ich übersehen hatte

Die Probe sucht den Pfeil im **ganzen** `markt.html` — und fand ihn zweimal
weiter: der Erklärtext im Bewertungs-Fenster nennt den Knopf beim Namen
(*„Der Knopf »→ Zur Seite« führt auf ein Schaufenster …"*), und ein Kommentar
zitierte ihn ebenso. **Und die englische Fassung war schon vorher falsch** —
sie sprach von *„Visit site"*, während der Knopf *„Open site"* heißt. Beides
nachgezogen.

### Geprüft

```bash
node tests/smoke_kartenknoepfe.mjs          # echter Browser, fünf Breiten
bash tests/gegenprobe_kartenknoepfe.sh      # sabotiert in einer SICHERUNG, nicht per git checkout
```

Zuletzt gemessen (2026-09-22): **83 grün · 0 ROT** · Gegenprobe **10 schlagen
an · 0 blind · 0 aus falschem Grund · 0 tote Anker**, jeder Fall von Hand
nachgestellt und die rote Zeile gelesen. `smoke_markt_melden` wieder **33 grün**,
`smoke_stufe5_messung`, `smoke_statische_listen`, `smoke_sitemap` unverändert.

⚠ **Die Zahlen davor bleiben daneben stehen, weil sie die Funde gemacht
haben:** derselbe Durchgang meldete zuerst **7 schlagen an · 1 blind · 2 aus
falschem Grund**, dann **9 · 1 · 0**, dann **9 · 0 · 1**. Nur die letzte zu
nennen hieße, die Befunde durch ihre Reparatur zu ersetzen.

⚠ **BENANNTE GRENZE:** bei 900 px Fensterbreite ist eine Karte nur 276 px
breit, und dort passen drei Knöpfe rechnerisch nicht in eine Reihe — der
Melde-Knopf rutscht in eine zweite. Jeder Knopf bleibt dabei einzeilig und
gleich hoch. Die Alternative wäre eine Schrift unter 10 px, und die kann
niemand lesen.

⚠ **Cache-Bump v126 → v127**, an **78** Stellen, `ASSET_V` mitgezogen.

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
