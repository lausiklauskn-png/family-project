# Sitzungsbrief — Lighthouse-Durchgang, nächste App: Kimboard

**Stand: 2026-08-02, nachmittags.** Frischer Start in neuem Kontextfenster.
Dieser Brief ist selbsterklärend — er setzt kein Wissen aus der Vorsitzung voraus.

---

## 0. Pflichtlektüre, bevor eine Zeile Code entsteht

1. **`family-project/docs/BRIEF_LIGHTHOUSE_VERBESSERUNGEN.md`** — die Arbeitsordnung
   für den ganzen Durchgang. Besonders **§ 5.1** (Bildmaße ohne `height:auto`) und
   **§ 3** (was gar nicht reparierbar ist).
2. **Diesen Brief.**
3. **`CLAUDE.md` des Repos, an dem gearbeitet wird.** Die Hausregeln schlagen jeden
   Punktgewinn.

---

## 1. Was bereits erledigt ist

| App | was gemacht | PR |
|---|---|---|
| **Mein-Mixarium-Page** | Bilder 1795 → 736 KiB · Bildmaße · 3D nachgeladen · Video `preload="none"` | `Mein-Mixarium-Page#11` |
| **Mein-Mixarium-Page** | `height:auto` — die Bildmaße hatten die Bilder am Handy dreifach hochgezogen | `Mein-Mixarium-Page#12` |
| **Mein-Mixarium** (PWA) | Icon 386 → 63 KiB · falsches „SVG" 514 → 84 KiB · doppelte Downloads → −3407 KiB | `Mein-Mixarium#177` |
| **family-project** | Bildmaß-Falle als § 5.1 in die Arbeitsordnung | `family-project#171` |
| **Mein-Rezeptbuch** (PWA) | Erstbesuch **9890 → 1476 KiB (−85 %)** · Zeichensatz Byte 953 → 40 | `Mein-Rezeptbuch#363` |

Alle gemergt. **Ob die Punktzahlen steigen, zeigt erst die nächtliche Messung.**

---

## 2. ⚠ Vier Entscheidungen liegen bei Klaus — nicht selbst entscheiden

### 2.1 Das eigene Relais löst nicht auf — NEU und netzweit

`wss://relay.family-projekt.de` antwortet in Klaus' Chrome mit
**`ERR_NAME_NOT_RESOLVED`** — der Name existiert im DNS nicht. Das ist:

- der **zweite rote Best-Practices-Punkt** bei Mein Rezeptbuch („Browserfehler in
  der Konsole", zweimal protokolliert),
- und vermutlich **bei jeder SBKIM-App im Netz derselbe Fehler**, weil alle beim
  Seitenstart `SbkimAnastomose.listenNostr()` aufrufen.

Bemerkenswert: über dieses Relais liefen die bewiesenen Cross-Knoten-Läufe vom
2026-07-10/11. Es hat also **funktioniert** und tut es jetzt nicht mehr.

Ein fehlgeschlagener WebSocket lässt sich **nicht** per `try/catch` stumm stellen —
der Browser protokolliert selbst. Es gibt nur zwei Wege:

1. **Das Relais wieder erreichbar machen** (DNS-Eintrag auf Klaus' Hetzner). Behebt
   den Punkt in *allen* Apps auf einen Schlag und stellt das Mycel wieder her.
2. **Nicht mehr beim Seitenstart verbinden**, sondern erst, wenn der Nutzer das
   Netz-Panel öffnet. Passt sogar besser zum Empfangsmodus-Prinzip — ist aber eine
   Verhaltensänderung am Knoten und **keine Sitzungs-Entscheidung**.

**Empfehlung: erst 1 prüfen** (lebt der Container? fehlt nur der DNS-Eintrag?),
weil 2 den Knoten leiser macht, als er gedacht ist.

### 2.2 Die Briefkasten-Kette

Beim Seitenstart fragt jede App **fünf Nachbarknoten nacheinander** bei
`raw.githubusercontent.com` ab. Bei Mixarium 1682 ms, bei Rezeptbuch reicht die
Kette bis **3348 ms**. Über dem Block steht
`// === SBKIM-Briefkasten Logik (zero-dependency) — BYTE-GLEICH lassen ===`.

Hilfe: die fünf Abfragen gleichzeitig (`Promise.all`) und erst nach `load`.
**Klaus fragen:** im Kanon reparieren und netzweit ausrollen, oder erst in einem
Knoten erproben? Vorher **Drift messen** (Arbeitsordnung § 5.3) — sind die Kopien
längst auseinander, ändert sich die Antwort.

### 2.3 Der Kontrast-Mangel bei Mixarium

Barrierefreiheit 96, ein echter Mangel. **Welche** Farbkombination gemeint ist,
stand in Klaus' Ausschnitt nicht dabei. Den aufgeklappten Teil abwarten, dann
gezielt beheben. Nicht raten.

### 2.4 Werden die richtigen Adressen gemessen?

Von 14 Marktplatz-Einträgen messen zwölf die App, zwei eine vorgeschaltete
Landingpage (Mixarium, Rezeptbuch). Die Zahlen auf den Karten sind darum
**untereinander nicht vergleichbar**. Zwei Wege: so lassen — oder für Einträge mit
eigener Page beide Werte holen und zeigen. Empfehlung der Vorsitzung: **beide**,
weil die App das ist, was die Leute benutzen. Eilt nicht.

---

## 3. ▶ Die Aufgabe: Kimboard

Leistung **62** / Gute Praxis 90 / SEO 96 / Barrierefreiheit 100. Repo: `Kimboard`,
gemessene Adresse `Kimboard/`.

> **Den vollständigen Bericht schickt Klaus.** Erst lesen, dann arbeiten.

Aus `spore-stand.json` schon bekannt:

- **Leistung:** *Minify JavaScript* (600 ms) · *Reduce unused JavaScript* (150 ms) ·
  *Use efficient cache lifetimes* (nicht behebbar, siehe § 4)
- **Bedienbarkeit:** Auswahlfelder ohne Beschriftung · Tippziele zu klein oder zu
  dicht · kein `main`-Landmark
- **Gute Praxis:** *Browser-Fehler in der Konsole* ← **zuerst ansehen.** Bei
  Rezeptbuch war genau das ein echter Fund (totes Relais), keine Kosmetik. Gut
  möglich, dass es bei Kimboard **derselbe** WebSocket-Fehler ist — dann gehört er
  zu § 2.1 und nicht in einen Kimboard-Fix.

Vor der ersten Zeile: `Kimboard/CLAUDE.md` lesen. Prüfen, ob `sbkim/`-Dateien im
Spiel sind (Kanon — nicht anfassen) und ob es einen Bau-Schritt gibt.

---

## 4. ⚠ Was NICHT reparierbar ist — und was Klaus gesagt gehört

Auf **GitHub Pages** lassen sich keine HTTP-Kopfzeilen setzen. Damit sind
dauerhaft rot bzw. offen, bei **jeder** App:

- *Use efficient cache lifetimes* (10 Minuten, von Pages gesetzt)
- *CSP* · *HSTS* · *COOP* · *X-Frame-Options* — bei Rezeptbuch alle unter
  „Vertrauen und Sicherheit", alle **„Nicht bewertet"**, kosten also keine Punkte.
  Sie tauchen trotzdem jedes Mal auf. **Nicht jedes Mal neu untersuchen.**
- *Missing source maps* — wir liefern absichtlich lesbaren Quelltext aus.
- *Total Blocking Time* / *Largest Contentful Paint* sind **Folgen**, keine
  eigenen Mängel.

Wer das ändern will, müsste auf Klaus' Hetzner-Caddy umziehen. Eigenes Thema.

---

## 5. Werkzeug — so wird gemessen

`playwright-core` ist **nicht** vorinstalliert: `npm install playwright-core` in
einem Arbeitsverzeichnis. Chromium liegt unter
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.

Bewährt hat sich (Skripte in der Vorsitzung geschrieben, Muster übernehmen):

1. **Ein Mess-Server, der sich wie GitHub Pages verhält** — `max-age=600` + ETag +
   **gzip** — und je Anfrage Pfad, Status und **gesendete Bytes** protokolliert.
   Ohne gzip misst man an der Wirklichkeit vorbei; ohne ETag kann der Browser
   nichts wiederverwenden.
2. **Chromium in Handy-Maßen** (412 px) darauf loslassen, Service Worker mitlaufen
   lassen (localhost gilt als sicherer Kontext — nur so findet man Doppel-Downloads).
3. **Immer vorher und nachher messen.** Die Vorher-Messung ist die Gegenprobe.
4. **Fremd-Adressen abweisen** (`page.route(...abort())`), sonst hängt der Lauf in
   Zeitüberschreitungen: `*.github.io` und `raw.githubusercontent.com` sind von der
   Bau-Maschine gesperrt.

---

## 6. Lehren — bitte nicht neu lernen

1. **Klaus' Auge schlägt die Kennzahl.** Eine Farb-Reduktion sparte 4,3 MB bei einer
   mittleren Abweichung von 3/255 — und hatte sichtbare Streifen im Verlauf. Wer
   Bilder verkleinert: den Verlauf **stark vergrößert** ansehen, nicht die
   Durchschnittszahl. Und Klaus fragen.
2. **Eine Prüfung, die nie rot war, beweist nichts.** Der Zeichensatz-Befund ließ
   sich lokal **nicht nachstellen** (Byte 953 lag innerhalb der 1024er-Grenze). Die
   Änderung ist eine Härtung, kein bewiesener Ursachen-Fix — und genau so wurde sie
   gemeldet. Nicht so tun, als sei die Ursache gefunden.
3. **Erst nachsehen, dann erklären.** „Datei zu groß" war „wird dreimal geholt".
   „SVG" war ein PNG in einer Hülle. Die vier `icon-book*.svg` (2073 KiB) sahen nach
   Altlast aus — sie sind die **Quelle** für `generate_icons.py` und werden gar nicht
   ausgeliefert. Alles drei fand sich nur durch Aufmachen.
4. **Ein doppelter Eintrag im Bericht kann ein Anzeige-Artefakt sein.** Bei
   Rezeptbuch stand jede Datei zweimal — teils echt (SW-Vorratsliste + Reload),
   teils nur, weil ein network-first Service Worker jede Anfrage zweimal ins
   Protokoll bringt. **Nachmessen, nicht ableiten.**
5. **Nicht reparieren, bevor es ein Befund ist.**

---

## 7. Am Ende der Sitzung — Pflicht

1. **Ehrlich melden:** was umgesetzt, was bewusst gelassen (mit Grund), was **nicht**
   verifiziert werden konnte.
2. **Nie behaupten, die Punktzahl steige** — das zeigt erst die nächste nächtliche
   Messung. Bis dahin: „umgesetzt, Wirkung ungeprüft."
3. **Klaus' Browser-Sichttest** bleibt unersetzbar.
4. **Nächste-Schritte-Block direkt in der Chat-Antwort** (2–4 Punkte, je ein Satz).
5. **Neuen Brief schreiben** und vollständig als Codeblock im Chat ausgeben.
6. **Eine Zeile je App in `family-project/docs/PULS.md`.** Achtung: mehrere Repos
   (u. a. `Mein-Rezeptbuch`) haben **kein** eigenes `docs/PULS.md` — dann genügt die
   Zeile hier, statt eine Datei anzulegen.

---

## 8. Danach: die Reihenfolge für den Rest

| App | Leistung | gemessene Adresse |
|---|---:|---|
| BookLedgerPro | 65 | `BookLedgerPro/` |
| Mein-Tresor | 69 | `Mein-Tresor/` |
| Jasons-Tresor | 73 | `Jasons-Tresor/` |
| Perfect-Skin-Beauty | 92 | `Perfect-Skin-Beauty/` |
| Kim-Bell | 95 | `Kim-Bell/` (SEO 90 — dort liegt der Mangel) |
| Perfect-Skin-Fashion | 96 | `Perfect-Skin-Fashion/` |
| Kimseek · mycel-karte | 99 | fertig, nichts zu tun |

Noch nie gemessen: **Tomys-Hub · Privat-Brain · WorkFloh · Rezeptbuch-Page**.

**Bei BookLedgerPro aufpassen:** build-frei, keine Bundler, keine CDNs — „Minify
JavaScript" darf dort **nicht** über einen Bau-Schritt gelöst werden, und
`CACHE_VERSION` in `sw.js` hochziehen ist Pflicht.
