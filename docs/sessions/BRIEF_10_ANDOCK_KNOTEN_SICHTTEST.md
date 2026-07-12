# BRIEF 10 — Werkzeug-Landingpages Andock/Knoten: Sichttest & Feinschliff

**Datum:** 2026-07-12 · **Art:** Sichttest-Nachzug + optionaler Feinschliff
**Freibrief gilt** (Sage CLAUDE.md § Freibrief, netzweit).

---

## Stand (aus Brief 09 gebaut)

Die zwei Landingpages sind umgebaut (Branch `claude/werkzeuge-andock-knoten-design-o0aztn`):
- **Leere Screenshot-Galerie entfernt** (rendert nur noch bei echten `FP_TOOL.shots`).
- **Andock-Seite** = Kennenlernen-/Überblick-Einstieg: roter Faden (kennenlernen → Knoten →
  andocken), **selbst-gravierendes SBKIM-Wappen** (Namensfeld → Live-Gravur ins Band +
  SVG-Download), **Link-Landkarte** (7 Frage-Gruppen), **Bausteine-Download**.
- **Knoten-Seite** = für Entwickler: Schritt 2, **Kopier-Bausteine**, Vorwärts-Link zum Andocken.
- `tool-landing.js` neu strukturiert (additive Blöcke `steps/seal/linkmap/downloads`);
  `sw.js` v38; `style.css` erweitert; `werkzeuge.js` Reihenfolge/Beschriftung angepasst.
- Wappen-SVG kopiert nach `assets/sbkim-siegel-wappen.svg`.

Verifikation: JS-Syntax + Render-Logik (Node-DOM-Shim) grün; alle Inhalts-Links haben ein
echtes Ziel. **`playwright-core` in der Bau-Sandbox nicht installiert** → Voll-Smoke lief nicht.

## Was diese Sitzung tun soll

1. **Klaus' Browser-Sichttest** (nach Merge + Auto-Deploy + Hard-Reload, SW v38) — der
   unersetzbare Beweis. Prüfen:
   - Andock-Seite: roter Faden sichtbar, **Siegel-Namensfeld graviert live**, „Siegel als SVG
     herunterladen" lädt eine gültige Datei; Link-Landkarte-Links öffnen die richtigen Ziele.
   - Knoten-Seite: als Entwickler-Thema erkennbar, Kopier-Bausteine öffnen die Roh-/Werkzeug-
     Seiten; „andocken"-Link führt in den Netzwerk-Raum.
   - Such-Werkzeug: kein leerer Screenshot-Rahmen mehr, sonst unverändert.
2. **Voll-Smoke** dort laufen lassen, wo `playwright-core` verfügbar ist
   (`PW_CORE=... node tests/smoke_all.mjs`) — die neuen Andock-/Knoten-Assertions bestätigen.
3. **Optionaler Feinschliff (nur wenn Klaus es wünscht):**
   - **Echte Screenshots** (Klaus 2a „echte Bilder wo möglich"): headless Screenshots vom
     Such-Tool + vom Andock-Siegel erzeugen (`assets/shots/`), `FP_TOOL.shots` setzen. Bis dahin
     ist bewusst KEINE Galerie da (ehrlich statt Fake).
   - **Werkzeug-Liste** (`werkzeuge.html`): falls Klaus die Andock/Knoten-Einträge sichtbar als
     Gruppe „ins Netz einbringen" abheben will.
   - Cross-Origin-Roh-Bausteine (`raw.githubusercontent…`) öffnen als Text (kein Force-Download
     möglich) — Beschriftung ist ehrlich („ansehen & kopieren"). Falls gewünscht: kleine
     „In den Zwischenspeicher kopieren"-Hilfe statt Roh-Link.

## Leitplanken (unverändert)

- Nur Seiten-Text/Layout (`werkzeuge/*.html`, `assets/tool-landing.js`, `werkzeuge.html`,
  `assets/style.css`, `assets/shots/*`). Kern-SBKIM/Protokoll NICHT anfassen.
- Ehrlichkeit: keine erfundenen Screenshots. `sw.js` `CACHE_VERSION`↑ bei Shell-Änderung.
- Jeder Link live geprüft — nie ins Leere.

## Pflichtlektüre vor der Arbeit

1. Sage `CLAUDE.md` (§ Freibrief, § Marktplatz-Brille, § Plan-vor-Code).
2. `family-project/docs/PULS.md` (oberster Eintrag) + Brief 09 + dieser Brief.
3. Code: `assets/tool-landing.js`, `werkzeuge/andock-werkzeug.html`,
   `werkzeuge/knoten-werkzeug.html`, `werkzeuge/such-werkzeug.html`, `werkzeuge.js`.
4. Skill `status-leiste-siegel` (falls das Siegel erweitert wird).

## Abschluss-Befehl

`docs/PULS.md` fortschreiben; neuen Folge-Brief `docs/sessions/BRIEF_11_*.md` anlegen und
vollständig als Codeblock im Chat ausgeben; Pflichtlektüre + Abschluss-Befehl wiederholen.
Freibrief gilt.
