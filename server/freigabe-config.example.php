<?php
/*
 * Family Projekt — Freigabe-Konfiguration (VORLAGE).
 *
 * KOPIEREN nach  freigabe-config.php  (ohne „.example") und ausfüllen.
 * Die echte freigabe-config.php gehört NUR auf den Server, NIE ins Repo
 * (der GitHub-Token ist ein Geheimnis). Die .htaccess sperrt den direkten
 * Abruf dieser Datei.
 *
 * GitHub-Token anlegen: github.com → Settings → Developer settings →
 * Personal access tokens → Fine-grained token, Repos „family-project" UND
 * „PWA-Toolpoint", Rechte „Contents: Read and write". Token hier eintragen.
 * (Seit 2026-08-09 bedient diese Konfiguration zwei Marktplätze — siehe
 * `ziele` unten. Ein Token nur für family-project liefert beim zweiten ein
 * 404, das wie ein Tippfehler aussieht.)
 */
return [
  'github_token' => 'ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  'github_owner' => 'lausiklauskn-png',
  'github_repo'  => 'family-project',
  'github_branch'=> 'main',
  'listings_path'=> 'assets/config/listings.js',
  // Ziel der vorberechneten Such-Vektoren (Studio-Knopf „Vektoren bauen").
  // Optional — fehlt die Zeile, nimmt marktplatz-api.php genau diesen Wert.
  'vectors_path' => 'assets/config/listings-vec.json',
  // Ziel der Wächter-Quittungen (Studio-Knopf „✓ Gesehen — Seite ist in
  // Ordnung"). Über diesen Weg kann NUR `gesehen` geschrieben werden; rot/grün
  // schalten bleibt Handarbeit in der Datei. Optional — fehlt die Zeile, nimmt
  // marktplatz-api.php genau diesen Wert.
  'wache_path'   => 'assets/config/wache-hand.json',
  // Absenderadresse für Ablehnungs-Mails (Adresse auf DIESER Maschine).
  'mail_from'    => 'noreply@family-projekt.de',
  // Muss auf dieselbe Warteschlange zeigen wie einreichung.php.
  'queue_file'   => __DIR__ . '/warteschlange.jsonl',

  // ── Für das Marktplatz-Studio (marktplatz-api.php) ──────────────────────
  // Studio-Passwort: schützt die Warteschlangen-API. Frei wählen, NUR hier auf
  // dem Server. Kommt später EINMAL ins Studio (bleibt dort nur im Browser).
  'studio_key'   => 'HIER-EIN-STUDIO-PASSWORT-WAEHLEN',
  // Erlaubte Herkünfte fürs Studio (CORS). Passt für family-projekt.de.
  'allow_origins'=> [
    'https://family-projekt.de', 'https://www.family-projekt.de',
    'https://pwa-toolpoint.de', 'https://www.pwa-toolpoint.de',
    'https://lausiklauskn-png.github.io',
  ],

  // ── Zwei Marktplätze über EINE API (Klaus 2026-08-09) ────────────────────
  // Die Werte oben (github_repo, listings_path) bleiben der Standard. Nennt
  // eine Anfrage ein `ziel`, überschreiben dessen Werte den Standard — sonst
  // ändert sich nichts, und ein Studio, das das Feld gar nicht kennt, läuft
  // unverändert weiter.
  //
  // `listings_marker` ist die Sicherung gegen eine kaputte Datei: die API
  // schreibt nur, wenn der erwartete Text wirklich drinsteht. Family Projekt
  // heißt FP_LISTINGS, PWA Toolpoint heißt PT_LISTINGS — ohne diese
  // Unterscheidung würde die Prüfung beim zweiten Repo immer scheitern.
  //
  // ⚠ DER TOKEN MUSS BEIDE REPOS ABDECKEN. Ein Fine-grained-Token, der nur
  // für family-project ausgestellt ist, liefert beim zweiten Marktplatz ein
  // 404, das wie ein Tippfehler im Pfad aussieht. Unter Settings → Developer
  // settings → Personal access tokens beide Repos anhaken, Rechte
  // „Contents: Read and write".
  'ziele' => [
    'family' => [
      'github_repo'     => 'family-project',
      'listings_path'   => 'assets/config/listings.js',
      'listings_marker' => 'window.FP_LISTINGS',
    ],
    'toolpoint' => [
      'github_repo'     => 'PWA-Toolpoint',
      'listings_path'   => 'assets/config/listings.js',
      'listings_marker' => 'window.PT_LISTINGS',
    ],
  ],
];
