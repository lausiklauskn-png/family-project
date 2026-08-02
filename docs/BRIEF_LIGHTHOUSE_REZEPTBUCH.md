# Sitzungsbrief — Lighthouse-Durchgang, nächste App: Mein Rezeptbuch

**Stand: 2026-08-02, 11:30 Uhr.** Frischer Start in neuem Kontextfenster.
Dieser Brief ist selbsterklärend — er setzt kein Wissen aus der Vorsitzung voraus.

---

## 0. Pflichtlektüre, bevor eine Zeile Code entsteht

1. **`family-project/docs/BRIEF_LIGHTHOUSE_VERBESSERUNGEN.md`** — die Arbeitsordnung
   für den ganzen Durchgang: Reihenfolge, was nicht reparierbar ist, die Fallen je Repo,
   und Abschnitt **5.1** (die Bildmaß-Falle, die schon zugeschnappt ist).
2. **Diesen Brief** (Stand + die konkrete Aufgabe).
3. **`CLAUDE.md` des Repos, an dem gearbeitet wird** — bei Rezeptbuch ist das Pflicht,
   nicht Kür (siehe § 3, die Fallen dort sind schärfer als bei Mixarium).

---

## 1. Was bereits erledigt ist

| App | was gemacht | PR |
|---|---|---|
| **Mein-Mixarium-Page** (Landingpage) | Bilder 1795 → 736 KiB · Bildmaße an 12 Bildern · 3D-Hintergrund wird nachgeladen statt fest eingebunden · Video `preload="none"` | `Mein-Mixarium-Page#11` |
| **Mein-Mixarium-Page** (Nachbesserung) | `height:auto` — die Bildmaße hatten die Bilder am Handy dreifach hochgezogen | `Mein-Mixarium-Page#12` |
| **Mein-Mixarium** (die PWA) | Icon 386 → 63 KiB · das falsche „SVG" 514 → 84 KiB · doppelte Downloads abgestellt → **3407 KiB (30 %) weniger bei einem Erstbesuch** | `Mein-Mixarium#177` |
| **family-project** | Bildmaß-Falle als Abschnitt 5.1 in die Arbeitsordnung | `family-project#171` |

Alle vier gemergt. **Ob die Punktzahlen steigen, zeigt erst die nächtliche Messung** —
das ist eine Messung, keine Behauptung.

---

## 2. Zwei Entscheidungen liegen bei Klaus — nicht selbst entscheiden

### 2.1 Die Briefkasten-Kette (größter verbliebener Hebel bei Mixarium)

Im Abhängigkeitsbaum der Mixarium-PWA steht als längste Kette **1682 ms**. Sie kommt vom
Briefkasten: beim Seitenstart fragt die App **fünf Nachbarknoten nacheinander** bei
`raw.githubusercontent.com` ab — nicht gleichzeitig, jeder wartet auf den vorigen.

Fundstelle: `Mein-Mixarium/index.html`, Funktion `sbkimMailboxCheck(silent)`, ausgelöst von
```js
window.addEventListener("DOMContentLoaded", () => { try { sbkimMailboxCheck(true); } catch {} });
```
Die Schleife darin ist `for (const peer of cfg.peers) { const sig = await sbkimMailboxFetch(peer.signal); … }` —
streng nacheinander.

**Was helfen würde:** die fünf Abfragen gleichzeitig (`Promise.all`), und erst nach `load`
statt mitten im Aufbau. Am Verhalten ändert sich nur, dass das Briefkasten-Zeichen einen
Moment später erscheint.

**Warum nicht einfach gemacht:** über dem Block steht im Quelltext ausdrücklich
`// === SBKIM-Briefkasten Logik (zero-dependency) — BYTE-GLEICH lassen ===`.
Er ist in mehreren Knoten identisch eingebaut. Nach der eigenen Regel repariert man so
etwas **im Kanon** und holt es von dort zurück — nicht in einer App im Alleingang.

**Klaus fragen:** netzweit im Kanon reparieren und ausrollen, oder erst in einem Knoten
ausprobieren und dann verteilen? Vorher **Drift messen** (§ 5.3) — womöglich sind die
Kopien längst auseinandergelaufen, dann ändert sich die Antwort.

### 2.2 Der Kontrast-Mangel bei Mixarium

Barrierefreiheit 96, ein einziger echter Mangel: „Das Kontrastverhältnis von Hintergrund-
und Vordergrundfarben ist nicht ausreichend." **Welche** Farbkombination gemeint ist, stand
in Klaus' Ausschnitt nicht mit dabei — den aufklappbaren Teil des Berichts abwarten, dann
gezielt beheben. Nicht raten.

### 2.3 Werden die richtigen Adressen gemessen? (aufgefallen, noch offen)

Von 14 Marktplatz-Einträgen messen **zwölf** die App selbst. Nur zwei messen eine
vorgeschaltete Landingpage: **Mixarium** und **Rezeptbuch** — die beiden, die überhaupt
eine eigene Page haben.

Folge: die Zahlen auf den Karten sind untereinander **nicht vergleichbar**. Bei Kimboard
steht die Bewertung des Werkzeugs, bei Mixarium die des Schaufensters davor. Ein Besucher
kann das nicht wissen.

Zwei Wege — **Klaus entscheidet**, weil es die Aussage der Karte verändert:
1. **So lassen.** Die Karte misst, wohin sie führt. In sich stimmig.
2. **Beides messen.** Für Einträge mit eigener Page zwei Werte holen und beide im Fenster
   zeigen. Ehrlicher, kostet im Werkzeug Arbeit und zwei Messläufe mehr pro Nacht.

Empfehlung der Vorsitzung: **2**, weil die App das ist, was die Leute am Ende benutzen.
Eilt nicht.

---

## 3. ▶ Die Aufgabe: Mein Rezeptbuch

Klaus' Messung vom 2026-08-02: **Leistung 55 · Best Practices ROT** (unter 50, im Ring mit
Ausrufezeichen) · SEO 100. Das rote Feld ist das auffälligste im ganzen Netz — bisher hatte
keine App unter „gute Praxis" weniger als 96.

> **Der vollständige Bericht kommt von Klaus.** Erst lesen, dann arbeiten. Die Vorarbeit
> unten ist eine **Spur**, kein Ersatz für den Bericht.

### 3.1 ⚠ Zuerst klären: welches Repo ist gemeint?

Es gibt **drei** Rezeptbuch-Repos, und sie werden regelmäßig verwechselt:

| Repo | was es ist |
|---|---|
| `Mein-Rezeptbuch` | **die PWA** — das ist die gemessene, Klaus' Bildschirmfoto zeigt die App |
| `Mein-Rezeptbuch-Page` | die Landingpage — **das** misst der Wächter für die Marktplatz-Karte |
| `Muttis-Rezeptbuch` | das Original, aus dem entwickelt wird |

Klaus' Messung zeigt die App-Oberfläche („Noch keine Rezepte") → **`Mein-Rezeptbuch`**.
Trotzdem am Anfang die gemessene Adresse im Bericht nachsehen und benennen.

### 3.2 ⚠⚠ Die Fallen bei `Mein-Rezeptbuch` — schärfer als bei Mixarium

**Falle 1 — der Default-Branch ist ein toter Köder.**
Der auf GitHub eingestellte Default-Branch ist **nicht** `main`, sondern ein alter
Vor-SBKIM-Branch. Automatisch angelegte Sitzungs-Branches zweigen davon ab und tragen
**kein SBKIM**. Wer den ausgecheckten Stand liest, kommt zu falschen Schlüssen — das steht
so in der Hausordnung des Repos, weil es schon mehrfach passiert ist.

```bash
git fetch origin main --quiet
git checkout -B <branch> origin/main     # IMMER so aufsetzen
```

**Falle 2 — `index.html` wird gebaut, nicht bearbeitet.**
```
QC_MeinRezb_24_04_26.html  +  _cr_block.txt   --python3 build.py-->   index.html
```
Änderungen gehören **ausschließlich** in die QC-Datei, danach `python3 build.py`.
Wer `index.html` von Hand anfasst, verliert es beim nächsten Bau.

**Pflicht-Checkliste des Repos** (muss in der Antwort ausgegeben werden):
```
✅ 1. QC-Datei geändert:   QC_MeinRezb_*.html      ← erledigt
✅ 2. index.html:          neu gebaut via build.py ← erledigt
```

**Falle 3 — Bildmaße ohne `height:auto`.** Siehe Arbeitsordnung § 5.1. Ist bei Mixarium
schon einmal zugeschnappt und hat die Handy-Ansicht zerstört, während die Messzahl stieg.

**Falle 4 — `sbkim/*.js` sind Kanon-Kopien.** Nicht verkleinern, nicht aufräumen. Ein
Mangel darin wird in Sage repariert und von dort zurückgeholt.

### 3.3 Vorarbeit — was schon gemessen ist (Stand `origin/main`)

**Der mit Abstand größte Posten: die Datei selbst.**

| | Größe |
|---|---:|
| `index.html` | **4849 KiB** |
| `QC_MeinRezb_24_04_26.html` | 4737 KiB |

Und davon:

```
QC-Datei gesamt      4677,5 KiB
davon base64-Daten   3607,4 KiB  (77 %)  in 28 Stücken

  image/png     1616,0 KiB   23 Stück
  image/jpeg    1300,4 KiB    4 Stück
  image/svg+xml  691,0 KiB    1 Stück

größte Einzelstücke: 691 KiB (SVG), 420 KiB (JPEG), 402 KiB (JPEG), 390 KiB (JPEG)
```

**Drei JPEGs von je rund 400 KiB stecken fest in der HTML-Datei.** Base64 bläht dabei um
ein Drittel auf — es sind also rund 2,7 MB echte Bilddaten, die als 3,6 MB Text ausgeliefert
werden, bei **jedem** Aufruf, ohne dass der Browser sie je einzeln zwischenspeichern kann.

⚠ **Aber vorsichtig:** die Hausordnung sagt ausdrücklich, dass Icons **absichtlich**
eingebettet sind (gegen hartnäckiges Favicon-Zwischenspeichern). Das gilt für **Icons**.
Ob es auch für 400-KiB-Inhaltsbilder gelten soll, ist eine andere Frage — **erst
herausfinden, was diese drei JPEGs überhaupt sind**, dann Klaus fragen. Nicht einfach
herauslösen.

**Zweiter Fund: vier Dateien, die vorgeben Vektorgrafiken zu sein, es aber nicht sind.**

```
icons/icon-book.svg        518,3 KiB   ← enthält ein PNG von 389 KiB
icons/icon-book-blue.svg   518,3 KiB   ← dasselbe PNG (gleicher sha 2c0f6293)
icons/icon-book-192.svg    518,3 KiB   ← dasselbe PNG
icons/icon-book-512.svg    518,3 KiB   ← dasselbe PNG
```

Vier Dateien, ein und dasselbe eingebettete Bild, zusammen 2073 KiB. Genau dasselbe Muster
wie bei Mixarium (dort 514 → 84 KiB durch bloßes Verkleinern des PNGs in der Hülle).
Dazu `icon-book-1024.png` und `icon-book-blue-1024.png` mit je 1655 KiB.

**Vor dem Anfassen prüfen:** Welche dieser Dateien werden überhaupt ausgeliefert? Das
`app-manifest.json` nennt nur `icon-book-blue-*.png`. Die vier SVG könnten Altlast sein —
dann ist Löschen richtiger als Verkleinern. Erst nachsehen, dann handeln.

### 3.4 Wo „Best Practices ROT" herkommen könnte

Nicht geraten, sondern als **Suchrichtung** gemeint — der Bericht entscheidet:
- Konsolenfehler beim Laden (bei Mixarium war es eine fehlschlagende Video-Anfrage),
- unsichere Anfragen oder abgelaufene Verfahren,
- fehlende Quellzuordnungen bei großen eigenen JavaScript-Dateien,
- veraltete Browser-Schnittstellen.

Ein Wert unter 50 bedeutet meist **mehrere** angehakte Punkte gleichzeitig. Zuerst zählen,
welche es sind, dann sortieren.

---

## 4. Die Arbeitsordnung je App (unverändert gültig)

1. **Bericht lesen**, Punkte sortieren nach Gewinn ÷ Risiko.
2. **`CLAUDE.md` des Repos lesen** — die Hausregeln schlagen jeden Performance-Gewinn.
3. **Ursache suchen, nicht Symptom behandeln.** Bei Mixarium war „Bild zu groß" in
   Wahrheit „dieselbe Datei wird zweimal geholt" — das findet man nur durch Nachsehen.
4. **Ändern, dann messen** (§ 5), nicht umgekehrt.
5. **Gegenprobe**: die Änderung testweise zurücknehmen und prüfen, ob die Messung wirklich
   rot wird. Eine Prüfung, die den Fehler nicht anzeigt, ist keine Prüfung.
6. **Commit + PR + selbst mergen** (Freibrief), ehrlich auflisten was **nicht** gemacht
   wurde und warum.
7. **Erst dann die nächste App** — sonst weiß am Ende niemand, welche Änderung welchen
   Wert bewegt hat.

---

## 5. Werkzeug — so wird gemessen (in der Vorsitzung gebaut, bewährt)

Chromium liegt unter `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`,
`playwright-core` unter `/home/user/family-project/node_modules/playwright-core/index.mjs`.

### 5.1 Bildverzerrung prüfen (Handy-Breite)

Seite mit `python3 -m http.server` ausliefern, Chromium mit 412 px Breite öffnen, je Bild
`getBoundingClientRect()` gegen `naturalWidth/Height` vergleichen. Abweichung > 0,02 =
verzerrt. **Zwei Stolpersteine:** `loading="lazy"` erst auf `eager` setzen (sonst ist
`naturalWidth` gleich 0 und man misst Luft), und **Gegenprobe** machen.

### 5.2 Echte Bytes messen (nicht Anfragen zählen)

Ein Testserver, der `max-age=600` **und** ETag/If-None-Match setzt — also das, was GitHub
Pages tut. Ohne das kann der Browser lokal nichts wiederverwenden und man misst an der
Wirklichkeit vorbei. Er protokolliert je Anfrage **Pfad, Status und gesendete Bytes**;
ein 304 ist fast null Bytes, kein voller Download.

**Fehler, der in der Vorsitzung passiert ist:** erst wurde Anzahl × Dateigröße gerechnet.
Das ergab 11,7 MB, wo in Wahrheit ein Bruchteil floss. Immer die **gesendeten Bytes**
zählen, nie die Dateigröße hochrechnen.

**Und:** der lokale Server komprimiert nicht. Zahlen für HTML/JS sind darum größer als in
Wirklichkeit; Zahlen für Bilder und Videos stimmen. Das gehört in jeden Bericht dazu.

### 5.3 Drift zwischen Knoten messen (vor jedem Kanon-Eingriff)

Bevor ein geteilter Block angefasst wird: den Block aus **allen** Repos ziehen, sha-256
bilden, vergleichen. Sind sie längst verschieden, ist „byte-gleich lassen" ohnehin nur noch
Wunsch — und die Antwort auf § 2.1 ändert sich.

---

## 6. Lehren aus der Vorsitzung — bitte nicht neu lernen

1. **Eine Messzahl kann steigen, während die Seite kaputtgeht.** Bildmaße ohne
   `height:auto`. Gefunden hat es Klaus mit dem Auge, keine Prüfung. → Jede sichtbare
   Änderung auch **ansehen**, nicht nur zählen.
2. **Eine Prüfung, die nie rot war, beweist nichts.** Die erste Ausrichtungs-Probe blieb
   grün, obwohl der Fehler eingebaut war — sie verglich Karten aus verschiedenen Zeilen.
3. **Erst nachsehen, dann erklären.** „Bild zu groß" war in Wahrheit „wird zweimal
   geholt". „SVG" war in Wahrheit ein PNG in einer Hülle. Beides fand sich nur, weil die
   Datei aufgemacht wurde.
4. **Der erste echte Lauf ist ein eigener Prüfschritt.** Die fehlende `--locale`-Angabe
   fiel durch keinen einzigen Test auf, sondern erst, als englische Titel im deutschen
   Fenster standen.
5. **Nicht reparieren, bevor es ein Befund ist.** Der nächtliche Lauf war 38 Minuten spät;
   Eingreifen hätte nur die Anmeldung gestört. Er kam von allein.

---

## 7. Am Ende der Sitzung — Pflicht

1. **Ehrlich melden:** was umgesetzt, was bewusst gelassen (mit Begründung), was **nicht**
   verifiziert werden konnte.
2. **Nie behaupten, die Punktzahl steige** — das zeigt erst die nächste nächtliche Messung.
3. **Klaus' Browser-Sichttest** bleibt unersetzbar. „Ungeprüft, wartet auf Klaus' Browser-
   Lauf" ist eine gültige und richtige Aussage.
4. **Nächste-Schritte-Block direkt in der Chat-Antwort** (2–4 Punkte, je ein Satz).
5. **Neuen Brief schreiben** und vollständig als Codeblock im Chat ausgeben — die Kette
   reißt nie ab.

---

## 8. Danach: die Reihenfolge für den Rest

Nach Rezeptbuch, sortiert nach schwächstem Leistungswert:

| App | Leistung | gemessene Adresse |
|---|---:|---|
| Kimboard | 62 | `Kimboard/` |
| BookLedgerPro | 65 | `BookLedgerPro/` |
| Mein-Tresor | 69 | `Mein-Tresor/` |
| Jasons-Tresor | 73 | `Jasons-Tresor/` |
| Perfect-Skin-Beauty | 92 | `Perfect-Skin-Beauty/` |
| Kim-Bell | 95 | `Kim-Bell/` (SEO 90 — dort liegt der Mangel) |
| Perfect-Skin-Fashion | 96 | `Perfect-Skin-Fashion/` |
| Kimseek · mycel-karte | 99 | fertig, nichts zu tun |

Noch nie gemessen: **Tomys-Hub · Privat-Brain · WorkFloh · Rezeptbuch-Page** — die vier
haben im Wächter noch keine Zahl.
