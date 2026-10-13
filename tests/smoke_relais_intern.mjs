/* smoke_relais_intern.mjs — das Einrichte-Werkzeug für das interne Relais.
 *
 * Läuft OHNE Server: ein gestelltes `docker` im PATH, /opt/relay als Wegwerf-
 * Verzeichnis. Gemessen wird, was das Skript an Dateien hinterlässt — nicht,
 * ob der echte Container startet (das sieht nur Klaus' Server).
 */
import { mkdtempSync, writeFileSync, readFileSync, cpSync, chmodSync, statSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const QUELLE = join(WURZEL, 'server/relais-intern');
let gruen = 0, rot = 0;
const ok = (name, bed, info = '') => { if (bed) { gruen++; console.log('  ✓ ' + name); } else { rot++; console.log('  ✗ ROT ' + name + (info ? '  → ' + info : '')); } };

const COMPOSE = `services:
  relay:
    image: scsibug/nostr-rs-relay:latest
    container_name: relay
  caddy:
    image: caddy:2-alpine
    container_name: caddy

volumes:
  caddy_data:
`;
const CADDY = `relay.family-projekt.de {
\treverse_proxy relay:8080
}
`;

// a stand-in docker: just enough for einrichten.sh, logs every call
const DOCKER = `#!/usr/bin/env bash
echo "$*" >> "$LAGE/docker.log"
case "$1 $2" in
  "inspect relay") echo "scsibug/nostr-rs-relay:latest";;
  "inspect relay-intern") if [ -f "$LAGE/laeuft" ] && [ -z "$STIRBT" ]; then echo true; else echo false; fi;;
  "run --rm") echo 1000;;
  "compose config")
    if [ "$3" = "--services" ]; then
      awk '/^services:/{s=1;next} /^[a-z]/{s=0} s && /^  [a-z-]+:$/{gsub(/[ :]/,"");print}' docker-compose.yml
    fi;;
  "compose up") touch "$LAGE/laeuft";;
  "exec caddy")
    if [ "$4" = "validate" ]; then [ -z "$CADDY_NEIN" ] || { echo "Error: kaputt"; exit 1; }; fi
    if [ "$4" = "reload" ]; then touch "$LAGE/neugeladen"; fi;;
  "logs --tail") echo "(gestellte Protokollzeile)";;
esac
exit 0
`;

function lage(env = {}) {
  const t = mkdtempSync(join(tmpdir(), 'relais-intern-'));
  for (const d of ['bin', 'opt/relay', 'opt/relay-intern']) mkdirSync(join(t, d), { recursive: true });
  writeFileSync(join(t, 'bin/docker'), DOCKER); chmodSync(join(t, 'bin/docker'), 0o755);
  writeFileSync(join(t, 'opt/relay/docker-compose.yml'), COMPOSE);
  writeFileSync(join(t, 'opt/relay/Caddyfile'), CADDY);
  const lauf = (extra = {}) => spawnSync('bash', [join(QUELLE, 'einrichten.sh')], {
    encoding: 'utf8',
    env: { ...process.env, PATH: join(t, 'bin') + ':' + process.env.PATH, LAGE: t, QUELLE, RELAIS: join(t, 'opt/relay'),
           ZIEL: join(t, 'opt/relay-intern'), WARTEN: '2', ...env, ...extra },
  });
  return { t, lauf, lies: (p) => readFileSync(join(t, p), 'utf8') };
}

console.log('── A · erster Lauf');
{
  const L = lage();
  const ino = statSync(join(L.t, 'opt/relay/Caddyfile')).ino;
  const r = L.lauf();
  ok('läuft durch (Rückgabe 0)', r.status === 0, (r.stdout + r.stderr).slice(-400));
  const c = L.lies('opt/relay/docker-compose.yml');
  ok('Dienst relay-intern steht unter services, VOR „volumes:"', /^  relay-intern:$/m.test(c) && c.indexOf('  relay-intern:') < c.indexOf('\nvolumes:'));
  ok('… mit der Software des öffentlichen Relais (abgelesen)', /relay-intern:\n\s+image: scsibug\/nostr-rs-relay:latest/.test(c));
  ok('… eigene Konfig und eigene Datenbank, nicht die des öffentlichen', c.includes(join(L.t, 'opt/relay-intern') + '/config.toml:/usr/src/app/config.toml:ro') && c.includes(join(L.t, 'opt/relay-intern') + '/db:/usr/src/app/db'));
  const k = L.lies('opt/relay-intern/config.toml');
  ok('Konfig liegt am Ziel', k.includes('relay-intern.family-projekt.de'));
  ok('Flut-Grenzen gesetzt (messages_per_sec, subscriptions_per_min, reject_future_seconds)', /^messages_per_sec = 5$/m.test(k) && /^subscriptions_per_min = 30$/m.test(k) && /^reject_future_seconds = 1800$/m.test(k));
  ok('KEINE aktive pubkey_whitelist (Klaus: jederzeit ein neues Tool)', !/^\s*pubkey_whitelist/m.test(k) && !/^\[authorization\]/m.test(k));
  const cf = L.lies('opt/relay/Caddyfile');
  ok('Caddy-Block angehängt, das öffentliche bleibt', cf.includes('relay-intern.family-projekt.de {') && cf.includes('reverse_proxy relay-intern:8080') && cf.startsWith(CADDY));
  ok('Caddyfile per >> geändert (gleicher Inode, sonst sieht der Container sie nicht)', statSync(join(L.t, 'opt/relay/Caddyfile')).ino === ino);
  ok('Caddy erst geprüft, dann neu geladen', existsSync(join(L.t, 'neugeladen')) && /exec caddy caddy validate[\s\S]*exec caddy caddy reload/.test(L.lies('docker.log')));
  ok('Sicherungen angelegt', spawnSync('bash', ['-c', `ls ${join(L.t, 'opt/relay')} | grep -c bak-relais-intern`], { encoding: 'utf8' }).stdout.trim() === '2');

  console.log('── B · zweiter Lauf');
  writeFileSync(join(L.t, 'opt/relay-intern/config.toml'), k + '\n# von Hand ergänzt\n');
  const r2 = L.lauf();
  ok('läuft wieder durch', r2.status === 0, r2.stdout.slice(-300));
  ok('Dienst steht genau einmal', (L.lies('opt/relay/docker-compose.yml').match(/^  relay-intern:$/gm) || []).length === 1);
  ok('Caddy-Block steht genau einmal', (L.lies('opt/relay/Caddyfile').match(/relay-intern\.family-projekt\.de \{/g) || []).length === 1);
  ok('eine vorhandene Konfig wird NIE überschrieben', L.lies('opt/relay-intern/config.toml').includes('# von Hand ergänzt'));
  rmSync(L.t, { recursive: true, force: true });
}

console.log('── C · Caddy lehnt ab');
{
  const L = lage({ CADDY_NEIN: '1' });
  const r = L.lauf();
  ok('Rückgabe ≠ 0', r.status !== 0);
  ok('Caddyfile ist wieder die alte Fassung', L.lies('opt/relay/Caddyfile') === CADDY);
  ok('… und nichts wurde neu geladen', !existsSync(join(L.t, 'neugeladen')));
  rmSync(L.t, { recursive: true, force: true });
}

console.log('── D · Container startet nicht');
{
  const L = lage({ STIRBT: '1' });
  const r = L.lauf();
  ok('Rückgabe ≠ 0, mit Protokoll', r.status !== 0 && /läuft nicht/.test(r.stdout) && /gestellte Protokollzeile/.test(r.stdout));
  ok('… und Caddy wird gar nicht erst angefasst', L.lies('opt/relay/Caddyfile') === CADDY && !existsSync(join(L.t, 'neugeladen')));
  rmSync(L.t, { recursive: true, force: true });
}

console.log('── E · ohne öffentliches Relais');
{
  const L = lage();
  writeFileSync(join(L.t, 'bin/docker'), DOCKER.replace('"inspect relay") echo "scsibug/nostr-rs-relay:latest";;', '"inspect relay") exit 1;;'));
  const r = L.lauf();
  ok('bricht ab, statt eine Software zu raten', r.status !== 0 && /nicht gefunden/.test(r.stdout) && !L.lies('opt/relay/docker-compose.yml').includes('relay-intern'));
  rmSync(L.t, { recursive: true, force: true });
}

console.log(`\n${gruen} grün · ${rot} ROT`);
process.exit(rot ? 1 : 0);
