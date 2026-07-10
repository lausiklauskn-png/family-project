# Bauanleitungen (zweites Gehirn) — SBKIM-Netz & Siegel

Die vollständigen, netzweit gültigen **Bauanleitungen** liegen als Skills unter
`.claude/skills/` (Markdown, jede Sitzung liest sie automatisch). Dieser Wegweiser
macht sie im Doku-Speicher sichtbar (Klaus 2026-07-10 — „genauso in SP + FP ablegen").

## 1. „Mit dem Netz verbinden" — saubere Netz-Anmeldung / Identitäts-Hygiene

**Datei:** [`.claude/skills/saubere-netz-anmeldung/SKILL.md`](../.claude/skills/saubere-netz-anmeldung/SKILL.md)

Die feste Reihenfolge, wie eine SBKIM-PWA zu einer **eigenen, stabilen Identität**
kommt und sich **sauber** im gemeinsamen Raum anmeldet — gegen das
„alle-Apps-teilen-eine-nodeId"-Problem (gemeinsame Origin `github.io`):

- **Ziel E1–E4:** eigene Schublade `sbkim_<suffix>` · genau eine stabile Identität ·
  eigene gültige Spore · lebend im Raum angemeldet.
- **Modus A** (automatisch, idempotent, nicht zerstörend): bei `init()` eigene
  Schublade + Identität sicherstellen.
- **Modus B** (🧹 „Aufräumen & neu anmelden", nur per Nutzer-Knopf): geteilten
  Alt-Topf `sbkim` reinigen → frische Identität → Spore → anmelden → hart neu laden.
- **Pflicht:** Modell-Ladefortschritt (Balken) immer sichtbar; `dbSuffix` ins
  Rendezvous verdrahten.

## 2. Das SBKIM-Siegel + Status-Lampen-Leiste

**Datei:** [`.claude/skills/status-leiste-siegel/SKILL.md`](../.claude/skills/status-leiste-siegel/SKILL.md)

Das vollständige Rezept für das **SBKIM-Siegel** + die **Status-Lampen-Leiste**
(LEBT/VERKEHR/FREMD/SIEGEL, Modul 17-Widget + Membran 15 + Bronze/Gold 16) **und**
den Pflicht-Inhalt des Siegel-Modals — allen voran den **Andock-Wizard** (🔑 eigene
Identität & Spore erzeugen/verwalten), ✍ Semantik-Beschreibung, 🛡 Schutz-Block,
⛨ fremden Knoten andocken. Regel: jedes Siegel wird nach diesem Muster gebaut —
mit dem Werkzeug darin, nicht nur als Badge.

## 3. Welche App erzeugt die Identität? — der `dbSuffix`, nicht die Adresse

**In einfachen Worten (auch ohne Programmierkenntnisse wichtig — Klaus 2026-07-10):**

Wenn mehrere Apps im selben Browser angemeldet sind, fragt man sich schnell:
*„Welche erzeugt jetzt eigentlich meine Netz-Identität (die Spore)?"*

- Jede App hat eine **eigene Schublade** — ihren `dbSuffix` (z. B. `mixarium`,
  `rezeptbuch`, `toolpoint`). **Diese Schublade** entscheidet, wer man im Netz ist —
  **nicht** die Internet-Adresse und **nicht**, aus welchem Fenster man startet.
- Bild: der `dbSuffix` ist der **Ausweis**. Zwei Fenster mit demselben Ausweis sind
  **dieselbe** Person; zwei verschiedene Ausweise sind **zwei** Personen.
- **Betrachter-Werkzeuge** wie die **Mycel-Karte** sind nur ein **Schaufenster**:
  sie **zeigen**, wer im Raum ist, aber melden **niemanden** an und erzeugen **keine**
  eigene Identität. Wird die Karte **aus Sage heraus** geöffnet, spricht sie mit
  **Sages** Ausweis — sie legt keinen neuen an.

Volle technische Fassung: Sage-Protokol `docs/OBSERVATORIUM_BROWSER.md` **Lehre 13**;
Einbau-Regel im Skill oben (§ 1, Abschnitt „Der `dbSuffix` entscheidet die Identität").

## 4. ⭐ Meilenstein 10.07.2026 — zwei Knoten unterhalten sich nach Bedeutung

**Datei:** [`meilenstein/2026-07-10_zwei-knoten-nach-bedeutung.md`](meilenstein/2026-07-10_zwei-knoten-nach-bedeutung.md) (+ Bild)

Zum ersten Mal haben sich zwei Apps **nach Bedeutung** unterhalten — server-los,
in beide Richtungen (Sage↔Mixarium). Der andere Knoten durchsucht seinen **eigenen
Inhalt** nach dem Sinn der Frage und antwortet. Die volle bidirektionale
Cross-Knoten-Suche ist damit **live bewiesen**. Voller Werdegang: Sage-Protokol
`docs/MEILENSTEIN_SEMANTISCHE_SUCHE.md` § 4.

---

*Diese Bauanleitungen liegen identisch in **Sage-Protokol** (`.claude/skills/`)
und hier in **family-project**. Bei Weiterentwicklung beide Orte nachziehen.*
