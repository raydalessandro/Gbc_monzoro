# Contratto dei moduli — MERICCO / Cronache di Monzoro

Il gioco è un singolo file statico `index.html` (canvas 160×144, stile Game Boy Color).
Ogni nuova feature è un **modulo autonomo** appeso in fondo allo `<script>`.

## Regola d'oro

Il tuo modulo vive in un **file tutto suo**: `modules/<nome>.js`.
Non modificare `index.html` a mano: lo genera `node tools/build.mjs`, che inietta
tutti i `modules/*.js` fra i marcatori `MODULES:BEGIN` / `MODULES:END`.

**Committa solo il tuo `modules/<nome>.js`.** Le modifiche a `index.html` prodotte dal
build servono solo a te per provare: lasciale fuori dal commit, l'integrazione la fa
il coordinatore con un unico build finale.

Non modificare nessun'altra riga del gioco: né `MAP`, né `SOLID`, né `talk()`,
né `update()`, `draw()`, `drawDiario()`, `finishMove()`. Servono a far convivere
i moduli scritti in parallelo. Se ti sembra di aver bisogno di toccarli, non ti serve:
usa i registri qui sotto.

Racchiudi tutto in una IIFE per non sporcare lo scope globale:

```js
/* ---------- MODULO: NOMEFEATURE ---------- */
(function(){
  ...
})();
```

## Registri disponibili

| API | Cosa fa |
|---|---|
| `addCrew(id, def)` | Aggiunge un personaggio sulla mappa. `def = {name, col, cm, x, y, home}` |
| `registerTalk(id, fn)` | `fn(char, st)` chiamata quando il giocatore parla al personaggio |
| `registerMinigame(nome, {update, draw})` | Registra una modalità; entri con `mode = nome`, esci con `mode = "map"` |
| `onStep(fn)` | `fn(x, y)` dopo ogni casella raggiunta dal giocatore |
| `onDrawMap(fn)` | `fn(camX, camY)` per disegnare sopra la mappa |
| `addStatLine(fn)` | `fn()` → stringa mostrata nella pagina 2 del diario |
| `EXT` | Oggetto libero, salvato/ricaricato in automatico. Usa una tua chiave: `EXT.miofeature` |

`addCrew` — `cm` è la ricolorazione dello sprite base: mappa le lettere della palette,
tipicamente `{R:"<testa>", B:"<maglia>"}`. Lettere disponibili in `PAL`:
`K` nero, `R` rosso, `B` blu, `S` incarnato, `D` grigio scuro, `W` bianco, `G` verde,
`L` verde chiaro, `Y` giallo, `O` arancio, `P` rosa, `A` grigio, `V` lime, `U` viola.

## Stato e progressione

- `crew[id]` — `0` non iniziata, `1` in corso, `2` completata. È già persistito.
- A missione finita: `crew[id] = 2; respect += N; doSave();`
- I nuovi personaggi **non** contano per il finale (`pronti()` guarda solo i 6 originali):
  sono contenuto extra, non allungano il percorso principale né rompono i salvataggi.

## Input dentro `update()` di un minigioco

- `aPressed` / `bPressed` — booleani, azzerati a ogni frame (tasto A / B e Z / X)
- `dirTapped` — `"up" | "down" | "left" | "right" | null`, singola pressione
- `keys` — `{up, down, left, right}` per il tasto tenuto premuto

Sono gli **unici** input: su telefono esistono solo croce direzionale, A e B.
Non aggiungere listener di tastiera né bottoni HTML.

## Disegno

`ctx` su canvas `VW`×`VH` (160×144). Convenzioni del file:

```js
ctx.fillStyle="#0d1f16"; ctx.fillRect(0,0,VW,VH);
ctx.font="bold 8px 'Courier New',monospace"; ctx.textBaseline="top";
```

A 8px stanno ~26 caratteri per riga, a 9px ~22. Non sforare i 160px.

## Audio

`sfx.a() .b() .pad(i) .hit() .miss() .pick() .win() .beat() .msg()`
oppure `beep(freq, dur, delay, vol, type)`. Niente file audio esterni.

## Dialoghi

- `openDialog([r1, r2, r3, r4])` — max 4 righe, ~22 caratteri l'una
- `playScene([{lines:[...]}, {lines:[...]}], fnFinale)` — più riquadri in sequenza
- `toast("MESSAGGIO")` — banner breve in cima

Stile: italiano, tono ironico e asciutto come il resto del gioco. **Niente lettere
accentate né caratteri speciali** nei dialoghi: il file scrive `e'`, `piu'`, `perche'`.

## Vincoli tecnici

- Nessuna dipendenza esterna, nessun `fetch`, nessun asset remoto: il file deve restare autonomo.
- Deve girare su Safari iOS: niente API solo-Chrome. Sintassi ES2017 tranquilla.
- Non toccare `AudioContext` (già sbloccato al primo tap).

## Verifica prima di consegnare

```sh
npm i -D playwright            # se non già presente
node tools/build.mjs           # inietta il tuo modulo in index.html
node tools/smoke.mjs --ms 1000
node tools/smoke.mjs --eval "prologue=true; player.x=<x>; player.y=<y>" --keys "z" --ms 800 --shot /tmp/x.png
```

Lo smoke test fallisce se la pagina lancia un errore JS o se il canvas resta vuoto.
Va eseguito **verde** prima di committare.
