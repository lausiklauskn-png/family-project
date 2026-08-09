# Übergabe-Brief · 2026-08-09 → nächste Sitzung

**Auftrag der nächsten Sitzung: PLANMODUS. Kein Code.**
Zu analysieren ist `lausiklauskn-png/semantic-match-demo`. Daraus entsteht ein
Plan — oder die begründete Auskunft, dass es keinen geben sollte.

---

## 1. Pflichtlektüre — in dieser Reihenfolge, vor dem ersten Handgriff

1. `Sage-Protokol/CLAUDE.md` — die Verfassung. Besonders § Sitzungsstart-Pflicht
   (immer von `origin/main`), § Freibrief, § Tafel-Evolutions-Klausel.
2. **Diesen Brief**, Abschnitt 3 und 4. Das ist der Teil, der die Arbeitsweise
   betrifft, nicht den Code.
3. `family-project/docs/PULS.md` — oberster Eintrag.
4. Erst dann den Code der Scheibe, an der gearbeitet wird.

**Nicht lesen**, was nicht gebraucht wird. Token-Budget ist kein Sparzwang,
sondern Konzentration.

---

## 2. Was diese Sitzung getan hat

**family-project** (PR #240–#248)

| | |
|---|---|
| #240 | Wächter: Sicherheits-Fingerabdruck statt Voll-Prüfsumme. Gelb nur noch bei neuer fremder Herkunft oder auffälligem Muster (`eval`, `atob`, …), nicht mehr bei jedem getauschten Text. |
| #241 | Studio-Veröffentlichen repariert: Frist am `fetch` (der Knopf konnte nie zurückspringen) + zwei unabhängige Stränge statt einer Kette. |
| #242 | PULS: Befund, Ursache, offener Punkt. |
| #243 | Hand-Messung: „von uns persönlich geprüft" ≠ „vom Anbieter gemeldet". |
| #244 | Messwerte 09.08. eingetragen; Schaufenster-Ablesung wird nicht mehr mitgerissen. |
| #245 | Quittung wirkt **sofort** auf der Karte statt erst nachts. |
| #246 | Quittungs-Datum + neutraler Text; Server-Prüfer lässt unveränderte Felder durch. |
| #247/#248 | Perfect Skin Beauty: 97 → 98. |

**Perfect-Skin-Beauty** (PR #38–#42): Karte auf Knopfdruck statt Einbettung ·
Hero-Bild aus `z-index: -1` geholt (**das war die echte Ursache** der
fehlgeschlagenen Leistungsmessung) · Karten-Vorschaubild (694×694, 50 KB) ·
Hero-Überschrift schiebt statt einzublenden.

**Offen, nicht abarbeitbar:** das Quittungs-Datum konnte nicht getestet werden,
weil nichts zu quittieren war. Löst sich beim nächsten gelben Band von selbst.

---

## 3. Was wir aus Fehlern gelernt haben

Dies ist der wichtigste Abschnitt des Briefes. Jeder Punkt hat heute Geld in
Form von Zeit gekostet.

### 3.1 „Bewiesen" ist ein Wort mit Bedingungen

Ich meldete am Vormittag, die eingebettete Karte sei als Ursache des
Messfehlers **bewiesen**. Sie war es nicht. Der Beleg wäre in zwei Minuten zu
haben gewesen:

```
letzte gute Messung   04.08.  (MIT Karte)
erste gescheiterte    05.08.
Commits dazwischen    keine
```

**Regel:** Bevor eine Ursache benannt wird — die Zeitachse aufstellen. *Letzte
gute Beobachtung · erste schlechte · was liegt dazwischen?* Liegt nichts
dazwischen, ist die Ursache nicht im Depot.

### 3.2 „Schwankung" muss verdient werden

Als der Fehler wiederkam, nannte ich es Schwankung. Es waren zwei von zwei
Fehlschlägen — reproduzierbar. Später waren es vier von fünf Grün, *dann* war
Schwankung die richtige Beschreibung.

**Regel:** Schwankung ist eine Aussage über eine **Zählung**, nie eine
Ausrede. Ohne Zahl kein Wort.

### 3.3 Eine Prüfung, die durch ein Rohr läuft, prüft nichts

```bash
node tests/xyz.mjs 2>&1 | tail -2 && git commit …
```

Der Test brach beim Start ab (eine Abhängigkeit fehlte). Der Rückgabewert der
Pipe ist der von `tail` — also 0. Die Kette lief weiter und ich meldete grün.
**Genau die Sorte stille Lüge, gegen die dieses Netz gebaut ist**, nur im
eigenen Werkzeug.

**Regel:** ein Test entscheidet nur dann über „grün", wenn sein eigener
Rückgabewert die Kette trägt. `| tail` ist zum Lesen da, nicht zum Urteilen.

### 3.4 Drei Maschinen — die Ursache liegt oft außerhalb des Depots

Das Studio konnte nicht veröffentlichen. Die Ursache lag nicht im Code,
sondern in einer **Server-Datei vom 1. August**, der eine Aktion fehlte, die
am 3. August dazugekommen war. Der Beweis kam aus *Datum und Größe* in Klaus'
WebFTP-Fenster — von hier aus war er nicht zu holen.

**Regel:** Bei einem Fehler an einer Server-Aktion gehört *„wie alt ist die
Datei dort?"* zu den **ersten** Fragen. Und: Tablet / Caddy-Cloud-Server /
Apache-Webhosting sind drei Orte. Jeder Befehl sagt dazu, wohin er gehört.

### 3.5 Wenn zwei Erklärungen sterben, hört das Raten auf

Nach der Karte und der Sprache war die dritte Vermutung fällig — und die wäre
wieder nur eine gewesen. Richtig war: **das echte Werkzeug holen**
(`npm install lighthouse`, dieselbe Fassung wie im Bericht) und Klaus um die
**unterscheidende Messung** bitten, nicht um Bestätigung.

**Regel:** Nach der zweiten widerlegten Hypothese wird nichts mehr gebaut.
Dann wird gemessen — oder ein Versuch entworfen, dessen zwei möglichen
Ausgänge *verschiedene* Ursachen bedeuten.

### 3.6 Der Mensch liefert die Gegenbeweise schneller

Klaus hat beide falschen Erklärungen widerlegt, die zweite mit einem Satz:
*„Jetzt ist es genau umgedreht."* Erst scheiterten Russisch und Polnisch, dann
dieselben mit 98, während Deutsch und Englisch ausfielen. Eine Eigenschaft der
Seite dreht sich nicht alle zehn Minuten um.

**Regel:** Wer am Gerät sitzt, sieht Dinge, die aus dem Depot nicht sichtbar
sind. Eine Bitte um die **entscheidende** Beobachtung ist wertvoller als die
nächste eigene Vermutung. Und: die Bitte muss sagen, was welches Ergebnis
bedeuten würde — sonst ist es nur Beschäftigung.

### 3.7 Zahlen können am Zweck vorbeimessen

Beim Komprimieren des Kartenbildes wichen selbst bei hoher Qualität
rechnerisch 38 % der Bildpunkte ab. Nach der Zahl wäre jede Stufe schlecht
gewesen. Erst die dreifache Vergrößerung zeigte, wo die Schrift wirklich
verschmiert: bei q0.35 ja, ab q0.55 nicht mehr.

**Regel:** Eine Kennzahl beantwortet die Frage, die sie misst — nicht die
Frage, die man hat. Im Zweifel hinsehen.

### 3.8 Die verlockende Abkürzung, die eine Lüge gewesen wäre

Damit die Überschrift als „größter sichtbarer Inhalt" zählt, hätte
`opacity: .02` genügt — unsichtbar fürs Auge, für Chrome sichtbar. Eine Zeile,
sofort wirksam, und die gemessene Zeit wäre **geschönt** gewesen. Stattdessen
wurde die Überschrift wirklich sichtbar gemacht.

**Regel:** Wenn eine Änderung nur die Messung verbessert und nicht die Sache,
ist sie keine Verbesserung. Bei einem Marktplatz, der mit geprüften Zahlen
wirbt, ist sie ein Selbstwiderspruch.

### 3.9 Beschriftungen sind Aussagen

Jeder von Hand eingetragene Wert trug den Satz „Vom Anbieter selbst
abgelesen". Für Klaus' eigene Messungen war das falsch — **zu seinen
Ungunsten**. Und „geändert, aber in Ordnung befunden" liest sich bei einer
fremden App, als hätte er daran gedreht.

**Regel:** Ein Etikett, das nicht genau stimmt, ist ein Fehler wie jeder
andere. Zwei verschiedene Sachverhalte brauchen zwei Beschriftungen — und der
Standard ist die **schwächere** Lesart, sonst ist das stärkere Etikett nichts
wert.

### 3.10 Werkzeug-Fallen, die Arbeit gekostet haben

- **`git checkout -B <zweig> origin/main` bricht ab**, wenn Änderungen im Baum
  liegen — der nachfolgende Commit landet dann auf dem **alten** Zweig. Also:
  **erst committen, dann verzweigen**, oder `stash` benutzen.
- Ein Zweig, der schon squash-gemergt wurde, **kollidiert** beim nächsten
  Commit. Sauber ist: neu von `origin/main` aufsetzen und den Commit
  herüberholen (`cherry-pick`).
- Ein `node_modules`-Verweis im Arbeitsordner kann durch eine spätere
  `npm install` **verschwinden** — und reißt dann Tests mit, die niemand mehr
  ansieht (siehe 3.3).

---

## 4. Arbeitsweise mit Klaus — was sich bewährt hat

- **Ein Schritt pro Antwort, mit klarem Erfolgs-Indikator.** „Es steht danach
  X in der Liste." Nicht drei Schritte auf einmal; er verliert beim Scrollen
  den Faden, und das ist kein Mangel, sondern eine Tatsache über die
  Arbeitsumgebung (Tablet).
- **Sagen, wohin ein Befehl gehört** (Tablet / Cloud-Server / Webhosting).
- **Keine Konsolen-Befehle**, wo ein Knopf oder ein Browser-Weg reicht. Der
  PHP-Austausch heute lief über Copy-Paste in den WebFTP-Editor — mit der
  Ansage „erst Strg+A, dann einfügen" und einer **Größen-Erwartung** als
  Erfolgs-Kontrolle (15,78 KB). Das hat auf Anhieb funktioniert.
- **Fail-soft, immer.** Beispiele von heute: leeres `data-karte-bild` → gar
  keine Anfrage; Bild erst nach `onload` einhängen; Quittung notfalls **ohne**
  Datum veröffentlichen statt gar nicht. Ein fehlendes Stück darf nie den
  ganzen Weg blockieren.
- **Ehrlich benennen, was nicht geprüft ist.** Dieses Environment kommt nicht
  ins offene Netz (CONNECT 403). Alles, was den Live-Server betrifft, ist
  „ungeprüft — wartet auf Klaus". Das steht in jedem PR-Text.
- **Selbst-Merge nach Freibrief**, aber jede Entscheidung dokumentiert. Nie
  stillschweigend.
- **Korrekturen kurz und ohne Zerknirschung.** Heute waren zwei nötig. Ein
  Satz, was falsch war, ein Satz, was jetzt gilt, weiterarbeiten.

---

## 5. Der nächste Auftrag — Planmodus `semantic-match-demo`

**Klaus' Wort:** *„Es geht erstmal nur um einen Planmodus. Kein Code."* Erst
analysieren, dann einen Plan — und dazu gehört ausdrücklich die Antwort
**ob** etwas gebaut werden sollte, nicht nur wie.

### Erst-Befund (nur Bestandsaufnahme, keine Bewertung)

Das Repo ist im Arbeitsbereich: `/workspace/semantic-match-demo`
(Stand `031ab12`, 2026-07-28, flacher Klon — für Historie
`git fetch --unshallow`). Live: `https://lausiklauskn-png.github.io/semantic-match-demo/`

```
index.html              SBKIM · Semantisches Bidirektionales KI-Matching  (70 KB)
hub.html                SBKIM · Hub
sbkim-network.html      SBKIM · Agent Network Layer                       (56 KB)
sbkim-flow.html         SBKIM · Transaktionsfluss
protocol/sbkim-node.html      · Knoten
protocol/sbkim-register.html  · Registrieren
docs/SBKIM_AGENTS.md
SBKIM_Paper.html · SBKIM_Paper_DE.html · das große Paper als PDF
USP_SBKIM.html · USP_Bidirektionales_Matching.pdf
Everlast_Pitch.html
Konzept_PWA_Marktplatz.pdf · Marktanalyse · zwei Kostenanalysen
CLAUDE.md (15 KB)
```

Das ist die **Wurzel** dessen, was seither gebaut wurde: Paper, Pitch, Markt-
und Kostenanalysen, eine Demo, ein Hub, eine Netzwerk-Schicht und zwei
Protokoll-Seiten. Also Konzept und Prototyp an einem Ort — während das Mycel
inzwischen 14 laufende Knoten und einen Marktplatz hat.

### ⚠ Everlast GmbH — vor allem anderen zu klären

Das Repo ist **nicht neutral**. Es ist über weite Strecken ein **Angebot an
eine namentlich genannte Firma**, und es ist **öffentlich**:

```
Everlast_Pitch.html                    Partnerschafts-Angebot („Was ich einbringe /
                                       Was Everlast einbringt / Was nicht funktioniert")
Kostenanalyse_Everlast_Engine_PWA.pdf  eigene Kostenrechnung
hub.html            Karte „Für Everlast" verlinkt den Pitch
sbkim-flow.html     Transaktionsfluss mit „Everlast-Gebühr (3 %)"
index.html          „③ Zertifizierter Entwickler – Everlast-Review ✓"
sbkim-network.html  Knoten „Everlast CRM"
protocol/…register  Platzhalter „z. B. Klaus, Everlast GmbH, SportShop24…"
sw.js               beide Everlast-Dateien im Offline-Vorrat
```

**Dem steht eine stehende Anweisung von Klaus gegenüber.** In
`Sage-Protokol/docs/PULS.md` steht als *heilige Tafel*:

> **Privatheits-Klausel: Die Sonnen-Galaxie erwähnt Everlast GmbH NICHT.**
> Klaus' Wunsch ausdrücklich. Stationen, die im realen Werdegang einen
> kommerziellen Kontext hatten, werden ausschließlich in ihrer
> technisch-konzeptionellen Form erzählt.

Beides zusammen ergibt eine Spannung, die **niemand auflösen darf außer
Klaus**: an einer Stelle wird der Name bewusst herausgehalten, an einer
anderen steht er öffentlich im Netz, samt Gebührenmodell.

**Pflicht der nächsten Sitzung:** diese Spannung **benennen, nicht
auflösen**. Nicht eigenmächtig etwas entfernen (der Pitch kann gewollt
öffentlich sein — er ist ja ein Angebot), aber auch nichts Neues darauf
aufbauen, bevor Klaus gesagt hat, wie es damit weitergeht: *noch aktuell ·
Historie · soll raus*. Von dieser Antwort hängt ab, ob das Repo überhaupt die
Grundlage für etwas Gemeinsames sein kann.

### Die Frage, die Klaus stellt

Er nennt es sinngemäß ein **geteiltes Repo für die Zusammenarbeit** zwischen
ihm und Claude. Was das genau sein soll, ist **noch nicht festgelegt** — und
das ist die erste Aufgabe der nächsten Sitzung: es mit ihm zusammen scharf
stellen, bevor irgendetwas geplant wird.

### Vorgehen für die nächste Sitzung

1. **Lesen, nicht bauen.** `CLAUDE.md` des Repos, `docs/SBKIM_AGENTS.md`, das
   Paper (DE-Fassung reicht), dann die Demo-Seiten überfliegen.
2. **Bestandsaufnahme schreiben:** Was ist da? Was davon lebt heute im Netz
   weiter? Was ist überholt? Was ist nie gebaut worden?
3. **Klaus fragen, was er meint** — mit zwei bis drei konkreten Lesarten zur
   Auswahl, nicht mit einer offenen Frage. Er entscheidet.
4. **Erst dann** ein Plan: Umfang, Reihenfolge, Aufwand, und ehrlich die
   Antwort, ob es sich lohnt. Ein „nein, weil …" ist ein gültiges Ergebnis.
5. **Kein Code, keine Datei im Zielrepo**, bevor Klaus dem Plan zugestimmt hat.

---

## 6. Abschluss-Befehl (die Kette reißt nie ab)

Am Ende der nächsten Sitzung: `docs/PULS.md` fortschreiben · neuen Brief nach
diesem Muster anlegen · **Pflichtlektüre und diesen Abschluss-Befehl darin
wiederholen** · den vollständigen Brief als Codeblock in der Chat-Antwort
ausgeben, weil Klaus zuerst den Chat liest.
