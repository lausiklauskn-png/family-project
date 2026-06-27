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
 */
import * as THREE from 'three';

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
        // Sterne nahe der Maus werden heller + etwas größer (Klaus 2026-06-27)
        vec2 ndc = gl_Position.xy / gl_Position.w;
        float nearC = smoothstep(0.5, 0.0, distance(ndc, uMouse));
        gl_PointSize = aSize * breath * (220.0 / -mv.z) * uPxRatio * (1.0 + nearC * 0.9);
        vMix = aSeed;
        float pulse = sin(t * 2.4 + aSeed * 31.4159);
        vAlpha = 0.10 + 0.55 * pow(max(pulse, 0.0), 4.0) + nearC * 0.75;
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

  // Maus-Position (NDC) an den Shader → Sterne unter der Maus leuchten heller.
  window.addEventListener('pointermove', (e) => {
    mat.uniforms.uMouse.value.set(
      (e.clientX / window.innerWidth) * 2 - 1,
      -((e.clientY / window.innerHeight) * 2 - 1)
    );
    if (reduce) requestAnimationFrame(renderOnce);
  }, { passive: true });
  window.addEventListener('pointerleave', () => {
    mat.uniforms.uMouse.value.set(2, 2);
    if (reduce) requestAnimationFrame(renderOnce);
  }, { passive: true });

  let curScale = 1;
  function applyScroll() {
    const aim = 1 + Math.min(scrollY, 2200) / 2600; // sanfter Zoom mit Scroll
    curScale += (aim - curScale) * 0.06;
    mycelGroup.scale.setScalar(curScale);
  }

  function renderOnce() {
    applyScroll();
    renderer.render(scene, camera);
  }

  // ---- Schleife ----------------------------------------------------------
  let last = performance.now();
  function tick() {
    const now = performance.now();
    const dt = (now - last) / 1000; last = now;
    mat.uniforms.uTime.value = now / 1000;
    mycelGroup.rotation.y += dt * 0.02;
    applyScroll();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  if (reduce) {
    renderOnce();            // ein statisches Bild
  } else {
    requestAnimationFrame(tick);
  }
}
