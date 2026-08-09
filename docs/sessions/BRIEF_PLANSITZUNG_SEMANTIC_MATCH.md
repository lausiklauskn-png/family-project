# BRIEF für die nächste Sitzung — Plansitzung `semantic-match-demo` (2026-08-09)

**Freibrief gilt** (Sage `CLAUDE.md` § Freibrief, netzweit): eigenständig bauen + eigene PRs
selbst mergen, wenn getestet, abgegrenzt und nicht architektonisch zweifelhaft; bei echtem
Zweifel erst Klaus fragen; **nie stillschweigend** (Commit/PULS dokumentieren).
**ABER: diese Sitzung baut nicht.** Sie plant. Siehe Ziel unten.

## Pflichtlektüre (in dieser Reihenfolge, vor dem ersten Handgriff)

1. `Sage-Protokol/CLAUDE.md` — Verfassung. Besonders § Sitzungsstart-Pflicht (immer frisch
   von `origin/main`), § Freibrief, § Tafel-Evolutions-Klausel, § Auslieferungs-Brille.
2. `family-project/docs/BRIEF_UEBERGABE_2026-08-09_PLANMODUS.md` — **Abschnitt 3 und 4.**
   Zehn Lehren aus den Fehlern dieses Tages und die Arbeitsweise mit Klaus. Das ist der
   Teil, der die Methode betrifft, nicht den Code.
3. `family-project/docs/PULS.md` — oberster Eintrag.
4. `semantic-match-demo/CLAUDE.md` — das Repo, um das es geht.

## Was diese Sitzung fertig gemacht hat (alles auf `main`)

**family-project (#240–#251)**

1. **Wächter meldet Sicherheit statt Bytes (#240).** Gelb nur noch, wenn sich der
   Sicherheits-Fingerabdruck ändert — neue fremde Herkunft oder auffälliges Muster
   (`eval`, `atob`, `document.write`, `javascript:`). Ein getauschter Text oder ein neues
   Bild löst nichts mehr aus. Grund: alle acht Gelbs waren echte Deploys; bei 1000 Apps
   wären das ~100 Quittungen am Tag, und die Gefahr wäre das Durchwinken.
2. **Studio-Veröffentlichen repariert (#241).** Zwei echte Fehler: `apiPost` hatte keine
   Frist (der Knopf konnte nie zurückspringen — weder `.then` noch `.catch` feuerte), und
   Bilder/Beschreibungen hingen mit den Wächter-Quittungen an **einer** Kette. Jetzt Frist
   90 s/20 s und zwei unabhängige Stränge.
   **Die eigentliche Ursache lag aber auf dem Server:** `marktplatz-api.php` war vom
   1. August und kannte die Aktion `commit_wache` nicht (kam am 3. August dazu). Klaus hat
   sie neu hochgeladen — belegt durch Commit `1863353` „Studio: Wächter-Quittungen
   aktualisiert".
3. **Hand-Messung: zwei Herkünfte (#243).** „Von uns persönlich geprüft" ≠ „vom Anbieter
   selbst abgelesen". Der Standard bleibt die schwächere Lesart.
4. **Messwerte 09.08. (#244, #247, #248)** — Rezeptbuch 84, Mixarium 84, Perfect Skin
   Beauty 98. Nebenbefund behoben: ein Hand-Wert riss die Schaufenster-Ablesung nicht mehr
   mit.
5. **Quittung wirkt sofort (#245, #246).** `markt.html` las `wache-hand.json` gar nicht —
   die Quittung wirkte erst im nächtlichen Lauf. Jetzt erscheint beim Haken sofort das
   grüne Band, und es verschwindet **ersatzlos**, sobald der Lauf bestätigt hat (Klaus:
   „Die Quittung ist eine Brücke, kein Etikett"). Dazu Datum der Durchsicht und ein
   neutraler Text, der auch für **fremde** Apps stimmt.
6. **Server-Prüfer (#246).** `marktplatz-api.php` lässt `gesehen_am` zu und reicht fremde
   Felder durch, **wenn sie byte-gleich schon dort stehen** — behebt die Falle, dass eine
   einzige Sperre in der Datei jedes weitere Quittieren blockiert hätte. Klaus hat die
   Datei per Copy-Paste in den WebFTP-Editor eingespielt (15,78 KB, byte-genau).

**Perfect-Skin-Beauty (#38–#42)**

7. **Karte auf Knopfdruck (#38)** statt eingebettetem Rahmen.
8. **Der echte Fund (#39): das Hero-Bild lag auf `z-index: -1`.** Chrome wertet ein so weit
   nach hinten gelegtes Bild nicht mehr als „größten sichtbaren Inhalt"; weil zugleich der
   ganze Hero-Text bei `opacity: 0` beginnt, blieb der Messung **kein einziger Kandidat**
   → `NO_LCP`, die Leistungsnote war nicht berechenbar. Seit dem 5. August. Ergebnis nach
   dem Umbau: **98 statt „!"**.
9. **Karten-Vorschaubild (#40, #41).** Aus Klaus' Bildschirmfoto: quadratischer Zuschnitt
   mit dem Marker mittig, WebP q0.55 → **50 KB statt 678 KB**, Herkunftszeile im Bild
   (ODbL). Beschriftung sitzt unten, nicht auf dem Marker.
10. **Hero-Überschrift schiebt statt einzublenden (#42)** — zweiter LCP-Kandidat, damit die
    Messung nicht an einem einzigen Element hängt.

## Was Klaus als Nächstes im Browser prüft (nicht ersetzbar, blockiert nichts)

Morgen früh auf `family-projekt.de/markt.html`, nach Hard-Reload:

- (a) **Bleiben die Apps grün?** Klaus hat heute dreimal an Perfect Skin Beauty geändert.
  Nach der alten Regel stünde sie morgen auf gelb, nach der neuen bleibt sie grün, weil
  sich am Sicherheits-Fingerabdruck nichts geändert hat. Das ist die erste echte Prüfung
  von #240.
- (b) **Sind die grünen „persönlich durchgesehen"-Bänder verschwunden?** Der nächtliche
  Lauf bestätigt die Quittungen — dann ist die Zeile überflüssig und fällt weg. Erste
  Prüfung von #245.
- (c) **Beim nächsten gelben Band:** einmal quittieren und veröffentlichen. Kommt das
  Datum mit? Das war heute nicht testbar, weil nichts offen war.

## Ziel der nächsten Sitzung: PLANSITZUNG — kein Code

**Auftrag:** `lausiklauskn-png/semantic-match-demo` analysieren und daraus einen
**Umsetzungsplan** machen für das, was in diesem Repo bereits **dokumentiert** ist.

Das Repo liegt geklont unter `/workspace/semantic-match-demo` (Stand `031ab12`, flacher
Klon — für Historie `git fetch --unshallow`). Live:
`https://lausiklauskn-png.github.io/semantic-match-demo/`

Es enthält Paper, Konzept, Marktanalyse, zwei Kostenanalysen, einen Pitch, eine Demo, einen
Hub, eine Netzwerk-Schicht und zwei Protokoll-Seiten — also **Konzept und Prototyp an einem
Ort**.

**Der Punkt, der den Plan trägt:** das Konzept beschreibt in weiten Teilen genau das, was
seither **gebaut wurde**. Der family-projekt.de-Marktplatz *ist* der PWA-Marktplatz aus dem
Papier — ohne Firma dahinter, in Heimarbeit, mit einer Semantik, die tatsächlich läuft. Die
Frage lautet deshalb nicht „was könnte man bauen", sondern **„was ist davon schon da, was
fehlt, und lohnt sich der Rest"**.

**Vorgehen:**

1. Lesen, nicht bauen. `CLAUDE.md`, `docs/SBKIM_AGENTS.md`, Paper (DE reicht), Demo-Seiten
   überfliegen.
2. **Bestandsaufnahme:** Was ist dokumentiert? Was davon lebt heute im Netz? Was ist
   überholt? Was wurde nie gebaut?
3. **Erst dann ein Plan:** Umfang, Reihenfolge, Aufwand — und ehrlich die Antwort, ob es
   sich lohnt. Ein begründetes „nein" ist ein gültiges Ergebnis.
4. **Keine Datei im Zielrepo**, bevor Klaus dem Plan zugestimmt hat.

**Klaus' offene Richtungsfrage** (er klärt sie mit dir direkt, rate nicht): er möchte
„ein Repo, wo wir beide gemeinsam dran arbeiten und lernen". Vier mögliche Lesarten stehen
in `docs/BRIEF_UEBERGABE_2026-08-09_PLANMODUS.md` §5 — leg sie ihm zur Auswahl vor.

## Vor allem anderen zu klären (nichts anfassen)

1. **Everlast GmbH.** Das Repo ist öffentlich ein namentliches Angebot (Pitch, Hub-Karte
   „Für Everlast", „Everlast-Gebühr (3 %)" im Transaktionsfluss, Knoten „Everlast CRM").
   Zugleich trägt `Sage-Protokol/docs/PULS.md` eine heilige Tafel: *„Die Sonnen-Galaxie
   erwähnt Everlast GmbH NICHT. Klaus' Wunsch ausdrücklich."*
2. **Vier Papiere tragen „Vertraulich"**, eines „ausschließlich für Everlast Consulting
   GmbH" — und liegen öffentlich, `sw.js` legt sie sogar in den Offline-Vorrat. Lesbar sind
   damit Kostenrahmen (65–115 T€), Provision (5–15 %) und die 3-%-Gebühr.

**Beides benennen, nicht auflösen.** Klaus entscheidet: *noch aktuell · Historie · soll
raus*. Ein „bleibt so" ist eine gültige Antwort und beendet den Punkt.

## Abschluss-Befehl (die Kette reißt nie ab)

Am Sitzungsende: `docs/PULS.md` fortschreiben · neuen Brief nach diesem Muster anlegen ·
**Pflichtlektüre und diesen Abschluss-Befehl darin wiederholen** · den vollständigen Brief
als Codeblock in der Chat-Antwort ausgeben, weil Klaus zuerst den Chat liest.
