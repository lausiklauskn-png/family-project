<?php
/**
 * marktplatz-api.php — JSON-API fürs Marktplatz-Studio (Warteschlange im Studio).
 *
 * GESCHWISTER von freigabe.php: teilt sich DIESELBE freigabe-config.php
 * (GitHub-Token + warteschlange.jsonl) und dieselbe Commit-Logik. Damit
 * kann Klaus die eingereichten Apps direkt IM STUDIO (Langdruck aufs
 * Copyright) prüfen und freigeben — mit EINEM Studio-Passwort, ganz ohne
 * GitHub-Token im Browser. freigabe.php bleibt unberührt daneben nutzbar.
 *
 * Eine Warteschlange: einreichung.php füllt sie (POST vom Formular),
 * diese API + freigabe.php lesen/schreiben denselben Datensatz.
 *
 * EINRICHTEN (Webhosting, neben einreichung.php / freigabe.php):
 *   1. In freigabe-config.php EINE Zeile ergänzen:  'studio_key' => 'DEIN-STUDIO-PASSWORT',
 *   2. Diese Datei per WebFTP in denselben Ordner laden.
 *   3. Im Studio das Studio-Passwort eintragen → „Vom Server holen".
 *
 * Sicherheit: JEDE Aktion verlangt das studio_key-Passwort (hash_equals).
 * Der GitHub-Token liegt NUR in freigabe-config.php auf dem Server, NIE im
 * Repo/Browser. Kontakt-Anfragen (zweck:"kontakt") bleiben freigabe.php
 * vorbehalten — die API liefert nur App-Einreichungen.
 */

$cfgFile = __DIR__ . '/freigabe-config.php';
if (!is_file($cfgFile)) { http_response_code(500); header('Content-Type: application/json'); echo '{"ok":false,"error":"freigabe-config.php fehlt (siehe .example)"}'; exit; }
$CFG = require $cfgFile;
$STUDIO_KEY = isset($CFG['studio_key']) ? (string) $CFG['studio_key'] : '';

/* ---- CORS (wie einreichung.php; keine Cookies — Schutz über studio_key) ---- */
$ALLOW = isset($CFG['allow_origins']) && is_array($CFG['allow_origins']) ? $CFG['allow_origins'] : array(
  'https://family-projekt.de', 'https://www.family-projekt.de', 'https://lausiklauskn-png.github.io',
);
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
header('Access-Control-Allow-Origin: ' . (($origin && in_array($origin, $ALLOW, true)) ? $origin : '*'));
header('Vary: Origin');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

/* ---- Helfer ---- */
function out($arr, $code = 200) { http_response_code($code); echo json_encode($arr, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }
function body_json() { $j = json_decode(file_get_contents('php://input'), true); return is_array($j) ? $j : array(); }
function req($b, $k, $d = '') { if (isset($_REQUEST[$k])) return $_REQUEST[$k]; if (isset($b[$k])) return $b[$k]; return $d; }

$B = body_json();
function require_key($STUDIO_KEY, $B) {
  $key = (string) req($B, 'key', '');
  if ($STUDIO_KEY === '' || !hash_equals($STUDIO_KEY, $key)) out(array('ok' => false, 'error' => 'unauthorized'), 401);
}

/* ---- Warteschlange (identisch zu freigabe.php) ---- */
function load_queue($file) {
  $out = array();
  if (!is_file($file)) return $out;
  foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    $r = json_decode($line, true);
    if (is_array($r) && isset($r['id'])) $out[] = $r;
  }
  return $out;
}
function set_status($file, $id, $status) {
  if (!is_file($file)) return false;
  $fp = fopen($file, 'c+'); if (!$fp) return false;
  flock($fp, LOCK_EX);
  $lines = array(); rewind($fp);
  while (($line = fgets($fp)) !== false) {
    $line = rtrim($line, "\r\n"); if ($line === '') continue;
    $r = json_decode($line, true);
    if (is_array($r) && isset($r['id']) && $r['id'] === $id) { $r['status'] = $status; $line = json_encode($r, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); }
    $lines[] = $line;
  }
  ftruncate($fp, 0); rewind($fp); fwrite($fp, implode("\n", $lines) . "\n");
  flock($fp, LOCK_UN); fclose($fp);
  return true;
}

/* ---- GitHub-API (cURL, identisch zu freigabe.php) ---- */
function gh_request($CFG, $method, $path, $payload = null) {
  $ch = curl_init('https://api.github.com' . $path);
  curl_setopt_array($ch, array(
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HTTPHEADER => array(
      'Authorization: Bearer ' . $CFG['github_token'],
      'Accept: application/vnd.github+json',
      'X-GitHub-Api-Version: 2022-11-28',
      'User-Agent: family-projekt-marktplatz-api',
    ),
    CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 25,
  ));
  if ($payload !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
  $body = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
  return array($code, json_decode($body, true));
}
function gh_put_file($CFG, $repoPath, $contentB64, $message) {
  $api = '/repos/' . $CFG['github_owner'] . '/' . $CFG['github_repo'] . '/contents/' . $repoPath;
  list($c, $d) = gh_request($CFG, 'GET', $api . '?ref=' . rawurlencode($CFG['github_branch']));
  $payload = array('message' => $message, 'content' => $contentB64, 'branch' => $CFG['github_branch']);
  if ($c === 200 && isset($d['sha'])) $payload['sha'] = $d['sha'];
  list($c2, $d2) = gh_request($CFG, 'PUT', $api, $payload);
  if ($c2 >= 200 && $c2 < 300) return array(true, isset($d2['commit']['sha']) ? substr($d2['commit']['sha'], 0, 7) : 'ok');
  return array(false, 'PUT ' . $repoPath . ' → HTTP ' . $c2 . ' ' . (isset($d2['message']) ? $d2['message'] : ''));
}

$action = (string) req($B, 'action', '');

/* ============================ list ============================ */
if ($action === 'list') {
  require_key($STUDIO_KEY, $B);
  $items = array();
  foreach (load_queue($CFG['queue_file']) as $r) {
    if (isset($r['zweck']) && $r['zweck'] === 'kontakt') continue; // Kontakt bleibt freigabe.php
    $items[] = array(
      'id' => $r['id'], 'status' => isset($r['status']) ? $r['status'] : 'neu', 'ts' => isset($r['ts']) ? $r['ts'] : '',
      'label' => isset($r['label']) ? $r['label'] : '', 'text' => isset($r['text']) ? $r['text'] : '',
      'by' => isset($r['by']) ? $r['by'] : '', 'url' => isset($r['url']) ? $r['url'] : '',
      'img' => isset($r['img']) ? $r['img'] : '', 'category' => isset($r['category']) ? $r['category'] : '',
      'contact' => isset($r['contact']) ? $r['contact'] : '',
      // Stufe 2 (2026-08-02): der freiwillige Spore-Link des Anbieters. Ohne
      // diese Zeile kaeme er nie im Studio an, obwohl er eingereicht wurde.
      'sporeUrl' => isset($r['sporeUrl']) ? $r['sporeUrl'] : '',
    );
  }
  out(array('ok' => true, 'items' => $items));
}

/* ============================ setstatus ============================ */
if ($action === 'setstatus') {
  require_key($STUDIO_KEY, $B);
  $id = (string) req($B, 'id', '');
  $status = (string) req($B, 'status', '');
  $allowed = array('neu', 'geprueft', 'verdacht', 'freigegeben', 'abgelehnt', 'erledigt');
  if ($id === '' || !in_array($status, $allowed, true)) out(array('ok' => false, 'error' => 'bad_args'), 422);
  if (!set_status($CFG['queue_file'], $id, $status)) out(array('ok' => false, 'error' => 'not_found'), 404);
  out(array('ok' => true));
}

/* ============================ commit_listings (ganze Datei) ============================ */
if ($action === 'commit_listings') {
  require_key($STUDIO_KEY, $B);
  $content = (string) req($B, 'content', '');
  // Schutz: nie eine leere/kaputte Datei schreiben.
  if (strpos($content, 'window.FP_LISTINGS') === false) out(array('ok' => false, 'error' => 'content_invalid'), 422);
  list($ok, $info) = gh_put_file($CFG, $CFG['listings_path'], base64_encode($content), 'Studio: Marktplatz-Einträge aktualisiert');
  out($ok ? array('ok' => true, 'info' => $info) : array('ok' => false, 'error' => $info), $ok ? 200 : 502);
}

/* ============================ commit_vectors (Katalog-Spore Stufe 1) ============================ */
/*
 * Schwester von commit_listings, aber mit einem ANDEREN Schutz: dort genügt der
 * Blick auf "window.FP_LISTINGS", weil eine JS-Datei ankommt. Hier kommt JSON,
 * und ein leeres oder kaputtes Paket wäre besonders tückisch — die Leseseite in
 * markt.html ist fail-soft und würde es klaglos schlucken, nur eben ohne Nutzen.
 * Der Fehler fiele niemandem auf. Darum wird hier wirklich geprüft:
 *   - gültiges JSON,
 *   - ein Objekt "vectors" mit mindestens einem Eintrag,
 *   - "model" gesetzt (ohne Kennung verwirft die Leseseite später nichts mehr,
 *     auch wenn das Modell wechselt — der Wächter wäre still ausgehebelt).
 * Ziel-Pfad ist frei konfigurierbar, mit sinnvollem Standard: eine bestehende
 * freigabe-config.php funktioniert dadurch unverändert weiter.
 */
if ($action === 'commit_vectors') {
  require_key($STUDIO_KEY, $B);
  $content = (string) req($B, 'content', '');
  $pack = json_decode($content, true);
  if (!is_array($pack)) out(array('ok' => false, 'error' => 'content_not_json'), 422);
  if (!isset($pack['vectors']) || !is_array($pack['vectors']) || count($pack['vectors']) === 0) {
    out(array('ok' => false, 'error' => 'vectors_empty'), 422);
  }
  if (!isset($pack['model']) || !is_string($pack['model']) || $pack['model'] === '') {
    out(array('ok' => false, 'error' => 'model_missing'), 422);
  }
  $vecPath = isset($CFG['vectors_path']) && $CFG['vectors_path'] !== ''
    ? (string) $CFG['vectors_path'] : 'assets/config/listings-vec.json';
  list($ok, $info) = gh_put_file($CFG, $vecPath, base64_encode($content), 'Studio: Marktplatz-Vektoren aktualisiert');
  out($ok ? array('ok' => true, 'info' => $info, 'count' => count($pack['vectors'])) : array('ok' => false, 'error' => $info), $ok ? 200 : 502);
}

/* ============================ commit_wache (Quittungen des Wächters) ============================ */
/*
 * Schwester von commit_listings, aber mit dem SCHÄRFSTEN Prüfer von allen —
 * denn hier geht es um die Ampel, die einen Eintrag öffentlich sperren kann.
 *
 * Warum es diese Aktion überhaupt gibt (2026-08-03): das gelbe „Inhalt hat sich
 * geändert" steht öffentlich auf der Karte, verschwindet nie von selbst, und war
 * ohne Datei-Bearbeitung nicht loszuwerden. Der Betreiber konnte eine Warnung
 * über die eigene Seite nicht abstellen — und gewöhnt sich dann an, alle
 * Warnungen zu übersehen.
 *
 * Die Grenze bleibt aber hart: über diesen Weg darf NUR quittiert werden.
 *   - GESETZT werden dürfen je Eintrag ausschliesslich "gesehen" (eine
 *     Hex-Prüfsumme) und "gesehen_am" (das Datum der Durchsicht, reine
 *     Beschriftung),
 *   - "ampel", "grund" und alles andere dürfen nur BYTEGLEICH durchgereicht
 *     werden, so wie sie schon in der Datei stehen. Eine Sperre soll niemand
 *     aus dem Browser setzen oder lösen; wer rot/grün schalten will,
 *     bearbeitet die Datei weiterhin von Hand.
 *   - Schlüssel müssen wie eine anchorId aussehen; "_hinweis" bleibt erlaubt,
 *     damit die Erklärung in der Datei nicht verloren geht.
 *
 * NACHTRAG 2026-08-09 — hier stand vorher etwas Falsches. Der Satz lautete:
 * „das Studio schickt einen bestehenden Eintrag unverändert mit, und genau das
 * lehnt der Prüfer ab, wenn jemand daran gedreht hat." Der Prüfer lehnte in
 * Wahrheit JEDES fremde Feld ab, auch ein unverändertes — sobald also eine
 * einzige Sperre von Hand in der Datei stand, wäre jedes weitere Quittieren
 * aus dem Studio gescheitert. Nicht wegen der neuen Quittung, sondern wegen
 * der alten Sperre. Jetzt wird wirklich verglichen (siehe $vorhanden unten).
 */
if ($action === 'commit_wache') {
  require_key($STUDIO_KEY, $B);
  $content = (string) req($B, 'content', '');
  if (strlen($content) > 64000) out(array('ok' => false, 'error' => 'too_large'), 422);
  $data = json_decode($content, true);
  if (!is_array($data)) out(array('ok' => false, 'error' => 'content_not_json'), 422);
  $wachePath = isset($CFG['wache_path']) && $CFG['wache_path'] !== ''
    ? (string) $CFG['wache_path'] : 'assets/config/wache-hand.json';

  /* Die VORHANDENE Fassung holen (Nachtrag 2026-08-09).
   *
   * Der Kommentar oben behauptete: „das Studio schickt einen bestehenden
   * Eintrag mit ampel unveraendert mit, und genau das lehnt der Pruefer ab,
   * wenn jemand daran gedreht hat." Der zweite Halbsatz stimmte nicht — die
   * Schleife lehnte JEDES fremde Feld ab, auch ein unveraendertes. Folge:
   * sobald in der Datei eine einzige Sperre von Hand steht, scheitert JEDES
   * weitere Quittieren aus dem Studio mit field_not_allowed. Nicht wegen der
   * neuen Quittung, sondern wegen der alten Sperre.
   *
   * Jetzt wird verglichen. Der Browser kann damit weiterhin NICHTS setzen und
   * nichts loesen — nur unveraendert durchreichen. Faellt der Abruf aus,
   * bleibt $vorhanden leer und es gilt wieder die alte, strenge Regel:
   * fail-closed, nie fail-open. */
  $vorhanden = array();
  $api_w = '/repos/' . $CFG['github_owner'] . '/' . $CFG['github_repo'] . '/contents/' . $wachePath;
  list($vc, $vd) = gh_request($CFG, 'GET', $api_w . '?ref=' . rawurlencode($CFG['github_branch']));
  if ($vc === 200 && isset($vd['content'])) {
    $roh = base64_decode(str_replace(array("\n", "\r"), '', (string) $vd['content']));
    $tmp = json_decode($roh, true);
    if (is_array($tmp)) $vorhanden = $tmp;
  }

  $n = 0;
  foreach ($data as $id => $eintrag) {
    if ($id === '_hinweis') { if (!is_string($eintrag)) out(array('ok' => false, 'error' => 'hinweis_invalid'), 422); continue; }
    if (!preg_match('~^[a-z0-9-]{3,64}$~', (string) $id)) out(array('ok' => false, 'error' => 'bad_key'), 422);
    if (!is_array($eintrag)) out(array('ok' => false, 'error' => 'entry_invalid'), 422);
    $alt = (isset($vorhanden[$id]) && is_array($vorhanden[$id])) ? $vorhanden[$id] : array();
    foreach ($eintrag as $feld => $wert) {
      if ($feld === 'gesehen') {
        if (!is_string($wert) || !preg_match('~^[0-9a-f]{8,64}$~', $wert)) out(array('ok' => false, 'error' => 'bad_checksum'), 422);
        continue;
      }
      /* Das Datum der Durchsicht. Reine Beschriftung — es entscheidet nichts,
       * darum genuegt die strenge Form. */
      if ($feld === 'gesehen_am') {
        if (!is_string($wert) || !preg_match('~^\d{4}-\d{2}-\d{2}$~', $wert)) out(array('ok' => false, 'error' => 'bad_date'), 422);
        continue;
      }
      // Alles Uebrige nur, wenn es BYTEGLEICH schon dort steht.
      if (!array_key_exists($feld, $alt) || $alt[$feld] !== $wert) out(array('ok' => false, 'error' => 'field_not_allowed'), 422);
    }
    $n++;
  }
  list($ok, $info) = gh_put_file($CFG, $wachePath, base64_encode($content), 'Studio: Wächter-Quittungen aktualisiert');
  out($ok ? array('ok' => true, 'info' => $info, 'count' => $n) : array('ok' => false, 'error' => $info), $ok ? 200 : 502);
}

/* ============================ commit_image (Bild ins Depot) ============================ */
if ($action === 'commit_image') {
  require_key($STUDIO_KEY, $B);
  $path = (string) req($B, 'path', '');
  $b64 = (string) req($B, 'base64', '');
  if (!preg_match('~^assets/apps/[A-Za-z0-9._-]+\.(png|jpg|jpeg|webp)$~', $path) || $b64 === '') out(array('ok' => false, 'error' => 'bad_path'), 422);
  list($ok, $info) = gh_put_file($CFG, $path, $b64, 'Studio: Bild ' . $path . ' hochgeladen (Marktplatz)');
  out($ok ? array('ok' => true, 'info' => $info) : array('ok' => false, 'error' => $info), $ok ? 200 : 502);
}

/* ============================ fetch (Quellcode holen, Phase 2 KI-Prüfung) ============================ */
if ($action === 'fetch') {
  require_key($STUDIO_KEY, $B);
  $url = trim((string) req($B, 'url', ''));
  if (!preg_match('~^https://~i', $url)) out(array('ok' => false, 'error' => 'url_must_be_https'), 422);
  $maxKb = isset($CFG['fetch_max_kb']) ? (int) $CFG['fetch_max_kb'] : 800;
  $ctx = stream_context_create(array('http' => array('method' => 'GET', 'timeout' => 12, 'ignore_errors' => true, 'header' => "User-Agent: family-projekt-marktplatz-pruefung/1.0\r\n")));
  $data = @file_get_contents($url, false, $ctx, 0, $maxKb * 1024);
  if ($data === false) out(array('ok' => false, 'error' => 'fetch_failed'), 502);
  out(array('ok' => true, 'url' => $url, 'bytes' => strlen($data), 'source' => $data));
}

out(array('ok' => false, 'error' => 'unknown_action'), 400);
