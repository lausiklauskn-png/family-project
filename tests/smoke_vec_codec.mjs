/* Headless-Smoke für den Vektor-Codec (Stufe 1 der Katalog-Spore).
 *   node tests/smoke_vec_codec.mjs
 *
 * Der Codec packt einen 384er-Vektor von ~8 KB auf ~530 Bytes, damit die
 * Marktplatz-Suche die Vektoren nicht bei jedem Besuch neu rechnen muss.
 * Geprüft wird das, worauf es dabei ankommt:
 *   1. Der zurückgerechnete Vektor ist praktisch derselbe (Cosinus ≥ 0,9999)
 *   2. Er passt in den Vertrag von Modul 04: Float32Array(384), Länge 1
 *   3. Die RANGFOLGE bleibt gleich — der eigentliche Zweck
 *   4. Die Größe stimmt (sonst lohnt sich die ganze Übung nicht)
 *   5. Kaputte Pakete geben null statt Unsinn (fail-soft)
 *   6. Der Text-Hash ist stabil, auch bei Umlauten
 *
 * Gerechnet wird an ECHTEN e5-Vektoren aus sbkim/spore.json, nicht an
 * Zufallszahlen: nur so sagt der Genauigkeits-Wert etwas über den Echtbetrieb.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m); } };

// Das ausgelieferte Skript laden (kein Nachbau — sonst prüft der Test sich selbst).
const src = readFileSync(resolve(repoRoot, "assets/vec-codec.js"), "utf8");
const scope = { btoa: globalThis.btoa, atob: globalThis.atob, TextEncoder: globalThis.TextEncoder };
new Function("window", "globalThis", src)(scope, scope);
const C = scope.FPVecCodec;

// Echte Vektoren: domainVector + snippetVectors aus der eigenen Spore.
const spore = JSON.parse(readFileSync(resolve(repoRoot, "sbkim/spore.json"), "utf8"));
const real = [spore.domainVector, ...(spore.snippetVectors || []).map((s) => s.vec)]
  .filter((v) => Array.isArray(v) && v.length === 384)
  .map((v) => Float32Array.from(v));

const DIM = 384;
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
const norm = (v) => { const l = Math.sqrt(dot(v, v)); const o = new Float32Array(v.length); for (let i = 0; i < v.length; i++) o[i] = v[i] / l; return o; };

console.log("Vektor-Codec — Genauigkeit an echten e5-Vektoren");
ok(!!C && typeof C.encode === "function", "Codec geladen (encode/decode/textHash)");
ok(real.length >= 3, `echte Vektoren aus spore.json geladen (${real.length})`);

let minCos = 1, maxBytes = 0;
for (const v of real) {
  const packed = C.encode(v);
  const back = C.decode(packed, DIM);
  const cos = dot(norm(v), back);            // beide auf Länge 1
  if (cos < minCos) minCos = cos;
  const bytes = JSON.stringify(packed).length;
  if (bytes > maxBytes) maxBytes = bytes;
}
ok(minCos >= 0.9999, `schlechtester Cosinus über alle echten Vektoren: ${minCos.toFixed(6)} (≥ 0,9999)`);

// Größe: der ganze Zweck der Übung.
const jsonRoh = JSON.stringify(Array.from(real[0])).length;
ok(maxBytes < 700, `gepackt ≤ 700 Bytes je Vektor (${maxBytes}), roh wären ${jsonRoh}`);
ok(maxBytes * 100 < 80 * 1024, `100 Apps blieben unter 80 KB (${Math.round(maxBytes * 100 / 1024)} KB)`);

console.log("\nVertrag mit Modul 04 (match rechnet das reine Skalarprodukt)");
{
  const back = C.decode(C.encode(real[0]), DIM);
  ok(back instanceof Float32Array, "decode liefert Float32Array");
  ok(back.length === DIM, `Länge ${DIM} (${back.length})`);
  ok(Math.abs(Math.sqrt(dot(back, back)) - 1) < 1e-5, "Vektor hat Länge 1 (match normalisiert nicht selbst)");
  // Gegen das echte Modul 04 gegenprüfen, nicht gegen eine Nachbildung.
  const m4 = readFileSync(resolve(repoRoot, "sbkim/04_match.js"), "utf8");
  const g = { window: undefined, console };
  g.window = g; g.globalThis = g;
  new Function("global", "window", "globalThis", "console", m4)(g, g, g, console);
  const match = g.SbkimMatch && g.SbkimMatch.match;
  ok(typeof match === "function", "echtes Modul 04 geladen");
  const self = match(back, back);
  ok(Math.abs(self - 1) < 1e-4, `match() akzeptiert den Vektor, Selbst-Ähnlichkeit ${self.toFixed(5)}`);
}

console.log("\nRangfolge bleibt erhalten (der eigentliche Zweck)");
{
  // Anfrage = erster Snippet-Vektor; alle übrigen als Katalog.
  const query = norm(real[1] || real[0]);
  const korpus = real.map((v, i) => ({ i, v }));
  const exakt = korpus.map((e) => ({ i: e.i, s: dot(query, norm(e.v)) })).sort((a, b) => b.s - a.s).map((x) => x.i);
  const gepackt = korpus.map((e) => ({ i: e.i, s: dot(query, C.decode(C.encode(e.v), DIM)) })).sort((a, b) => b.s - a.s).map((x) => x.i);
  ok(JSON.stringify(exakt) === JSON.stringify(gepackt),
    `Reihenfolge identisch zu exakten Vektoren (${korpus.length} echte Einträge)`);
}
{
  /* Der harte Fall — und der eigentliche Zielzustand: 100 Einträge, die eng
   * beieinander liegen. e5-Vektoren sind von Natur aus dicht (der Boden liegt
   * bei ~0,82, siehe 04_match.js), und genau dort könnte Quantisierung Ränge
   * kippen. Erzeugt aus den echten Vektoren durch kleine Störungen: dichter
   * als ein realer Marktplatz, also die Probe aufs Exempel.
   * Deterministisch (fester Zufalls-Startwert), damit der Test reproduzierbar
   * ist und nicht mal grün, mal rot läuft. */
  let seed = 42;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff - 0.5; };
  const basis = real[0];
  const korpus = [];
  for (let k = 0; k < 100; k++) {
    const v = new Float32Array(DIM);
    for (let i = 0; i < DIM; i++) v[i] = basis[i] + rnd() * 0.02;   // eng gestreut
    korpus.push(norm(v));
  }
  const query = norm(korpus[7].map ? korpus[7] : korpus[7]);
  const score = (v) => dot(query, v);
  const exakt = korpus.map((v, i) => ({ i, s: score(v) })).sort((a, b) => b.s - a.s);
  const gepackt = korpus.map((v, i) => ({ i, s: score(C.decode(C.encode(v), DIM)) })).sort((a, b) => b.s - a.s);

  ok(exakt[0].i === gepackt[0].i, `bester Treffer bleibt derselbe (Eintrag ${gepackt[0].i})`);
  const top3e = exakt.slice(0, 3).map((x) => x.i).sort();
  const top3g = gepackt.slice(0, 3).map((x) => x.i).sort();
  ok(JSON.stringify(top3e) === JSON.stringify(top3g), "die besten drei sind dieselben Einträge");
  const top10e = new Set(exakt.slice(0, 10).map((x) => x.i));
  const treffer = gepackt.slice(0, 10).filter((x) => top10e.has(x.i)).length;
  ok(treffer >= 9, `von den besten zehn stimmen ${treffer} überein (bei 100 eng gestreuten Einträgen)`);
  let maxAbw = 0;
  for (let i = 0; i < korpus.length; i++) {
    maxAbw = Math.max(maxAbw, Math.abs(score(korpus[i]) - score(C.decode(C.encode(korpus[i]), DIM))));
  }
  ok(maxAbw < 0.002, `größte Score-Abweichung ${maxAbw.toFixed(5)} (unter dem, was Ränge sinnvoll trennt)`);
}

console.log("\nFail-soft: kaputte Pakete geben null, keinen Unsinn");
ok(C.decode(null, DIM) === null, "kein Paket → null");
ok(C.decode({ s: 1 }, DIM) === null, "Paket ohne Daten → null");
ok(C.decode(C.encode(real[0]), 128) === null, "falsche Dimension → null (statt stiller Fehlrechnung)");
ok(C.decode({ s: 0.5, v: "###" }, DIM) === null, "kaputtes base64 → null");
ok(C.decode(C.encode(new Float32Array(DIM)), DIM) === null, "Null-Vektor → null (nicht durch 0 teilen)");
{
  let threw = false;
  try { C.encode(new Float32Array(0)); } catch (_e) { threw = true; }
  ok(threw, "encode wirft bei leerem Vektor (Programmierfehler, nicht Datenfehler)");
}

console.log("\nText-Hash als Änderungs-Melder");
{
  const a = C.textHash("Rezeptbuch für die Küche");
  ok(/^[0-9a-f]{8}$/.test(a), `acht Hex-Zeichen (${a})`);
  ok(a === C.textHash("Rezeptbuch für die Küche"), "gleicher Text → gleicher Hash (Umlaute stabil)");
  ok(a !== C.textHash("Rezeptbuch für die Kuche"), "ein geändertes Zeichen → anderer Hash");
  ok(C.textHash("") === C.textHash(""), "leerer Text bricht nicht");
  ok(C.textHash(null) === C.textHash(""), "null wird wie leerer Text behandelt");
}

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);
