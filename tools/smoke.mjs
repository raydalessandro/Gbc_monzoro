/* Smoke test headless del gioco.
   Uso:  node tools/smoke.mjs [--keys "ArrowUp,ArrowUp,z"] [--eval "prologue=true"] [--ms 1200] [--shot out.png]
   Esce 1 se la pagina lancia un errore JS o se una console.error compare. */
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page_url = pathToFileURL(path.join(root, 'index.html')).href;

// il chromium preinstallato non corrisponde alla revisione attesa da playwright:
// glielo passiamo esplicitamente.
import fs from 'node:fs';
const CHROME = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
                process.env.CHROME_PATH].filter(p => p && fs.existsSync(p))[0];
const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

await page.goto(page_url);
await page.waitForTimeout(400);

const pre = arg('--eval');
if (pre) await page.evaluate(src => eval(src), pre);

for (const k of (arg('--keys', '') ? arg('--keys').split(',') : [])) {
  await page.keyboard.press(k.trim());
  await page.waitForTimeout(90);
}

await page.waitForTimeout(Number(arg('--ms', 1200)));

const state = await page.evaluate(() => ({
  mode,
  crew: Object.keys(CREWDEF),
  chars: CHARS.length,
  minigames: Object.keys(MINIGAMES),
  talk: Object.keys(TALK_HANDLERS),
  stepHooks: MAP_HOOKS.length,
  drawHooks: DRAW_HOOKS.length,
  // il canvas sta davvero disegnando qualcosa?
  painted: (() => {
    const d = cv.getContext('2d').getImageData(0, 0, 160, 144).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return n;
  })(),
}));

const shot = arg('--shot');
if (shot) await page.screenshot({ path: shot });

await browser.close();

console.log(JSON.stringify(state, null, 2));
if (state.painted < 1000) errors.push('il canvas sembra vuoto (painted=' + state.painted + ')');
if (errors.length) { console.error('\nFALLITO:\n' + errors.join('\n')); process.exit(1); }
console.log('\nOK: nessun errore JS.');
