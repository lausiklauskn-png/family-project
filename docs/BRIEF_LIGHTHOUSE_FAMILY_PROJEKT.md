# Sitzungsbrief — Lighthouse-Durchgang: family-projekt.de selbst

**Stand: 2026-08-02, abends.** Frischer Start in neuem Kontextfenster.
Dieser Brief ist selbsterklärend — er setzt kein Wissen aus der Vorsitzung voraus.

Bisher wurden die **Apps** verbessert. Jetzt ist die **Seite selbst** dran, auf der
sie alle stehen. Klaus schickt dir den Google-Lighthouse-Bericht zu
`https://family-projekt.de/` in den Chat. **Fang nicht ohne ihn an zu raten.**

---

## 0. Pflichtlektüre, bevor eine Zeile Code entsteht

1. **`docs/BRIEF_LIGHTHOUSE_VERBESSERUNGEN.md`** — die Arbeitsordnung für den
   ganzen Durchgang. Besonders **§ 5.1** (Bildmaße nur mit `height:auto`) und
   **§ 3** (was gar nicht reparierbar ist).
2. **Diesen Brief.**
3. **`CLAUDE.md`** dieses Repos. Die Hausregeln schlagen jeden Punktgewinn.
4. **`docs/DEPLOY.md`** — hier ist es **anders als bei allen anderen Repos**,
   siehe § 2. Wer das überliest, baut am falschen Ort.

---

## 1. Arbeitsweise (Klaus' Vorgabe, gilt unverändert)

- **Ursache statt Symptom.** Eine Zahl schöner machen, ohne zu verstehen, warum
  sie niedrig war, ist keine Verbesserung.
- **Ändern, dann messen.** Kein „das müsste helfen".
- **Immer eine Gegenprobe.** Eine Prüfung, die nie rot war, beweist nichts.
  Konkret: die neue Prüfung absichtlich brechen und sehen, ob sie anschlägt.
- **Ehrlich auflisten, was NICHT gemacht wurde — und warum.**
- **Nie behaupten, die Punktzahl steige.** Das zeigt erst die nächste Messung.
- **Selbst mergen** nach dem netzweiten Freibrief (getestet, abgegrenzt, nicht
  architektonisch zweifelhaft → Draft-PR, ready, squash-merge).
- **Am Ende einen neuen Brief schreiben** und als Codeblock im Chat ausgeben.

---

## 2. ⚠ DIESE SEITE LÄUFT NICHT AUF GITHUB PAGES

Das ist der wichtigste Unterschied zu allem, was heute gemacht wurde.

- **Eigener Hetzner-Server** (CX23, Falkenstein), **Caddy im Docker**, Verzeichnis
  `/srv/family-project` ist ein `git clone`. Deploy: ein Cron zieht alle zwei
  Minuten `git reset --hard origin/main`. Ein Merge auf `main` geht also von
  allein live — aber **du hast keinen Server-Zugang**.
- Alles, was eine **Server-Einstellung** braucht (Cache-Header, Kompression,
  CSP, HSTS), kann eine Sitzung **nicht selbst** ändern. Solche Punkte werden
  **benannt** und Klaus als **fertiger Ein-Zeilen-Befehl** vorgelegt — nicht
  still übergangen und nicht im Repo „gelöst", wo es nicht wirkt.
- **Merke aus diesem Repo** (steht in `sw.js`): *eine Vorlage im Repo ist kein
  Beweis für den Server.* Es gab schon einmal eine Erklärung, die sich auf
  `Caddyfile.example` berief — am Server nachgemessen stimmte sie nicht.

---

## 3. ⚠ Eine Lehre von heute gilt hier NICHT — nachprüfen statt übertragen

Heute wurde in **Kimboard** und der **Pinnwand** dies festgestellt:

> Der Service-Worker holte beim Erstbesuch Dateien doppelt. Gegen einen Server
> **mit** Cache-Kopfzeilen (`max-age` + ETag, so liefert GitHub Pages aus) war
> der Schaden aber **null** — der Browser legt gleichzeitige Anfragen für
> dieselbe Adresse von selbst zusammen.

**Hier ist das vermutlich anders**, und das steht schon im Code: `sw.js` benutzt
bewusst `cache:"reload"`, weil **Caddy für CSS/JS gar keinen Cache-Header setzt**
(am 2026-08-01 am Server nachgemessen). Ohne Cache-Header kann der Browser nichts
zusammenlegen — der Doppel-Download wäre hier also **echt**.

**Auftrag:** nicht raten. Erst messen, was der Server wirklich sendet
(`curl -sI https://family-projekt.de/assets/style.css?v=84` — steht da ein
`cache-control`?), und **dann** entscheiden. Wenn keiner gesetzt ist, ist der
richtige Ort für die Reparatur die **Caddy-Konfiguration** (Klaus-Schritt), nicht
ein Umbau des Service-Workers.

---

## 4. Konkrete Verdächtige — vorab gefunden, noch NICHT gemessen

Die folgende Liste stammt aus einer Bestandsaufnahme am 2026-08-02 abends. Sie
sagt, wo man zuerst hinsehen sollte — **keine dieser Zahlen ist ein Befund aus
dem Lighthouse-Bericht.** Erst Klaus' Bericht abwarten, dann abgleichen.

### 4.1 `vendor/three.module.min.js` — 656 KiB, fest eingebunden
`assets/mycel-bg.js` beginnt mit `import * as THREE from 'three'`, und
`index.html` lädt das Modul mit `<script type="module" src="assets/mycel-bg.js">`.
Damit hängt eine **656-KiB-Bibliothek in der kritischen Kette** des Seitenaufbaus
— für einen Hintergrund-Effekt, der zum ersten Eindruck nichts beiträgt.

**Genau dieses Muster wurde am 2026-08-02 in `Mein-Rezeptbuch-Page` behoben**
(dort waren es 165 KiB und der längste Pfad überhaupt, 645 ms). Das Rezept steht
in `Mein-Rezeptbuch-Page/assets/mycel-bg.js`: statischer Import raus, Funktion
`mycelBgStarten(THREE)` daraus machen, und am Dateiende ein kleiner Anstoß, der
nach `load` + `requestIdleCallback` ein `import('three')` nachlädt. Fail-soft:
schlägt das Laden fehl, bleibt die Seite voll benutzbar, nur ohne Hintergrund.

**Vorsicht bei der Übertragung:** hier ist three.js über eine **`importmap`**
verdrahtet (`index.html` Zeile ~57). Ein dynamisches `import('three')` löst die
importmap normalerweise mit auf — **aber das gehört gemessen, nicht geglaubt.**

### 4.2 `og-image.png` — 380 KiB, liegt im Vorrat
Steht in `CORE` in `sw.js` und wird damit bei jedem Erstbesuch geholt. **Die
Seite zeigt es nie** — es ist das Vorschaubild für geteilte Links, das holen sich
Facebook/WhatsApp/Google von selbst, wenn jemand den Link teilt. Im Vorrat kostet
es 380 KiB umsonst. Prüfen, ob es dort hingehört (Vermutung: nein).

### 4.3 `"./"` und `"index.html"` stehen beide in `CORE`
Dieselbe Datei unter zwei Adressen — für den Cache sind das zwei Einträge, also
zwei Downloads (36 KiB). Gleicher Befund wie heute in Kimboard und der Pinnwand.
Der Offline-Rückfall muss dann beide Schreibweisen suchen (siehe
`Kimboard/sw.js`, navigate-Zweig).

### 4.4 `markt.html` ist 100 KiB
Die größte HTML-Datei der Seite. Nicht automatisch ein Problem — aber wenn der
Bericht „unbenutztes JavaScript" oder eine lange Hauptthread-Aufgabe nennt, ist
hier der erste Blick. Achtung: `markt.html` rechnet beim Besuch Vektoren für die
Marktplatz-Suche. Dazu gibt es eine **eigene Tafel-Entscheidung vom 2026-07-31**
(`docs/components/_toolpoint_marktplatz.md` in Sage-Protokol, PULS-Eintrag):
unter ~20 Einträgen bleibt es lazy, darüber kommen vorberechnete Vektoren. **Das
ist eine offene Bauaufgabe, kein Lighthouse-Fix** — nicht nebenbei anfassen.

---

## 5. Fallen, an denen frühere Sitzungen gestolpert sind

1. **`CACHE_VERSION` und `ASSET_V` müssen zusammen hochgezählt werden.** Die
   Seiten fordern `assets/style.css?v=84` an; steht in `sw.js` eine andere Zahl,
   liegt die falsche Datei im Vorrat. `tests/smoke_cache_version.mjs` prüft das —
   **laufen lassen.**
2. **Bildmaße nur mit `height:auto`.** `width`/`height` am `<img>` ohne
   `height:auto` in der CSS hat in `Mein-Mixarium-Page` die Bilder am Handy
   dreifach hochgezogen. Steht als § 5.1 in der Arbeitsordnung.
3. **Typografische Anführungszeichen in JavaScript-Zeichenketten.** `„…"`
   innerhalb eines `"…"`-Strings beendet den String — die Seite ist dann tot.
   Ist heute zweimal passiert. In Code-Strings `»…«` verwenden.
4. **Farbreduktion an Bildern ohne Dithering.** Klaus hat die Streifen gesehen.
   Palette-Quantisierung nur mit Floyd–Steinberg, sonst gar nicht.
5. **Prüf-Server ohne Cache-Kopfzeilen misst nicht die Seite, sondern den
   Prüf-Server.** `python3 -m http.server` sendet keine — eine damit gemessene
   „Ersparnis" kann komplett ein Artefakt sein. Ein tauglicher Mess-Server steht
   als Muster im Kopf von `Kimboard/sw.js` beschrieben.
6. **Skripte laufen im falschen Verzeichnis.** Die Bash-Arbeitsumgebung springt
   zurück; ein `python3 - <<PY` ohne absoluten Pfad hat heute die falsche Datei
   verändert. **Absolute Pfade benutzen.**

---

## 6. Was NICHT allein entschieden wird — das liegt bei Klaus

- **Jede Server-Einstellung** (Cache-Header, Kompression, Sicherheits-Kopfzeilen).
  Benennen, Ein-Zeilen-Befehl vorlegen, nicht selbst „lösen".
- **Der 3D-Hintergrund als solcher.** Ihn *nachladen* ist eine reine
  Technik-Verbesserung und in Ordnung. Ihn *entfernen*, *ausdünnen* oder beim
  Wegscrollen *anhalten* ändert das Aussehen der Seite — das entscheidet Klaus.
- **`relay.family-projekt.de` löst nicht auf.** Alter, bekannter Befund, liegt
  weiter bei Klaus. Nicht nebenbei „reparieren".

---

## 7. Womit die Sitzung schließt

1. **Gemessenes Vorher/Nachher** am selben Mess-Server, per `git stash`
   umgeschaltet — nicht zwei verschiedene Läufe vergleichen.
2. **Gegenprobe** zu jeder neuen Prüfung: absichtlich brechen, sehen dass sie rot
   wird, zurücksetzen.
3. **Ehrliche Liste, was nicht gemacht wurde** und warum.
4. **PULS.md** fortschreiben.
5. **Neuen Brief** für die Folge-Sitzung schreiben und **als Codeblock im Chat**
   ausgeben.
6. Klaus misst danach selbst bei PageSpeed nach. **Erst diese Zahl zählt.**

---

## 8. Tagesstand zum Einordnen (2026-08-02)

| App | Leistung | Rest |
|---|---|---|
| Pinnwand (Sage-Protokol) | 100 | 100 / 96 / 100 |
| Kimboard | 92 | 100 / 96 / 100 |
| Mixarium (App) | 76 | 92 / 96 / 100 |
| Rezeptbuch (App) | 73 | 96 / 96 / 100 |
| Mixarium-Landingpage | 94 | 87 / 100 / 100 |
| Rezeptbuch-Landingpage | 81 | 94 / 100 / 100 |
| **family-projekt.de** | **?** | **Klaus schickt den Bericht** |

Wiederkehrend bei „Gute Praxis" 96: **Fehler in der Browser-Konsole** durch
nicht erreichbare Relais. Die Meldung „WebSocket connection failed" kommt vom
**Browser selbst** und ist aus dem Code **nicht** zu unterdrücken. Das kostet
vier Punkte und ist keine Nachlässigkeit — so benennen, nicht verstecken.
