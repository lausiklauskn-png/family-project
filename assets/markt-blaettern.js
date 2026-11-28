/* Marktplatz: Karten kippen weg + Schieberegler (Klaus 2026-11-27/28).
 *
 * Klaus: „Beispiel an PWA Toolpoint: die klappen nach hinten weg und kommen
 * unten wieder hoch." · „an der Seite … ein Schieberegler zum Anfassen" ·
 * „nur fürs Handy … soll nicht so riesig sein … schneller, als wenn du mit
 * der Hand scrollst … ob dann die Apps gerollt werden sollen oder die Seite.
 * Entscheide du."
 *
 * ── ENTSCHIEDEN: DER REGLER BEWEGT DIE SEITE, NICHT EINEN KASTEN ──────────
 * Ein eigener Rollkasten in der Seite fängt am Handy den Finger: wer darin
 * wischt, kommt nicht mehr an den Rest der Seite, und zwei Rollflächen
 * übereinander verwirren. Die Liste bleibt deshalb ein Teil der Seite. Der
 * Regler rechnet aber nur über die LISTE: ganz oben = erste App unter der
 * Kopfleiste, ganz unten = letzte App am unteren Rand. Ein Zug über die
 * Schiene ist die ganze Liste.
 *
 * ── WEGKIPPEN ──────────────────────────────────────────────────────────────
 * Übernommen aus PWA Toolpoint (`assets/app.js`, `kippBeimScrollen`), samt
 * seiner Lehren: eine SCHWELLE statt mitlaufender Verformung; gemessen mit
 * LAYOUT-Werten (`offsetTop`), nie mit `getBoundingClientRect` oder einem
 * IntersectionObserver — die messen die gekippte Karte mit, und dann
 * flackert sie; der klebende Kopf zählt als Deckel; bei „weniger Bewegung"
 * passiert nichts (im CSS steht derselbe Riegel noch einmal).
 *
 * Ohne Skript passiert nichts: die Liste bleibt flach und vollständig. */
(function () {
  "use strict";
  var liste = document.getElementById("mkListings");
  if (!liste) return;

  /* Klaus 2026-11-28: „die zweite App, die auftaucht, soll etwas länger zu
     sehen sein … nur ein wenig mehr". Eine Karte kippt erst, wenn weniger als
     ein gutes Drittel von ihr im Bild ist (vorher die Hälfte, am kleinen Handy
     zwei Drittel). */
  var KIPP_SCHWELLE = 0.35;
  var KIPP_SCHWELLE_KURZ = 0.45;
  var KIPP_KURZES_BILD = 720;
  var REGLER_AB = 8;              /* weniger Karten: kein Regler nötig */
  var REGLER_BREITE = "(max-width: 599px)";   /* nur am Handy (eine Spalte) */

  var ruhig = false;
  try { ruhig = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (_e) { ruhig = true; }

  function deckelOben() {
    var kopf = document.querySelector("header");
    if (!kopf) return 0;
    var pos = "";
    try { pos = getComputedStyle(kopf).position; } catch (_e) { return 0; }
    if (pos !== "sticky" && pos !== "fixed") return 0;
    var r = kopf.getBoundingClientRect();
    return r.top <= 1 && r.bottom > 0 ? r.bottom : 0;
  }
  function obenImDokument(el) {
    var t = 0;
    while (el) {
      t += el.offsetTop;
      var e = el.offsetParent;
      if (e) t += e.clientTop || 0;
      el = e;
    }
    return t;
  }

  var karten = [], deckel = 0, listeOben = 0, listeUnten = 0, angemeldet = false;

  function sammeln() {
    karten = [];
    deckel = deckelOben();
    var g = liste.querySelectorAll(".listing");
    for (var i = 0; i < g.length; i++) {
      karten.push({ el: g[i], oben: obenImDokument(g[i]), hoehe: g[i].offsetHeight });
    }
    listeOben = obenImDokument(liste);
    listeUnten = listeOben + liste.offsetHeight;
    regler.anzahl(karten.length);
    pruefen();
  }

  function kippen(bild, y) {
    if (ruhig) return;
    var schwelle = bild < KIPP_KURZES_BILD ? KIPP_SCHWELLE_KURZ : KIPP_SCHWELLE;
    var frei = bild - deckel;
    for (var i = 0; i < karten.length; i++) {
      var k = karten[i];
      if (!k.hoehe) continue;
      var oben = k.oben - y, unten = oben + k.hoehe;
      var sichtbar = Math.min(unten, bild) - Math.max(oben, deckel);
      var anteil = Math.max(0, sichtbar) / k.hoehe;
      var fuelltAlles = sichtbar >= frei - 1;
      var zuWenig = anteil < schwelle && !fuelltAlles;
      var raus = zuWenig && oben < deckel;
      var rein = zuWenig && !raus && unten > bild;
      k.el.classList.toggle("kipp-weg", raus);
      k.el.classList.toggle("kipp-rein", rein);
    }
  }

  function pruefen() {
    angemeldet = false;
    var bild = window.innerHeight || 0;
    if (!bild) return;
    var y = window.pageYOffset || 0;
    kippen(bild, y);
    regler.lage(bild, y);
  }
  function anstossen() {
    if (angemeldet) return;
    angemeldet = true;
    if (window.requestAnimationFrame) requestAnimationFrame(pruefen); else pruefen();
  }

  /* ── Der Regler ─────────────────────────────────────────────────────── */
  var regler = (function () {
    var mq = null;
    try { mq = window.matchMedia ? window.matchMedia(REGLER_BREITE) : null; } catch (_e) { mq = null; }
    var de = (document.documentElement.lang || "de").slice(0, 2) !== "en";
    var el = document.createElement("div");
    el.className = "mk-regler";
    el.hidden = true;
    el.setAttribute("role", "slider");
    el.setAttribute("tabindex", "0");
    el.setAttribute("aria-orientation", "vertical");
    el.setAttribute("aria-valuemin", "1");
    el.innerHTML = '<span class="mk-regler-schiene" aria-hidden="true"></span>' +
      '<span class="mk-regler-griff" aria-hidden="true"></span>' +
      '<span class="mk-regler-zahl" aria-hidden="true"></span>';
    var griff = el.children[1], zahl = el.children[2];
    document.body.appendChild(el);

    var n = 0, p = 0, ziehen = false, zeigZahlBis = 0, zahlTimer = 0;

    function bereich(bild) {
      /* Anfang: die erste Karte steht direkt unter dem Kopf. Ende: die letzte
         steht am unteren Rand. */
      var a = listeOben - deckel - 8;
      var b = listeUnten - bild + 8;
      return { a: a, b: Math.max(a + 1, b) };
    }
    function nummer() { return n ? Math.min(n, Math.max(1, Math.round(p * (n - 1)) + 1)) : 0; }
    function beschrift() {
      var k = nummer();
      el.setAttribute("aria-valuenow", String(k));
      el.setAttribute("aria-valuetext", (de ? "App " : "App ") + k + (de ? " von " : " of ") + n);
      el.setAttribute("aria-label", de ? "Schnell durch die Apps" : "Jump through the apps");
      zahl.textContent = k + " / " + n;
    }
    function griffSetzen() {
      var h = el.clientHeight, g = griff.offsetHeight;
      var top = Math.round(p * Math.max(0, h - g));
      griff.style.transform = "translateY(" + top + "px)";
      zahl.style.transform = "translateY(" + (top + g / 2) + "px)";
    }
    function zahlKurz() {
      el.classList.add("zeigt-zahl");
      clearTimeout(zahlTimer);
      zahlTimer = setTimeout(function () { if (!ziehen) el.classList.remove("zeigt-zahl"); }, 900);
    }

    function lage(bild, y) {
      var an = !!(mq ? mq.matches : false) && n >= REGLER_AB;
      var r = bereich(bild);
      /* Nur solange die Liste im Bild ist. */
      var imBild = listeOben - y < bild && listeUnten - y > deckel;
      el.style.top = (deckel + 10) + "px";
      /* Unten rechts schwebt die Pille „🌐 Mycel" (Modul 23). Der Regler
         endet darüber, sonst läge der Griff ganz unten unter ihr. */
      var pille = document.getElementById("sbkim-rdv-btn"), unten = 18;
      /* Nur die SCHWEBENDE Pille zählt. Seit dem Menü ☰ (2026-11-28) sitzt sie
         dort angedockt; ein zugeklapptes <details> behält in Chrome sein
         Layout, ihr Rechteck läge dann mitten im Kopf und der Regler schrumpfte
         auf nichts. */
      if (pille && getComputedStyle(pille).position !== "fixed") pille = null;
      if (pille) {
        var pr = pille.getBoundingClientRect();
        if (pr.height && pr.right > (window.innerWidth || 0) - 40) unten = Math.max(unten, bild - pr.top + 8);
      }
      el.style.bottom = unten + "px";
      el.hidden = !(an && imBild);
      if (el.hidden) return;
      if (!ziehen) p = Math.min(1, Math.max(0, (y - r.a) / (r.b - r.a)));
      beschrift();
      griffSetzen();
    }
    function hinZu(neuP) {
      p = Math.min(1, Math.max(0, neuP));
      var r = bereich(window.innerHeight || 0);
      /* sofort, nicht weich: der Regler soll schneller sein als der Finger */
      /* `instant`: die Seite trägt `scroll-behavior:smooth`, und ein weicher
         Sprung liefe dem Finger hinterher. */
      try { window.scrollTo({ top: Math.round(r.a + p * (r.b - r.a)), behavior: "instant" }); }
      catch (_e) { window.scrollTo(0, Math.round(r.a + p * (r.b - r.a))); }
      beschrift();
      griffSetzen();
    }
    function ausZeiger(ev) {
      var r = el.getBoundingClientRect(), g = griff.offsetHeight;
      return (ev.clientY - r.top - g / 2) / Math.max(1, r.height - g);
    }

    el.addEventListener("pointerdown", function (ev) {
      ziehen = true;
      el.classList.add("zieht", "zeigt-zahl");
      try { el.setPointerCapture(ev.pointerId); } catch (_e) {}
      hinZu(ausZeiger(ev));
      ev.preventDefault();
    });
    el.addEventListener("pointermove", function (ev) {
      if (!ziehen) return;
      hinZu(ausZeiger(ev));
      ev.preventDefault();
    });
    function los() {
      if (!ziehen) return;
      ziehen = false;
      el.classList.remove("zieht");
      zahlKurz();
    }
    el.addEventListener("pointerup", los);
    el.addEventListener("pointercancel", los);
    el.addEventListener("keydown", function (ev) {
      if (!n) return;
      var schritt = 1 / Math.max(1, n - 1), neu = null;
      if (ev.key === "ArrowDown" || ev.key === "ArrowRight") neu = p + schritt;
      else if (ev.key === "ArrowUp" || ev.key === "ArrowLeft") neu = p - schritt;
      else if (ev.key === "PageDown") neu = p + 5 * schritt;
      else if (ev.key === "PageUp") neu = p - 5 * schritt;
      else if (ev.key === "Home") neu = 0;
      else if (ev.key === "End") neu = 1;
      if (neu === null) return;
      ev.preventDefault();
      hinZu(neu);
      zahlKurz();
    });
    if (mq && mq.addEventListener) mq.addEventListener("change", anstossen);

    return {
      anzahl: function (z) { n = z; el.setAttribute("aria-valuemax", String(z)); },
      lage: lage
    };
  })();

  sammeln();
  window.addEventListener("scroll", anstossen, { passive: true });
  window.addEventListener("resize", sammeln, { passive: true });
  window.addEventListener("load", sammeln);
  if ("MutationObserver" in window) new MutationObserver(sammeln).observe(liste, { childList: true });
  /* „mehr" aufgeklappt schiebt alles darunter: `toggle` steigt nicht auf,
     deshalb in der Fangphase. */
  liste.addEventListener("toggle", sammeln, true);
  window.FP_MARKT_BLAETTERN = { sammeln: sammeln };
})();
