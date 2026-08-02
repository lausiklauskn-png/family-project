/* Bild des Tages — von Klaus täglich wechselbar, OHNE Code.
 * img: leer lassen -> Platzhalter-Text erscheint. Sonst einen Bild-Pfad/-Link
 * eintragen (eigenes Bild auf dem Server, z.B. "assets/tagesbilder/2026-06-27.jpg",
 * oder eine externe https-URL). Nur JPG/PNG/WebP.
 *
 * imgFallback: optional. Wird geladen, wenn "img" nicht geladen werden kann —
 * gedacht fuer WebP mit einem aelteren Format als Rueckfall. Fehlt der Eintrag,
 * passiert nichts Schlimmes: dann bleibt es beim Platzhalter (fail-soft).
 *
 * Warum hier WebP steht (Messung 2026-08-02): dasselbe Bild als PNG war
 * 2393 KiB und damit 82 % der GESAMTEN Uebertragung der Startseite — bei einem
 * Element, das mobil auf 644x258 angezeigt wird. Als WebP mit 1536 px Breite
 * sind es 206 KiB. Wer das Bild wechselt, sollte es vorher ebenso verkleinern;
 * die Anleitung dazu steht in docs/BILDER-VERKLEINERN.md. */
window.FP_TAGESBILD = {
  img: "assets/tagesbilder/kosmos-mycel.webp",
  imgFallback: "assets/tagesbilder/kosmos-mycel.png",
  titleDe: "Family Projekt",
  titleEn: "Family Projekt",
  phDe: "[ Bild des Tages — wechselt täglich, von dir eingesetzt ]",
  phEn: "[ Image of the day — changes daily, set by you ]"
};
