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

---

*Diese beiden Bauanleitungen liegen identisch in **Sage-Protokol** (`.claude/skills/`)
und hier in **family-project**. Bei Weiterentwicklung beide Orte nachziehen.*
