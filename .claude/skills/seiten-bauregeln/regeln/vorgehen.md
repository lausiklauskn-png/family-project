# Randnotiz: wie analysiert wird — nicht, was gebaut wird

> **Das hier ist eine Randnotiz, keine Pflichtlektüre.** Die eigentliche
> Dokumentation der Arbeit steht in
> [`forschung/JOURNAL.md`](../../../../forschung/JOURNAL.md) — dort, was gebaut
> wurde und mit welchem Ergebnis. Die anderen Dateien dieser Sammlung sagen,
> *was* an einer Seite richtig ist.
>
> Diese sagt, **wie man beim Untersuchen denkt** und woran das Denken bisher
> gescheitert ist. Lies sie, wenn eine Untersuchung nicht vorankommt, wenn ein
> Ergebnis zu glatt aussieht — oder wenn du gerade einen Fehler gemacht hast und
> wissen willst, ob es ein bekannter ist.
>
> Entstanden auf Klaus' Bitte (2026-08-07): *„Schreib hin, warum Du zu dem
> Schluss gekommen bist, dass Du etwas an deiner Vorgehensweise änderst … es
> geht nicht darum, was gemacht wurde, sondern wie Du etwas analysiert hast."*
> Und nachgeschärft: *„Nicht die Ursache in der Technik, sondern in der Art der
> Vorgehensweise. Das Zurückschauen und aus dem Fehler lernen, und zwar
> augenblicklich."*

---

## Der Befund, der diese Datei ausgelöst hat

An einem Tag (2026-08-07) liefen zwei Untersuchungen desselben Problems. Die
erste ging daneben, die zweite traf. **Die Fähigkeiten waren in beiden Fällen
dieselben** — gemessen, umgerechnet, verglichen wurde beide Male sauber.
Verschieden war nur, **wann aufgehört wurde zu prüfen**.

| | erste Untersuchung | zweite Untersuchung |
|---|---|---|
| gemeldet | „77 → 95, erledigt" | „lokal 97 — der Beweis ist dein Lauf" |
| draußen | **79, unverändert** | **98** |

Der technische Unterschied steht in [`skripte.md`](skripte.md) Regel 8. Der
**methodische** Unterschied steht hier, und er ist der wertvollere.

---

## Warum es beim zweiten Mal funktioniert hat

Fünf Dinge, jedes einzeln benennbar. Sie sind der eigentliche Ertrag des Tages.

### 1 · Die Abweichung wurde als Befund behandelt, nicht als Rauschen

Lokal 95, draußen 79. Es wäre bequem gewesen zu sagen: *„Messungen schwanken
eben, lokal weicht immer etwas ab."* Das ist sogar wahr — und es wäre trotzdem
der Fehler gewesen. 16 Punkte sind keine Schwankung.

**Der Satz, der weiterhilft:** *Wenn zwei Messungen dasselbe messen sollen und
weit auseinanderliegen, misst eine von beiden etwas anderes als gedacht. Finde
heraus, was.* Genau diese Frage führte zur Lösung.

### 2 · Die Frage wurde gewechselt

Vorher lautete sie: *„Ist meine Zahl besser geworden?"* Diese Frage ist
gefährlich, weil ihre Antwort davon abhängt, was ich erwarte.

Nachher lautete sie: *„Wann wird diese Datei geholt?"*

Das ist eine Frage mit **einer einzigen, überprüfbaren Antwort**, die mir nicht
entgegenkommen kann. 716 ms gegen 6666 ms — daran gibt es nichts zu deuten.

**Merksatz:** Formuliere die Frage so um, dass ihre Antwort nicht von deiner
Erwartung abhängen kann. Aus „ist es besser?" wird „wann/wie oft/wie groß?".

### 3 · Der Beobachtungspunkt wurde nach der Vermutung gewählt

Der Verdacht lautete: *der Service-Worker holt etwas Großes zur falschen Zeit.*
Im Netzwerk-Protokoll des Browsers tauchen Service-Worker-Anfragen **strukturell
nicht auf**. Wer dort sucht, findet nichts und schließt daraus fälschlich, es sei
nichts da.

Also wurde am **Server** gemessen, der jede Anfrage sieht.

**Merksatz:** Frag vor dem Messen, **wo** die vermutete Ursache überhaupt
sichtbar wäre — nicht, wo das Messen am bequemsten ist. Ein Werkzeug, das die
Sache prinzipiell nicht zeigen kann, beweist ihre Abwesenheit nicht.

### 4 · Die Gegenprobe lief gegen den alten Stand — und deren Fehler wurde gefunden

Der erste Vergleichslauf ergab: *„im alten Stand wird die Datei gar nicht
geholt"* — was die ganze Vermutung widerlegt hätte.

Statt das zu glauben, wurde nachgesehen. Ergebnis: als „alter Stand" war
versehentlich ein **anderes Repo** ausgepackt worden. Mit richtiger
Vergleichsbasis bestätigte sich die Vermutung.

**Und hier liegt die unbequeme Erkenntnis:** dieser Fehler fiel nur auf, **weil
das Ergebnis widersprach**. Hätte dieselbe falsche Vergleichsbasis ein Ergebnis
geliefert, das der Vermutung *recht gibt*, wäre sie nie geprüft worden.

**Merksatz:** Ein Ergebnis, das dir widerspricht, prüfst du ohnehin. Ein
Ergebnis, das dir recht gibt, **musst du dir zu prüfen vornehmen** — sonst tust
du es nicht.

### 5 · Beim Melden wurde die Zurückhaltung geübt

Der Satz lautete: *„Lokal 97 — aber genau diese Zahl hat gestern in die Irre
geführt. Der Beweis ist der nächste PageSpeed-Lauf."*

Das kostete nichts und hat sich sofort ausgezahlt: Klaus wusste, worauf er
schauen musste, und die Bestätigung kam eine halbe Stunde später.

**Merksatz:** Die Grenze zwischen *arbeiten* und *melden* ist die teuerste
Stelle im ganzen Ablauf. Fehler, die vorher passieren, kosten nur Zeit. Fehler,
die als Ergebnis gemeldet werden, kosten Vertrauen.

---

## Die fünf Denkfehler, die es zu vermeiden gilt

Alle fünf sind an einem einzigen Tag wirklich passiert. Keiner davon war ein
Rechenfehler, keiner ein fehlendes Werkzeug. **Bei jedem steht nicht nur, was
schiefging, sondern welcher Schritt der Arbeitsweise dorthin geführt hat** —
das ist der Teil, aus dem sich beim nächsten Mal etwas ableiten lässt.

### A · Bestätigung wird nicht geprüft

Ein Ergebnis, das zur Erwartung passt, wird ausgeliefert. Eines, das
widerspricht, wird untersucht. Diese Schieflage ist der Kern.

**Gegenmittel — eine Frage vor jeder Meldung:**
> *Was müsste wahr sein, damit dieses Ergebnis falsch ist? Und habe ich genau
> das geprüft?*

Bei der ersten Untersuchung wäre die Antwort gewesen: *„Es wäre falsch, wenn
draußen etwas kostet, das hier gratis ist."* Genau diese Frage hat den Fall
später gelöst. Sie war die ganze Zeit verfügbar.

### B · Der Gültigkeitsbereich wird überschritten

„900 Pixel reichen" war für die Startseiten-Karten **korrekt gemessen**. Dann
wurde derselbe Schluss auf den Kopf-Streifen übertragen, der dreimal so breit
ist. Dort war er falsch — und dieselbe Person hatte am selben Tag beides
gemessen.

**Gegenmittel:** Eine Schlussfolgerung wird **nie ohne ihren Bereich** notiert.
Nicht „900 px reichen", sondern „900 px reichen für die 335-px-Karte". Der
Zusatz ist keine Umständlichkeit — er ist der Teil, der später vor dem
Fehlschluss schützt.

### C · Zustand wird stillschweigend mitgeschleppt

Zweimal an einem Tag wurde im falschen Verzeichnis gearbeitet. Einmal wurde die
falsche Datei gelesen, einmal die falsche Vergleichsbasis ausgepackt.

**Und hier ist der Punkt, um den es geht.** Beide Male hieß die Erklärung
danach: *„Ich hatte im falschen Verzeichnis gearbeitet."* Das ist die
**technische** Ursache. Sie erklärt, was schiefging, aber nicht, **warum ich
dort gelandet bin**. Diese Frage blieb ungestellt — und sie ist die
interessantere. Klaus hat sie gestellt (2026-08-07): *„Nicht die Ursache in der
Technik, sondern in der Art der Vorgehensweise."*

Die Antwort hat drei Schichten:

**1 · Ich habe den Bezug angenommen, statt ihn herzustellen.** Das
Arbeitsverzeichnis stand noch von einem früheren Schritt. Ich wusste, dass es
zwischen Befehlen bestehen bleibt — und habe trotzdem Befehle gebaut, die
stillschweigend davon abhingen. Angenommenes Wissen fühlt sich beim Schreiben
genauso an wie geprüftes.

**2 · Ich habe eine relative Angabe benutzt, wo die Identität zählte.**
`git archive origin/main` — `origin/main` **wovon?** Der Befehl ist nur richtig,
wenn der Kontext richtig ist, und den hatte ich nie ausgesprochen. Wo es darauf
ankommt, *welches* Ding gemeint ist, ist eine relative Angabe keine Abkürzung,
sondern eine Wette.

**3 · Gerettet hat mich das Ergebnis, nicht die Methode.** Beim ersten Mal war
der Inhalt sichtbar fremd. Beim zweiten Mal widersprach das Ergebnis meiner
Vermutung. In beiden Fällen bin ich nur deshalb stutzig geworden, weil **die
Ausgabe auffiel**. Hätte dasselbe falsche Verzeichnis ein plausibles Ergebnis
geliefert, wäre es durchgegangen. Das ist keine Fehlerkontrolle, das ist Glück
— und es ist derselbe blinde Fleck wie Denkfehler A.

**Gegenmittel:** Vor jeder Operation, deren **Ergebnis du glauben willst**, den
Bezug ausdrücklich herstellen — volle Pfade, `git -C <repo>`, und eine
Kontrollzeile, die zeigt, *woran* gerade gearbeitet wird. Beim Auspacken eines
Vergleichsstands **immer** eine Plausibilitätsprüfung: *ist das überhaupt das
richtige Projekt?* Ein Zweizeiler genügt:

```bash
git -C /home/user/Mein-WorkFloh archive origin/main | tar -x -C "$ZIEL"
grep -o "workfloh-v[0-9]*" "$ZIEL/sw.js"   # Kontrolle: ist das WorkFloh?
```

### E · Die Lehre wird ausgesprochen, aber nicht angewendet

Das ist der Fehler, der die anderen überlebt — und er ist an diesem Tag
lehrbuchhaft passiert.

Nach dem **ersten** falschen Verzeichnis stand im Chat: *„Nichts passiert, aber
ich arbeite ab jetzt mit vollen Pfaden."* Wenige Schritte später wurde derselbe
Fehler noch einmal gemacht, an einer teureren Stelle.

Die Lehre war also **formuliert** und trotzdem **nicht wirksam**. Warum? Weil
sie als *Mitteilung an Klaus* behandelt wurde und nicht als *Änderung am
nächsten Befehl*. Etwas auszusprechen fühlt sich an wie es zu erledigen. Es ist
aber nur die Ankündigung.

**Gegenmittel — die Regel für den Augenblick:**

> **Eine Korrektur ist erst eine Lehre, wenn der nächste Befehl anders aussieht.
> Vorher ist sie eine Bemerkung.**

Praktisch heißt das: nach einem Fehler dieser Art **nicht weiterarbeiten**,
bevor die Gegenmaßnahme im **unmittelbar nächsten Schritt** sichtbar ist. Nicht
„ab jetzt achte ich darauf", sondern: der nächste Befehl trägt den vollen Pfad,
sofort, sichtbar. Wer das auf später verschiebt, verschiebt es auf nie — denn
die Sitzung endet, und die Absicht endet mit ihr.

**Und das rückwärts gerichtete Stück gehört dazu:** wenn ein Fehler auffällt,
nicht nur fragen *„was war technisch falsch?"*, sondern **im selben Moment**
*„welcher Schritt meiner Arbeitsweise hat mich dorthin gebracht?"*. Diese zweite
Frage kostet zwanzig Sekunden und ist die einzige, aus deren Antwort sich etwas
für den nächsten Fall ableiten lässt. Die erste Frage schließt den Vorfall, die
zweite verhindert ihn.

### D · Die Lösung ist zu früh da

Klaus' Beobachtung über mehrere Sitzungen (2026-08-07): *„Du hast schon eine
Lösung parat gehabt, ohne nachzudenken, ob eventuell ein anderer Gedanke, der
sich im Gespräch ergibt, die Lösung schon parat hält. Du warst viel zu
schnell."*

Das ist kein Tempo-Problem. Es ist ein **Reihenfolge-Problem**: die Antwort
entsteht, bevor die Frage fertig ist. Was danach kommt, wird dann nur noch
danach geprüft, ob es zur schon gefassten Antwort passt — siehe Denkfehler A.

**Gegenmittel:** Eine sofort verfügbare Lösung ist ein **Anlass zur Vorsicht,
nicht zur Eile**. Zwei Fragen, bevor sie ausgesprochen wird:
> *Beantwortet sie die Frage, die gestellt wurde — oder die, die ich erwartet
> habe? Und ist im Gespräch gerade etwas gesagt worden, das sie überflüssig
> macht?*

Der teuerste Fund dieses Tages kam nicht aus einer schnellen Antwort. Er kam
daraus, dass Klaus zwei Bildschirmfotos ohne Kommentar geschickt hat und die
Zahlen darauf nicht zu dem passten, was gemeldet worden war.

---

## Warum das hier steht und nicht nur gedacht wird

Eine Sitzung kann sich nichts vornehmen. Sie endet, und mit ihr endet jede
Absicht, es beim nächsten Mal besser zu machen. **Eine Datei kann das.**

Deshalb ist diese Sammlung nicht Beiwerk der Arbeit — sie ist der Teil, der
überlebt. Das war Klaus' Gedanke, nicht der einer Sitzung, und der 7. August
2026 hat ihn belegt: die Regel „lokale Messung ist ein Hinweis, PageSpeed ist
der Beweis" wurde am Vormittag teuer gelernt und stand am Abend geschrieben da,
als sie zum zweiten Mal gebraucht wurde.

**Pflicht für jede Sitzung:** Wer hier etwas lernt — über das *Vorgehen*, nicht
über die Technik — trägt es in **diese** Datei ein. Mit Datum, mit dem
konkreten Fall, und mit dem Satz, der beim nächsten Mal Zeit spart. Eine Regel
ohne den Fall dahinter wird nicht geglaubt und nicht befolgt.

---

## Kurzform zum Abhaken

Vor dem Melden eines Ergebnisses:

- [ ] **Was müsste wahr sein, damit das falsch ist** — und habe ich das geprüft?
- [ ] Ist meine Frage so gestellt, dass die Antwort **nicht von meiner Erwartung
      abhängt** (wann/wie oft/wie groß statt „besser?")?
- [ ] Habe ich dort gemessen, wo die vermutete Ursache **sichtbar sein kann**?
- [ ] Stimmt bei der Gegenprobe die **Vergleichsbasis** (richtiges Projekt,
      richtiger Stand)?
- [ ] Steht bei jeder Schlussfolgerung ihr **Gültigkeitsbereich** dabei?
- [ ] Trenne ich sauber zwischen **„gemessen"** und **„bewiesen"**?
- [ ] War die Lösung **sofort da**? Dann noch einmal langsam.

Und nach jedem bemerkten Fehler — **sofort, nicht am Sitzungsende**:

- [ ] Nicht nur „was war technisch falsch?“, sondern **„welcher Schritt meiner
      Arbeitsweise hat mich dorthin gebracht?“**
- [ ] Sieht der **nächste Befehl** anders aus? Wenn nein, war es keine Lehre,
      sondern eine Bemerkung.
