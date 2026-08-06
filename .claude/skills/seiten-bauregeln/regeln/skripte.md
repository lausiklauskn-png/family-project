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
`clients.claim` **und** einem ungebremsten `controllerchange`-Reload. Bekannt
betroffen (Stand 2026-08-06): Muttis Rezeptbuch.

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

## Regel 8 — Fail-soft ist Pflicht, nicht Kür

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

## Abhakliste

- [ ] Modul-Stapel nach dem Laden, Reihenfolge maschinell gegengeprüft
- [ ] `defer` nicht reflexhaft gesetzt — gemessen, wo der Stapel steht
- [ ] `controllerchange`-Reload gegen die Erst-Installation abgesichert
- [ ] Cache-Version hochgezählt, Vorrat vollständig
- [ ] Platz für später eingehängte Elemente reserviert
- [ ] kein byte-1:1-Modul verändert, Drift-Guard grün
- [ ] alles fail-soft, Öffner fangen „lädt noch" ab
- [ ] `node --check` auf alle geänderten JS-Dateien **und** die Inline-Blöcke
