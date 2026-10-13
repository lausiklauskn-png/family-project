/* gegenprobe_relais_intern.mjs — jeder Riegel des Einrichte-Werkzeugs muss seine rote Zeile werfen.
 * Wegwerf-Kopie (server/relais-intern + tests), nie der echte Baum. NUR_ANKER=1: nur die Anker.
 * Gezählt wird, ob die ERSTE rote Zeile zum Fall passt — sonst „aus falschem Grund". */
import { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const W = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const S = 'server/relais-intern/einrichten.sh', K = 'server/relais-intern/config.toml';
const FAELLE = [
  { name: 'eine vorhandene Konfig wird überschrieben', datei: S,
    an: 'if [ -f "$ZIEL/config.toml" ]; then', zu: 'if false; then', rot: /NIE überschrieben/ },
  { name: 'eine pubkey_whitelist steht aktiv drin', datei: K,
    an: '[limits]\n', zu: '[authorization]\npubkey_whitelist = ["aa"]\n\n[limits]\n', rot: /pubkey_whitelist/ },
  { name: 'die Flut-Grenzen fehlen', datei: K,
    an: 'messages_per_sec = 5\n', zu: '', rot: /Flut-Grenzen/ },
  { name: 'das Caddyfile wird per cp ersetzt (neuer Inode)', datei: S,
    an: '  { echo; cat "$QUELLE/Caddyfile.block"; } >> Caddyfile', zu: '  { cat Caddyfile; echo; cat "$QUELLE/Caddyfile.block"; } > Caddyfile.neu; mv Caddyfile.neu Caddyfile', rot: /Inode/ },
  { name: 'Caddy lädt neu, obwohl die Prüfung scheitert', datei: S,
    an: '  cat "$BAK_CADDY" > Caddyfile\n  echo "!! Caddy lehnt', zu: '  docker exec caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile\n  cat "$BAK_CADDY" > Caddyfile\n  echo "!! Caddy lehnt', rot: /nichts wurde neu geladen/ },
  { name: 'die Sicherung wird bei Ablehnung nicht zurückgelegt', datei: S,
    an: '  cat "$BAK_CADDY" > Caddyfile\n', zu: '', rot: /alte Fassung/ },
  { name: 'ein toter Container wird übergangen', datei: S,
    an: 'if [ "$LAEUFT" != ja ]; then', zu: 'if false; then', rot: /Protokoll/ },
  { name: 'die Software wird geraten statt abgelesen', datei: S,
    an: '[ -n "$BILD" ] || {', zu: 'BILD=${BILD:-scsibug/nostr-rs-relay:latest}; [ -n "$BILD" ] || {', rot: /statt eine Software zu raten/ },
  { name: 'der Dienst wird bei jedem Lauf neu eingetragen', datei: S,
    an: "if ! grep -q '^  relay-intern:' docker-compose.yml; then", zu: 'if true; then', rot: /genau einmal/ },
];
let tot = 0;
for (const f of FAELLE) { const n = readFileSync(join(W, f.datei), 'utf8').split(f.an).length - 1; if (n !== 1) { tot++; console.log(`  ✗ TOTER ANKER (${n}×): ${f.name}`); } }
if (process.env.NUR_ANKER) { console.log(`${FAELLE.length} Anker · ${tot} tot`); process.exit(tot ? 1 : 0); }
let g = 0, b = 0, fa = 0;
for (const f of FAELLE) {
  const k = mkdtempSync(join(tmpdir(), 'gp-ri-'));
  try {
    cpSync(join(W, 'server/relais-intern'), join(k, 'server/relais-intern'), { recursive: true });
    cpSync(join(W, 'tests/smoke_relais_intern.mjs'), join(k, 'tests/smoke_relais_intern.mjs'));
    const p = join(k, f.datei); writeFileSync(p, readFileSync(p, 'utf8').replace(f.an, f.zu));
    const r = spawnSync('node', ['tests/smoke_relais_intern.mjs'], { cwd: k, encoding: 'utf8', timeout: 120000 });
    const erste = ((r.stdout || '').split('\n').find((z) => z.includes('✗ ROT')) || '').trim();
    if (r.status === 0) { b++; console.log(`  ✗ BLIND: ${f.name}`); }
    else if (f.rot.test(erste)) { g++; console.log(`  ✓ gefangen: ${f.name}\n      → ${erste}`); }
    else { fa++; console.log(`  ✗ AUS FALSCHEM GRUND: ${f.name}\n      → ${erste || (r.stdout + r.stderr).slice(-300)}`); }
  } finally { rmSync(k, { recursive: true, force: true }); }
}
console.log(`\n${g} gefangen · ${b} blind · ${fa} aus falschem Grund · ${tot} tote Anker`);
process.exit(b || fa || tot ? 1 : 0);
