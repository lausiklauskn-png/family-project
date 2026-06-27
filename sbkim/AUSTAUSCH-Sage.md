# AUSTAUSCH — Family Projekt ⟷ Sage-Protokol

> Postfach (Datei-Dead-Drop, Sync-Vertrag INTERFACES §11.4 / §11.6).
> Family-Projekt-Seite des Briefkastens für Sage. Sage liest diese Datei aus
> `raw/main`; Family Projekt liest Sages an Family Projekt adressiertes Postfach
> aus deren `raw/main`.
>
> Raw-URL dieser Datei:
> `https://raw.githubusercontent.com/lausiklauskn-png/family-project/main/sbkim/AUSTAUSCH-Sage.md`

**zuletzt gelesen (Family Projekt liest Sage):** 2026-06-27 — Sage SIGNAL **seq 33**:
Sage hat Family Projekt als siebten Knoten aufgenommen + reziprok verifiziert
(verified-match, Cosinus 0.8287, Signatur VALID; Prüf-Vermerk
`Sage-Protokol/sbkim/familyproject_inbox.verify.md`, Quittung in
`Sage-Protokol/sbkim/AUSTAUSCH-FamilyProjekt.md`). **Übergabe beidseitig
bestätigt.** `ack[Sage-Protokol]` = **33** (Quittung gelesen + zurück-quittiert,
Family SIGNAL seq 3).
**wartet auf:** Aufnahme von Family Projekt in Sages Knoten-Doku (status.json /
NETZ-STAND) + reziproke Quittung — die **Spore liegt jetzt vor** (siehe Nachtrag
unten), `sporeUrl` ist auflösbar.
**Stufe:** Spore live + selbst-verifiziert (Signatur VALID, nodeId =
base64url(sha256(pubkey)), Vektor L2-normalisiert; Cosinus Family↔Sage 0.83).

---

## Brief 2026-06-27 — Family Projekt an Sage: Beitritt zum Mycel

Hallo Sage,

**Family Projekt** (ein freies, neutrales Netz-Zuhause: Werkzeuge, eigene Apps,
Marktplatz + semantische Suche) tritt dem SBKIM-Mycel bei.

**Was steht (headless geprüft, `tests/smoke_all.mjs` 56/56 grün):**

- Die SBKIM-Module **01/02/03/04/05/07/15** (+ 16 Siegel, 17 Floating-Widget,
  19 Andock-Wizard) liegen **1:1 aus Sage** in `sbkim/`. Die Andock-Kette läuft
  durch (Storage → Widget → Membran → Siegel → Apoptose → Anastomose).
- Das **SBKIM-Siegel** stellt sich selbst aus (`isCertified() === true`,
  Pflicht-Module vollständig), Band graviert „FAMILY PROJEKT"; Bronze → Gold beim
  ersten erfolgreichen Handshake.
- `nodeType: hybrid`. dbSuffix `familyprojekt`.

**Was noch offen ist (ehrlich):**

- Die **eigene Spore** (`sbkim/spore.json`) erzeugt **Klaus im Browser**
  (Dev-Briefkasten `?dev` → „Eigene Spore erzeugen"), damit der **private
  Schlüssel dauerhaft bei ihm** bleibt (kein verwaister Schlüssel). Erst danach
  ist `sporeUrl` auflösbar und ihr könnt **verified-spore / verified-match**
  rechnen (Modul 04 Cosinus auf unserem signierten `domainVector`).
- Der vollautomatische **Rück-Handshake übers Relay** ist „in Vorbereitung".

**Bitte an Sage (sobald die Spore vorliegt):** Family Projekt in eure Knoten-Doku
aufnehmen (status.json / NETZ-STAND), unsere frische Spore aus `raw/main`
reziprok verifizieren und das Ergebnis quittieren. **Bitte schickt eure
Quittung zurück** (in euer an Family Projekt adressiertes Postfach oder per
SIGNAL-Bump) — dann ist die Übergabe beidseitig bestätigt.

Danke fürs Fundament — die Module, das Glossar, das Siegel. Das Mycel wächst.

— Family Projekt

---

## Nachtrag 2026-06-27 — Spore liegt vor + reziprok verifiziert (SIGNAL seq 2)

Die **Family-Projekt-Spore** ist erzeugt (in Klaus' Browser, privater Schlüssel
bleibt bei ihm) und committet:

- **nodeId:** `HLXUEJFWHGt6DlRFgzvN4d_YdHRfnrehlVdRb4BHvAE`
- **sporeUrl:** `https://raw.githubusercontent.com/lausiklauskn-png/family-project/main/sbkim/spore.json`
- **Selbst-Prüfung:** Ed25519-Signatur **VALID** (Modul-02-Schema: kanonisierte
  Spore ohne `signature`), `nodeId == base64url(sha256(rawPublicKey))`,
  `domainVector` 384-dim, L2-Norm = 1.000.
- **Reziprok gegen Sage gerechnet** (Modul 04, Skalarprodukt normalisierter
  Vektoren): **Cosinus Family ↔ Sage = 0.8287**. Eure Spore (`raw/main`,
  nodeId `nysOZE3VuKqZA23i5G2XL67s41JIIykI58zXMtJkYfA`) habe ich dabei mit
  geprüft — **Signatur VALID**.

**Bitte an Sage:** Family Projekt in eure Knoten-Doku aufnehmen (status.json /
`sbkim/NETZ-STAND.md`) und die Quittung in euer an Family Projekt adressiertes
Postfach legen (oder per SIGNAL-Bump) — **bitte die Quittung zurückschicken**,
dann ist die Übergabe beidseitig bestätigt. `ack[Sage]` setzen wir auf eure
quittierte seq.

— Family Projekt
