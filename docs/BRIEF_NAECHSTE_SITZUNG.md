# Brief für die nächste Sitzung — family-project (Stand 2026-08-01, spät)

Klaus, das ist der vollständige Übergabestand. Alles Offene steht drin, mit dem
Grund dahinter.

---

## 0. Zuerst lesen, bevor irgendetwas angefasst wird

1. `CLAUDE.md` in `Sage-Protokol` — § Sitzungsstart-Pflicht (immer frisch von `origin/main`)
2. Diesen Brief
3. `tools/messung.mjs` — der Kopf erklärt Stufe 5 in einer Bildschirmseite
4. `tools/waechter.mjs` — der Kopf erklärt Stufe 3 ebenso
5. `tests/smoke_stufe5_messung.mjs` — der Kopf nennt die sechs Gegenproben und
   die Lehre, die dieser Test beim Bauen gekostet hat

**Vor jeder Arbeit an einem Repo:**

```bash
git -C <repo> fetch origin --quiet
git -C <repo> checkout -B <branch> origin/main
```

Nach einem Squash-Merge zeigt `git log origin/main..branch` noch Commits, obwohl
der Inhalt in `main` ist. Immer zusätzlich `git diff origin/main origin/<branch>
--stat` prüfen.

**Vor dem ersten Test:** `npm install playwright-core --no-save`. Es gibt keine
`package.json`; ohne diesen Schritt bricht jeder Browser-Test mit
`ERR_MODULE_NOT_FOUND` ab. Das sieht aus wie ein kaputter Test, ist aber keiner.

**Nur EINE Browser-Testreihe gleichzeitig** — sonst misst man Rauschen.

**Von dieser Maschine NICHT erreichbar:** `cdn.jsdelivr.net`, `huggingface.co`,
`*.github.io` (Proxy 403). Erreichbar ist `raw.githubusercontent.com`.
**Workflows von Hand starten geht aus einer Sitzung heraus nicht** (403). Das
bleibt Klaus' Schritt.

---

## 1. Was in dieser Sitzung fertig wurde

| Was | Wo |
|---|---|
| **Stufe 5 — Lighthouse in der eigenen Aktion (Weg A)** | family-project |
| **Modul 15 — das Fremdzugriff-Protokoll sagt jetzt, wer geklopft hat** | Sage-Kanon + family-project |

Cache-Version steht auf **v80**. `smoke_stufe5_messung` 56/56,
`smoke_membran_protokoll` 27/27, `smoke_all` 107/107, `smoke_knoepfe` 64/64,
`smoke_stufe3_waechter` 64/64, `smoke_stufe2_sporen` 38/38,
`smoke_cache_version` 10/10, `smoke_studio_markt` 62/62,
`smoke_studio_vectors` 41/41. In Sage: `smoke_bau15c_protokoll` 27/27,
`smoke_bau15b_membran` 35/35, die drei Siegel-Suiten unverändert grün.

### Stufe 5 — was gebaut wurde

`tools/messung.mjs` hängt sich an denselben Lauf wie der Wächter und schreibt in
denselben Bericht: neben `wache` je Eintrag ein Block `messung` mit den vier
Zahlen (Leistung, Bedienbarkeit, gute Praxis, Auffindbarkeit).

- **Keine Gesamtnote, an keiner Stelle.** 100/100/100/20 ist nicht „80 gut".
  Der Ein-Satz-Befund auf der Karte nennt stattdessen den **schwächsten** Wert —
  genau den will man wissen. Es gibt auch keinen Platz, an dem sich später
  Ja/Nein-Stimmen hineinrechnen ließen.
- **„Es soll mehr zu lesen sein":** an der Karte vier Zahlen und ein Satz, im
  Aufklapper zu jeder Kategorie was gemessen wurde, was die Zahl bedeutet, und
  was ein niedriger Wert für einen Besucher **konkret** heißt. Dazu der ehrliche
  Zusatz, dass es eine Maschinen-Messung ist und nichts darüber sagt, ob die App
  gut oder nützlich ist.
- **Der Schieberegler** sitzt im Studio und wird mit den Einträgen
  veröffentlicht (`window.FP_MARKT_MIN_LEISTUNG` in `assets/config/listings.js`
  — kein neuer Server-Pfad, keine Datei zum Hochladen). 0 heißt aus. Ein Eintrag
  **ohne** Messwert wird nie ausgeblendet.
- **Deckel:** zehn Messungen je Lauf, ältestes Datum zuerst, im Protokoll
  genannt. Ein Fehlschlag löscht den alten Befund nicht, sondern lässt ihn als
  `veraltet` mit **seinem eigenen Datum** stehen.

**Was NICHT geprüft ist und auf dich wartet:** ob Lighthouse in der echten
Aktion durchläuft. Der Test fährt einen Doppelgänger über `LIGHTHOUSE_CMD` —
derselbe Spawn, dieselbe Bericht-Datei, nur ein anderes Programm am Ende. Ob
`npm install lighthouse` auf GitHubs Rechnern klappt und ob Chrome dort gefunden
wird, sagt erst der erste nächtliche Lauf. Schlägt es fehl, ist das **kein**
Schaden: die Aktion läuft weiter (`continue-on-error`), und der Bericht sagt
ehrlich `nicht_gemessen`.

### Modul 15 — was gebaut wurde

Dein Fund vom 2026-08-01: rote FREMD-Lampe im DuckDuckGo-Browser, und im Fenster
stand nur `membrane-postmessage · origin: — · decision: ignored`.

Jeder Eintrag führt jetzt mit: welcher der Abweis-Gründe zutraf, wer
abgeschickt hat, wofür sich die Nachricht ausgab, wie lange nach dem Laden sie
kam und ob der Tab dabei vorn war. Das Fenster erklärt das in ganzen Sätzen —
auch den Strich bei der Herkunft, der keine Panne ist, sondern eine echte
Auskunft: *nicht feststellbar, typisch für Skripte des Browsers selbst und für
Erweiterungen.*

PII-Grenze hart: nie Werte aus fremden Objekten, nur Feld-NAMEN, Text-Auszug
gekappt und jede Ziffernfolge maskiert, alles RAM-only.
`ZERTIFIKAT_ASPEKTE` in Modul 16 mitgezogen.

---

## 2. Was du tun kannst — der Reihe nach

**a) Ins Fremdzugriff-Fenster schauen, sobald `main` deployt ist.** Öffne
family-projekt.de im **DuckDuckGo-Browser**, warte bis die FREMD-Lampe rot wird,
klick sie an. Unter dem Eintrag steht jetzt ein Satz, der sagt, wer geklopft hat.
**Das ist der Beleg, auf den es ankommt** — die Frage „war es DuckDuckGos KI?"
lässt sich damit zum ersten Mal beantworten, statt sie zu vermuten.

**b) Nach der nächsten Nacht in den Marktplatz schauen.** Unter jeder Karte
sollten vier Zahlen stehen. Stehen dort stattdessen „Noch nicht gemessen." —
auch gut, dann hat Lighthouse in der Aktion nicht durchgezogen, und der Grund
steht im Studio in der Messungs-Tabelle.

**c) Den Schieberegler einstellen, wenn du magst.** Studio (Langdruck auf die
Copyright-Zeile) → Block „📈 Messung (Lighthouse)". Darunter steht live, wie
viele Einträge bei diesem Wert herausfielen. Wirksam wird er erst mit
„Veröffentlichen".

**d) Zwei Dateien per WebFTP hochladen** — unverändert offen:
`server/einreichung.php` und `server/marktplatz-api.php`. **Kontrolle:** in
beiden neuen Fassungen kommt das Wort **`sporeUrl`** vor, in den alten kein
einziges Mal. Nicht auf die Dateigröße schauen.

**e) Safe Browsing scharf schalten.** Der Wächter läuft nachweislich allein,
der Moment ist jetzt richtig: Google-Projekt → Safe Browsing API aktivieren →
API-Schlüssel → Repo Settings → Secrets and variables → Actions → *New
repository secret*, Name genau **`SAFE_BROWSING_KEY`**. Der Workflow reicht ihn
bereits durch; es braucht keinen weiteren Bau.

---

## 3. Die offenen Punkte, mit Grund

### ⚠ Modul 15 steht netzweit in VIER Fassungen (neu gemessen)

`sbkim/15_membran.js` auf `origin/main`, am 2026-08-01 nachgezählt:

| Fassung | Repos |
|---|---|
| `0d037cd2` (= Sage-Kanon vor dieser Pflege) | Jasons-Tresor · Mein-Tresor · Tomys-Hub |
| `e2ed570d` | Mein-Mixarium |
| `b0287e73` | Mein-Rezeptbuch · Muttis-Rezeptbuch |
| `82b7022f` (Fork mit A5-Antwortpfad) | family-project — **jetzt mit der Pflege** |

Der Rollout ist damit **kein** byte-1:1-Kopieren, sondern dieselbe Delta-Arbeit
je Fassung. Der Weg ist erprobt: das Delta als Patch aus dem Sage-Commit ziehen,
mit `patch` aufsetzen, danach nachzählen, dass die Eigenpflege des Repos noch
steht und nichts Fremdes eingeschleppt wurde. Genau so ist family-project
versorgt worden. **Eigener Schritt, eigene Gegenprobe je Repo.**

### ⚠ Modul 17 trägt in vier Repos eine Gabelung (unverändert)

`sbkim/17_floating_widget.js` ist in **Mein-Rezeptbuch, Muttis-Rezeptbuch,
Mein-Mixarium und BookLedgerPro** bewusst nicht überschrieben: sie tragen deine
eigenen Fixes (Pro-App-Namensraum, Proxy-ID-Guard), die der Sage-Kanon nicht
hat, und ihnen fehlt gleichzeitig der Stufen-Render von 2026-05-26. Weder
Vorgänger noch Nachfolger, sondern eine Gabelung.

Der saubere Weg bleibt: die beiden Eigenpflegen **in den Sage-Kanon holen**,
dann sind alle wieder byte-1:1 und der Lesbarkeits-Fix kommt mit. Bis dahin: in
diesen vier Apps ist die Widget-Beschriftung über heller Seite weiterhin schwer
lesbar. Das ist der ehrliche Stand.

### Kleinere Reste

- **`assets/mycel-bg.js`** (10 Verweise) hängt weiter ohne `?v=` und ohne
  CORE-Eintrag frei am HTTP-Cache.
- **Node-20-Deprecation:** `actions/checkout@v4` + `setup-node@v4` in allen
  Repos. Warnung, kein Fehler. Vor dem Hochziehen die richtige Fassung
  nachsehen, nicht die Nummer raten.
- **Ja/Nein-Stimmen** sind noch nicht gebaut. Sie brauchen einen Zähler auf
  deinem Server (also wieder eine PHP-Datei zum Hochladen) — deshalb wurde in
  dieser Sitzung nur der **Platz** dafür freigehalten, nicht die Funktion. Die
  Regel steht: sie kommen **daneben**, nie in die Messwerte hinein.
- **Die zweite Hälfte von Befund 5.1** ist weiter offen: verstehen sehende
  Nutzer die Symbole 🎤 und 📷 im Eingabefeld? Mein Vorschlag bleibt eine Zeile
  unter dem Formular („🎤 sprechen statt tippen · 📷 Text aus einem Foto") —
  keine Mechanik, erklärt beide auf einmal.

---

## 4. Wie hier gearbeitet wird

- **Messen statt schätzen.** „Sieht fertig aus" ist kein Befund.
- **Zu jedem neuen Wächter eine Gegenprobe — und sie muss scharf sein.** Hat
  eine Funktion **zwei** Fehler-Zweige, braucht sie **zwei** Gegenproben.
- **Nachzählen, dass der eingebaute Fehler wirklich im Code landet.** Ein
  Fehler, der nicht ankommt, beweist nichts über den Test.
- **NEU aus dieser Sitzung: einen neuen Schritt im gemeinsamen Lauf gegen die
  BESTEHENDEN Tests messen, nicht nur gegen den eigenen.** Die Messung startete
  ohne installiertes Lighthouse für jeden Eintrag einen eigenen Prozess. Gemerkt
  wurde es nicht am neuen Test — der war grün — sondern daran, dass
  `smoke_stufe2_sporen` plötzlich in seine Zeitgrenze lief.
- **Am richtigen Merkmal messen.** Eine Probe las `data-theme`, obwohl die App
  CSS-Variablen setzt.
- **Nicht das eigene Zutun messen.** `page.focus()` scrollt selbst.
- **Kopieren, nicht klonen — aber Diff LESEN vor Überschreiben.** Findet sich
  eine repo-eigene Zeile: nicht überschreiben, sondern das Delta aufsetzen und
  danach nachzählen, dass die Eigenpflege noch steht.
- **Ein Beleg aus dem Repo ist kein Beleg über die Wirklichkeit.**
- **Cache ist hier die häufigste Ursache, nicht der Sonderfall.**
- **Wer eine CORE-Datei ändert, erhöht `CACHE_VERSION` und `ASSET_V`** und zieht
  alle `?v=`-Verweise mit. Steht auf **v80**.
- **`raw.githubusercontent.com` liefert für PRIVATE Repos immer 404.**
- **Alles unter `server/` wird nie durch Merge oder Deploy aktualisiert.**
- **Erst mergen, dann prüft Klaus.** GitHub Pages deployt von `main`.
- **Selbst-Merge-Freibrief gilt** (Klaus 2026-06-28, netzweit).
- **Einzelschritte für Klaus.** Ein Schritt pro Antwort mit klarem
  Erfolgsmerkmal, keine Terminal-Befehle ohne Angabe, auf welche Maschine sie
  gehören.
- **family-projekt.de zeigt NICHT Modul 17**, sondern sein eigenes angedocktes
  Widget (`assets/status-widget.js`); Modul 17 läuft dort als Zulieferer. Wer
  Modul 17 sichtbar prüfen will, nimmt Privat-Brain, Kimboard, Kimseek,
  Mein-Tresor oder Jasons-Tresor.

### Die drei Maschinen nicht verwechseln

| Ort | Prompt | Paketbefehl | Was dort läuft |
|---|---|---|---|
| Tablet / Termux | `~ $` | `pkg` | `git`, lokaler `http.server`, **`ssh` zum Server**. Kein Server. |
| Hetzner Cloud (CX23) | `root@ubuntu-…:~#` | `apt` | Caddy im Docker, liefert `family-projekt.de` statisch. `167.233.204.72`, Caddyfile `/opt/relay/Caddyfile` |
| Hetzner Webhosting S | konsoleH | — | **PHP** und die echten Geheimnisse. Nur hier wirkt `.htaccess` |

Am sichersten ist `ssh root@167.233.204.72 '<befehl>'` — dann kann er gar nicht
auf dem Tablet landen.

---

## 5. Sitzungsende, jedes Mal

1. `docs/PULS.md` fortschreiben (Datum, was getan, was offen, was als Nächstes).
2. Bei Andock-Bezug `sbkim/SIGNAL.json` pflegen — das Pushen ist das Signal.
   *(Diese Sitzung: die Modul-15-Pflege berührt ein geteiltes Sicherheits-Modul,
   aber keinen Briefkasten-Vertrag; `SIGNAL.json` blieb unangetastet, und das
   gehört gesagt.)*
3. Einen **„Nächste Schritte"-Block direkt in die Chat-Antwort** (2–4 Punkte).
4. Einen **neuen Brief wie diesen** schreiben und **vollständig als Codeblock im
   Chat** ausgeben.
