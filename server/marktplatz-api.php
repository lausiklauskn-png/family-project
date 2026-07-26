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
