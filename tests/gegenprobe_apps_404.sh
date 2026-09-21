#!/usr/bin/env bash
# Gegenprobe zum /apps/-Block gegen den Soft-404 (2026-09-22).
#
# Ein Wächter ohne Gegenprobe ist nur ein grüner Haken. Sechs Fehler, und
# jeder MUSS `tests/smoke_apps_404.mjs` umwerfen.
#
#   bash tests/gegenprobe_apps_404.sh
#
# Sabotiert den echten Baum und legt alles zurück, auch beim Abbruch.
# Wer abbricht, nimmt TERM (nicht KILL) und sieht danach mit `git status` nach.

set -u
cd "$(dirname "$0")/.."

SICH="/tmp/gp_apps404.$$"; mkdir -p "$SICH"
DATEIEN=(Caddyfile.example)
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
  if node tests/smoke_apps_404.mjs >/dev/null 2>&1; then
    echo "  ✗ BLIND: $was — die Probe blieb grün"; blind=$((blind+1))
  else
    echo "  ✓ schlägt an: $was"; gruen=$((gruen+1))
  fi
}

echo "═══ Ausgangslage ═══"
if node tests/smoke_apps_404.mjs >/dev/null 2>&1; then
  echo "  ✓ grün"
else
  echo "  ✗ ABBRUCH: die Probe ist schon vor der Gegenprobe rot."
  exit 1
fi

echo
echo "═══ Die sechs Fehler ═══"

# 1 · gar kein Block
probe 'der /apps/-Block faellt ganz weg' Caddyfile.example \
      '	handle /apps/* {
		file_server
	}' \
      '	# (Block entfernt)'

# 2 · DIE Kern-Zusicherung: er steht hinter dem Auffang und ist damit wirkungslos.
#     ⚠ Er ist dabei VOLLSTAENDIG da — nur an der falschen Stelle. Ein Waechter,
#     der nur nach „gibt es ihn" fragt, bliebe hier gruen, und genau das waere
#     der stille Fehler: die Seiten werden ausgeliefert, nur der 404-Fall geht
#     weiter an die Startseite.
probe 'er steht HINTER dem Auffang — wirkungslos, aber unsichtbar' Caddyfile.example \
      '	handle /apps/* {
		file_server
	}

	handle {
		try_files {path} {path}/ /index.html
		file_server
	}' \
      '	handle {
		try_files {path} {path}/ /index.html
		file_server
	}

	handle /apps/* {
		file_server
	}'

# 3 · der Rueckfall kommt zurueck — genau der Soft-404, gegen den alles gebaut ist
probe 'er bekommt den Rueckfall auf die Startseite zurueck' Caddyfile.example \
      '	handle /apps/* {
		file_server
	}' \
      '	handle /apps/* {
		try_files {path} {path}/ /index.html
		file_server
	}'

# 4 · er liefert gar nichts mehr aus
probe 'er verliert file_server — die Seiten kaemen nicht mehr an' Caddyfile.example \
      '	handle /apps/* {
		file_server
	}' \
      '	handle /apps/* {
		respond 204
	}'

# 5 · der Nachbar: die /server/-Sperre rutscht hinter den Auffang.
#     Sie schuetzt den Quelltext der PHP-Dateien; meine Aenderung darf sie
#     nicht verschoben haben.
probe 'die /server/-Sperre rutscht hinter den Auffang' Caddyfile.example \
      '	handle /server/* {
		respond 404
	}' \
      '	# (Sperre wandert ans Ende)'

# 6 · die GEGENRICHTUNG: ohne sie waere „kein try_files" auch dann gruen,
#     wenn jemand den Rueckfall ueberall herausnimmt — dann antwortete
#     /impressum nicht mehr.
probe 'der Auffang verliert seinen Rueckfall auf die Startseite' Caddyfile.example \
      '		try_files {path} {path}/ /index.html
		file_server
	}' \
      '		file_server
	}'

echo
echo "$gruen schlagen an, $blind blind, $tot tote Anker"
[ "$blind" -eq 0 ] && [ "$tot" -eq 0 ]
