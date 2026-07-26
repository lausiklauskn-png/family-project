<?php
/**
 * marktplatz-api.php — Prüf- & Freigabe-Warteschlange für den family-projekt.de-Marktplatz.
 *
 * FRISCH & EIGENSTÄNDIG: rührt deine bestehende einreichung.php (E-Mail) NICHT an.
 * Diese Datei SPEICHERT eingereichte Apps + LISTET sie (passwortgeschützt) fürs Studio +
 * markiert sie erledigt (freigegeben/verworfen). Optional holt sie fremden App-Quellcode
 * für die spätere KI-Prüfung (Phase 2).
 *
 * ── EINMALIG auf dem Server einstellen (nur die 5 Zeilen unter „KONFIG") ──
 *  1) $ADMIN_KEY  = ein selbst gewähltes Passwort (kommt später ins Studio, NICHT ins Repo).
 *  2) $DATA_DIR   = ein Ordner, in dem die Einreichungen liegen (wird angelegt, per .htaccess gesperrt).
 *  3) $ALLOW_ORIGINS = die Adressen deiner Seite (Standard passt für family-projekt.de).
 *  4) $FORWARD_URL = optional: deine einreichung.php, damit die E-Mail weiter kommt.
 *  5) Datei neben einreichung.php hochladen. Fertig.
 *
 * Sicherheit: das Auflisten/Ändern/Holen verlangt IMMER das Passwort ($ADMIN_KEY).
 * Das öffentliche „submit" braucht KEIN Passwort (Besucher reichen ein), speichert aber nur
 * geprüfte, gedeckelte Felder; Bilder werden NUR als https-Link gespeichert (kein Datei-Upload,
 * kein SVG). Kontakt-Mail wird gespeichert, aber NUR übers passwortgeschützte „list" ausgegeben.
 */

/* ============================ KONFIG (hier anpassen) ============================ */
$ADMIN_KEY     = 'HIER-DEIN-STUDIO-PASSWORT-EINTRAGEN';           // <- ändern!
$DATA_DIR      = __DIR__ . '/marktplatz-data';                    // Speicherordner (wird angelegt)
$ALLOW_ORIGINS = array(                                           // erlaubte Herkünfte
  'https://family-projekt.de',
  'https://www.family-projekt.de',
  'https://lausiklauskn-png.github.io',
);
$FORWARD_URL   = ''; // LEER lassen, wenn dein Formular schon direkt an einreichung.php mailt
                     // (sonst käme die E-Mail doppelt). Nur setzen, wenn das Formular NUR an
                     // diese API schickt und die Mail von hier ausgelöst werden soll.
$MAX_SOURCE_KB = 800;                                             // Kappe fürs Quellcode-Holen (Phase 2)
/* ============================================================================== */

/* ---- CORS (ohne Cookies/Anmeldung; Admin-Aktionen sind per Passwort gesichert) ---- */
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if ($origin && in_array($origin, $ALLOW_ORIGINS, true)) {
  header('Access-Control-Allow-Origin: ' . $origin);
} else {
  header('Access-Control-Allow-Origin: *');
}
header('Vary: Origin');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

/* ---- Helfer ---- */
function out($arr, $code = 200) { http_response_code($code); echo json_encode($arr, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }
function body_json() { $raw = file_get_contents('php://input'); $j = json_decode($raw, true); return is_array($j) ? $j : array(); }
function s($v, $max = 600) { $v = is_string($v) ? trim($v) : ''; if (strlen($v) > $max) $v = substr($v, 0, $max); return $v; }
function is_https($u) { return is_string($u) && preg_match('~^https://~i', $u); }
function is_img($u) { return is_https($u) && !preg_match('~\.svg(\?|$)~i', $u); }
function num_ok($n) { return preg_match('~^\d{1,9}$~', (string)$n); }

/* ---- Datenordner sicherstellen + gegen Auflisten sperren ---- */
function ensure_dir($dir) {
  if (!is_dir($dir)) { @mkdir($dir, 0775, true); }
  if (!is_dir($dir . '/archiv')) { @mkdir($dir . '/archiv', 0775, true); }
  $ht = $dir . '/.htaccess';
  if (!file_exists($ht)) { @file_put_contents($ht, "Require all denied\nDeny from all\n"); }
  $idx = $dir . '/index.html';
  if (!file_exists($idx)) { @file_put_contents($idx, ''); }
}
ensure_dir($DATA_DIR);

function require_key($ADMIN_KEY) {
  $key = isset($_REQUEST['key']) ? $_REQUEST['key'] : '';
  if (!$key) { $b = body_json(); if (isset($b['key'])) $key = $b['key']; }
  if (!is_string($key) || !hash_equals($ADMIN_KEY, $key)) { out(array('ok' => false, 'error' => 'unauthorized'), 401); }
}

function next_number($DATA_DIR) {
  $max = 0;
  foreach (array($DATA_DIR, $DATA_DIR . '/archiv') as $d) {
    foreach (@glob($d . '/*.json') ?: array() as $f) {
      $n = (int) basename($f, '.json');
      if ($n > $max) $max = $n;
    }
  }
  return $max + 1;
}

$action = isset($_REQUEST['action']) ? $_REQUEST['action'] : '';

/* ============================ ÖFFENTLICH: submit ============================ */
if ($action === 'submit') {
  $b = body_json();
  // Honigtopf: Bots füllen versteckte Felder → still „ok" (nichts speichern).
  if (!empty($b['fp_hp_url'])) { out(array('ok' => true, 'nummer' => null)); }

  $label = s($b['label'] ?? '', 80);
  $text  = s($b['text'] ?? ($b['beschreibung'] ?? ''), 600);
  $url   = s($b['url'] ?? '', 300);
  $img   = s($b['img'] ?? '', 300);
  $by    = s($b['by'] ?? ($b['kuerzel'] ?? ''), 40);
  $cat   = s($b['category'] ?? ($b['kategorie'] ?? ''), 40);
  $contact = s($b['contact'] ?? ($b['kontakt'] ?? ''), 120);
  $tags  = array();
  if (isset($b['tags']) && is_array($b['tags'])) { foreach ($b['tags'] as $t) { $t = s($t, 30); if ($t !== '') $tags[] = $t; } }

  if ($label === '' || $text === '') out(array('ok' => false, 'error' => 'label_or_text_missing'), 422);
  if (!is_https($url)) out(array('ok' => false, 'error' => 'url_must_be_https'), 422);
  if (!is_img($img))   out(array('ok' => false, 'error' => 'img_must_be_https_no_svg'), 422);

  $n = next_number($DATA_DIR);
  $rec = array(
    'nummer'   => $n,
    'status'   => 'neu',
    'ts'       => gmdate('c'),
    'label'    => $label, 'text' => $text, 'by' => $by,
    'url'      => $url, 'img' => $img, 'category' => $cat,
    'tags'     => array_slice($tags, 0, 12),
    'contact'  => $contact,
    'ip'       => substr(preg_replace('~[^0-9a-f:.]~i', '', $_SERVER['REMOTE_ADDR'] ?? ''), 0, 45),
  );
  $file = $DATA_DIR . '/' . $n . '.json';
  if (@file_put_contents($file, json_encode($rec, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), LOCK_EX) === false) {
    out(array('ok' => false, 'error' => 'store_failed'), 500);
  }

  // Optional: an die bestehende E-Mail-einreichung.php weiterreichen (best effort, blockiert nie).
  if (!empty($GLOBALS['FORWARD_URL'])) {
    $payload = json_encode(array(
      'zweck' => 'eintrag', '_subject' => 'Marktplatz-Einreichung #' . $n . ': ' . $label,
      'app' => $label, 'kuerzel' => $by, 'url' => $url, 'bild' => $img,
      'kategorie' => $cat, 'beschreibung' => $text, 'kontakt' => $contact,
      'nummer' => $n, 'eintrag_json' => json_encode($rec, JSON_UNESCAPED_UNICODE),
    ), JSON_UNESCAPED_UNICODE);
    $ctx = stream_context_create(array('http' => array(
      'method' => 'POST', 'header' => "Content-Type: application/json\r\nAccept: application/json\r\n",
      'content' => $payload, 'timeout' => 6, 'ignore_errors' => true,
    )));
    @file_get_contents($GLOBALS['FORWARD_URL'], false, $ctx);
  }

  out(array('ok' => true, 'nummer' => 'FP-' . str_pad((string)$n, 4, '0', STR_PAD_LEFT), 'n' => $n));
}

/* ============================ GESCHÜTZT: list ============================ */
if ($action === 'list') {
  require_key($ADMIN_KEY);
  $items = array();
  foreach (@glob($DATA_DIR . '/*.json') ?: array() as $f) {
    $j = json_decode(@file_get_contents($f), true);
    if (is_array($j)) { $items[] = $j; }
  }
  usort($items, function ($a, $b) { return ((int)($a['nummer'] ?? 0)) - ((int)($b['nummer'] ?? 0)); });
  out(array('ok' => true, 'items' => $items));
}

/* ============================ GESCHÜTZT: setstatus ============================ */
if ($action === 'setstatus') {
  require_key($ADMIN_KEY);
  $b = body_json();
  $n = $b['nummer'] ?? ($_REQUEST['nummer'] ?? '');
  $status = s($b['status'] ?? ($_REQUEST['status'] ?? ''), 20);
  $allowed = array('neu', 'geprueft', 'verdacht');
  if (!num_ok($n) || !in_array($status, $allowed, true)) out(array('ok' => false, 'error' => 'bad_args'), 422);
  $file = $DATA_DIR . '/' . (int)$n . '.json';
  if (!is_file($file)) out(array('ok' => false, 'error' => 'not_found'), 404);
  $j = json_decode(@file_get_contents($file), true);
  if (!is_array($j)) out(array('ok' => false, 'error' => 'read_failed'), 500);
  $j['status'] = $status;
  @file_put_contents($file, json_encode($j, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), LOCK_EX);
  out(array('ok' => true));
}

/* ============================ GESCHÜTZT: done (freigegeben/verworfen) ============================ */
if ($action === 'done') {
  require_key($ADMIN_KEY);
  $b = body_json();
  $n = $b['nummer'] ?? ($_REQUEST['nummer'] ?? '');
  $mode = s($b['mode'] ?? ($_REQUEST['mode'] ?? 'freigegeben'), 20);
  if (!num_ok($n)) out(array('ok' => false, 'error' => 'bad_args'), 422);
  $file = $DATA_DIR . '/' . (int)$n . '.json';
  if (!is_file($file)) out(array('ok' => false, 'error' => 'not_found'), 404);
  $j = json_decode(@file_get_contents($file), true);
  if (is_array($j)) { $j['status'] = ($mode === 'verworfen') ? 'verworfen' : 'freigegeben'; $j['done_ts'] = gmdate('c'); }
  @file_put_contents($DATA_DIR . '/archiv/' . (int)$n . '.json', json_encode($j, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), LOCK_EX);
  @unlink($file);
  out(array('ok' => true));
}

/* ============================ GESCHÜTZT: fetch (Quellcode holen, Phase 2 / KI-Prüfung) ============================ */
if ($action === 'fetch') {
  require_key($ADMIN_KEY);
  $url = isset($_REQUEST['url']) ? trim($_REQUEST['url']) : '';
  if (!is_https($url)) out(array('ok' => false, 'error' => 'url_must_be_https'), 422);
  $ctx = stream_context_create(array('http' => array(
    'method' => 'GET', 'timeout' => 12, 'ignore_errors' => true,
    'header' => "User-Agent: family-projekt-marktplatz-pruefung/1.0\r\n",
  )));
  $data = @file_get_contents($url, false, $ctx, 0, $MAX_SOURCE_KB * 1024);
  if ($data === false) out(array('ok' => false, 'error' => 'fetch_failed'), 502);
  out(array('ok' => true, 'url' => $url, 'bytes' => strlen($data), 'source' => $data));
}

/* ---- unbekannte Aktion ---- */
out(array('ok' => false, 'error' => 'unknown_action'), 400);
