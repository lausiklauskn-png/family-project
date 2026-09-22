#!/bin/bash
# Gegenprobe zu den vier Wächtern, die am 2026-09-22 aus dem FALSCHEN Grund
# rot standen (smoke_start, smoke_markt_vecpack, smoke_stufe5_messung C6d,
# smoke_wortkarte). Jede Reparatur bekommt einen Fehler, der sie umwerfen
# MUSS — und die rote Zeile muss den Namen IHRER Zusicherung tragen.
#
# ⚠ SIE SABOTIERT DEN ECHTEN BAUM und legt ihn aus einer SICHERUNG unter /tmp
# zurueck — NICHT per `git checkout --`. Die Sicherung ueberlebt auch einen
# Abbruch (trap).
#
#   bash tests/gegenprobe_dauerrote.sh
#   NUR_FALL="VECPACK:" bash tests/gegenprobe_dauerrote.sh
cd "$(dirname "$0")/.." || exit 1

DATEIEN=(tests/smoke_start.mjs tests/smoke_markt_vecpack.mjs
         tests/smoke_stufe5_messung.mjs tests/smoke_wortkarte.mjs)
SICH="/tmp/gp_dr.$$"; mkdir -p "$SICH"
for d in "${DATEIEN[@]}"; do mkdir -p "$SICH/$(dirname "$d")"; cp "$d" "$SICH/$d"; done
heile(){ for d in "${DATEIEN[@]}"; do cp "$SICH/$d" "$d"; done; }
auf(){ heile; rm -rf "$SICH"; }
trap auf INT TERM EXIT

gruen=0; blind=0; falsch=0; tot=0; uebersprungen=0
LAUF="/tmp/gp_dr_lauf.$$.txt"

# fall <name> <probe> <datei> <alt> <neu> <muster-in-der-roten-zeile>
fall(){
  local name="$1" probe="$2" datei="$3" alt="$4" neu="$5" trifft="$6"
  if [ -n "$NUR_FALL" ] && [[ "$name" != *"$NUR_FALL"* ]]; then
    uebersprungen=$((uebersprungen+1)); return
  fi
  if ! ALT="$alt" DATEI="$datei" python3 -c "
import io,os,sys
s=io.open(os.environ['DATEI'],encoding='utf-8').read()
sys.exit(0 if s.count(os.environ['ALT'])==1 else 1)"; then
    echo "  ⊘ TOTER ANKER (fehlt oder trifft mehrfach): $name"; tot=$((tot+1)); return
  fi
  ALT="$alt" NEU="$neu" DATEI="$datei" python3 -c "
import io,os
p=os.environ['DATEI']; s=io.open(p,encoding='utf-8').read()
io.open(p,'w',encoding='utf-8').write(s.replace(os.environ['ALT'],os.environ['NEU'],1))"
  node "$probe" > "$LAUF" 2>&1
  local code=$?
  if [ "$code" -eq 0 ]; then
    echo "  ✗ BLIND: $name — die Probe blieb gruen"; blind=$((blind+1))
  elif grep -q "$trifft" "$LAUF"; then
    echo "  ✓ schlaegt an: $name"; gruen=$((gruen+1))
  else
    echo "  ⚠ ROT AUS FALSCHEM GRUND: $name — erwartet „$trifft\", gemeldet:"
    grep -E '✗|Error|error' "$LAUF" | head -3 | sed 's/^/        /'
    falsch=$((falsch+1))
  fi
  heile
  return 0
}

echo "═══ Ausgangslage — alle vier muessen gruen sein ═══"
AUS=0
for p in "${DATEIEN[@]}"; do
  if node "$p" > "$LAUF" 2>&1; then echo "  ✓ $(basename $p)"
  else echo "  ✗ $(basename $p) schon OHNE Eingriff rot:"
       grep -E '✗|Error' "$LAUF" | head -3 | sed 's/^/        /'; AUS=1; fi
done
[ "$AUS" -eq 1 ] && { echo "  → die Gegenprobe misst so nichts"; exit 1; }

echo
echo "═══ START: Umgebung richtig gelesen ═══"
fall "START: der Proxy-Wortlaut faellt aus dem Filter" tests/smoke_start.mjs tests/smoke_start.mjs \
  '|tunnel via proxy server failed/i.test(e));' \
  '/i.test(e));' \
  'keine kritischen Konsolen-Fehler'

fall "START: die Grafiklage wird falsch gelesen (Chip behauptet)" tests/smoke_start.mjs tests/smoke_start.mjs \
  '    } catch (_e) { return true; }
  })(),
}));' \
  '    } catch (_e) { return true; }
  })() && false,
}));' \
  'MycelBg.setTheme bereit'

echo
echo "═══ VECPACK: gezaehlt wird, was die Seite zeichnet ═══"
fall "VECPACK: der Massstab zaehlt wieder EINTRAEGE statt Karten" tests/smoke_markt_vecpack.mjs tests/smoke_markt_vecpack.mjs \
  '  anzahl = await page.evaluate(() =>
    document.querySelectorAll("#mkListings .listing img").length);' \
  '  anzahl = await page.evaluate(() => (window.FP_LISTINGS || []).filter((x) => x && x.img).length);' \
  'live eingebettet'

fall "VECPACK: der Selbst-Riegel meldet sich, wenn nichts gezeichnet wurde" tests/smoke_markt_vecpack.mjs tests/smoke_markt_vecpack.mjs \
  'document.querySelectorAll("#mkListings .listing img").length);' \
  'document.querySelectorAll("#mkListings .gibtsnicht").length);' \
  'Selbst-Riegel'

fall "VECPACK: der Proxy-Wortlaut faellt aus dem Filter" tests/smoke_markt_vecpack.mjs tests/smoke_markt_vecpack.mjs \
  '|tunnel via proxy server failed/i.test(e));' \
  '/i.test(e));' \
  'keine eigenen Konsolen-Fehler'

echo
echo "═══ C6D: beide Quellen, nicht eine ═══"
fall "C6D: die zweite Quelle wird nicht mehr gesperrt" tests/smoke_stufe5_messung.mjs tests/smoke_stufe5_messung.mjs \
  '    await p3.route("**/assets/config/messung-hand.json*", (r) => r.fulfill({ status: 404, body: "no" }));' \
  '' \
  'ohne JEDE Quelle gar kein Band'

echo
echo "═══ WORTKARTE: gemeldet statt geworfen ═══"
# Hier ist die Zusicherung eine andere: ein fehlender Browser darf die Probe
# nicht toeten. Gemessen wird die MELDUNG und die Schlusszeile, nicht ein ✗.
if [ -z "$NUR_FALL" ] || [[ "WORTKARTE: kein Browser da" == *"$NUR_FALL"* ]]; then
  PW_CHROMIUM=/gibt/es/nicht node tests/smoke_wortkarte.mjs > "$LAUF" 2>&1
  code=$?
  if grep -q "NICHT LAUFFÄHIG" "$LAUF" && grep -qE 'nicht lauffaehig' "$LAUF" && [ "$code" -eq 0 ]; then
    echo "  ✓ schlaegt an: WORTKARTE: kein Browser wird GEMELDET, nicht geworfen"
    gruen=$((gruen+1))
  else
    echo "  ✗ BLIND oder geworfen: WORTKARTE — exit=$code, Ausgabe:"
    tail -4 "$LAUF" | sed 's/^/        /'
    blind=$((blind+1))
  fi
else
  uebersprungen=$((uebersprungen+1))
fi

rm -f "$LAUF"
echo
[ "$uebersprungen" -gt 0 ] && echo "⚠ $uebersprungen Faelle ausgelassen (NUR_FALL) — das ist KEIN voller Lauf."
echo "$gruen schlagen an, $blind blind, $falsch aus falschem Grund, $tot tote Anker"
[ "$blind" -eq 0 ] && [ "$falsch" -eq 0 ] && [ "$tot" -eq 0 ]
