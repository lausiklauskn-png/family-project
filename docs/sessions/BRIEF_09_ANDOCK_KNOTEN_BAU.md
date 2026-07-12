# BRIEF 09 — Werkzeug-Landingpages „Andock" & „Knoten" bauen (Bau-Sitzung)

**Datum:** 2026-07-12 · **Art:** Bau (Richtung ist mit Klaus geklärt — Brief 08 war die Klärung)
**Freibrief gilt** (Sage CLAUDE.md § Freibrief, netzweit). Diese Sitzung **baut** die in
Brief 08 gestellten Fragen entlang von Klaus' Entscheidungen aus.

---

## Klaus' Entscheidungen (2026-07-12, verbindlich — hier nicht neu verhandeln)

Auf die vier offenen Fragen aus Brief 08 hat Klaus so entschieden:

1. **Zielgruppe (Frage 1 → 1a): unterschiedlich.**
   - **Andock** = **breiter** angelegt (auch normale Seiten-Betreiber, die mitmachen wollen).
   - **Knoten** = ehrlich als **„für Entwickler/Bastler"** gekennzeichnet (Erwartung richtig
     setzen, nicht wie ein fertiges Endnutzer-Produkt zeigen).

2. **Screenshot-Bereich (Frage 2 → 2a): leeren Platzhalter RAUS, echte Bilder wo möglich.**
   - Der „Screenshot 1 — [ vom Anbieter eingefügt ]"-Rahmen (＋/×-Galerie) muss weg — er ist
     der stärkste „kaputt/unfertig"-Eindruck.
   - Wo es echtes, zeigbares UI gibt (das Andock-Werkzeug mit dem sichtbaren Siegel), echte
     Screenshots einbetten. Wo es kein zeigbares UI gibt (Knoten = Kopier-Bausteine), **ehrlich
     weglassen** statt Fake-Bild. **Keine erfundenen Screenshots/Reviews** (Leitplanke).

3. **Andock-Ziel (Frage 3 → 3b, präzisiert): EIGENE Erklär-Seite in Family-Optik** — mit
   **Links zur Sage-Page + zur Einladung** und **einer Anleitung mit echtem, selbst-
   ausfüllendem Siegel**. Also NICHT nur nach `netzwerk.html#andock` springen und NICHT nur
   auf das SB-KIMTool-Point-Tool weiterreichen, sondern auf der Family-Seite selbst erklären +
   das Siegel sichtbar/nutzbar machen, und für die Tiefe auf Sage/Einladung/SB-KIMTool
   verlinken.

4. **Knoten-Ziel (Frage 4 → 4a): EIGENE Erklär-Anleitung mit Kopier-Bausteinen** auf der Seite
   selbst — statt undurchsichtigem Sprung-Link auf `mycelknoten.html`. Man soll verstehen UND
   etwas mitnehmen können (Kopier-Blöcke). Der Link auf `mycelknoten.html` / Sage darf als
   „mehr dazu" bleiben, ist aber nicht mehr das alleinige Ziel.

---

## Was konkret zu bauen ist

### Gemeinsam (beide Seiten): leere Screenshot-Galerie raus (Entscheidung 2a)
- In `assets/tool-landing.js`: die Galerie-Sektion (`.shot` / `#mainlabel` / `#thumbs` /
  `.galnote` + `wireGallery`) so umbauen, dass sie **nur rendert, wenn echte Bilder vorliegen**.
  Vorschlag: neues optionales Feld `FP_TOOL.shots = [{src, alt}]`. Ist `shots` leer/fehlt →
  **gar keine Galerie** rendern (kein leerer Rahmen). Ist `shots` gesetzt → echte `<img>`
  statt Platzhalter-Label + `＋/×`-Demo-Mechanik.
- **ACHTUNG Regressions-Falle:** `tool-landing.js` rendert **alle drei** Seiten. Das
  **Such-Werkzeug** (`such-werkzeug.html`) ist gut und darf NICHT kaputtgehen. Zwei saubere
  Wege: (a) `shots` auch fürs Such-Werkzeug mit echten Screenshots füllen, oder (b) das
  Weglassen-bei-leer-Verhalten so bauen, dass das Such-Werkzeug ohne `shots` einfach keine
  (kaputte) Galerie mehr zeigt — auch eine Verbesserung. Klaus-Befund war: die leere Galerie
  wirkt überall unfertig. **Empfehlung:** leere Galerie generell weglassen; echte Screenshots
  nachrüsten, wo sinnvoll (Such-Tool + Andock-Werkzeug-Siegel).
- Echte Screenshots (falls erzeugt): headless via Playwright/Chromium (`/opt/pw-browsers`),
  als **echte Dateien** unter `assets/shots/` (Family-Hub darf mehrteilig sein — bekannte
  Abweichung, CLAUDE.md „Regeln aus den Live-PWAs"). Keine PII im Bild.

### Andock-Seite (`werkzeuge/andock-werkzeug.html` + ggf. eigene Erklär-Sektion)
Ziel: eine **eigene, gut erklärte** Andock-Seite in Family-Optik (Entscheidung 3b), die
1. in einfachen Worten sagt **was Andocken ist und was es bringt** (breite Zielgruppe, 1a) —
   Vorbild „gut erklärt": das Siegel-Modal + das echte SB-KIMTool-Point-Andock-Werkzeug
   (`https://lausiklauskn-png.github.io/SB-KIMTool-Point/web/tools/andock.html`).
2. ein **echtes, selbst-ausfüllendes SBKIM-Siegel** sichtbar macht (golden, mit „als PNG/SVG
   herunterladen"), wie in der SB-KIMTool-Referenz. **Verbindliche Vorlage:** die Skill
   **`status-leiste-siegel`** (voller Rezept-Text für Siegel + Andock-Wizard). Zu Beginn der
   Bau-Sitzung diese Skill aufrufen und dem Muster folgen — NICHT das Siegel neu erfinden.
   Der Andock-Wizard (🔑 eigene Identität & Spore) ist NICHT Modul 19 (Onboarding-Vorlage ohne
   Krypto) — siehe Skill-Warnung.
3. **verlinkt** (Klaus' ausdrücklicher Wunsch):
   - **Sage-Page** (Profi-Ebene) — der Link liegt schon in `netzwerk.html`:
     `https://lausiklauskn-png.github.io/Sage-Protokol/docs/einladung/` (Einladung) und die
     Sage-Protokol-Seite selbst.
   - **Einladung** — derselbe `docs/einladung/`-Link (Drei-Format-Einladungs-Site).
   - optional das echte SB-KIMTool-Point-Andock-Werkzeug als „ausführliches Werkzeug".
4. den alten reinen Sprung `openUrl: "../netzwerk.html#andock"` ersetzt/ergänzt — der
   Netzwerk-Raum darf als „dort wirklich andocken" verlinkt bleiben, ist aber nicht mehr die
   einzige Erklärung.

#### ⭐ Kontextuelle Link-Landkarte — „jede Aussage ist ein Link" (Klaus 2026-07-12, verbindlich)

Klaus' ausdrücklicher Wunsch für die Andock-Erklärseite (analog wo sinnvoll für Knoten):
**Jede Aussage / jede Frage im Text wird selbst zu einem Link**, der genau zum thematisch
passenden Ziel führt — Tool, Seite oder Erklärung — **nie ins Leere, immer auf den konkreten
Punkt**. Muster „Willst du dies? → hier. Willst du das? → dort." Und wo es passt, **je BEIDE
Quellen** verlinken (Sage-Page UND SB-KIMTool-Point — „die beiden Internetseiten, wo man das
Werkzeug direkt bekommt").

**PFLICHT-REGEL:** Vor dem Ausliefern **jeden** Link live prüfen (HTTP 200 bzw. Anker
existiert). Kein toter/ins-Leere-Link. Wenn ein Ziel nicht (mehr) lebt → anderes lebendes
Ziel wählen oder Aussage ohne Link lassen (ehrlich), NICHT raten.

**Verifizierte Ziele (Stand 2026-07-12, aus den Quell-`index.html` gezogen):**

Sage-Page — Basis `https://lausiklauskn-png.github.io/Sage-Protokol/`:
| Thema / Aussage | Ziel |
|---|---|
| „Wie funktioniert das Mycel? / Mycel in Aktion" | `mycel-karte/` (Live-Mycel-Karte) |
| „Browsergeschichten / KI-Browser-Agenten / schwarze Löcher" | Blackhole-Karte `#observatorium-stage` bzw. `docs/OBSERVATORIUM_BROWSER.md` |
| „Willst du mitmachen? / Einladung" | `docs/einladung/index.html` |
| „Nach Bedeutung suchen / semantische Suche" | `#meilenstein-suche` + `#meilenstein-bidirektional`; Tool: `such-tool/` |
| „Pinnwand" | `pinnwand/` |
| „Was ist SBKIM / das Protokoll / Paper" | `paper.html` |
| „Die Module / der Baukasten" | `#module-list` |
| „Endknoten im Netz" | `#endknoten-grid` |
| „Vorteilspack / alle Werkzeuge (Truhe)" | `#observatorium-vorteilspack` / `#observatorium` |

SB-KIMTool-Point — Basis `https://lausiklauskn-png.github.io/SB-KIMTool-Point/`:
| Thema / Aussage | Ziel |
|---|---|
| „Suchst du Werkzeuge?" | `werkzeuge.html` |
| „Das echte Andock-Werkzeug (mit Siegel)" | `web/tools/andock.html` |
| „Selbst zum Knoten werden" | `web/tools/mycelknoten.html` |
| „Wie ist das Modell / die Erklärung" | `modell.html` |
| „Sicherheit / Schutz" | `sicherheit.html` |
| „Marktplatz (SBKIM)" | `markt.html` |

Family-intern (relativ ab `werkzeuge/andock-werkzeug.html`):
| Thema | Ziel |
|---|---|
| „Wirklich andocken (Netzwerk-Raum)" | `../netzwerk.html#andock` |
| „Nach Bedeutung suchen (unser Tool)" | `such-werkzeug.html` |
| „Selbst zum Knoten werden (unsere Seite)" | `knoten-werkzeug.html` |
| „Marktplatz" | `../markt.html` |

**Beispiel-Aufbau (nur Muster, Wortlaut frei):** „Neugierig, **wie das Mycel wirklich
tickt**? → *Sieh die Mycel-Karte* [Sage]. Es geht um **KI-Browser-Agenten und schwarze
Löcher**? → *Das Browser-Observatorium* [Sage]. **Willst du mitmachen**? → *Zur Einladung*.
**Suchst du fertige Werkzeuge**? → *Werkzeugkiste* [SB-KIMTool-Point] · *unsere Werkzeuge*
[Family]." — jede Fett-Aussage ist der klickbare Link.

### Knoten-Seite (`werkzeuge/knoten-werkzeug.html`)
Ziel: **eigene Erklär-Anleitung mit Kopier-Bausteinen** (Entscheidung 4a), ehrlich als
**Entwickler/Bastler-Thema** gekennzeichnet (1a):
1. Eyebrow/Held klar als „für Entwickler / zum Selberbauen" markieren (Erwartung setzen).
2. „So wird deine App ein Knoten" — kurze, ehrliche Schritt-Liste + **Kopier-Blöcke**
   (welche Module Datei-für-Datei kopieren, „kopieren, nicht klonen"), statt nur der
   undurchsichtige Sprung auf `mycelknoten.html`.
3. `mycelknoten.html` / Sage-Baukasten als „ausführliche Anleitung / offener Baukasten"
   **verlinkt** lassen (nicht mehr alleiniges Ziel).
4. Kein Fake-Screenshot (Knoten hat kein eigenes zeigbares UI) — Galerie hier weglassen.

---

## Leitplanken (unverändert aus Brief 08)

- **Nur Seiten-Text/Layout** anfassen: `werkzeuge/*.html`, `assets/tool-landing.js`,
  `werkzeuge.html`, `assets/style.css`, ggf. neue `assets/shots/*`. **Kern-SBKIM-Module /
  Protokoll NICHT** berühren.
- **Ehrlichkeit:** nichts vortäuschen (keine erfundenen Screenshots/Reviews). Kein zeigbares
  UI → ehrlich mit Text/Diagramm abbilden.
- **Fremdnutzer-/Marktplatz-Brille:** klar benennen, was das Werkzeug bringt und für wen;
  fail-soft; kopier-tauglich; keine toten Knöpfe.
- **SW-Cache:** bei Shell-Änderungen `CACHE_VERSION` in `sw.js` erhöhen (Brief 08: aktuell
  v37 — vor Bau den echten Stand in `sw.js` prüfen und hochzählen).
- family-projekt.de deployt automatisch (Hetzner, 2-Min-Cron) + GitHub-Pages-Vorschau → nach
  Merge Hard-Reload. **Browser-Sichttest bleibt Klaus vorbehalten** — Bau ehrlich mit
  „ungeprüft, wartet auf Klaus' Browser-Lauf" schließen.
- **Selbst-Merge-Freibrief** gilt (netzweit): getestet + abgegrenzt + nicht zweifelhaft →
  Draft-PR → ready → squash-merge. Bei echtem Zweifel erst Klaus fragen.

## Datenverträge / betroffene Dateien

- `assets/tool-landing.js` — `FP_TOOL`-Schema (Held, openUrl/installUrl, features, trust,
  Galerie). Neues optionales `shots`-Feld. Änderungen wirken auf **alle drei** Tool-Seiten →
  Such-Werkzeug darf nicht kaputtgehen.
- `werkzeuge/andock-werkzeug.html`, `werkzeuge/knoten-werkzeug.html` (`FP_TOOL`-Daten + ggf.
  eigene Erklär-/Siegel-Sektion).
- `werkzeuge.html` (Werkzeug-Liste: ggf. „für Entwickler"-Gruppierung/Kennzeichnung).
- `assets/style.css` (neue Sektionen), `sw.js` (`CACHE_VERSION`↑).

## Akzeptanzkriterien

- [ ] Kein leerer „vom Anbieter eingefügt"-Screenshot-Rahmen mehr auf irgendeiner der drei
      Werkzeug-Seiten.
- [ ] Andock-Seite: eigene Erklärung + sichtbares, selbst-ausfüllendes Siegel (nach Skill
      `status-leiste-siegel`) + Links zu Sage-Page & Einladung.
- [ ] Kontextuelle Link-Landkarte umgesetzt: jede Kern-Aussage/Frage ist ein klickbarer Link
      zum passenden Ziel (Sage + SB-KIMTool-Point, „die beiden Seiten") — **jeder Link live
      geprüft (200/Anker), keiner ins Leere**.
- [ ] Knoten-Seite: als Entwickler-Thema gekennzeichnet + Kopier-Bausteine + „mehr dazu"-Link.
- [ ] Such-Werkzeug unverändert funktionsfähig (kein Regress).
- [ ] `sw.js` `CACHE_VERSION` erhöht.
- [ ] Fokus-Smoke grün (soweit vorhanden); ehrlich vermerken, was nur Klaus im Browser prüft.

## Reihenfolge

1. Skill `status-leiste-siegel` lesen (Siegel-/Andock-Wizard-Rezept).
2. `tool-landing.js` Galerie umbauen (leer → weglassen; `shots`-Feld).
3. Andock-Seite: Erklärung + Siegel + Links.
4. Knoten-Seite: Entwickler-Kennzeichnung + Kopier-Bausteine.
5. `werkzeuge.html` ggf. Gruppierung; `sw.js` v↑; Smoke; PULS + Folge-Brief; PR.

## Offene Fragen an Klaus (nur falls sie beim Bauen echt auftauchen)

- Sollen echte Screenshots (Such-Tool, Andock-Siegel) erzeugt werden, oder reicht dir das
  Weglassen der leeren Galerie fürs Erste? (Entscheidung 2a deckt beides ab — im Zweifel
  erst weglassen, Screenshots als schneller Nachtrag.)
- Soll die Werkzeug-Liste (`werkzeuge.html`) „Andock/Knoten" sichtbar als „für Entwickler"
  gruppieren, oder unauffällig in der Seite selbst kennzeichnen?

---

## Pflichtlektüre vor der Arbeit (in dieser Reihenfolge)

1. Sage `CLAUDE.md` (§ Freibrief, § Fremdnutzer-/Marktplatz-Brille, § Plan-vor-Code).
2. `family-project/docs/PULS.md` (oberster Eintrag) + **dieser Brief** + Brief 08
   (`BRIEF_08_WERKZEUG_LANDINGPAGES.md`, der IST-Zustand steht dort ausführlich).
3. Code: `assets/tool-landing.js`, `werkzeuge/andock-werkzeug.html`,
   `werkzeuge/knoten-werkzeug.html`, `werkzeuge/such-werkzeug.html` (Vorbild), `werkzeuge.html`.
4. Skill `status-leiste-siegel` (selbst-ausfüllendes Siegel + Andock-Wizard) — Pflicht fürs
   Andock-Siegel. Zum Vergleich „gut erklärt": SB-KIMTool-Point-Andock-Werkzeug (live-URL oben).

## Abschluss-Befehl (am Ende der Bau-Sitzung)

`docs/PULS.md` fortschreiben; neuen Folge-Brief `docs/sessions/BRIEF_10_*.md` anlegen **und
vollständig als Codeblock im Chat** ausgeben; Pflichtlektüre + Abschluss-Befehl wiederholen
(die Kette reißt nie ab). Freibrief gilt.
