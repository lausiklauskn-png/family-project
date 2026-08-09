# Übergabe-Brief · 2026-08-09 (abends) → nächste Sitzung

**Auftrag der nächsten Sitzung: Stufe 1 des Bauplatzes bauen** — die Werkbank in
`semantic-match-demo/bauplatz/`. Der Plan steht und ist von Klaus gehört; er hat
heute Abend nur „nicht mehr heute" gesagt, nicht „nein".

**Vor dem ersten Handgriff die Freigabe holen.** Ein Satz genügt: *„Stufe 1,
die Werkbank — soll ich?"* Sagt er ja, gilt der Freibrief für den Rest.

---

## 0. Wo wir stehen — in fünf Zeilen

- **Kein Code geschrieben.** `semantic-match-demo` wurde geklont und gelesen,
  **keine Datei dort angelegt oder geändert.**
- **Ein Befund, der alles vereinfacht:** das bidirektionale Matching aus dem
  Papier **ist gebaut** (Sage Modul 04, `matchDimensions`, beide Lanes, drei
  Schichten, LLM-Richter Stufe B) — aber **keine Spore trägt Fähigkeit und
  Bedarf getrennt**. Die Maschine läuft leer.
- **Klaus' Richtung: „Gemeinsamer Bauplatz"** — ein aktiver Werkplatz, an dem
  beide bauen und lernen.
- **Everlast: erst später entscheiden.** Nichts anfassen, nichts darauf aufbauen.
- **Die vier „Vertraulich"-PDFs bleiben.** Das war so gewollt, der Punkt ist
  beendet — nicht erneut aufmachen.

---

## 1. Pflichtlektüre — in dieser Reihenfolge, vor dem ersten Handgriff

1. `Sage-Protokol/CLAUDE.md` — die Verfassung. Besonders § Sitzungsstart-Pflicht
   (immer frisch von `origin/main`), § Freibrief, § Tafel-Evolutions-Klausel,
   § Fremdnutzer-/Marktplatz-Brille.
2. `family-project/docs/BRIEF_UEBERGABE_2026-08-09_PLANMODUS.md`, **Abschnitt 3
   und 4** — die zehn Lehren aus den Fehlern und die Arbeitsweise mit Klaus. Das
   bleibt der wichtigste Text; er betrifft die Methode, nicht den Code.
3. `family-project/docs/PULS.md` — die zwei obersten Einträge.
4. **Diesen Brief.**
5. `Sage-Protokol/src/modules/04_match.js`, Abschnitt `matchDimensions` — das ist
   die Maschine, um die es geht. Nicht das ganze Modul lesen.

Nicht lesen, was nicht gebraucht wird.

---

## 2. Der Befund im Detail (damit niemand ihn nochmal sucht)

In `Sage-Protokol/src/modules/04_match.js` steht vollständig:

```
Lane 1  queryCap   × passageNeeds     A bietet → B sucht
Lane 2  queryNeeds × passageCap       A sucht ← B bietet
Schicht-Score = Mittel der berechenbaren Lanes
→ fachlich / prozess / skalierung / overall / bruecke
```

Dazu `bidirectionalVerdict(passtA, passtB, rule?)` (Bau 04.D) und
`explainMatchLLM` als Stufe-B-Richter (Bau 04.B, 2026-05-20).
**In Stufe A sind die drei Schichten noch identisch dem Lane-Score** — die echte
Differenzierung liefert erst der LLM-Pass. Das ist im Code so kommentiert und
ehrlich.

**Die Lücke, belegt durch Suche über alle Module + die ganze `INTERFACES.md`:**

```
capVector | needsVector | capabilityVector | domainVectorCap | bedarfsVektor
→ null Treffer
```

Jede Spore hat genau einen `domainVector` (384 floats). Folge im Code: `qFullNull
|| pFullNull` → Nur-Anbieter-Modus, `availableLanes: 0`, alle Schichten `null`,
Rückfall auf `match(domainVectorA, domainVectorB)`. Und `matchDimensions` wird
nur in Werkzeug-, Test- und Observatoriums-Dateien aufgerufen, in keinem echten
App-Pfad.

**Merksatz für den Plan:** nicht „eine Match-Maschine bauen", sondern „einen Satz
Bedarf pro App schreiben und messen, ob es etwas bringt".

---

## 3. Der Plan — drei Stufen

Alles Neue lebt in einem **neuen Ordner `bauplatz/`** im Repo
`lausiklauskn-png/semantic-match-demo`. Er fasst **keine** Bestandsdatei an:
nicht `index.html`, nicht `hub.html`, nicht `sbkim-flow.html`, nicht
`Everlast_Pitch.html`, **nicht `sw.js`**. Damit bleibt die offene Everlast-Frage
unberührt. Der Service-Worker braucht keine Änderung — er reicht unbekannte
Adressen ans Netz durch (`caches.match(...) || fetch(...)`).

### Stufe 1 — Die Werkbank *(diese Sitzung)*

Eine einzelne, selbst-enthaltene Seite `bauplatz/werkbank.html`:

- **Vier Felder:** was A kann · was A braucht · was B kann · was B braucht.
- **Beide Lanes getrennt sichtbar**, dazu die drei Schichten und `bruecke`.
- **Gratis-Cosinus zuerst**, ehrlich beschriftet als **Rangfolge** — kein Urteil.
  (Das ist die Lehre aus `docs/LEHRE-EMBEDDING-MATCH-KALIBRIERUNG.md`; nicht
  aufweichen.)
- **KI-Richter daneben, abschaltbar, Default aus**, mit eigenem Schlüssel (BYOK).
  Schlüssel nur im RAM, **nie** in `localStorage` — das Repo ist öffentlich.
- **Fail-soft überall:** kein Schlüssel, kein Netz, leeres Feld → die Seite bleibt
  bedienbar und sagt in einem Satz, was fehlt. Nie ein toter Knopf.
- **Zwei vorbereitete Beispiel-Paare**, bei denen der einfache Cosinus dasselbe
  sagt und die zwei Lanes verschiedenes. Das ist der Lern-Moment; ohne dieses
  Paar ist die Seite nur ein Formular.

Bau-Weg: Modul 03 (`embedding`) und 04 (`match`) **byte-1:1 kopieren**, nicht
abwandeln — dieselbe Disziplin wie bei jedem Rollout. Wenn dabei ein
Drift-Guard sinnvoll ist, mit anlegen.

Prüfung: ein Headless-Smoke, dessen **eigener Rückgabewert** über grün
entscheidet (siehe Lehre 3.3 — `| tail` urteilt nicht). Danach ehrlich:
*„Sichttest ungeprüft, wartet auf Klaus' Browser-Lauf."*

### Stufe 2 — Die Messung an den echten Knoten *(eigene Sitzung + Klaus' Teil)*

Klaus schreibt zu jeder seiner Apps **einen Satz Bedarf** — was diese App von den
anderen bräuchte. **Das kann keine Sitzung raten**, und es ist genau der Teil, an
dem er etwas beiträgt, das nur er hat.

Dann über alle Paare messen:

```
einspurig (heute)   Rangfolge aller Paare aus dem einen domainVector
zweispurig (neu)    dieselben Paare über beide Lanes
→ welche Rangfolge stellt fachverwandte Knoten weiter oben?
```

Mit Zahl, nicht mit Gefühl (Lehre 3.2). **Ein „bringt nichts" ist ein gültiges
und wertvolles Ergebnis** — dann reicht der eine Vektor, Stufe 3 entfällt, und
das Ergebnis gehört genauso dokumentiert wie ein Erfolg.

### Stufe 3 — nur bei nachgewiesenem Vorteil *(eigene Sitzung, Klaus' Wort nötig)*

Additives, **freiwilliges** Spore-Feld in Sage vorschlagen. **Tafel zuerst**
(`INTERFACES.md`), dann Code. Alte Sporen ohne das Feld laufen unverändert
weiter, `PROTOCOL_VERSION` und der 0.80-Andock-Riegel bleiben unberührt — sonst
wäre es kein Zusatz, sondern ein Bruch. Das ist eine Änderung an einer heiligen
Tafel und braucht Klaus' ausdrückliche Zustimmung.

---

## 4. Was NICHT getan wird

- **Everlast nicht anfassen** — 30 Fundstellen in 7 Dateien. Klaus entscheidet
  später. Nichts entfernen, nichts umbenennen, nichts darauf aufbauen.
- **Die vier „Vertraulich"-PDFs bleiben.** Entschieden, erledigt. Nicht erneut
  vorlegen.
- **Die alten Demo-Seiten nicht reparieren** (fremde Adressen, altes Modell,
  Schlüssel im `localStorage`). Sie sind die Wurzel von Mai 2026. Erst wenn
  Klaus die Everlast-Frage geklärt hat, ist ein Aufräum-Durchgang überhaupt
  sinnvoll.
- **Kein neues Repo.** Der Bauplatz gehört dorthin, wo das Papier liegt.

---

## 5. Was Klaus im Browser prüft (offen aus der Sitzung davor, nichts zu tun)

Auf `family-projekt.de/markt.html`, nach Hard-Reload:

- **(a)** Bleiben die Apps grün, obwohl an Perfect Skin Beauty dreimal geändert
  wurde? Erste echte Prüfung von PR #240 (Wächter meldet Sicherheit statt Bytes).
- **(b)** Sind die grünen „persönlich durchgesehen"-Bänder verschwunden, nachdem
  der nächtliche Lauf die Quittungen bestätigt hat? Erste Prüfung von #245.
- **(c)** Beim nächsten gelben Band: einmal quittieren und veröffentlichen —
  kommt das Datum mit? War bisher nicht testbar, weil nichts offen war.

---

## 6. Arbeitsweise mit Klaus (Kurzfassung — die Langfassung steht im Brief davor)

- **Ein Schritt pro Antwort**, mit klarem Erfolgs-Indikator. Er arbeitet am
  Tablet und verliert bei drei Schritten auf einmal den Faden.
- **Sagen, wohin ein Befehl gehört** (Tablet · Caddy-Cloud-Server ·
  Apache-Webhosting). Am besten gar keine Konsolen-Befehle, wo ein Knopf reicht.
- **Fail-soft, immer.** Ein fehlendes Stück darf nie den ganzen Weg blockieren.
- **Ehrlich benennen, was ungeprüft ist.** Dieses Environment kommt nicht ins
  offene Netz (CONNECT 403) — alles Live-Seitige ist „wartet auf Klaus".
- **Vor der Diagnose greppen, nicht danach** (die Lehre dieser Sitzung: der
  Unterschied zwischen *nicht gebaut* und *gebaut, aber ohne Treibstoff* war der
  ganze Plan).
- **Selbst-Merge nach Freibrief**, aber jede Entscheidung dokumentiert.
- **Korrekturen kurz und ohne Zerknirschung.** Ein Satz was falsch war, ein Satz
  was jetzt gilt, weiterarbeiten.

---

## 7. Abschluss-Befehl (die Kette reißt nie ab)

Am Ende der nächsten Sitzung: `docs/PULS.md` fortschreiben · neuen Brief nach
diesem Muster anlegen · **Pflichtlektüre und diesen Abschluss-Befehl darin
wiederholen** · den vollständigen Brief als Codeblock in der Chat-Antwort
ausgeben, weil Klaus zuerst den Chat liest.
