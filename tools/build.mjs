/* Inietta modules/*.js dentro index.html, fra i marcatori MODULES.
   Idempotente: rigenera sempre la regione da zero.
   Uso: node tools/build.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'index.html');
const modDir = path.join(root, 'modules');

const BEGIN = '/* <<< MODULES:BEGIN >>> */';
const END = '/* <<< MODULES:END >>> */';

const html = fs.readFileSync(target, 'utf8');
const i = html.indexOf(BEGIN);
const j = html.indexOf(END);
if (i < 0 || j < 0 || j < i) {
  console.error('Marcatori MODULES non trovati in index.html');
  process.exit(1);
}

const files = fs.existsSync(modDir)
  ? fs.readdirSync(modDir).filter(f => f.endsWith('.js')).sort()
  : [];

const body = files
  .map(f => fs.readFileSync(path.join(modDir, f), 'utf8').replace(/\s+$/, ''))
  .join('\n\n');

const out = html.slice(0, i + BEGIN.length) + '\n' +
  (body ? body + '\n' : '') +
  html.slice(j);

fs.writeFileSync(target, out);
console.log('moduli iniettati: ' + (files.length ? files.join(', ') : '(nessuno)'));
