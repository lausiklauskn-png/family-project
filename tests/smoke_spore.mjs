/* Headless-Beweis für die eigene Identität: prüft sbkim/spore.json gegen das
 * Modul-02-Signatur-Schema (Ed25519 über die kanonisierte Spore ohne
 * signature-Feld), die nodeId-Ableitung (base64url(sha256(rawPublicKey))) und
 * die L2-Normalisierung des domainVector. Optional (mit Netz): reziproke
 * Cosinus-Verifikation gegen Sage + SB-KIMTool-Point.
 * Lauf:  node tests/smoke_spore.mjs            (nur lokale Prüfung)
 *        node tests/smoke_spore.mjs --net      (zusätzlich Cosinus zu Nachbarn) */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m); } };

function canon(v) {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === "object") { const o = {}; for (const k of Object.keys(v).sort()) o[k] = canon(v[k]); return o; }
  return v;
}
function b64urlToBuf(s) { return Buffer.from(String(s).replace(/-/g, "+").replace(/_/g, "/"), "base64"); }
function verifySpore(s) {
  const u = { ...s }; delete u.signature;
  const msg = Buffer.from(JSON.stringify(canon(u)), "utf8");
  const pub = crypto.createPublicKey({ key: s.publicKey, format: "jwk" });
  return crypto.verify(null, msg, pub, b64urlToBuf(s.signature));
}
function nodeIdFromPub(s) {
  const raw = b64urlToBuf(s.publicKey.x);
  return crypto.createHash("sha256").update(raw).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function dot(a, b) { let d = 0; for (let i = 0; i < a.length; i++) d += a[i] * b[i]; return d; }

console.log("Family Projekt — Spore-Verifikation");
const spore = JSON.parse(fs.readFileSync(path.join(ROOT, "sbkim/spore.json"), "utf8"));
ok(spore.nodeType === "hybrid", "spore: nodeType hybrid");
ok(typeof spore.id === "string" && spore.id.length > 20, "spore: nodeId vorhanden");
ok(verifySpore(spore) === true, "spore: Ed25519-Signatur VALID (Modul-02-Schema)");
ok(nodeIdFromPub(spore) === spore.id, "spore: nodeId == base64url(sha256(rawPublicKey))");
ok(Array.isArray(spore.domainVector) && spore.domainVector.length === 384, "spore: domainVector 384-dim");
const norm = Math.sqrt(spore.domainVector.reduce((s, x) => s + x * x, 0));
ok(Math.abs(norm - 1) < 1e-3, "spore: domainVector L2-normalisiert (Norm≈1)");

if (process.argv.includes("--net")) {
  const PEERS = {
    "Sage": "https://raw.githubusercontent.com/lausiklauskn-png/Sage-Protokol/main/sbkim/spore.json",
    "SB-KIMTool-Point": "https://raw.githubusercontent.com/lausiklauskn-png/SB-KIMTool-Point/main/sbkim/spore.json",
  };
  for (const [name, url] of Object.entries(PEERS)) {
    try {
      const peer = await (await fetch(url)).json();
      const cos = dot(spore.domainVector, peer.domainVector);
      ok(verifySpore(peer) === true, `peer ${name}: Signatur VALID`);
      ok(cos > 0.3, `peer ${name}: Cosinus zu Family = ${cos.toFixed(4)} (semantisch verwandt)`);
    } catch (e) { ok(false, `peer ${name}: nicht erreichbar (${e && e.message})`); }
  }
}

console.log(`\nErgebnis: ${pass}/${pass + fail} grün` + (fail ? `, ${fail} rot` : ""));
process.exit(fail ? 1 : 0);
