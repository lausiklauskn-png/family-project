---
name: seiten-bauregeln
description: Klaus' Bauregeln für Internetseiten, PWAs und Werkzeuge — nach Gewerk getrennt (Bilder · Skripte · Text/Auffindbarkeit · Layout/Barrierefreiheit · Messen). Anwenden VOR dem Bauen oder Ändern einer Seite/App, bei jeder Frage nach Ladezeit, PageSpeed-/Lighthouse-Werten ("warum ist X langsamer als Y", "der Computerwert ist schlechter als der Handywert"), vor jedem Bild-Einbau, und wenn ein Werkzeug für den family-projekt.de-Marktplatz entsteht. Jede Regel stammt aus einer echten Messung an Klaus' eigenen Repos, mit Datum und Zahl — keine Lehrbuch-Weisheiten. Reihenfolge ist Pflicht: erst die Regel des Gewerks lesen, dann bauen, dann gegenmessen.
---

# Bauregeln für Seiten, PWAs und Werkzeuge

**Klaus' Anweisung (2026-08-06):** *„Es gibt Text zu bearbeiten. Du siehst die
Regeln für den Text. Es gibt Bilder zu bearbeiten. Du siehst die Bilderregeln.
Es gibt Regeln für Links, für andere Sachen. Du liest zuerst die Regel, dann
baust Du."*

Genau so ist diese Sammlung gebaut: **nach Gewerk getrennt.** Du liest die
Datei, die zu deiner Arbeit gehört — nicht alle.

## Welche Datei wann

| Du arbeitest an … | Lies zuerst |
|---|---|
| Bildern, Bannern, Icons, Logos, Videos | [`regeln/bilder.md`](regeln/bilder.md) |
| Skripten, Modulen, Ladereihenfolge, Service-Worker | [`regeln/skripte.md`](regeln/skripte.md) |
| Titel, Beschreibung, Texten, Auffindbarkeit bei Google | [`regeln/text-und-auffindbarkeit.md`](regeln/text-und-auffindbarkeit.md) |
| Layout, Kopfleisten, Farben, Kontrast, Links, Knöpfen | [`regeln/layout-und-bedienbarkeit.md`](regeln/layout-und-bedienbarkeit.md) |
| Messen, Prüfen, Werte-Vergleich, „warum ist X langsamer" | [`regeln/messen.md`](regeln/messen.md) |

Wenn dein Bau mehrere Gewerke berührt, liest du mehrere Dateien — aber nur die
betroffenen.

## Die vier Regeln über den Regeln

Diese gelten immer, in jedem Gewerk.

**1 · Erst messen, dann bauen. Und danach gegenmessen.**
Jede Zahl in dieser Sammlung stammt aus einer echten Messung, nicht aus einem
Ratschlag. Der häufigste teure Fehler in diesem Netz war nicht eine falsche
Technik, sondern eine **plausible Vermutung, die niemand nachgeprüft hat**.
Belegte Beispiele:
- „Der SBKIM-Stapel bremst den Werkzeugkasten" — gemessen: Entfernen bringt
  0,1 s. Die Vermutung war falsch (Tomys-Hub, 2026-08-03).
- „Dann verschieben wir eben das teure Skript" — gemessen: 78 statt 79, die
  Arbeit wanderte nur eine Datei weiter (Mein-WorkFloh, 2026-08-06).
- „`defer` macht es schneller" — gemessen: 98 → 90, deutlich **schlechter**
  (Tomys-Hub, 2026-08-03).

**2 · Handy und Computer sind zwei verschiedene Messungen.**
Nicht „dieselbe Seite, anderes Tempo". Lighthouse ändert mit dem Gerät auch die
**Fensterbreite** (412 px gegen 1350 px). Jede Regel, die an der Breite hängt,
macht daraus **zwei verschiedene Seiten**. Immer beide Werte nennen. Details in
[`regeln/messen.md`](regeln/messen.md).

**3 · Fremdnutzer-Brille.** Alles, was auf family-projekt.de landet, wird von
Leuten benutzt, die weder das Repo noch dich kennen. Fehlt etwas (Schlüssel,
Modul, Mikrofon, Netz), muss die Seite **weiterlaufen** — still degradieren, nie
ein toter Knopf, nie ein Absturz. Und was passiert, wird **benannt**: was kostet
Geld, was verlässt das Gerät, wo bleibt der Schlüssel.

**4 · Ehrlich schließen.** Headless-Messungen beweisen Logik und Zahlen. Ob es
sich am Tablet richtig **anfühlt**, sagt nur Klaus. Eine Sitzung schließt mit
„Browser-Sichttest ungeprüft, wartet auf Klaus' Lauf" — sie markiert sich nie
selbst grün.

## Ablauf für einen Bau

1. **Gewerk bestimmen** und die passende Regel-Datei lesen.
2. **Ausgangswert messen** (`--beides`), Zahl notieren.
3. **Bauen.**
4. **Gegenmessen**, mindestens drei Runden **im Wechsel** alt/neu — die Zahl
   schwankt auf der Bau-Maschine um mehrere Punkte, eine Einzelmessung beweist
   nichts.
5. **Ergebnis ehrlich melden**, auch was nicht besser wurde.
6. **Neue Erkenntnis hier eintragen** — mit Datum, Zahl und Fundstelle. Diese
   Sammlung wächst aus der Arbeit, sonst veraltet sie.

## Wenn eine Regel im Weg steht

Nicht stumm umgehen und nicht stur befolgen. Eine Regel gilt, bis eine **neue
Messung** sie widerlegt. Wer eine widerlegt: Zahl zeigen, Regel hier ändern,
Datum dazu, Klaus die Änderung nennen. Stille Ausnahmen vergiften die Sammlung
für die nächste Sitzung.
