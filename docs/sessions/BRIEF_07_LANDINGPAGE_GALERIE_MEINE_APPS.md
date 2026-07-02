# Sitzungsbrief 07 — Landingpage-Galerie „Meine Apps" + Kim-Benennung

**Datum:** 2026-07-02 · **Branch (Ausgangs-Sitzung):** `claude/pinnwand-spelling-fix-2ikwzy`
**Zweck:** Klaus' Plan dauerhaft verankern, damit jede Folge-Sitzung weiß, was wir vorhaben.
Dieser Brief steht bewusst im Lesepfad (PULS verweist darauf).

---

## Pflichtlektüre zu Beginn (Brief-Kette)

1. `README.md` + `docs/PULS.md` (Stand/nächste Schritte, neueste oben)
2. **Dieser Brief** (der jüngste Plan)
3. `docs/sessions/BRIEF_LAUSCHEN_ROLLOUT` bzw. `SESSION_BRIEF_LAUSCHEN_ROLLOUT.md`
   (der *ursprünglich* geplante Bau — siehe § „Wieder anknüpfen")
4. Für die Namens-Entscheidung: Sage-Protokol `docs/NAMENSGEBUNG_KIM_FAMILIE.md` (PR #527)

---

## 1. Die Namens-Entscheidung (Kim-Produktfamilie) — festgelegt 2026-07-02

Dachmarke **Kim** (aus **KI-Matching** / SBKIM). Regel: `Kim` + ein kurzes, hart
endendes Wort (aussprechbar, schnell).

| Werkzeug | Marken-/Produktname | Deutsches App-Label |
|---|---|---|
| Pinnwand / Brett | **Kimboard** | „Pinnwand" (zwei n) darf im DE-UI bleiben |
| Suche / Suchtool (Modul 22 / such-tool) | **Kimseek** | „Suche" |
| „Sich finden & verständigen"-Tool | **Kimsync** | (offen) |
| Alles zusammengeführt (später) | **Kim** oder **Kimhub** | — |

- **Schreibweise:** DE „**Pinnwand**" = zwei n (Duden, von *anpinnen*). Marke „**Kimboard/Kimseek**" = ein n.
  Beschreibungswort nach Sprache: DE „**Suche**", EN „**Search**" (nicht mischen, kein „Suchtool").
- **Zwei-Ebenen-Prinzip:** Protokoll bleibt **Mycel/Spore** (Wurzel), die verkaufbaren Apps tragen
  die **Kim**-Marke (Fruchtkörper-Schicht — Vier-Schichten-Lesart).
- **Volle Tafel:** Sage-Protokol `docs/NAMENSGEBUNG_KIM_FAMILIE.md` (PR #527, Draft).
- **Offen (Klaus):** (a) „Kimboard" bestätigen (Diktat sagte „Kimburg"). (b) Web-Freiheits-Check
  für Kimseek/Kimsync/Kimhub. (c) leeres Repo `lausiklauskn-png/Pinwand` → `Kimboard` umbenennen
  (GitHub → Settings → Rename; Sitzung hat keinen Rename-Zugriff).

## 2. Der Landingpage-Galerie-Plan (Kern dieses Briefs)

**Ziel:** den heute noch leeren Marktplatz / die Liste verbundener PWAs **selbst füllen** —
mit Klaus' **eigenen, echten Apps**, damit der Raum nicht leer wirkt (Kaltstart-Lösung) und
zugleich ein **verkaufbarer Design-Katalog** entsteht.

**Verfassungstreue (WICHTIG, nicht verhandelbar):**
- Klaus' Apps werden **als seine eigenen** präsentiert — ehrlich als **„Beispiel / Vorlage"**
  benannt, **NIEMALS** als erfundene fremde Anwender/Astroturfing. Das folgt Klaus' eigener
  SBKIM-Regel *„Synthetische Reviews werden NICHT als echte Bewertungen verkleidet — Quelle
  ist immer transparent"* + der Anti-Greenwashing-Klausel (Siegel/Modul 16).
- Die Design-Vielfalt ist ein **ehrliches Verkaufsargument** („Gefällt dir dieses Design?
  Du kannst es haben."), keine Attrappe.

**Architektur — zwei Ebenen (löst Konsistenz vs. Vielfalt):**
1. **Einheitliche Hub-Liste** in family-project (`assets/config/listings.js` als Markt/Such-Korpus,
   `meineapps.js`/`werkzeuge.js`/`publicapps.js`): gleiche Kachel-Optik für alle → „die Family"
   wirkt wie *ein* Ding, vergleichbar.
2. **Individuell gestaltete Landingpage pro App dahinter** = die Design-Galerie. Jede Kachel
   verlinkt auf ihre eigene Landing.

**Bau-Prinzipien:**
- **Datengetrieben** auf dem schon abgenommenen Renderer `assets/tool-landing.js` aufsetzen
  (Held + 2 Knöpfe + Screenshot-Galerie + Vorteile + „Was es kostet" 0 €/Spende + Vertrauen +
  Zurück). Pro Seite ein `window.FP_TOOL`-Objekt. **Farbe pro App = ein `accent`/`theme`-Feld**,
  keine handgebaute Seite je App.
- **Jede Landing als kopierbare Einzeldatei-Vorlage** (Assets leicht/inline, Medien beim
  Anbieter, lazy; Videos als Poster + Klick-zum-Abspielen, **nicht** als data-URI einbetten).
  Doppelnutzen: Vorstellung + verkaufbares Template (Prinzip „kopieren, nicht klonen", wie das
  Standalone-Such-Tool).
- **Doppel-Eintrag:** jede App kommt in die Landing-Liste **und** in den Such-Korpus
  (`listings.js`) → über Kimseek auffindbar, nicht nur sichtbar.
- **Aufwand ehrlich:** mit **2–3 Design-Archetypen** starten (z. B. *minimal-ruhig*,
  *bild-stark/visuell*, *Magazin/redaktionell*), Apps zuordnen; Galerie **organisch** wachsen
  lassen — NICHT 12–14 Designs gleichzeitig stemmen.
- **Bestand:** `meineapps.js` listet bereits alle ~11 Apps (Rezeptbuch, Mixarium, BookLedgerPro,
  Mein Tresor, Jasons Tresor, WorkFloh, Such-Werkzeug/Kimseek, Pinnwand/Kimboard, SB-KIMTool,
  Sage, Einladung). Drei Tool-Landings existieren schon: `werkzeuge/such-werkzeug.html`,
  `andock-werkzeug.html`, `knoten-werkzeug.html`.

## 3. ERSTER konkreter Bau-Schritt (Klaus' Wunsch)

Die bereits **gute vorhandene Landingpage** (Klaus nennt sie „IST-Seite / IST-Landingpage",
„die erste, die ist schon ganz gut") als **Basis** nehmen, alles „IST"-/Platzhalter-Spezifische
herausnehmen und **auf Mein Rezeptbuch umbranden** (Klaus' allererste fertige App).

- **⚠️ Zu Sitzungsbeginn mit Klaus bestätigen: WELCHE Datei ist die „IST-Seite"?**
  Kandidat: das `tool-landing.js`-Muster bzw. `werkzeuge/such-werkzeug.html`. Nicht raten —
  Klaus fragen, dann Basis fixieren.
- **🔒 GATE (Klaus ausdrücklich):** Der Rebrand auf Mein Rezeptbuch startet **erst, wenn ein
  sehr gutes Icon** für Mein Rezeptbuch vorliegt. Das Icon kommt **später/im Nachhinein** —
  Klaus gibt das Signal. Bis dahin NICHT starten.
- Ziel-Design: Archetyp #1 der Galerie. Farbe passend zu Mein Rezeptbuch.

## 4. Wieder anknüpfen — der ursprünglich geplante Bau (davon sind wir abgewichen)

Klaus' Hinweis: „Wir sind sehr abgewichen vom Thema, was wir eigentlich vorhatten." Der
eigentliche Fahrplan, nach der Landing-Sache **wieder aufnehmen**:
- **Lauschen-Rollout Stufe 2 (Nostr-Relais)** in die restlichen Knoten (Reihenfolge in
  `SESSION_BRIEF_LAUSCHEN_ROLLOUT.md`: SB-KIMTool-Point → Mein-Tresor → …) + **Hetzner-Deploy**
  von family-projekt.de.
- ⚠️ **Branch-Basis kritisch:** Konsumenten-App-Session-Branches hinken `main` hinterher —
  pro Repo ZUERST `git fetch origin main && git merge origin/main`, DANN bauen. Immer gegen `main`.
- Sage-Protokol parallel: semantic-matching-quality Strang A/B (siehe Sage PULS „Als nächstes"
  + Pipeline-Reihenfolge).

## 5. Offene Fäden (Rückfragen an Klaus)

1. „Kimboard" (nicht „Kimburg") bestätigen → dann Namens-PR #527 ready + merge.
2. Web-Freiheits-Check Kimseek / Kimsync / Kimhub gewünscht?
3. Repo `Pinwand` → `Kimboard` umbenennen (Klaus, GitHub-Settings).
4. Welche Datei ist die „IST-Seite" als Landing-Basis?
5. Icon für Mein Rezeptbuch — Signal, wenn es „sehr gut" da ist (Gate für Schritt 3).

## Abschluss-Befehl für die nächste Sitzung (Brief-Kette fortführen)

Am Sitzungsende: `docs/PULS.md` fortschreiben (getan/offen/nächster Schritt), diesen Plan
aktualisieren wo nötig, neuen Brief `docs/sessions/BRIEF_08_*.md` anlegen, Pflichtlektüre +
diesen Abschluss-Befehl wiederholen. Draft-PR pro abgegrenzter Aufgabe. Klaus' Browser-Sichttest
bleibt unersetzbar.
