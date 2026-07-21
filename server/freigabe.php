<?php
/*
 * Family Projekt — Freigabe-Konsole (Stufe 2, EU-eigen, ohne Dritt-Dienst).
 *
 * Zeigt die Warteschlange (warteschlange.jsonl) und erlaubt:
 *   • „Freigeben"  → schreibt den Eintrag über den GitHub-Token server-seitig
 *                     in assets/config/listings.js (Commit auf main → family
 *                     deployt automatisch). NICHTS geht ohne diesen Klick live.
 *   • „Ablehnen"   → öffnet eine vorausgefüllte Antwort-Mail an den Einsender.
 *   • „Erledigt"   → hakt Kontakt-Anfragen ab.
 *
 * SCHUTZ: Diese Seite MUSS per .htpasswd (Basic Auth) geschützt sein — siehe
 * server/README.md. Der GitHub-Token liegt NUR in freigabe-config.php auf dem
 * Server, NIE im Repo.
 *
 * EINRICHTEN:
 *   1. freigabe.php + freigabe-config.php (aus .example kopiert + ausgefüllt)
 *      in denselben Ordner wie einreichung.php laden.
 *   2. .htaccess (Basic Auth) + .htpasswd anlegen (README).
 *   3. In listings.js muss die Zeile „// FP_LISTINGS_INSERT_HERE" stehen
 *      (Einfüge-Marke) — ist im Repo bereits vorhanden.
 */

$cfgFile = __DIR__ . '/freigabe-config.php';
if (!is_file($cfgFile)) { http_response_code(500); exit('freigabe-config.php fehlt (siehe .example).'); }
$CFG = require $cfgFile;

function h($s) { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); }

// ── Warteschlange lesen ──────────────────────────────────────────────────
function load_queue($file) {
  $out = [];
  if (!is_file($file)) return $out;
  foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    $r = json_decode($line, true);
    if (is_array($r) && isset($r['id'])) $out[] = $r;
  }
  return $out;
}

// ── Status eines Eintrags in der Warteschlange fortschreiben ─────────────
function set_status($file, $id, $status) {
  if (!is_file($file)) return false;
  $fp = fopen($file, 'c+');
  if (!$fp) return false;
  flock($fp, LOCK_EX);
  $lines = [];
  rewind($fp);
  while (($line = fgets($fp)) !== false) {
    $line = rtrim($line, "\r\n");
    if ($line === '') continue;
    $r = json_decode($line, true);
    if (is_array($r) && isset($r['id']) && $r['id'] === $id) { $r['status'] = $status; $line = json_encode($r, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); }
    $lines[] = $line;
  }
  ftruncate($fp, 0);
  rewind($fp);
  fwrite($fp, implode("\n", $lines) . "\n");
  flock($fp, LOCK_UN);
  fclose($fp);
  return true;
}

// ── GitHub-API-Helfer (cURL) ─────────────────────────────────────────────
function gh_request($CFG, $method, $path, $payload = null) {
  $url = 'https://api.github.com' . $path;
  $ch = curl_init($url);
  $headers = [
    'Authorization: Bearer ' . $CFG['github_token'],
    'Accept: application/vnd.github+json',
    'X-GitHub-Api-Version: 2022-11-28',
    'User-Agent: family-projekt-freigabe',
  ];
  curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST  => $method,
    CURLOPT_HTTPHEADER     => $headers,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 20,
  ]);
  if ($payload !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
  $body = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  return [$code, json_decode($body, true)];
}

// Neuen Eintrag vor der Einfüge-Marke in listings.js einsetzen + committen.
function github_publish($CFG, $rec) {
  $path = '/repos/' . $CFG['github_owner'] . '/' . $CFG['github_repo'] . '/contents/' . $CFG['listings_path'];
  list($code, $data) = gh_request($CFG, 'GET', $path . '?ref=' . rawurlencode($CFG['github_branch']));
  if ($code !== 200 || !isset($data['content'])) return [false, 'GET listings.js fehlgeschlagen (' . $code . ')'];
  $content = base64_decode(str_replace("\n", '', $data['content']));
  $marker = '// FP_LISTINGS_INSERT_HERE';
  if (strpos($content, $marker) === false) return [false, 'Einfüge-Marke fehlt in listings.js'];

  // Nur die für den Marktplatz nötigen Felder — als valides JS-Objekt (JSON ist gültiges JS).
  $obj = [
    'label'    => $rec['label'],
    'anchorId' => 'markt-' . substr(hash('sha256', $rec['id']), 0, 8),
    'text'     => $rec['text'],
    'by'       => isset($rec['by']) ? $rec['by'] : '',
    'url'      => $rec['url'],
    'img'      => $rec['img'],
    'category' => isset($rec['category']) ? $rec['category'] : '',
  ];
  $js = json_encode($obj, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  $js = preg_replace('/^/m', '  ', $js); // einrücken
  $insert = trim($js) . ",\n  " . $marker;
  $new = str_replace($marker, $insert, $content);

  $payload = [
    'message' => 'Marktplatz: Eintrag „' . $rec['label'] . '" freigegeben',
    'content' => base64_encode($new),
    'sha'     => $data['sha'],
    'branch'  => $CFG['github_branch'],
  ];
  list($code2, $data2) = gh_request($CFG, 'PUT', $path, $payload);
  if ($code2 >= 200 && $code2 < 300) return [true, 'Commit ' . (isset($data2['commit']['sha']) ? substr($data2['commit']['sha'], 0, 7) : 'ok')];
  return [false, 'PUT fehlgeschlagen (' . $code2 . '): ' . (isset($data2['message']) ? $data2['message'] : '')];
}

// ── Aktionen ─────────────────────────────────────────────────────────────
$msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $action = isset($_POST['action']) ? $_POST['action'] : '';
  $id = isset($_POST['id']) ? $_POST['id'] : '';
  $queue = load_queue($CFG['queue_file']);
  $rec = null;
  foreach ($queue as $q) { if ($q['id'] === $id) { $rec = $q; break; } }
  if (!$rec) {
    $msg = 'Eintrag nicht gefunden.';
  } elseif ($action === 'freigeben') {
    list($ok, $info) = github_publish($CFG, $rec);
    if ($ok) { set_status($CFG['queue_file'], $id, 'freigegeben'); $msg = '✓ Freigegeben & committet — ' . $info . '. family deployt automatisch.'; }
    else { $msg = '✗ Freigabe fehlgeschlagen: ' . $info; }
  } elseif ($action === 'ablehnen') {
    set_status($CFG['queue_file'], $id, 'abgelehnt');
    $msg = 'Abgelehnt. Antwort-Mail unten öffnen (Grund bereits vorausgefüllt).';
  } elseif ($action === 'erledigt') {
    set_status($CFG['queue_file'], $id, 'erledigt');
    $msg = 'Als erledigt markiert.';
  }
}

$queue = array_reverse(load_queue($CFG['queue_file'])); // neueste oben
?><!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Freigabe — Family Projekt</title>
  <style>
    :root { color-scheme: dark; }
    body { font-family: system-ui, sans-serif; background: #0b0d14; color: #e8ecf4; margin: 0; padding: 24px; }
    .wrap { max-width: 900px; margin: 0 auto; }
    h1 { font-size: 1.3rem; }
    .card { background: #151a26; border: 1px solid #2a3346; border-radius: 12px; padding: 16px; margin: 14px 0; }
    .card.done { opacity: .5; }
    .row { display: flex; gap: 14px; flex-wrap: wrap; align-items: flex-start; }
    .thumb { width: 96px; height: 96px; object-fit: cover; border-radius: 8px; background: #222; flex: none; }
    .meta { flex: 1; min-width: 220px; }
    .meta b { color: #8fb2ff; }
    a { color: #6ee7d3; }
    .tag { display: inline-block; font-size: .75rem; padding: 2px 8px; border-radius: 999px; background: #223; margin-left: 6px; }
    .tag.kontakt { background: #3a2a4a; }
    button, .btn { font: inherit; padding: 8px 14px; border-radius: 8px; border: 1px solid #3a4a66; background: #1d2740; color: #e8ecf4; cursor: pointer; text-decoration: none; display: inline-block; }
    button.go { background: #143a2a; border-color: #2a6a4a; }
    button.no { background: #3a1a1a; border-color: #6a2a2a; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; align-items: center; }
    .msg { background: #143a2a; border: 1px solid #2a6a4a; padding: 12px 14px; border-radius: 10px; }
    input[type=text] { font: inherit; padding: 7px 10px; border-radius: 8px; border: 1px solid #3a4a66; background: #0e1220; color: #e8ecf4; min-width: 220px; }
    .desc { white-space: pre-wrap; margin: 8px 0 0; opacity: .9; }
    .empty { opacity: .6; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Marktplatz — Freigabe</h1>
    <?php if ($msg): ?><p class="msg"><?= h($msg) ?></p><?php endif; ?>
    <?php if (!$queue): ?>
      <p class="empty">Die Warteschlange ist leer.</p>
    <?php endif; ?>
    <?php foreach ($queue as $r):
      $status = isset($r['status']) ? $r['status'] : 'neu';
      $done = in_array($status, ['freigegeben', 'abgelehnt', 'erledigt'], true);
      $isKontakt = (isset($r['zweck']) && $r['zweck'] === 'kontakt');
    ?>
      <div class="card <?= $done ? 'done' : '' ?>">
        <div class="row">
          <?php if (!$isKontakt && !empty($r['img'])): ?>
            <img class="thumb" src="<?= h($r['img']) ?>" alt="" referrerpolicy="no-referrer" loading="lazy">
          <?php endif; ?>
          <div class="meta">
            <?php if ($isKontakt): ?>
              <div><b>Kontakt-Anfrage</b><span class="tag kontakt"><?= h($status) ?></span></div>
              <div><b>Name:</b> <?= h(isset($r['name']) ? $r['name'] : '') ?></div>
              <div><b>E-Mail:</b> <?= h($r['contact']) ?></div>
              <p class="desc"><?= h($r['text']) ?></p>
            <?php else: ?>
              <div><b><?= h($r['label']) ?></b> <span class="tag"><?= h($status) ?></span></div>
              <div><?= h(isset($r['by']) ? $r['by'] : '') ?> · <?= h(isset($r['category']) ? $r['category'] : '') ?></div>
              <div><b>Adresse:</b> <a href="<?= h($r['url']) ?>" target="_blank" rel="noopener noreferrer"><?= h($r['url']) ?></a></div>
              <div><b>Kontakt:</b> <?= h($r['contact']) ?></div>
              <p class="desc"><?= h($r['text']) ?></p>
            <?php endif; ?>
          </div>
        </div>
        <div class="actions">
          <?php if ($isKontakt): ?>
            <a class="btn" href="mailto:<?= h($r['contact']) ?>?subject=<?= rawurlencode('Antwort — Family Projekt') ?>">✉ Antworten</a>
            <?php if (!$done): ?>
            <form method="post" style="display:inline"><input type="hidden" name="action" value="erledigt"><input type="hidden" name="id" value="<?= h($r['id']) ?>"><button type="submit">Erledigt</button></form>
            <?php endif; ?>
          <?php else: ?>
            <?php if (!$done): ?>
              <form method="post" style="display:inline" onsubmit="return confirm('Diesen Eintrag freigeben und live schalten?')">
                <input type="hidden" name="action" value="freigeben"><input type="hidden" name="id" value="<?= h($r['id']) ?>">
                <button class="go" type="submit">✓ Freigeben</button>
              </form>
              <form method="post" style="display:inline">
                <input type="hidden" name="action" value="ablehnen"><input type="hidden" name="id" value="<?= h($r['id']) ?>">
                <input type="text" name="grund" placeholder="Ablehnungs-Grund (optional)">
                <button class="no" type="submit">Ablehnen</button>
              </form>
            <?php endif; ?>
            <?php
              $grund = isset($_POST['grund']) && isset($_POST['id']) && $_POST['id'] === $r['id'] ? $_POST['grund'] : '';
              if ($status === 'abgelehnt'):
                $mailBody = "Hallo,\n\ndanke für deine Einreichung „" . $r['label'] . "\" im Family-Projekt-Marktplatz.\n\nLeider können wir sie so nicht veröffentlichen"
                          . ($grund !== '' ? ": " . $grund : ".") . "\n\nDu kannst sie gern angepasst erneut einreichen.\n\nViele Grüße\nFamily Projekt";
            ?>
              <a class="btn" href="mailto:<?= h($r['contact']) ?>?subject=<?= rawurlencode('Deine Marktplatz-Einreichung') ?>&body=<?= rawurlencode($mailBody) ?>">✉ Ablehnungs-Mail öffnen</a>
            <?php endif; ?>
          <?php endif; ?>
        </div>
      </div>
    <?php endforeach; ?>
  </div>
</body>
</html>
