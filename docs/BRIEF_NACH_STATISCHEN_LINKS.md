# Brief: was nach den statischen Links ansteht

**Für die Nachfolgesitzung.** Angelegt 2026-08-05, nach PR #209.

---

## Was am 2026-08-05 gebaut wurde

`docs/BRIEF_STATISCHE_LINKS.md` ist abgearbeitet, alle sieben Punkte. Kurz:

| | vorher | nachher |
|---|---|---|
| `markt.html` statische Außen-Links | 0 | 14 |
| `werkzeuge.html` statische Links | 0 | 11 außen + 5 auf eigene Unterseiten |
| Adressen in `sitemap.xml` | 4 | 12 |

Neu im Repo: `tools/statische-listen.mjs` (Bau), `tests/smoke_statische_listen.mjs`
(30 Prüfungen, ohne Browser), `tests/gegenprobe_statische_listen.sh` (8 Proben),
ein Schritt im nächtlichen Lauf **nach** dem Wächter.

Zwei Abweichungen des alten Briefes sind dort als Korrektur nachgetragen: die
Werkzeug-Wand kommt aus `werkzeuge.js` (nicht `meineapps.js`/`publicapps.js`),
und 11 der genannten 19 Links sind absichtlich dev-gesperrt.

---

## Der erste und wichtigste Punkt: nicht zu früh nachsehen

Der Journal-Eintrag vom 2026-08-05 nennt **2026-08-19** als frühesten Termin.
Das ist keine Höflichkeitsfloskel.

Wer am 8. August nachsieht und nichts findet, hat **nichts widerlegt** — Google
braucht Wochen. Wer am 19. einen Anstieg sieht, hat ihn **nicht verursacht**,
sondern beobachtet: es gibt keine Kontrollgruppe, und parallel laufen mindestens
drei andere Einflüsse (Alter der Seite, Googles eigene Umstellungen, alles was in
derselben Zeit an den Apps gebaut wird).

**Was am 2026-08-19 aufzuschreiben ist**, dieselben vier Zahlen wie im
Ausgangs-Eintrag:

- indexierte Seiten (Ausgang: **4**, Erwartung: bis zu 12)
- Klicks im Monat (Ausgang: **8**)
- Adressen in der Sitemap (jetzt 12 — sollte gleich bleiben)
- und **neu**: in der Search Console **einzelner Apps** nachsehen, ob
  `family-projekt.de` als Verweis auftaucht. Genau dafür wurde `noreferrer` bei
  eigenen Apps weggelassen. Am ehesten sichtbar bei Mein Rezeptbuch und Mein
  Mixarium (die stehen sowohl im Marktplatz als auch in der Werkzeug-Wand).

Der Eintrag gehört ins `forschung/JOURNAL.md`, unter die Marke, mit demselben
ehrlichen Vorbehalt: **Hinweis, kein Beweis.**

---

## Was sonst ansteht

### 1 · `smoke_stufe2_sporen.mjs` ist rot — und war es vorher schon

Meldet „drei Zeilen im Bericht (7)". **Nicht** von PR #209: auf `95b95f7` (Stand
davor) fällt er identisch aus, nachgeprüft. Der Test erwartet drei Zeilen im
Sporen-Bericht des Studios und findet sieben — vermutlich sind seit dem
Schreiben des Tests Einträge mit `sporeUrl` dazugekommen.

Zu klären: soll die Zahl mitwachsen (dann aus den Daten ableiten statt
festschreiben), oder ist der Bericht wirklich zu voll? **Erst den Test lesen,
dann entscheiden** — nicht die Zahl von 3 auf 7 hochsetzen, das wäre der grüne
Haken ohne Deckung.

### 2 · Die `index.html` hat weiterhin 0 statische Außen-Links

Das ist **kein** Versehen: die Startseite listet keine Apps, sie führt zu den
Unterseiten. Die haben jetzt statische Links dorthin. Wenn die Startseite später
eine Auswahl zeigen soll („die drei beliebtesten Werkzeuge"), ist
`tools/statische-listen.mjs` dafür schon gebaut — ein dritter Eintrag in
`bauePlan()` genügt, plus Marken in der Seite.

### 3 · Die Fußleiste `publicapps` (8 Links, jede Seite) ist bewusst dynamisch

Klaus hat sie 2026-08-05 draußen gelassen: alle 8 sind ohnehin über `listings.js`
oder `werkzeuge.js` statisch verlinkt, und dieselben 8 auf jeder Seite wirken eher
wie Fußzeilen-Deko. Kann bleiben, wie es ist. **`meineapps` (11) gehört nie ins
statische HTML** — dev-gesperrt, siehe `assets/app.js` Z. 343.

### 4 · Wenn der erste FREMDE Marktplatz-Eintrag kommt

Dann greift eine Regel, die heute noch nie scharf war: fremde Einträge bekommen
`rel="nofollow ugc noopener noreferrer"`, eigene nur `noopener`. Der Wächter prüft
das, und die Gegenprobe B in `tests/gegenprobe_statische_listen.sh` fährt es mit
einem eingeschleusten Eintrag durch. **Nach der ersten echten Freigabe einmal
nachsehen**, dass der Eintrag im HTML wirklich `nofollow ugc` trägt.

### 5 · Kommt je ein fremdes Werkzeug in `werkzeuge.js`

…wird `smoke_statische_listen.mjs` rot: alle externen Adressen dort müssen auf
Klaus' eigenen Hosts liegen (`EIGENE_HOSTS` in `tools/statische-listen.mjs`).
Das ist Absicht — dann muss jemand entscheiden, ob dafür gebürgt wird, statt
dass es stillschweigend durchrutscht. **Nicht einfach den Host in die Liste
schreiben**, sondern die Eigen-/Fremd-Frage beantworten.

---

## Pflichtlektüre vorher

1. `forschung/LEHREN.md` — besonders die **neue Regel 1b** (ein leerer Kasten
   verbirgt den Sprung, der unter ihm liegt) sowie 2 (erst den Trace), 5
   (Gegenprobe) und 6 (eine Messung ist eine Stichprobe)
2. `forschung/JOURNAL.md`, oberster Eintrag — Ausgangsstand und Erwartung
3. `docs/BRIEF_STATISCHE_LINKS.md` samt der zwei Korrekturkästen
4. `tools/statische-listen.mjs` — der Kopf-Kommentar nennt alle sieben Fallen

## Zum Abschluss

- `forschung/JOURNAL.md` fortschreiben
- Selbst-Merge nach dem netzweiten Freibrief, wenn die Wächter grün sind **und
  die Gegenproben gefahren wurden**
- „Nächste Schritte"-Block in der Chat-Antwort — Klaus liest den Chat
- Neuen Brief schreiben und vollständig als Codeblock im Chat ausgeben

---

## Eine Lehre aus dieser Sitzung, die über sie hinausgeht

Der Wächter war beim ersten Lauf **30 von 30 grün** — und zwei seiner Prüfungen
konnten gar nicht rot werden (`/\breferrer\b/` trifft `"noreferrer"` nicht).
Gefunden hat das nicht der grüne Lauf, sondern die Gegenprobe. Ausgerechnet die
eine Regel, die Klaus an diesem Tag ausdrücklich entschieden hatte, war
ungeprüft.

**Kein neuer Wächter ohne Gegenprobe. Jede einzelne, in beide Richtungen.**
