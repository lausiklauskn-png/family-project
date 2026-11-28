# Brief nächste Sitzung: Plansitzung „Zukunft der Apps" (Stand 28.11.2026)

Klaus ist kein Programmierer: Deutsch, Schritt für Schritt, bei jedem Befehl sagen, auf welcher Maschine er läuft.

## Auftrag (Klaus 2026-11-28, wörtlich gekürzt)

*„Es geht dann nochmal um eine Plansitzung bezüglich der Zukunft der Apps. Dazu soll verglichen werden, was wir jetzt
neu gebaut haben … wir haben darüber schon mal einen Bericht gemacht, eine Diskussionsgrundlage … welche nach hinten
gestellt werden, welche erstmal nicht bearbeitet werden und an welchen gearbeitet wird. Und diese aktualisierst du bitte
mit den neuen Daten, mit den neuen Apps."*

*„Da war auch eine Kosten-Nutzen-Rechnung drin. Zeitaufwand, Kosten und so weiter, Schieberegler mit dem Dashboard.
Mach nicht so viel Text, mach lieber mehr Grafiken. Sodass wir, wenn wir an den Schiebereglern rumspielen, sehen, wenn
wir mehr Zeit investieren in eine App, kommt das raus, wenn wir in die andere mehr Geld investieren, kommt das raus …
Die Apps, die rausfliegen können, die wir löschen können oder auf Eis legen können, zeigt bitte mit an. Also die, wo
wir die Namen nur gesichert haben, aber keinen Inhalt haben. Und die werden wir mit rausrechnen. Ich möchte wissen, wie
viel Kosten ich noch investieren muss … bis die Apps laufen, bis wir daraus Geld wieder gemacht haben."*

## Die Grundlage, die fortgeschrieben wird

- **Artifact „Projekte und Investitionen"**, `https://claude.ai/artifact/Q3JLshnxNibqJ1K4icn8k2`, **Fassung 3 vom
  23.11.2026** (Fassung 2: 04.11., 60 Repos; Fassung 3: 66 Repos). Kapitel: Neu seit 04.11., Woran weiter, Bündeln,
  Rezeptbücher und Mixarium, Weg in die Stores, Tassen, Einsatz und Ergebnis, Projekte (Tabelle), Vergleich, Chance
  gegen Aufwand, **Szenario-Rechner (Schieberegler)**, Zeitplan, Kosten, Kompetenzen, Dienstleistungen, Fahrplan.
  Einteilung: ▲ Weiterführen · ◆ Bündeln · ? Zunächst prüfen · ■ Zurückstellen. Markierung Fakt / Annahme / Schätzung.
- Daneben: Artifact **„Gewinn durch Reduktion"** (`https://claude.ai/artifact/KNCi8QwJPWXSVGRfu9nbR3`, 13.11.).
- ⚠ Kernbefund von Fassung 3: **der Fahrplan vom 04.11. wurde nicht befolgt** (geplant war Workflow PDF Pro in den
  Play Store, Website-Paket mit Preis, Einfrieren der Breite; tatsächlich floss die Zeit in die Akten-Familie). Fassung 4
  muss sagen, ob sich das seit dem 23.11. geändert hat. Ehrlich, auch wenn die Antwort wieder „nein" ist.
- Die Geld- und Forschungszahlen dort sind **vom 04.11.** und wurden am 23.11. nicht neu erhoben. Neu erheben.

**Weg:** zuerst das Artifact lesen (`Artifact` action `read`, die volle HTML liegt danach lokal), dann **Fassung 4** an
derselben Adresse veröffentlichen (`url` mitgeben, nicht neu anlegen). Vorher den Skill `artifact-design` laden.

## Was Fassung 4 können muss (Klaus' Wünsche, in dieser Reihenfolge)

1. **Dashboard zuerst, Text zuletzt.** Oben die Regler und Grafiken; Erklärungen eingeklappt.
2. **Schieberegler je App (oder je Bündel):** Stunden je Woche und Geld (Store-Gebühren, Server, Zertifikat, Werbung).
   Die Grafiken zeigen sofort: wann ist die App „fertig für den Store", wann käme der erste Euro, wann ist die Summe
   wieder drin (**Break-even**). Bandbreite statt Scheingenauigkeit, Annahmen sichtbar und selbst verstellbar
   (Preis, Käufer je Monat, Stundensatz).
3. **„Rausfliegen / auf Eis":** alle Repos ohne Inhalt (nur der Name gesichert) als eigene Gruppe, **aus allen
   Summen herausgerechnet**, mit Vorschlag „löschen" oder „auf Eis". Fassung 3 nennt schon `FP-End-Wurf` (leer, kein
   Commit). Gefunden werden sie, nicht geraten: `list_repos` (alle Repos) und je Repo Zahl der Commits und Größe.
4. **Die Summe oben:** wie viel Geld und wie viele Stunden noch nötig sind, bis die ausgewählten Apps laufen, und ab
   wann sie das zurückbringen. Mit Datum.
5. **Was neu ist seit dem 23.11.** (Tabelle unten), eingeordnet in die vier Gruppen.

## Neu seit Fassung 3 (23.11.) — zum Einordnen

| Was | Stand | Quelle |
|---|---|---|
| **Marktplatz Spezial** (Pro-Apps nur gegen Passkey, 2 Geräte je Passkey, Kurzlink, Studio) | gebaut 26.–27.11., Dienst auf dem Cloud-Server | `docs/PLAN_MARKTPLATZ_SPEZIAL.md`, CLAUDE.md § Marktplatz Spezial |
| **Pro-Apps im Spezial:** BookLedger Pro, Datei-Organizer Pro (Windows vom eigenen Update-Server), PseudoDoc Pro (APK); **bald:** Mein Rezeptbuch Pro, Mein Mixarium Pro | Passkeys ausgebbar, **kein Verkauf** (Stufe 1, Gewerbe fehlt) | `assets/config/spezial.js`, `server/spezial/quellen.json` |
| **Neu als Web-App im Marktplatz** (beide Märkte, gemessen): Private Akte, Meine Familienakte, PseudoDoc, BookLedger Basic, Kim-sync | 26.10.–26.11. | `assets/config/listings.js` |
| **Marktplatz-Karten schlank** (beide Märkte): Liste 3–4 statt 10 Bildschirme am Monitor, Wegkippen, Schieberegler am Handy, Kopf von PWA Toolpoint wie family-projekt.de | 27.–28.11. | PR #406, #407 (family-project), PWA-Toolpoint #205 |
| Später (nach Gewerbe): **PayPal-Automatik** für Passkeys | Plan im Chat vom 27.11. | — |

## Daten, die die Sitzung selbst erhebt

- **Repos:** `mcp__claude-code-remote__list_repos` (limit 200): Name, letzte Änderung, privat/öffentlich. Für Commits
  und Größe je Repo die GitHub-Werkzeuge; leere Repos = „nur der Name gesichert".
- **Messwerte der Apps:** `family-project/forschung/messreihe.json` (Lighthouse je Nacht).
- **Zeitaufwand:** Kimhub `forschung/messungen/` (Sitzungs-Befunde; Regel: Forschung steht nur in Kimhub) und
  `Kimhub/schicht/zeitschaetzung.mjs`, `Kimhub/schicht/kosten.mjs`, `Kimhub/schicht/tokenkosten.mjs`.
- **Wirtschaft:** `Sage-Protokol/docs/PLAN_PILZ_WIRTSCHAFT.md` (Stufen 0/1/2: kein Preis vor dem Gewerbe).
- Was nicht erhebbar ist (Käuferzahlen, Preise), steht als **Annahme mit Regler**, nie als Fakt.

## Offen aus den letzten Sitzungen (nicht Teil der Plansitzung, nur nicht vergessen)

- **Cloud-Server** (Hetzner-Konsole im Browser, `root`): einmal `docker restart spezial`, damit im Studio
  „▸ geladen (n)" erscheint (PR #404). Termux vom Handy geht dafür nicht.
- **Sichttest am Tablet und Handy:** die schlanken Karten von family-projekt.de mit „mehr" neben „Melden" (#407) und der
  neue Kopf, die Karten und der Regler von PWA Toolpoint.
- **PWA Toolpoint, übrige Seiten:** Knotenkarte, Impressum, Datenschutz, Spezial, Detailseiten tragen noch den alten Kopf
  (eigene Lampen-Leiste, Wörter auf den Knöpfen). Die Startseite ist umgebaut; ob die anderen folgen, fragt Klaus.
- Benannte Grenzen in den Gegenproben (schon auf `main`): `gegenprobe_angleichen` 2 blind, `gegenprobe_uebersetzung`
  1 toter Anker (CLAUDE.md § Schlanke Karten).
