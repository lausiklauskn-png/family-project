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
 * Personal access tokens → Fine-grained token, NUR Repo „family-project",
 * Rechte „Contents: Read and write". Token hier eintragen.
 */
return [
  'github_token' => 'ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  'github_owner' => 'lausiklauskn-png',
  'github_repo'  => 'family-project',
  'github_branch'=> 'main',
  'listings_path'=> 'assets/config/listings.js',
  // Absenderadresse für Ablehnungs-Mails (Adresse auf DIESER Maschine).
  'mail_from'    => 'noreply@family-projekt.de',
  // Muss auf dieselbe Warteschlange zeigen wie einreichung.php.
  'queue_file'   => __DIR__ . '/warteschlange.jsonl',
];
