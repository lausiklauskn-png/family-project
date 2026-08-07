import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const ROOT=process.env.LH_ROOT;
const MIME={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".webmanifest":"application/manifest+json"};
const s=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split("?")[0]); if(p==="/")p="/index.html";
 const fp=path.join(ROOT,p); if(!fp.startsWith(ROOT)||!fs.existsSync(fp)||fs.statSync(fp).isDirectory()){r.writeHead(404);r.end();return;}
 r.writeHead(200,{"content-type":MIME[path.extname(fp)]||"application/octet-stream"}); r.end(fs.readFileSync(fp));});
await new Promise(r=>s.listen(0,r));
const base=`http://127.0.0.1:${s.address().port}`;
const pw=await import("playwright-core");
const b=await pw.chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox","--use-gl=swiftshader","--enable-unsafe-swrast"]});
for (const [w,h,dpr] of [[412,900,2],[1350,940,1],[1920,1080,1],[2560,1440,1]]) {
  const page=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:dpr});
  await page.goto(`${base}/index.html`,{waitUntil:"load"}); await page.waitForTimeout(800);
  const r=await page.evaluate(()=>[...document.querySelectorAll('img.entry-art')].map(i=>{
    const b=i.getBoundingClientRect();
    // object-fit:contain -> echte Malfläche berechnen
    const ar=i.naturalWidth/i.naturalHeight, box=b.width/b.height;
    const gw = box>ar ? b.height*ar : b.width;
    return {datei:i.currentSrc.split('/').pop().split('?')[0], kasten:Math.round(b.width)+'x'+Math.round(b.height),
            gemalt:Math.round(gw)+' px breit', quelle:i.naturalWidth+'px'};}));
  console.log(`\nFenster ${w}x${h} (Pixeldichte ${dpr}) -> gemalte Breite x${dpr} = echte Pixel`);
  for(const i of r) console.log(`  ${i.datei.padEnd(24)} Kasten ${i.kasten.padEnd(11)} gemalt ${i.gemalt.padEnd(14)} braucht ~${Math.round(parseInt(i.gemalt)*dpr)} px · Quelle ${i.quelle}`);
  await page.close();
}
await b.close(); s.close(); process.exit(0);
