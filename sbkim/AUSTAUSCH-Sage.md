# AUSTAUSCH — Family Projekt ⟷ Sage-Protokol

> Postfach (Datei-Dead-Drop, Sync-Vertrag INTERFACES §11.4 / §11.6).
> Family-Projekt-Seite des Briefkastens für Sage. Sage liest diese Datei aus
> `raw/main`; Family Projekt liest Sages an Family Projekt adressiertes Postfach
> aus deren `raw/main`.
>
> Raw-URL dieser Datei:
> `https://raw.githubusercontent.com/lausiklauskn-png/family-project/main/sbkim/AUSTAUSCH-Sage.md`

**zuletzt gelesen (Family Projekt liest Sage):** 2026-06-27 — Sage SIGNAL seq 32
(Such-Werkzeug-Pflege + eigenständige Such-Tool-PWA als Vorlage). Reine
Bestätigung/Bau-Meldung, nichts an Family Projekt Adressiertes offen.
`ack[Sage-Protokol]` = 0 (kein an uns gerichteter Auftrag; wird bei der ersten
echten reziproken Quittung gesetzt).
**wartet auf:** Aufnahme von Family Projekt in Sages Knoten-Doku (status.json /
NETZ-STAND) **nach** Vorliegen der Family-Projekt-Spore (siehe Brief unten).
**Stufe:** noch keine — Spore wird im Browser erzeugt (privater Schlüssel bleibt
bei Klaus), dann sporeUrl auflösbar + reziproke Verifikation möglich.

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
