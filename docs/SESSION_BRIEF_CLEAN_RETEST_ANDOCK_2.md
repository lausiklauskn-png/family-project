# Sitzungsbrief — Clean-Slate-Test DURCHFÜHREN (Andock-Tool ⑤ ist gebaut)

**Datum erstellt:** 2026-06-28 · **Branch (ALLE Repos):** `claude/spore-generation-network-receipt-eyzz27-f9lpew`
**Freibrief gilt.** Deutsch, Einzelschritte, keine Konsolen-Befehle für Klaus — Bedienung über Knöpfe.

> Nachfolger von `SESSION_BRIEF_CLEAN_RETEST_ANDOCK.md`. Pflichtlektüre dort gilt weiter.

## Was diese Sitzung (2026-06-28) gebaut hat — erledigt
- **Andock-Tool (Dev-Briefkasten, `?dev`) hat jetzt Schritt ⑤ „Andocken"** in
  `family-project/sbkim/sbkim-init.js`: Ziel-Knoten-Dropdown + Knopf **🤝 Andocken
  (Handshake senden)** → echter ausgehender Handshake über das Live-Relais
  (`SbkimAnastomose.handshake(target, null, {transport:"nostr"})`), **konsolen-frei**.
  Ehrliche Ausgabe: established / rejected / rejected-local / timeout. Modul 05 unangetastet.
- §11.6: family `SIGNAL.json` seq 3 → 4. Smoke 75/75. PR #11 (Draft).
- **Goal 3 war schon auf main** (Sage SIGNAL seq 34) — nichts nachzuziehen.

## ⭐ Ehrlicher Befund, der den Testablauf ändert — Schwelle 0.80
Family ↔ Mixarium Domänen-Cosinus = **0.7753 < 0.80** → der Handshake wird **lokal
abgelehnt** (`rejected-local`) und sendet bewusst **nichts** ans Relais. Mixariums
VERKEHR-Liste würde sich so **nicht** füllen — das ist die Bedeutungs-Schwelle, kein Bug.
**Für die Live-VERKEHR-Demo ein Ziel ≥ 0.80 wählen:** Rezeptbuch 0.807 · BookLedgerPro
0.803 · Sage 0.829 · SB-KIMTool 0.831. **Empfehlung: Mein Rezeptbuch** (vertraute App,
sichtbares Widget, über der Schwelle).

## Testablauf mit Klaus am Browser (Clean Slate)
1. Apps deinstallieren → Browser tief reinigen (Service-Worker + IndexedDB + localStorage +
   Cache; DeX- und Tablet-Chrome getrennt). 
2. **family-projekt.de** + die Apps frisch installieren, je einmal öffnen → **VERKEHR-Lampe
   wird grün** (= lauscht). Erster Beleg.
3. **Empfänger-Knoten offen lassen** (z. B. **Mein Rezeptbuch** in eigenem Tab, lauscht).
4. **family-projekt.de/netzwerk.html?dev** → unten links **🔌 Andock-Tool** → Schritt ①
   **Eigene Spore erzeugen** (einmalig ~30 MB Modell, online bleiben).
5. Schritt ⑤: Ziel **Mein Rezeptbuch** wählen → **🤝 Andocken**. Erwartung: „✓ ANDOCK
   ETABLIERT" → im **Rezeptbuch-Tab füllt sich die VERKEHR-Liste** (Zeit/Quelle/Richtung).
   Das ist der server-lose Cross-Knoten-Beweis.
6. Gegenprobe (optional, lehrreich): Ziel **Mein Mixarium** → Ausgabe „rejected-local 0.7753
   < 0.80" → beweist, dass die Bedeutungs-Schwelle wirkt (kein Fehler).
7. Ergebnis ehrlich festhalten — kein „grün" ohne Klaus' Browser-Lauf.

## Offene Punkte
- Modul-19-Andock-Wizard (fremde App) bleibt Schablone — für Klaus' eigenen Test reicht der
  Dev-Briefkasten. Bei „fremde App andocken" Klaus fragen, ob Wizard ausgebaut werden soll.
- Nach erfolgreichem Test: PR #11 mergen (Klaus' Ansage) + auf Hetzner `git pull origin main`.

## Pflichtlektüre + Abschluss-Befehl
Wie im Vorgänger-Brief. Bei Sitzungsende: PULS fortschreiben, „Nächste Schritte" im Chat,
neuen Brief als Codeblock, §11.6 pflegen wo gebaut.
