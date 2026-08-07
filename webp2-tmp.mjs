/* PNG -> WebP über Chromium, mit optionaler Bild-Aufbereitung.
 * Aufruf: node webp2-tmp.mjs <breite|0=original> <guete> <filter> <datei…>
 * filter: "" (keiner) oder CSS-Filter, z.B. "contrast(1.12) saturate(1.10)" */
import fs from "node:fs"; import path from "node:path";
const pw = await import("playwright-core");
const [zielBreite, guete, filter, ...dateien] = process.argv.slice(2);
const browser = await pw.chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swrast"],
});
const page = await browser.newPage();
for (const datei of dateien) {
  const roh = fs.readFileSync(datei);
  const typ = datei.toLowerCase().endsWith(".png") ? "png" : "webp";
  const ergebnis = await page.evaluate(async ([src, maxW, q, f]) => {
    const img = new Image();
    await new Promise((ok, err) => { img.onload = ok; img.onerror = err; img.src = src; });
    const skal = maxW > 0 ? Math.min(1, maxW / img.naturalWidth) : 1;
    const w = Math.round(img.naturalWidth * skal), h = Math.round(img.naturalHeight * skal);
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    if (f) ctx.filter = f;
    ctx.drawImage(img, 0, 0, w, h);
    return { data: c.toDataURL("image/webp", q), w, h, altW: img.naturalWidth, altH: img.naturalHeight };
  }, ["data:image/" + typ + ";base64," + roh.toString("base64"), Number(zielBreite), Number(guete), filter]);
  const ziel = datei.replace(/\.(png|webp)$/i, ".webp");
  const buf = Buffer.from(ergebnis.data.split(",")[1], "base64");
  fs.writeFileSync(ziel, buf);
  console.log(`${path.basename(ziel).padEnd(24)} ${ergebnis.w}x${ergebnis.h}  ${(buf.length/1024).toFixed(0)} KiB` +
    (filter ? `  Filter: ${filter}` : ""));
}
await browser.close(); process.exit(0);
