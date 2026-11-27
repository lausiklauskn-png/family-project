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
