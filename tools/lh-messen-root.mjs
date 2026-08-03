/* Lighthouse gegen einen Server, der Klaus' Caddy nachbildet — wie
 * tools/lh-messen.mjs, aber fuer ein ANDERES Repo als family-project.
 *
 *   LH_ROOT=/home/user/Tomys-Hub node tools/lh-messen-root.mjs showcase/index.html --laeufe=3
 *
 * Warum es das gibt: die Arbeitsordnung nennt genau diesen Befehl, aber die
 * Datei fehlte — lh-messen.mjs liefert fest aus family-project aus. Wer ein
 * anderes Repo messen wollte, stand vor "Cannot find module" (passiert am
 * 2026-08-03 beim Schaufenster von Tomys-Hub). Ohne LH_ROOT verhaelt es sich
 * exakt wie lh-messen.mjs.
 *
 * Es wird aus family-project heraus aufgerufen, auch wenn ein fremdes Repo
 * gemessen wird: hier liegen lighthouse und playwright-core.
 *
 * Zwingend (jedes einzelne hat schon Zeit gekostet, siehe Brief Paragraf 5):
 *   - gzip AN, sonst misst man den Pruefserver statt der Seite.
 *   - KEINE Cache-Kopfzeilen — Klaus' Caddy setzt heute auch keine.
 *   - Lighthouse selbst messen lassen (drosselt den Prozessor vierfach).
 *     Ein eigener PerformanceObserver-Aufbau misst 0, weil ungedrosselt
 *     alle zwanzig Skripte vor dem ersten Bild fertig sind.
 *   - Welches Element springt, sagt erst der Trace (--trace), nicht der Bericht.
 *   - MEHRERE Laeufe (--laeufe=3): die Leistungszahl schwankt.
 *
 * ACHTUNG bei dem, was Lighthouse NICHT sieht: es laesst die Seite auf der
 * schnellen Maschine laufen und rechnet die Langsamkeit erst hinterher hoch.
 * Eine Notbremse im Seiten-Code, die auf gemessenen Bildzeiten beruht, greift
 * hier deshalb NIE — sie kann die Messzahl nicht verbessern, obwohl sie auf
 * einem echten langsamen Geraet wirkt (Befund 2026-08-03, Tomys-Hub).
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(process.env.LH_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const SEITE = process.argv[2] || "werkzeuge.html";
const MIT_TRACE = process.argv.includes("--trace");
const LAEUFE = Number((process.argv.find((a) => a.startsWith("--laeufe=")) || "").split("=")[1] || 1);

const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",
  ".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",
  ".jpg":"image/jpeg",".ico":"image/x-icon",".wasm":"application/wasm",".txt":"text/plain",
  ".woff2":"font/woff2",".xml":"application/xml",".webmanifest":"application/manifest+json" };
const KOMPRIMIERBAR = /^(text\/|application\/(javascript|json|xml|manifest)|image\/svg)/;

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
    res.writeHead(404, { "content-type": "text/plain" }); res.end("404"); return;
  }
  const typ = MIME[path.extname(fp)] || "application/octet-stream";
  const buf = fs.readFileSync(fp);
  const willGzip = KOMPRIMIERBAR.test(typ) && /gzip/.test(req.headers["accept-encoding"] || "");
  // Bewusst KEIN cache-control / etag / last-modified — wie Caddy heute.
  if (willGzip) {
    const g = zlib.gzipSync(buf);
    res.writeHead(200, { "content-type": typ, "content-encoding": "gzip", "content-length": g.length });
    res.end(g);
  } else {
    res.writeHead(200, { "content-type": typ, "content-length": buf.length });
    res.end(buf);
  }
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

const pw = await import("playwright-core");
const exe = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

for (let lauf = 1; lauf <= LAEUFE; lauf++) {
  const browser = await pw.chromium.launch({
    executablePath: exe,
    args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swrast", "--remote-debugging-port=9222"],
  });
  const lh = (await import("lighthouse")).default;
  const res = await lh(`${base}/${SEITE}`, { port: 9222, output: "json", logLevel: "error" });
  const r = res.lhr;

  const kat = (k) => (r.categories[k] ? Math.round(r.categories[k].score * 100) : "-");
  console.log(`\n=== ${SEITE} — Lauf ${lauf}/${LAEUFE} ===`);
  console.log(`Leistung ${kat("performance")} · Barrierefreiheit ${kat("accessibility")} · ` +
    `Gute Praxis ${kat("best-practices")} · SEO ${kat("seo")}`);
  console.log(`CLS ${r.audits["cumulative-layout-shift"].displayValue} · ` +
    `LCP ${r.audits["largest-contentful-paint"].displayValue} · ` +
    `TBT ${r.audits["total-blocking-time"].displayValue}`);

  const ls = r.audits["layout-shifts"];
  if (ls && ls.details && ls.details.items && ls.details.items.length) {
    console.log("\nlayout-shifts (Bericht):");
    for (const it of ls.details.items) {
      console.log(`  ${(it.score || 0).toFixed(4)}  ${(it.node && it.node.selector) || "?"}`);
    }
  }

  for (const id of ["heading-order", "color-contrast", "label", "link-name", "button-name",
                    "image-alt", "aria-allowed-attr", "target-size", "landmark-one-main"]) {
    const a = r.audits[id];
    if (a && a.score !== null && a.score < 1) {
      console.log(`\n⚠ ${id}: ${a.title}`);
      for (const it of (a.details && a.details.items) || []) {
        console.log(`    ${(it.node && it.node.selector) || JSON.stringify(it).slice(0, 120)}`);
      }
    }
  }

  if (MIT_TRACE) {
    const ev = (res.artifacts.Trace && res.artifacts.Trace.traceEvents) || [];
    const shifts = ev.filter((e) => e.name === "LayoutShift" && e.args && e.args.data);
    console.log(`\nTrace: ${shifts.length} LayoutShift-Ereignisse`);
    for (const s of shifts) {
      const d = s.args.data;
      if (!d.score) continue;
      console.log(`\n  score ${d.score.toFixed(4)}  had_recent_input=${d.had_recent_input}`);
      for (const n of d.impacted_nodes || []) {
        const o = n.old_rect || [], w = n.new_rect || [];
        const dx = (w[0] ?? 0) - (o[0] ?? 0), dy = (w[1] ?? 0) - (o[1] ?? 0);
        const db = (w[2] ?? 0) - (o[2] ?? 0), dh = (w[3] ?? 0) - (o[3] ?? 0);
        console.log(`    node ${n.node_id}  alt[${o}]  neu[${w}]  ` +
          `Δx=${dx} Δy=${dy} Δb=${db} Δh=${dh}`);
      }
    }
  }

  await browser.close();
}
server.close();
