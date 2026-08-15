# Regeln für Skripte, Module und Service-Worker

> Lies das hier, bevor du ein Skript einbindest, die Ladereihenfolge änderst,
> einen Modul-Stapel einbaust oder einen Service-Worker anfasst.

## Regel 1 — Der Stapel gehört ans Ende und wird nach dem Laden geholt

Ein Stapel Module (SBKIM: 19–22 Dateien, ~260 KiB) blockiert den Parser an
**jeder einzelnen** Datei, obwohl keine davon gebraucht wird, um den Inhalt
anzuzeigen.

Gemessen an Mein-WorkFloh (2026-08-06): den Stapel **nach dem Laden** holen
brachte **85 → 95**, Ladezeit 3,9 → 2,3 s.

Muster, das sich bewährt hat — Reihenfolge bleibt exakt erhalten, jede Datei
wartet auf die vorige, dazwischen eine Leerlauf-Pause:

```js
(function () {
  "use strict";
  var KANON = [["", "./modules/a.js"], ["module", "./modules/b.js"], /* … */];
  function pause(f) {
    // kleiner timeout: requestIdleCallback ruft SPÄTESTENS danach auf, damit
    // eine dauerbeschäftigte Seite den Stapel nicht auf die lange Bank schiebt
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(f, { timeout: 500 });
    else setTimeout(f, 16);
  }
  function naechste(i) {
    if (i >= KANON.length) return;
    var s = document.createElement("script");
    if (KANON[i][0]) s.type = KANON[i][0];
    s.src = KANON[i][1];
    // onerror wie onload: eine fehlende Datei darf den Rest nicht anhalten
    s.onload = s.onerror = function () { pause(function () { naechste(i + 1); }); };
    document.body.appendChild(s);
  }
  if (document.readyState === "complete") pause(function () { naechste(0); });
  else window.addEventListener("load", function () { naechste(0); });
})();
```

**Pflicht dabei:** die Reihenfolge maschinell gegen den alten Stand vergleichen.
Ein von Hand abgetippter Stapel verdreht früher oder später zwei Zeilen, und dann
fehlt einem Modul seine Voraussetzung.

```bash
python3 -c "
import re,subprocess
alt=subprocess.run(['git','show','origin/main:index.html'],capture_output=True,text=True).stdout
neu=open('index.html').read()
a=re.findall(r'<script(?: type=\"module\")? src=\"(\./(?:modules|assets)/[^\"]+)\"></script>',alt)
n=re.findall(r'\[\"(?:module)?\",\"(\./[^\"]+)\"\]',neu)
print('identisch:', a==n)"
```

## Regel 2 — `defer` ist NICHT der Reflex

Der naheliegende Griff macht es manchmal **schlechter**. Gemessen am Tomys
Werkzeugkasten (2026-08-03), drei Fassungen, je drei Läufe:

| Fassung | Leistung | LCP | Blockierzeit |
|---|---|---|---|
| Stapel am Ende des Rumpfes | **98** | 1,69 s | 157 ms |
| mit `defer` | **90** | 1,74 s | **397 ms** |
| ganz ohne den Stapel | 100 | 1,59 s | 0 ms |

Steht der Stapel schon **hinter** dem sichtbaren Inhalt, ist wenig zu holen —
das Entfernen des **kompletten** Stapels brachte dort 0,1 s. Steht er
parser-blockierend **vor** dem Modul, das die Seite aufbaut, ist der Gewinn
riesig (BookLedgerPro: 11.270 ms).

**Gleicher Eingriff, völlig verschiedener Gegenwert. Darum: messen, wo er steht.**

## Regel 3 — Ein einzelnes Skript zu verschieben hilft meist nicht

Versuch an Mein-WorkFloh: nur das teuerste Einzelskript (`nostr-listen-init.js`,
320 ms) nach hinten geschoben → **78 statt 79**. Die Arbeit wanderte einfach nach
`rendezvous-init.js`.

**Teuer ist der Stapel, nicht ein Glied darin.** Wenn du ein Skript verschiebst
und die Zahl steht still, sieh nach, wohin die Zeit gewandert ist — sie ist nicht
verschwunden.

## Regel 4 — Der Service-Worker darf beim ERSTEN Besuch nicht neu laden

Häufiger, teurer Fehler. Dieses Muster steckt in mehreren Apps:

```js
// FALSCH — lädt auch beim allerersten Besuch neu
navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
```

Mit `skipWaiting()` + `clients.claim()` im Service-Worker übernimmt auch der
**frisch installierte** SW — `controllerchange` feuert, und die Seite lädt
komplett ein zweites Mal, obwohl es **keinen alten Code zu ersetzen gab**.
Lighthouse meldet das als „Mehrere Weiterleitungen"; gemessen **1,6 s**
(Mein-WorkFloh) bzw. **2,3 s** (Tomys WorkFloh).

```js
// RICHTIG — nur neu laden, wenn vorher schon ein SW da war
let _neugeladen = false;
const _hatteController = !!navigator.serviceWorker.controller;
navigator.serviceWorker.addEventListener('controllerchange', () => {
  if (!_hatteController) return;        // Erst-Installation: nichts zu holen
  if (_neugeladen) return; _neugeladen = true;
  location.reload();
});
```

Allein das brachte **79 → 85**.

**Wo sonst noch danach suchen:** jede App mit `skipWaiting` **und**
`clients.claim` **und** einem ungebremsten `controllerchange`-Reload.

**Nicht nach dem Fehlen des Reloads suchen, sondern nach dem Fehlen des
Wächters.** Am 2026-08-07 stand in der Liste nur Muttis Rezeptbuch — Tomys
WorkFloh war durchgerutscht, obwohl an genau dieser App die 2,3 s **gemessen
worden waren**. Der Grund: dort war die Doppel-Reload-Sperre (`_swReloaded`)
schon da und sah beim Überfliegen aus wie ein Wächter. Sie ist keiner. Sie
verhindert den *zweiten* Reload, nicht den *ersten*.

```bash
# Alle Fundstellen zeigen, mit vier Zeilen Umfeld — dann selbst hinsehen,
# ob ein controller-Wächter dabei ist, nicht nur eine Reload-Sperre.
grep -rn -A4 "controllerchange" --include="*.html" --include="*.js" /home/user | grep -v node_modules
```

Stand 2026-08-07 alle geprüft und versorgt: Mein-WorkFloh, Tomys WorkFloh,
Muttis Rezeptbuch, Mein-Rezeptbuch, Mein-Mixarium.

### Der Gewinn ist nicht überall eine bessere Note (2026-08-07)

An einer normal großen Seite gewinnt jede Kennzahl. Tomys WorkFloh, lokal,
Handy, im Wechsel gemessen:

| | Leistung | LCP | TBT | CLS |
|---|---|---|---|---|
| ohne Fix | 87 · 94 | 2,9 s | 320 · 100 ms | 0,041 |
| mit Fix | **97 · 97** | **2,6 s** | **60 · 30 ms** | **0,021** |

An **Muttis Rezeptbuch** (2 MB `index.html`, davon 1,2 MB eingebettete Bilder)
sieht dasselbe Muster anders aus, fünf Paare, beide Reihenfolgen:

| | Leistung | LCP | TBT |
|---|---|---|---|
| ohne Fix | 55 · 56 · 57 · 56 · 56 | 8,8–9,0 s | 60–140 ms |
| mit Fix | 54 · 50 · 47 · 52 · 53 | **6,5 s** | 320–570 ms |

**LCP 2,5 s besser, Gesamtnote rund vier Punkte schlechter.** Wahrscheinlichste
Lesart: Lighthouse misst am alten Stand die **zweite** Navigation, und die ist
vorgewärmt — Vorrat des Service-Workers, warmer Code-Cache für das riesige
Inline-Skript. Der schöne TBT war erkauft mit einem zweiten kompletten
Download und 2,5 s längerer Wartezeit.

**Die Lehre daraus ist nicht „dann lass den Fehler drin".** Sie ist: eine
Kennzahl kann sich verbessern, weil eine Verschwendung wegfällt, *und* die Note
kann trotzdem sinken, weil dieselbe Verschwendung eine zweite Kennzahl
geschönt hat. Wer nur auf die Note sieht, hält die Reparatur für einen
Rückschritt. Bei so einem Ergebnis: beide Kennzahlen nennen, die Deutung als
Deutung kennzeichnen, und die Entscheidung Klaus vorlegen.

## Regel 5 — Cache-Version hochzählen, wenn sich die Schale ändert

Ändert sich `index.html` oder eine Datei im Vorrat, muss der Cache-Name im
Service-Worker **+1** — sonst liefert der SW alten Code, und Klaus sieht am
Tablet nichts von deiner Arbeit. Beispiel: `workfloh-v117` → `v118`.

Prüfe zusätzlich, dass **alle** neu hinzugekommenen Dateien im Vorrat stehen,
sonst ist die App offline unvollständig:

```bash
python3 -c "
import re
sw=open('sw.js').read(); html=open('index.html').read()
pfade=re.findall(r'\"(\./(?:modules|assets)/[^\"]+)\"',html)
print('nicht im Vorrat:', [p for p in pfade if p[2:] not in sw] or 'keine')"
```

## Regel 6 — Nach dem Laden erscheinende Elemente brauchen vorher Platz

Hängt ein Modul später etwas in die Seite (Lampen-Leiste, Siegel-Abzeichen,
Banner), springt das Layout. Das ist kein Grund, es nicht zu tun — aber der Platz
muss **vorher** reserviert sein.

Bei Point hängt Modul 16 ein 34 × 34 großes Abzeichen in `.lamps`; die Leiste
wuchs von 9 px auf 34 px und schob die Seite. Behoben mit **einer Zeile** im
**app-eigenen** CSS:

```css
.lamps { min-height: 34px; align-items: center; }
```

CLS **0,103 → 0,052**. **Das Modul selbst bleibt unangetastet** — der Platz wird
außen vorgehalten, nicht innen etwas umgebaut.

## Regel 7 — Byte-1:1-Module nicht anfassen

Kopierte Kanon-Module (SBKIM aus Sage) werden **nicht** lokal repariert, auch
nicht um eine Zeile. Ein lokaler Fix erzeugt eine **dritte Modul-Generation**,
und der Drift-Guard schlägt zu Recht an.

Ist ein Fehler im Modul: **im Kanon** beheben und **netzweit neu ausrollen**
(dafür gibt es den Skill `netzweiter-modul-rollout`). Bis dahin wird der Mangel
**benannt**, nicht verschwiegen.

Was du **außen** tun darfst und sollst: Ladereihenfolge, Nachladen, Platz
reservieren, Fail-soft-Auffang — alles in app-eigenen Dateien.

## Regel 8 — Der Service-Worker-Vorrat gehört zur Ladephase

**Was der Service-Worker beim `install` vorab holt, konkurriert mit dem
Seitenaufbau um dieselbe Leitung.** Er ist unsichtbar — im Netzwerk-Protokoll
des Browsers tauchen seine Anfragen **nicht** auf — und wird deshalb regelmäßig
übersehen.

Belegt an Mein-WorkFloh (2026-08-07): der Vorrat umfasste **30 Dateien, 3,3 MB
roh / 855 KiB übertragen**. Allein die PDF-Bibliothek machte **400 KiB = 46 %**
davon aus:

| Datei | roh | übertragen |
|---|---|---|
| `pdf.worker.min.js` | 1107 KiB | 296 KiB |
| `pdf.min.js` | 368 KiB | 104 KiB |

**Das Bittere:** die App holte `pdf.js` bereits richtig — erst beim ersten PDF.
**Der Service-Worker machte das zunichte.** Server-seitig gemessen wurde sie
**51 ms nach dem Laden** geholt, mitten im Messfenster.

Die Folge ist ein sehr typisches Muster: **Computer 99, Handy 79.** Auf schneller
Leitung fällt es nicht auf, über Mobilfunk kostet es den ganzen Gewinn.

**Belegt durch PageSpeed vor und nach dem Fix** (2026-08-07):

| | Handy | Computer |
|---|---|---|
| vorher | 79 | 99 |
| nachher | **98** | **100** |

**+19 Punkte durch eine einzige verschobene Datei.** Der Bau davor (Modul-Stapel
nachladen, Regel 1) blieb wirkungslos, solange die PDF-Bibliothek die Leitung
belegte — **erst beides zusammen** ergibt die 98. Wenn eine gute Maßnahme nichts
bringt, ist sie nicht falsch; dann verdeckt sie etwas Größeres.

**Regeln:**

- Der `install`-Vorrat enthält **nur, was die App zum Starten braucht.** Alles
  Große und selten Gebrauchte (PDF-Bibliotheken, Schriften, Karten, Modelle)
  kommt in eine **zweite Liste**, die **nach** dem Laden gefüllt wird — die
  Seite meldet sich per `postMessage`, wenn sie fertig und ruhig ist:

  ```js
  // sw.js
  const ASSETS_SPAETER = ['assets/pdfjs/pdf.min.js', 'assets/pdfjs/pdf.worker.min.js'];
  self.addEventListener('message', e => {
    if (!e.data || e.data.type !== 'vorrat-nachfuellen') return;
    e.waitUntil(caches.open(CACHE).then(c => Promise.all(
      ASSETS_SPAETER.map(a => c.match(a).then(da => da ? null : c.add(a).catch(() => {}))))));
  });
  ```
  ```js
  // Seite: erst spaet, und nur wenn der Hauptthread ruhig ist
  window.addEventListener('load', () => setTimeout(() => {
    requestIdleCallback(() => navigator.serviceWorker.ready
      .then(r => (r.active || navigator.serviceWorker.controller)?.postMessage({type:'vorrat-nachfuellen'}))
      .catch(() => {}), {timeout: 3000});
  }, 6000));
  ```
  **Offline bleibt erhalten** — nach dem ersten Besuch mit Netz ist alles da; und
  fällt das Nachfüllen aus, holt der `fetch`-Handler die Datei beim ersten
  echten Gebrauch.

- **So misst man es** (der Browser verrät es nicht — der Server schon): einen
  Prüfserver mit Zeitstempel je Anfrage laufen lassen, Seite in Playwright
  öffnen, 12 s warten, und sehen, **wann** die dicke Datei geholt wird. Vorher
  716 ms, nachher 6666 ms — das ist der Beweis.

- **Achte auf doppelt geholte Dateien.** Seite und Service-Worker holen leicht
  dieselbe Datei zweimal. Auf einem Server mit Cache-Kopfzeilen mildert der
  Browser das, ohne (Caddy heute) nicht.

## Regel 9 — Fail-soft ist Pflicht, nicht Kür

Fehlt ein Modul, ein Schlüssel, das Netz: die Seite läuft **weiter**. Kein toter
Knopf, kein Absturz. Und wo ein Knopf etwas braucht, das noch lädt, sagt er das:

```js
function netzOeffnen() {
  if (window.SbkimRendezvousUI?.show) { window.SbkimRendezvousUI.show(); return; }
  toast("Netz-Werkzeug lädt noch — gleich nochmal versuchen.");
}
```

Das ist zugleich die Voraussetzung dafür, dass Regel 1 (Nachladen) überhaupt
erlaubt ist.

## Regel 10 — Eine Dauerschleife braucht eine Selbst-Bremse

Ein bewegter Hintergrund (WebGL, Partikel, Shader) kostet auf einem Gerät **mit**
Grafikbeschleunigung ~2 ms je Bild. **Ohne** — alte Handys, und **jedes**
Prüfgerät bei PageSpeed — sind es Hunderte. Dann ist die Bewegung keine mehr,
sie rechnet nur noch und blockiert dabei die Bedienung.

Belegt an Mein-Mixarium-Page (Klaus' Bericht 2026-08-08): **alle zwanzig**
längsten Hauptthread-Aufgaben waren dieselbe Datei, jede **540–640 ms** — knapp
zwei Bilder je Sekunde, **39 s** unter `Other`. Der LCP war dabei `p.lead`,
**reiner Text**, TTFB 0 ms, und trotzdem 2.310 ms „Verzögerung beim Rendering".
Nichts zu laden — der Hauptfaden war nur zu beschäftigt, um Text zu zeichnen.

Die Abhilfe hält die Schleife nicht an, sie lässt sie **von selbst aufhören**:

```js
const BREMS_SCHWELLE  = 0.05;  // Sekunden je Bild = 20 Bilder/s
const BREMS_GEDULD    = 5;     // so viele langsame Bilder HINTEREINANDER
const AUFWAERM_BILDER = 3;     // die ersten Bilder nicht bewerten
let langsamInFolge = 0, bilderGezaehlt = 0;

function tick() {
  const now = performance.now(), dt = (now - last) / 1000; last = now;
  if (bilderGezaehlt++ >= AUFWAERM_BILDER) {
    if (dt > BREMS_SCHWELLE) langsamInFolge++; else langsamInFolge = 0;
    if (langsamInFolge >= BREMS_GEDULD) { renderOnce(); return; }  // Schleife endet
  }
  /* … zeichnen … */
  requestAnimationFrame(tick);
}
```

Stehen bleibt **dasselbe** statische Bild, das Geräte mit „Bewegung reduzieren"
ohnehin bekommen. Der Hintergrund verschwindet nicht, er hört nur auf, sich zu
drehen — auf einem gesunden Gerät greift die Bremse nie (dort ~16 ms je Bild).

Gemessen (Lighthouse Handy, je vier Runden im Wechsel):

| | Blockierzeit | Leistung |
|---|---|---|
| family-projekt.de | 163.000 → **7.480 ms** | 49 → 59 |
| Mein-Mixarium-Page | 168.000 → **7.800 ms** | 64 → **70** |
| Mein-Rezeptbuch-Page | 168.000 → **10.000 ms** | 42–50 → 47–55 |

### Die Bremse allein reicht nicht — frag zuerst nach dem Grafikchip

**Nachtrag vom selben Tag, 2026-08-08.** Die Bremse oben war ein Fortschritt und
trotzdem nur die halbe Antwort. Sie misst die **Bildrate** — sie merkt also erst,
dass es hoffnungslos ist, **nachdem acht Bilder gerechnet wurden**. Bei 1,4 s je
Bild sind das allein 11 s. Gegenprobe an Mein-Rezeptbuch-Page: **mit** Bremse
Leistung 48 bei 10,3 s Blockierzeit, **ganz ohne** Hintergrund 87 bei 0 ms.

Die bessere Frage ist nicht „wie schnell bremse ich", sondern **„gibt es hier
überhaupt eine Grafikkarte"**. Der Browser sagt es selbst, in Mikrosekunden:

```js
function keinGrafikchip() {
  try {
    var c = document.createElement('canvas');
    var gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return true;                       // kein WebGL: ginge sowieso nicht
    var d = gl.getExtension('WEBGL_debug_renderer_info');
    var n = d ? String(gl.getParameter(d.UNMASKED_RENDERER_WEBGL) || '') : '';
    return /swiftshader|llvmpipe|software|mesa offscreen|microsoft basic/i.test(n);
  } catch (_e) { return true; }
}
```

Die Prüfung gehört **vor den Import**, nicht in den Aufbau — sonst werden die
165 KiB three.js noch geholt, um dann nichts zu tun.

Gemessen an drei Seiten, je im Wechsel:

| | vorher | nachher | Blockierzeit |
|---|---|---|---|
| Mein-Mixarium-Page | 61 · 64 · 62 | **99 · 97 · 99** | 169 s → 0,15 s |
| Mein-Rezeptbuch-Page | 43 · 47 · 47 | **74 · 75 · 75** | 11 s → 0,32 s |
| family-projekt.de | 65 · 56 | **89 · 94** | 8,9 s → 0,09 s |

**Klaus' Entscheid, als beide Wege gemessen vorlagen:** auf einem Gerät ohne
Chip **gar kein** Hintergrund (81 · 80 · 74) statt eines stehenden Bildes
(52 · 53 · 52, kostet 2 s Blockierzeit). *Wer keine Grafik hat, hat von einem
stehenden Partikelbild nichts — er hat nur die zwei Sekunden dafür bezahlt.*

**Fail-soft in beide Richtungen:** verrät der Browser den Namen nicht (manche
Datenschutz-Einstellungen verbergen ihn), läuft der Hintergrund **normal
weiter**. Vorsicht darf keine Bestrafung sein.

**Und der Teil, den keine Messung hier beweisen kann:** ob der Hintergrund auf
einem Gerät **mit** Chip noch läuft. Der Container hat selbst keinen — der
positive Weg lässt sich nur nachstellen (Aufbau intakt, `MycelBg` gesetzt,
keine Fehler), nicht messen. **Klaus hat es am 2026-08-08 an allen drei Seiten
im Browser bestätigt:** „Alle drei sind noch da." Ohne diesen Blick wäre die
Änderung unbelegt geblieben.

**Zwei Warnungen dazu, beide gemessen:**

- **Die Bremse kostet, bis sie greift.** Sie wartet `AUFWAERM_BILDER +
  BREMS_GEDULD` = **8 Bilder** ab. Bei 1,4 s je Bild sind das allein 11 s. Eine
  **zweite, härtere Not-Schwelle** (ein Bild über 0,4 s bremst sofort) lag
  gemessen **im Rauschen** — 47 · 54 · 48 gegen 46 · 48 · 47 — und wurde
  deshalb **nicht** gebaut. Wer sie erneut vorschlägt: erst messen.
- **Die Blockierzeit ist nicht die Note.** An Mein-Rezeptbuch-Page fiel die
  Blockierzeit um das Siebzehnfache, und die Note bewegte sich kaum: dort
  bestimmt der LCP, und der hängt an den Bildern. Beide Zahlen nennen.

### Und der eigentliche Fund: dieselbe Datei in drei Generationen

`assets/mycel-bg.js` lag am 2026-08-08 in drei Fassungen im Netz:

| | three.js nachgeladen | Selbst-Bremse | Handy |
|---|---|---|---|
| family-projekt.de | ✅ | ✅ | 80 |
| Mein-Rezeptbuch-Page | ✅ | ❌ | 57 |
| Mein-Mixarium-Page | ❌ | ❌ | 59 |

Beide Reparaturen waren **schon erfunden und von Klaus freigegeben** — sie waren
nur nie nachgezogen worden. **Wer eine Seite untersucht, sieht zuerst nach, ob
die Schwester-Seite dieselbe Datei in einer neueren Fassung trägt.** Das ist
billiger als jede Analyse.

**Und: kopieren heißt nicht abschreiben.** Der Nachlade-Anstoß der Schwester-Seite
endet mit `MycelBg.setTheme()`. Dort liest `setTheme()` die Farben aus CSS — an
Mein-Mixarium-Page erwartet dieselbe Funktion einen Themen-**Namen** und fällt
ohne Argument auf `Dunkel` zurück. Wortwörtlich übernommen hätte die Zeile Neon
und Hell stillschweigend überschrieben.

### Nachtrag 2026-08-15 — der Rollout war unvollständig, und niemand merkte es

Eine Woche später lag `Mein-Workfloh-Page` bei **Leistung 62**. Die Suche ging
zuerst in die falsche Richtung (siehe unten), bis Klaus sagte: *„prüf das an den
anderen Seiten, die sind ähnlich aufgebaut."* Dann war es in fünf Minuten klar:

| | Wächter | Bremse | nachgeladen | Leistung |
|---|---|---|---|---|
| Mein-Rezeptbuch-Page · Mein-Mixarium-Page · family-projekt.de | ✅ | ✅ | ✅ | 89 |
| Tomys-Hub | **–** | ✅ | ✅ | 94 |
| Mein-Workfloh-Page | **–** | **–** | **–** | **62** |

**Die Reparatur von 2026-08-08 wurde an drei Seiten ausgerollt. Es gab fünf.**
Das Wissen fehlte nicht, die Regel stand hier bereits vollständig — es fehlte
die *Liste*. Daraus zwei Dinge:

- **Wer eine Regel dieser Art einführt, sucht im ganzen Netz nach der Datei**,
  nicht nur in den Repos, an denen er gerade arbeitet. Ein Einzeiler genügt:
  `find /home/user -name "mycel-bg*.js"` und je Treffer prüfen, welche Stufen
  drin sind. Ohne das altert eine Reparatur zu einem Sonderfall.
- **Die Regel „sieh zuerst bei der Schwester nach" stand schon hier — und wurde
  trotzdem übersprungen.** Sie ist der billigste Schritt der ganzen Untersuchung
  und gehört an den *Anfang*, nicht ans Ende.

**Der Fehlgriff davor, als Warnung:** aus den PageSpeed-Diagnosen (kritischer
Pfad, ungenutztes JavaScript, längste Aufgaben) wurde geschlossen, die
Bibliothek hänge im Ladeweg — also wurde das *Laden* nach hinten verlegt.
Ergebnis: **LCP 1.940 ms → 0,4 s, FCP 0,3 s, CLS 0,028 — und die Note fiel
trotzdem.** Die Blockierzeit blieb bei 23.490 ms, und sie trägt die Note.

> **Merksatz:** Eine Dauerschleife wird nicht dadurch billiger, dass sie später
> anfängt. Wer den Ladeweg richtet, verbessert LCP und FCP; wer die Note bewegen
> will, muss die **Arbeit** loswerden, nicht ihren Startzeitpunkt. Steht in der
> Messung LCP grün und Blockierzeit rot, ist der Ladeweg das falsche Ziel.

**Neuer Befund nebenbei — der Hintergrund hungerte das Netz aus.** Nach dem
Abschalten fiel in Tomys-Hub eine E2E-Probe von 16/16 auf 15/16: eine
WebSocket-Verbindung zum Relais scheiterte. Nicht die Änderung war schuld —
dieselbe Probe fällt, wenn man den Hintergrund völlig neutral abschaltet.
**Ohne den Hintergrund bekam die Verbindung erstmals Leerlaufzeit und versuchte
es überhaupt.** Vorher kam sie im Testfenster nie dran. Auf einem langsamen
Gerät heißt das: der Zierhintergrund verzögerte die Netz-Anbindung.

## Abhakliste

- [ ] Modul-Stapel nach dem Laden, Reihenfolge maschinell gegengeprüft
- [ ] `defer` nicht reflexhaft gesetzt — gemessen, wo der Stapel steht
- [ ] `controllerchange`-Reload gegen die Erst-Installation abgesichert
- [ ] Cache-Version hochgezählt, Vorrat vollständig
- [ ] **Service-Worker-Vorrat geprüft**: nichts Großes im `install`, Großes
      nachträglich (server-seitig gegengemessen, wann es geholt wird)
- [ ] Platz für später eingehängte Elemente reserviert
- [ ] kein byte-1:1-Modul verändert, Drift-Guard grün
- [ ] alles fail-soft, Öffner fangen „lädt noch" ab
- [ ] **Vor dem Import gefragt, ob ein Grafikchip da ist**; Dauerschleife hat
      zusätzlich eine Selbst-Bremse; und **als ERSTES** geprüft, ob eine
      Schwester-Seite dieselbe Datei schon in einer neueren Fassung trägt
      (`find /home/user -name "<datei>"`, je Treffer die Stufen zählen) — 2026-08-15
      hing genau daran eine Seite bei 62, während vier Schwestern längst gerichtet waren
- [ ] bei roter Blockierzeit **nicht** am Ladeweg gedreht: LCP grün + Blockierzeit
      rot heißt, die Arbeit muss weg, nicht ihr Startzeitpunkt
- [ ] `node --check` auf alle geänderten JS-Dateien **und** die Inline-Blöcke
