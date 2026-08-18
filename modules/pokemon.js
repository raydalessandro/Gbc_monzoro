/* ---------- MODULO: POKEMON (incontri nell'erba alta) ----------
   Cammini sulla casella "G", ogni tanto salta fuori qualcosa.
   LOTTA o FUGA, due o tre colpi, e si torna a girare Monzoro. */
(function(){

  var RATE  = 0.13;   // probabilita' di incontro per passo nell'erba alta
  var COOL  = 3;      // passi di tregua dopo una battaglia
  var PMAX  = 24;     // PV massimi dell'OTTAVO
  var MSGT  = 40;     // frame di lettura (+26 per riga) prima che il messaggio scorra da solo
  var REG   = 12;     // passi per recuperare 1 PV

  /* ================= SPRITE DELLE CREATURE ================= */

  var sprZanz = makeSprite([
    "................",
    "...A........A...",
    "....A......A....",
    "....KKKKKKKK....",
    "...KRRKKKKRRK...",
    "...KRRKKKKRRK...",
    "....KKKKKKKK....",
    "WWW..KDDDDK..WWW",
    "WWWWWKDDDDKWWWWW",
    "WWWWWKDDDDKWWWWW",
    ".WWW.KDDDDK.WWW.",
    "..A..KDADAK..A..",
    ".A...KDDDDK...A.",
    "A....KDADAK....A",
    "......KRRK......",
    ".......KK......."]);

  var sprRand = makeSprite([
    "................",
    "..KK........KK..",
    ".KAAK......KAAK.",
    ".KAAAKKKKKKAAAK.",
    ".KAAAAAAAAAAAAK.",
    ".KAYYKAAAAKYYAK.",
    ".KAYYKAAAAKYYAK.",
    ".KAAAAPPPPAAAAK.",
    "..KAAAKKKKAAAK..",
    "...KKAAAAAAKK...",
    "....KAWWWWAK.KK.",
    "....KAWWWWAKKAAK",
    "...KAAWWWWAAKAAK",
    "...KAAAAAAAAKKKK",
    "...KWWKKKKWWK...",
    "....KKK..KKK...."]);

  var sprNutr = makeSprite([
    "................",
    "...KK......KK...",
    "..KDDK....KDDK..",
    "..KDDDKKKKDDDK..",
    "...KDDDDDDDDK...",
    "..KDDDDDDDDDDK..",
    "..KWWWDDDDWWWK..",
    "..KWKWDDDDWKWK..",
    "..KWWWDDDDWWWK..",
    "AAKDDDKPPKDDDKAA",
    ".AKDDKKKKKKDDKA.",
    "..KDKOOKKOOKDK..",
    "..KDKOOKKOOKDK..",
    "..KDDKKKKKKDDK..",
    "..KDDDDDDDDDDK..",
    "...KKKKKKKKKK..."]);

  var sprCorn = makeSprite([
    "................",
    "....DDDDD.......",
    "...DDDDDDD......",
    "..DDWKDDDDD.....",
    "YYDDDDDDDDDD....",
    "YY.DDDDDDDDD....",
    "...DDDAAAADDD...",
    "...DAAAAAAADDD..",
    "..DAAAAAAAAADDD.",
    "..DAAAAAAAAADDDD",
    "..DAAAAAAAADDDDD",
    "..DDAAAAAADDDD..",
    "...DDAAAADD.....",
    "....DDDDD.......",
    "....YKKY........",
    "...YYKKYY......."]);

  var sprNebb = makeSprite([
    "................",
    "....AAAA........",
    "..AAWWWWAA......",
    ".AWWWWWWWWAA....",
    ".AWWWWWWWWWWA...",
    "AWWKKWWWWKKWWA..",
    "AWWKKWWWWKKWWWA.",
    "AWWWWWWWWWWWWWA.",
    "AWWWWWWWWWWWWWA.",
    ".AWWWKKKKWWWWA..",
    ".AWWWWWWWWWWA...",
    "..AWWWWWWWWA....",
    "...AWAWAWAWA....",
    "....A.A.A.A.....",
    "......A.A.......",
    "................"]);

  /* ================= LE CINQUE ================= */

  var BESTIE = [
    { id:"zanz", nome:"ZANZARONA", art:"una", f:true, spr:sprZanz,
      hp:12, w:38, rsp:6, weak:"SPINTONE", res:"URLACCIO",
      atk:[{n:"PUNTURA",d:[2,4],p:.9},{n:"PUNTURA",d:[2,4],p:.9},{n:"RONZIO",d:[1,2],p:1}] },

    { id:"rand", nome:"RANDAGIO", art:"un", f:false, spr:sprRand,
      hp:18, w:24, rsp:8, weak:"URLACCIO", res:"BOMBOLETTA",
      atk:[{n:"GRAFFIO",d:[3,5],p:.9},{n:"GRAFFIO",d:[3,5],p:.9},{n:"SGUARDO",eff:"stare",p:1}] },

    { id:"nutr", nome:"NUTRIONE", art:"un", f:false, spr:sprNutr,
      hp:26, w:19, rsp:10, weak:"BOMBOLETTA", res:"SPINTONE",
      atk:[{n:"MORSO",d:[4,6],p:.85},{n:"MORSO",d:[4,6],p:.85},{n:"ONDATA",d:[6,9],p:.6}] },

    { id:"corn", nome:"CORNACCHIA", art:"una", f:true, spr:sprCorn,
      hp:16, w:13, rsp:9, weak:"URLACCIO", res:"SPINTONE",
      atk:[{n:"BECCATA",d:[3,5],p:.9},{n:"BECCATA",d:[3,5],p:.9},{n:"SCIPPO",d:[1,2],p:.8,eff:"steal"}] },

    { id:"nebb", nome:"NEBBIOTTO", art:"un", f:false, spr:sprNebb,
      hp:22, w:6, rsp:14, weak:"BOMBOLETTA", res:"SPINTONE",
      atk:[{n:"UMIDITA'",d:[2,4],p:1},{n:"UMIDITA'",d:[2,4],p:1},{n:"SI DIRADA",eff:"dodge",p:1}] }
  ];

  var MOSSE = [
    {n:"SPINTONE",   d:[5, 8], p:.95, tag:"sicuro"},
    {n:"BOMBOLETTA", d:[8,12], p:.70, tag:"rischio"},
    {n:"URLACCIO",   d:[3, 5], p:1.0, tag:"spaventa", scare:1}
  ];

  /* ================= STATO PERSISTENTE ================= */

  function st(){
    var P = EXT.poke;
    if(!P || typeof P !== "object"){ P = EXT.poke = {}; }
    if(typeof P.hp !== "number" || P.hp < 0 || P.hp > PMAX) P.hp = PMAX;
    if(!(P.seen instanceof Array)) P.seen = [];
    if(!(P.beat instanceof Array)) P.beat = [];
    if(typeof P.cool !== "number") P.cool = 0;
    if(typeof P.reg  !== "number") P.reg  = 0;
    return P;
  }
  st();

  /* ================= MOTORE DI BATTAGLIA ================= */

  var B = null;      // stato della battaglia in corso
  var BUF = [];      // coda in costruzione

  function rnd(a,b){ return a + (Math.random()*(b-a+1)|0); }
  function say(lines){ BUF.push({m:lines}); }
  function act(fn){ BUF.push({fn:fn}); }
  function flush(){ if(BUF.length){ B.q = BUF.concat(B.q); BUF = []; } }

  function pump(){
    flush();
    var guard = 0;
    while(B && B.q.length && B.q[0].fn && guard++ < 64){ B.q.shift().fn(); flush(); }
    if(!B) return;
    if(B.q.length){ B.cur = B.q[0].m; B.t = 0; B.phase = "msg"; sfx.msg(); return; }
    B.cur = null;
    if(B.done){ finish(); return; }
    B.phase = "menu"; B.sel = 0;
  }
  function advance(){ B.q.shift(); pump(); }

  function pickBestia(){
    var tot = 0, i;
    for(i=0;i<BESTIE.length;i++) tot += BESTIE[i].w;
    var r = Math.random()*tot;
    for(i=0;i<BESTIE.length;i++){ r -= BESTIE[i].w; if(r < 0) return BESTIE[i]; }
    return BESTIE[0];
  }

  function start(){
    var P = st();
    if(P.hp <= 0) P.hp = PMAX;
    var c = pickBestia();
    B = { c:c, chp:c.hp, cmax:c.hp, php:P.hp,
          phase:"msg", sel:0, q:[], cur:null, t:0,
          eflash:0, pflash:0, scare:0, dodge:false, malus:0, done:null };
    BUF = [];
    if(P.seen.indexOf(c.id) < 0) P.seen.push(c.id);
    mode = "battaglia"; sfx.a();
    say(["L'erba alta si muove.", "Sbuca "+c.art+" "+c.nome+"!"]);
    pump();
  }

  function finish(){
    var P = st();
    P.hp = B.php; P.cool = COOL;
    var done = B.done, c = B.c;
    B = null; BUF = [];
    mode = "map";
    doSave();
    if(done === "win") toast(c.nome+" BATTUT"+(c.f?"A":"O"));
  }

  /* ---- turno della creatura ---- */
  function enemyTurn(){
    if(!B || B.done) return;
    var c = B.c;
    var a = c.atk[Math.random()*c.atk.length|0];
    say([c.nome+" usa", a.n+"!"]);
    act(function(){
      if(Math.random() > (a.p == null ? 1 : a.p)){ say(["Ma ti manca."]); return; }
      if(a.eff === "dodge"){
        B.dodge = true;
        say([c.nome+" si scioglie", "nella nebbia."]);
        return;
      }
      if(a.eff === "stare"){
        if(B.malus < 3) B.malus += 2;
        say(["OTTAVO si sente", "giudicato. Colpisce", "un po' meno forte."]);
        return;
      }
      var d = rnd(a.d[0], a.d[1]);
      B.php -= d; B.pflash = 18; sfx.miss();
      if(a.eff === "steal"){
        if(respect > 0) respect = Math.max(0, respect - 2);
        say(["Ti sfila un tappo", "dalla tasca. -2 RSP."]);
      }
      if(B.php <= 0){ B.php = 0; act(koPlayer); }
    });
  }

  /* ---- turno dell'OTTAVO ---- */
  function playerTurn(mi){
    var m = MOSSE[mi], c = B.c;
    say(["OTTAVO usa", m.n+"!"]);
    act(function(){
      if(B.dodge){
        B.dodge = false;
        say([c.nome+" non e' piu'", "dov'era un attimo fa."]);
        act(enemyTurn); return;
      }
      if(Math.random() > m.p){ say(["Ma va a vuoto."]); act(enemyTurn); return; }
      var d = rnd(m.d[0], m.d[1]) - B.malus;
      if(d < 1) d = 1;
      var note = null;
      if(c.weak === m.n){ d = Math.round(d*1.6); note = "E' superefficace!"; }
      else if(c.res === m.n){ d = Math.round(d*0.4); if(d < 1) d = 1;
        note = c.f ? "Non le fa effetto." : "Non gli fa effetto."; }
      B.chp -= d; B.eflash = 18; sfx.hit();
      if(m.scare) B.scare += m.scare;
      if(note) say([note]);
      act(function(){
        if(B.chp <= 0){ B.chp = 0; koEnemy(); return; }
        if(B.scare >= 2 && Math.random() < 0.5){ scappaVia(); return; }
        enemyTurn();
      });
    });
    pump();
  }

  function koEnemy(){
    var c = B.c, P = st();
    sfx.win();
    say([c.nome, "e' battut"+(c.f?"a":"o")+"!"]);
    act(function(){
      if(P.beat.indexOf(c.id) < 0){
        P.beat.push(c.id); respect += c.rsp;
        say(["Mai vist"+(c.f?"a":"o")+" prima.", "+"+c.rsp+" RSP."]);
      }
      B.done = "win";
    });
  }

  function scappaVia(){
    var c = B.c;
    sfx.b();
    say([c.nome, "e' scappat"+(c.f?"a":"o")+"!"]);
    act(function(){ B.done = "gone"; });
  }

  function koPlayer(){
    sfx.miss();
    say(["OTTAVO e' cotto."]);
    say(["Ti risvegli nell'erba", "con meno RSP e la", "faccia piena di erba."]);
    act(function(){
      respect = Math.max(0, respect - 4);
      B.php = PMAX;
      B.done = "ko";
    });
  }

  function tryFuga(){
    say(["OTTAVO prova a", "svignarsela..."]);
    act(function(){
      if(Math.random() < 0.62){
        sfx.win();
        say(["Via!", "L'erba si richiude."]);
        act(function(){ B.done = "flee"; });
      } else {
        sfx.miss();
        say(["Non ti molla."]);
        act(enemyTurn);
      }
    });
    pump();
  }

  /* ================= INPUT ================= */

  function update(){
    if(!B){ mode = "map"; return; }
    B.t++;
    if(B.eflash > 0) B.eflash--;
    if(B.pflash > 0) B.pflash--;

    if(B.phase === "msg"){
      var attesa = MSGT + 26 * (B.cur ? B.cur.length : 1);
      if(((aPressed || bPressed) && B.t > 5) || B.t > attesa) advance();
      return;
    }
    if(B.phase === "menu"){
      if((dirTapped === "left" || dirTapped === "up") && B.sel > 0){ B.sel--; sfx.b(); }
      if((dirTapped === "right" || dirTapped === "down") && B.sel < 1){ B.sel++; sfx.b(); }
      if(aPressed){
        sfx.a();
        if(B.sel === 0){ B.phase = "moves"; B.sel = 0; }
        else tryFuga();
      }
      return;
    }
    if(B.phase === "moves"){
      if(dirTapped === "up" && B.sel > 0){ B.sel--; sfx.b(); }
      if(dirTapped === "down" && B.sel < MOSSE.length-1){ B.sel++; sfx.b(); }
      if(bPressed){ sfx.b(); B.phase = "menu"; B.sel = 0; return; }
      if(aPressed){ sfx.a(); playerTurn(B.sel); }
      return;
    }
  }

  /* ================= DISEGNO ================= */

  var STELLE = [[12,4],[31,10],[52,3],[70,14],[88,6],[121,16],[141,9],[26,22],[63,26],[150,29]];
  var CUR = "▶";

  function box(x,y,w,h,col){
    ctx.fillStyle = "#101614"; ctx.fillRect(x,y,w,h);
    ctx.strokeStyle = col || "#ccff33"; ctx.lineWidth = 2;
    ctx.strokeRect(x+1, y+1, w-2, h-2);
  }
  function hpbar(x,y,w,r){
    if(r < 0) r = 0; if(r > 1) r = 1;
    ctx.fillStyle = "#2a2f36"; ctx.fillRect(x,y,w,5);
    ctx.fillStyle = r > .5 ? "#2ebd77" : (r > .2 ? "#ffd15a" : "#d04838");
    ctx.fillRect(x, y, Math.round(w*r), 5);
    ctx.strokeStyle = "#0e1210"; ctx.lineWidth = 1;
    ctx.strokeRect(x+.5, y+.5, w-1, 4);
  }
  function ciuffo(cx,cy,w){
    ctx.fillStyle = "#1d3a24"; ctx.fillRect(cx-w/2, cy, w, 5);
    ctx.fillStyle = "#2f6a3a";
    for(var i=0;i<w;i+=3) ctx.fillRect(cx-w/2+i, cy-3, 1, 4);
    ctx.fillStyle = "#47a055"; ctx.fillRect(cx-w/2, cy, w, 1);
  }

  function draw(){
    if(!B) return;
    var c = B.c, i;

    ctx.fillStyle = "#0b1a12"; ctx.fillRect(0,0,VW,VH);
    ctx.fillStyle = "#122a1b"; ctx.fillRect(0,0,VW,90);
    ctx.fillStyle = "#2e4a34";
    for(i=0;i<STELLE.length;i++) ctx.fillRect(STELLE[i][0], STELLE[i][1], 1, 1);

    ciuffo(128, 52, 54);
    ciuffo(32, 86, 58);

    var esh = B.eflash > 0 ? (B.eflash % 4 < 2 ? 2 : -2) : 0;
    if(!(B.eflash > 0 && B.eflash % 6 < 3))
      ctx.drawImage(c.spr, 104 + esh, 4, 48, 48);

    var psh = B.pflash > 0 ? (B.pflash % 4 < 2 ? 2 : -2) : 0;
    if(!(B.pflash > 0 && B.pflash % 6 < 3))
      ctx.drawImage(SPR.up[0], 8 + psh, 39, 48, 48);

    ctx.textBaseline = "top";

    /* riquadro della creatura */
    box(4, 8, 92, 28, "#8fa89a");
    ctx.font = "bold 8px 'Courier New',monospace";
    ctx.fillStyle = "#e8e4d8"; ctx.fillText(c.nome, 9, 12);
    ctx.fillStyle = "#8fa89a"; ctx.font = "bold 7px 'Courier New',monospace";
    ctx.fillText("PV", 9, 24);
    hpbar(22, 24, 66, B.chp / B.cmax);

    /* riquadro dell'OTTAVO */
    box(62, 52, 94, 30, "#ccff33");
    ctx.font = "bold 8px 'Courier New',monospace";
    ctx.fillStyle = "#ccff33"; ctx.fillText("OTTAVO", 67, 56);
    ctx.font = "bold 7px 'Courier New',monospace";
    ctx.fillStyle = "#8fa89a"; ctx.fillText("PV", 67, 68);
    hpbar(80, 68, 46, B.php / PMAX);
    ctx.fillStyle = "#8fa89a"; ctx.fillText(B.php+"/"+PMAX, 128, 68);

    /* riquadro dei messaggi */
    box(2, 90, 156, 52, "#ccff33");

    if(B.phase === "msg" && B.cur){
      ctx.font = "bold 9px 'Courier New',monospace"; ctx.fillStyle = "#e8e4d8";
      for(i=0;i<B.cur.length && i<3;i++) ctx.fillText(B.cur[i], 8, 96 + i*11);
      if(B.t % 30 < 18){
        ctx.fillStyle = "#ffd15a"; ctx.font = "bold 8px 'Courier New',monospace";
        ctx.fillText("▼", 145, 130);
      }
      return;
    }

    if(B.phase === "menu"){
      ctx.font = "bold 8px 'Courier New',monospace"; ctx.fillStyle = "#8fa89a";
      ctx.fillText("CHE SI FA?", 8, 96);
      ctx.fillText("A: scegli", 92, 96);
      ctx.font = "bold 9px 'Courier New',monospace";
      var vo = ["LOTTA","FUGA"];
      for(i=0;i<2;i++){
        var yy = 111 + i*13;
        ctx.fillStyle = B.sel === i ? "#ffd15a" : "#5a6660";
        if(B.sel === i) ctx.fillText(CUR, 10, yy);
        ctx.fillStyle = B.sel === i ? "#e8e4d8" : "#7d8b82";
        ctx.fillText(vo[i], 24, yy);
      }
      return;
    }

    if(B.phase === "moves"){
      ctx.font = "bold 9px 'Courier New',monospace";
      for(i=0;i<MOSSE.length;i++){
        var y2 = 96 + i*13;
        if(B.sel === i){ ctx.fillStyle = "#ffd15a"; ctx.fillText(CUR, 8, y2); }
        ctx.fillStyle = B.sel === i ? "#e8e4d8" : "#7d8b82";
        ctx.fillText(MOSSE[i].n, 20, y2);
      }
      ctx.font = "bold 7px 'Courier New',monospace"; ctx.fillStyle = "#8fa89a";
      ctx.fillText(MOSSE[B.sel].tag, 116, 98);
      ctx.fillText("B: torna", 116, 110);
      ctx.fillText("A: colpisci", 106, 122);
      return;
    }
  }

  registerMinigame("battaglia", {update:update, draw:draw});

  /* ================= AGGANCIO ALL'ERBA ALTA ================= */

  onStep(function(x, y){
    if(mode !== "map") return;
    var P = st();
    P.reg++;
    if(P.reg >= REG){ P.reg = 0; if(P.hp < PMAX) P.hp++; }
    if(P.cool > 0){ P.cool--; return; }
    if(tileAt(x, y) !== "G") return;
    if(Math.random() < RATE) start();
  });

  addStatLine(function(){
    var P = st();
    return "BESTIARIO " + P.seen.length + "/" + BESTIE.length +
           "  BATTUTE " + P.beat.length;
  });
  addStatLine(function(){
    var P = st();
    return "PV OTTAVO " + (B ? B.php : P.hp) + "/" + PMAX;
  });

})();
