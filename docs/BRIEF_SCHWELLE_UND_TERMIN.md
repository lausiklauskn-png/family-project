# Brief: der Termin am 19. — und eine Schwelle, die nicht hält

**Für die Nachfolgesitzung.** Angelegt 2026-08-06.

Der vorige Brief ist `docs/BRIEF_NACH_STATISCHEN_LINKS.md`. Seine fünf offenen
Punkte sind unten abgearbeitet oder eingeordnet; zwei Sachen sind neu.

---

## 1 · Der Termin: 2026-08-19, und keinen Tag früher

Unverändert der wichtigste Punkt, und er ist ein Datum, kein Bau.

Am 2026-08-06 wurde **nichts** in der Search Console nachgesehen — 13 Tage zu
früh. Das steht so im Journal, weil es der Inhalt ist und nicht sein Fehlen.
Wer vorher nachsieht und nichts findet, hat nichts widerlegt.

**Am 2026-08-19 aufzuschreiben**, dieselben vier Zahlen wie im Ausgangs-Eintrag:

- indexierte Seiten (Ausgang **4**, Erwartung bis zu 12)
- Klicks im Monat (Ausgang **8**)
- Adressen in der Sitemap (**12**, sollte gleich bleiben)
- in der Search Console **einzelner Apps**: taucht `family-projekt.de` als
  Verweis auf? Am ehesten bei Mein Rezeptbuch und Mein Mixarium — die stehen
  im Marktplatz **und** in der Werkzeug-Wand. Genau dafür fällt bei eigenen
  Apps das `noreferrer` weg.

Mit demselben Vorbehalt wie am 5. August: **Hinweis, kein Beweis.** Es gibt
keine Kontrollgruppe, und parallel laufen mindestens drei andere Einflüsse.
Wer am 19. einen Anstieg sieht, hat ihn beobachtet, nicht verursacht.

---

## 2 · Erledigt: die Schwelle 20 hat nicht gehalten — und ist repariert

Jasons-Tresor, **seit dem 2026-08-03 unverändert**, dreimal von Google:

| gemessen | Leistung | Bedienbarkeit | gute Praxis | Auffindbarkeit |
|---|---|---|---|---|
| 2026-08-04 | 83 | 92 | 100 | 100 |
| 2026-08-05 | **64** | 92 | 100 | 100 |
| 2026-08-06 | **97** | 92 | 96 | 100 |

33 Punkte an einer Seite, an der niemand etwas angefasst hat. `SCHWELLE = 20`
stammte aus einer gemessenen Streuung von **19** — an derselben Seite, zwei
Nächte vorher. Widerlegt.

**Klaus hat noch am selben Tag entschieden, beides ist gebaut (PR #212):**

**a) Journal — Bestätigung statt höherer Zahl.** Die Schwelle bleibt bei 20 und
sagt weiterhin, was groß genug ist, um hinzusehen; sie entscheidet nicht mehr
allein. Ein Sprung wird als *Verdacht* in `forschung/messreihe.json` gemerkt und
erst zum Eintrag, wenn ihn die nächste Messung hält. Gemessen wird gegen den
Stand **vor** dem Sprung, die Richtung muss stimmen, und ein verworfener
Ausreißer wird **nicht** zum neuen Maßstab (sonst dreht sich eine schwankende
Seite bei 50 → 90 → 50 selbst einen Eintrag „90 → 50" an).

**b) Karte — die umgekehrte Vorsicht.** Klaus: *„Keiner soll schlechter
abschneiden, als wenn er selber nachmisst."* Ein besserer Wert gilt sofort, ein
schlechterer erst beim **dritten Mal hintereinander**; eine gute Messung
dazwischen setzt die Zählung zurück. Entschieden wird an der Leistung.

Das ist kein Widerspruch, sondern dieselbe Einsicht für zwei Aufgaben: das
Journal ist ein Protokoll über **Ursachen** (skeptisch in beide Richtungen), die
Karte eine öffentliche Aussage über eine **fremde App** (vorsichtig nur nach
unten). `LEHREN.md` 6c und 6d.

**Die Ehrlichkeits-Grenze ist scharf** — Entprellen kippt in Schönfärberei,
sobald eine dieser drei fällt, und alle drei sind einzeln gegengeprobt:
der gezeigte Wert wurde **wirklich so gemessen** (ganzer Satz, nichts gemischt) ·
das **Messdatum wandert nicht mit** · der frische Wert steht als `frisch`
daneben und die **Messreihe schreibt ihn ungekürzt fort**.

### Was daran noch offen ist

- **Die Karte sagt noch nicht, dass sie hält.** Die Daten liegen
  (`zurueckgehalten: {zahl, noetig, seit}`), aber weder Karte noch Studio zeigen
  es an. Solange das fehlt, ist die Zurückhaltung zwar aufgezeichnet, aber für
  Klaus unsichtbar. **Das ist der nächste sinnvolle Bau.**
- **Beide Regeln sind nur headless bewiesen.** Ihren ersten echten Lauf haben
  sie in der Nacht nach dem Merge. Danach einmal nachsehen, ob `verdacht`
  wirklich in `messreihe.json` steht und ob das Journal ruhig geblieben ist.
- **Ein Sonderfall bleibt bewusst offen:** eine Seite, die genau einmal gemessen
  und danach nie wieder angefasst wird, behält ihren Verdacht für immer. Das ist
  hingenommen — besser als ein Eintrag, der nie bestätigt wurde.

## 3 · Erledigt: `smoke_stufe2_sporen.mjs` ist grün, mit Deckung

Der Test stand auf „drei Zeilen im Bericht (7)“ — schon vor PR #209, auf
`95b95f7` identisch.

Die Vermutung im vorigen Brief (es seien Einträge mit `sporeUrl` dazugekommen)
war **falsch**. Gemessen statt geraten:

```
Block [data-role=sporen]:  3  — Rezeptbuch · Mixarium · BookLedgerPro
Block [data-role=messung]: 4  — Rezeptbuch · Mixarium · Kimboard · Tomys Hub
```

Der Sporen-Bericht hatte die ganze Zeit genau die erwarteten drei Zeilen. Die
vier überzähligen gehören dem **Mess-Block** (Stufe 5), der für seine Zeilen
dieselbe CSS-Klasse `.fpst-sporezeile` benutzt — und die zählte der
ungefilterte `document.querySelectorAll` über die ganze Seite mit. Sie stammen
aus dem **echten** `assets/config/messung-hand.json`; vom Test kommt nur
`spore-stand.json`, alles andere liefert das Repo.

Die Zahl hing also an einer Datei, die mit dem Bericht nichts zu tun hat: **7
wäre morgen 8.** Genau darum war „3 auf 7 hochsetzen“ keine Reparatur. Die
Erwartung bleibt **3**; gemessen wird jetzt der Block, über den der Test eine
Aussage macht (`[data-role=sporen] .fpst-sporezeile`).

Nebenbei geheilt: die XSS-Prüfung griff sich das erste `small` **irgendeiner**
Zeile. Wäre eine Messzeile mit `small` vorn gelandet, hätte sie einen harmlosen
Text geprüft und wäre grün geblieben, ohne den fremden Text je anzusehen.

**Gegenprobe:** `tests/gegenprobe_stufe2_sporen.sh`, acht Proben, alle wie
erwartet — echter Fehler rot · beide falschen Reparaturen rot · kaputter Wähler
rot · XSS-Prüfung rot bei `innerHTML` · und der Nachweis, dass eine zusätzliche
Hand-Messung den Bericht jetzt in Ruhe lässt.

> **Zwei Fallen, die beim Bauen zugeschnappt sind — damit sie niemand
> wiederholt:**
>
> 1. `heile()` ist ein `git checkout --`. Beim ersten Lauf lag der zu prüfende
>    Fix noch **uncommitted** im Baum; die erste `heile()` hat ihn gelöscht,
>    und alle Proben danach liefen gegen den alten Stand und meldeten Unsinn.
>    Das Skript bricht jetzt ab, wenn die Dateien nicht sauber sind. **Erst
>    committen, dann gegenproben.**
> 2. Die eingeschleuste Hand-Messung trug `barrierefreiheit`/`seo` statt
>    `bedienbarkeit`/`auffindbarkeit`. `msZahlen()` verwirft solche Einträge
>    **lautlos** — es entstand keine Zeile, und die Probe blieb grün, obwohl
>    sie rot sein sollte. Der Fehler lag in der Probe, nicht im Befund.

---

## 4 · Eingeordnet, nichts zu tun

**`index.html` hat 0 statische Außen-Links** — nachgezählt, stimmt, und ist
gewollt: die Startseite listet keine Apps, sie führt zu den Unterseiten, und
die sind verlinkt. Zum Vergleich: `markt.html` 14 · `werkzeuge.html` 11 ·
`netzwerk.html` 1. Soll die Startseite später eine Auswahl zeigen, genügt ein
dritter Eintrag in `bauePlan()` in `tools/statische-listen.mjs` plus Marken in
der Seite.

**Die `publicapps`-Fußleiste bleibt dynamisch** (Klaus 2026-08-05). Alle 8 sind
ohnehin über `listings.js` oder `werkzeuge.js` statisch verlinkt.
**`meineapps` gehört nie ins statische HTML** — dev-gesperrt, `assets/app.js`
Z. 343.

**Die zwei Regeln für Fremdes sind noch nie scharf gewesen**, weil es den Fall
nicht gibt: 0 von 14 Marktplatz-Einträgen sind fremd (alle tragen `own`), und
alle 13 externen Werkzeug-Adressen liegen auf `lausiklauskn-png.github.io`.
Beide Regeln sind gebaut und gegengeprobt, aber im Echtbetrieb ungetestet:

- **Erster fremder Marktplatz-Eintrag:** nachsehen, dass er im HTML wirklich
  `rel="nofollow ugc noopener noreferrer"` trägt (eigene bekommen nur
  `noopener`). Probe B in `tests/gegenprobe_statische_listen.sh` fährt das
  durch.
- **Erstes fremdes Werkzeug in `werkzeuge.js`:** dann wird
  `smoke_statische_listen.mjs` rot. Das ist Absicht. **Nicht einfach den Host
  in `EIGENE_HOSTS` schreiben** — die Frage lautet, ob für ihn gebürgt wird.

---

## 5 · Was beim Arbeiten auffiel

`npm install playwright-core --no-save` ist **Voraussetzung**, sonst bricht
jeder Browser-Test mit `ERR_MODULE_NOT_FOUND` ab — und zwar so, dass es nach
einem kaputten Werkzeug aussieht. Es gibt keine `package.json`; der nächtliche
Lauf installiert sich das selbst (`PW_CORE=playwright`).

Die `smoke_*`-Tests hängen **nicht** am nächtlichen Lauf — der fährt nur die
Werkzeuge. Sie sind Handarbeit. Das Grün von `smoke_stufe2_sporen.mjs` ist also
nur so viel wert, wie jemand ihn fährt.

---

## Pflichtlektüre vorher

1. `forschung/LEHREN.md` — **Lehre 6c und 6d sind neu** (die 19 waren zu wenig;
   und warum für die Karte die umgekehrte Vorsicht gilt), dazu 1b (ein leerer
   Kasten verbirgt den Sprung darunter), 2 (erst den Trace), 5 (Gegenprobe),
   6 (eine Messung ist eine Stichprobe)
2. `forschung/JOURNAL.md`, die zwei obersten Einträge — Termin-Zwischenstand
   und das nachgetragene „Warum“ zu Jasons-Tresor
3. `docs/BRIEF_NACH_STATISCHEN_LINKS.md` — der vorige Brief
4. `tools/statische-listen.mjs` — der Kopf-Kommentar nennt alle sieben Fallen
5. `tools/messung.mjs`, `messungBilden` — die Haltefrist und die drei
   Bedingungen, unter denen sie ehrlich bleibt

## Zum Abschluss

- `forschung/JOURNAL.md` fortschreiben
- Selbst-Merge nach dem netzweiten Freibrief, wenn die Wächter grün sind **und
  die Gegenproben gefahren wurden**
- „Nächste Schritte“-Block in der Chat-Antwort — Klaus liest den Chat
- Neuen Brief schreiben und vollständig als Codeblock im Chat ausgeben

---

## Die Lehre dieser Sitzung

Der vorige Brief hat eine Vermutung mitgeliefert („vermutlich sind Einträge mit
`sporeUrl` dazugekommen“) und ausdrücklich dazugeschrieben, sie erst zu prüfen.
Sie war falsch. Hätte jemand sie übernommen, hätte er die 3 auf 7 gesetzt und
einen Haken ohne Deckung produziert.

**Eine Vermutung im Brief ist eine Vermutung, auch wenn sie plausibel klingt
und von einer Sitzung stammt, die näher dran war.** Das gilt in beide
Richtungen: dieser Brief hier enthält ebenfalls welche.

## Und eine zweite, aus derselben Sitzung

Die Gegenprobe zu Fall 9 lief beim ersten Mal gegen den **falschen Stand**: ihr
`heile()` ist ein `git checkout --`, und der zu prüfende Fix lag noch
uncommitted im Baum. Die erste Probe hat ihn gelöscht, die übrigen meldeten
Unsinn. Beide Gegenproben brechen jetzt ab, wenn die betroffenen Dateien nicht
sauber sind.

**Ein Werkzeug, das Dateien zurücksetzt, muss sich weigern, wenn dort
ungesicherte Arbeit liegt.** Und: erst committen, dann gegenproben.
