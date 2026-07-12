/* Marktplatz-Einträge (Apps/Seiten) = zugleich Such-Korpus.
 *
 * Schema pro Eintrag (Brief §4 + Sage-Such-Korpus-Schema {label,anchorId,text},
 * erweitert um Markt-Felder):
 *   {
 *     label:    anzeigbarer Titel,
 *     anchorId: opake ID (z.B. "markt-0001"),
 *     text:     Bedeutungs-Text für die Suche (mit Alltags-Synonymen),
 *     by:       Anbieter-Handle (KEIN Klarname / kein PII),
 *     url:      Link zur Anbieter-Seite (target=_blank rel=noopener),
 *     img:      PFLICHT — Bild-Link (https, JPG/PNG/WebP; KEIN SVG),
 *     category: optionale Kategorie
 *   }
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
window.FP_LISTINGS = [
  {
    label: "Mein Rezeptbuch",
    anchorId: "markt-rezeptbuch",
    text: "Rezeptbuch und Kochbuch für die Küche: eigene Rezepte sammeln, ordnen, suchen und kochen. Zutaten, Mengen, Einkaufsliste und Wochenplan / Menüplan. Läuft offline auf Handy und Tablet, ganz ohne Konto. Essen, Backen, Gerichte, Speisen, Mahlzeiten.",
    by: "@klaus",
    url: "https://lausiklauskn-png.github.io/Mein-Rezeptbuch/",
    img: "https://lausiklauskn-png.github.io/Mein-Rezeptbuch/icons/icon-book-blue-512.png",
    category: "Küche"
  },
  {
    label: "Mein Mixarium",
    anchorId: "markt-mixarium",
    text: "Getränke-Labor für Cocktails, Mocktails, Smoothies, Limonaden, Tees und Sirupe. Rezepte für Drinks sammeln, mischen und entdecken — mit und ohne Alkohol. Bar zuhause, trinken, Rezept, Mixgetränke. Offline nutzbar, kein Konto nötig.",
    by: "@klaus",
    url: "https://lausiklauskn-png.github.io/Mein-Mixarium/",
    img: "https://lausiklauskn-png.github.io/Mein-Mixarium/mixarium_icon.png",
    category: "Getränke"
  },
  {
    label: "BookLedgerPro",
    anchorId: "markt-bookledgerpro",
    text: "Buchhaltung und Kassenbuch für Selbstständige und kleine Betriebe: Belege, Rechnungen, Konten, Umsatzsteuer und EÜR. Offline-first und verschlüsselt, Geld und Finanzen im Blick behalten. Buchführung, Beleg, Rechnung schreiben, Steuer.",
    by: "@klaus",
    url: "https://lausiklauskn-png.github.io/BookLedgerPro/",
    img: "https://lausiklauskn-png.github.io/BookLedgerPro/assets/img/og-image.png",
    category: "Büro"
  },
  {
    label: "Mein Tresor",
    anchorId: "markt-mein-tresor",
    text: "Verschlüsselter Tresor für Dateien und Passwörter: alles sicher hinter Passwort und Schlüssel ablegen. Honigtopf-Tarnfach und Datei-Sicherung. Safe, Passwort-Manager, geheime Dateien, Datenschutz. Läuft offline im Browser, echte Verschlüsselung.",
    by: "@klaus",
    url: "https://lausiklauskn-png.github.io/Mein-Tresor/",
    img: "https://family-projekt.de/assets/apps/mein-tresor.png",
    category: "Sicherheit"
  },
  {
    label: "Jasons Tresor",
    anchorId: "markt-jasons-tresor",
    text: "Verschlüsselte Bibliothek für JSON-Dateien und Schlüssel: laden, benennen, ordnen, suchen und exportieren — mit Passwort-Verschlüsselung. Von außen ein Tresor, drinnen eine Bibliothek. Safe, Datei-Sammlung, Backup, Datenschutz. Offline im Browser.",
    by: "@klaus",
    url: "https://lausiklauskn-png.github.io/Jasons-Tresor/",
    img: "https://family-projekt.de/assets/apps/jasons-tresor.png",
    category: "Sicherheit"
  },
  {
    label: "Such-Werkzeug",
    anchorId: "markt-such-werkzeug",
    text: "Semantische Suche als kleines, frei bewegliches Werkzeug: beschreib in eigenen Worten, was du suchst — es versteht die Bedeutung, nicht nur Stichwörter. Findet in deinen Sachen, im Knotennetz und im Internet. Suchen, finden, Bedeutung, Sprachsuche.",
    by: "@klaus",
    url: "https://lausiklauskn-png.github.io/Sage-Protokol/such-tool/",
    img: "https://lausiklauskn-png.github.io/Sage-Protokol/such-tool/icon-512.png",
    category: "Werkzeug"
  },
  {
    label: "Pinnwand",
    anchorId: "markt-pinnwand",
    text: "Semantische Pinnwand für Notizen und Schnipsel: kleine Zettel anheften und nach Bedeutung wiederfinden. Ideen sammeln, merken, ordnen. Notizzettel, Memo, Gedanken festhalten. Läuft offline im Browser, ohne Konto.",
    by: "@klaus",
    url: "https://lausiklauskn-png.github.io/Sage-Protokol/pinnwand/",
    img: "https://lausiklauskn-png.github.io/Sage-Protokol/pinnwand/icon-512.png",
    category: "Werkzeug"
  }
];
