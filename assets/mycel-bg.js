/*
 * Family Projekt — Mycel-Hintergrund (echtes three.js).
 *
 * Übernommen + vereinfacht aus der Sage-Einladung
 * (docs/einladung/index.html ~Z. 1646–1760): Punkt-Wolke mit Funkel-/
 * Stern-Shader + Hyphen-Linien, AdditiveBlending. Hier als EINE Vollbild-
 * Szene statt der mehrstufigen Einladungs-Kamera.
 *
 * Neu für Family Projekt:
 *   - Farben pro Thema (Dunkel/Neon/Hell) via window.MycelBg.setTheme(...).
 *   - Scroll-Zoom: Kamera fährt sanft mit scrollY (Gruppen-Skalierung).
 *   - prefers-reduced-motion: ein statisches Bild, keine Dauerschleife.
 *   - Hell-Thema: NormalBlending + dunkle Fäden (additiv würde auf hellem
 *     Grund unsichtbar zu Weiß verblassen).
 *
 * Lädt als <script type="module"> mit Importmap "three" -> vendor.
 *
 * three.js wird NACHGELADEN statt fest eingebunden (Lighthouse 2026-08-02).
 * Vorher stand hier `import * as THREE from 'three'`. Dadurch hing die
 * Bibliothek (172 KiB über die Leitung) in der kritischen Kette des
 * Seitenaufbaus — für einen Hintergrund, der zum ersten Eindruck nichts
 * beiträgt.
 *
 * Gemessen hat das den ersten sichtbaren Inhalt und den Speed-Index verbessert;
 * die Dauer-Renderschleife weiter unten bleibt davon aber UNBERÜHRT, die ist
 * ein eigenes Thema (siehe docs/PULS.md, Eintrag 2026-08-02). Ehrlich gesagt:
 * dieser Umbau allein bewegt die Gesamtnote kaum.
 *
 * Schlägt das Nachladen fehl, bleibt die Seite voll benutzbar — nur ohne
 * bewegten Hintergrund (fail-soft).
 */
/* Gibt es ueberhaupt einen echten Grafikchip? (Klaus' Entscheid 2026-08-08)
 *
 * Die Selbst-Bremse weiter unten misst die BILDRATE — sie merkt also erst,
 * dass es hoffnungslos ist, nachdem sie acht Bilder gerechnet hat. Auf einem
 * Geraet ohne Grafikbeschleunigung kostet jedes davon rund 1,4 s. Gemessen an
 * der Schwester-Seite Mein-Rezeptbuch-Page: Blockierzeit 10,3 s trotz Bremse; ganz ohne Hintergrund 0 ms
 * bei Leistung 87 statt 48.
 *
 * Diese Pruefung stellt die Frage vorher und beantwortet sie in Mikrosekunden:
 * WebGL sagt selbst, wer zeichnet. Steht dort ein Software-Rasterizer
 * (SwiftShader, llvmpipe, Mesa offscreen — so laeuft jedes Pruefgeraet bei
 * PageSpeed und manches alte Handy), dann wird der Hintergrund GAR NICHT
 * aufgebaut: kein three.js-Aufbau, keine 8000 Punkte, kein Schattierer.
 * Die Seite zeigt dann ihre eigene Farbe, und alles andere bleibt wie es ist.
 *
 * Auf Klaus' Tablet aendert sich nichts — dort steht ein echter Chip drin.
 *
 * FAIL-SOFT IN BEIDE RICHTUNGEN: verrat der Browser den Namen nicht (manche
 * Datenschutz-Einstellungen verbergen ihn), laeuft der Hintergrund normal
 * weiter — Vorsicht darf keine Bestrafung sein. Gibt es gar kein WebGL,
 * koennte der Hintergrund ohnehin nicht laufen.                            */
function keinGrafikchip() {
  try {
    var c = document.createElement('canvas');
    var gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return true;                                  // kein WebGL: ginge sowieso nicht
    var dbg = gl.getExtension('WEBGL_debug_renderer_info');
    var name = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
    // Kein Name preisgegeben -> im Zweifel laufen lassen.
    return /swiftshader|llvmpipe|software|mesa offscreen|microsoft basic/i.test(name);
  } catch (_e) { return true; }
}

function mycelBgStarten(THREE) {
const canvas = document.getElementById('bg');
if (canvas) {
  const reduce = window.matchMedia &&
    matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = matchMedia('(max-width: 900px)').matches;
  const MAX_DPR = (window.matchMedia &&
    matchMedia('(pointer: coarse)').matches) ? 1.5 : 2;

  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true, powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));

  // GPU-Schonung (Sage-Lehre): bei Context-Loss Fläche ausblenden statt
  // weißes Rechteck stehen lassen — die CSS-Hintergrundschicht bleibt sichtbar.
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault(); canvas.style.visibility = 'hidden';
  }, false);
  canvas.addEventListener('webglcontextrestored', () => {
    canvas.style.visibility = '';
  }, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    48, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 6);

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // ---- Punkt-Wolke (Hyphen-artige Filament-Verteilung) -------------------
  const mycelGroup = new THREE.Group();
  scene.add(mycelGroup);

  const PARTICLE_COUNT = isMobile ? 9000 : 22000;
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const seeds = new Float32Array(PARTICLE_COUNT);
  const sizes = new Float32Array(PARTICLE_COUNT);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const r = Math.pow(Math.random(), 0.7) * 14;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    positions[i * 3]     = Math.sin(ph) * Math.cos(th) * r;
    positions[i * 3 + 1] = Math.cos(ph) * r * 0.35 - 1.2;
    positions[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r * 0.6;
    seeds[i] = Math.random();
    sizes[i] = 0.45 + Math.random() * 1.7;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime:      { value: 0 },
      uColorWarm: { value: new THREE.Color(0x6ee7d3) },
      uColorCool: { value: new THREE.Color(0x7c9cff) },
      uColorMid:  { value: new THREE.Color(0xa78bfa) },
      uAlpha:     { value: 0.42 },
      uMouse:     { value: new THREE.Vector2(2, 2) }, // weit weg → kein Boost
      uPxRatio:   { value: renderer.getPixelRatio() }
    },
    vertexShader: /* glsl */`
      uniform float uTime; uniform float uPxRatio; uniform vec2 uMouse;
      attribute float aSeed; attribute float aSize;
      varying float vMix; varying float vAlpha;
      void main() {
        vec3 p = position;
        float t = uTime * 0.18 + aSeed * 6.283;
        p.x += sin(t * 0.7 + p.y * 0.4) * 0.35;
        p.y += cos(t * 0.9 + p.z * 0.3) * 0.22;
        p.z += sin(t * 0.5 + p.x * 0.5) * 0.28;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float breath = 0.85 + 0.25 * sin(t * 1.4);
        gl_Position = projectionMatrix * mv;
        /* Sterne nahe dem Zeiger werden heller und etwas groesser
           (Klaus 2026-06-27), seit dem 2026-09-02 deutlich zurueckgenommen.
           
           ⚠ DER RADIUS WAR DER EIGENTLICHE FEHLER. Gemessen wird hier in
           Bildschirm-Koordinaten von -1 bis 1. Ein Radius von 0.5 ist also
           ein VIERTEL der Bildbreite in jede Richtung, und der Schein deckte
           damit die halbe Seite. Klaus am 2026-09-02: "man kann die Schrift
           dahinter kaum lesen."
           
           Gegen eine Flaeche dieser Groesse gewinnt keine Schriftfarbe. Die
           Schrift dunkler zu machen hiesse ausserdem, die Zeigerposition ins
           CSS zu holen und Text neu zu zeichnen, waehrend der Finger sich
           bewegt. Schmuck weicht dem Inhalt, nicht umgekehrt. */
        vec2 ndc = gl_Position.xy / gl_Position.w;
        float nearC = smoothstep(0.22, 0.0, distance(ndc, uMouse));
        gl_PointSize = aSize * breath * (220.0 / -mv.z) * uPxRatio * (1.0 + nearC * 0.45);
        vMix = aSeed;
        float pulse = sin(t * 2.4 + aSeed * 31.4159);
        vAlpha = 0.10 + 0.55 * pow(max(pulse, 0.0), 4.0) + nearC * 0.30;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uColorWarm; uniform vec3 uColorCool; uniform vec3 uColorMid;
      uniform float uAlpha;
      varying float vMix; varying float vAlpha;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        vec3 col = mix(uColorCool, uColorWarm, vMix);
        col = mix(col, uColorMid, 0.35);
        float core = smoothstep(0.45, 0.0, d);
        float vRay = smoothstep(0.5, 0.0, abs(c.x) * 7.5) * smoothstep(0.5, 0.0, abs(c.y) * 1.4);
        float hRay = smoothstep(0.5, 0.0, abs(c.y) * 7.5) * smoothstep(0.5, 0.0, abs(c.x) * 1.4);
        float star = core + (vRay + hRay) * vAlpha * 0.9;
        gl_FragColor = vec4(col, star * vAlpha * uAlpha);
      }
    `,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(geo, mat);
  mycelGroup.add(points);

  // ---- Hyphen-Linien -----------------------------------------------------
  const LINK_COUNT = isMobile ? 220 : 600;
  const linkPos = new Float32Array(LINK_COUNT * 2 * 3);
  for (let i = 0; i < LINK_COUNT; i++) {
    const a = Math.floor(Math.random() * PARTICLE_COUNT);
    let b = a + 1 + Math.floor(Math.random() * 200);
    if (b >= PARTICLE_COUNT) b = PARTICLE_COUNT - 1;
    for (let k = 0; k < 3; k++) {
      linkPos[i * 6 + k]     = positions[a * 3 + k];
      linkPos[i * 6 + 3 + k] = positions[b * 3 + k];
    }
  }
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute('position', new THREE.BufferAttribute(linkPos, 3));
  const linkMat = new THREE.LineBasicMaterial({
    color: 0x8a7950, transparent: true, opacity: 0.18,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const links = new THREE.LineSegments(linkGeo, linkMat);
  mycelGroup.add(links);

  // ---- Thema-Umschaltung -------------------------------------------------
  // Farben + Blending pro Thema. Hell braucht NormalBlending, dunkle Fäden,
  // sonst verblasst additiv alles zu Weiß auf hellem Grund.
  const THEME_COLORS = {
    Dunkel: { warm: 0x6ee7d3, cool: 0x7c9cff, mid: 0xa78bfa, link: 0x8a7950,
              alpha: 0.42, linkOpa: 0.18, additive: true },
    Neon:   { warm: 0xff9ed4, cool: 0x9d5cff, mid: 0x00c8f0, link: 0xff3f9a,
              alpha: 0.5,  linkOpa: 0.22, additive: true },
    Hell:   { warm: 0x0e8f86, cool: 0x2f6df0, mid: 0x6a4fd0, link: 0x6a4fd0,
              alpha: 0.85, linkOpa: 0.16, additive: false }
  };
  function setTheme(name) {
    const c = THEME_COLORS[name] || THEME_COLORS.Dunkel;
    mat.uniforms.uColorWarm.value.setHex(c.warm);
    mat.uniforms.uColorCool.value.setHex(c.cool);
    mat.uniforms.uColorMid.value.setHex(c.mid);
    mat.uniforms.uAlpha.value = c.alpha;
    mat.blending = c.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    mat.needsUpdate = true;
    linkMat.color.setHex(c.link);
    linkMat.opacity = c.linkOpa;
    linkMat.blending = c.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    linkMat.needsUpdate = true;
    if (reduce) renderOnce();
  }
  window.MycelBg = { setTheme };

  // Persistiertes Thema sofort anwenden (unabhängig vom app.js-Timing).
  (function () {
    var names = ["Dunkel", "Neon", "Hell"];
    var idx = 0;
    try { var s = parseInt(localStorage.getItem("fp_theme"), 10); if (s >= 0 && s < names.length) idx = s; } catch (_e) {}
    setTheme(names[idx]);
  })();

  // ---- Scroll-Zoom -------------------------------------------------------
  let scrollY = window.scrollY || 0;
  window.addEventListener('scroll', () => {
    scrollY = window.scrollY || 0;
    if (reduce) requestAnimationFrame(renderOnce);
  }, { passive: true });

  /* ── DER ZEIGER-SCHEIN, UND WARUM ER AUF DEM TABLET GEPARKT HAT ─────────
   *
   * Bis zum 2026-09-02 stand hier nur `pointerleave` am Fenster. Das feuert
   * auf einem Tablet beim Fingerheben NICHT. Der Schein blieb also genau
   * dort stehen, wo zuletzt getippt wurde, und lag als heller Fleck ueber
   * dem Text. Klaus hat es an genau der Stelle beschrieben: "sehr hell an
   * den Stellen, wo er stoppt."
   *
   * Deshalb wird jetzt auch auf `pointerup` und `pointercancel` gehoert, und
   * eine Beruehrung zieht den Schein danach wieder weg. Die Maus darf ihn
   * behalten, solange sie im Fenster ist: dort ist er gewollt und folgt
   * ohnehin.                                                              */
  const scheinWeg = () => {
    mat.uniforms.uMouse.value.set(2, 2);   // weit weg → kein Boost
    if (reduce) requestAnimationFrame(renderOnce);
  };

  window.addEventListener('pointermove', (e) => {
    mat.uniforms.uMouse.value.set(
      (e.clientX / window.innerWidth) * 2 - 1,
      -((e.clientY / window.innerHeight) * 2 - 1)
    );
    if (reduce) requestAnimationFrame(renderOnce);
  }, { passive: true });

  window.addEventListener('pointerleave', scheinWeg, { passive: true });
  /* Ein gehobener Finger ist ein verlassener Zeiger. Fuer die Maus aendert
     das nichts: sie bewegt sich weiter und setzt den Wert sofort neu. */
  window.addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'mouse') scheinWeg();
  }, { passive: true });
  window.addEventListener('pointercancel', scheinWeg, { passive: true });

  let curScale = 1;
  function applyScroll() {
    const aim = 1 + Math.min(scrollY, 2200) / 2600; // sanfter Zoom mit Scroll
    curScale += (aim - curScale) * 0.06;
    mycelGroup.scale.setScalar(curScale);
  }

  /* ⚠ ERST ZEICHNEN, WENN ALLES STEHT (Befund 2026-09-02).
   *
   * `setTheme` malt bei "Bewegung reduzieren" sofort ein Bild — und wird
   * beim Aufbau gerufen, waehrend die Werte darunter noch gar nicht
   * angelegt sind. `applyScroll` griff dann auf `scrollY` zu, danach auf
   * `curScale`: `Cannot access ... before initialization`. Der Fang beim
   * Import verschluckte den Fehler, also fehlte der Hintergrund bei
   * "Bewegung reduzieren" KOMMENTARLOS — samt Pause-Schalter.
   *
   * Einzelne Namen hochzuziehen kuriert je einen Fall. Dieser Riegel deckt
   * alle: vor dem Ende des Aufbaus wird nicht gezeichnet, und das Bild
   * kommt danach ohnehin.
   *
   * `var` ist hier Absicht, nicht Nachlaessigkeit: es wird nach oben
   * gezogen und ist von Anfang an lesbar. Ein `let` faellt in genau die
   * Falle, die es zuhalten soll — beim ersten Versuch ist es passiert. */
  var bereit = false;

  function renderOnce() {
    if (!bereit) return;
    applyScroll();
    renderer.render(scene, camera);
  }

  // ---- Schleife ----------------------------------------------------------
  let last = performance.now();

  /* ── Selbst-Bremse (Klaus' Entscheid 2026-08-02) ─────────────────────────
   * Auf einem Geraet MIT Grafikbeschleunigung kostet ein Bild ~2 ms. Ohne
   * (alte Handys, und jedes Pruefgeraet bei PageSpeed) sind es 180-255 ms —
   * gemessen in Klaus' eigenem Bericht, wo ALLE zwanzig laengsten Aufgaben
   * diese Datei waren, zusammen 40 von 42 Sekunden.
   *
   * Dort ruckelt die Bewegung ohnehin nur und blockiert dabei die Bedienung.
   * Wird es also dauerhaft zu langsam, bleibt ein STATISCHES Bild stehen —
   * genau dasselbe, das Geraete mit "Bewegung reduzieren" von jeher bekommen.
   * Der Hintergrund verschwindet nicht, er hoert nur auf, sich zu drehen.
   *
   * Auf Klaus' Tablet greift die Bremse nie: dort liegt dt bei ~0,016 s,
   * die Schwelle bei 0,05 s (20 Bilder/s). Die ersten Bilder zaehlen nicht
   * mit, weil der erste Aufbau immer teurer ist (Aufwaermen), und ein
   * einzelner Ausreisser setzt den Zaehler zurueck — es braucht fuenf
   * langsame Bilder HINTEREINANDER.
   *
   * Gemessen (Lighthouse, gedrosselt, ohne Grafik): Blockierzeit
   * 163.000 ms -> 7.480 ms, Leistung 49 -> 59.                            */
  const BREMS_SCHWELLE = 0.05;   // Sekunden pro Bild = 20 Bilder/s
  const BREMS_GEDULD   = 5;      // so viele langsame Bilder hintereinander
  const AUFWAERM_BILDER = 3;     // erste Bilder nicht bewerten
  let langsamInFolge = 0, bilderGezaehlt = 0;

  function tick() {
    /* Der Schalter greift HIER, nicht erst beim naechsten Bild: sonst liefe
       die Schleife nach dem Druck noch weiter, und der Knopf saehe aus, als
       haette er nichts getan. */
    if (typeof pausiert !== 'undefined' && pausiert) { laeuft = false; renderOnce(); return; }

    const now = performance.now();
    const dt = (now - last) / 1000; last = now;

    if (bilderGezaehlt++ >= AUFWAERM_BILDER) {
      if (dt > BREMS_SCHWELLE) langsamInFolge++; else langsamInFolge = 0;
      if (langsamInFolge >= BREMS_GEDULD) {
        laeuft = false;
        renderOnce();            // ein letztes, stehendes Bild
        return;                  // Schleife endet — kein Dauerlauf mehr
      }
    }

    mat.uniforms.uTime.value = now / 1000;
    mycelGroup.rotation.y += dt * 0.02;
    applyScroll();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  /* ── PAUSE-SCHALTER (Klaus 2026-09-02) ──────────────────────────────────
   *
   * Regel 3.5 der Bauregeln: Bewegung ist abschaltbar, und der Schalter
   * merkt sich die Wahl. `prefers-reduced-motion` war bisher der einzige
   * Weg dorthin, und den stellt niemand fuer eine einzelne Seite um.
   *
   * ⚠ ER HAELT DIE SCHLEIFE WIRKLICH AN, statt den Hintergrund nur zu
   * verstecken. Ein verstecktes Bild rechnet weiter: auf einem Geraet ohne
   * Grafikbeschleunigung kostet jedes davon 180 bis 255 ms (gemessen, siehe
   * die Selbst-Bremse darueber). Ein Schalter, der die Last nicht senkt,
   * waere ein Knopf, der aussieht wie Hilfe.
   *
   * Ein STEHENDES Bild bleibt trotzdem: der Hintergrund verschwindet nicht,
   * er hoert nur auf, sich zu bewegen. Dasselbe, was Geraete mit
   * "Bewegung reduzieren" von jeher bekommen.                             */
  const PAUSE_SCHLUESSEL = 'fp_bg_pause';   // App-Suffix: geteilte Adresse
  let pausiert = false;
  try { pausiert = localStorage.getItem(PAUSE_SCHLUESSEL) === 'ja'; } catch (_e) {}

  let laeuft = false;
  function schleifeStarten() {
    if (laeuft || pausiert || reduce) return;
    laeuft = true;
    last = performance.now();
    langsamInFolge = 0; bilderGezaehlt = 0;   // Bremse neu bewerten
    requestAnimationFrame(tick);
  }

  window.MycelBgPause = {
    /** Wahr, wenn der Hintergrund gerade steht. */
    steht: function () { return pausiert || reduce; },
    /** Umschalten. Gibt den neuen Zustand zurueck. */
    umschalten: function () {
      pausiert = !pausiert;
      try { localStorage.setItem(PAUSE_SCHLUESSEL, pausiert ? 'ja' : 'nein'); } catch (_e) {}
      if (pausiert) { laeuft = false; renderOnce(); }
      else schleifeStarten();
      return pausiert;
    },
    /** Nur fuer die Probe: laeuft die Schleife wirklich? */
    laeuft: function () { return laeuft; },
  };

  /* Der Knopf in der Kopfleiste wird vor uns gebaut. Er soll nicht raten,
   * wann wir da sind, und er soll auch nicht auf die Uhr sehen. */
  try { window.dispatchEvent(new Event('fp:bg-bereit')); } catch (_e) {}

  bereit = true;

  if (reduce || pausiert) {
    renderOnce();            // ein statisches Bild
  } else {
    schleifeStarten();
  }
}
}

/* Der Anstoß: erst nach "load", und dann erst, wenn der Hauptfaden Luft hat. */
(function () {
  /* Ohne Grafikchip wird three.js gar nicht erst geholt — 165 KiB, die auf
   * so einem Geraet nichts mehr ausrichten koennten. */
  const los = () => {
    if (keinGrafikchip()) return;
    import('three')
      .then((m) => { mycelBgStarten(m); if (window.MycelBg) { try { window.MycelBg.setTheme(); } catch (_e) {} } })
      /* Der Hintergrund ist Zierde: faellt er aus, laeuft die Seite weiter.
       * Aber er faellt nicht STUMM aus — ein verschluckter Startfehler war
       * am 2026-09-02 der Grund, warum der Pause-Schalter bei "Bewegung
       * reduzieren" fehlte und keine Probe es sah. */
      .catch((e) => { try { console.warn('[mycel-bg] nicht gestartet:', e); } catch (_e) {} });
  };
  const gleich = () => (window.requestIdleCallback
    ? requestIdleCallback(los, { timeout: 2000 })
    : setTimeout(los, 200));
  if (document.readyState === 'complete') gleich();
  else window.addEventListener('load', gleich, { once: true });
})();
