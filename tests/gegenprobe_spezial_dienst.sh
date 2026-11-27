#!/usr/bin/env bash
# Gegenprobe zu smoke_spezial_dienst.mjs: baut je Fall EINEN Riegel aus — in einer
# Wegwerf-Kopie, nie im echten Baum — und erwartet, dass die Probe rot wird.
# NUR_ANKER=1: prüft nur, dass jeder Anker genau einmal trifft.
set -uo pipefail
QUELLE=$(cd "$(dirname "$0")/.." && pwd)
KOPIE=$(mktemp -d)
trap 'rm -rf "$KOPIE"' EXIT
mkdir -p "$KOPIE/tests" && cp -r "$QUELLE/assets" "$QUELLE/sbkim" "$QUELLE/server" "$KOPIE/" && cp "$QUELLE/tests/smoke_spezial_dienst.mjs" "$KOPIE/tests/"
cd "$KOPIE"
basis=$(node tests/smoke_spezial_dienst.mjs 2>&1 | tail -1)
[[ "$basis" =~ ^[0-9]+\ grün\ ·\ 0\ ROT$ ]] || { echo "!! schon vor der Gegenprobe rot: $basis"; exit 1; }
gef=0; blind=0; tot=0
fall() {
  local name=$1 datei=$2 alt=$3 neu=$4 muster=$5
  cp "$datei" "$datei.bak"
  if ! python3 - "$datei" "$alt" "$neu" <<'PY'
import sys
p, a, n = sys.argv[1:]
t = open(p, encoding="utf-8").read()
if t.count(a) != 1: sys.exit(1)
open(p, "w", encoding="utf-8").write(t.replace(a, n))
PY
  then echo "✗ TOTER ANKER: $name"; tot=$((tot+1)); mv "$datei.bak" "$datei"; return; fi
  if [ "${NUR_ANKER:-}" = 1 ]; then mv "$datei.bak" "$datei"; echo "· Anker sitzt: $name"; return; fi
  local out; out=$(node tests/smoke_spezial_dienst.mjs 2>&1)
  if grep -q "^✗ .*$muster" <<<"$out"; then echo "✓ schlägt an: $name"; gef=$((gef+1)); else echo "✗ BLIND: $name"; grep '^✗' <<<"$out" | head -3; blind=$((blind+1)); fi
  mv "$datei.bak" "$datei"
}
D=server/spezial/dienst.mjs; S=server/spezial/spiegeln.mjs; KE=assets/spezial-kern.js
fall "Sperre am Download fehlt" $D 'if ((await sperrliste())[n.m] && (await sperrliste())[n.m].includes(n.i))' 'if (false)' 'ausgegebener Link des gesperrten'
fall "App-Riegel fehlt" $D 'if (!p.daten.a.includes(app))' 'if (false)' 'nicht trägt'
fall "Markt unter der Unterschrift ungeprüft" $KE 'if (p.daten.v !== 1 || p.daten.m !== markt)' 'if (p.daten.v !== 1)' 'Markt fp nennt'
fall "Ablauf ungeprüft" $KE 'if (p.daten.x && String(p.daten.x) < heute())' 'if (false)' 'abgelaufener Passkey'
fall "Herkunft je Markt ungeprüft" $D 'if (p.ok && herkunft && !HERKUNFT[p.markt].includes(herkunft))' 'if (false)' 'anderer Markt'
fall "Entwurf wird genommen" $S '.filter((r) => r && !r.draft && (' '.filter((r) => r && (' 'nicht Entwurf'
fall "Vorabfassung wird nie genommen" $S '(!r.prerelease || (Array.isArray(app.vorab) && app.vorab.includes(art)))' '!r.prerelease' 'Vorabfassung zählt nur'
fall "SHA-Vergleich fehlt" $S 'if (w.sha256Quelle && g.sha256 !== w.sha256Quelle)' 'if (false)' 'falsche SHA-256'
fall "Sperre ohne Unterschrift angenommen" $D 'if (!r.ok) return aw(res, 403, { ok: false, warum: r.warum }, cors);' '' 'fremdem Schlüssel'
fall "Link ohne Prüfmarke" $D 'if (ist.length !== soll.length || !timingSafeEqual(ist, soll)) return null;' '' 'verbogener Link'
fall "Unterschrift des Feeds ungeprüft" $S 'if (!ok) return { fehler: "Unterschrift des Feeds passt nicht" };' '' 'fremde Unterschrift wird abgewiesen'
fall "Feed einer anderen App angenommen" $S 'if (appName && f.app !== appName)' 'if (false)' 'anderen App wird abgewiesen'
fall "bei GitHub-304 wird der Update-Server übersprungen" $S '{ log(`= ${app.id}: unverändert`); ghUnveraendert = true; }' '{ log(`= ${app.id}: unverändert`); continue; }' 'auch wenn GitHub 304'
fall "Server-Weg ausgebaut (Windows wieder aus GitHub)" $S 'if (server[art]) {' 'if (false) {' 'kommt vom Update-Server'
fall "Gerätegrenze 3 statt 2" $D 'const GERAETE_MAX = 2;' 'const GERAETE_MAX = 3;' 'drittes Gerät bekommt keinen'
fall "Link ohne Gerätekennung angenommen" $D 'if (!GERAET_RE.test(geraet)) return aw' 'if (false) return aw' 'ohne Gerätekennung wird abgewiesen'
fall "Gerät wird nie gemerkt" $D 'if (!gst.bekannt) await geraetMerken' 'if (false) await geraetMerken' 'drittes Gerät bekommt keinen'
fall "alte Zurücksetzen-Erklärung wirkt wieder" $D 'if (!(alter >= -5 * 60 * 1000 && alter <= 15 * 60 * 1000))' 'if (false)' 'alte Zur'
fall "Bremse zählt auch Erfolge" $D 'if (code >= 400 || (obj && obj.ok === false)) fehlversuch(ip);' 'fehlversuch(ip);' 'gehen alle durch'
echo "$gef schlagen an · $blind blind · $tot tote Anker"
[ $blind -eq 0 ] && [ $tot -eq 0 ]
