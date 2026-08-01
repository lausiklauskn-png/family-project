# Brief für die nächste Sitzung — family-project (Stand 2026-08-01, nachts)

Klaus, das ist der vollständige Übergabestand. Alles Offene steht drin, mit dem
Grund dahinter.

---

## 0. Zuerst lesen, bevor irgendetwas angefasst wird

1. `CLAUDE.md` in `Sage-Protokol` — § Sitzungsstart-Pflicht (immer frisch von `origin/main`)
2. Diesen Brief
3. `tools/waechter.mjs` — der Kopf erklärt Stufe 3 in einer Bildschirmseite
4. `tests/smoke_knoepfe.mjs` — der Kopf erklärt Befund 5.1 und die drei
   Gegenproben, darunter die, die nur schien zu greifen
5. `tests/smoke_stufe3_waechter.mjs` — der Kopf nennt die sieben Gegenproben

**Vor jeder Arbeit an einem Repo:**

```bash
git -C <repo> fetch origin --quiet
git -C <repo> checkout -B <branch> origin/main
```

Nach einem Squash-Merge zeigt `git log origin/main..branch` noch Commits, obwohl
der Inhalt in `main` ist. Immer zusätzlich `git diff origin/main origin/<branch>
--stat` prüfen. Ist der leer, ist ein `push --force-with-lease` gefahrlos — das
kam in dieser Sitzung real vor.

**Vor dem ersten Test:** `npm install playwright-core --no-save`. Es gibt keine
`package.json`; ohne diesen Schritt bricht jeder Browser-Test mit
`ERR_MODULE_NOT_FOUND` ab. Das sieht aus wie ein kaputter Test, ist aber keiner.

**Nur EINE Browser-Testreihe gleichzeitig** — sonst misst man Rauschen.

**Von dieser Maschine NICHT erreichbar:** `cdn.jsdelivr.net`, `huggingface.co`,
`*.github.io` (Proxy 403). Erreichbar ist `raw.githubusercontent.com`.
**Workflows von Hand starten geht aus einer Sitzung heraus nicht** (403, in
dieser Sitzung erneut gemessen). Das bleibt Klaus' Schritt.

---

## 1. Was in dieser Sitzung fertig wurde

| Was | Wo |
|---|---|
| Wächter-Bericht nachgesehen — Antwort: es gibt noch keinen | (Befund, siehe unten) |
| **Befund 5.1** — vier Bedien-Elemente waren per Tastatur unerreichbar | PR #157 |
| **Loch im Cache-Wächter** — `?v=` brach den Vergleich | PR #157 |
| **Lighthouse-Modul-Runde** — Modul 17 + 23 UI an der Quelle geheilt | Sage PR #777 |
| **Netzweiter Rollout** in 14 Repos, 20/20 verifiziert | 14 PRs, alle gemergt |

Cache-Version steht auf **v78**. `smoke_knoepfe` **59/59**, `smoke_all` 107/107,
`smoke_fokus` 15/15, `smoke_cache_version` 10/10, `smoke_stufe3_waechter` 64/64,
`smoke_stufe2_sporen` 38/38, `smoke_markt_melden` 32/32, `smoke_studio_markt` 62/62.

### Der Wächter-Bericht: es gibt noch keinen

`assets/config/spore-stand.json` steht auf `geprueft: null`. Kein Rot, kein Gelb
— es gibt schlicht nichts. Über die API nachgezählt: die Aktion hat **null
Läufe** (`total_count: 0`). Der Merge war um 10:32 UTC, der Zeitplan steht auf
02:40 UTC. **Die erste Nacht liegt noch vor uns.**

### Befund 5.1 war größer als notiert

Der Brief sagte, die Symbol-Knöpfe trügen ihren Zweck nur in einem `title`, der
auf Touch nie erscheint. Das stimmt — aber daneben lag etwas Schwereres.

**Sprache (DE/EN), Thema (◐), die SIEGEL-Lampe und der ⊕-Status-Chip waren
`<span>`-Elemente mit einem Klick-Handler.** Ein `<span>` bekommt keinen
Tabulator-Halt. Wer die Seite mit der Tastatur bedient, kam an diese vier
Funktionen **gar nicht heran** — nicht schwer erreichbar, sondern unerreichbar.
Auf allen sechs Seiten.

Das Muster dagegen stand längst im Repo: `.pill-reload` macht es seit dem
Hard-Reload-Knopf richtig (`role` + `tabindex` + `aria-label` + `keydown`). Es
wird jetzt geteilt genutzt, ohne die Optik der Navleiste anzurühren.

Neuer Wächter `tests/smoke_knoepfe.mjs`, **59 Proben**, drei Teile — weil es
drei Arten gibt, das falsch zu machen:

- **A Erreichbarkeit** — hat das Element einen Tabulator-Halt?
- **B Name** — nennt ein `aria-label`, WAS der Druck tut? Sichtbarer Text zählt
  hier bewusst nicht: „DE / EN" ist ein Zustand, keine Handlung.
- **C Wirkung** — tut die Enter-Taste wirklich etwas? Das ist die eigentliche
  Falle: `role` und `tabindex` ohne Tasten-Handler bestehen A und B und bedienen
  nichts.

### Nebenbefund: der Cache-Wächter übersah `app.js` und `style.css`

Nach der Änderung an `assets/app.js` meldete `smoke_cache_version` brav „keine
CORE-Datei geändert — nichts zu prüfen". Falsch. In der CORE-Liste des
Service-Workers steht `"assets/app.js?v=77"`, git meldet `assets/app.js` — **der
Versions-Anhang brach den Vergleich.**

Folge: die beiden meistgeänderten Dateien des Projekts waren seit Einführung des
Wächters von seiner Prüfung ausgenommen. Er stand grün daneben. Derselbe
Fehlertyp wie bei den Playwright-Umleitungen, die an einem angehängten `?ts=`
zerbrechen.

Zweiter Fund an derselben Stelle: `assets/status-widget.js` stand weder in CORE
noch trug es ein `?v=` — es hing frei am HTTP-Cache, den niemand bustet.

**Noch offen, bewusst nicht angefasst:** `assets/mycel-bg.js` (10 Verweise)
hängt ebenso ohne `?v=` und ohne CORE-Eintrag frei am HTTP-Cache.

---

## 2. Die Lighthouse-Modul-Runde — was lief, und was bewusst offen blieb

Klaus' Übergabe-Brief, Teil 4. Zwei Befunde an den **geteilten** Modulen.

**Modul 17:** `--sbkim-widget-bg` stand auf `rgba(0, 0, 0, 0.45)`, dem Wert der
**dunklen** Sage-Page. In einer hellen PWA kippt die Rechnung. Selbst
nachgerechnet statt übernommen — und über heller Seite **schlimmer** als im
Brief notiert:

| | Untergrund | helle Schrift | abgeblendete |
|---|---|---|---|
| vorher | helle Seite | **3,09:1** | **1,97:1** |
| nachher | helle Seite | 11,57:1 | 7,27:1 |
| nachher | dunkle Seite | 17,33:1 | 9,96:1 |

**Modul 23 UI:** der „Schlüssel holen"-Link wurde ohne Adresse erzeugt.

Beides in Sage geheilt (PR #777) mit neuem Wächter
`tests/smoke_lighthouse_module.mjs` (17 Proben, liest die Farben aus dem Modul
und rechnet damit). **Neuer Kanon `6017e263bb7f` (17) · `00a6920535d3` (23 UI).**

Ausgerollt in **14 Repos**, **20/20 Dateien auf `origin/main` verifiziert, 0
abweichend.** sha-Pins in fünf Repos mitgezogen; netzweite Gegenprobe: keine alte
sha blieb stehen.

### ⚠ Der wichtigste offene Punkt: vier Repos tragen eine Gabelung

`sbkim/17_floating_widget.js` ist in **Mein-Rezeptbuch, Muttis-Rezeptbuch,
Mein-Mixarium und BookLedgerPro** *nicht* überschrieben worden. Mit Absicht.

Sie tragen eine **repo-eigene Pflege, die der Sage-Kanon nicht hat:**

- **Rezeptbuch / Muttis / Mixarium** — dein Pro-App-Namensraum-Fix vom
  2026-06-28: die localStorage-Schlüssel tragen den App-Pfad, damit
  Geschwister-Apps auf derselben `github.io`-Adresse sich nicht denselben
  Widget-Zustand teilen. *Vorher führte ein Schließen in einer App zum
  Verschwinden in allen.*
- **BookLedgerPro** — der Proxy-ID-Guard: keine Kollision mit dem statischen
  `#sbkim-siegel-badge` dieses Endknotens.

Gleichzeitig **fehlt** allen vieren der Stufen-Render von 2026-05-26 aus dem
Kanon. Sie sind also weder Vorgänger noch Nachfolger, sondern eine **Gabelung**.
Byte-1:1-Überschreiben hätte deine Fixes zurückgedreht — genau das, wovor der
Rollout-Skill warnt.

**Der saubere Weg** (nächster Schritt, siehe Abschnitt 5): die beiden
Eigenpflegen **in den Sage-Kanon holen**. Dann sind alle wieder byte-1:1, und
der Lesbarkeits-Fix kommt automatisch mit. Das ist ein eigener Schritt mit
eigenen Gegenproben, kein Nebenher im Rollout.

Bis dahin: **in diesen vier Apps ist die Widget-Beschriftung über einer hellen
Seite weiterhin schwer lesbar.** Das ist der ehrliche Stand.

---

## 3. Was du noch tun musst

**a) Die Aktion einmal von Hand starten.** Actions → „Sporen lesen und Vektoren
fortschreiben (täglich)" → *Run workflow*. Danach steht schwarz auf weiß, welche
der neun Sporen antworten und ob der Lauf mit dem echten Modell durchgeht.
**Eine Sitzung kann das nicht für dich tun** (403, zweimal gemessen).

**b) Zwei Dateien per WebFTP hochladen** — unverändert offen:
`server/einreichung.php` und `server/marktplatz-api.php`. **Kontrolle:** in
beiden neuen Fassungen kommt das Wort **`sporeUrl`** vor, in den alten kein
einziges Mal. Nicht auf die Dateigröße schauen.

Ohne den Upload bleibt alles heil — es fehlt nur der freiwillige Spore-Link aus
dem Einreich-Formular im Studio.

**c) Danach Safe Browsing scharf schalten**, wenn du magst. Erst **nach** dem
ersten Wächter-Lauf: wenn Aktion und Google-Abfrage gleichzeitig neu sind und
etwas rot wird, weiß niemand, welcher Teil schuld war. Weg: Google-Projekt →
Safe Browsing API aktivieren → API-Schlüssel → Repo Settings → Secrets and
variables → Actions → *New repository secret*, Name genau **`SAFE_BROWSING_KEY`**.
Der Workflow reicht ihn bereits durch; es braucht keinen weiteren Bau.

---

## 4. Die offene Frage aus dieser Sitzung

Du hast auf die Symbol-Frage „keine Präferenz" geantwortet — die zweite Hälfte
von Befund 5.1 ist damit **weiterhin offen**, und ich habe sie bewusst nicht
selbst entschieden, weil sie jede Formularzeile der Seite berührt.

Die Lage: 🎤 und 📷 sitzen als 38-Pixel-Knopf **im** Eingabefeld. Sichtbarer
Text passt dort nicht hinein wie beim Melde-Knopf. Der Zugänglichkeits-Teil ist
gerichtet (Vorlesehilfen kennen den Zweck über `aria-label`) — offen ist nur, ob
ein **sehender** Nutzer am Tablet die Symbole versteht.

Drei Wege, wenn du magst:

1. **Eine Zeile unter dem Formular** — „🎤 sprechen statt tippen · 📷 Text aus
   einem Foto". Kostet keine Mechanik, erklärt beide Symbole auf einmal, ändert
   an den Feldern nichts. *Das wäre mein Vorschlag.*
2. **Sprechblase beim Antippen** — näher am gewohnten Tooltip, aber sie
   verzögert den Knopf, und wer schnell tippt, sieht sie nie.
3. **Nichts ändern** — die Symbole sind verbreitet genug.

---

## 5. Vorschlag für die Reihenfolge

1. **Die Aktion von Hand starten** (3a) — alles Weitere baut darauf auf.
2. **Den ersten Bericht ansehen** — im Studio, Block „Sporen der Anbieter". Jede
   Zeile trägt eine Ampel.
3. **Die Gabelung bei Modul 17 auflösen** (Abschnitt 2) — deine zwei Fixes in
   den Sage-Kanon holen, dann die vier Apps wieder byte-1:1 versorgen. Solange
   das aussteht, tragen ausgerechnet die vier meistgenutzten Apps den
   Lesbarkeits-Befund weiter.
4. **Safe Browsing scharf schalten** (3c) — erst nach Schritt 1.
5. **Die zwei PHP-Dateien hochladen** (3b) — unabhängig von allem anderen.
6. **Stufe 5** (Lighthouse + Ja/Nein-Stimmen) — die Frage nach dem Lighthouse-Weg
   (eigener Lauf in der Action ↔ PageSpeed-API mit Schlüssel) ist noch offen.
   Der Wächter hat die Form vorgegeben: dieselbe Aktion, derselbe Bericht, ein
   Steckplatz der ohne Schlüssel ehrlich „nicht geprüft" meldet.
7. **`assets/mycel-bg.js`** in den Cache-Bust-Pfad holen (Abschnitt 1) — klein.
8. **Stufe 0** (Relais-Messung, du im Browser), dann **Stufe 6**. **Stufen 7/8**
   zum Schluss.

---

## 6. Wie hier gearbeitet wird

- **Messen statt schätzen.** „Sieht fertig aus" ist kein Befund. In dieser
  Sitzung viermal: die Aktion war nie gelaufen, Befund 5.1 war größer als
  notiert, der Cache-Wächter übersah seine wichtigsten Dateien, und die
  Kontrast-Zahlen aus dem Brief waren über heller Seite zu günstig.
- **Zu jedem neuen Wächter eine Gegenprobe — und sie muss scharf sein.** Wenn
  eine Funktion **zwei** Fehler-Zweige hat, braucht sie **zwei** Gegenproben.
- **NEU aus dieser Sitzung: nachzählen, dass der eingebaute Fehler wirklich im
  Code landet.** Eine Gegenprobe blieb grün — nicht weil die Probe stumpf war,
  sondern weil die Änderung gar nicht gegriffen hatte (die gesuchte Zeile war
  anders eingerückt als angenommen). *Ein Fehler, der nicht ankommt, beweist
  nichts über den Test.*
- **Am richtigen Merkmal messen.** Eine Probe las `data-theme` ab, obwohl die
  App CSS-Variablen und einen sichtbaren Namen setzt — sie blieb rot, obwohl der
  Knopf längst tat, was er sollte.
- **Nicht das eigene Zutun messen.** `page.focus()` scrollt das Element selbst in
  den Blick; weiches Scrollen läuft nach. Beides verfälschte eine Scroll-Probe.
- **Cache ist hier die häufigste Ursache, nicht der Sonderfall.**
- **Wer eine CORE-Datei ändert, erhöht `CACHE_VERSION` und `ASSET_V`** und zieht
  alle `?v=`-Verweise mit. Steht auf **v78**.
- **Ein Beleg aus dem Repo ist kein Beleg über die Wirklichkeit.**
  Server → `curl -sI <url>` · Test → Fehler absichtlich einbauen · Upload → ein
  Wort suchen, das nur die neue Fassung enthält.
- **Kopieren, nicht klonen — aber Diff lesen vor Überschreiben.** Findet sich
  eine repo-eigene Zeile: nicht überschreiben, sondern an der Quelle
  zusammenführen. In dieser Sitzung hat das vier von Klaus' eigenen Fixes
  gerettet.
- **`raw.githubusercontent.com` liefert für PRIVATE Repos immer 404.**
- **Der `domainVector` aus einer Spore gehört NICHT sicher zum selben Text.**
- **Alles unter `server/` wird nie durch Merge oder Deploy aktualisiert.**
- **Erst mergen, dann prüft Klaus.** GitHub Pages deployt von `main`.
- **Selbst-Merge-Freibrief gilt** (Klaus 2026-06-28, netzweit).
- **Einzelschritte für Klaus.** Ein Schritt pro Antwort mit klarem Erfolgsmerkmal,
  keine Terminal-Befehle ohne Angabe, auf welche Maschine sie gehören.

### Die drei Maschinen nicht verwechseln

| Ort | Prompt | Paketbefehl | Was dort läuft |
|---|---|---|---|
| Tablet / Termux | `~ $` | `pkg` | `git`, lokaler `http.server`, **`ssh` zum Server**. Kein Server. |
| Hetzner Cloud (CX23) | `root@ubuntu-…:~#` | `apt` | Caddy im Docker, liefert `family-projekt.de` statisch. `167.233.204.72`, Caddyfile `/opt/relay/Caddyfile` |
| Hetzner Webhosting S | konsoleH | — | **PHP** und die echten Geheimnisse. Nur hier wirkt `.htaccess` |

Am sichersten ist `ssh root@167.233.204.72 '<befehl>'` — dann kann er gar nicht
auf dem Tablet landen.

---

## 7. Sitzungsende, jedes Mal

1. `docs/PULS.md` fortschreiben (Datum, was getan, was offen, was als Nächstes).
2. Bei Andock-Bezug `sbkim/SIGNAL.json` pflegen — das Pushen ist das Signal.
   *(Diese Sitzung: der Modul-Rollout berührt geteilte Module, aber keinen
   Briefkasten-Vertrag; `SIGNAL.json` blieb unangetastet, und das gehört gesagt.)*
3. Einen **„Nächste Schritte"-Block direkt in die Chat-Antwort** (2–4 Punkte).
4. Einen **neuen Brief wie diesen** schreiben und **vollständig als Codeblock im
   Chat** ausgeben.
