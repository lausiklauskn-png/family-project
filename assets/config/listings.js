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
    "by": "@klaus",
    "url": "https://lausiklauskn-png.github.io/Mein-Rezeptbuch-Page/",
    "appUrl": "https://lausiklauskn-png.github.io/Mein-Rezeptbuch/",
    "img": "https://lausiklauskn-png.github.io/Mein-Rezeptbuch/icons/icon-book-blue-512.png",
    "category": "Küche",
    "own": true
  },
  {
    "label": "Mein Mixarium",
    "anchorId": "markt-mixarium",
    "text": "Getränke-Labor für Cocktails, Mocktails, Smoothies, Limonaden, Tees und Sirupe. Rezepte für Drinks sammeln, mischen und entdecken, mit und ohne Alkohol. Bar zuhause, trinken, Rezept, Mixgetränke. Offline nutzbar, kein Konto nötig.",
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
    "by": "@alis",
    "url": "https://lausiklauskn-png.github.io/Perfect-Skin-Fashion/",
    "img": "https://lausiklauskn-png.github.io/Perfect-Skin-Fashion/assets/logo-512.png",
    "category": "Mode & Design",
    "own": true
  },
  {
    "label": "Mycel-Karte",
    "anchorId": "markt-mycel-karte",
    "text": "Lebende Netz-Karte des SBKIM-Mycels als installierbare Offline-App: zeigt die verbundenen Knoten als Kräfte-Graph und lässt echten Netz-Verkehr live aufleuchten. Reine Anzeige, sendet nie (Empfangsmodus). Netzwerk, Visualisierung, Karte, Knoten, Graph, PWA. Läuft offline im Browser, ohne Konto.",
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
    "by": "@klaus",
    "url": "https://lausiklauskn-png.github.io/Mein-WorkFloh/",
    "img": "https://lausiklauskn-png.github.io/Mein-WorkFloh/icon-512.png",
    "category": "Büro",
    "own": true,
    "sporeUrl": "https://lausiklauskn-png.github.io/Mein-WorkFloh/sbkim/spore.json"
  },
  // FP_LISTINGS_INSERT_HERE — freigabe.php fügt freigegebene Einträge hier ein
  // (davor, mit abschließendem Komma). Die Marke NICHT entfernen.
];
