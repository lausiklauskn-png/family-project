<?php
/*
 * Family Projekt — Einreich-/Kontakt-Endpunkt (EU-eigen, ohne Dritt-Dienst).
 *
 * Läuft auf Klaus' Hetzner-Webhosting (dieselbe Maschine wie das Postfach
 * info@family-projekt.de → lokaler Mailversand, kein Reputations-Problem).
 * Nimmt den POST des Marktplatz-Formulars (markt.html) entgegen, schützt gegen
 * Spam, schreibt den Eintrag in eine Warteschlange-Datei UND mailt ihn an info@.
 *
 * NICHTS wird automatisch veröffentlicht — Klaus prüft + gibt frei (freigabe.php).
 *
 * ── EINRICHTEN (wenige Klicks) ────────────────────────────────────────────
 *  1. Diese Datei per WebFTP aufs Webhosting laden, z. B. nach
 *     httpdocs/formular/einreichung.php
 *  2. Die CONFIG unten prüfen (Absenderadresse, erlaubte Herkunft).
 *  3. Die volle URL in family-project → assets/config/listings.js eintragen:
 *       window.FP_MARKT_SUBMIT_ENDPOINT = "https://<dein-webhosting>/formular/einreichung.php";
 *  4. Die mitgelieferte .htaccess in denselben Ordner legen (schützt die
 *     Warteschlange + Rate-Datei vor direktem Abruf).
 *
 * Kein Fremd-Code, keine Bibliothek, kein Composer — reines PHP.
 */

// ===================== CONFIG (bei Bedarf anpassen) =======================
$CFG = [
  // Von welchen Seiten darf das Formular senden (CORS-Herkunftsprüfung).
  // Seit 2026-08-09 sendet auch pwa-toolpoint.de an diesen Dienst — ein
  // Postfach, eine Warteschlange, ein Studio (Klaus' Entscheidung). Fehlt eine
  // Herkunft hier, weist der BROWSER die Antwort ab; das Formular drueben
  // faellt dann still auf seinen Kopier-Rueckfall zurueck, und es sieht aus,
  // als sei nichts passiert.
  'allowed_origins' => [
    'https://family-projekt.de',
    'https://www.family-projekt.de',
    'https://pwa-toolpoint.de',
    'https://www.pwa-toolpoint.de',
    'https://pwa-toolpoint.com',
    'https://www.pwa-toolpoint.com',
    'https://lausiklauskn-png.github.io', // GitHub-Pages-Vorschau
  ],
  'mail_to'   => 'info@family-projekt.de',
  // Absender MUSS eine Adresse auf DIESER Maschine/Domain sein (SPF/DMARC ok).
  'mail_from' => 'noreply@family-projekt.de',
  'queue_file' => __DIR__ . '/warteschlange.jsonl',
  'rate_file'  => __DIR__ . '/.ratelimit.json',
  'rate_max'    => 6,      // max. Einsendungen …
  'rate_window' => 3600,   // … pro IP je Stunde (Sekunden)
  'honeypot'    => 'fp_hp_url',   // muss LEER bleiben (Bot-Falle)
  'min_fill_ms' => 1500,   // schneller als das = Bot
  'ip_salt'     => 'CHANGE-ME-family-projekt-2026', // für den IP-Hash in der Queue
];
// =========================================================================

// ── CORS / Herkunft ──────────────────────────────────────────────────────
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$originOk = ($origin === '') || in_array($origin, $CFG['allowed_origins'], true);
if ($origin !== '' && $originOk) {
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Vary: Origin');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');
header('Access-Control-Max-Age: 86400');

// Preflight (OPTIONS) sofort beantworten.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

header('Content-Type: application/json; charset=utf-8');

function out($code, $arr) { http_response_code($code); echo json_encode($arr); exit; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(405, ['ok' => false, 'error' => 'method']);
if ($origin !== '' && !$originOk)          out(403, ['ok' => false, 'error' => 'origin']);

// ── Eingabe lesen (JSON-Body bevorzugt, Formular als Fallback) ───────────
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) $data = $_POST;
if (!is_array($data)) out(400, ['ok' => false, 'error' => 'body']);

function field($d, $k, $max = 2000) {
  $v = isset($d[$k]) ? $d[$k] : '';
  if (!is_string($v)) $v = '';
  $v = str_replace(["\r\n", "\r"], "\n", $v);
  // Steuerzeichen (außer \n und \t) entfernen.
  $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v);
  $v = trim($v);
  if (mb_strlen($v) > $max) $v = mb_substr($v, 0, $max);
  return $v;
}
function is_https($u) { return is_string($u) && preg_match('~^https://~i', $u) && mb_strlen($u) <= 500; }
function is_img($u) { return is_https($u) && !preg_match('~\.svg(\?|#|$)~i', $u); }
function is_email($e) { return is_string($e) && filter_var($e, FILTER_VALIDATE_EMAIL) && mb_strlen($e) <= 160; }

// ── Spam-Schutz 1: Honigtopf ─────────────────────────────────────────────
// Bots füllen versteckte Felder. Ist es gefüllt → still „ok" tun, nichts speichern.
$hp = field($data, $CFG['honeypot'], 200);
if ($hp !== '') out(200, ['ok' => true]);

// ── Spam-Schutz 2: Mindest-Ausfüllzeit ───────────────────────────────────
$elapsed = isset($data['fp_elapsed']) ? (int) $data['fp_elapsed'] : 999999;
if ($elapsed < $CFG['min_fill_ms']) out(200, ['ok' => true]); // zu schnell = Bot

// ── Spam-Schutz 3: Rate-Limit pro IP (dateibasiert, gleitendes Fenster) ──
$ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '0.0.0.0';
$now = time();
$rate = [];
if (is_file($CFG['rate_file'])) {
  $j = json_decode(@file_get_contents($CFG['rate_file']), true);
  if (is_array($j)) $rate = $j;
}
$key = hash('sha256', $ip . '|' . $CFG['ip_salt']);
$hits = isset($rate[$key]) && is_array($rate[$key]) ? $rate[$key] : [];
$hits = array_values(array_filter($hits, function ($t) use ($now, $CFG) { return ($now - (int) $t) < $CFG['rate_window']; }));
if (count($hits) >= $CFG['rate_max']) out(429, ['ok' => false, 'error' => 'rate']);
$hits[] = $now;
$rate[$key] = $hits;
// Fremde, abgelaufene Einträge ausdünnen (Datei klein halten).
foreach ($rate as $k => $ts) {
  $ts = array_values(array_filter((array) $ts, function ($t) use ($now, $CFG) { return ($now - (int) $t) < $CFG['rate_window']; }));
  if ($ts) $rate[$k] = $ts; else unset($rate[$k]);
}
@file_put_contents($CFG['rate_file'], json_encode($rate), LOCK_EX);

// ── Spam-Schutz 4: Feld-Validierung nach Zweck ───────────────────────────
$zweck = field($data, 'zweck', 20);
if ($zweck !== 'kontakt' && $zweck !== 'meldung') $zweck = 'eintrag';

if ($zweck === 'meldung') {
  // Missbrauchs-Meldung zu einem gelisteten Eintrag (Melde-Knopf an jeder Karte).
  // Bewusst OHNE Pflicht-E-Mail: wer etwas Gefährliches sieht, soll melden können,
  // ohne sich auszuweisen. Sonst meldet niemand. Der Spam-Schutz oben (Honigtopf,
  // Mindest-Ausfüllzeit, Rate-Limit, IP-Kürzel) greift trotzdem.
  $rec = [
    'zweck'      => 'meldung',
    'label'      => field($data, 'eintrag', 80),
    'entry_id'   => field($data, 'eintrag_id', 80),
    'grund'      => field($data, 'grund', 20),
    'grund_text' => field($data, 'grund_text', 160),
    'text'       => field($data, 'nachricht', 600),
  ];
  if ($rec['label'] === '' && $rec['entry_id'] === '') out(400, ['ok' => false, 'error' => 'felder']);
  $subject = 'Marktplatz-MELDUNG: ' . ($rec['label'] !== '' ? $rec['label'] : $rec['entry_id']);
  $replyTo = '';
  $bodyLines = [
    'Meldung zu einem Marktplatz-Eintrag über family-projekt.de',
    '',
    'Eintrag:  ' . $rec['label'],
    'Kennung:  ' . $rec['entry_id'],
    'Grund:    ' . $rec['grund_text'] . ' (' . $rec['grund'] . ')',
    '',
    'Hinweis des Melders:',
    ($rec['text'] !== '' ? $rec['text'] : '(kein Freitext)'),
    '',
    'Bitte zeitnah prüfen. Bei rechtswidrigen Inhalten den Eintrag unverzüglich entfernen',
    '(Impressum § Haftungsausschluss/Links).',
  ];
} elseif ($zweck === 'eintrag') {
  $rec = [
    'zweck'        => 'eintrag',
    'label'        => field($data, 'app', 80),
    'by'           => field($data, 'kuerzel', 40),
    'url'          => field($data, 'url', 500),
    'img'          => field($data, 'bild', 500),
    'category'     => field($data, 'kategorie', 40),
    'text'         => field($data, 'beschreibung', 600),
    'contact'      => field($data, 'kontakt', 160),
    // Stufe 2 (2026-08-02): freiwilliger Link auf die eigene sbkim/spore.json.
    // Leer ist ausdruecklich in Ordnung — ohne Spore aendert sich nichts.
    'sporeUrl'     => field($data, 'spore', 300),
  ];
  if ($rec['sporeUrl'] !== '' && !is_https($rec['sporeUrl'])) out(400, ['ok' => false, 'error' => 'spore']);
  if ($rec['label'] === '' || $rec['text'] === '') out(400, ['ok' => false, 'error' => 'felder']);
  if (!is_https($rec['url']))   out(400, ['ok' => false, 'error' => 'url']);
  if (!is_img($rec['img']))     out(400, ['ok' => false, 'error' => 'bild']);
  if (!is_email($rec['contact'])) out(400, ['ok' => false, 'error' => 'kontakt']);
  $subject = 'Marktplatz-Einreichung: ' . ($rec['label'] !== '' ? $rec['label'] : 'ohne Titel');
  $replyTo = $rec['contact'];
  $bodyLines = [
    'Neue Marktplatz-Einreichung über family-projekt.de',
    '',
    'App:          ' . $rec['label'],
    'Kürzel:       ' . $rec['by'],
    'Adresse:      ' . $rec['url'],
    'Bild:         ' . $rec['img'],
    'Kategorie:    ' . $rec['category'],
    'Kontakt:      ' . $rec['contact'],
    'Spore:        ' . ($rec['sporeUrl'] !== '' ? $rec['sporeUrl'] : '(keine)'),
    '',
    'Beschreibung:',
    $rec['text'],
  ];
} else { // kontakt
  $rec = [
    'zweck'   => 'kontakt',
    'name'    => field($data, 'name', 80),
    'contact' => field($data, 'email', 160),
    'text'    => field($data, 'nachricht', 2000),
  ];
  if ($rec['text'] === '')        out(400, ['ok' => false, 'error' => 'felder']);
  if (!is_email($rec['contact'])) out(400, ['ok' => false, 'error' => 'email']);
  $subject = 'Kontakt-Anfrage über family-projekt.de'
           . ($rec['name'] !== '' ? ' — ' . $rec['name'] : '');
  $replyTo = $rec['contact'];
  $bodyLines = [
    'Neue Kontakt-Anfrage über family-projekt.de',
    '',
    'Name:    ' . $rec['name'],
    'E-Mail:  ' . $rec['contact'],
    '',
    'Nachricht:',
    $rec['text'],
  ];
}

// ── In die Warteschlange schreiben (eine JSON-Zeile) ─────────────────────
$rec['ts'] = gmdate('c');
$rec['ip_hash'] = substr($key, 0, 12); // KEINE Klar-IP: nur ein Kürzel gegen Missbrauch
$rec['id'] = $rec['ts'] . '-' . substr(hash('sha256', $raw . $now . mt_rand()), 0, 8);
$rec['status'] = 'neu';
@file_put_contents($CFG['queue_file'], json_encode($rec, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n", FILE_APPEND | LOCK_EX);

// ── Lokal an info@ mailen (gleiche Maschine → kein Reputations-Problem) ──
$body = implode("\n", $bodyLines) . "\n\n— family-projekt.de (Zeitpunkt " . $rec['ts'] . " UTC)\n";
$headers = 'From: Family Projekt <' . $CFG['mail_from'] . ">\r\n"
         // Meldungen kommen ohne Absender-Adresse: dann keinen leeren Reply-To setzen.
         . ($replyTo !== '' ? 'Reply-To: ' . $replyTo . "\r\n" : '')
         . "Content-Type: text/plain; charset=UTF-8\r\n"
         . "MIME-Version: 1.0\r\n";
$encSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
@mail($CFG['mail_to'], $encSubject, $body, $headers);
// Mail-Fehlschlag ist kein harter Fehler: der Eintrag liegt sicher in der
// Warteschlange (freigabe.php liest sie), nichts geht verloren.

out(200, ['ok' => true]);
