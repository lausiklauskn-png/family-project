// Musik für das Family-Projekt-Werbevideo — 60 s, 128 BPM, 32 Takte, a-Moll (Am–F–C–G).
// Rein synthetisch, deterministisch (fester Zufalls-Startwert), keine fremden Klänge.
// Aufruf: node musik.mjs  → assets/music.wav (48 kHz, Stereo, 16 Bit)
import fs from "node:fs";

const SR = 48000, DUR = 60, N = SR * DUR;
const BPM = 128, BEAT = 60 / BPM, BAR = BEAT * 4, STEP = BEAT / 4;

const bus = () => [new Float32Array(N), new Float32Array(N)];
const DRUM = bus(), DUCK = bus(), FX = bus(), VERB = bus(), DLY = bus();
const kicks = [];

let seed = 0x5eed1234;
function rnd() { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const noise = () => rnd() * 2 - 1;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const si = (t) => Math.round(t * SR);
const panL = (p) => Math.cos(((p + 1) * Math.PI) / 4), panR = (p) => Math.sin(((p + 1) * Math.PI) / 4);
function put(b, i, l, r) { if (i >= 0 && i < N) { b[0][i] += l; b[1][i] += r; } }
const TAU = Math.PI * 2;

class SVF {
  constructor() { this.a = 0; this.b = 0; this.set(1000, 0.7); }
  set(c, q) { c = Math.min(Math.max(c, 10), SR * 0.45); const g = Math.tan((Math.PI * c) / SR); this.k = 1 / q; this.a1 = 1 / (1 + g * (g + this.k)); this.a2 = g * this.a1; this.a3 = g * this.a2; }
  tick(x) { const v3 = x - this.b; const v1 = this.a1 * this.a + this.a2 * v3; const v2 = this.b + this.a2 * this.a + this.a3 * v3; this.a = 2 * v1 - this.a; this.b = 2 * v2 - this.b; this.lp = v2; this.bp = v1; this.hp = x - this.k * v1 - v2; return v2; }
}
function blep(t, dt) { if (t < dt) { t /= dt; return t + t - t * t - 1; } if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; } return 0; }
class Saw { constructor(f, ph) { this.p = ph ?? rnd(); this.dt = f / SR; } tick() { const v = 2 * this.p - 1 - blep(this.p, this.dt); this.p += this.dt; if (this.p >= 1) this.p -= 1; return v; } }

// ── Schlagzeug ──────────────────────────────────────────────
function kick(t, g = 1) {
  const i0 = si(t), n = si(0.5); let ph = 0;
  for (let i = 0; i < n; i++) {
    const tt = i / SR, f = 42 + 125 * Math.exp(-tt * 30); ph += (TAU * f) / SR;
    const env = Math.exp(-tt * 6.5) * Math.min(1, tt / 0.0015);
    let s = Math.sin(ph) * env + noise() * Math.exp(-tt * 380) * 0.22;
    s = Math.tanh(s * 1.7) * g; put(DRUM, i0 + i, s, s);
  }
  kicks.push(t);
}
function hat(t, open = false, g = 0.16, pan = 0.25) {
  const i0 = si(t), n = si(open ? 0.32 : 0.07), f = new SVF(); f.set(8200, 0.8);
  for (let i = 0; i < n; i++) { const tt = i / SR, env = Math.exp(-tt * (open ? 10 : 70)); f.tick(noise()); const s = f.hp * env * g; put(DRUM, i0 + i, s * panL(pan), s * panR(pan)); }
}
function clap(t, g = 0.45) {
  const i0 = si(t), n = si(0.4), f = new SVF(); f.set(1500, 1.3);
  for (let i = 0; i < n; i++) {
    const tt = i / SR; let env = 0;
    for (const o of [0, 0.011, 0.023]) if (tt >= o) env += Math.exp(-(tt - o) * 170) * 0.8;
    if (tt >= 0.03) env += Math.exp(-(tt - 0.03) * 15) * 0.55;
    f.tick(noise()); const s = f.bp * env * g * 2.2;
    put(DRUM, i0 + i, s * 0.92, s); put(VERB, i0 + i, s * 0.3, s * 0.3);
  }
}
function snare(t, g = 0.35) {
  const i0 = si(t), n = si(0.2), f = new SVF(); f.set(3000, 0.9); let ph = 0;
  for (let i = 0; i < n; i++) {
    const tt = i / SR; ph += (TAU * (180 + 70 * Math.exp(-tt * 40))) / SR; f.tick(noise());
    const s = (Math.sin(ph) * Math.exp(-tt * 28) * 0.5 + f.bp * 1.7 * Math.exp(-tt * 18)) * g;
    put(DRUM, i0 + i, s, s); put(VERB, i0 + i, s * 0.2, s * 0.2);
  }
}
function wirbel(t0, t1, g0 = 0.08, g1 = 0.4) { // Snare-Wirbel, wird dichter
  const len = t1 - t0; let t = t0;
  while (t < t1 - 0.001) { const x = (t - t0) / len; snare(t, g0 + (g1 - g0) * x * x); t += x < 0.5 ? STEP * 2 : x < 0.75 ? STEP : STEP / 2; }
}

// ── Bass, Flächen, Plucks ───────────────────────────────────
function bass(t, dur, m, g = 0.32, cut = 850) {
  const i0 = si(t), n = si(dur + 0.04), o = new Saw(mtof(m), 0), f = new SVF(), fs = mtof(m - 12); let ph = 0;
  for (let i = 0; i < n; i++) {
    const tt = i / SR; if (i % 32 === 0) f.set(cut * (0.55 + 1.7 * Math.exp(-tt * 14)), 0.9);
    const env = Math.min(1, tt / 0.004) * (tt < dur ? 1 : Math.exp(-(tt - dur) * 80));
    ph += (TAU * fs) / SR; const s = Math.tanh((f.tick(o.tick()) * 0.6 + Math.sin(ph) * 0.75) * 1.25) * env * g;
    put(DUCK, i0 + i, s, s);
  }
}
function pad(t, dur, ms, g = 0.045, cut = 1800, att = 0.4, rel = 0.8, send = 0.4) {
  const i0 = si(t), n = si(dur + rel * 1.5);
  for (const m of ms) for (const [d, p] of [[-0.1, -0.75], [0, 0], [0.1, 0.75]]) {
    const o = new Saw(mtof(m + d)), f = new SVF(); f.set(typeof cut === "number" ? cut : cut(0), 0.7);
    for (let i = 0; i < n; i++) {
      const tt = i / SR; if (typeof cut !== "number" && i % 64 === 0) f.set(cut(tt), 0.7);
      let env = tt < att ? tt / att : 1; if (tt > dur) env *= Math.exp(-((tt - dur) * 4) / rel);
      const s = f.tick(o.tick()) * env * g; put(DUCK, i0 + i, s * panL(p), s * panR(p)); put(VERB, i0 + i, s * send * panL(p), s * send * panR(p));
    }
  }
}
function pluck(t, m, g = 0.1, pan = 0, bright = 0.6) {
  const i0 = si(t), n = si(0.42), o = new Saw(mtof(m)), o2 = new Saw(mtof(m) * 1.004), f = new SVF();
  for (let i = 0; i < n; i++) {
    const tt = i / SR; if (i % 32 === 0) f.set(260 + 5200 * bright * Math.exp(-tt * 22), 1.1);
    const env = Math.min(1, tt / 0.002) * Math.exp(-tt * 9.5); const s = f.tick((o.tick() + o2.tick()) * 0.5) * env * g;
    put(DUCK, i0 + i, s * panL(pan), s * panR(pan)); put(DLY, i0 + i, s * 0.4, s * 0.4); put(VERB, i0 + i, s * 0.2, s * 0.2);
  }
}
function bell(t, m, g = 0.12, pan = 0, dur = 2.6, verb = 0.5) {
  const i0 = si(t), n = si(dur), fc = mtof(m), fm = fc * 3.51;
  for (let i = 0; i < n; i++) {
    const tt = i / SR, idx = 3.5 * Math.exp(-tt * 3);
    const s = Math.sin(TAU * fc * tt + idx * Math.sin(TAU * fm * tt)) * Math.exp(-tt * 2.1) * Math.min(1, tt / 0.002) * g;
    put(FX, i0 + i, s * panL(pan), s * panR(pan)); put(VERB, i0 + i, s * verb, s * verb); put(DLY, i0 + i, s * 0.25, s * 0.25);
  }
}
const DET = [-0.2, -0.12, -0.05, 0, 0.05, 0.12, 0.2], SPAN = [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9];
function supersaw(t, dur, ms, g = 0.03, cut = 6000, att = 0.01, rel = 0.35, b = DUCK, send = 0.25) {
  const i0 = si(t), n = si(dur + rel * 1.6);
  for (const m of ms) for (let v = 0; v < 7; v++) {
    const o = new Saw(mtof(m + DET[v])), f = new SVF(); f.set(cut, 0.7); const pl = panL(SPAN[v]), pr = panR(SPAN[v]);
    for (let i = 0; i < n; i++) {
      const tt = i / SR; let env = tt < att ? tt / att : 1; if (tt > dur) env *= Math.exp(-((tt - dur) * 4) / rel);
      const s = f.tick(o.tick()) * env * g; put(b, i0 + i, s * pl, s * pr); put(VERB, i0 + i, s * send * pl, s * send * pr);
    }
  }
}
function lead(t, dur, m, g = 0.05) {
  const i0 = si(t), n = si(dur + 0.25), f = new SVF(), os = [-0.12, -0.04, 0.04, 0.12].map((d) => new Saw(mtof(m + d))); const pans = [-0.5, -0.2, 0.2, 0.5];
  for (let i = 0; i < n; i++) {
    const tt = i / SR; if (i % 32 === 0) f.set(1800 + 6000 * Math.exp(-tt * 6), 0.9);
    let env = Math.min(1, tt / 0.006); if (tt > dur) env *= Math.exp(-(tt - dur) * 18);
    let l = 0, r = 0; for (let k = 0; k < 4; k++) { const v = os[k].tick(); l += v * panL(pans[k]); r += v * panR(pans[k]); }
    const lf = f.tick((l + r) * 0.5); const side = (l - r) * 0.18;
    const sl = (lf + side) * env * g, sr = (lf - side) * env * g;
    put(DUCK, i0 + i, sl, sr); put(DLY, i0 + i, sl * 0.3, sr * 0.3); put(VERB, i0 + i, sl * 0.3, sr * 0.3);
  }
}
function drone(t0, t1, ms, g = 0.08, fadeIn = 2.5) {
  const i0 = si(t0), n = si(t1 - t0);
  for (const [m, p] of ms) { let ph = 0; const f = mtof(m);
    for (let i = 0; i < n; i++) { const tt = i / SR; ph += (TAU * f * (1 + 0.002 * Math.sin(TAU * 0.3 * tt))) / SR;
      const env = Math.min(1, tt / fadeIn) * Math.min(1, (n - i) / (SR * 0.6)); const s = Math.sin(ph) * env * g * (0.85 + 0.15 * Math.sin(TAU * 0.5 * tt));
      put(DUCK, i0 + i, s * panL(p), s * panR(p)); put(VERB, i0 + i, s * 0.3, s * 0.3); } }
}

// ── Effekte: Riser, Einschlag, Whoosh, rückwärts Becken ─────
function riser(t0, t1, g = 0.28) {
  const i0 = si(t0), n = si(t1 - t0), f = new SVF(); let ph = 0;
  for (let i = 0; i < n; i++) {
    const x = i / n; if (i % 32 === 0) f.set(300 * Math.pow(30, x), 1.6); f.tick(noise());
    ph += (TAU * 170 * Math.pow(9, x)) / SR; const s = (f.bp * 1.3 + Math.sin(ph) * 0.12 * x) * Math.pow(x, 2.2) * g;
    const w = 0.25 * Math.sin(TAU * 3 * x); put(FX, i0 + i, s * (0.85 + w), s * (0.85 - w)); put(VERB, i0 + i, s * 0.3, s * 0.3);
  }
}
function impact(t, g = 1, len = 3) {
  const i0 = si(t), n = si(len), fl = new SVF(), fr = new SVF(); fl.set(2600, 0.7); fr.set(2600, 0.7); let ph = 0;
  for (let i = 0; i < n; i++) {
    const tt = i / SR; ph += (TAU * (30 + 62 * Math.exp(-tt * 5))) / SR;
    const sub = Math.sin(ph) * Math.exp(-tt * 1.7) * Math.min(1, tt / 0.003) * 0.85; fl.tick(noise()); fr.tick(noise());
    const env = Math.exp(-tt * 2.1) * 0.5 * Math.min(1, tt / 0.002);
    put(FX, i0 + i, (sub + fl.hp * env) * g, (sub + fr.hp * env) * g); put(VERB, i0 + i, fl.hp * env * g * 0.35, fr.hp * env * g * 0.35);
  }
}
function whoosh(tc, len = 1.2, g = 0.22, dir = 1) {
  const i0 = si(tc - len * 0.62), n = si(len), f = new SVF();
  for (let i = 0; i < n; i++) {
    const x = i / n; if (i % 32 === 0) f.set(350 * Math.pow(18, Math.sin(Math.PI * Math.min(1, x * 1.05))), 2.2); f.tick(noise());
    const env = Math.pow(Math.sin(Math.PI * x), 2), p = dir * (x * 2 - 1), s = f.bp * env * g * 1.6;
    put(FX, i0 + i, s * panL(p), s * panR(p)); put(VERB, i0 + i, s * 0.25, s * 0.25);
  }
}
function rueckwaerts(t0, t1, g = 0.3) {
  const i0 = si(t0), n = si(t1 - t0), fl = new SVF(), fr = new SVF(); fl.set(4200, 0.7); fr.set(4200, 0.7);
  for (let i = 0; i < n; i++) { const x = i / n, env = Math.pow(x, 3); fl.tick(noise()); fr.tick(noise()); put(FX, i0 + i, fl.hp * env * g, fr.hp * env * g); put(VERB, i0 + i, fl.hp * env * g * 0.2, fr.hp * env * g * 0.2); }
}

// ── Noten ───────────────────────────────────────────────────
const CH = [[57, 60, 64, 69], [57, 60, 65, 69], [55, 60, 64, 67], [55, 59, 62, 67]]; // Am F C G
const BASS = [45, 41, 48, 43];
const HOOK = [ // [Schritt, Länge in 16teln, MIDI] je Takt
  [[0, 2, 76], [3, 1, 76], [4, 2, 74], [6, 2, 72], [8, 3, 72], [11, 1, 74], [12, 4, 76]],
  [[0, 2, 77], [3, 1, 77], [4, 2, 76], [6, 2, 72], [8, 4, 72], [12, 2, 69], [14, 2, 72]],
  [[0, 2, 76], [3, 1, 76], [4, 2, 74], [6, 2, 72], [8, 3, 79], [11, 1, 76], [12, 4, 76]],
  [[0, 3, 74], [3, 1, 74], [4, 2, 72], [6, 2, 71], [8, 8, 74]],
];
const ARP = [0, 1, 2, 3, 4, 3, 2, 1];
const arpTon = (ch, k) => (k === 4 ? ch[0] + 24 : ch[k] + 12);

function groove(t0, { clapOn = true, sech = false, offen = false, kickAus = 4 } = {}) {
  for (let b = 0; b < 4; b++) {
    const tb = t0 + b * BEAT;
    if (b < kickAus) kick(tb);
    hat(tb + BEAT / 2, offen, offen ? 0.11 : 0.15, 0.3);
    if (sech) for (const s of [1, 3]) hat(tb + s * STEP, false, 0.06, -0.3);
    if (clapOn && (b === 1 || b === 3)) clap(tb);
  }
}
function bassBar(t0, c, cut = 850, g = 0.32) { for (const s of [2, 6, 10, 14]) bass(t0 + s * STEP, STEP * 1.6, BASS[c], g, cut); bass(t0, STEP * 0.9, BASS[c] - 12, g * 0.7, cut * 0.7); }
function arpBar(t0, c, g = 0.08, bright = 0.55) { for (let s = 0; s < 16; s++) pluck(t0 + s * STEP, arpTon(CH[c], ARP[s % 8]), g * (s % 4 === 0 ? 1.15 : 0.9), (s % 2 ? 0.35 : -0.35), bright); }
function hookBar(t0, c, g = 0.05, okt = 0) { for (const [s, l, m] of HOOK[c]) lead(t0 + s * STEP, l * STEP * 0.92, m + okt, g); }

for (let bar = 0; bar < 32; bar++) {
  const t0 = bar * BAR, c = bar % 4, sec = Math.floor(bar / 4), inner = bar % 4;
  switch (sec) {
    case 0: { // Intro: Lichtpunkt, Fluid, Logo
      pad(t0, BAR, CH[c], 0.035 + 0.01 * inner, (tt) => 500 + (inner * BAR + tt) * 260, inner === 0 ? 1.4 : 0.5, 0.9, 0.5);
      if (inner >= 1) arpBar(t0, c, 0.035 + 0.015 * inner, 0.15 + 0.12 * inner);
      break; }
    case 1: { // Werkzeuge: Sende-Prüfer, Auslieferungsprüfer
      groove(t0); bassBar(t0, c, 800); pad(t0, BAR, CH[c], 0.025, 1300); arpBar(t0, c, 0.07, 0.5);
      break; }
    case 2: { // Echte Apps: Videos
      if (inner < 3) { groove(t0, { sech: true, offen: inner % 2 === 1 }); bassBar(t0, c, 950); }
      else { groove(t0, { sech: true, kickAus: 2, clapOn: false }); for (const s of [2, 6]) bass(t0 + s * STEP, STEP * 1.6, BASS[c], 0.3, 1200); }
      pad(t0, BAR, CH[c], 0.025, 1500 + inner * 300); arpBar(t0, c, 0.075, 0.55 + inner * 0.1);
      break; }
    case 3: case 6: { // Drop 1 / Drop 2
      groove(t0, { sech: true, offen: true }); bassBar(t0, c, 1150, 0.34);
      supersaw(t0, BAR * 0.98, CH[c], 0.016, 5200, 0.01, 0.3);
      hookBar(t0, c, 0.055); if (sec === 6) hookBar(t0, c, 0.03, 12);
      arpBar(t0, c, 0.045, 0.7);
      break; }
    case 4: { // Emblem-Schau: Stich auf jeden Takt
      groove(t0, { sech: true }); bassBar(t0, c, 1000);
      supersaw(t0, 0.28, CH[c].map((m) => m + 12), 0.03, 7000, 0.003, 0.25, FX, 0.45);
      impact(t0, 0.32, 1.6); pad(t0, BAR, CH[c], 0.02, 1500); arpBar(t0, c, 0.06, 0.6);
      break; }
    case 5: { // Nachprüfbar: ruhiger, Zahlen zählen hoch
      if (inner < 3) {
        kick(t0, 0.8); kick(t0 + BEAT * 2, 0.55);
        for (let s = 0; s < 16; s++) hat(t0 + s * STEP, false, s % 4 === 2 ? 0.07 : 0.035, s % 2 ? 0.4 : -0.4);
        bass(t0, BAR * 0.95, BASS[c], 0.22, 520);
        pad(t0, BAR, CH[c], 0.045, 2300, 0.3, 0.8, 0.5); arpBar(t0, c, 0.07, 0.65);
      } else {
        groove(t0, { sech: true }); bassBar(t0, c, 1100); pad(t0, BAR, CH[c], 0.04, 2600); arpBar(t0, c, 0.08, 0.8);
      }
      break; }
    case 7: { // Finale
      if (inner === 0) { groove(t0, { sech: true }); bassBar(t0, c, 1000); supersaw(t0, BAR * 0.98, CH[c], 0.013, 4500, 0.02, 0.3); arpBar(t0, c, 0.05, 0.6); }
      else if (inner === 1) { groove(t0, { kickAus: 2, clapOn: false }); pad(t0, BAR, CH[c], 0.035, 2200); arpBar(t0, c, 0.045, 0.5); }
      break; }
  }
}

// ── Ereignisse auf der Zeitachse (passend zu den Bildern) ──
drone(0, 7.3, [[33, 0], [40, -0.3], [45, 0.3]], 0.07, 2.8);
bell(0.25, 88, 0.07, -0.2, 3.5, 0.7); bell(0.25, 93, 0.05, 0.2, 3.5, 0.7);              // Lichtpunkt
whoosh(1.0, 1.6, 0.12, 1);
bell(BEAT * 6, 76, 0.1, -0.5); bell(BEAT * 6.5, 81, 0.1, 0.5); bell(BEAT * 7, 84, 0.1, 0); // drei Knoten fliegen ein
whoosh(BEAT * 8, 0.9, 0.18, -1); impact(BEAT * 8, 0.35, 2.4);                            // Logo steht (3,75 s)
bell(4.45, 88, 0.05, 0.3, 2.5, 0.7);                                                      // Schriftzug
riser(5.625, 7.5, 0.26); rueckwaerts(6.56, 7.5, 0.24); wirbel(5.625, 7.5, 0.04, 0.3);
impact(7.5, 0.6);                                                                         // Groove setzt ein
for (const t of [11.25, 15, 18.75]) whoosh(t, 1.0, 0.2, t === 15 ? -1 : 1);
riser(20.625, 22.5, 0.32); rueckwaerts(21.56, 22.5, 0.3); wirbel(20.625, 22.5, 0.06, 0.42);
impact(22.5, 1.0);                                                                        // Drop 1
whoosh(26.25, 0.9, 0.16, -1);
whoosh(30, 0.8, 0.18, 1);
for (const t of [31.875, 33.75, 35.625]) whoosh(t, 0.6, 0.14, t === 33.75 ? -1 : 1);
whoosh(37.5, 1.2, 0.2, -1); impact(37.5, 0.4, 2.5);
for (let k = 0; k < 8; k++) bell(38.2 + k * BEAT * 0.5, 84 + [0, 3, 7, 12][k % 4], 0.035, k % 2 ? 0.5 : -0.5, 0.9, 0.4); // Zahlen ticken
riser(43.125, 45, 0.32); rueckwaerts(44.06, 45, 0.3); wirbel(43.125, 45, 0.06, 0.42);
impact(45, 1.0);                                                                          // Drop 2
whoosh(48.75, 0.9, 0.16, 1);
whoosh(52.5, 1.2, 0.22, -1); impact(52.5, 0.45, 2.0);
riser(54.375, 56.25, 0.2); rueckwaerts(54.375, 56.25, 0.32); wirbel(55.3, 56.25, 0.03, 0.22);
impact(56.25, 1.0, 3.6);                                                                  // Logo setzt sich zusammen
supersaw(56.25, 2.4, [48, 55, 60, 62, 64, 67, 72], 0.02, 3800, 0.02, 1.2, FX, 0.6);     // C(add9) — Schlussakkord
drone(56.25, 59.9, [[36, 0], [43, -0.2], [48, 0.2]], 0.07, 0.05);
bell(56.25, 84, 0.06, -0.4, 3.4, 0.8); bell(56.4, 88, 0.05, 0.4, 3.4, 0.8); bell(57.2, 91, 0.04, 0, 2.6, 0.8);

// ── Seitenketten-Pumpen, Delay, Hall, Summe ─────────────────
const duck = new Float32Array(N).fill(1);
for (const k of kicks) { const i0 = si(k), n = si(0.42); for (let i = 0; i < n && i0 + i < N; i++) { const tt = i / SR; const v = 1 - 0.72 * Math.exp(-tt / 0.085) * Math.min(1, tt / 0.004 + 0.3); if (v < duck[i0 + i]) duck[i0 + i] = v; } }

function delay(inp) {
  const d = si(BEAT * 0.75), fb = 0.42, oL = new Float32Array(N), oR = new Float32Array(N), bL = new Float32Array(N), bR = new Float32Array(N); let lpL = 0, lpR = 0;
  for (let i = 0; i < N; i++) {
    const pL = i >= d ? bL[i - d] : 0, pR = i >= d ? bR[i - d] : 0; lpL += 0.35 * (pL - lpL); lpR += 0.35 * (pR - lpR);
    bL[i] = (inp[0][i] + inp[1][i]) * 0.5 + lpR * fb; bR[i] = lpL * fb; oL[i] = pL; oR[i] = pR;
  }
  return [oL, oR];
}
function freeverb(inL, inR, room = 0.86, damp = 0.32) {
  const sc = SR / 44100, combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((x) => Math.round(x * sc)), aps = [556, 441, 341, 225].map((x) => Math.round(x * sc)), spread = Math.round(23 * sc);
  const out = [new Float32Array(N), new Float32Array(N)];
  for (const [ch, off] of [[0, 0], [1, spread]]) {
    const cb = combs.map((l) => ({ b: new Float32Array(l + off), i: 0, st: 0 })), ab = aps.map((l) => ({ b: new Float32Array(l + off), i: 0 }));
    const o = out[ch];
    for (let i = 0; i < N; i++) {
      const x = (inL[i] + inR[i]) * 0.015; let s = 0;
      for (const c of cb) { const y = c.b[c.i]; c.st = y * (1 - damp) + c.st * damp; c.b[c.i] = x + c.st * room; if (++c.i >= c.b.length) c.i = 0; s += y; }
      for (const a of ab) { const bo = a.b[a.i]; const y = -s + bo; a.b[a.i] = s + bo * 0.5; if (++a.i >= a.b.length) a.i = 0; s = y; }
      o[i] = s;
    }
  }
  return out;
}
const [dlL, dlR] = delay(DLY);
for (let i = 0; i < N; i++) { VERB[0][i] += dlL[i] * 0.25; VERB[1][i] += dlR[i] * 0.25; }
const [vL, vR] = freeverb(VERB[0], VERB[1]);

const mix = [new Float32Array(N), new Float32Array(N)];
let hpL = 0, hpR = 0, xL = 0, xR = 0; const hpA = Math.exp((-TAU * 25) / SR);
for (let i = 0; i < N; i++) {
  let l = DRUM[0][i] + DUCK[0][i] * duck[i] + FX[0][i] + dlL[i] * 0.45 + vL[i] * 2.6;
  let r = DRUM[1][i] + DUCK[1][i] * duck[i] + FX[1][i] + dlR[i] * 0.45 + vR[i] * 2.6;
  const yl = hpA * (hpL + l - xL), yr = hpA * (hpR + r - xR); xL = l; xR = r; hpL = yl; hpR = yr;
  mix[0][i] = yl; mix[1][i] = yr;
}
// weiche Begrenzung + Normalisierung + Ausblenden auf Stille bei 60 s
let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(mix[0][i]), Math.abs(mix[1][i]));
const pre = 1.35 / peak; let peak2 = 0;
for (let i = 0; i < N; i++) for (const c of mix) { c[i] = Math.tanh(c[i] * pre); peak2 = Math.max(peak2, Math.abs(c[i])); }
const norm = 0.93 / peak2, fadeA = si(58.4);
const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVE", 8); buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const f = i < fadeA ? 1 : Math.pow(Math.cos(((i - fadeA) / (N - fadeA)) * Math.PI / 2), 2);
  const fi = Math.min(1, i / (SR * 0.02));
  for (let c = 0; c < 2; c++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, mix[c][i] * norm * f * fi)) * 32767), 44 + i * 4 + c * 2);
}
fs.mkdirSync(new URL("./assets/", import.meta.url), { recursive: true });
fs.writeFileSync(new URL("./assets/music.wav", import.meta.url), buf);
console.log("assets/music.wav geschrieben · Spitze vor Begrenzung", peak.toFixed(2), "· Schläge", kicks.length);
