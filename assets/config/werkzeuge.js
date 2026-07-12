/* Klaus' EIGENE Werkzeuge (Raum 2). Jedes hat eine eigene Landingpage unter
 * werkzeuge/<page>. Wechselbar ohne Code.
 *   open:    Link zum Öffnen/Starten (eigener Tab)
 *   install: Link/Hinweis zum Installieren (leer = nur öffnen)
 * Schema: { id, name, icon, de, en, page, open, install } */
window.FP_WERKZEUGE = [
  { id: "such", name: "Such-Werkzeug", icon: "🔍", iconImg: "assets/appicons/such.png",
    badge: { kind: "app", de: "PWA-App · zum Installieren", en: "PWA app · to install" },
    de: "Findet nach Bedeutung statt nach Stichwörtern — komplett im Browser, ohne Server, ohne Konto. Die reine App zum Installieren (ohne Netz-Anmeldung).",
    en: "Finds by meaning, not by keywords — fully in the browser, no server, no account. The plain app to install (without network sign-in).",
    page: "werkzeuge/such-werkzeug.html",
    open: "https://lausiklauskn-png.github.io/Sage-Protokol/such-tool/",
    install: "https://lausiklauskn-png.github.io/Sage-Protokol/such-tool/" },
  { id: "andock", name: "Ans Netz anschließen", icon: "🔗",
    de: "Hier anfangen: erst verstehen, was das Mycel ist (mit selbst-gravierendem Siegel), dann in der richtigen Reihenfolge Knoten erzeugen und andocken.",
    en: "Start here: first understand what the mycelium is (with a self-engraving seal), then create a node and dock in the right order.",
    page: "werkzeuge/andock-werkzeug.html",
    open: "netzwerk.html#andock",
    install: "" },
  { id: "knoten", name: "Deine App zum Knoten", icon: "🪢",
    de: "Schritt 2 — für Entwickler: die offenen SBKIM-Bausteine Datei für Datei in deine eigene PWA einbauen (Identität, Handshake, Status, Siegel).",
    en: "Step 2 — for developers: build the open SBKIM blocks into your own PWA file by file (identity, handshake, status, seal).",
    page: "werkzeuge/knoten-werkzeug.html",
    open: "https://lausiklauskn-png.github.io/SB-KIMTool-Point/web/tools/mycelknoten.html",
    install: "" },

  /* Klaus' EIGENE, öffentliche Apps (2026-06-27 freigeschaltet). external:true →
   * die Karte öffnet die LIVE-App direkt in einem neuen Tab (keine eigene
   * Zwischen-Landingpage nötig). Rezeptbuch/Mixarium verlinken auf ihre
   * Landingpages (Klaus 2026-07-07); Jasons Tresor + Mein Tresor sind auf Klaus'
   * ausdrücklichen Wunsch (2026-07-07) gelistet. BookLedgerPro/WorkFloh weiter nicht. */
  { id: "rezeptbuch", name: "Mein Rezeptbuch", icon: "📖", iconImg: "assets/appicons/rezeptbuch.png", external: true,
    de: "Rezepte sammeln, ordnen, kochen und teilen — mit Wochenplan, mehrsprachig, offline. Als App installierbar.",
    en: "Collect, organise, cook and share recipes — weekly plan, multilingual, offline. Installable as an app.",
    open: "https://lausiklauskn-png.github.io/Mein-Rezeptbuch-Page/" },
  { id: "mixarium", name: "Mein Mixarium", icon: "🍹", iconImg: "assets/appicons/mixarium.png", external: true,
    de: "Dein Getränke-Labor: Cocktails, Mocktails, Smoothies, Limonaden, Tees & Sirupe — mehrsprachig, offline.",
    en: "Your drinks lab: cocktails, mocktails, smoothies, lemonades, teas & syrups — multilingual, offline.",
    open: "https://lausiklauskn-png.github.io/Mein-Mixarium-Page/" },
  { id: "sage", name: "Sage-Protokoll", icon: "🍄", iconImg: "assets/appicons/sage.svg", external: true,
    de: "Die Mycel-Bibliothek und der Bau-Hub des Netzwerks — Glossar, Protokoll-Doku und Werkzeuge.",
    en: "The mycelium library and the build hub of the network — glossary, protocol docs and tools.",
    open: "https://lausiklauskn-png.github.io/Sage-Protokol/" },
  { id: "einladung", name: "Sage-Einladung", icon: "✉️", external: true,
    de: "Die bebilderte Einladung ins Mycel: was das Netzwerk ist, wie es gedacht ist und wie man mitmacht.",
    en: "The illustrated invitation into the mycelium: what the network is and how to join.",
    open: "https://lausiklauskn-png.github.io/Sage-Protokol/docs/einladung/" },
  { id: "kimtoolpoint", name: "SB-KIMTool-Point", icon: "🛰️", iconImg: "assets/appicons/point.png", external: true,
    de: "Der öffentliche Knoten-Punkt: Werkzeugkiste und Andock-Stelle, um eine eigene Seite ans Netzwerk zu bringen.",
    en: "The public node point: toolbox and docking station to bring your own site onto the network.",
    open: "https://lausiklauskn-png.github.io/SB-KIMTool-Point/" },
  { id: "jasonstresor", name: "Jasons Tresor", icon: "🔐", iconImg: "assets/appicons/jasons.svg", external: true,
    de: "Der verschlüsselte Daten-Tresor: JSON-Dateien und Schlüssel sicher laden, ordnen und mit Passwort schützen — offline, im Browser.",
    en: "The encrypted data vault: load, organise and password-protect JSON files and keys — offline, in the browser.",
    open: "https://lausiklauskn-png.github.io/Jasons-Tresor/" },
  { id: "meintresor", name: "Mein Tresor", icon: "🗝️", iconImg: "assets/appicons/meintresor.svg", external: true,
    de: "Der Dreh-Safe mit 20 Fächern: jedes Fach ein echter AES-Tresor mit eigenem Passwort — Tarnfach und Schlüssel-Teilung inklusive.",
    en: "The dial safe with 20 compartments: each one a real AES vault with its own password — decoy compartment and key splitting included.",
    open: "https://lausiklauskn-png.github.io/Mein-Tresor/" },
  { id: "pinnwand", name: "Pinnwand", icon: "📌", iconImg: "assets/appicons/pinnwand.png", external: true,
    badge: { kind: "app", de: "PWA-App · zum Installieren", en: "PWA app · to install" },
    de: "Ein offenes Frage-Antwort-Brett: Antworten lassen sich nach Bedeutung sortieren (gratis, als Rangfolge) — optional versteht ein KI-Richter die Absicht, z. B. alkoholfrei = wirklich kein Alkohol. Im Browser, ohne Konto. Die reine App zum Installieren (ohne Netz-Anmeldung).",
    en: "An open question-and-answer board: answers can be sorted by meaning (free, as a ranking) — optionally an AI judge grasps intent, e.g. alcohol-free = really no alcohol. In the browser, no account. The plain app to install (without network sign-in).",
    open: "https://lausiklauskn-png.github.io/Sage-Protokol/pinnwand/" },

  /* Neue eigenständige SBKIM-Knoten-PWAs (2026-07-09): Kim-Bell, Kimseek und
   * Kimboard sind jeweils ein eigenes Repo mit eigener Live-URL. Kimseek ist das
   * Such-Werkzeug, Kimboard die Pinnwand — beide nun als vollwertige Endknoten;
   * Kim-Bell ist die „Mit dem Netz verbinden"-Glocke. external:true → öffnen die
   * Live-App direkt in einem neuen Tab. */
  { id: "kimbell", name: "Kim-Bell", icon: "🔔", iconImg: "assets/appicons/kimbell.png", external: true,
    badge: { kind: "node", de: "Eigener Knoten im Netz", en: "Its own node in the network" },
    de: "Die Netz-Glocke: melde dich mit einer eigenen, stabilen Identität sauber im gemeinsamen SBKIM-Raum an und finde andere Knoten — server-los im Browser.",
    en: "The network bell: sign in cleanly to the shared SBKIM room with your own stable identity and find other nodes — server-less, in the browser.",
    open: "https://lausiklauskn-png.github.io/Kim-Bell/" },
  { id: "kimseek", name: "Kimseek", icon: "🔍", iconImg: "assets/appicons/kimseek.png", external: true,
    badge: { kind: "node", de: "Eigener Knoten im Netz", en: "Its own node in the network" },
    de: "Dieselbe Suche wie das Such-Werkzeug — aber als eigener Knoten im Netz: findet nach Bedeutung, mit Sprache, Bild-/Handschrift-Erkennung und KI-Brücke, und kann selbst andere Knoten fragen.",
    en: "The same search as the Such-Werkzeug — but as its own node in the network: finds by meaning, with voice, image/handwriting recognition and an AI bridge, and can query other nodes itself.",
    open: "https://lausiklauskn-png.github.io/Kimseek/" },
  { id: "kimboard", name: "Kimboard", icon: "📌", iconImg: "assets/appicons/kimboard.png", external: true,
    badge: { kind: "node", de: "Eigener Knoten im Netz", en: "Its own node in the network" },
    de: "Dieselbe Pinnwand — aber als eigener Knoten im Netz: Fragen und Notizen an ein geteiltes Brett heften, geräteübergreifend, nach Bedeutung sortiert, verbunden mit anderen Knoten.",
    en: "The same pinboard — but as its own node in the network: pin questions and notes to a shared board, across devices, sorted by meaning, connected to other nodes.",
    open: "https://lausiklauskn-png.github.io/Kimboard/" },

  /* Referenz-Beispiele (2026-07-06, Klaus): eigene Seite mit live eingebetteten
   * Beispielen neu gebauter Internetseiten aus der Werkstatt. Erste Referenz:
   * Tomys Schaufenster. */
  { id: "referenzen", name: "Referenz-Beispiele", icon: "🖼️",
    de: "So sieht eine neu gebaute Internetseite aus: echte Beispiele aus der Werkstatt, live eingebettet — als Erstes Tomys Schaufenster.",
    en: "What a freshly built web page looks like: real examples from the workshop, embedded live — starting with Tomy's showcase.",
    page: "referenzen.html",
    open: "referenzen.html",
    install: "" }
];
