/* ---------- MODULO: VINCE - LA FESTA DEL MERICCO ---------- */
(function(){

addCrew("vince", {name:"VINCE", col:"#ffe66d", cm:{R:"Y",B:"O"}, x:26, y:22, home:"Piazzetta"});

EXT.vince = Object.assign({feste:0}, EXT.vince||{});

const VID    = "vince";
const DIRS   = ["down","left","up","right"];
const GATHER = 210;               // frame di raduno
const SECT   = 320;               // frame per figura (2 battute)
const NSECT  = 6;
const DANCE  = SECT*NSECT;        // ~32 secondi di ballo
const HOME   = 200;               // frame per tornare a casa
const FPB    = 40;                // frame per battito (90 BPM a 60fps)
const FP16   = 10;                // frame per sedicesimo
const SECNAME = ["CERCHIO","ONDA","GIOSTRA","PULSAZIONE","DUE SQUADRE","FINALE!"];
const COLS   = ["#ff596a","#ffd15a","#73dc63","#4aa8ff","#d7a7ff","#ccff33"];

let P = null;        // stato della festa
let dirty = false;   // qualcuno e' fuori dal suo posto

/* ---------- musica: sequencer a sedicesimi ---------- */
const NT = {"-":0,
  x:110.00, y:130.81, z:146.83, w:164.81, v:196.00,
  a:220.00, c:261.63, d:293.66, e:329.63, g:392.00,
  A:440.00, C:523.25, D:587.33, E:659.25, G:783.99};
const BASS = [
  "x---x---v---z---",
  "x-x-z---v---w---",
  "z---z---v-v-x---",
  "x---v---z---w---",
  "w---w---v---x---",
  "x-x-x-x-v-v-z-z-"];
const LEAD = [
  "a---c-d---e-d-c-",
  "e-d-c---a---c-d-",
  "A-G-E-D-C-D-E-G-",
  "C---D-E---D-C-a-",
  "a-c-e-g-A---G-E-",
  "A-A-G-E-D-C-a---"];
const nt = (tab,sec,s)=> NT[(tab[sec]||tab[0])[s]] || 0;

function music(s, sec){
  if(s===0||s===6||s===10){ beep(64,.14,0,.16,"sine"); beep(150,.04,0,.07,"square"); }
  if(s===4||s===12){ beep(1250,.03,0,.05,"square"); beep(330,.06,.01,.05,"sawtooth"); }
  if(s%2===1) beep(2000+(s%4)*120,.02,0,.028,"square");
  const b = nt(BASS,sec,s); if(b) beep(b,.13,0,.075,"square");
  const l = nt(LEAD,sec,s); if(l) beep(l,.10,0,.055,"square");
  if(s===0){ beep(110,.5,0,.030,"triangle"); beep(164.81,.5,0,.024,"triangle"); }
}
function musicBuild(st){          // salita durante il raduno
  const sc=[220,261.63,293.66,329.63,392,440,523.25,587.33];
  if(st%4===0) beep(64,.12,0,.13,"sine");
  if(st%2===0) beep(sc[st%8]*(st>9?2:1),.09,0,.05,"square");
  if(st>=13) beep(1900,.02,0,.035,"square");
}
function musicOut(st){            // coda finale
  const sc=[587.33,523.25,440,392,329.63,293.66,261.63,220];
  if(st%2===0) beep(sc[Math.min(7,st>>1)],.14,0,.06,"square");
  if(st===0) beep(64,.2,0,.15,"sine");
}
function crash(){ beep(1600,.25,0,.06,"square"); beep(2300,.2,.02,.04,"square"); beep(64,.3,0,.18,"sine"); }

/* ---------- utilita' ---------- */
const clamp=u=>u<0?0:(u>1?1:u);
const ease =u=>{u=clamp(u);return u*u*(3-2*u);};
const sgn  =v=>v>0?1:(v<0?-1:0);
function dirOf(dx,dy){ return Math.abs(dx)>=Math.abs(dy) ? (dx>=0?"right":"left") : (dy>=0?"down":"up"); }
function setPos(c,x,y){ c.x=Math.round(x*16)/16; c.y=Math.round(y*16)/16; }
function setFrame(c,f){ const a=c._vspr&&c._vspr[c.dir]; if(a) c.spr[c.dir][0]=a[f&3]; }

/* ---------- rimessa a posto: sempre e comunque ---------- */
function restoreAll(){
  CHARS.forEach(c=>{
    if(c._vspr){ for(let i=0;i<4;i++){ const d=DIRS[i]; if(c.spr[d]) c.spr[d][0]=c._vspr[d][0]; } }
    if(c._v){
      c.x = c._v.hx; c.y = c._v.hy; c.dir = c._v.hdir || "down";
      delete c._v;
    }
  });
  if(P && P.pdir) player.dir = P.pdir;
  player.moving=false; player.ox=0; player.oy=0; player.step=0; player.animT=0;
  dirty=false;
}
/* rete di sicurezza: se per qualunque motivo si torna sulla mappa
   con la crew ancora sparsa, la si rimette a casa al primo disegno. */
onDrawMap(function(){ if(dirty && mode!=="festa") restoreAll(); });

/* ---------- avvio ---------- */
function startFesta(){
  restoreAll();
  // se il giocatore era a meta' casella, la sua mossa viene annullata
  player.moving=false; player.ox=0; player.oy=0; player.step=0;

  const chars = CHARS.slice();
  const v = chars.filter(c=>c.id===VID)[0] || chars[0];
  const vx = (typeof v.hx==="number")?v.hx:v.x, vy=(typeof v.hy==="number")?v.hy:v.y;
  // pista a meta' strada fra Vince e il giocatore: la camera resta ferma
  const cx = (vx+player.x)/2, cy = (vy+player.y)/2;
  const dancers = chars.filter(c=>c!==v);
  const n = Math.max(1,dancers.length);
  const rx = 2.5 + Math.min(0.7, n*0.04), ry = rx*0.70;

  // ognuno prende lo spicchio piu' vicino: nessuno attraversa la pista
  dancers.forEach(c=>{
    let a = Math.atan2(c.y-cy, c.x-cx) + Math.PI/2;
    while(a<0) a+=Math.PI*2; while(a>=Math.PI*2) a-=Math.PI*2;
    c._ang=a;
  });
  dancers.sort((p,q)=>p._ang-q._ang);
  dancers.forEach(c=>{ delete c._ang; });

  chars.forEach(c=>{
    if(!c._vspr) c._vspr = {down:c.spr.down.slice(), up:c.spr.up.slice(),
                            left:c.spr.left.slice(), right:c.spr.right.slice()};
  });
  chars.forEach((c,i)=>{
    c._v = { hx:(typeof c.hx==="number")?c.hx:Math.round(c.x),
             hy:(typeof c.hy==="number")?c.hy:Math.round(c.y),
             hdir:c.dir, sx:c.x, sy:c.y, bx:c.x, by:c.y, del:(i*13)%26 };
  });
  v._v.tx = cx; v._v.ty = cy;
  dancers.forEach((c,i)=>{
    const a = i/n*Math.PI*2 - Math.PI/2;
    c._v.tx = cx + Math.cos(a)*rx;
    c._v.ty = cy + Math.sin(a)*ry;
  });

  P = { t:0, phase:"gather", dur:GATHER, chars, dancers, v, cx, cy, rx, ry,
        pdir:player.dir, parts:[], flash:0, hold:null, sec:0, bt:0 };
  dirty = true;
  mode = "festa";
}

/* ---------- movimento ---------- */
function walkStep(c, sx,sy, tx,ty, u, anim){
  const dx=tx-sx, dy=ty-sy, ax=Math.abs(dx), ay=Math.abs(dy), tot=ax+ay;
  let x=tx, y=ty, mv=false;
  if(tot>0.02){
    const dd=u*tot;
    if(ax>=ay){
      if(dd<=ax){ x=sx+sgn(dx)*dd; y=sy; c.dir=dx>0?"right":"left"; }
      else      { x=tx; y=sy+sgn(dy)*(dd-ax); c.dir=dy>0?"down":"up"; }
    } else {
      if(dd<=ay){ x=sx; y=sy+sgn(dy)*dd; c.dir=dy>0?"down":"up"; }
      else      { y=ty; x=sx+sgn(dx)*(dd-ay); c.dir=dx>0?"right":"left"; }
    }
    mv = u>0 && u<1;
  }
  c._v.bx=x; c._v.by=y;
  setPos(c,x,y);
  setFrame(c, mv ? Math.floor(anim/6)%4 : 0);
}
function moveTo(c,g){
  const v=c._v, k=0.24;
  v.bx += (g.x - v.bx)*k;
  v.by += (g.y - v.by)*k;
  if(g.dir) c.dir=g.dir;
  setPos(c, v.bx, v.by - (g.hop||0));
  setFrame(c, g.f);
}

/* ---------- le figure del ballo ---------- */
function faceCenter(x,y){ return dirOf(P.cx-x, P.cy-y); }
function form(sec,i,n,bt){
  const cx=P.cx, cy=P.cy, rx=P.rx, ry=P.ry;
  const a0 = i/n*Math.PI*2 - Math.PI/2;
  const f  = Math.floor(bt*2 + i*0.5)&3;
  let x,y;
  if(sec===0){                                   // cerchio, saltelli sfasati
    x=cx+Math.cos(a0)*rx; y=cy+Math.sin(a0)*ry;
    return {x:x, y:y, hop:Math.abs(Math.sin(Math.PI*((bt+i*0.5)%1)))*0.34,
            dir:faceCenter(x,y), f:f};
  }
  if(sec===1){                                   // due file, onda che viaggia
    const cols=Math.ceil(n/2), sp=Math.min(1.5, 4.4/Math.max(1,cols-1));
    const col=Math.floor(i/2), row=i%2;
    x = cx+(col-(cols-1)/2)*sp + Math.sin(bt*Math.PI + col*0.9)*0.34;
    y = cy+(row? 1.5 : -1.1);
    return {x:x, y:y, hop:Math.abs(Math.sin(Math.PI*((bt+col*0.25)%1)))*0.22,
            dir:"down", f:f};
  }
  if(sec===2){                                   // giostra: il cerchio ruota
    const a=a0+bt*0.5;
    x=cx+Math.cos(a)*rx; y=cy+Math.sin(a)*ry;
    return {x:x, y:y, hop:Math.abs(Math.sin(Math.PI*bt))*0.12,
            dir:dirOf(-Math.sin(a), Math.cos(a)), f:f};
  }
  if(sec===3){                                   // pulsazione: dentro e fuori
    const k=0.55+0.45*Math.abs(Math.cos(Math.PI*bt));
    x=cx+Math.cos(a0)*rx*k; y=cy+Math.sin(a0)*ry*k;
    return {x:x, y:y, hop:Math.abs(Math.sin(Math.PI*bt))*0.40,
            dir:faceCenter(x,y), f:f};
  }
  if(sec===4){                                   // due squadre, botta e risposta
    const side = (i%2) ? 1 : -1;
    const mine = (side<0) === (Math.floor(bt/2)%2===0);
    const ch = mine ? Math.sin(Math.min(1,bt%2)*Math.PI)*1.15 : 0;
    const rows=Math.ceil(n/2), k=Math.floor(i/2);
    x = cx+side*(2.4-ch);
    y = cy+(k-(rows-1)/2)*1.15;
    return {x:x, y:y, hop:(mine?Math.abs(Math.sin(Math.PI*bt))*0.30:0.05),
            dir:(side<0?"right":"left"), f:f};
  }
  const a=a0+bt*0.9;                             // finale: stretti e in aria
  x=cx+Math.cos(a)*rx*0.66; y=cy+Math.sin(a)*ry*0.66;
  return {x:x, y:y, hop:Math.abs(Math.sin(Math.PI*bt))*0.55,
          dir:DIRS[(Math.floor(bt*2)+i)&3], f:f};
}

/* ---------- particelle ---------- */
function spawnParts(k, sx, sy){
  for(let i=0;i<k;i++){
    if(P.parts.length>60) break;
    P.parts.push({x:sx+(Math.random()*60-30), y:sy-34-Math.random()*16,
                  vx:(Math.random()-.5)*.6, vy:.25+Math.random()*.5,
                  c:COLS[(Math.random()*COLS.length)|0], t:60+(Math.random()*40|0)});
  }
}
function stepParts(){
  for(let i=P.parts.length-1;i>=0;i--){
    const p=P.parts[i];
    p.x+=p.vx+Math.sin(p.t*0.18)*0.25; p.y+=p.vy; p.t--;
    if(p.t<=0||p.y>150) P.parts.splice(i,1);
  }
}

/* ---------- il giocatore balla sul posto (camera immobile) ---------- */
function playerDance(bt){
  player.moving=true;
  player.animT=Math.floor(P.t/20)*6;
  if(P.hold && P.hold.t>0){ P.hold.t--; player.dir=P.hold.d; }
  else player.dir=["down","left","down","right"][Math.floor(bt)&3];
}
function playerIdle(){ player.moving=false; player.animT=0; player.ox=0; player.oy=0; }

/* ---------- aggiornamento ---------- */
function updateFesta(){
  try{
    if(!P){ restoreAll(); mode="map"; return; }
    if(bPressed){
      sfx.b();
      if(P.phase==="home"){ endFesta(); return; }
      P.chars.forEach(c=>{ c._v.sx=c._v.bx; c._v.sy=c._v.by; });
      P.phase="home"; P.t=0; P.dur=90; P.parts.length=0;
      return;
    }
    if(P.phase==="dance"){
      if(dirTapped){ P.hold={d:dirTapped,t:26}; sfx.pad(DIRS.indexOf(dirTapped)&3);
                     spawnParts(4, P.cx*TS-camXof(), P.cy*TS-camYof()+8); }
      if(aPressed){ beep(1046.5,.08,0,.07,"square"); beep(1318.5,.10,.06,.06,"square");
                    P.flash=10; spawnParts(10, P.cx*TS-camXof(), P.cy*TS-camYof()+8); }
    }
    P.t++;
    if(P.phase==="gather")      stepGather();
    else if(P.phase==="dance")  stepDance();
    else                        stepHome();
    if(P){ stepParts(); if(P.flash>0) P.flash--; }
  }catch(err){
    console.error("festa: "+err);
    restoreAll(); P=null; mode="map";
  }
}
function stepGather(){
  P.chars.forEach(c=>{
    const v=c._v;
    walkStep(c, v.sx, v.sy, v.tx, v.ty, ease((P.t-v.del)/(GATHER-30)), P.t);
  });
  playerIdle();
  if(P.t%FP16===0) musicBuild(P.t/FP16);
  if(P.t>=GATHER){
    P.chars.forEach(c=>{ c._v.bx=c._v.tx; c._v.by=c._v.ty; });
    P.phase="dance"; P.t=0; P.flash=12; crash();
  }
}
function stepDance(){
  const sec = Math.min(NSECT-1, Math.floor(P.t/SECT));
  const bt  = P.t/FPB;
  P.sec=sec; P.bt=bt;
  if(P.t%FP16===0) music(((P.t/FP16)|0)%16, sec);
  if(P.t%FPB===0){ P.flash=Math.max(P.flash,7); spawnParts(3, P.cx*TS-camXof(), P.cy*TS-camYof()+8); }
  const n=Math.max(1,P.dancers.length);
  P.dancers.forEach((c,i)=>moveTo(c, form(sec,i,n,bt)));
  moveTo(P.v, {x:P.cx, y:P.cy, hop:Math.abs(Math.sin(Math.PI*bt*2))*0.42,
               dir:DIRS[Math.floor(bt)&3], f:Math.floor(bt*4)&3});
  playerDance(bt);
  if(P.t>=DANCE){
    P.chars.forEach(c=>{ c._v.sx=c._v.bx; c._v.sy=c._v.by; });
    P.phase="home"; P.t=0; P.dur=HOME;
  }
}
function stepHome(){
  const dur=P.dur||HOME;
  P.chars.forEach(c=>{ const v=c._v; walkStep(c, v.sx, v.sy, v.hx, v.hy, ease(P.t/dur), P.t); });
  playerIdle();
  if(P.t%FP16===0 && P.t/FP16<16) musicOut(P.t/FP16);
  if(P.t>=dur) endFesta();
}

/* ---------- fine: tutti a casa, poi due parole ---------- */
function endFesta(){
  const prima = crew.vince<2;
  restoreAll();
  P=null; mode="map";
  if(prima){ crew.vince=2; respect+=80; }
  EXT.vince.feste=(EXT.vince.feste|0)+1;
  doSave();
  if(prima){
    sfx.win(); toast("VINCE E' DELLA CREW  +80 RSP");
    playScene([
      {lines:["VINCE: Visto?","Trenta secondi e","Monzoro era il","centro del mondo."]},
      {lines:["Adesso tornano tutti","al loro posto come","se niente fosse.","Fanno sempre cosi'."]},
      {lines:["VINCE E' DELLA CREW!","Quando serve una","festa sai dove sto.","Non e' mai tardi."]}
    ]);
  } else {
    const n=EXT.vince.feste|0;
    sfx.win();
    openDialog(["VINCE: Festa numero",""+n+". La cassa regge,","le gambe un po' meno.","Quando vuoi si rifa'."]);
  }
}

/* ---------- il dialogo di Vince ---------- */
registerTalk(VID, function(c, st){
  if(st<2){
    playScene([
      {lines:["VINCE: Ah, sei tu.","Ti aspettavo con una","cassa e un'idea","storta in testa."]},
      {lines:["Monzoro di notte e'","bellissima e non","balla nessuno.","Mi pare uno spreco."]},
      {lines:["Guarda qua. Li chiamo","tutti. Tu resta li'","e togliti quella","faccia da lunedi'."]}
    ], startFesta);
  } else {
    playScene([
      {lines:["VINCE: Ancora?","Guarda che poi","non si torna","indietro."]},
      {lines:["Va bene, va bene.","Cassa accesa. Con B","si scappa, ma","chi scappa scappa."]}
    ], startFesta);
  }
});

addStatLine(()=> (crew.vince>=2) ? ("FESTE "+(EXT.vince.feste|0)) : null);

/* ---------- disegno ---------- */
function camXof(){ return Math.max(0,Math.min(player.x*TS+player.ox-72, MW*TS-VW)); }
function camYof(){ return Math.max(0,Math.min(player.y*TS+player.oy-64, MH*TS-VH)); }

function drawFesta(){
  drawMap();
  if(!P) return;
  const camX=camXof(), camY=camYof();
  const sx=P.cx*TS-camX+8, sy=P.cy*TS-camY+8;
  const bt=P.phase==="dance" ? P.bt : 0;
  const beat=Math.abs(Math.sin(Math.PI*bt));
  const cbase=Math.floor(P.phase==="dance"?bt/2:P.t/40);

  ctx.save();
  // fasci di luce dal palo del DJ
  for(let k=0;k<4;k++){
    const a = bt*0.6 + k*Math.PI/2 + (P.phase==="gather"?P.t*0.02:0);
    ctx.globalAlpha = 0.09 + 0.06*beat;
    ctx.fillStyle = COLS[(k+cbase)%COLS.length];
    ctx.beginPath();
    ctx.moveTo(sx, sy-30);
    ctx.lineTo(sx+Math.cos(a-0.22)*84, sy-30+Math.sin(a-0.22)*46+52);
    ctx.lineTo(sx+Math.cos(a+0.22)*84, sy-30+Math.sin(a+0.22)*46+52);
    ctx.closePath(); ctx.fill();
  }
  // anelli di luce sulla pista
  for(let k=0;k<2;k++){
    const kk = ((bt*0.5+k*0.5)%1);
    ctx.globalAlpha = 0.42*(1-kk);
    ctx.strokeStyle = COLS[(k+cbase+2)%COLS.length]; ctx.lineWidth=1;
    ctx.beginPath();
    ctx.ellipse(sx, sy+9, 8+P.rx*16*kk, 4+P.ry*16*kk*0.6, 0, 0, Math.PI*2);
    ctx.stroke();
  }
  // lampo a tempo
  if(P.flash>0){
    ctx.globalAlpha = 0.10*P.flash/10;
    ctx.fillStyle = COLS[cbase%COLS.length]; ctx.fillRect(0,0,VW,VH);
  }
  ctx.globalAlpha=1;
  // coriandoli
  P.parts.forEach(p=>{ ctx.fillStyle=p.c; ctx.fillRect(p.x|0, p.y|0, 2, 2); });
  ctx.restore();
  ctx.globalAlpha=1;

  // insegna
  ctx.fillStyle="rgba(14,18,16,.85)"; ctx.fillRect(56,2,102,12);
  ctx.strokeStyle="#ffe66d"; ctx.lineWidth=1; ctx.strokeRect(56.5,2.5,101,11);
  ctx.fillStyle= (Math.floor(P.t/8)%2) ? "#ffe66d" : "#ff7a33";
  ctx.font="bold 8px 'Courier New',monospace"; ctx.textBaseline="top";
  ctx.fillText("FESTA AL MERICCO",60,5);

  // barra in basso
  const lab = P.phase==="gather" ? "ARRIVANO TUTTI..."
            : P.phase==="dance"  ? SECNAME[P.sec]
            : "TUTTI A CASA";
  ctx.fillStyle="rgba(14,18,16,.88)"; ctx.fillRect(2,128,156,14);
  ctx.strokeStyle="#ffe66d"; ctx.strokeRect(2.5,128.5,155,13);
  const prog = P.phase==="dance" ? P.t/DANCE : (P.phase==="gather"?0:1);
  ctx.fillStyle="#3a4a42"; ctx.fillRect(4,138,152,2);
  ctx.fillStyle="#ccff33"; ctx.fillRect(4,138,152*clamp(prog),2);
  ctx.font="bold 7px 'Courier New',monospace";
  ctx.fillStyle="#ffe66d"; ctx.fillText(lab,6,130);
  ctx.fillStyle="#8fa89a"; ctx.fillText("B: SALTA",114,130);
}

registerMinigame("festa", {update:updateFesta, draw:drawFesta});

})();
