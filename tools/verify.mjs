/* Verifica d'integrazione: controlla la coerenza dei moduli e prova a parlare
   con ogni personaggio, pestando i tasti dentro ogni minigioco a caccia di errori.
   Uso: node tools/verify.mjs [--shots DIR] */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const shotsDir = arg('--shots');
if (shotsDir) fs.mkdirSync(shotsDir, { recursive: true });

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = pathToFileURL(path.join(root, 'index.html')).href;

const CHROME = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', process.env.CHROME_PATH]
  .filter(p => p && fs.existsSync(p))[0];
const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

let errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

await page.goto(url);
await page.waitForTimeout(400);

const fail = [];
const note = s => console.log(s);

/* ---- 1. coerenza dei registri ---- */
const reg = await page.evaluate(() => ({
  crewDef: Object.keys(CREWDEF),
  chars: CHARS.map(c => ({ id: c.id, x: c.x, y: c.y, hx: c.hx, hy: c.hy })),
  minigames: Object.keys(MINIGAMES),
  talk: Object.keys(TALK_HANDLERS),
  steps: MAP_HOOKS.length,
  stats: STAT_LINES.length,
}));
note('personaggi : ' + reg.crewDef.join(', '));
note('minigiochi : ' + reg.minigames.join(', '));
note('dialoghi   : ' + reg.talk.join(', '));
note('hook passo : ' + reg.steps + '   righe diario extra: ' + reg.stats);

if (reg.chars.length !== reg.crewDef.length)
  fail.push(`CHARS (${reg.chars.length}) non allineato a CREWDEF (${reg.crewDef.length})`);

const seen = new Map();
for (const c of reg.chars) {
  const k = c.x + ',' + c.y;
  if (seen.has(k)) fail.push(`due personaggi sulla stessa casella ${k}: ${seen.get(k)} e ${c.id}`);
  seen.set(k, c.id);
  if (c.hx === undefined || c.hy === undefined) fail.push(`${c.id} senza posizione di casa`);
}

/* ---- 2. tutti raggiungibili a piedi dal punto di partenza ---- */
const unreachable = await page.evaluate(() => {
  const blocked = new Set(CHARS.map(c => c.x + ',' + c.y));
  const seen = new Set(['24,22']); const q = [[24, 22]];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
      if (seen.has(k) || blocked.has(k) || SOLID.has(tileAt(nx, ny))) continue;
      seen.add(k); q.push([nx, ny]);
    }
  }
  return CHARS.filter(c => ![[0, 1], [0, -1], [1, 0], [-1, 0]]
    .some(([dx, dy]) => seen.has((c.x + dx) + ',' + (c.y + dy)))).map(c => c.id);
});
if (unreachable.length) fail.push('personaggi irraggiungibili: ' + unreachable.join(', '));
else note('raggiungibilita: tutti i personaggi sono avvicinabili a piedi');

/* ---- 3. parla con ognuno ed esercita il minigioco ---- */
const KEYS = ['z', 'z', 'ArrowLeft', 'z', 'ArrowRight', 'z', 'ArrowDown', 'z', 'ArrowUp', 'z', 'z', 'z'];
for (const c of reg.chars) {
  const before = errors.length;
  await page.evaluate(({ x, y }) => {
    mode = 'map'; dialog = null; scene = null; mini = null; prologue = true;
    player.x = x; player.y = y + 1; player.dir = 'up';
    player.moving = false; player.ox = 0; player.oy = 0;
    aPressed = true;
  }, c).catch(e => fail.push(`${c.id}: impossibile posizionare il giocatore (${e.message})`));
  await page.waitForTimeout(250);
  for (const k of KEYS) { await page.keyboard.press(k); await page.waitForTimeout(70); }
  await page.waitForTimeout(250);
  const mode = await page.evaluate(() => mode);
  if (shotsDir) await page.screenshot({ path: path.join(shotsDir, c.id + '.png') });
  const nuovi = errors.slice(before);
  note(`  ${c.id.padEnd(9)} -> mode=${String(mode).padEnd(10)} ${nuovi.length ? 'ERRORI: ' + nuovi.join(' | ') : 'ok'}`);
  if (nuovi.length) fail.push(`parlando con ${c.id}: ${nuovi.join(' | ')}`);
}

/* ---- 4. una passeggiata nell'erba alta ---- */
{
  const before = errors.length;
  await page.evaluate(() => {
    mode = 'map'; dialog = null; mini = null; prologue = true;
    player.x = 10; player.y = 20; player.moving = false;
  });
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press(i % 2 ? 'ArrowDown' : 'ArrowUp');
    await page.waitForTimeout(60);
    await page.keyboard.press('z');
  }
  await page.waitForTimeout(300);
  const m = await page.evaluate(() => mode);
  note(`  erba alta -> mode=${m} ${errors.length > before ? 'ERRORI' : 'ok'}`);
  if (errors.length > before) fail.push('nell erba alta: ' + errors.slice(before).join(' | '));
  if (shotsDir) await page.screenshot({ path: path.join(shotsDir, 'erba.png') });
}

/* ---- 5. il salvataggio regge un ricaricamento ---- */
{
  await page.evaluate(() => { mode = 'map'; doSave(); });
  const before = errors.length;
  await page.reload();
  await page.waitForTimeout(700);
  if (errors.length > before) fail.push('ricaricando con un salvataggio: ' + errors.slice(before).join(' | '));
  else note('salvataggio: ricaricato senza errori');
}

await browser.close();

if (fail.length) {
  console.error('\nFALLITO (' + fail.length + '):\n- ' + fail.join('\n- '));
  process.exit(1);
}
console.log('\nOK: integrazione verificata.');
