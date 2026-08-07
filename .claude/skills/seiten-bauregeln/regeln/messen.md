# Regeln fürs Messen und Prüfen

> Lies das hier, bevor du eine Leistungs-Zahl **nennst**, **vergleichst** oder
> **verbesserst** — und immer, wenn jemand fragt „warum ist X langsamer als Y".

## Das eine Werkzeug

```bash
cd /home/user/family-project
node tools/lh-messen.mjs <seite.html> [--desktop|--beides] [--trace] [--laeufe=3]

# ein anderes Repo messen, ohne das Werkzeug zu kopieren:
LH_ROOT=/home/user/SB-KIMTool-Point node tools/lh-messen.mjs index.html --beides
```

**Bau kein zweites Messwerkzeug.** Am 2026-08-03 lagen kurzzeitig zwei fast
identische Kopien nebeneinander; zwei Werkzeuge, die dasselbe tun, driften
auseinander und man weiß nicht mehr, welcher Zahl man glaubt. Fehlt dir eine
Fähigkeit, **erweitere dieses eine** (so kam `--desktop` dazu).

Warum der Prüfserver so gebaut ist, wie er ist — steht im Kopf der Datei und ist
teuer erkauft: **gzip an** (sonst misst man den Prüfserver statt der Seite),
**keine Cache-Kopfzeilen** (Klaus' Caddy setzt auch keine), **Lighthouse selbst
drosseln lassen** (ein eigener Messaufbau misst ungedrosselt 0).

---

## Regel 1 — Handy UND Computer messen. Immer beide.

Klaus (2026-08-06): *„Es gibt zwei gemessene Werte."* PageSpeed zeigt beide, und
sie liegen oft weit auseinander — **in beide Richtungen**.

Der verbreitete Irrtum ist, den Computer für „dieselbe Seite, nur schneller" zu
halten. Das stimmt nicht. Lighthouse ändert mit dem Gerät auch die
**Fensterbreite**:

| | Handy | Computer |
|---|---|---|
| Fenster | 412 × 823 | 1350 × 940 |
| Prozessor-Drosselung | 4× langsamer | keine |
| Leitung | langsames 4G | schnell |

**Jede Regel, die an der Fensterbreite hängt — CSS-Umbruch, `matchMedia`, ein
`max-width`-Schalter — macht daraus zwei verschiedene Seiten.**

### Der belegte Fall: Tomys Hub

Klaus' Beobachtung war: Handy sehr gut, Computer sehr schlecht — unerklärlich,
weil der Computer doch schneller lädt.

Gemessen (2026-08-06):

| Seite | Handy | Computer | Blockierzeit Handy → Computer | WebGL-Hintergrund? |
|---|---|---|---|---|
| Tomys Hub (Wurzel) | **85** | **68** | 580 ms → **4.430 ms** | ja |
| Tomys Schaufenster | **99** | **69** | 0 ms → **4.840 ms** | ja |
| Tomys WorkFloh | 93 | **100** | 150 ms → **10 ms** | **nein** |

Der Computer lädt tatsächlich schneller — Ladezeit 0,5 s gegen 1,6 s, genau wie
Klaus erwartet. Er scheitert an etwas anderem: an der **Blockierzeit**.

**Die Ursache:** `tomy-ui/mycel-bg.js` schaltet den three.js-Hintergrund unter
700 px Fensterbreite **komplett ab** (`data-kein-handy-hintergrund`). Das Handy
misst also eine Seite **ohne** WebGL, der Computer eine **mit** — auf einer
3,7-mal größeren Fläche.

**Gegenprobe** (Grenze auf 5000 px gesetzt, Hintergrund also auch am Computer
aus): **69 → 100**, Blockierzeit 3.750 → 0 ms. Damit ist die Ursache belegt,
nicht vermutet.

Die dritte Zeile ist der Kronzeuge: **Tomys WorkFloh trägt den Hintergrund gar
nicht und erreicht am Computer 100** — im selben Repo, mit demselben Gerüst.

> **Einordnung, die dazugehört:** die Messung läuft **ohne Grafikkarte**
> (Software-Rendering). Ein echter Besucher mit Grafikkarte zahlt deutlich
> weniger. Aber PageSpeed misst auch ohne — der schlechte Wert, den Klaus sieht,
> ist also echt und bleibt, solange der Hintergrund am Computer läuft.

### Was daraus folgt

Wenn du etwas auf einer Bildschirmgröße abschaltest, um dort schneller zu
werden: **du hast das Problem nicht gelöst, du hast es verschoben.** Miss die
andere Größe, bevor du „behoben" meldest.

### Der Normalfall — und die zwei Ausreißer

Ganzes Netz, beide Geräte, 2026-08-06 auf derselben Maschine gemessen.
**Achtung, das sind LOKALE Werte** (siehe Regel 1b) — sie taugen zum Vergleich
der Seiten untereinander, nicht als Aussage darüber, was Google sieht. Bei
Mein-WorkFloh lag PageSpeed am selben Tag bei **79 statt 95**:

| Seite | Handy | Computer | Ladezeit H → C | Blockierzeit H → C |
|---|---|---|---|---|
| Muttis Rezeptbuch | 48 | **90** | 8,7 → 1,5 s | 370 → 0 ms |
| Sage-Protokol | 69 | **96** | 7,1 → 1,4 s | 150 → 0 ms |
| SB-KIMTool-Point | 86 | **96** | 3,8 → 0,7 s | 40 → 0 ms |
| Mein-WorkFloh | 95 | **100** | 2,1 → 0,5 s | 190 → 0 ms |
| Tomys WorkFloh | 93 | **100** | 2,9 → 0,6 s | 150 → 10 ms |
| **Tomys Hub (Wurzel)** | 85 | **68** ⚠ | 1,6 → 0,5 s | 580 → **4.430 ms** |
| **Tomys Schaufenster** | 99 | **69** ⚠ | 2,3 → 0,6 s | 0 → **4.840 ms** |

**So sieht der Normalfall aus:** der Computer ist deutlich besser, genau wie man
es erwartet — Muttis +42, Sage +27, Point +10.

**Genau zwei Seiten drehen das um.** Beide tragen den WebGL-Hintergrund. Die
dritte Seite desselben Repos (Tomys WorkFloh) trägt ihn nicht und erreicht am
Computer **100**. Ein sauberer Beweis innerhalb eines einzigen Repos, mit
demselben Gerüst und derselben Bau-Maschine.

Bei allen anderen Seiten liegt die Blockierzeit am Computer bei **0 ms** — bei
den beiden Ausreißern bei über **4.400 ms**.

> **Nebenbefund, nicht übersehen:** bei SB-KIMTool-Point ist der **Layout-Sprung
> am Computer schlechter** als am Handy (0,103 gegen 0,052) — die
> `min-height`-Reservierung greift dort, wo die Leiste umbricht, aber nicht am
> breiten Fenster. Auch das findet man nur, wenn man beide misst.

---

## Regel 1b — Lokale Messung ist ein Hinweis. PageSpeed ist der Beweis.

**Das hier ist teuer gelernt (2026-08-07).** Eine Änderung an Mein-WorkFloh maß
lokal **77 → 95**. Gemeldet als Erfolg. Klaus hat danach PageSpeed laufen lassen:
**79 — genau wie vorher.** Der Gewinn war draußen nicht angekommen.

**Warum die beiden auseinandergehen:** der Prüfserver läuft auf derselben
Maschine und antwortet ohne jede Verzögerung. Lighthouse drosselt zwar Prozessor
und Leitung *simuliert*, aber alles, was **nebenher** über die Leitung geht —
allen voran der **Service-Worker-Vorrat** — kostet lokal fast nichts und draußen
Sekunden. Genau dort steckte der Fehler (siehe Regel 8).

**Verbindlich daraus:**

- **Nie einen Leistungs-Gewinn als Erfolg melden, den nur die lokale Messung
  zeigt.** Formuliere ehrlich: „lokal 97 — der Beweis ist der nächste
  PageSpeed-Lauf."
- Bei jeder Änderung, die **Ladeverhalten** betrifft, gehört ein **Vorher-Wert
  aus PageSpeed** dazu — der aus `forschung/messreihe.json` reicht.
- Lokal misst **Richtung und Ursache** verlässlich (welches Element, welche
  Datei, welcher Zeitpunkt). Die **Punktzahl** ist es nicht.
- Weicht Lokal stark von PageSpeed ab, ist das ein **Befund**, kein Rauschen:
  irgendetwas kostet draußen, was lokal gratis ist. Such nach Bytes, die
  nebenher fließen.

**Wie der Fall ausging — denn die Regel warnt, sie entmutigt nicht.** Die
Abweichung war der entscheidende Hinweis. Gesucht wurde nach „Bytes, die
nebenher fließen", gefunden wurde der Service-Worker-Vorrat (Regel 8 in
[`skripte.md`](skripte.md)): 400 KiB PDF-Bibliothek, geholt 51 ms nach dem
Laden. Nach dem Fix bestätigte PageSpeed **79 → 98** am Handy (2026-08-07,
20:12). Gelöst hat es **nicht** die lokale Punktzahl, sondern eine
**server-seitige Zeitmessung**: *wann* wird die Datei geholt.

## Regel 2 — Drei Runden, im Wechsel

Die Zahl schwankt auf der Bau-Maschine um mehrere Punkte. Belegt: derselbe
unveränderte Stand ergab 94 · 78 · 94 — der 78er war ein Aussetzer der Maschine,
kein Befund.

**Immer** alt und neu **abwechselnd** messen, mindestens drei Runden. Dann
treffen Schwankungen beide Stände gleich. Nenne die Einzelwerte, nicht nur einen
Mittelwert — Klaus sieht dann selbst, wie sicher die Zahl ist.

```
alt 72 · 76 · 77 · 78 · 79    neu 92 · 92 · 95 · 96 · 96     ← überzeugt
alt 79                        neu 95                          ← beweist nichts
```

## Regel 3 — Erst herausfinden, welche Kennzahl weh tut

Die Gesamtnote sagt nicht, **woran** es liegt. Sieh dir immer die Einzelwerte an:

| Kennzahl | heißt | typische Ursache |
|---|---|---|
| **LCP** (Ladezeit) | wann das größte Element steht | zu große Bilder, blockierende Skripte, doppeltes Laden |
| **TBT** (Blockierzeit) | wie lange der Hauptthread blockiert war | zu viel Rechenarbeit: WebGL, große Schleifen, viele Skripte |
| **CLS** (Layout-Sprung) | wie stark die Seite gesprungen ist | Bilder ohne Maße, später eingehängte Elemente, Umbrüche |
| **FCP** | wann das *erste* Pixel kam | riesiges HTML-Dokument, blockierendes CSS |

Steht FCP schon bei 8,8 s, ist kein Bild schuld — dann ist das **Dokument
selbst** zu groß (Muttis Rezeptbuch: 2 MB `index.html`).

## Regel 4 — Beim Layout-Sprung sagt nur der Trace die Wahrheit

Der Bericht nennt bestenfalls `body > main`. Das hilft nicht. `--trace` nennt die
**Knoten mit Koordinaten**, vorher und nachher:

```
node 47  alt[18,114,59,9]  neu[18,106,113,34]  Δh=25
```

Daran sieht man: ein Element wuchs von 59×9 auf 113×34. So wurde bei Point das
Siegel-Abzeichen gefunden, das Modul 16 erst nach dem Laden einhängt.

Noch genauer geht es mit zwei Messungen im Browser — Geometrie bei
`domcontentloaded` und nach 4 s vergleichen, dazu die Kindelemente auflisten.
Das nennt die **eine** Zeile, die den Sprung verursacht.

## Regel 5 — Bricht die Messung ab, ist das ein Befund

`Protocol error … Execution context was destroyed` heißt: **die Seite hat sich
während der Messung neu geladen.** Kein Werkzeugfehler — such nach
`location.reload()`, `controllerchange`, Weiterleitungen. Bei Mein-WorkFloh war
genau das der erste Fund (1,6 s verschenkt).

## Regel 6 — Vorbestehende Fehler ehrlich trennen

Bevor du „Tests grün" meldest: lauf sie **auf dem unveränderten Stand**
(`git stash`). Bei Point waren 2 von 148 Proben rot — **schon vorher**. Das
gehört in den Bericht, und zwar so: „146/148, unverändert, die zwei roten waren
schon auf `origin/main` rot (gegengeprüft)."

Niemals eine vorbestehende Störung als eigene ausgeben. Und niemals eine eigene
als vorbestehend abtun, ohne es geprüft zu haben.

## Regel 7 — Die nächtliche Messreihe kennen

`family-project/forschung/messreihe.json` enthält für jede Seite im Netz den
Verlauf mit **Googles echten Werten** und den gemeldeten Mängeln. Sieh dort
zuerst nach: Googles Zahl weicht regelmäßig ein paar Punkte von der lokalen ab
(andere Maschine), aber die **Mängelliste** ist Gold — sie sagt dir, wonach du
suchen musst, bevor du selbst misst.

```bash
python3 -c "
import json; d=json.load(open('forschung/messreihe.json'))
v=d['reihen']['markt-workfloh']; print(v['name'], v['url'])
for p in v['punkte']: print(p['von'], p['leistung'], p.get('mangel'))"
```

**Die Messreihe ist eine HANDY-Reihe** (Befund 2026-08-07). Beide Messwege
lieferten von Anfang an Handy-Werte — PageSpeed über `strategy=mobile`,
Lighthouse über seine eigene Voreinstellung —, aber bis zum 2026-08-07 stand es
in keinem Punkt. Seither trägt jeder Punkt ein Feld `geraet`. Wer eine Zahl von
dort neben eine eigene Computer-Messung legt, vergleicht Ungleiches: an
Muttis Rezeptbuch lagen Handy und Computer am selben Tag bei **44 gegen 87**,
an Sage-Protokol bei **71 gegen 97**.

## Regel 7b — Eine einzelne PageSpeed-Zahl trägt keine Rangfolge

Auch PageSpeed streut. Nicht wenig: Jasons-Tresor lieferte an drei Tagen ohne
einen einzigen Commit **83 · 64 · 97**. Deshalb gilt in der Forschungsstation
seit dem 2026-08-06, dass ein Sprung erst zählt, wenn ihn die **nächste**
Messung hält (`tools/forschung.mjs`, Verdachts-Verfahren).

Der belegte Fehlschluss (2026-08-07): family-projekt.de stand um 03:43 Uhr bei
**80**, am Abend bei **66**, und dazwischen hatte sich an der Seite **kein Byte**
geändert. Aus der 66 wurde im Brief *„jetzt die schwächste Seite im Netz"* — ein
Satz, den ein einzelner Lauf nicht trägt.

**Also:** bevor eine Seite zum Ziel erklärt wird, zwei Läufe je Gerät, und den
Wert der Messreihe danebenlegen. Ein Unterschied, der beim zweiten Mal weg ist,
war Rauschen, kein Befund.

## Abhakliste

- [ ] mit **dem einen** Werkzeug gemessen, kein zweites gebaut
- [ ] **beide** Geräte (`--beides`)
- [ ] Gewinn **nicht** als Erfolg gemeldet, solange nur die lokale Messung ihn zeigt
- [ ] Vorher-Wert aus PageSpeed (`forschung/messreihe.json`) danebengelegt — und
      geprüft, dass er **dasselbe Gerät** meint (`geraet`)
- [ ] keine Seite allein wegen **einer** PageSpeed-Zahl zum Ziel erklärt
- [ ] mindestens drei Runden **im Wechsel** alt/neu
- [ ] Einzelwerte genannt, nicht nur einen Mittelwert
- [ ] die schuldige Kennzahl benannt (LCP · TBT · CLS · FCP)
- [ ] bei CLS: `--trace` gelaufen, Knoten benannt
- [ ] vorbestehende Fehler gegengeprüft und als solche gekennzeichnet
- [ ] was **nicht** geholfen hat, steht auch im Bericht
