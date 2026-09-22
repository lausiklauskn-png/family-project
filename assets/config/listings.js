/* Marktplatz-Einträge (Apps/Seiten) = zugleich Such-Korpus.
 *
 * Schema pro Eintrag (Brief §4 + Sage-Such-Korpus-Schema {label,anchorId,text},
 * erweitert um Markt-Felder):
 *   {
 *     label:    anzeigbarer Titel,
 *     anchorId: opake ID (z.B. "markt-0001"),
 *     text:     Bedeutungs-Text für die Suche (mit Alltags-Synonymen),
 *     by:       Anbieter-Handle (KEIN Klarname / kein PII),
 *     url:      Link zur Anbieter-Seite (target=_blank rel=noopener). Dorthin
 *               führt der Knopf „→ Zur Seite".
 *     appUrl:   optional — die eigentliche App, WENN der Eintrag ein
 *               Schaufenster (eine vorgeschaltete Landingpage) hat. Klaus'
 *               Entscheidung 2026-08-02: gemessen und auf der Karte gezeigt
 *               wird dann die APP, damit alle Einträge untereinander
 *               vergleichbar bleiben — zwölf von vierzehn zeigen ohnehin
 *               direkt auf die App. Das Schaufenster wird zusätzlich gemessen
 *               und steht beschriftet im Bewertungs-Fenster, damit niemand
 *               zwei Zahlen für dieselbe Sache hält. OHNE dieses Feld ändert
 *               sich nichts: `url` ist dann Link UND Mess-Ziel.
 *     img:      PFLICHT — Bild-Link (https, JPG/PNG/WebP; KEIN SVG),
 *     category: optionale Kategorie,
 *     own:      true = Klaus' eigene Beispiel-App (aus seinen Repos). Zählt
 *               NICHT zu den 100 Gratis-Plätzen des Gründer-Angebots — nur
 *               FREMDE Einträge (ohne own) werden gezählt (Klaus 2026-07-12).
 *     sporeUrl: optional — https-Link auf die sbkim/spore.json im EIGENEN Repo
 *               des Anbieters, z.B.
 *               https://raw.githubusercontent.com/<owner>/<repo>/main/sbkim/spore.json
 *               Der Anbieter behält seine Spore bei sich und ändert sie dort;
 *               der Marktplatz LIEST sie nur (Stufe 2 der Katalog-Spore).
 *     sporeAuto: optional true — die Beschreibung dieses Eintrags darf sich
 *               über Nacht selbst aus der Spore aktualisieren. OHNE dieses
 *               Feld (Standard) meldet die tägliche Aktion eine Änderung nur,
 *               und Klaus übernimmt sie im Studio per Knopf. Klaus'
 *               Entscheidung 2026-08-02: automatisch ja, aber nur, wo er es
 *               ausdrücklich erlaubt hat.
 *   }
 *
 * WARUM der Vektor NICHT aus der Spore übernommen wird (gemessen 2026-08-02):
 * Die Spore trägt zwar einen fertigen domainVector mit demselben Modell — aber
 * nicht über denselben Text. In diesem Repo allein gibt es zwei Regeln:
 * sbkim-init.js rechnet embedPassage(description), der Siegel-Wizard dagegen
 * embedPassage(description + ". " + keywords). Ein fremder Knoten kann eine
 * dritte benutzen. Ein übernommener Vektor sähe richtig aus und gehörte zu
 * einem anderen Text — genau die Falle „funktioniert alles, bringt nichts".
 * Der Marktplatz rechnet den Vektor deshalb immer selbst über den Text, den er
 * auch hasht (tools/vektoren-bauen.mjs).
 *
 * SICHERHEIT (Brief §5): FREMDE Einträge werden NICHT automatisch veröffentlicht.
 * Klaus gibt frei (Freigabe-Liste). Nur Link + Text + Bild-Link, alles wird beim
 * Rendern escaped. Kein fremder Code, Bilder nur als <img src>, SVG gesperrt.
 * Kein Bild -> kein Eintrag.
 *
 * Start-Bestückung (2026-07-12): Klaus' eigene, gehostete Apps als lebende
 * Beispiele — anklickbar, direkt verlinkt UND über die (Bedeutungs-)Suche
 * auffindbar. Bilder: App-eigenes Icon (github.io) bzw. lokale Kachel unter
 * assets/apps/ (beides https, kein SVG). Fremde Einträge kommen über den
 * Einreich-Dienst + Freigabe darunter dazu.
 */
// Einreich-/Kontakt-Endpunkt (Marktplatz + Kontakt → Klaus' Postfach info@).
// EU-eigen, ohne Dritt-Dienst: das PHP-Skript server/einreichung.php läuft auf
// Klaus' Hetzner-Webhosting, nimmt den POST an, schützt gegen Spam, legt den
// Eintrag in eine Warteschlange und mailt ihn lokal an info@. Klaus trägt hier
// die volle URL des hochgeladenen Skripts ein, z.B.
//   "https://DEIN-WEBHOSTING/formular/einreichung.php"
// Anleitung: server/README.md. Einziger Schaltpunkt — solange leer, bleibt das
// Formular fail-soft (Einreichung: kopierbarer Block; Kontakt: mailto-Vordruck),
// nichts geht verloren, kein Fehler. Klaus 2026-07-21.
window.FP_MARKT_SUBMIT_ENDPOINT = "https://formular.family-projekt.de/einreichung.php";

// Prüf-/Freigabe-Warteschlange (Studio holt eingereichte Apps vom Server). Adresse der
// marktplatz-api.php auf DEINEM Server. Leer = Warteschlange aus (Rest unverändert).
// Einrichtung: server/README-marktplatz-api.md. Klaus 2026-07-26.
window.FP_MARKT_API = "https://formular.family-projekt.de/marktplatz-api.php";

window.FP_LISTINGS = [
  {
    "label": "Mein Rezeptbuch",
    "anchorId": "markt-rezeptbuch",
    "text": "Rezeptbuch und Kochbuch für die Küche: eigene Rezepte sammeln, ordnen, suchen und kochen. Zutaten, Mengen, Einkaufsliste und Wochenplan / Menüplan. Läuft offline auf Handy und Tablet, ganz ohne Konto. Essen, Backen, Gerichte, Speisen, Mahlzeiten.",
    "text_en": "Recipe book and cookbook for the kitchen: collect, sort, search and cook your own recipes. Ingredients, amounts, shopping list and weekly meal plan. Runs offline on phone and tablet, with no account at all. Food, baking, dishes, meals.",
    "vorstellung": [
      "Für alle, die gern kochen und backen",
      "Eigene Rezepte sammeln, ordnen und wiederfinden",
      "Zutaten, Mengen und Schritte mit Foto",
      "Einkaufsliste und Wochenplan entstehen aus den eigenen Rezepten",
      "Läuft offline auf Handy und Tablet, ohne Konto"
    ],
    "besonders": "Die KI erkennt ein Rezept vom Foto. Blatt abfotografieren genügt, Zutaten und Schritte stehen danach im Buch.",
    "by": "@klaus",
    "url": "https://lausiklauskn-png.github.io/Mein-Rezeptbuch-Page/",
    "appUrl": "https://lausiklauskn-png.github.io/Mein-Rezeptbuch/",
    "img": "https://lausiklauskn-png.github.io/Mein-Rezeptbuch/icons/icon-book-blue-512.png",
    "category": "Küche",
    "own": true
  },
  {
    "label": "Muttis Rezeptbuch",
    "anchorId": "eigen-muttis-rezeptbuch",
    "text": "Das erste Rezeptbuch, mit dem alles anfing: Rezepte sammeln, ordnen, suchen und kochen. Zutaten, Mengen, Einkaufsliste und Wochenplan. Schlichter gebaut als das spätere Mein Rezeptbuch und gerade deshalb schnell zu begreifen. Läuft offline auf Handy und Tablet, ganz ohne Konto. Essen, Backen, Gerichte, Speisen, Kochbuch.",
    "text_en": "The first recipe book, the one it all started with: collect, sort, search and cook recipes. Ingredients, amounts, shopping list and weekly plan. Built more plainly than the later My Recipe Book, and quicker to grasp for exactly that reason. Runs offline on phone and tablet, with no account at all. Food, baking, dishes, meals, cookbook.",
    "vorstellung": [
      "Für alle, die gern kochen und backen",
      "Eigene Rezepte sammeln, ordnen und wiederfinden",
      "Zutaten, Mengen und Schritte mit Foto",
      "Einkaufsliste und Wochenplan entstehen aus den eigenen Rezepten",
      "Läuft offline auf Handy und Tablet, ohne Konto"
    ],
    "besonders": "Hier wird zuerst gebaut. Was sich in diesem Buch bewährt, wandert danach in Mein Rezeptbuch. Die beiden sind Schwestern, und dieses ist die ältere.",
    "by": "@klaus",
    "url": "https://lausiklauskn-png.github.io/Muttis-Rezeptbuch/",
    "img": "https://lausiklauskn-png.github.io/Muttis-Rezeptbuch/icons/icon-book-512.png",
    "category": "Küche",
    "own": true
  },
  {
    "label": "Mein Mixarium",
    "anchorId": "markt-mixarium",
    "text": "Getränke-Labor für Cocktails, Mocktails, Smoothies, Limonaden, Tees und Sirupe. Rezepte für Drinks sammeln, mischen und entdecken, mit und ohne Alkohol. Bar zuhause, trinken, Rezept, Mixgetränke. Offline nutzbar, kein Konto nötig.",
    "text_en": "Drinks lab for cocktails, mocktails, smoothies, lemonades, teas and syrups. Collect, mix and discover drink recipes, with and without alcohol. Home bar, drinking, recipe, mixed drinks. Works offline, no account needed.",
    "vorstellung": [
      "Für alle, die gern selbst mixen",
      "Cocktails, Mocktails, Smoothies und Limonaden sammeln und ordnen",
      "Eigene Rezepte mit Foto, Zutaten und Schritten",
      "Klassiker aus einer großen öffentlichen Cocktail-Datenbank, in sieben Sprachen",
      "Läuft offline auf Handy und Tablet, ohne Konto"
    ],
    "besonders": "Das KI-Labor erfindet Rezepte nach deinem Geschmack. Du bewertest, das Gute bleibt im Buch.",
    "by": "@klaus",
    "url": "https://lausiklauskn-png.github.io/Mein-Mixarium-Page/",
    "appUrl": "https://lausiklauskn-png.github.io/Mein-Mixarium/",
    "img": "https://lausiklauskn-png.github.io/Mein-Mixarium/mixarium_icon.png",
    "category": "Getränke",
    "own": true
  },
  {
    "label": "BookLedgerPro",
    "anchorId": "markt-bookledgerpro",
    "text": "Buchhaltung und Kassenbuch für Selbstständige und kleine Betriebe: Belege, Rechnungen, Konten, Umsatzsteuer und EÜR. Offline-first und verschlüsselt, Geld und Finanzen im Blick behalten. Buchführung, Beleg, Rechnung schreiben, Steuer.",
    "text_en": "Bookkeeping and cash book for freelancers and small businesses: receipts, invoices, accounts, VAT and cash-basis accounting. Offline-first and encrypted, keeping money and finances in view. Accounting, receipt, writing invoices, tax.",
    "vorstellung": [
      "Für Selbstständige und kleine Betriebe",
      "Belege, Rechnungen und Konten an einer Stelle",
      "Umsatzsteuer und EÜR im Blick",
      "Kassenbuch, das sich an die deutschen Regeln hält",
      "Läuft offline im Browser, verschlüsselt"
    ],
    "besonders": "Beleg abfotografieren und die Texterkennung trägt die Zahlen ein. Sie läuft über europäische Anbieter, mit deinem eigenen Zugang.",
    "by": "@klaus",
    "url": "https://lausiklauskn-png.github.io/BookLedgerPro/",
    "img": "https://lausiklauskn-png.github.io/BookLedgerPro/assets/img/og-image.png",
    "category": "Büro",
    "own": true,
    "sporeUrl": "https://lausiklauskn-png.github.io/BookLedgerPro/sbkim/spore.json"
  },
  {
    "label": "Mein Tresor",
    "anchorId": "markt-mein-tresor",
    "text": "Verschlüsselter Tresor für Dateien und Passwörter: alles sicher hinter Passwort und Schlüssel ablegen. Honigtopf-Tarnfach und Datei-Sicherung. Safe, Passwort-Manager, geheime Dateien, Datenschutz. Läuft offline im Browser, echte Verschlüsselung.",
    "text_en": "Encrypted vault for files and passwords: keep everything safe behind a password and a key. Honeypot decoy compartment and file backup. Safe, password manager, secret files, privacy. Runs offline in the browser, with real encryption.",
    "vorstellung": [
      "Für alle, die Dateien und Passwörter sicher ablegen wollen",
      "Zwanzig nummerierte Fächer, jedes mit eigenem Passwort",
      "Dateien, Notizen und Schlüssel hinter echter Verschlüsselung",
      "Sicherung als eine einzige Datei zum Mitnehmen",
      "Läuft offline im Browser, nichts geht nach draußen"
    ],
    "besonders": "Das Tarnfach. Wer zum Öffnen gedrängt wird, gibt ein zweites Passwort ein und sieht einen harmlosen Inhalt.",
    "by": "@klaus",
    "url": "https://lausiklauskn-png.github.io/Mein-Tresor/",
    "img": "https://family-projekt.de/assets/apps/mein-tresor.webp",
    "category": "Sicherheit",
    "own": true,
    "sporeUrl": "https://raw.githubusercontent.com/lausiklauskn-png/Mein-Tresor/main/sbkim/spore.json"
  },
  {
    "label": "Jasons Tresor",
    "anchorId": "markt-jasons-tresor",
    "text": "Verschlüsselte Bibliothek für JSON-Dateien und Schlüssel: laden, benennen, ordnen, suchen und exportieren, mit Passwort-Verschlüsselung. Von außen ein Tresor, drinnen eine Bibliothek. Safe, Datei-Sammlung, Backup, Datenschutz. Offline im Browser.",
    "text_en": "Encrypted library for JSON files and keys: load, name, sort, search and export them, with password encryption. A vault from the outside, a library inside. Safe, file collection, backup, privacy. Offline in the browser.",
    "vorstellung": [
      "Für alle, die viele Daten-Dateien und Schlüssel ordnen wollen",
      "Laden, benennen, sortieren und wiederfinden",
      "Alles hinter einem Passwort, echte Verschlüsselung",
      "Export und Import als eine Datei",
      "Läuft offline im Browser"
    ],
    "besonders": "Von außen ein Tresor, drinnen eine Bibliothek. Die Dateien bleiben durchsuchbar, ohne den Schutz aufzugeben.",
    "by": "@klaus",
    "url": "https://lausiklauskn-png.github.io/Jasons-Tresor/",
    "img": "https://family-projekt.de/assets/apps/jasons-tresor.webp",
    "category": "Sicherheit",
    "own": true,
    "sporeUrl": "https://raw.githubusercontent.com/lausiklauskn-png/Jasons-Tresor/main/sbkim/spore.json"
  },
  {
    "label": "Tomys Hub",
    "anchorId": "markt-tomys-hub",
    "text": "Tomy, dein Werkzeugkasten für personalisierten Druck: Gestalte im Browser druckfertige Vorlagen für T-Shirts, Tassen, Aufkleber und Werbeartikel. Vom KI-Motiv bis zur fertigen Druckdatei mit 300 dpi, mit Schaufenster voller Beispiele und Werkstatt-Werkzeugen für Auftrag und Angebot. Ideal für Verein, Firma oder privat, um Logo und eigene Motive individuell drucken zu lassen. Stichworte: Digitaldruck, Textildruck, Sublimation, Siebdruck, Stickerei, Werbetechnik, T-Shirt bedrucken, Tasse bedrucken, Aufkleber und Flyer drucken, Werbegeschenke, Druckvorlage gestalten, Motiv erstellen. Läuft offline im Browser, ohne Konto. Du gestaltest, wir drucken.",
    "text_en": "Tomy, your toolbox for personalised printing: design print-ready artwork for T-shirts, mugs, stickers and promotional items right in the browser. From an AI motif to a finished 300 dpi print file, with a showcase full of examples and workshop tools for jobs and quotes. Made for clubs, companies or private use, to have a logo or your own artwork printed. Keywords: digital printing, textile printing, sublimation, screen printing, embroidery, sign making, printing T-shirts, printing mugs, stickers and flyers, promotional gifts, designing artwork, creating a motif. Runs offline in the browser, no account. You design, we print.",
    "vorstellung": [
      "Für Vereine, Firmen und alle, die etwas bedrucken lassen wollen",
      "T-Shirts, Tassen, Aufkleber und Werbeartikel im Browser gestalten",
      "Vom Motiv bis zur druckfertigen Datei mit 300 dpi",
      "Schaufenster voller Beispiele, dazu Auftrag und Angebot",
      "Läuft offline im Browser, ohne Konto"
    ],
    "besonders": "Das KI-Motiv. Beschreiben, was draufkommen soll, und die Vorlage entsteht gleich in Druckqualität.",
    "by": "@tomy",
    "url": "https://lausiklauskn-png.github.io/Tomys-Hub/showcase/",
    "appUrl": "https://lausiklauskn-png.github.io/Tomys-Hub/",
    "img": "https://lausiklauskn-png.github.io/Tomys-Hub/icons/icon-512.png",
    "category": "Druck & Design",
    "own": true,
    "sporeUrl": "https://lausiklauskn-png.github.io/Tomys-Hub/sbkim/spore.json"
  },
  {
    "label": "Perfect Skin Beauty",
    "anchorId": "markt-perfect-skin-beauty",
    "text": "Kosmetikstudio in Hamburg von Alina: professionelle Haarentfernung mit Sugaring, Waxing und Zuckerpaste sowie Kosmetik-Behandlungen, dazu zertifizierte Depilations-Kurse zum Selberlernen. Beauty, Hautpflege, Enthaarung, Wachsen, Gesichtsbehandlung, Wellness. Zweisprachig Deutsch und Russisch, Termin online buchbar.",
    "text_en": "Alina's beauty studio in Hamburg: professional hair removal with sugaring, waxing and sugar paste, plus cosmetic treatments and certified depilation courses you can take yourself. Beauty, skincare, hair removal, waxing, facials, wellness. Bilingual German and Russian, appointments bookable online.",
    "vorstellung": [
      "Für alle, die in Hamburg Haarentfernung und Hautpflege suchen",
      "Sugaring, Waxing und Zuckerpaste bei Alina im Studio",
      "Kosmetik-Behandlungen für Gesicht und Körper",
      "Termine lassen sich online anfragen",
      "Auf Deutsch und Russisch"
    ],
    "besonders": "Die zertifizierten Depilations-Kurse. Wer es selbst lernen will, bekommt eine Ausbildung statt nur einen Termin.",
    "by": "@alis",
    "url": "https://perfectskinbeauty.de/",
    "img": "https://family-projekt.de/assets/apps/perfect-skin-beauty.webp",
    "category": "Beauty & Kosmetik",
    "own": true
  },
  {
    "label": "Perfect Skin Fashion",
    "anchorId": "markt-perfect-skin-fashion",
    "text": "Mode- und Design-Studio zum Gestalten und Bestellen: eigene Designs im Design-Studio entwerfen, im Video-Shop stöbern und über die Warenwirtschaft verwalten. Mode, Kleidung, Fashion, Shop, Design gestalten, Motive, Lager. Läuft im Browser.",
    "text_en": "Fashion and design studio for designing and ordering: create your own designs in the design studio, browse the video shop and manage everything through the inventory system. Fashion, clothing, shop, designing, motifs, stock. Runs in the browser.",
    "vorstellung": [
      "Für alle, die eigene Mode entwerfen und bestellen wollen",
      "Designs im Design-Studio selbst gestalten",
      "Im Video-Shop stöbern",
      "Lager und Bestellungen über die Warenwirtschaft",
      "Läuft im Browser"
    ],
    "besonders": "Das Design-Studio. Eigene Motive auf Kleidung setzen und direkt bestellen, ohne Umweg über ein fremdes Portal.",
    "by": "@alis",
    "url": "https://lausiklauskn-png.github.io/Perfect-Skin-Fashion/",
    "img": "https://lausiklauskn-png.github.io/Perfect-Skin-Fashion/assets/logo-512.png",
    "category": "Mode & Design",
    "own": true
  },
  {
    "label": "Sage-Protokol",
    "anchorId": "eigen-sage",
    "text": "Der offene Bauplan hinter den anderen Apps hier: das SBKIM-Protokoll, mit dem Programme einander ohne Server finden und sich gegenseitig Fragen beantworten. Dazu die Werkzeugkiste zum Nachbauen: Suche nach Bedeutung, Spracheingabe, Texterkennung, Verschlüsselung, Siegel. Alles offen zum Lesen und Kopieren. Semantische Suche, Peer-to-Peer, offline, Mycel, SBKIM.",
    "text_en": "The open blueprint behind the other apps here: the SBKIM protocol, which lets programs find each other without a server and answer each other's questions. Plus the toolbox for rebuilding it: search by meaning, speech input, text recognition, encryption, seals. All of it open to read and copy. Semantic search, peer-to-peer, offline, mycelium, SBKIM.",
    "vorstellung": [
      "Für alle, die wissen wollen, wie die Apps hier zusammenhängen",
      "SBKIM heißt Semantisches Bidirektionales KI-Matching: zwei Programme finden einander daran, dass sie dasselbe meinen",
      "Kein Server dazwischen, kein Verzeichnis, bei dem man sich anmeldet",
      "Die Bauteile liegen offen da und dürfen kopiert werden",
      "Glossar und Doku erklären jeden Begriff, den die anderen Apps benutzen"
    ],
    "besonders": "Hier entstehen die Bauteile, die in fast jeder App dieses Marktplatzes stecken. Wer wissen will, warum Kim-Bell, Kimseek, die Mycel-Karte und die Pinnwand überhaupt miteinander reden können, findet die Antwort an dieser Stelle.",
    "by": "@klaus",
    "url": "https://lausiklauskn-png.github.io/Sage-Protokol/",
    "img": "https://lausiklauskn-png.github.io/Sage-Protokol/assets/icon-512.png",
    "category": "Werkzeug",
    "own": true
  },
  {
    "label": "Mycel-Karte",
    "anchorId": "markt-mycel-karte",
    "text": "Lebende Netz-Karte des SBKIM-Mycels als installierbare Offline-App: zeigt die verbundenen Knoten als Kräfte-Graph und lässt echten Netz-Verkehr live aufleuchten. Reine Anzeige, sendet nie (Empfangsmodus). Netzwerk, Visualisierung, Karte, Knoten, Graph, PWA. Läuft offline im Browser, ohne Konto.",
    "text_en": "A living network map of the SBKIM mycelium as an installable offline app: it shows the connected nodes as a force graph and lets real network traffic light up live. Display only, it never sends (receive mode). Network, visualisation, map, node, graph, PWA. Runs offline in the browser, no account.",
    "vorstellung": [
      "Für alle, die sehen wollen, wie die Apps dieses Netzes einander finden",
      "Zeigt jede verbundene App als Punkt auf einer lebenden Karte",
      "Echter Netz-Verkehr leuchtet auf, während er läuft",
      "Aufgezeichnete Läufe abspielen, anhalten und Schritt für Schritt nachsehen",
      "Reine Anzeige, sie sendet selbst nie etwas ins Netz"
    ],
    "besonders": "Ein Tipp auf einen Knoten sagt, was die App von sich ankündigt, wie nah sie den anderen steht und woher diese Zahl kommt. So wird das SBKIM-Protokoll, über das die Apps einander finden, zum ersten Mal sichtbar.",
    "by": "@klaus",
    "url": "https://lausiklauskn-png.github.io/mycel-karte/",
    "img": "https://lausiklauskn-png.github.io/mycel-karte/icon-512.png",
    "category": "Werkzeug",
    "own": true
  },
  {
    "label": "Kim-Bell",
    "anchorId": "markt-kim-bell",
    "text": "Kim-Bell. Läute die Glocke und melde dich sauber im gemeinsamen Netz-Raum an. Installierbare App und kopierbare Vorlage für die server-lose SBKIM-Netz-Anmeldung (Rendezvous): eigene Identität direkt im Browser, privater Schlüssel bleibt lokal. Netzwerk, verbinden, anmelden, Knoten, Rendezvous, Vorlage. Läuft offline im Browser.",
    "text_en": "Kim-Bell. Ring the bell and announce yourself cleanly in the shared network room. An installable app and a copyable template for server-less SBKIM network sign-on (rendezvous): your own identity right in the browser, the private key stays local. Network, connecting, signing on, node, rendezvous, template. Runs offline in the browser.",
    "vorstellung": [
      "Für alle, die eine eigene App ans gemeinsame Netz anschließen wollen",
      "Meldet ein Gerät sauber im gemeinsamen Raum an",
      "Die eigene Identität entsteht im Browser, der private Schlüssel bleibt dort",
      "Ohne Server und ohne Konto",
      "Läuft offline im Browser"
    ],
    "besonders": "Kim-Bell ist die Vorarbeit für den Verbinden-Knopf in allen anderen Apps dieses Netzes und läuft trotzdem für sich allein. Wer den Weg nachbauen will, kopiert sie Zeile für Zeile.",
    "by": "@klaus",
    "url": "https://lausiklauskn-png.github.io/Kim-Bell/",
    "img": "https://lausiklauskn-png.github.io/Kim-Bell/icon-512.png",
    "category": "Werkzeug",
    "own": true,
    "sporeUrl": "https://lausiklauskn-png.github.io/Kim-Bell/sbkim/spore.json"
  },
  {
    "label": "Kimseek",
    "anchorId": "markt-kimseek",
    "text": "Kimseek, die semantische Bedeutungs-Suche als installierbare App: beschreib in eigenen Worten, was du suchst, und finde Treffer nach Sinn statt nach Stichwörtern. Optional Sprach- und Bild-Eingabe sowie eine KI-Brücke. Zugleich eigener Netz-Knoten. Suchen, finden, Bedeutung, Sprachsuche, semantisch, Wissen. Läuft im Browser, Schlüssel bleibt lokal.",
    "text_en": "Kimseek, semantic meaning-based search as an installable app: describe in your own words what you are looking for and find results by sense instead of by keywords. Optional speech and image input plus an AI bridge. Also a network node in its own right. Searching, finding, meaning, voice search, semantic, knowledge. Runs in the browser, the key stays local.",
    "vorstellung": [
      "Für alle, die nach Sinn suchen statt nach Stichwörtern",
      "Beschreib in eigenen Worten, was du suchst",
      "Findet auch, was dasselbe meint und anders heißt",
      "Sprache und Bild als Eingabe, dazu eine KI-Brücke",
      "Läuft im Browser, dein Schlüssel bleibt bei dir"
    ],
    "besonders": "Die Bedeutungs-Suche. Sie vergleicht den Sinn statt der Buchstaben, mit derselben Technik, über die sich auch die Apps dieses Netzes gegenseitig finden.",
    "by": "@klaus",
    "url": "https://lausiklauskn-png.github.io/Kimseek/",
    "img": "https://lausiklauskn-png.github.io/Kimseek/icon-512.png",
    "category": "Werkzeug",
    "own": true,
    "sporeUrl": "https://raw.githubusercontent.com/lausiklauskn-png/Kimseek/main/sbkim/spore.json"
  },
  {
    "label": "Kimboard",
    "anchorId": "markt-kimboard",
    "text": "Kimboard, die semantische Pinnwand als installierbare App: Fragen und Notizen an ein geteiltes Brett heften, Antworten kommen geräteübergreifend zurück und werden nach Bedeutung sortiert. Optional privates, verschlüsseltes Brett. Notizen, merken, Pinnwand, Ideen, Zettel, Fragen. Läuft server-los im Browser, Schlüssel bleibt lokal.",
    "text_en": "Kimboard, a semantic pinboard as an installable app: pin questions and notes to a shared board, answers come back across devices and are sorted by meaning. Optionally a private, encrypted board. Notes, remembering, pinboard, ideas, slips, questions. Runs server-less in the browser, the key stays local.",
    "vorstellung": [
      "Für alle, die Fragen und Notizen von mehreren Geräten aus ablegen wollen",
      "Zettel an ein gemeinsames Brett heften",
      "Antworten kommen zurück und stehen nach Bedeutung sortiert",
      "Ein eigenes, verschlüsseltes Brett ist möglich",
      "Läuft ohne eigenen Server, dein Schlüssel bleibt bei dir"
    ],
    "besonders": "Die Pinnwand sortiert nach Bedeutung. Wer viel anheftet, findet die passende Antwort wieder, ohne die richtige Frage noch einmal zu tippen.",
    "by": "@klaus",
    "url": "https://lausiklauskn-png.github.io/Kimboard/",
    "img": "https://lausiklauskn-png.github.io/Kimboard/icon-512.png",
    "category": "Werkzeug",
    "own": true,
    "sporeUrl": "https://raw.githubusercontent.com/lausiklauskn-png/Kimboard/main/sbkim/spore.json"
  },
  {
    "label": "Private Brain",
    "anchorId": "markt-privat-brain",
    "text": "Private Brain, dein privates, offline betriebenes zweites Gehirn: lass einmal all deine eigenen Daten (Mails, Dokumente, Fotos, Notizen) durchlaufen. Die App liest jede Datei nur einmal, merkt sich einen kleinen Bedeutungs-Katalog und lässt die Originale unberührt. Liest nur, schlägt vor, bewegt nichts. Danach semantische, kombinierende Suche über gemischte Daten. Wissen, Archiv, Dokumente, Notizen, Suche, zweites Gehirn, privat, offline. Läuft im Browser, kein großes Unternehmen dahinter.",
    "text_en": "Private Brain, your private, offline second brain: run all your own data through it once (mail, documents, photos, notes). The app reads each file only once, keeps a small catalogue of meaning and leaves the originals untouched. It only reads, it suggests, it moves nothing. After that: semantic, combining search across mixed data. Knowledge, archive, documents, notes, search, second brain, private, offline. Runs in the browser, with no big company behind it.",
    "vorstellung": [
      "Für alle, die ihre eigenen Daten wiederfinden wollen",
      "Mails, Dokumente, Fotos und Notizen einmal durchlaufen lassen",
      "Die App merkt sich einen kleinen Katalog und lässt die Originale liegen",
      "Danach suchen nach Sinn, quer über alles gemischt",
      "Läuft offline, kein großes Unternehmen dahinter"
    ],
    "besonders": "Liest nur, schlägt vor, bewegt nichts. Keine Datei wird verschoben, umbenannt oder gelöscht.",
    "by": "@klaus",
    "url": "https://lausiklauskn-png.github.io/Privat-Brain/",
    "img": "https://lausiklauskn-png.github.io/Privat-Brain/icon-512.png",
    "category": "Büro",
    "own": true,
    "sporeUrl": "https://lausiklauskn-png.github.io/Privat-Brain/sbkim/spore.json"
  },
  {
    "label": "WorkFloh",
    "anchorId": "markt-workfloh",
    "text": "WorkFloh, der digitale Auftragszettel für den Werbetechnik-Betrieb: von der Kundenannahme über die Produktion (Schilder, Folierung, Beschriftung, Druck) bis zur Übergabe, mit Zeiterfassung sowie Angebot und Rechnung. Installierbare Offline-PWA mit SBKIM-Siegel, eigener Netz-Knoten. Werbetechnik, Auftrag, Auftragszettel, Werkstatt, Handwerk, Schilder, Folierung, Beschriftung, Druck, Zeiterfassung, Angebot, Rechnung. Läuft server-los im Browser, Schlüssel bleibt lokal.",
    "text_en": "WorkFloh, the digital job sheet for a sign-making business: from taking the order through production (signs, vehicle wrapping, lettering, printing) to handover, with time tracking, quotes and invoices. An installable offline PWA with an SBKIM seal, a network node in its own right. Sign making, job, job sheet, workshop, trade, signs, wrapping, lettering, printing, time tracking, quote, invoice. Runs server-less in the browser, the key stays local.",
    "vorstellung": [
      "Für Werbetechnik-Betriebe und kleine Werkstätten",
      "Der Auftragszettel von der Annahme bis zur Übergabe",
      "Schilder, Folierung, Beschriftung und Druck im Blick",
      "Zeiterfassung, Angebot und Rechnung",
      "Läuft offline im Browser, ohne Server"
    ],
    "besonders": "Ein fertiger Auftrag geht mit einem Klick an die Buchhaltung BookLedgerPro. Nichts wird ein zweites Mal abgetippt.",
    "by": "@klaus",
    "url": "https://lausiklauskn-png.github.io/Mein-WorkFloh/",
    "img": "https://lausiklauskn-png.github.io/Mein-WorkFloh/icon-512.png",
    "category": "Büro",
    "own": true,
    "sporeUrl": "https://lausiklauskn-png.github.io/Mein-WorkFloh/sbkim/spore.json"
  },
  {
    "label": "PWA Toolpoint",
    "anchorId": "markt-pwa-toolpoint",
    "text": "PWA Toolpoint, der offene Marktplatz für installierbare Web-Apps: Werkzeuge und Apps nach Bedeutung finden, mit gemessenen Ladezeiten und ihrem Messdatum daneben — auch den schlechten. Zweite Instanz neben diesem Marktplatz, offen für alle statt für den engen Kreis. Zugleich eigener SBKIM-Knoten im Mycel, mit Siegel und eigener Identität. App-Verzeichnis, Marktplatz, Apps finden, Werkzeuge, Messwerte, Ladezeit, PWA, Knoten. Läuft offline im Browser.",
    "text_en": "PWA Toolpoint, the open marketplace for installable web apps: find tools and apps by meaning, with measured loading times and the date they were measured beside them — including the bad ones. A second instance alongside this marketplace, open to everyone instead of a close circle. Also an SBKIM node in the mycelium in its own right, with a seal and its own identity. App directory, marketplace, finding apps, tools, measurements, loading time, PWA, node. Runs offline in the browser.",
    "vorstellung": [
      "Für alle, die Apps suchen, die sofort im Browser laufen",
      "Offener Marktplatz, jeder kann eine App einreichen",
      "Gemessene Ladezeiten mit ihrem Messdatum daneben",
      "Zu jeder App eine eigene Seite mit Messverlauf und Mängeln",
      "Läuft offline im Browser"
    ],
    "besonders": "Die Messwerte stehen offen da, auch die schlechten. Jede Zahl trägt das Datum, an dem sie gemessen wurde.",
    "by": "@klaus",
    "url": "https://pwa-toolpoint.de/",
    "img": "https://pwa-toolpoint.de/assets/icon-512.png",
    "category": "Werkzeug",
    "own": true,
    "sporeUrl": "https://pwa-toolpoint.de/sbkim/spore.json"
  },
  {
    "label": "Auslieferungsprüfer",
    "anchorId": "markt-auslieferungspruefer",
    "text": "Auslieferungsprüfer: sieh nach, was eine fertige Seite oder Datei wirklich nach außen gibt, bevor sie online geht. Findet Zeilen, die etwas von einem fremden Rechner holen, vergessene Platzhalter aus der Bauzeit, Bilder ohne Beschreibung, Links, die nirgendwohin führen, und fehlende Sprachangaben — dazu Personenbezug und offen mitgelieferte Geheimnisse. Fünf Eingänge: Datei, Text, Adresse, Ordner und E-Mail. Zugleich eigener SBKIM-Knoten mit eigenem Siegel. Prüfen, Datenschutz, Sicherheit, Befund, Auslieferung, Webseite prüfen, Datenleck. Läuft im Browser, nichts wird hochgeladen.",
    "text_en": "Delivery Checker: see what a finished page or file really hands out before it goes online. It finds lines that fetch something from someone else's machine, forgotten placeholders from build time, images without a description, links that lead nowhere and missing language declarations — plus personal data and secrets shipped in the open. Five ways in: file, text, address, folder and email. Also an SBKIM node with a seal of its own. Checking, privacy, security, findings, delivery, checking a website, data leak. Runs in the browser, nothing is uploaded.",
    "vorstellung": [
      "Für alle, die eine Seite oder Datei vor der Veröffentlichung prüfen wollen",
      "Findet Zeilen, die heimlich etwas von fremden Rechnern holen",
      "Findet vergessene Platzhalter, Bilder ohne Beschreibung und tote Links",
      "Meldet Personenbezug und offen mitgelieferte Schlüssel",
      "Läuft im Browser, nichts wird hochgeladen"
    ],
    "besonders": "Er ist in die App-Seiten von PWA Toolpoint eingebaut. Ein Klick auf „Prüf es selbst\" öffnet ihn mit der Adresse der App, die gerade davorsteht.",
    "by": "@klaus",
    "url": "https://pwa-toolpoint.de/auslieferungspruefer.html",
    "img": "https://pwa-toolpoint.de/assets/pruefer-karte.png",
    "category": "Sicherheit",
    "own": true,
    "sporeUrl": "https://pwa-toolpoint.de/sbkim/pruefer-spore.json"
  },
  /* Klaus 2026-09-17: „gleich hinter dem Auslieferungsprüfer". Hier ist die
     Reihenfolge Handarbeit, also steht die Schulung wörtlich dahinter. Kein
     Knoten, deshalb keine sporeUrl. Kein Preis, kein Versprechen von
     Rechtskonformität — die Karte sagt „Vorlage", nicht „konform". */
  {
    "label": "KI-Schulung nach Art. 4 EU AI Act",
    "anchorId": "markt-ki-schulung",
    "text": "KI-Schulung nach Art. 4 EU AI Act: eine Schulungs-Unterlage für Firmen zur KI-Kompetenz. Zehn Abschnitte (was ein KI-System ist, Datenschutz, Urheberrecht, Diskriminierung, Transparenz, verbotene und Hochrisiko-Anwendungen, sicherer Umgang, betriebliche Regeln, Dokumentation), ein Wissenstest mit 15 Fragen und Auswertung im Browser, eine Bescheinigung zum Ausdrucken und ein Lösungsschlüssel für die Schulungsleitung. Eine einzige Datei, läuft offline, nichts wird hochgeladen. Eine Vorlage für die eigene Schulung — keine Rechtsberatung, kein amtliches Zertifikat, ersetzt keine Einzelfallprüfung. Auf Deutsch. Mitarbeiter schulen, KI-Kompetenz nachweisen, KI-Verordnung, Schulungsnachweis, Bescheinigung, Wissenstest, Vorlage.",
    "text_en": "AI training under Art. 4 EU AI Act: a training document for companies on AI literacy. Ten sections (what an AI system is, data protection, copyright, discrimination, transparency, prohibited and high-risk uses, safe use, company rules, documentation), a knowledge test with 15 questions scored in the browser, a printable certificate and an answer key for the trainer. One single file, runs offline, nothing is uploaded. A template for your own training — not legal advice, not an official certificate, no substitute for a case-by-case review. In German. Train staff, document AI literacy, AI regulation, training record, certificate, knowledge test, template.",
    "vorstellung": [
      "Für Firmen, die ihre Mitarbeiter nach Art. 4 EU AI Act schulen müssen",
      "Zehn Abschnitte von Datenschutz bis Hochrisiko-Anwendungen",
      "Wissenstest mit 15 Fragen, Auswertung im Browser",
      "Bescheinigung zum Ausdrucken, dazu ein Lösungsschlüssel für die Schulungsleitung",
      "Artikel 4 verlangt kein amtliches Zertifikat: die Vorlage ist für die eigene Schulung gedacht"
    ],
    "besonders": "Eine einzige Datei bringt alles mit: Schulung, Test und Auswertung laufen offline im Browser. Kein Ergebnis verlässt das Gerät, die Seite ruft nichts von außen ab.",
    "by": "@klaus",
    "url": "https://family-projekt.de/werkzeuge/ki-schulung.html",
    "img": "https://family-projekt.de/assets/appicons/ki-schulung.png",
    "category": "Vorlage",
    "own": true
  },
  {
    "label": "Kim Hub Company",
    "anchorId": "markt-kim-hub-company",
    "text": "Kim Hub Company, die Werkstatt im Browser: acht Rollen mit Namen arbeiten nacheinander an einem Auftrag — vorschlagen, bauen, prüfen, Fehler suchen, aufschreiben. Heraus kommt ein Übergabe-Blatt, das man an ein großes Modell weitergeben kann. Läuft auf dem eigenen KI-Zugang (BYOK), mit einem Deckel je Schicht und einem Fahrtenbuch, das jede Fahrt mit ihren Kosten festhält, auch die abgebrochene. Zugleich eigener SBKIM-Knoten. Werkstatt, Agenten, Auftrag, Werkzeug bauen, Konferenz, Protokoll, KI. Der Schlüssel bleibt im Browser.",
    "text_en": "Kim Hub Company, a workshop in the browser: eight named roles work on a job one after another — proposing, building, checking, hunting for mistakes, writing it down. Out comes a handover sheet you can pass to a large model. It runs on your own AI access (BYOK), with a cap per shift and a logbook that records every run and what it cost, including the ones that were cut short. Also an SBKIM node in its own right. Workshop, agents, job, building tools, conference, record, AI. The key stays in the browser.",
    "vorstellung": [
      "Für alle, die eine Aufgabe von mehreren KI-Rollen bearbeiten lassen wollen",
      "Acht Rollen mit Namen: vorschlagen, bauen, prüfen, Fehler suchen, aufschreiben",
      "Heraus kommt ein Übergabe-Blatt für ein großes Modell",
      "Läuft auf deinem eigenen KI-Zugang",
      "Der Schlüssel bleibt im Browser"
    ],
    "besonders": "Der Deckel und das Fahrtenbuch. Vor jeder Schicht steht, was sie höchstens kosten darf, und danach steht da, was sie wirklich gekostet hat, auch bei einem Abbruch.",
    "by": "@klaus",
    "url": "https://lausiklauskn-png.github.io/kim-hub-company/",
    "img": "https://lausiklauskn-png.github.io/kim-hub-company/icons/kimhub-512.png",
    "category": "Werkzeug",
    "own": true,
    "sporeUrl": "https://lausiklauskn-png.github.io/kim-hub-company/sbkim/spore.json"
  },
  // FP_LISTINGS_INSERT_HERE — freigabe.php fügt freigegebene Einträge hier ein
  // (davor, mit abschließendem Komma). Die Marke NICHT entfernen.
];
