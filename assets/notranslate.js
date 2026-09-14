/* Riegel gegen Googles Auto-Uebersetzer — fuer EIGENNAMEN und Bedienelemente.
 *
 * WARUM (Klaus' Bildschirmfotos vom 2026-09-14, Samsung-Tablet, Chrome):
 * Chrome uebersetzte die Seite ZUSAETZLICH zum eigenen DE/EN-Schalter. Was
 * dabei herauskam, war nicht nur ueberfluessig, sondern falsch:
 *
 *   „Hell"           -> „Hoelle"        (das deutsche Wort als englisches gelesen)
 *   „Home"           -> „Heim"          (Rueck-Uebersetzung des eigenen EN-Modus)
 *   „Family Projekt" -> „Familienprojekt" (der MARKENNAME)
 *   „Mycel"          -> „Myzel"         (Eigenname, Klaus 2026-07-24 ausdruecklich so gewaehlt)
 *
 * Der Uebersetzer bleibt AN — Klaus' Entscheidung vom 2026-09-14. Seine Apps
 * richten sich auch an Menschen, die weder Deutsch noch Englisch lesen (der
 * Mikrofon-Waehler kennt zwoelf Sprachen, darunter Paschtu und Dari); ein
 * `<meta name="google" content="notranslate">` haette denen den einzigen Weg
 * genommen. Geschuetzt wird deshalb GEZIELT: Eigennamen und Bedienelemente,
 * nie der Fliesstext.
 *
 * WAS EIN EIGENNAME IST, entscheidet nicht der Riegel, sondern diese Liste.
 * Wer etwas ergaenzt, traegt es hier ein — an einer Stelle, nicht in acht
 * Seiten verteilt.
 */
(function (global) {
  "use strict";

  var EIGENNAMEN = [
    ".brand",                 // „Family Projekt" — Kopf- und Fusszeile
    "#themeBtn",              // „Hell" wurde zu „Hoelle"
    "#fp-dock",               // Lampen LEBT · VERKEHR · FREMD · SIEGEL
    "#sbkim-rdv-btn",         // die schwebende Pille „🌐 Mycel"
    "#sbkim-rdv-myid",        // Kennungen sind Zeichenketten, kein Text
    "#sbkim-siegel-badge",
    ".mic-sprache",           // Sprachnamen: „Türkçe" bleibt „Türkçe"
    ".listing h3",            // App-Namen: „Mein Rezeptbuch" ist ein Name, kein Satz
    ".listing .by",           // @handle
    "[data-eigenname]"        // freier Haken fuer die Seiten
  ];

  function riegeln(wurzel) {
    var n = 0;
    for (var i = 0; i < EIGENNAMEN.length; i++) {
      var treffer;
      try { treffer = (wurzel || document).querySelectorAll(EIGENNAMEN[i]); } catch (_e) { continue; }
      for (var j = 0; j < treffer.length; j++) {
        var el = treffer[j];
        if (el.getAttribute("translate") === "no") continue;
        el.setAttribute("translate", "no");
        // Chrome sieht auf BEIDES; `translate="no"` ist der Standard, die
        // Klasse ist Googles eigener Weg. Einer allein hat in der Praxis
        // schon versagt, und zwei kosten nichts.
        el.classList.add("notranslate");
        n++;
      }
    }
    return n;
  }

  /* Die Module 17 und 23 haengen ihre Elemente ERST NACH dem Laden ein (die
   * Kette laeuft in der Leerlauf-Pause). Ein einmaliger Durchgang beim Start
   * wuerde die schwebende Pille also nie erwischen.
   *
   * Gewartet wird auf die BEDINGUNG, nicht auf die Uhr: ein Beobachter meldet
   * jede Einhaengung. Ein `setTimeout` mit runder Zahl waere ein Rennen, das
   * auf einem langsamen Geraet irgendwann verloren geht — und zwar STILL. */
  function starten() {
    riegeln(document);
    if (!global.MutationObserver) return;
    var beo = new global.MutationObserver(function (aenderungen) {
      for (var i = 0; i < aenderungen.length; i++) {
        if (aenderungen[i].addedNodes && aenderungen[i].addedNodes.length) { riegeln(document); return; }
      }
    });
    try { beo.observe(document.body, { childList: true, subtree: true }); } catch (_e) {}
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", starten);
  else starten();

  global.FPNoTranslate = { riegeln: riegeln, auswahl: EIGENNAMEN };
})(window);
