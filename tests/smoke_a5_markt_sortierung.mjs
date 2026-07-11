// Headless-Smoke für A5 (2026-07-11) — Multi-Query-SORTIERUNG im family
// Marktplatz-Suchfeld (markt.html, "Nach Bedeutung suchen"). Run:
//   node tests/smoke_a5_markt_sortierung.mjs
//
// Der Marktplatz ist eine SORTIER-Fläche (ordnet ALLE Einträge um, versteckt
// nichts). A5 fügt Multi-Query als Sortier-Verbesserung hinzu: die Frage wird
// über MK_SYN aufgefächert, jeder Eintrag mit dem BESTEN Cosinus über alle
// Frage-Varianten bewertet. Kein queryLocal-Filter, kein 0.80-Boden.
//
// Der Test nutzt die AUSGELIEFERTE MK_SYN-Karte aus markt.html (Verdrahtungs-
// Guard) + das ausgelieferte Modul 04 (expandQuerySimple). Embeddings sind
// deterministisch gemockt, um die SCORING-LOGIK exakt zu prüfen (nicht die
// Modell-Qualität): „kfz" → Variante „auto"; der „auto"-Eintrag richtet sich am
// „auto"-Variantenvektor aus und muss nach OBEN sortiert werden — während kein
// Eintrag verschwindet.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

globalThis.window = globalThis;

const DIM = 384;
function unit(i) { const v = new Float32Array(DIM); v[i] = 1; return v; }

// Deterministisch gemockte Embeddings: jede Frage-Variante bekommt einen
// eigenen Achsen-Vektor; die Einträge liegen auf festen Achsen.
const QVEC = { "kfz": unit(0), "auto": unit(1), "wagen": unit(2) };
globalThis.SbkimEmbedding = {
  init: async () => {},
  embedQuery: async (t) => QVEC[t] || unit(9),
  embedPassageBatch: async (texts) => texts.map((t) => /auto|kfz|werkstatt/i.test(t) ? unit(1) : unit(5)),
};

// Ausgeliefertes Modul 04 (für expandQuerySimple + match/Cosinus).
const src = readFileSync(resolve(repoRoot, "sbkim/04_match.js"), "utf8");
new Function("global", "window", "globalThis", "console", src)(
  globalThis, globalThis, globalThis, console,
);
const M = globalThis.SbkimMatch;

// MK_SYN aus der AUSGELIEFERTEN markt.html extrahieren.
const html = readFileSync(resolve(repoRoot, "markt.html"), "utf8");
const a = html.indexOf("var MK_SYN");
if (a < 0) { console.error("FAIL: MK_SYN nicht in markt.html gefunden"); process.exit(1); }
const eq = html.indexOf("=", a);
const end = html.indexOf("};", eq) + 2;
const MK_SYN = new Function("return " + html.slice(eq + 1, end).trim())();

// Einträge wie window.FP_LISTINGS.
const ALL = [
  { label: "Wespen-Tisch", text: "hausmittel gegen wespen", anchorId: "m-wespen" },
  { label: "Auto-Werkstatt", text: "reparatur auto werkstatt inspektion", anchorId: "m-auto" },
];

// semanticSearch-Scoring aus markt.html nachgebildet (Multi-Query max-Cosinus).
async function sortByMeaning(q) {
  const vecs = await SbkimEmbedding.embedPassageBatch(ALL.map((x) => x.text || x.label));
  let variants = [q];
  if (typeof M.expandQuerySimple === "function") {
    const vv = M.expandQuerySimple(q, { synonyms: MK_SYN });
    if (Array.isArray(vv) && vv.length) variants = vv;
  }
  const qvs = await Promise.all(variants.map((v) => SbkimEmbedding.embedQuery(v)));
  return ALL.map((x, i) => {
    let best = -Infinity;
    for (let j = 0; j < qvs.length; j++) { const s = M.match(qvs[j], vecs[i]); if (s > best) best = s; }
    return { x, s: best };
  }).sort((p, q2) => q2.s - p.s);
}

let ok = 0, fail = 0;
function check(name, cond) { if (cond) { ok++; console.log("  ✓ " + name); } else { fail++; console.log("  ✗ " + name); } }

async function run() {
  console.log("Probe 0 — ausgelieferte MK_SYN-Karte");
  check("MK_SYN hat Einträge", MK_SYN && Object.keys(MK_SYN).length > 0);
  check("kfz → auto verdrahtet", Array.isArray(MK_SYN.kfz) && MK_SYN.kfz.includes("auto"));

  console.log("\nProbe 1 — Multi-Query hebt den Synonym-Treffer nach OBEN");
  const scored = await sortByMeaning("kfz");
  check("Auto-Werkstatt steht an erster Stelle (via Variante 'auto')", scored[0].x.anchorId === "m-auto");
  check("Auto-Werkstatt-Score > Wespen-Score", scored[0].s > scored[1].s);

  console.log("\nProbe 2 — SORTIER-Fläche: nichts wird versteckt");
  check("alle Einträge bleiben in der Ansicht (kein Filter)", scored.length === ALL.length);

  console.log("\nProbe 3 — ohne Synonyme (reines 'kfz') gäbe es keinen Cosinus-Vorsprung");
  const vecs = await SbkimEmbedding.embedPassageBatch(ALL.map((x) => x.text || x.label));
  const qv = await SbkimEmbedding.embedQuery("kfz");
  const singleAuto = M.match(qv, vecs[1]);
  check("Single-Query 'kfz' trifft den 'auto'-Eintrag NICHT (Cosinus 0) — Multi-Query war nötig", singleAuto === 0);

  console.log("\n" + (fail === 0 ? "ALLE GRÜN" : "ROT") + " — " + ok + " ok, " + fail + " fail");
  process.exit(fail === 0 ? 0 : 1);
}
run().catch((e) => { console.error("WURF:", e); process.exit(1); });
