// Frame renderer: serves the repo, opens a project's generated page in headless Chrome and captures frames.
// Called by story.mjs — you normally don't run this directly.
//   node engine/render.mjs <page> video <out.mp4> [audio.wav]   full MP4 (FROM / TO env = seconds window)
//   node engine/render.mjs <page> stills <dir> <t1> <t2> ...    PNG stills
// <page> is the page path under the repo root, e.g. projects/my-story/.build/index.html
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [pagePath, mode = 'video', ...rest] = process.argv.slice(2);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff2': 'font/woff2' };

const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(root)) return res.writeHead(403).end();
  fs.readFile(f, (err, data) => (err ? res.writeHead(404).end() : res.writeHead(200, { 'content-type': MIME[path.extname(f)] ?? 'application/octet-stream' }).end(data)));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));

// Installed Google Chrome first; else Playwright's own Chromium (`npx playwright-core install chromium`, which is what
// setup_environment.sh does on ARM Linux, where Chrome doesn't exist). BROWSER=chrome | chromium forces one.
// --disable-dev-shm-usage: containers ship a tiny /dev/shm and Chrome crashes on long renders without it.
async function launch() {
  // WebGL (the 3D city): the GPU where there is one, else SwiftShader, which recent Chrome only allows with this flag
  const args = ['--disable-dev-shm-usage', '--enable-unsafe-swiftshader'];
  if (process.env.BROWSER !== 'chromium') {
    try { return await chromium.launch({ channel: 'chrome', args }); } catch (e) { if (process.env.BROWSER === 'chrome') throw e; }
  }
  try { return await chromium.launch({ args }); } catch (e) {
    console.error('No browser found: install Google Chrome, or run `npx playwright-core install --with-deps chromium` (see setup_environment.sh).');
    throw e;
  }
}
const browser = await launch();
async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => { console.error('pageerror:', e); process.exit(1); });
  page.on('console', m => m.type() === 'error' && !m.text().includes('404') && console.error('console:', m.text()));
  await page.goto(`http://127.0.0.1:${server.address().port}/${pagePath}`);
  await page.waitForFunction('window.READY === true', null, { timeout: 30000 });
  return page;
}
const grab = (page, f) => page.evaluate(async f => { await renderFrame(f); return document.getElementById('c').toDataURL('image/png').slice(22); }, f).then(b => Buffer.from(b, 'base64'));
const page = await openPage();
const fps = await page.evaluate('FPS');
const run = (cmd, args) => new Promise((ok, fail) => spawn(cmd, args, { stdio: 'inherit' }).on('close', c => (c ? fail(new Error(`${cmd} exit ${c}`)) : ok())));

if (mode === 'stills') {
  const [dir, ...times] = rest;
  fs.mkdirSync(dir, { recursive: true });
  for (const s of times) fs.writeFileSync(path.join(dir, `t${(+s).toFixed(2)}.png`), await grab(page, Math.round(+s * fps)));
} else {
  const [out, audioPath] = rest;
  const audio = audioPath && fs.existsSync(audioPath);
  const silent = audio ? path.join(path.dirname(out), `.silent-${path.basename(out)}`) : out;
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', process.env.CRF ?? '25', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', silent],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((ok, fail) => ff.on('close', c => (c ? fail(new Error(`ffmpeg exit ${c}`)) : ok())));
  // frames are deterministic, so N pages render in parallel and are written back in order
  const total = await page.evaluate('FPS * DUR'), f0 = Math.round((+process.env.FROM || 0) * fps), f1 = process.env.TO ? Math.min(total, Math.round(+process.env.TO * fps)) : total;
  const pages = [page, ...(await Promise.all(Array.from({ length: +(process.env.WORKERS ?? 4) - 1 }, openPage)))];
  const ready = new Map();
  let next = f0, written = f0;
  await Promise.all(pages.map(async p => {
    while (next < f1) {
      const f = next++;
      ready.set(f, await grab(p, f));
      while (ready.has(written)) {
        const buf = ready.get(written); ready.delete(written);
        if (written % 300 === 0) console.log(`frame ${written}/${f1}`);
        written++;
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      }
    }
  }));
  ff.stdin.end();
  await done;
  if (audio) {   // mux the mix, normalised to -14 LUFS
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-ss', String(f0 / fps), '-i', audioPath, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
      ...(process.env.LOUDNORM === '0' ? [] : ['-af', 'loudnorm=I=-14:TP=-1.5:LRA=11']), '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', out]);
    fs.unlinkSync(silent);
  }
}
await browser.close();
server.close();
