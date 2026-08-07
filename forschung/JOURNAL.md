# Forschungs-Journal — was sich geändert hat, und warum

Diese Datei hat zwei Verfasser. **Das Werkzeug** (`tools/forschung.mjs`, jede
Nacht) trägt ein, *was* passiert ist: welche Zahl gesprungen ist, welche
Beanstandung verschwunden oder dazugekommen ist. **Eine Sitzung** trägt danach
von Hand ein, *warum* — was gebaut wurde, das diesen Sprung verursacht hat.

Das Werkzeug fasst einen einmal geschriebenen Eintrag nie wieder an. Was hier
an Erklärung steht, bleibt stehen.

Fehlt bei einem Eintrag noch das „Warum“, findet man ihn mit:

```
node tools/forschung.mjs --offen
```

Aus den beantworteten Einträgen wächst `LEHREN.md` — die Regeln, nach denen
die nächste Seite von vornherein gebaut wird.

---

<!-- forschung:auto -->

### 2026-08-07 (nachts) · Sage-Protokol: der Widerspruch ist aufgeklärt, und es war nie das Skript

Von Hand eingetragen. Der Brief stellte die Frage so: *„die gemeldete
Skript-Zeit (`docs/observatorium/vorteilspack.js`, 24,5 s) passt nicht zur
gemeldeten Blockierzeit (100 ms). Eine der beiden Zahlen führt in die Irre."*

**Keine von beiden führt in die Irre. Sie messen Verschiedenes**, und zwischen
ihnen liegen sogar zwei verschiedene Uhren.

- Die **24,5 s** sind die Spalte `total` der Prüfung „Skript-Ausführungszeit
  reduzieren". Diese Spalte ist keine Ausführungszeit, sondern die
  Hauptthread-Zeit, die dem **Aufgabenbaum** des Skripts zugerechnet wird —
  samt Layout und Malen, das es auslöst. Die Ausführung steht daneben und
  beträgt **1.052 ms**, das Parsen 5 ms.
- Die **100 ms** sind TBT, und TBT zählt nur, was zwischen FCP und TTI über
  50 ms hinausgeht. Eine kleine Blockierzeit heißt nicht, dass der Hauptthread
  frei ist.
- Dazu misst Lighthouse voreingestellt mit `throttlingMethod: "simulate"`. Im
  selben Bericht steht LCP **7.563 ms simuliert** neben **847 ms beobachtet**.
  Die LCP-Aufschlüsselung rechnet beobachtet, die Kennzahl oben simuliert.

#### Was es wirklich ist

Der LCP ist `p.hero-claim` — **reiner Text**, nichts zu laden, TTFB 22 ms. Die
gesamte Zeit ist „Verzögerung beim Rendern des Elements". Der Hauptthread ist
zu beschäftigt, um Text zu zeichnen. Womit, sagt
`non-composited-animations`: **8 dauernd laufende Animationen**, keine davon
auf den Compositor auslagerbar — drei Balken über `width`, zwei Ringe über
`stroke-dasharray`/`-dashoffset`, zwei Lampen über `box-shadow` und
`background-color`, das Schwarze-Loch-SVG über `filter`. Jedes Bild davon
erzwingt Layout und Malen auf dem Hauptthread.

**Gegenprobe** an einer Wegwerf-Kopie unter `/tmp` (nur dort ein
`*{animation:none!important}` eingeschoben, das Repo blieb unangetastet), drei
Paare im Wechsel:

| | Leistung | LCP | Style & Layout | Rendering | Skript-Auswertung |
|---|---|---|---|---|---|
| mit Animationen | 64 · 66 · 71 | 7,2–7,6 s | 7.116 ms | 6.632 ms | 3.241 ms |
| ohne Animationen | **82 · 80 · 77** | **4,2–5,0 s** | **812 ms** | **1.254 ms** | 3.452 ms |

Die Skript-Auswertung bleibt gleich. Das ist der Beweis, dass die Skripte nie
das Problem waren.

#### Der naheliegende Schluss war falsch — dritte Messung

**Sechs der acht Animationen liegen weit unterhalb des Bildschirms** (ab 9.036
bis 15.802 px) und laufen trotzdem während des ganzen Ladens. Der Vorschlag
lag auf der Hand: nur laufen lassen, was im Bild ist — optisch nicht zu
unterscheiden, kein Design-Eingriff.

**Gemessen bringt das so gut wie nichts.** Dritte Fassung der Wegwerf-Kopie,
diesmal nur die sechs unsichtbaren abgeschaltet:

| Fassung | Leistung | LCP | Style & Layout | Rendering |
|---|---|---|---|---|
| alle Animationen an | 64 · 66 · 71 | 7,2–7,6 s | 7.116 ms | 6.632 ms |
| **nur die 6 unsichtbaren aus** | **72 · 72** | **7,3–7,5 s** | 6.292 ms | 6.190 ms |
| alle aus | 82 · 80 · 77 | 4,2–5,0 s | 812 ms | 1.254 ms |

Der LCP bewegt sich **überhaupt nicht**. Die Kosten stecken fast vollständig in
den **zwei sichtbaren** Animationen der Kopfleiste: `#lamp-traffic`
(`box-shadow` + `background-color`) und `#sbkim-siegel-badge` (`filter` +
`box-shadow`). Sie zeichnen bei jedem Bild eine große Fläche neu — und sie
sitzen **direkt über** dem LCP-Element, dem Hero-Text.

Das ist die unbequeme Fassung: der Hebel liegt nicht bei den sechs, die
niemand sieht, sondern bei den zweien, die Klaus bewusst in die Navleiste
gestellt hat (Festlegung 2026-05-25, Sage behält die Navleisten-Lampen).

#### Was daraus folgt — noch nicht gebaut

**Nicht gebaut, weil der Brief „erst messen, nicht umbauen" sagt** und weil es
mehrere gleich gute Wege gibt: den Puls über `opacity` auf einem Pseudo-Element
mit fertigem Schein führen (kompositierbar, Optik gleich) · den Puls erst nach
dem `load`-Ereignis starten · so lassen. Klaus entscheidet. Alle Zahlen oben
sind **lokal**; PageSpeed fehlt.

### 2026-08-07 (abends) · Der doppelte Ladevorgang ist netzweit weg — und einmal kostet er Note

Von Hand eingetragen. Regel 4 (`seiten-bauregeln/regeln/skripte.md`) abgearbeitet:
der ungebremste `controllerchange`-Reload. Zwei Apps trugen ihn noch.

**Tomys WorkFloh** war in der Regel nicht als betroffen gelistet, obwohl der
Verlust dort mit 2,3 s gemessen worden war. Es rutschte durch, weil die
Doppel-Reload-Sperre (`_swReloaded`) schon da war und beim Überfliegen wie ein
Wächter aussieht. Sie verhindert den *zweiten* Reload, nicht den *ersten*.
Gemergt (`Tomys-Hub#148`), lokal Handy im Wechsel: Leistung 87 · 94 → **97 · 97**,
LCP 2,9 → **2,6 s**, TBT 320 · 100 → **60 · 30 ms**, CLS 0,041 → **0,021**.

**Muttis Rezeptbuch** ist der interessante Fall. Der Mechanismus ist bewiesen:
die Kette `index.html → index.html` mit **6.346 ms** verschenkt meldet
Lighthouse nach dem Fix nicht mehr, fünf Läufe, beide Reihenfolgen. Aber die
Note sinkt:

| | Leistung | LCP | TBT |
|---|---|---|---|
| ohne Fix | 55 · 56 · 57 · 56 · 56 | 8,8–9,0 s | 60–140 ms |
| mit Fix | 54 · 50 · 47 · 52 · 53 | **6,5 s** | 320–570 ms |

Wahrscheinlichste Lesart (Deutung, nicht Beweis): am alten Stand misst
Lighthouse die **zweite**, vorgewärmte Navigation. Der schöne TBT war erkauft
mit einem zweiten kompletten Download und 2,5 s längerer Wartezeit. Der Fix
macht Muttis nicht langsamer, er hört auf zu verbergen, wie teuer der erste
Besuch ist — die 2-MB-`index.html` mit 1,2 MB eingebetteten Bildern.

**Klaus' Entscheid:** mergen, dann misst er PageSpeed (`Muttis-Rezeptbuch#178`).
Bestätigt sich der Rückgang draußen, wird der Fix in einem Folge-Commit
zurückgenommen. **Alle Zahlen oben sind lokal** — die PageSpeed-Werte vorher/
nachher fehlen hier noch und gehören nachgetragen, sobald Klaus gemessen hat.

Damit tragen alle fünf betroffenen Apps den Wächter: Mein-WorkFloh, Tomys
WorkFloh, Muttis Rezeptbuch, Mein-Rezeptbuch, Mein-Mixarium.

### 2026-08-07 (später) · Die Messreihe wusste nicht, welches Gerät sie misst

Von Hand eingetragen. Auslöser war eine Nachprüfung, kein Bau: der Brief vom
selben Abend nennt **family-projekt.de 66 / 70** und daraus abgeleitet *„jetzt
die schwächste Seite im Netz"*. Die Messreihe nennt für dieselbe Seite am
**selben Tag 80**. Beide Zahlen sind Google-Werte. Eine von beiden musste in
die Irre führen.

#### Der Befund: es fehlte das Gerät

Die Messreihe führte **eine** Zahl je Seite und Tag, ohne Angabe, für welches
Gerät sie gilt. Nachgesehen, statt vermutet:

- `tools/messung.mjs` setzte `strategy=mobile` — Weg B (PageSpeed), seit dem
  ersten Tag der Reihe (Commit `e048abd`, 2026-08-04, seither nie geändert).
- Weg A (Lighthouse selbst) setzte `formFactor` **nie**, und dessen
  Voreinstellung ist ebenfalls das Handy.

Also sind **alle 58 bisherigen Punkte Handy-Werte** — nur stand es nirgends.
Das ist keine Kleinigkeit, sondern der Unterschied zwischen zwei Seiten:

| Seite (lokal gemessen, beide Geräte) | Handy | Computer | Spanne |
|---|---|---|---|
| Muttis Rezeptbuch | 44 | **87** | **43** |
| Sage-Protokol | 71 | **97** | **26** |
| family-projekt.de (Start) | 55 | 69 | 14 |
| family-projekt.de (Marktplatz) | 60 | 69 | 9 |

Muttis und Sage sind auf dem Computer **nahezu in Ordnung**. Ihr Problem ist
ausschließlich das Handy. Wer die eine Zahl der Messreihe für „die" Note hält,
sucht an der falschen Seite.

#### Die 66 gegen die 80: keine der beiden ist falsch, beide sind Rauschen

Die Messreihe schreibt ein nächtlicher Lauf um **03:43 Uhr**. Am
2026-08-07 hat sich an family-projekt.de **kein einziges Byte Seiten-Code**
geändert (die Commits des Tages betreffen `docs/`, `regeln/` und die
Forschungsdaten). Zwischen 80 und 66 lag also **dieselbe Seite**.

Das passt zu dem, was in `tools/forschung.mjs` schon dokumentiert steht:
Jasons-Tresor lieferte unverändert 83 · 64 · 97. Genau deshalb gilt seit dem
2026-08-06 die Regel, dass ein Sprung erst zählt, wenn ihn die nächste Messung
hält. Für die Sätze im Brief war sie nicht angewandt worden — sie stützen sich
auf **je einen** Lauf.

Nebenbei bestätigt: in der Messreihe stehen gerade **vier offene Verdachte**,
drei davon Einbrüche an Seiten, die niemand angefasst hat (Jasons-Tresor
97 → 67, Kimseek 99 → 69, Alis Moderaum 90 → 66).

#### Was gebaut wurde

- `tools/messung.mjs`: das gemessene Gerät steht als `MESSUNG_GERAET` an **einer**
  Stelle; `psiAdresse` leitet die `strategy` daraus ab, statt sie ein zweites
  Mal selbst festzulegen.
- `tools/forschung.mjs`: jeder neue Punkt trägt `geraet`. Punkte ohne Gerät
  werden **einmalig** als `handy` nachbeschriftet (belegt, siehe oben); ein
  Punkt, der schon ein Gerät trägt, wird nie umgestempelt. `--zeigen` bekommt
  eine Gerät-Spalte, `--rangliste` eine Kopfzeile mit dem Gerät.
- `tests/smoke_forschung.mjs`: drei neue Proben (**51 grün, 0 rot**).
  Gegenprobe beide Richtungen: ohne den Stempel fällt Probe 1, ohne die
  Nachbeschriftung Probe 2.

Die Nachbeschriftung der echten `messreihe.json` übernimmt der **nächste
nächtliche Lauf**. Von Hand geschieht sie nicht: in der Datei stehen vier offene
Verdachte, und ein Lauf `--nachtragen` von heute würde sie mit **derselben**
Messung beurteilen, aus der sie stammen — und drei Einbrüche als bestätigt ins
Journal schreiben, die keiner sind.

#### Was daraus folgt

Die Rangfolge „welche Seite ist die schwächste" steht **noch nicht** fest. Sie
braucht je Seite zwei Werte (Handy und Computer) und mehr als einen Lauf.

### 2026-08-07 · Mein-WorkFloh **79 → 98** und SB-KIMTool-Point **60 → 81** (Handy)

Von Hand eingetragen, nicht vom Werkzeug. Auslöser war Klaus' Frage: *„Tomys
WorkFloh ist fast baugleich und hat viel bessere Werte — bei Tomys ist sogar
noch mehr drin, was theoretisch verlangsamen müsste. Warum?"*

**Alle Zahlen unten sind PageSpeed** (Klaus' eigene Läufe an der live
ausgelieferten Seite), nicht die lokale Messung. Warum diese Unterscheidung an
diesem Tag so wichtig wurde, steht in der Randnotiz am Ende.

| Seite | Handy vorher | Handy nachher | Computer vorher | Computer nachher |
|---|---|---|---|---|
| **Mein-WorkFloh** | 79 | **98** | 99 | **100** |
| **SB-KIMTool-Point** | 60 | **81** | 79 | **97** |

---

#### Die Ausgangsfrage war falsch gestellt — und das war der erste Fund

Tomys WorkFloh hat **nicht** mehr drin. Es trägt **kein einziges SBKIM-Modul**,
ist also gar kein Netz-Knoten: kein Siegel, keine Lampen-Leiste, keine
Anmeldung im Raum. Mehr *App* hat es, das stimmt. Mein-WorkFloh ist ein
vollwertiger Knoten und lud dafür 19 zusätzliche Dateien.

Die beiden Apps waren nie gleich ausgestattet. Der Vergleich, der die Frage
ausgelöst hat, verglich Ungleiches.

#### Mein-WorkFloh — drei Ursachen, nacheinander gefunden

**1 · Die Seite lud sich beim ersten Besuch zweimal.** Der frisch installierte
Service-Worker übernahm (`skipWaiting` + `clients.claim`), `controllerchange`
feuerte, und die Seite lud komplett neu — obwohl es beim allerersten Besuch
keinen alten Code zu ersetzen gab. Lighthouse meldete das als „Mehrere
Weiterleitungen", 1,6 s. Behoben mit einem Wächter (`hatteController`).

**2 · Der SBKIM-Stapel stand parser-blockierend in der Seite.** 19 Dateien,
keine davon nötig, um den Auftragszettel anzuzeigen. Werden jetzt **nach** dem
Laden geholt, in exakt der Reihenfolge des Kanons, jede wartet auf die vorige,
dazwischen eine Leerlauf-Pause.

**3 · Die PDF-Bibliothek hing im Start-Vorrat des Service-Workers.** Das war
der eigentliche Bremsklotz, und er war der am besten versteckte:

| Datei | roh | übertragen (gzip) |
|---|---|---|
| `pdf.worker.min.js` | 1107 KiB | 296 KiB |
| `pdf.min.js` | 368 KiB | 104 KiB |
| **zusammen** | **1475 KiB** | **400 KiB = 46 %** aller 855 KiB beim Laden |

Das Bittere daran: **die App macht es längst richtig** — sie holt `pdf.js` erst
beim ersten PDF (`ladePdfJs`). Der Service-Worker machte das zunichte und zog
beide Dateien beim Seitenstart in den Vorrat. Sichtbar wird das **nur
server-seitig**: Service-Worker-Anfragen tauchen im Netzwerk-Protokoll des
Browsers nicht auf.

| | wann die PDF-Bibliothek geholt wird |
|---|---|
| vorher | **716 ms** — 51 ms nachdem die Seite fertig war, mitten im Messfenster |
| nachher | **6666 ms** — lange danach |

Anfragen während des Ladens: **53 → 42**. Gelöst über eine zweite Vorrats-Liste
(`ASSETS_SPAETER`), die die Seite per `postMessage` erst anfordert, wenn sie
fertig geladen und der Hauptthread ruhig ist. **Offline bleibt erhalten.**

**Punkt 1 und 2 allein bewegten den Live-Wert nicht** (79 vorher, 79 nachher).
Sie waren trotzdem nicht umsonst — sie blieben nur wirkungslos, solange die
PDF-Bibliothek die Leitung belegte. **Erst alle drei zusammen ergeben die 98.**

#### SB-KIMTool-Point — Bilder, und zwar drastisch

Drei Banner lagen als PNG im Repo:

| | vorher | nachher |
|---|---|---|
| `banner-werkzeuge` | 1194 KiB PNG | 76 KiB WebP |
| `banner-markt` | 991 KiB PNG | 65 KiB WebP |
| `banner-modell` | 866 KiB PNG | 51 KiB WebP |
| **zusammen** | **3051 KiB** | **192 KiB** |

**Das waren 90 % der gesamten Seitenlast** — für Bilder, die `alt=""` und
`aria-hidden="true"` tragen (reine Dekoration) und per `object-fit: contain` nie
größer als rund 335 px dargestellt werden. Sie standen zudem auf
`loading="eager"`, obwohl sie unterhalb des ersten Abschnitts liegen.

Dazu drei kleinere Funde:

- **Layout-Sprung:** Modul 16 hängt das Siegel-Abzeichen (34 × 34) erst nach dem
  Laden in `.lamps`; die Leiste wuchs von 9 px auf 34 px und schob die Seite.
  `min-height: 34px` im **app-eigenen** CSS reserviert den Platz vorher. CLS
  **0,103 → 0,052**. Das Modul selbst blieb unangetastet.
- **Die Kopf-Bilder der drei Unterseiten waren seit dem ersten Tag unsichtbar.**
  Eine relative `url()` in einer CSS-Variablen wird gegen das **Stylesheet**
  aufgelöst, nicht gegen das Dokument; aus `assets/img/x` wurde
  `assets/assets/img/x` → 404. Gegenprobe am Stand *vor* allen Änderungen: der
  Fehler war schon dort. Gemerkt hat es niemand, weil ein Gradient-Fallback
  dahinterlag — **ein leerer Farbverlauf sieht nicht kaputt aus**.
- **Der „Nebel" auf den Kopf-Streifen** war ein dunkler Verlauf über die volle
  Breite (0,92 → 0,20). Er sitzt jetzt nur noch unter dem Text und ist ab 78 %
  der Breite ganz weg; die Lesbarkeit sichert stattdessen ein Textschatten.
  Für den 1042 px breiten Streifen gibt es eigene `-gross`-Fassungen in voller
  Originalauflösung — die Start-Karten behalten die kleinen.

#### Tomys Hub — Befund ohne Eingriff

Beim Messen fiel auf, dass zwei Tomys-Seiten das übliche Verhältnis **umkehren**:

| Seite | Handy | Computer | Blockierzeit H → C |
|---|---|---|---|
| Tomys Hub (Wurzel) | 85 | **68** | 580 ms → **4.430 ms** |
| Tomys Schaufenster | 99 | **69** | 0 ms → **4.840 ms** |
| Tomys WorkFloh | 93 | **100** | 150 ms → 10 ms |

Ursache: `tomy-ui/mycel-bg.js` schaltet den three.js-Hintergrund unter 700 px
**ganz ab**. Das Handy misst eine Seite **ohne** WebGL, der Computer eine
**mit** — auf 3,7-facher Fläche. Gegenprobe mit abgeschaltetem Hintergrund:
**69 → 100**. Die dritte Zeile ist der Kronzeuge: dieselbe Werkstatt, dasselbe
Gerüst, kein Hintergrund, 100.

**Nicht geändert** — der Hintergrund ist eine Design-Entscheidung von Klaus.

#### Werkzeug und Regeln

- **`tools/lh-messen.mjs` misst jetzt beide Geräte** (`--desktop`, `--beides`).
  Bis dahin maß es nur das Handy und übersah damit die Hälfte. Klaus:
  *„Es gibt zwei gemessene Werte."*
- **Neuer Skill `seiten-bauregeln`** (`.claude/skills/`): Bauregeln nach Gewerk
  getrennt — Bilder · Skripte · Text/Auffindbarkeit · Layout/Bedienbarkeit ·
  Messen. Jede Regel mit Datum, Zahl und Fundstelle aus diesen Repos. Die
  Misserfolge stehen mit drin (`defer` machte es 98 → 90 schlechter; ein
  einzelnes Skript zu verschieben brachte 79 → 78).

#### Was offen bleibt

- **family-projekt.de: 66 / 70** — jetzt die schwächste Seite im Netz, und die,
  auf der Fremde zuerst landen.
- **Muttis Rezeptbuch: 48** — Ursache steht fest (2 MB `index.html` mit 1,2 MB
  eingebetteten Bildern), der Eingriff berührt aber `build.py` und den
  Ein-Datei-Grundsatz. Klaus' Entscheidung.
- **Sage-Protokol: 69** — noch nicht verstanden; die gemeldete Skript-Zeit passt
  nicht zur Blockierzeit. Erst messen, dann bauen.
- Point: Auffindbarkeit 80, CLS 0,052 (Handy) / 0,103 (Computer), `ambient.png`
  fehlt. WorkFloh: Barrierefreiheit 91, Auffindbarkeit 91.

---

> #### Randnotiz zum Vorgehen
>
> Zwei Untersuchungen desselben Problems an einem Tag: die erste ging daneben,
> die zweite traf. **Die Werkzeuge waren beide Male dieselben.** Verschieden war
> nur, wann aufgehört wurde zu prüfen.
>
> Am Vormittag wurde „77 → 95" als Erfolg gemeldet — eine **lokale** Messung.
> PageSpeed sagte danach 79, unverändert. Am Abend hieß es „lokal 97, der Beweis
> ist dein Lauf" — und der ergab 98.
>
> Gelöst hat den Fall nicht die Punktzahl, sondern eine Frage, deren Antwort
> nicht von der Erwartung abhängen kann: **wann wird diese Datei geholt?**
> 716 ms gegen 6666 ms.
>
> Klaus' Bitte (2026-08-07), das festzuhalten, ist der Grund für
> `.claude/skills/seiten-bauregeln/regeln/vorgehen.md`. Dort steht, **wie**
> analysiert wurde und woran das Denken vorher scheiterte — nicht, was gebaut
> wurde. Das steht hier.

---

### 2026-08-06 · family-projekt.de — Zwischenstand, **13 Tage vor dem Termin**

<https://family-projekt.de/> · von Hand eingetragen, nicht vom Werkzeug

**In der Search Console wurde nichts nachgesehen, und das ist der Inhalt dieses
Eintrags, nicht sein Fehlen.** Der Ausgangs-Eintrag vom 2026-08-05 nennt den
**2026-08-19** als frühesten Termin. Heute ist der 6. August. Wer jetzt
nachsähe und nichts fände, hätte nichts widerlegt — er hätte nur zu früh
geschaut und danach eine Zahl im Kopf, die nichts bedeutet. Die vier Zahlen
(indexierte Seiten · Klicks im Monat · Adressen in der Sitemap · Verweis von
family-projekt.de in der Search Console **einzelner Apps**) werden am 19.
aufgeschrieben, nicht vorher.

Unverändert steht der Ausgangsstand: 4 indexierte Seiten, 8 Klicks im Monat,
12 Adressen in der Sitemap.

**Nachgezählt im ausgelieferten HTML** (das kostet nichts und hängt an keinem
Termin): `markt.html` 14 Außen-Links · `werkzeuge.html` 11 · `netzwerk.html` 1
· `index.html` **0**. Die Null auf der Startseite ist so gewollt — sie listet
keine Apps, sie führt zu den Unterseiten, und die sind verlinkt.

**Noch nie scharf gewesen, weil es den Fall noch nicht gibt:** 0 von 14
Marktplatz-Einträgen sind fremd (alle tragen `own`), und alle 13 externen
Werkzeug-Adressen liegen auf `lausiklauskn-png.github.io`. Die Regeln für
fremde Einträge (`nofollow ugc`) und fremde Werkzeug-Hosts sind also gebaut
und gegengeprobt, aber im Echtbetrieb ungetestet.

**Warum:** kein Bau an der Seite, nur Wartung an den Wächtern (siehe
`docs/BRIEF_SCHWELLE_UND_TERMIN.md`).

### 2026-08-06 · Jasons-Tresor

<https://lausiklauskn-png.github.io/Jasons-Tresor/> · Quelle der Zahlen: Google PageSpeed Insights

- **Leistung 64 → 97** (↑ 33)
- Beanstandung weg: leistung: JavaScript komprimieren
- Beanstandung weg: leistung: Largest Contentful Paint
- Beanstandung neu: gute_praxis: Es wurden Browserfehler in der Konsole protokolliert
- Beanstandung neu: leistung: Bildübermittlung verbessern
- Beanstandung neu: leistung: Netzwerkabhängigkeitsbaum

**Warum:** Gar nicht. Es wurde nichts gebaut — der letzte Commit in
Jasons-Tresor ist vom **2026-08-03**, also älter als alle drei Messungen. Die
Reihe zeigt an dieser unveränderten Seite, dreimal von Google, mit derselben
Werkzeug-Fassung 13.4.1:

| gemessen | Leistung | Bedienbarkeit | gute Praxis | Auffindbarkeit |
|---|---|---|---|---|
| 2026-08-04 | 83 | 92 | 100 | 100 |
| 2026-08-05 | **64** | 92 | 100 | 100 |
| 2026-08-06 | **97** | 92 | 96 | 100 |

Zwischen dem tiefsten und dem höchsten Wert liegen **33 Punkte**, ohne dass
jemand eine Zeile angefasst hat. Die anderen drei Zahlen stehen dabei
praktisch still (92 · 100/96 · 100) — es ist **allein die Leistung**, die so
weit ausschlägt.

Das ist kein Erfolg, sondern ein Fehlalarm, und zwar einer, der durch unseren
eigenen Filter gelaufen ist: die Schwelle steht auf 20, weil am 2026-08-05 an
unveränderten Seiten höchstens 19 Punkte Streuung gemessen worden waren. Diese
Annahme ist damit widerlegt. Ohne diesen Nachtrag stünde hier ein Eintrag, der
wie eine gelungene Verbesserung aussieht und keine ist — genau die Sorte, vor
der Lehre 6 warnt.

**Entschieden noch am selben Tag (Klaus) und gebaut.** Nicht durch eine höhere
Zahl — eine Schwelle aus dem bisherigen Maximum ist immer zu niedrig —, sondern
durch **Bestätigung**: ein Sprung wird gemerkt und erst gemeldet, wenn ihn die
nächste Messung hält. Nach dieser Regel wäre dieser Eintrag hier nie entstanden.

Dazu, auf Klaus' Zuruf, die **umgekehrte** Vorsicht für die Marktplatz-Karte:
ein besserer Wert gilt sofort, ein schlechterer erst nach drei Messungen
hintereinander — *„keiner soll schlechter abschneiden, als wenn er selber
nachmisst."* Beides steht in `LEHREN.md` Lehre 6c und 6d, mit den drei
Ehrlichkeits-Bedingungen, unter denen das Entprellen keine Schönfärberei ist.

### 2026-08-05 · family-projekt.de — statische Links, Ausgangsstand vor dem Bau

<https://family-projekt.de/> · von Hand eingetragen, nicht vom Werkzeug

**Dieser Eintrag ist vor dem Bau geschrieben.** Das ist Absicht: wer erst
hinterher aufschreibt, was er erwartet hat, hat nichts gemessen, sondern sich
etwas zurechtgelegt.

**Ausgangsstand** (Google Search Console, Property family-projekt.de, Stand
2026-08-05):

| | |
|---|---|
| indexierte Seiten | **4** |
| Klicks im Monat | **8** |
| Adressen in `sitemap.xml` | **4** |
| statische Links nach außen im ausgelieferten HTML | **0** auf `index`, `werkzeuge`, `markt`; **1** auf `netzwerk` |

**Was gebaut wird:** die Marktplatz-Einträge (14 aus `listings.js`) und die
Werkzeug-Kacheln (16 aus `werkzeuge.js`) stehen zusätzlich als echtes HTML in
der ausgelieferten Datei, erzeugt von `tools/statische-listen.mjs`. Das
JavaScript überschreibt sie beim Zeichnen wie bisher. Dazu kommen die acht
fehlenden Adressen in die `sitemap.xml`.

**Was ich erwarte:**

1. **Die Zahl der indexierten Seiten steigt** — von 4 auf bis zu 12. Das ist
   die einzige Erwartung hier, die eine klare Ober­grenze hat: es gibt genau
   zwölf Adressen, die hinein sollen. Ursache wäre zu zwei Teilen die Sitemap
   und zu einem Teil, dass die vier Werkzeug-Unterseiten erstmals einen
   statischen Link von einer Seite bekommen, die Google schon kennt.
2. **Bei den verlinkten Apps kommt mehr an.** Sichtbar wird das in der Search
   Console **jeder einzelnen App** als Verweis von family-projekt.de — nicht
   hier und nicht in Lighthouse. Ohne die `noreferrer`-Änderung (eigene Apps)
   wäre es überhaupt nicht sichtbar.
3. **Die Klickzahl der Startseite selbst ändert sich kaum.** Es kommt kein
   Inhalt dazu, nur Verweise nach außen.
4. **CLS bleibt 0.** Vorher gemessen, drei Läufe je Seite, mit Trace:
   `markt.html` CLS 0 · 0 · 0 (Leistung 65 · 59 · 61), `werkzeuge.html`
   CLS 0 · 0 · 0 (Leistung 62 · 62 · 62), in allen sechs Läufen **null**
   `LayoutShift`-Ereignisse. Die Platz-Reserve (`min-height:70vh`) bleibt
   deshalb stehen: sie kostet nichts, sobald echter Inhalt darüber steht, und
   ein Ausbau könnte nur schaden. Nachher wird identisch nachgemessen.

**Was das hier NICHT ist:** ein Beweis. Es gibt **keine Kontrollgruppe**. Ich
kann die Seite nicht gleichzeitig mit und ohne statische Links betreiben, und
niemand hält Google in der Zwischenzeit an. Was in den nächsten Wochen an
Zahlen kommt, ist ein **Hinweis** — vereinbar mit der Erwartung oder nicht,
mehr nicht. Parallel laufen mindestens drei andere Einflüsse, die dieselben
Zahlen bewegen können: das Alter der Seite, Googles eigene Umstellungen und
alles, was in derselben Zeit sonst an den Apps gebaut wird.

**Und es dauert.** Wochen, nicht eine Nacht. Wer nach drei Tagen nachsieht und
nichts findet, hat nichts widerlegt. Wer nach zwei Wochen einen Anstieg sieht,
hat ihn nicht verursacht — er hat ihn beobachtet. Der Unterschied gehört in
jeden Folgeeintrag, sonst schreiben wir uns hier einen Erfolg zurecht.

**Nächster Blick:** frühestens 2026-08-19 (zwei Wochen), mit denselben vier
Zahlen aus der Tabelle oben.

**Nachtrag am selben Tag, nach dem Bau.** Die vierte Erwartung ist als
einzige sofort prüfbar, und sie ist zuerst **nicht** eingetreten:

| | vorher | nach dem Bau | nach der Reparatur |
|---|---|---|---|
| `markt.html` CLS | 0 · 0 · 0 | **0,006 · 0,006 · 0,006** | 0 · 0 · 0 |
| `markt.html` Leistung | 65 · 59 · 61 | 58 · 57 · 61 | 59 · 59 · 56 |
| `werkzeuge.html` CLS | 0 · 0 · 0 | — | 0 · 0 · 0 |
| `werkzeuge.html` Leistung | 62 · 62 · 62 | — | 61 · 62 · 61 |

Der Trace nannte genau ein Ereignis: `div#mkListings`, Δy = +31, Höhe −31.
Also **nicht** die neue Liste, sondern etwas darüber. Darüber steht
`<p id="mkCount">` — beim ersten Bild leer, danach „14 / 14". Eine leere Zeile
wird zu einer vollen und schiebt alles darunter 31 px nach unten.

**Diesen Sprung gab es schon immer.** Sichtbar wurde er erst jetzt: solange der
Kasten darunter leer war, malte er nichts, und ein Element ohne gemalten Inhalt
zählt Chrome nicht als verschoben. Die statische Liste hat den Fehler nicht
verursacht — sie hat ihn **aufgedeckt**. Behoben mit einer Zeilenreserve
(`#mkCount{min-height:1.5em}`), danach wieder 0 in allen drei Läufen und null
Ereignisse im Trace.

Die Leistungszahlen bewegen sich innerhalb des Rauschens; die Schwelle der
Station steht aus gutem Grund bei 20 (Lehre 6). Aus 65 · 59 · 61 gegen
59 · 59 · 56 lässt sich nichts ableiten, und ich leite auch nichts ab.

**Was dieser Nachtrag über die Methode sagt:** hätte ich nur vorher gemessen
und danach „müsste besser sein" geschrieben, stünde hier jetzt eine
Verschlechterung, die niemand bemerkt hätte. Der Punkt 2 des Briefes —
*„CLS vorher/nachher MESSEN"* — hat sich innerhalb eines Tages bezahlt gemacht.

### 2026-08-05 · Perfect Skin Beauty — die Messreihe wechselt die Adresse

<https://perfectskinbeauty.de/> · von Hand eingetragen, nicht vom Werkzeug

- Gemessene Adresse: `lausiklauskn-png.github.io/Perfect-Skin-Beauty/` → **`perfectskinbeauty.de`**

**Warum:** Beim Einrichten der Search Console ist aufgefallen, dass der
Marktplatz auf die **falsche** Adresse zeigte. Die Seite hat seit jeher eine
eigene Domain (`CNAME` = `perfectskinbeauty.de`), verlinkt war aber die
GitHub-Pages-Adresse.

Das hatte drei Folgen auf einmal:

1. **Der Link half nicht.** Seit dem 2026-08-05 sagt das `canonical` der Seite,
   dass `perfectskinbeauty.de` die gültige Adresse ist — Google verwirft die
   github.io-Fassung also. Der Marktplatz verlinkte damit ausgerechnet die
   Adresse, die verworfen wird.
2. **Besucher landeten auf der falschen Adresse** — nicht auf der Domain des
   Geschäfts, sondern auf einer Entwickler-Adresse.
3. **Wir haben die falsche Seite gemessen.** Alle Werte dieses Eintrags bis
   einschließlich 2026-08-05 stammen von der github.io-Fassung.

**Für spätere Sitzungen wichtig:** ab dem nächsten Lauf misst dieser Eintrag
eine **andere Adresse**. Ein Sprung in den Zahlen wäre also weder eine
Verbesserung noch eine Verschlechterung, sondern der Wechsel. Die Kennung
bleibt `markt-perfect-skin-beauty`, damit der Verlauf nicht abreißt — der
Bruch steht dafür hier.

**Netzweit prüfen:** Perfect-Skin-Beauty ist das einzige Repo mit eigener
Domain (`node tools/netz-check.mjs`, CNAME-Spalte). Sollte Klaus weiteren Apps
eine eigene Domain geben, muss der Marktplatz-Eintrag mitwandern — sonst
entsteht derselbe Fehler noch einmal.


### 2026-08-05 · Jasons-Tresor

<https://lausiklauskn-png.github.io/Jasons-Tresor/> · Quelle der Zahlen: Google PageSpeed Insights

- **Leistung 83 → 64** (↓ 19)
- Beanstandung weg: leistung: Bildübermittlung verbessern
- Beanstandung weg: leistung: Erzwungener dynamischer Umbruch
- Beanstandung neu: leistung: JavaScript komprimieren
- Beanstandung neu: leistung: Largest Contentful Paint

**Warum:** **Gar nicht.** An der Seite wurde nichts geändert — der letzte Commit
auf `main` ist vom **2026-08-03 22:32**, also vor *beiden* Messungen. Gemessen
wurde beide Male bei Google. Der Absturz um 19 Punkte ist **reines Rauschen**.

Das ist der wertvollste Befund der ersten Nacht, weil er eine Annahme widerlegt:
ich hatte gedacht, Googles Zahl sei stabiler als eine eigene Messung. Ist sie
nicht. Vier weitere unveränderte Seiten in derselben Nacht, ebenfalls zweimal
Google: Kimboard −6, Kim-Bell −1, Mein-Tresor −1, Kimseek ±0. Die Streuung
reicht also bis 19.

**Folge:** die Schwelle für einen Journal-Eintrag ist von 14 auf **20** gesetzt
worden — gemessen, nicht geschätzt. Und eine geänderte Beanstandungsliste allein
löst keinen Eintrag mehr aus (siehe die vier Einträge unter diesem hier).

→ Lehre 6 in `LEHREN.md`, jetzt mit Zahlen statt Vermutung.

### 2026-08-05 · Kim-Bell

<https://lausiklauskn-png.github.io/Kim-Bell/> · Quelle der Zahlen: Google PageSpeed Insights

- Beanstandung weg: leistung: Anfragen zum Blockieren des Renderings
- Beanstandung neu: leistung: Erzwungener dynamischer Umbruch

**Warum:** **Rauschen, kein Ereignis.** Keine Zahl hat sich bewegt (Leistung
97 → 96); es hat nur die Beanstandungsliste gewackelt. „Erzwungener dynamischer
Umbruch" ist in derselben Nacht bei Kim-Bell, Kimseek und mycel-karte **neu
aufgetaucht** und bei Kimboard und Jasons-Tresor **verschwunden** — ohne dass
an einer dieser fünf Seiten etwas geändert wurde. Die Liste wackelt an ihren
eigenen Schwellen.

Solche Wechsel bekommen ab jetzt **keinen eigenen Eintrag** mehr; sie stehen
weiter in der Messreihe und als Begleitinformation in echten Einträgen. Vier
von sechs Einträgen dieser ersten Nacht waren genau das — so hätte das Journal
das Signal binnen einer Woche erstickt.

### 2026-08-05 · Kimseek

<https://lausiklauskn-png.github.io/Kimseek/> · Quelle der Zahlen: Google PageSpeed Insights

- Beanstandung weg: leistung: Effiziente Verweildauer im Cache verwenden
- Beanstandung neu: leistung: Erzwungener dynamischer Umbruch

**Warum:** Dasselbe wie bei Kim-Bell — Listen-Wackler ohne Bewegung in den
Zahlen (Leistung 99 → 99). Kein eigener Eintrag mehr ab jetzt.

### 2026-08-05 · Kimboard

<https://lausiklauskn-png.github.io/Kimboard/> · Quelle der Zahlen: Google PageSpeed Insights

- Beanstandung weg: leistung: Erzwungener dynamischer Umbruch
- Beanstandung neu: leistung: Reduziere nicht verwendetes JavaScript

**Warum:** Dasselbe Muster, andere Richtung: hier ist „Erzwungener dynamischer
Umbruch" **verschwunden**, während er bei drei anderen Seiten auftauchte.
Leistung 98 → 92, also unter der neuen Schwelle. Kein Ereignis.

### 2026-08-05 · Mein-Mixarium

<https://lausiklauskn-png.github.io/Mein-Mixarium/> · Quelle der Zahlen: Google PageSpeed Insights

- **Leistung 37 → 75** (↑ 38)
- Beanstandung weg: leistung: JavaScript komprimieren
- Beanstandung neu: gute_praxis: Es wurden Browserfehler in der Konsole protokolliert
- Beanstandung neu: leistung: Bildübermittlung verbessern

**Warum:** **Nicht die App — die Messquelle.** Am 4. August lag für Mixarium noch
eine **eigene** Messung vor (37), am 5. August hat es Googles PageSpeed Insights
gemessen (75). An der App wurde in der Zwischenzeit nichts geändert.

Genau davor warnt Lehre 7, und genau hier ist es passiert: Mixarium kam beim
Lauf am 4. August nicht mehr unter den Zehner-Deckel und behielt deshalb seinen
alten, selbst gemessenen Wert; erst in der Nacht darauf war es dran. Der
„Sprung" ist der Wechsel.

**Folge:** das Werkzeug erkennt einen Quellwechsel jetzt selbst und schreibt eine
Warnung an den Anfang des Eintrags. Ohne die liest sich eine Umstellung wie ein
Erfolg — und ich hätte Klaus fast einen gemeldet.

Was der neue Wert **wirklich** sagt: Mixarium steht bei Leistung 75, nicht bei
37. Die App ist also nie so schlecht gewesen, wie die Karte monatelang behauptet
hat.

### 2026-08-05 · mycel-karte

<https://lausiklauskn-png.github.io/mycel-karte/> · Quelle der Zahlen: Google PageSpeed Insights

- Beanstandung weg: leistung: Aufwand für Hauptthread minimieren
- Beanstandung neu: leistung: Erzwungener dynamischer Umbruch

**Warum:** Auch hier ein Quellwechsel (eigene Messung 100 → Google 99), aber ohne
nennenswerten Unterschied — die Karte ist schnell, egal wer misst. Der Eintrag
entstand nur durch den Listen-Wackler („Erzwungener dynamischer Umbruch"), der
in dieser Nacht durch das halbe Netz ging. Kein Ereignis.

<!-- Ab hier schreibt das Werkzeug. Alles UNTERHALB der Trennlinie
     „Vor der Station“ ist von Hand nachgetragene Vorgeschichte. -->

---

## Vor der Station — was vor dem 2026-08-04 geschah

Die Messreihe beginnt am **2026-08-04**. Was davor gebaut wurde, ist in der
Reihe nicht mehr sichtbar; es steht hier, weil es die aussagekräftigsten Fälle
enthält, die wir haben. Die Zahlen stammen aus den Messungen der jeweiligen
Bau-Sitzung, nicht aus der Reihe — deshalb sind sie hier ausdrücklich als
**Vorgeschichte** markiert und nicht in `messreihe.json` eingespeist. Eine
nachträglich erfundene Zeitreihe wäre keine Messung.

### 2026-08-04 · Sage-Protokol — Barrierefreiheit 93 → 97

<https://lausiklauskn-png.github.io/Sage-Protokol/> · Quelle: eigene Messung (Lighthouse 13.4.1, drei Läufe)

- **Barrierefreiheit 93 → 97**
- Beanstandung weg: 21 von 26 Kontrast-Beanstandungen (`--dim`)
- Beanstandung weg: 4 Kontrast-Beanstandungen an den Status-Etiketten

**Warum:** Zwei Bauten am selben Tag, beide reiner Kontrast.

Erstens `--dim`: die abgeblendete Schrift der Seite stand auf
`rgba(245,245,255,0.36)` und kam damit auf **3,08 : 1**. Auf `0.50` angehoben →
**4,99 : 1**. Diese eine Zeile war für **21 der 26** Beanstandungen
verantwortlich — sie wird an sehr vielen Stellen benutzt (`.card-tag` und
Verwandte). Die Abstufung zu `--muted` (0,62) blieb erhalten, damit die Seite
ihre Tiefe behält.

Zweitens die Status-Farben: die restlichen vier Beanstandungen saßen alle an
`.badge`. Der Grund war eine **Doppelrolle** — dieselbe Farbe ist Füllung
(Punkt, Lampe, Diagrammknoten) *und* Schrift im Etikett. Als Schrift auf
dunklem Grund fielen die zwei dunkelsten durch: `schablone` `#92400E` bei
**2,88 : 1**, `stub` `#2563EB` bei **3,95 : 1**. Beide auf demselben Farbton
aufgehellt → `#A9714B` (5,01 : 1) und `#4479EE` (5,07 : 1).

Beim Aufhellen war die Falle, dass Braun zu **Orange** wird — und Orange ist
schon `werkstatt`. Deshalb ein gedämpftes Erdbraun statt eines hellen Orange;
Abstand im Lab-Raum 49,7 zu `#EA580C`. Die verbindliche Tafel
(`docs/INTERFACES.md §5`) wurde dabei **zuerst** nachgezogen, dann der Code.

Der Wächter (`tests/smoke_lighthouse_module.mjs`) rechnet jetzt beide Rollen
nach und prüft zusätzlich, dass CSS-Variable und JS-Karte dasselbe sagen — die
stehen 2000 Zeilen auseinander und driften sonst lautlos.

→ Lehre 4 und Lehre 5 in `LEHREN.md`.

### 2026-08-04 · family-projekt.de / Werkzeuge — CLS 0,188 → 0, Barrierefreiheit 98 → 100

<https://family-projekt.de/werkzeuge.html> · Quelle: eigene Messung (drei Läufe)

- **Sprung (CLS) 0,188 → 0**
- **Barrierefreiheit 98 → 100**

**Warum:** Der Werkzeug-Bereich wird von einem Skript gefüllt und war beim
ersten Bild leer — der Seitenfuß rutschte hoch und beim Füllen wieder runter.
Der **Trace** zeigte das; der Bericht allein hatte nur den Container genannt.
Behoben durch reservierten Platz, der beim Zeichnen wieder freigegeben wird
(`#toolGrid:not(.gefuellt){min-height:70vh}` + `classList.add("gefuellt")`).
Die zwei Punkte bei der Barrierefreiheit kamen von der Überschriften-Ordnung
(die Karten trugen `h3` ohne `h2` darüber).

→ Lehre 1 und Lehre 2 in `LEHREN.md`.

### 2026-08-04 · Tomys Hub — Einstiegsseite 46 → 86

<https://lausiklauskn-png.github.io/Tomys-Hub/> · Quelle: eigene Messung, am echten Server bestätigt

- **Leistung 46 → 86**
- **Barrierefreiheit → 100**
- 57 KiB Bilder gespart

**Warum:** Drei Dinge, in dieser Reihenfolge nach Wirkung.

Der große Hebel war der **WebGL-Hintergrund**: er lief beim Seitenstart mit und
blockierte den Hauptthread genau dann, wenn die Seite sichtbar werden soll.
Jetzt wird er erst **nach `load`** und über `requestIdleCallback` geladen —
und er bekam eine **Selbstbremse**: fällt die Bildrate unter eine Schwelle,
hört er von selbst auf, statt weiter zu rechnen.

Zweitens die **Bilder**: nicht kleiner gerechnet, sondern als **WebP**
ausgeliefert — gleiche Abmessung, gleiche Schärfe, ein Bruchteil der Bytes.

Drittens der **Kontrast**: zwei neue Zwischentöne (`--ink-2`, `--ink-3`) statt
`opacity` auf ganzen Gruppen. `opacity` schlägt jede Farbwahl darin; wer den
Kontrast über die Farbe repariert, während darüber `opacity` liegt, repariert
nichts.

**Nachspiel, das eine eigene Lehre wert war:** nach der Beschleunigung fielen
Tests um, die vorher grün waren. Der Verdacht „ich habe etwas kaputtgemacht“
war falsch — die Tests waren grün gewesen, **weil die Seite zu langsam war**.
Bewiesen durch 9 Sekunden Wartezeit auf unverändertem `origin/main`: derselbe
Fehlschlag.

→ Lehre 3 und Lehre 5 in `LEHREN.md`.

### 2026-08-04 · Alle Marktplatz-Einträge — Messquelle auf Google umgestellt

<https://family-projekt.de/markt.html> · Quelle: ab jetzt Google PageSpeed Insights

- Quelle der Zahlen: eigene Messung → Google PageSpeed Insights (10 von 14 Einträgen)

**Warum:** Klaus' Befund war, dass die Zahl auf der Marktplatz-Karte nicht zu
der Zahl auf dem verlinkten Bericht passte (Mein Mixarium: 37 auf der Karte,
76 im Bericht). Meine erste Erklärung — „anderer Rechner“ — war **falsch**; das
Schaufenster stand in derselben Nacht auf demselben Rechner bei 63 gegen 65.
Die wirkliche Ursache: eine **einzelne** Messung einer schweren Seite ist eine
Stichprobe, keine Zahl (zwei lokale Läufe ergaben 33 und 51).

Konsequenz auf Klaus' Anweisung: die Karte zeigt jetzt **dieselbe Quelle**, auf
die sie verlinkt. Mit hinterlegtem Schlüssel (`PSI_API_KEY`) holt der nächtliche
Lauf die Zahl von Googles PageSpeed Insights; ohne Schlüssel misst er weiter
selbst. Welcher Weg es war, steht in jeder Messung im Feld `quelle` und auf der
Karte.

→ Lehre 6 und Lehre 7 in `LEHREN.md`.
