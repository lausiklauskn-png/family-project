# Brief nächste Sitzung – Marktplatz: Karten kippen weg, Schieberegler (Stand 27.11.2026)

## Zuerst: was aus der Sitzung vom 27.11. noch offen ist
- PRs **fp #404 · tp #204** (Studio: Knöpfe gleich breit, Fenster eingeklappt, „▸ geladen (n)“ je Passkey,
  Gerätezahl beim Zurückkehren neu). Klaus fragen, ob übernommen. **Danach auf dem Cloud-Server**
  `docker restart spezial` (Hetzner-Konsole im Browser, `root` + Server-Passwort; Termux vom Handy geht nicht,
  root nur mit Schlüssel). Ohne Neustart bleibt „geladen“ verborgen, sonst geht nichts kaputt.
- Am 27.11. gemessen: Dienst neu gestartet (Stand `b26efd8`), Kurzlink geht, Gerätebindung zählt („1 von 2“).
  Das „0 von 2“ war die vorher geöffnete installierte App (veraltete Anzeige), der Server hatte 1 Gerät.
  Downloads vor 19:51 (alter Dienst) zählen in `zaehler.json`, aber nicht als Gerät. Test 3 (zweites Gerät)
  hat Klaus ausgelassen.
- Klaus' Code und Link vom Test sind nicht weg: Studio → „Vergebene Passkeys“ → **„Übergabe“** zeigt beides wieder.
- Nebenbei: ein Suchprogramm aus dem Netz (`//%2e%2e%2f%2eenv`) erzeugt in `docker logs spezial` eine
  `ERR_INVALID_URL`-Zeile (500, nichts herausgegeben). Wenn Zeit: in `dienst.mjs` vor `new URL` still mit 400 ablehnen.

## Auftrag (Klaus 2026-11-27, wörtlich gekürzt)
*„Die familyprojekt.de Aufteilung der Fenster anders, weil es zu viele sind. Beispiel an PWA Toolpoint: die klappen
nach hinten weg und kommen unten wieder hoch. Immer nur 3 in der Ansicht, bildschirmfüllend 2, Handy eine oder
fast eine – du musst sehen, was am besten ist. Dass wir nicht mehr so weit scrollen müssen.“*
*„Und an der Seite … ein Scrollrad oder einen Schieberegler zum Anfassen, wo wir das nach unten schieben können.“*

## Was es drüben schon gibt (PWA Toolpoint, nachgelesen)
- `assets/app.js` § „Wegkippen am oberen Rand“ (`kippBeimScrollen`, ~Z. 871–1071): Schwelle statt mitlaufender
  Verformung, **Layout-Werte** (`offsetTop`/`offsetHeight`, kein IntersectionObserver – der misst die gekippte Karte
  und flackert), Deckel = klebender `header`, `KIPP_SCHWELLE` .5 / kurzes Bild (<720 px) 2/3, `requestAnimationFrame`,
  `MutationObserver` auf die Liste, `toggle` in der Fangphase, ohne Skript und bei `prefers-reduced-motion` nichts.
- `assets/style.css` ~Z. 717–790: `.listing.kipp-weg{--kipp:78deg;transform-origin:50% 100%}`,
  `.kipp-rein{--kipp:-78deg;transform-origin:50% 0}`, beide `opacity:0;pointer-events:none`, weg .42 s, zurück .18 s;
  `--kipp` steht VOR dem Maus-Neigen in der transform-Kette; zweiter Riegel für reduced-motion.

## Hier (family-project)
- Karten: `markt.html` `#mkListings` (statisch gebaut von `tools/statische-listen.mjs`, zur Laufzeit neu gezeichnet
  ~Z. 1389), Raster `assets/style.css` `.listings` Z. 510, `.listing` Z. 549 (transform mit `--rx/--ry/--lift`,
  reduced-motion-Block Z. 306–314 setzt transform neu – dort `--kipp` mitdenken). `header` ist sticky (Z. 65).
- Karten sind hier groß (Bild + Text + Knöpfe, Bauweise Schaufenster, Skill `app-container-schaufenster`) – „3 sichtbar“
  ergibt sich nicht allein aus dem Kippen; messen, wie viele Reihen bei 412 · 900 · 1280 px sichtbar stehen.
- **Schieberegler:** fest am rechten Rand (`position:fixed`, kein CLS), nur solange `#mkListings` im Bild ist, Griff
  ≥ 44 px, ziehen = `scrollTo` innerhalb der Liste, dazu „n / Anzahl“. Tastatur/Vorlesen: `role="slider"` mit
  `aria-valuenow`. Bei reduced-motion bleibt er (er ist keine Bewegung), das Kippen nicht.
- Regeln: `seiten-bauregeln` (Layout: kein Springen, Bewegung abschaltbar), Proben im echten Browser bei mehreren
  Breiten, Gegenprobe je Riegel, Cache-Bump. Am Tablet misst nur Klaus.

## ⚠ Nachtrag, Vorrang (Klaus 2026-11-27, 20:40): ZUERST die Karten verschlanken
*„Sehr große Container … mit 40 Apps ist das ganz schön viel, auch für ein kleines Handy oder einen Monitor. Das
Scrollen dauert ewig. … Logos kleiner. Im Groben dasselbe Layout. Gerne mehrere nebeneinander, 3 ist besser als 4
(die Augen wandern sonst). Ziel: in 3–4 Bildschirmen komplett durch. Text direkt unter den Namen, kein großer
Abstand. Vielleicht Logo, Text, Leistung sichtbar und den Rest eingeklappt. Lass dir was einfallen.“*

**Gezählt an seinem Bild (1920 px breit, 27.11.):** 3 Karten je Reihe, eine Karte ≈ 760 px hoch: Bild ≈ 220 px,
großer leerer Abstand zwischen „@klaus“ und Text (≈ 50 px), 3 Zeilen Text, 2 Reihen Messwerte, „Alle vier Werte sind
gut (… am …)“, „Von uns persönlich geprüft …“, Knopf „Bewertung nachlesen“, Fußleiste (Einzelheiten · Zur Seite ·
Melden). 39 Karten = 13 Reihen ≈ 10 000 px ≈ **11 Bildschirme**. Für 3–4 Bildschirme muss eine Reihe auf ≈ 250–300 px.

**Vorschlag (vor dem Bau mit Klaus kurz abstimmen):**
- Bild nicht mehr als Breitbild oben, sondern **Logo quadratisch 64–72 px links neben Name und @anbieter** (wie die
  Karten in PWA Toolpoint); Text **direkt darunter, 2 Zeilen** geklemmt (voller Text bleibt im Markup, für Suche/SEO).
- **Messwerte in EINER Reihe** kompakt (4 kleine Pillen, Farbe je Stufe bleibt).
- „Alle vier Werte …“, „Von uns geprüft …“, „Bewertung nachlesen“ in ein **„▸ mehr“** (`<details>`), zu Anfang zu.
- Fußleiste bleibt (Einzelheiten · Zur Seite · Melden, Knöpfe-Familie vom 2026-09-22, Melden ≥ 44×44).
- **3 Spalten** am Monitor, 2 am Tablet, 1 am Handy; Raster mit `max-width`, damit 3 nicht über 1920 px gezogen werden.
- Danach erst Wegkippen und Schieberegler (oben); mit kurzen Karten wirkt das Kippen besser, nicht schlechter.
- ⚠ Fallen: die Karte gibt es **zweimal** (`tools/statische-listen.mjs` → `marktHtml()` und `card()` in `markt.html`),
  beide ändern. Viele Proben zählen Karten/Knöpfe (`smoke_all`, `smoke_kartenknoepfe`, `smoke_stufe5_messung`,
  `smoke_markt_vecpack`, `smoke_detail_gestalt`, `smoke_wartung`, `smoke_markt_melden`) – Zusicherungen nachziehen, nicht
  schwächen. Skill `app-container-schaufenster` lesen. Messen bei 360 · 412 · 900 · 1280 · 1920 px: Höhe einer Reihe und
  Bildschirme bis zum Ende, vorher/nachher. Kein CLS. Cache-Bump.
