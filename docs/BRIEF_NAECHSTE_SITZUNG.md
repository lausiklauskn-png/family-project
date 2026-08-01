# Brief für die nächste Sitzung — family-project (Stand 2026-08-01, abends)

Klaus, dieser Brief ist der vollständige Übergabestand. Alles Offene steht drin,
Schritt für Schritt, mit dem Grund dahinter.

---

## 0. Zuerst lesen, bevor irgendetwas angefasst wird

1. `CLAUDE.md` in `Sage-Protokol` — § Sitzungsstart-Pflicht (immer frisch von `origin/main`)
2. Diesen Brief
3. `tools/waechter.mjs` — der Kopf erklärt Stufe 3 in einer Bildschirmseite:
   die drei Ampeln, warum erst der zweite Fehlschlag sperrt, und warum
   `grundlage` und `pruefsumme` getrennt geführt werden
4. `tools/vektoren-bauen.mjs` — der Kopf erklärt die tägliche Aktualisierung,
   samt der Frage, warum der fertige Vektor aus der Spore *nicht* übernommen wird
5. `tests/smoke_stufe3_waechter.mjs` — der Kopf nennt die sieben Gegenproben und
   die eine, die zuerst stumpf war
6. `assets/vec-codec.js` — der Kopf erklärt die Katalog-Spore

**Vor jeder Arbeit an einem Repo:**

```bash
git -C <repo> fetch origin --quiet
git -C <repo> checkout -B <branch> origin/main
```

Der Grund steht in Sages `CLAUDE.md`: die Klone im Container können Monate alt
sein. In diesem Repo kommt eine zweite Falle dazu: nach einem Squash-Merge zeigt
`git log origin/main..branch` noch Commits an, obwohl der Inhalt längst in `main`
ist. Immer zusätzlich `git diff origin/main origin/<branch> --stat` prüfen. Ist
der leer, ist ein `push --force-with-lease` gefahrlos.

**Vor dem ersten Test:** `npm install playwright-core --no-save`. Es gibt keine
`package.json`, und ohne diesen Schritt bricht jeder Browser-Test mit
`ERR_MODULE_NOT_FOUND` ab — das sieht aus wie ein kaputter Test, ist aber keiner.

**Nur EINE Browser-Testreihe gleichzeitig laufen lassen.** Zwei parallele Läufe
überlasten diese Maschine, und dann misst man Rauschen statt Ergebnissen.

**Was von dieser Maschine aus NICHT erreichbar ist** (gemessen 2026-08-01,
jeweils „CONNECT tunnel failed, response 403"): `cdn.jsdelivr.net`,
`huggingface.co`, `*.github.io`. Erreichbar ist `raw.githubusercontent.com`.
Wer etwas davon braucht, plant es als „ungeprüft, die Action misst es" ein —
nicht als Fehler.

**Und: Workflows von Hand starten geht aus einer Sitzung heraus NICHT.** Der
Versuch endet mit `403 Resource not accessible by integration`. Das ist kein
Rechtefehler, den man umgehen sollte — es bleibt Klaus' Schritt.

---

## 1. Was in dieser Sitzung fertig wurde

| Was | Wo |
|---|---|
| **Nachgesehen, was die erste Nacht ergab** — Antwort: es gab noch keine | (Befund, siehe unten) |
| **Katalog-Spore Stufe 3 — der Wächter** | `tools/waechter.mjs`, `tools/vektoren-bauen.mjs`, `markt.html`, `assets/studio-markt.js`, `assets/style.css`, `assets/config/wache-hand.json` |

Cache-Version steht auf **v77**. `smoke_stufe3_waechter` **64/64**,
`smoke_stufe2_sporen` **38/38**, `smoke_cache_version` **9/9**.

### Warum es zur ersten Nacht keinen Bericht gab

Kein Fehler, nur noch keine Nacht: die Aktion wurde am **2026-08-01 um 12:32 Uhr**
nach `main` gemergt, ihr Zeitplan steht auf **02:40 UTC**. Die Liste der Läufe war
leer (0), `assets/config/spore-stand.json` gab es folglich noch gar nicht.

Zwei Dinge wurden trotzdem geprüft, statt sie zu vermuten:

- **Der Default-Branch ist `main`.** Das ist keine Formalie: GitHub führt den
  `schedule`-Block eines Workflows **nur** aus, wenn die Datei auf dem
  Default-Branch liegt. Wäre er ein anderer — wie im Rezeptbuch-Repo, wo genau
  das jahrelang in die Irre führte —, wäre die Aktion stillschweigend tot.
- **Die neun Spore-Links.** Die vier auf `raw.githubusercontent.com` antworten
  mit **200**. Die fünf auf `*.github.io` sind von dieser Maschine aus gesperrt
  (Proxy 403) und darüber ist damit **nichts** gesagt; über die GitHub-API wurde
  geprüft, ob `sbkim/spore.json` in den fünf Repos überhaupt auf `main` liegt —
  **ja, in allen fünf**. Ob GitHub Pages sie ausliefert, beantwortet erst der
  erste Lauf.

### Stufe 3 — der Wächter

Hängt sich an **dieselbe** Aktion und erweitert **denselben** Bericht. Kein
zweiter Lauf, kein zweites Format.

| Ampel | wann | Folge im Marktplatz |
|---|---|---|
| **grün** | nichts auffällig | Eintrag normal |
| **gelb** | Zielseite geändert · einmal keine Antwort · kein https · zu groß zum Prüfen | Eintrag sichtbar **mit Warnband**, Link bleibt |
| **rot** | von Hand gesperrt · Safe Browsing meldet die Adresse · **zweimal in Folge** tot | Eintrag **bleibt sichtbar**, Grund lesbar, **Link abgeschaltet** |

**Deine Bedingung ist eingehalten: ein Eintrag verschwindet nie stillschweigend.**
Rot heißt „auf Eis", nicht „weg". Der Eintrag bleibt in `listings.js`, bleibt im
Bericht, bleibt auf der Karte, der Grund steht im Klartext dabei, und der
Melde-Knopf bleibt offen — der menschliche Kanal geht nie zu. Das ist im Browser
geprüft, nicht behauptet.

**Zwei Entscheidungen, die je ein Loch geschlossen haben:**

1. **Erst der zweite Fehlschlag in Folge sperrt.** Ein einzelner Netz-Aussetzer
   darf keine fremde App aus dem Marktplatz werfen. Der Zähler steht im Bericht
   und geht bei der ersten Antwort auf null zurück.
2. **`grundlage` statt Vortages-Vergleich.** Der naheliegende Bau wäre, heute
   gegen gestern zu vergleichen. Das hat ein Loch: ändert eine Seite sich einmal
   und steht dann still, wäre sie am übernächsten Tag wieder „unverändert" — das
   Gelb verschwände von allein, ohne dass jemand hingesehen hätte. Der Bericht
   merkt sich deshalb die Prüfsumme, die als in Ordnung **gilt**; sie wandert
   nicht mit. **Gelb bleibt Gelb, bis du quittierst.**

**Der Handschalter ist eine Datei, kein Klick** — `assets/config/wache-hand.json`:

```json
{
  "markt-beispiel": { "ampel": "rot", "grund": "Zielseite verlangt plötzlich eine Anmeldung." },
  "markt-anderes":  { "gesehen": "a1b2c3d4e5f6a7b8" }
}
```

`ampel` gewinnt über die Automatik — deine Notbremse (`rot`) und deine Entwarnung
(`gruen`, die auch für eine Seite gilt, die gerade nicht antwortet). **Eine
Ausnahme:** einen Safe-Browsing-Treffer kannst du **nicht** per Hand grün
schalten. Das ist der einzige Befund von außen, und er soll sich nicht mit einem
Eintrag in einer Datei wegräumen lassen — wer ihn für falsch hält, nimmt den
Eintrag heraus oder schaltet Safe Browsing ab; beides sieht man.

`gesehen` ist die Quittung: die genannte Prüfsumme (sie steht im Bericht) gilt ab
dann als in Ordnung, das Gelb dafür ist erledigt. Ändert die Seite sich
**erneut**, wird sie wieder gelb — eine Quittung ist kein Freifahrtschein. Eine
Sperre ist damit nachlesbar und begründet, statt ein Klick zu sein, den später
niemand mehr erklären kann.

### Gemessen, nicht geschätzt

`tests/smoke_stufe3_waechter.mjs` **64/64**: ein echter https-Server mit eigenem
Zertifikat liefert die Zielseiten, derselbe Server spielt den Google-Endpunkt mit
echtem POST und echter Antwort. Fehlschlag-Zähler und „Gelb bleibt Gelb" lassen
sich nur über **mehrere Läufe hintereinander** messen — der Test fährt deshalb
dasselbe Verzeichnis drei- und viermal.

**Sieben Gegenproben, jede einzeln rot bekommen.** Und eine davon war zuerst
**stumpf**: die Probe am Safe-Browsing-Ausfall blieb **grün**, obwohl absichtlich
„alles sperren" eingebaut war. Der Grund: der Test spielte den Ausfall nur als
HTTP 503 — und der läuft im Wächter durch eine andere Zeile als ein abgerissener
Draht. Seitdem prüft der Test beide Ausfall-Arten getrennt, und beide
Gegenproben werden rot. Das ist wörtlich die Lehre der Vorsitzung, ein zweites
Mal, an einer anderen Stelle: **eine Gegenprobe, die den Fehler nicht fängt, ist
keine — und man merkt es nur, wenn man den Fehler wirklich einbaut.**

Nebenbefund, ebenfalls gemessen statt vermutet: `smoke_all` wurde durch den
neuen Abruf **rot** — ein 404 auf die noch nicht existierende Berichtsdatei
erzeugt einen Konsolenfehler. Deshalb liegt jetzt ein ehrlich leerer
Anfangs-Bericht im Repo (`geprueft: null`, `eintraege: {}`).

---

## 2. Safe Browsing — gebaut, leer, und wann ich es scharf schalten würde

Deine Entscheidung war „Steckplatz bauen, heute leer lassen", mit dem Zusatz, es
später zu aktivieren. So steht es jetzt:

- Ohne `SAFE_BROWSING_KEY` in der Umgebung wird Google **nicht** gefragt (im Test
  nachgezählt: null Anfragen), und der Bericht sagt `nicht_geprueft` — statt so zu
  tun, als sei geprüft worden.
- Der Workflow reicht das Secret **bereits durch**. Scharf wird es allein durch
  das Anlegen des Secrets, **ohne einen weiteren Bau**.
- Fällt Google aus, wird **nichts** gesperrt. Beide Ausfall-Arten sind einzeln
  geprüft. Ein Wächter, der bei eigenem Ausfall alles sperrt, wäre schlimmer als
  keiner.

**Wann ich den Moment für richtig halte:** nach dem ersten erfolgreichen
Wächter-Lauf, nicht davor. Zwei Gründe. Erstens: heute sind alle vierzehn
Einträge deine eigenen bzw. die von Alina und Tomy — Google würde nichts finden,
was du nicht selbst weißt. Der Nutzen entsteht mit dem ersten **fremden** Eintrag,
und dann soll der Schlüssel schon liegen. Zweitens, und wichtiger: wenn Aktion
und Google-Abfrage gleichzeitig neu sind und etwas rot wird, weiß niemand, welcher
Teil schuld war. Erst den Wächter allein laufen sehen, dann Google dazu.

**Der Weg, wenn du soweit bist** (drei Schritte, Browser, kein Terminal):

1. `console.cloud.google.com` → neues Projekt → „Safe Browsing API" aktivieren →
   unter „Anmeldedaten" einen API-Schlüssel erstellen. Kostenlos.
2. Im Repo: Settings → Secrets and variables → Actions → *New repository secret*,
   Name genau **`SAFE_BROWSING_KEY`**, Wert der Schlüssel.
3. Actions → *Run workflow*. Im Bericht steht danach bei jedem Eintrag
   `safebrowsing: "sauber"` statt `"nicht_geprueft"` — daran siehst du, dass es
   wirkt.

Was Google dadurch erfährt: die Liste der Adressen aus deinem Marktplatz, einmal
täglich, gebündelt in einer Anfrage. Sie sind ohnehin öffentlich; neu ist, dass
Google sie als Liste bekommt.

---

## 3. Was du noch tun musst

**a) Zwei Dateien per WebFTP hochladen** — unverändert offen aus der Vorsitzung.
Alles unter `server/` wird nie durch einen Merge oder Deploy aktualisiert.

- `server/einreichung.php`
- `server/marktplatz-api.php`

**Kontrolle:** in beiden neuen Fassungen kommt das Wort **`sporeUrl`** vor; in
den alten kein einziges Mal. Nicht auf die Dateigröße schauen — das war der
Befund vom 2026-08-01 (46 Bytes Unterschied).

Ohne den Upload bleibt alles heil. Es fehlt dann nur eines: der freiwillige
Spore-Link, den ein Anbieter im Einreich-Formular angibt, kommt nicht im Studio
an. Die nächtliche Aktion, der Bericht, der Wächter und die Vektoren laufen davon
unabhängig.

**b) Die Aktion einmal von Hand starten.** Actions → „Sporen lesen und Vektoren
fortschreiben (täglich)" → *Run workflow*. Danach steht schwarz auf weiß, welche
der fünf Live-Adressen wirklich antworten und ob der Lauf mit dem echten Modell
durchgeht. **Das kann eine Sitzung nicht für dich tun** (403, siehe oben).

**c) Danach Safe Browsing scharf schalten**, wenn du magst — Abschnitt 2.

---

## 4. Katalog-Spore — der Fahrplan, Stufe für Stufe

Der Gedanke dahinter: Wer seine App im Marktplatz einträgt, muss **gefunden werden**.
Bei 100 Apps kann niemand 100 Tabs offen halten, damit ein Handshake zustande
kommt. Die Katalog-Spore ist die Antwort, ohne die Verfassung zu brechen — der
Marktplatz ist **Pilz-Schicht** (Schicht 2), er darf Server benutzen und auf
Nutzer-Aktion nach außen gehen. Die **Mycel-Schicht** (Schicht 1, der Knoten
selbst) bleibt unangetastet: Empfangsmodus, keine Pulsation, kein Crawler.

### Stufe 0 — Relais-Messung *(nur Klaus, läuft im Browser)*

Über die Mycel-Karte messen, **wie lange eine Karte im Relais liegen bleibt**.
Das Ergebnis legt das Lesefenster in Stufe 6 fest. Heute liest Modul 23 mit
`since: now - 1800` (30 Minuten). Ob das zu kurz oder zu lang ist, weiß niemand —
es ist geraten, nicht gemessen. Blockiert nichts, sollte aber vor Stufe 6 vorliegen.

### Stufe 1 — vorberechnete Vektoren ✅ fertig, im Echtbetrieb bewiesen (14/14)

Rückfall in Stufen, schlimmster Fall ist genau das frühere Verhalten: Datei fehlt
→ alles live · Modell-Kennung passt nicht → Paket verworfen · einzelner Eintrag
fehlt → nur dieser live · Text seit dem Vorberechnen geändert (Hash) → nur dieser live.

### Stufe 2 — `sporeUrl` + tägliche Aktualisierung ✅ gebaut

Offen bleibt nur, was hier niemand messen kann: der Lauf mit dem echten Modell
und die fünf Live-Adressen. Beides beantwortet der erste Lauf der Action.

### Stufe 3 — Wächter ✅ gebaut (diese Sitzung)

Offen daran: der erste echte Lauf, und die Entscheidung zu Safe Browsing
(Abschnitt 2). Was fehlt und bewusst nicht gebaut wurde: ein **Knopf im Studio**,
der eine Sperre setzt. Heute ist der Handschalter eine Datei im Repo. Das ist
absichtlich der erste Schritt — eine Sperre, die als Datei mit Begründung
existiert, ist nachvollziehbar; ein Knopf käme sinnvoll erst dazu, wenn es
regelmäßig etwas zu sperren gibt.

### Stufe 4 — Melde-Knopf ✅ fertig und live bewiesen

### Stufe 5 — Bewertung: Lighthouse + Ja/Nein-Stimmen

Deine Vorgabe: Nur Apps, die **nützlich, technisch gut, nutzerfreundlich und
optisch gut bis hervorragend** sind, bleiben auf Dauer. Zwei getrennte Quellen,
die nicht vermischt werden dürfen:

1. **Maschinell messbar — Google Lighthouse.** Vier harte Zahlen: Leistung,
   Bedienbarkeit, gute Praxis, Auffindbarkeit. Kein Geschmacksurteil, sondern
   eine Messung — genau deshalb taugt es nach außen: „diese App erreicht 94 von
   100" ist überprüfbar.
2. **Menschlich — Ja / Nein / geht besser.** Drei Knöpfe, keine Sternchen.

Dein **Schieberegler** stellt einmalig ein, wie streng gefiltert wird. **Nicht
vermischen** — eine gemittelte Note aus Messwert und Stimmen bedeutet nichts mehr.

**Offen und von dir zu entscheiden:** Lighthouse braucht entweder die
PageSpeed-Insights-API (Schlüssel, Google sieht die URLs) oder einen eigenen Lauf
in der Action (langsamer, aber niemand sieht mit). Vor dem Bauen fragen. Der
Wächter hat dafür jetzt die Form vorgegeben: dieselbe Aktion, derselbe Bericht,
und ein Steckplatz, der ohne Schlüssel ehrlich „nicht geprüft" meldet.

### Stufe 6 — längeres Lesefenster im Relais

Setzt **Stufe 0** voraus. Der Wert wird angepasst, wenn gemessen ist — nicht vorher.

### Stufe 7 — Gast-Pillen auf der Mycel-Karte

Wer im Marktplatz steht, aber (noch) kein voller Knoten ist, erscheint als **Gast**.
`spore-stand.json` trägt dafür schon `nodeName` und `nodeId` je Anbieter mit.

### Stufe 8 — Aufräumen im Relais

Alte Karten verfallen lassen, damit der gemeinsame Raum nicht zuwächst.

---

## 5. Befunde, die notiert, aber nicht gebaut sind

### 5.1 Andere Symbol-Knöpfe haben ein Tablet-Problem

🎤, 📷, ✕ und die Knoten-Status-Knöpfe tragen nur ein `title`-Attribut. Auf einem
Touch-Gerät erscheint das **nie**. Genau das war der Mangel am Melde-Knopf, bis er
sichtbaren Text bekam. Schlägt ebenfalls auf den Lighthouse-Wert durch (Stufe 5) —
sinnvoll, das vor Stufe 5 zu richten, so wie es die Fokus-Markierung war.

### 5.2 `docs/PULS.md` in Sage-Protokol

7.816 Zeilen gegen eine selbst gesetzte Grenze von 3.000. Ältere Sitzungen ins
Archiv auslagern, **nicht kürzen**. (Die PULS.md hier wächst auch — im Auge behalten.)

### 5.3 Automatischer Rück-Handshake

Auf `netzwerk.html` steht der ehrliche Stand (Zeile 130): Der server-lose Handshake
ist bewiesen, aber die Gegenseite quittiert nur zurück, wenn ihr Tab **offen und
aktiv** ist. Das ist der eigentliche Grund, warum es die Katalog-Spore überhaupt
gibt — sie umgeht das Problem, statt es zu lösen. Den Text nicht versehentlich in
„geht automatisch" umschreiben, solange es nicht stimmt.

### 5.4 Caddy-Formatierung

Kosmetische Warnung beim Neuladen. `docker exec caddy caddy fmt --overwrite
/etc/caddy/Caddyfile` räumt es auf.

### 5.5 Die tägliche Aktion schreibt jede Nacht einen kleinen Commit

`spore-stand.json` bekommt bei jedem Lauf einen frischen Zeitstempel, auch wenn
sich sonst nichts geändert hat. Das ist Absicht: der Stempel ist der Beleg, **dass**
nachgesehen wurde — ein Bericht, der stehen bleibt, wäre von einem ausgefallenen
Lauf nicht zu unterscheiden. Mit dem Wächter gilt das doppelt: „gestern war alles
grün" ist nur dann eine Aussage, wenn belegt ist, dass jemand hingesehen hat.

---

## 6. Wie hier gearbeitet wird

- **Messen statt schätzen.** „Sieht fertig aus" ist kein Befund. In dieser Sitzung
  dreimal wieder: die Aktion war nie gelaufen (statt „hat wohl nichts gefunden"),
  `smoke_all` wurde durch den neuen Abruf rot (statt „wird schon passen"), und eine
  Gegenprobe blieb grün, obwohl der Fehler eingebaut war.
- **Zu jedem neuen Wächter eine Gegenprobe — und die Gegenprobe muss scharf sein.**
  Ein Prüfwert, bei dem richtig und falsch gleich aussehen, macht sie wertlos. Und
  wenn eine Funktion **zwei** Fehler-Zweige hat, braucht sie **zwei** Gegenproben:
  ein Zweig kann kaputt sein, während der andere die Probe grün hält.
- **Cache ist hier die häufigste Ursache, nicht der Sonderfall.** Bei jedem „das
  kann doch nicht sein" zuerst fragen: welche Fassung hat der Browser wirklich?
- **Wer eine CORE-Datei ändert, erhöht `CACHE_VERSION` und `ASSET_V` in `sw.js`**
  und zieht alle `?v=`-Verweise mit. Steht auf **v77**.
  `tests/smoke_cache_version.mjs` sagt es dir.
- **Auf das Ergebnis warten, nie auf die Uhr** — und wo die Seite selbst aufräumt,
  **mitschreiben statt nachsehen**.
- **Im Test alles umleiten, was der Code abruft.** (Playwright-Globs vergleichen die
  ganze Adresse samt Query — ein `?ts=` bricht die Umleitung.)
- **Ein Test, der den Prozess blockiert, misst sich selbst.** `spawnSync` hält die
  Ereignisschleife an; läuft im selben Prozess ein Server, nimmt der keine
  Verbindung mehr an. Deshalb starten beide Stufen-Tests ihre Kindprozesse
  asynchron.
- **Nodes eingebautes fetch beachtet `NODE_TLS_REJECT_UNAUTHORIZED` nicht.** Für ein
  eigenes Zertifikat im Test: `NODE_EXTRA_CA_CERTS`.
- **`raw.githubusercontent.com` liefert für PRIVATE Repos immer 404**, auch wenn die
  Datei da ist. Dann den Live-Link `<app-adresse>/sbkim/spore.json` nehmen.
- **Der `domainVector` aus einer Spore gehört NICHT sicher zum selben Text**
  (`sbkim-init.js` rechnet `embedPassage(beschreibung)`, der Siegel-Wizard
  `beschreibung + ". " + stichworte`). Nie übernehmen, immer selbst rechnen.
- **Alles unter `server/` wird nie durch Merge oder Deploy aktualisiert.** Klaus lädt
  es per WebFTP hoch. Als Kontrolle ein Wort nennen, das nur in der neuen Fassung
  vorkommt — NICHT die Dateigröße.
- **Klaus' Browser-Sichttest ersetzt nichts und wird durch nichts ersetzt.**
- **Erst mergen, dann prüft Klaus.** GitHub Pages deployt von `main`.
- **Selbst-Merge-Freibrief gilt** (Klaus 2026-06-28, netzweit). Bei echtem Zweifel fragen.
- **Einzelschritte für Klaus.** Ein Schritt pro Antwort mit klarem Erfolgsmerkmal, keine
  Terminal-Befehle ohne Angabe, auf welche Maschine sie gehören.

### Die drei Maschinen nicht verwechseln

| Ort | Prompt | Paketbefehl | Was dort läuft |
|---|---|---|---|
| Tablet / Termux | `~ $` | `pkg` | `git`, lokaler `http.server`, **`ssh` zum Server**. Kein Server. |
| Hetzner Cloud (CX23) | `root@ubuntu-…:~#` | `apt` | Caddy im Docker, liefert `family-projekt.de` **statisch**. `167.233.204.72`, Caddyfile unter `/opt/relay/Caddyfile` |
| Hetzner Webhosting S | konsoleH | — | **PHP** und die echten Geheimnisse. Nur hier wirkt `.htaccess` |

Am 2026-08-01 lief ein `cat /opt/relay/Caddyfile` im Termux ins Leere — genau diese
Verwechslung. Wer einen Befehl gibt, sagt dazu, wohin er gehört. Am sichersten ist
`ssh root@167.233.204.72 '<befehl>'`, dann kann er gar nicht auf dem Tablet landen.

---

## 7. Vorschlag für die Reihenfolge

1. **Die Aktion einmal von Hand starten** (Abschnitt 3b) — danach steht schwarz auf
   weiß, welche Sporen erreichbar sind und ob der Lauf mit dem echten Modell
   durchgeht. Alles Weitere baut darauf auf.
2. **Den ersten Bericht ansehen** — im Studio, Block „Sporen der Anbieter". Jede Zeile
   trägt jetzt eine Ampel. Was gelb ist, will angesehen werden; was rot ist, ist auf
   Eis und nennt den Grund.
3. **Safe Browsing scharf schalten** (Abschnitt 2) — erst nach Schritt 1, aus dem dort
   genannten Grund.
4. **Die zwei PHP-Dateien hochladen** (Abschnitt 3a) — unabhängig von allem anderen.
5. **Befund 5.1** (Symbol-Knöpfe ohne sichtbaren Text) — klein, und gehört wie die
   Fokus-Markierung vor Stufe 5.
6. **Stufe 5** (Lighthouse + Stimmen) — vorher die offene Frage aus Abschnitt 4 klären.
7. **Stufe 0** (Relais-Messung, du im Browser), dann **Stufe 6**. **Stufen 7 und 8** zum Schluss.

---

## 8. Sitzungsende, jedes Mal

1. `docs/PULS.md` fortschreiben (Datum, was getan, was offen, was als Nächstes).
2. Bei Andock-Bezug: `sbkim/SIGNAL.json` pflegen (`seq` +1, `headline`, `forNodes`) —
   **das Pushen ist das Signal.** Reine Marktplatz-Arbeit ist Pilz-Schicht und berührt
   den Briefkasten nicht; dann bleibt `SIGNAL.json` unangetastet, und das gehört gesagt.
   *(Diese Sitzung war reine Pilz-Schicht — `SIGNAL.json` blieb unangetastet.)*
3. Einen **„Nächste Schritte"-Block direkt in die Chat-Antwort** (2–4 Punkte, je ein Satz
   Begründung). Klaus liest den Tab, nicht den Dateibrowser.
4. Einen **neuen Brief wie diesen** schreiben und **vollständig als Codeblock im Chat**
   ausgeben.
