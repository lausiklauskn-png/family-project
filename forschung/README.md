# Forschungsstation

Klaus' Auftrag vom 2026-08-04, sinngemäß: *nicht jede Seite einzeln nachbessern,
sondern aus den Messwerten lernen, wie man eine Seite baut, die von Anfang an
gut ist.* Perfect Skin Beauty war so eine — das ist der Maßstab.

Drei Dateien, drei verschiedene Aufgaben. Sie sauber zu trennen ist der ganze
Trick, weil sonst die nächtliche Maschine die Erklärungen eines Menschen
überschreibt.

| Datei | Wer schreibt | Was drin steht |
|---|---|---|
| `messreihe.json` | **nur** das Werkzeug | die Zahlen über die Zeit |
| `JOURNAL.md` | Werkzeug **und** Sitzung | *was* sich geändert hat (Werkzeug) und *warum* (Sitzung) |
| `LEHREN.md` | **nur** von Hand | was daraus für die nächste Seite folgt |

## Warum eine eigene Reihe und nicht der Tagesbericht

`assets/config/spore-stand.json` ist ein **Schnappschuss**. Die nächtliche
Aktion überschreibt ihn; er kennt nur das Heute. Eine Verlaufsfrage — *„war das
schon vor der Bildumstellung so?"* — kann er prinzipiell nicht beantworten. Die
Reihe kann es.

## Wie die Reihe aufgebaut ist

Je Ziel eine Liste von Punkten. Ein Punkt gilt **von** einem Tag **bis** zu
einem Tag, beide eingeschlossen. Ändert sich an einem Tag nichts, wächst nur
`bis` des letzten Punktes — die Datei bleibt klein, ohne dass ein Tag verloren
geht. Wer den Wert an einem beliebigen Tag wissen will, sucht den Punkt, dessen
Spanne diesen Tag enthält.

Jeder Punkt trägt seine **Quelle** mit (`google` = PageSpeed Insights,
`eigen` = eigene Lighthouse-Messung). Ohne die Quelle wäre ein Sprung nicht von
einem Wechsel der Messmethode zu unterscheiden.

Ein Eintrag mit Schaufenster (vorgeschaltete Landingpage) wird als **zwei**
Ziele geführt. Das sind zwei verschiedene Seiten mit zwei verschiedenen
Bauweisen, und genau der Unterschied ist interessant.

## Bedienung

```bash
node tools/forschung.mjs --nachtragen                 # läuft nachts von selbst
node tools/forschung.mjs --rangliste                  # wo stehen wir gerade
node tools/forschung.mjs --zeigen                     # alle Ziele, ganzer Verlauf
node tools/forschung.mjs --zeigen --ziel=mixarium     # nur ein Ziel
node tools/forschung.mjs --zeigen --seit=2026-08-01   # ab einem Datum
node tools/forschung.mjs --offen                      # wo fehlt noch das „Warum“
```

`--offen` ist die **Kontrollliste**: sie zeigt jeden Journal-Eintrag, bei dem
die Maschine einen Sprung eingetragen hat, aber noch niemand erklärt hat,
wodurch er zustande kam. Das abzuarbeiten ist die eigentliche Forschungsarbeit —
aus beantworteten Einträgen wächst `LEHREN.md`.

## Der wunde Punkt

Das Werkzeug schreibt jede Nacht in dieselbe Datei, in der ein Mensch
Erklärungen hinterlegt hat. Geht dabei etwas schief, ist der Schaden **still**:
die Zahlen stimmen weiter, nur das „Warum“ von vor drei Wochen ist weg, und
niemand vermisst es, bis man es braucht.

Deshalb fügt das Werkzeug neue Einträge **oben** an (unter der Marke
`<!-- forschung:auto -->`) und fasst alles darunter nie wieder an. Und deshalb
prüft `tests/smoke_forschung.mjs` vor allem **Erhaltung**, nicht Ausgabe —
Gegenprobe beim Bauen: schreibt man das Journal komplett neu statt oben
anzufügen, fällt genau diese Probe.

## Zwei Quellen, ein Einsortier-Pfad

Gemessen wird aus **zwei** Richtungen:

1. **Der Marktplatz** — die 17 Seiten, die `assets/config/listings.js` führt
   (14 Einträge, drei davon mit Schaufenster als eigenes Ziel). Die misst der
   bestehende Nacht-Lauf; `--nachtragen` sortiert seinen Bericht ein.
2. **Die eigenen Ziele** — `messziele.json`. Klaus 2026-08-04: *„wir wollen
   bitte kein Repo auslassen, was dazu geeignet wäre, geprüft zu werden."*
   Hier stehen die Seiten, die **nicht** im Marktplatz sind: family-projekt.de
   selbst, Sage-Protokol samt Such-Tool und Pinnwand, SB-KIMTool-Point,
   Alis Moderaum, Company Brain, Küchenzettel, Muttis Rezeptbuch und die
   WorkFloh-Seite. `--messen` misst sie.

**Der Marktplatz bleibt unberührt.** Er ist Klaus' kuratiertes Schaufenster und
soll nicht durch Mess-Ziele verwässert werden — deshalb eine getrennte Liste.

Einsortiert wird beides über **denselben** Pfad. Zwei Einsortier-Wege wären zwei
Wahrheiten, die auseinanderlaufen; man merkt es erst an einem Verlauf, der an
einer Stelle Lücken hat und an einer anderen doppelte Punkte.

Sechs Repos stehen in `messziele.json` mit `aktiv: false` und einem **Grund** —
sie haben (Stand 2026-08-04) kein `index.html` in der Wurzel von `main`, es gäbe
also nichts zu messen. Sie sind bewusst aufgeführt statt weggelassen: so sieht
man, dass sie geprüft und nicht vergessen wurden. Legt Klaus dort eine Seite an,
genügt `aktiv: true`.

## Deckel

Ohne PSI-Schlüssel dauert jede Messung rund eine Minute. `FORSCHUNG_MAX`
(Standard 6) begrenzt, wie viele eigene Ziele pro Nacht drankommen; wer heute
nicht drankommt, kommt beim nächsten Mal **zuerst** dran (ältester Befund
zuerst). Der Lauf sagt, wie viele übersprungen wurden — ein stiller halber
Durchgang liest sich sonst wie ein ganzer.
