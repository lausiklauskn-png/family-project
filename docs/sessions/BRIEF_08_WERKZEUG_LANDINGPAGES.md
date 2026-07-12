# BRIEF 08 — Werkzeug-Landingpages „Andock" & „Knoten" neu gestalten (Klärungs-Sitzung)

**Datum:** 2026-07-12 · **Art:** Plan-vor-Code / Design-Klärung mit Klaus (NICHT gleich bauen)
**Freibrief gilt** (Sage CLAUDE.md § Freibrief, netzweit). Aber: diese Sitzung ist bewusst
eine **Klärung** — erst mit Klaus die Richtung festlegen, dann in einer Folge-Sitzung bauen.

---

## Warum dieser Brief (Klaus' Befund 2026-07-12, mit Screenshots)

Klaus hat sich die zwei Werkzeug-Seiten auf `family-projekt.de/werkzeuge/…` angesehen und ist
unzufrieden. Kern seiner Worte:

> „Die Verlinkung gefällt mir noch nicht. Ich weiß nicht, was das bedeuten soll und was das
> bringt. … Damit die beiden Seiten nicht sinnlos ins Leere laufen, weil man da nichts machen
> kann bzw. nicht richtig weiß, worum und weshalb."

Betroffen sind **zwei** der drei Werkzeug-Landingpages:

- `werkzeuge/andock-werkzeug.html`  (family-projekt.de/werkzeuge/andock-werkzeug.html)
- `werkzeuge/knoten-werkzeug.html`  (family-projekt.de/werkzeuge/knoten-werkzeug.html)

Die dritte, `werkzeuge/such-werkzeug.html`, ist **in Ordnung** (führt zu einem echten,
benutzbaren Tool) — sie kann als positives Vorbild dienen, muss aber nicht umgebaut werden.

Klaus' Referenz für „gut erklärt / gut zu sehen" ist das **Siegel** (das Andock-Werkzeug im
Siegel-Modal erklärt den Ablauf sichtbarer). Die zwei Landingpages sollen diese Klarheit
erreichen — oder anders gelöst werden, damit sie nicht ins Leere laufen.

---

## Konkreter IST-Zustand (damit die nächste Sitzung nicht blind sucht)

Alle drei Seiten sind **datengetrieben**: `assets/tool-landing.js` rendert aus `window.FP_TOOL`
(pro Seite gesetzt). Aufbau: Held + „öffnen"-Knopf + **Screenshot-Galerie** + „Was es kann" +
„Was es kostet" (0 €) + Vertrauens-Punkte + Zurück-Link.

**Problem 1 — leerer Screenshot-Platzhalter (auf ALLEN drei Seiten):**
Die Galerie zeigt wörtlich „**Screenshot 1 — [ vom Anbieter eingefügt ]**" mit einer
＋/×-Thumbnail-Leiste. Das ist ein **Demo-Platzhalter aus dem Mockup**, der nie durch echte
Bilder ersetzt wurde. Wirkt kaputt/unfertig — das ist der stärkste „läuft ins Leere"-Eindruck.
(Code: `assets/tool-landing.js`, `.shot`/`.ph#mainlabel` + `#thumbs`.)

**Problem 2 — die „öffnen"-Knöpfe führen zu technischen SBKIM-Zielen, deren Nutzen unklar ist:**
- `andock-werkzeug.html`: `openUrl = "../netzwerk.html#andock"`. Titel „bring deine Seite ins
  Netzwerk, in drei Eingaben"; erzeugt Spore-Vorlage + `status.json`-Zeile + vorgelinkten PR.
  → Für einen normalen Besucher kryptisch (Repo-URL? Knotentyp? Spore?). Man „macht" auf der
  Landingpage selbst nichts — der Knopf springt woanders hin.
- `knoten-werkzeug.html`: `openUrl =
  "https://lausiklauskn-png.github.io/Sage-Protokol/docs/observatorium/tools/mycelknoten.html"`.
  Titel „mach deine PWA selbst zum Knoten"; „Kopieren, nicht klonen — Datei für Datei aus dem
  offenen Baukasten". → Sehr technisch (Entwickler/Bastler-Thema), Ziel-Seite unklar im Nutzen.

**Zum Vergleich (gut):** `such-werkzeug.html` → `openUrl = Sage such-tool` (echtes, sofort
nutzbares Werkzeug) + `installUrl` (installierbar). Klarer Nutzen, klares Ziel.

**⭐ WICHTIGE REFERENZ — die gute Andock-Version existiert schon (Klaus 2026-07-12, Screenshot):**
`https://lausiklauskn-png.github.io/SB-KIMTool-Point/web/tools/andock.html` ist ein **echtes,
gut erklärtes Andock-Werkzeug**. Es zeigt:
- einen Abschnitt **„Das SBKIM-Siegel"** mit dem **sichtbaren goldenen Siegel-Bild** +
  „Siegel als PNG/SVG herunterladen" — genau Klaus' „Siegel besser erklärt und besser zu sehen".
- echte **Schritt-für-Schritt-Eingaben** („Schritt 0 — eure Eckdaten": Knoten-Name, Knoten-Typ
  (hybrid/…), Domäne, Domänen-Beschreibung …) → man **macht** dort wirklich etwas, kein Leerlauf.

Klaus' Kommentar „scheint gleich zu sein" deutet darauf: die Family-Andock-Landingpage wirkt wie
eine leere Hülle **neben** diesem echten Tool. **Naheliegende Richtung** (mit Klaus abstimmen):
die Family-`andock-werkzeug.html` soll auf dieses reale SB-KIMTool-Point-Andock-Werkzeug
**führen/verweisen** (oder es sinngemäß übernehmen — „kopieren, nicht klonen"), inkl. sichtbarem
Siegel, statt nur nach `netzwerk.html#andock` zu springen. Das löst „läuft ins Leere" direkt.

---

## Was die nächste Sitzung MIT KLAUS klären soll (Entscheidungen, dann bauen)

1. **Zielgruppe der zwei Seiten.** Für wen sind „Andock" und „Knoten" gedacht?
   - a) Für **normale Marktplatz-Besucher** → dann radikal vereinfachen oder ganz aus der
     öffentlichen Werkzeug-Liste nehmen (sie sind eher Entwickler-Themen).
   - b) Für **Bastler/Entwickler/Forker** → dann ehrlich als solche kennzeichnen („für
     Entwickler / zum Selberbauen") und die Erwartung richtig setzen, statt sie wie ein
     fertiges Endnutzer-Produkt zu präsentieren.

2. **Leerer Screenshot-Platzhalter — ersetzen oder entfernen?**
   - a) Echte Screenshots der Werkzeuge erzeugen (headless) und einbetten, ODER
   - b) die Screenshot-Galerie auf diesen Seiten **ganz weglassen**, wenn es kein zeigbares
     UI gibt (kein leerer Rahmen mehr). Empfehlung der schreibenden Sitzung: mindestens den
     leeren „vom Anbieter eingefügt"-Platzhalter entfernen — er ist der Haupt-Kaputt-Eindruck.

3. **Andock-Werkzeug — Ziel & Ablauf.** Soll die Seite auf das **echte SB-KIMTool-Point-Andock-
   Werkzeug** (`…/SB-KIMTool-Point/web/tools/andock.html`, mit sichtbarem Siegel + echten
   Schritten) **führen** — oder es sinngemäß übernehmen — statt nur nach `netzwerk.html#andock`
   zu springen? Das ist laut Klaus die „gute" Version (Referenz oben). Alternativ direkt in die
   Netzwerk-Seite integrieren und die eigene Landingpage auflösen.

4. **Knoten-Werkzeug — Ziel & Nutzen.** Was passiert auf `…/Sage-Protokol/…/mycelknoten.html`,
   und ist das ein sinnvolles öffentliches Ziel? Alternative: eine erklärende „So wird deine App
   ein Knoten"-Anleitung mit Kopier-Bausteinen statt eines undurchsichtigen Sprung-Links.

5. **Struktur:** Bleiben es zwei eigene Landingpages, oder besser zusammenlegen / in die
   Netzwerk-Seite verschieben / in der Werkzeuge-Liste als „für Entwickler" gruppieren, damit
   sie nicht wie fertige Produkte neben dem Such-Werkzeug stehen?

---

## Leitplanken (unverändert)

- **Nur Seiten-Text/Layout** anfassen (`werkzeuge/*.html`, `assets/tool-landing.js`,
  `werkzeuge.html`, `assets/style.css`). **Kern-SBKIM-Module / Protokoll NICHT** berühren.
- **Ehrlichkeit:** nichts vortäuschen (keine erfundenen Screenshots/Reviews). Wenn ein Tool
  kein zeigbares UI hat, das ehrlich abbilden (Text/Diagramm) statt Fake-Screenshot.
- **Fremdnutzer-/Marktplatz-Brille:** klar benennen, was das Werkzeug bringt und für wen;
  fail-soft; kopier-tauglich.
- **SW-Cache:** bei Shell-Änderungen `CACHE_VERSION` in `sw.js` erhöhen (aktuell v37).
- family-projekt.de deployt automatisch (Hetzner, 2-Min-Cron) → nach Merge Hard-Reload.

## Datenverträge / betroffene Dateien

- `assets/tool-landing.js` — `FP_TOOL`-Schema (Held, openUrl/installUrl, features, trust,
  Screenshot-Galerie). Änderungen hier wirken auf **alle drei** Tool-Seiten → aufpassen, dass
  das Such-Werkzeug nicht kaputt geht.
- `werkzeuge/andock-werkzeug.html`, `werkzeuge/knoten-werkzeug.html` (die `FP_TOOL`-Daten).
- `werkzeuge.html` (die Werkzeug-Liste / Verlinkung).

## Offene Fragen an Klaus (zu Beginn der nächsten Sitzung stellen)

1. Sind „Andock" & „Knoten" für **normale Besucher** oder für **Entwickler/Bastler** gedacht?
   (Bestimmt Ton, Tiefe und ob sie öffentlich bleiben.)
2. Screenshot-Bereich: **echte Bilder** dazu, oder **weglassen**?
3. Beim Andock-Werkzeug: **eigene Erklär-Seite** (wie das Siegel) oder in die **Netzwerk-Seite**
   integrieren?
4. Soll das Knoten-Werkzeug überhaupt auf `mycelknoten.html` zeigen, oder brauchen wir ein
   besseres/eigenes Ziel?

---

## Pflichtlektüre vor der Arbeit (in dieser Reihenfolge)

1. Sage `CLAUDE.md` (§ Freibrief, § Fremdnutzer-/Marktplatz-Brille, § Plan-vor-Code).
2. `family-project/docs/PULS.md` (oberster Eintrag) + **dieser Brief**.
3. Code: `assets/tool-landing.js`, `werkzeuge/andock-werkzeug.html`,
   `werkzeuge/knoten-werkzeug.html`, `werkzeuge/such-werkzeug.html` (Vorbild), `werkzeuge.html`.
4. Zum Vergleich „gut erklärt": das Siegel-Modal / der Andock-Wizard (Skill
   `status-leiste-siegel`).

## Abschluss-Befehl (am Ende der nächsten Sitzung)

`docs/PULS.md` fortschreiben; neuen Folge-Brief `docs/sessions/BRIEF_09_*.md` anlegen **und
vollständig als Codeblock im Chat** ausgeben; Pflichtlektüre + Abschluss-Befehl wiederholen
(die Kette reißt nie ab). Freibrief gilt.
