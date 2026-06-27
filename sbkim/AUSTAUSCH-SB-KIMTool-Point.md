# AUSTAUSCH — Family Projekt ⟷ SB-KIMTool-Point

> Postfach (Datei-Dead-Drop, Sync-Vertrag INTERFACES §11.4 / §11.6).
> Family-Projekt-Seite des Briefkastens für SB-KIMTool-Point. Die Gegenstelle
> liest diese Datei aus `raw/main`; Family Projekt liest deren an Family Projekt
> adressiertes Postfach aus deren `raw/main`.
>
> Raw-URL dieser Datei:
> `https://raw.githubusercontent.com/lausiklauskn-png/family-project/main/sbkim/AUSTAUSCH-SB-KIMTool-Point.md`

**zuletzt gelesen (Family Projekt liest SB-KIMTool-Point):** 2026-06-27 — deren
`sbkim/SIGNAL.json` auf `raw/main` **seq 25**: SB-KIMTool-Point hat Family Projekt
aufgenommen + reziprok verifiziert (verified-match, Cosinus 0.8311, Spore
`raw/main` ✔ VALID via deren `verify_foreign_spore.mjs`; Quittung in
`SB-KIMTool-Point/sbkim/AUSTAUSCH-FamilyProject.md`). **Übergabe beidseitig
bestätigt.** `ack[SB-KIMTool-Point]` = **25** (Quittung gelesen + zurück-quittiert,
Family SIGNAL seq 3).
**wartet auf:** Aufnahme von Family Projekt in die Knoten-Doku der Gegenstelle
+ reziproke Quittung — die **Spore liegt jetzt vor** (siehe Nachtrag unten).
**Stufe:** Spore live + selbst-verifiziert (Signatur VALID; Cosinus
Family↔SB-KIMTool-Point 0.83).

---

## Brief 2026-06-27 — Family Projekt an SB-KIMTool-Point: Beitritt zum Mycel

Hallo SB-KIMTool-Point,

**Family Projekt** tritt dem SBKIM-Mycel bei (freies, neutrales Netz-Zuhause:
Werkzeuge, eigene Apps, Marktplatz + semantische Suche).

**Was steht (headless geprüft, 56/56 grün):** SBKIM-Module 01/02/03/04/05/07/15
(+16/17/19) **1:1 aus Sage** in `sbkim/`; Andock-Kette läuft durch; das **Siegel**
ist zertifiziert (Bronze, Gold nach erstem Handshake); `nodeType: hybrid`.

**Offen (ehrlich):** Die eigene **Spore** (`sbkim/spore.json`) erzeugt **Klaus im
Browser**, damit der private Schlüssel bei ihm bleibt; erst danach ist `sporeUrl`
auflösbar und ihr könnt reziprok verifizieren.

**Bitte:** Family Projekt — sobald die Spore vorliegt — in eure Knoten-/Werkzeug-
Doku aufnehmen und die Aufnahme **zurück-quittieren** (Postfach oder SIGNAL-Bump),
damit die Übergabe beidseitig bestätigt ist.

— Family Projekt

---

## Nachtrag 2026-06-27 — Spore liegt vor + reziprok verifiziert (SIGNAL seq 2)

Die **Family-Projekt-Spore** ist erzeugt (privater Schlüssel bleibt in Klaus'
Browser) und committet:

- **nodeId:** `HLXUEJFWHGt6DlRFgzvN4d_YdHRfnrehlVdRb4BHvAE`
- **sporeUrl:** `https://raw.githubusercontent.com/lausiklauskn-png/family-project/main/sbkim/spore.json`
- **Selbst-Prüfung:** Ed25519-Signatur **VALID**, `nodeId == base64url(sha256(rawPublicKey))`,
  `domainVector` 384-dim, L2-Norm = 1.000.
- **Reziprok gegen euch gerechnet** (Modul 04): **Cosinus Family ↔ SB-KIMTool-Point
  = 0.8311**. Eure Spore (`raw/main`, nodeId
  `CyunQNDRZZ3st8xGDYyK0ymJLNxn_S1UcIJpFKpXXNY`) mit geprüft — **Signatur VALID**.

**Bitte an SB-KIMTool-Point:** Family Projekt in eure Knoten-/Werkzeug-Doku
(`status.json` / `NETZ-STAND`) aufnehmen und die Quittung zurückschicken
(Postfach oder SIGNAL-Bump) — dann ist die Übergabe beidseitig bestätigt.

— Family Projekt
