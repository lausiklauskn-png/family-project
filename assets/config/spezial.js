/* Marktplatz Spezial für family-projekt.de (Klaus 2026-11-26).
 * Die Kennungen (id) sind dieselben wie in server/spezial/quellen.json und in den Passkeys.
 * Nie umbenennen: ein ausgegebener Passkey trägt sie unter seiner Unterschrift. */
window.SPEZIAL = {
  markt: "fp",
  dienst: "https://spezial.family-projekt.de",
  apps: [
    { id: "private-akte", name: "Private Akte Pro", bild: "assets/spezial/private-akte.png", text: "Alle Unterlagen, Kalender, Portemonnaie und Mail in einer App. Verschlüsselt auf deinem Gerät.", text_en: "All your papers, calendar, wallet and mail in one app. Encrypted on your device." },
    { id: "familienakte", name: "Familienakte Pro", bild: "assets/spezial/familienakte.png", text: "Die Akte der ganzen Familie: Tresor, Fristen, Kalender je Person, Suche nach Bedeutung.", text_en: "The whole family's file: vault, deadlines, a calendar per person, search by meaning." },
    { id: "privat-brain-pro", name: "Private Brain Pro", bild: "assets/spezial/privat-brain-pro.png", text: "Mail, Bedeutungssuche und Dateien auf dem eigenen Gerät. Liest nur, schlägt vor, bewegt nichts.", text_en: "Mail, search by meaning and files on your own device. Reads, suggests, moves nothing." },
    { id: "datei-organizer", name: "Datei-Organizer Pro", bild: "assets/spezial/datei-organizer.png", text: "Große Mengen Dateien einlesen und sortieren. Lernt aus jeder Korrektur.", text_en: "Read in and sort large amounts of files. Learns from every correction." },
    { id: "workflow-pdf-pro", name: "Workflow PDF Pro", bild: "assets/spezial/workflow-pdf-pro.png", text: "Scannen, PDF bearbeiten und zusammenfügen, mit Texterkennung.", text_en: "Scan, edit and merge PDFs, with text recognition." },
    { id: "bookledger-pro", name: "BookLedger Pro", bild: "assets/spezial/bookledger-pro.png", text: "Buchhaltung mit Kasse, Bank einlesen und Monatsabschluss.", text_en: "Bookkeeping with cash book, bank import and monthly closing." },
    { id: "familienbuero-pro", name: "Familienbüro Pro", bild: "assets/spezial/familienbuero-pro.png", text: "Briefe, Tabellen und Dokumente bearbeiten, mit ONLYOFFICE.", text_en: "Edit letters, spreadsheets and documents, with ONLYOFFICE." },
    // Klaus 2026-11-26: die nächsten Pro-Fassungen. „bald“: die Karte erscheint erst, wenn der Server eine Datei hat;
    // im Studio lassen sich schon Passkeys dafür ausgeben. Bild vorläufig das Symbol der Web-App, das Pro-Symbol folgt.
    { id: "rezeptbuch-pro", bald: true, name: "Mein Rezeptbuch Pro", bild: "assets/spezial/rezeptbuch-pro.png", text: "Rezepte sammeln, scannen und ordnen, mit Wochenplan und Einkaufsliste.", text_en: "Collect, scan and sort recipes, with weekly plan and shopping list." },
    { id: "mixarium-pro", bald: true, name: "Mein Mixarium Pro", bild: "assets/spezial/mixarium-pro.png", text: "Dein Getränke-Labor: Cocktails, Mocktails, Smoothies und mehr.", text_en: "Your drinks lab: cocktails, mocktails, smoothies and more." },
    { id: "pseudodoc-pro", bald: true, name: "PseudoDoc Pro", bild: "assets/spezial/pseudodoc-pro.png", text: "Dateien prüfen, pseudonymisieren, sicher weitergeben. Vor dem Öffnen prüfen, mit der KI arbeiten ohne Namen preiszugeben, bereinigt weitergeben. Alles auf dem Gerät.", text_en: "Check files, pseudonymise, share safely. Check before opening, work with AI without revealing names, share cleaned copies. All on your device." }
  ]
};
