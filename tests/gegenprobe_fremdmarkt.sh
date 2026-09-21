#!/usr/bin/env bash
# Gegenprobe zu den GEFUNDENEN Mess-Zielen (SEO-Plan S8a, 2026-09-21).
#
# Jeder eingebaute Fehler MUSS `tests/smoke_fremdmarkt.mjs` umwerfen. Bleibt
# einer grün, ist der Wächter blind — und ein blinder Wächter ist hier teuer:
# er deckt den Weg ab, über den JEDER fremde Eintrag bei PWA Toolpoint seine
# Messwerte bekommt. Ohne ihn bleibt dessen Detailseite leer, und das ist genau
# die dünne Seite, gegen die der ganze Plan gebaut ist.
#
#   bash tests/gegenprobe_fremdmarkt.sh
#
# Sabotiert den echten Baum und legt alles zurück, auch beim Abbruch.
# Wer abbricht, nimmt TERM (nicht KILL) und sieht danach mit `git status` nach.

set -u
cd "$(dirname "$0")/.."

SICH="/tmp/gp_fremdmarkt.$$"; mkdir -p "$SICH"
DATEIEN=(tools/lib/fremdmarkt.mjs tools/forschung.mjs)
for d in "${DATEIEN[@]}"; do mkdir -p "$SICH/$(dirname "$d")"; cp "$d" "$SICH/$d"; done
aufraeumen() { for d in "${DATEIEN[@]}"; do cp "$SICH/$d" "$d"; done; rm -rf "$SICH"; }
trap aufraeumen INT TERM EXIT

gruen=0; blind=0; tot=0

probe() {   # probe <Name> <Datei> <alt> <neu>
  local was="$1" datei="$2" alt="$3" neu="$4"
  for d in "${DATEIEN[@]}"; do cp "$SICH/$d" "$d"; done
  ALT="$alt" NEU="$neu" python3 - "$datei" <<'PY'
import os, sys
p = sys.argv[1]; s = open(p, encoding="utf-8").read()
a, n = os.environ["ALT"], os.environ["NEU"]
if s.count(a) != 1: sys.exit(9)
open(p, "w", encoding="utf-8").write(s.replace(a, n, 1))
PY
  if [ $? -eq 9 ]; then
    echo "  ✗ TOTER ANKER: $was"; tot=$((tot+1)); return
  fi
  if node tests/smoke_fremdmarkt.mjs >/dev/null 2>&1; then
    echo "  ✗ BLIND: $was — die Probe blieb grün"; blind=$((blind+1))
  else
    echo "  ✓ schlägt an: $was"; gruen=$((gruen+1))
  fi
}

echo "═══ Ausgangslage ═══"
if node tests/smoke_fremdmarkt.mjs >/dev/null 2>&1; then
  echo "  ✓ die Probe ist ohne Eingriff grün"
else
  echo "  ✗ die Probe ist SCHON ohne Eingriff rot — hier wird nichts gemessen."
  node tests/smoke_fremdmarkt.mjs 2>&1 | grep '✗' | head -5
  aufraeumen; trap - INT TERM EXIT; exit 1
fi

echo
echo "═══ A · Wer misst schon ═══"
probe 'ein abgeschaltetes Ziel zaehlt nicht mehr — eine Entscheidung wird still zurueckgenommen' \
      tools/lib/fremdmarkt.mjs \
      'for (const z of ziele) if (z && z.id) raus.add(String(z.id));' \
      'for (const z of ziele) if (z && z.id && z.aktiv !== false) raus.add(String(z.id));'
probe 'der eigene Marktplatz fliesst nicht ein — dieselbe Adresse wird zweimal je Nacht gemessen' \
      tools/lib/fremdmarkt.mjs \
      'for (const e of liste) if (e && e.anchorId) raus.add(String(e.anchorId));' \
      'for (const e of liste) if (e && e.anchorId) { /* nichts */ }'
probe 'ein unlesbarer Marktplatz wirft, statt zu melden' \
      tools/lib/fremdmarkt.mjs \
      '  } catch (e) {
    log(`  ! eigener Marktplatz nicht lesbar (${e.message}) — es kann doppelt gemessen werden.`);
  }
  return raus;' \
      '  } catch (e) {
    throw e;
  }
  return raus;'

echo
echo "═══ B · Was gefunden wird ═══"
probe 'die bekannten Kennungen werden beim Finden ignoriert' \
      tools/lib/fremdmarkt.mjs \
      'if (bekannt.has(z.id)) { schon++; continue; }' \
      'if (false) { schon++; continue; }'
probe 'eine Adresse ohne https wird trotzdem genommen' \
      tools/lib/fremdmarkt.mjs \
      'if (!id || !/^https:\/\//i.test(roh)) return null;' \
      'if (!id) return null;'
probe 'ein Eintrag ohne Kennung wird trotzdem genommen' \
      tools/lib/fremdmarkt.mjs \
      '  if (!id || !/^https:\/\//i.test(roh)) return null;' \
      '  if (!/^https:\/\//i.test(roh)) return null;'
probe 'dieselbe Kennung wird zweimal genommen' \
      tools/lib/fremdmarkt.mjs \
      'if (raus.some((y) => y.id === z.id)) { schon++; continue; }' \
      'if (false) { schon++; continue; }'
probe 'das Schaufenster gewinnt — gemessen wird die Landingpage statt der App' \
      tools/lib/fremdmarkt.mjs \
      'const url = /^https:\/\//i.test(app) && app !== roh ? app : roh;' \
      'const url = roh;'

echo
echo "═══ C · Fail-soft ═══"
probe 'ein unerreichbarer Markt wirft, statt es zu sagen' \
      tools/lib/fremdmarkt.mjs \
      '    log(`  ! ${m.markt}: Liste nicht erreichbar (${e.message}) — es werden nur die eigenen Ziele gemessen.`);
    return null;' \
      '    throw e;'
probe 'eine unlesbare Liste wirft, statt es zu sagen' \
      tools/lib/fremdmarkt.mjs \
      '      log(`  ! ${m.markt}: Liste nicht lesbar (${e.message}) — übersprungen.`);
      continue;' \
      '      throw e;'
probe 'ein fehlendes Listen-Global wird stillschweigend als leer genommen' \
      tools/lib/fremdmarkt.mjs \
      '      log(`  ! ${m.markt}: ${m.global} ist keine Liste — übersprungen.`);
      continue;' \
      '      liste = [];'

echo
echo "═══ D · Der Netz-Weg und die Adresse ═══"
probe 'es gibt gar keinen Netz-Weg mehr — im GitHub-Lauf greift jede Nacht ins Leere' \
      tools/lib/fremdmarkt.mjs \
      '  try {
    const a = await fetch(m.netz, { redirect: "follow" });' \
      '  try {
    throw new Error("kein Netz-Weg");
    const a = await fetch(m.netz, { redirect: "follow" });'
probe 'die Netz-Adresse zeigt wieder aufs (private) Depot statt auf die Seite' \
      tools/lib/fremdmarkt.mjs \
      '    netz: "https://pwa-toolpoint.de/assets/config/listings.js"' \
      '    netz: "https://raw.githubusercontent.com/lausiklauskn-png/PWA-Toolpoint/main/assets/config/listings.js"'
probe 'der Nachbar-Pfad ist fest eingetippt und wandert nicht mit der Wurzel' \
      tools/lib/fremdmarkt.mjs \
      '    nachbarn: [path.join(WURZEL, "..", "PWA-Toolpoint", "assets", "config", "listings.js")],' \
      '    nachbarn: ["/home/user/PWA-Toolpoint/assets/config/listings.js"],'

echo
echo "═══ E · Die Durchreichung in den echten Lauf ═══"
probe 'die gefundenen Ziele werden weggeworfen, statt gemessen zu werden' \
      tools/forschung.mjs \
      '  const alle = [...eigene, ...(await gefundeneZiele(eigene))];' \
      '  const alle = [...eigene];'
probe 'die fremden Maerkte werden gar nicht erst gefragt' \
      tools/forschung.mjs \
      '    const { fremdeZiele, bekannteKennungen } = await import("./lib/fremdmarkt.mjs");' \
      '    return [];
    const { fremdeZiele, bekannteKennungen } = await import("./lib/fremdmarkt.mjs");'

aufraeumen
trap - INT TERM EXIT
echo
echo "$gruen Wächter schlagen an · $blind blind · $tot tote Anker"
[ "$blind" -eq 0 ] && [ "$tot" -eq 0 ] || exit 1
