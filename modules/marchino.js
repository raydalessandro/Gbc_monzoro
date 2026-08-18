/* ---------- MODULO: MARCHINO - LA BATTERIA DELLA CANTINA ---------- */
(function(){

addCrew("marchino", {name:"MARCHINO", col:"#ff9de2", cm:{R:"P",B:"D"}, x:23, y:21, home:"Cantina del Mericco"});

/* I quattro pezzi, dall'alto in basso come su uno spartito.
   charleston e cassa stanno agli estremi, tom e rullante in mezzo. */
const PEZZI = [
  {tasto:"right", gl:"▶", ab:"CHA", col:"#7fe6ff",
   snd:()=>{ beep(1560,.03,0,.05,"square"); beep(2350,.025,.012,.03,"square"); }},
  {tasto:"left",  gl:"◀", ab:"TOM", col:"#ffd15a",
   snd:()=>{ beep(152,.13,0,.16,"triangle"); beep(108,.16,.015,.1,"sine"); }},
  {tasto:"down",  gl:"▼", ab:"RUL", col:"#e8e4d8",
   snd:()=>{ beep(196,.055,0,.14,"sawtooth"); beep(345,.045,.012,.07,"square"); }},
  {tasto:"a",     gl:"A",      ab:"CAS", col:"#ff9de2",
   snd:()=>{ beep(124,.035,0,.15,"square"); beep(52,.17,0,.2,"sine"); }}
];
const TASTO = {right:0, left:1, down:2, a:3};

/* Il groove: due battute di base piu' una con lo stacco sul tom.
   CAS CHA RUL CHA CAS CAS RUL CHA  ->  il tempo sta in piedi da solo. */
const GIRO   = [3,0,2,0,3,3,2,0];
const STACCO = [3,0,2,0,1,1,2,3];
const PATTERN = GIRO.concat(GIRO, STACCO);

const TOT=PATTERN.length, SOGLIA=18;
const BEAT=28;            // frame fra una nota e l'altra (~0,47 s a 60fps)
const VEL=1.2;            // pixel per frame
const LEADIN=132;         // conto iniziale + volo della prima nota
const PERF=5, BUONO=11;   // finestre di giudizio, in frame
const LY=28, LH=18, HITX=38;

let bat=null;

function nuovaCorsa(){
  return {
    note: PATTERN.map((p,i)=>({p:p, t:LEADIN+i*BEAT, g:null})),
    t:0, last:0, pulse:0, conta:0,
    centri:0, perf:0, combo:0, best:0,
    msg:"", msgCol:"#8fa89a", msgT:0,
    lamp:[0,0,0,0], linea:0, fase:"gioco"
  };
}
function startBatteria(){ bat=nuovaCorsa(); mode="batteria"; sfx.a(); }

/* Il loop gira a requestAnimationFrame: qui si ragiona in frame, ma il
   passo lo misura l'orologio, se no a 120Hz la batteria va al doppio. */
function passo(m){
  const now = (window.performance && performance.now) ? performance.now() : Date.now();
  if(!m.last){ m.last=now; return 1; }
  let d=(now-m.last)*0.06; m.last=now;
  if(d>5) d=5; if(d<0) d=0;
  return d;
}

function giudizio(m,txt,col){ m.msg=txt; m.msgCol=col; m.msgT=30; }

function colpo(m,l){
  PEZZI[l].snd(); m.lamp[l]=8;
  let vic=null, dist=1e9;
  for(let i=0;i<m.note.length;i++){
    const n=m.note[i]; if(n.g) continue;
    const d=Math.abs(m.t-n.t);
    if(d<dist){ dist=d; vic=n; }
  }
  if(!vic || dist>BUONO) return;          // colpo a vuoto: suona e basta
  m.linea=8;
  if(vic.p!==l){ vic.g="persa"; m.combo=0; giudizio(m,"PEZZO SBAGLIATO","#ff6a6a"); return; }
  vic.g="presa"; m.centri++; m.combo++;
  if(m.combo>m.best) m.best=m.combo;
  if(dist<=PERF){ m.perf++; giudizio(m,"PERFETTO!","#ccff33"); }
  else giudizio(m,"BUONO","#ffd15a");
}

function fine(m){
  if(m.centri<SOGLIA){ m.fase="esito"; ricorda(m); doSave(); sfx.miss(); return; }
  const c=m.centri, p=m.perf, k=m.best, bis=(crew.marchino>=2);
  mode="map"; ricorda(m); bat=null; sfx.win();
  if(bis){
    openDialog(["MARCHINO: "+c+" su 24.","Meglio di ieri, dai.","Le bacchette","le tieni tu."]);
    doSave(); return;
  }
  crew.marchino=2; respect+=65; doSave();
  playScene([
    {lines:["MARCHINO: "+c+" su 24.","Perfetti "+p+", combo "+k+".",
            p>=15?"Quasi a tempo, quasi.":"Non sei Bonham,",
            p>=15?"Il resto lo copro io.":"ma il pezzo regge."]},
    {lines:["Ti lascio la cantina","e le bacchette buone.","Quelle storte","le uso io."]},
    {lines:["MARCHINO E' DEI","NOSTRI. E adesso","smetti di guardarti","le mani mentre suoni."]}
  ]);
}
function ricorda(m){
  const e = EXT.marchino || (EXT.marchino={});
  if(m.centri>(e.centri|0)) e.centri=m.centri;
  if(m.best>(e.combo|0)) e.combo=m.best;
}

function updateBatteria(){
  const m=bat;
  for(let i=0;i<4;i++) if(m.lamp[i]>0) m.lamp[i]--;
  if(m.linea>0) m.linea--;
  if(m.msgT>0) m.msgT--;
  if(bPressed){ mode="map"; bat=null; sfx.b(); return; }
  if(m.fase==="esito"){
    if(aPressed){ bat=nuovaCorsa(); sfx.a(); }
    return;
  }
  m.t += passo(m);
  // metronomo: quattro colpi di conto, poi un tocco ogni due note
  while(m.pulse < 4+TOT && m.t >= LEADIN-4*BEAT + m.pulse*BEAT){
    const p=m.pulse++;
    if(p<4){ m.conta=p+1; beep(880,.045,0,.07,"square"); }
    else if((p-4)%8===0) beep(660,.03,0,.05,"square");
    else if((p-4)%2===0) beep(660,.025,0,.028,"square");
  }
  // note scappate sotto la linea
  for(let i=0;i<m.note.length;i++){
    const n=m.note[i];
    if(!n.g && m.t > n.t+BUONO){ n.g="persa"; m.combo=0; giudizio(m,"MANCATA","#ff6a6a"); }
  }
  if(dirTapped!==null && TASTO[dirTapped]!==undefined) colpo(m,TASTO[dirTapped]);
  if(aPressed) colpo(m,3);
  if(m.t > LEADIN+(TOT-1)*BEAT+BUONO+18) fine(m);
}

const CONTO=["UNO","DUE","TRE","QUATTRO"];
function drawBatteria(){
  const m=bat;
  ctx.fillStyle="#140f18"; ctx.fillRect(0,0,VW,VH);
  ctx.font="bold 9px 'Courier New',monospace"; ctx.textBaseline="top";
  ctx.fillStyle="#ff9de2"; ctx.fillText("LA BATTERIA DI MARCHINO",5,4);
  ctx.font="bold 8px 'Courier New',monospace"; ctx.fillStyle="#8fa89a";
  ctx.fillText("CENTRI "+m.centri+"/"+SOGLIA+"   COMBO x"+m.combo,6,16);
  // corsie
  for(let i=0;i<4;i++){
    const y=LY+i*LH, cy=y+(LH>>1);
    ctx.fillStyle = (i&1) ? "#1b1420" : "#211a28";
    ctx.fillRect(0,y,VW,LH-1);
    if(m.lamp[i]>0){ ctx.fillStyle="rgba(255,255,255,.34)"; ctx.fillRect(HITX-7,y+1,15,LH-3); }
    ctx.strokeStyle = m.lamp[i]>0 ? PEZZI[i].col : "#463654"; ctx.lineWidth=1;
    ctx.strokeRect(HITX-6.5,y+2.5,14,LH-6);
    ctx.fillStyle = m.lamp[i]>0 ? "#ffffff" : PEZZI[i].col;
    ctx.fillText(PEZZI[i].gl,2,cy-5);
    ctx.fillStyle = m.lamp[i]>0 ? "#ffffff" : "#7d8a84";
    ctx.fillText(PEZZI[i].ab,12,cy-4);
  }
  // note in arrivo (ritagliate: sotto la linea spariscono, non calpestano i nomi)
  ctx.save();
  ctx.beginPath(); ctx.rect(HITX-6,LY-3,VW-HITX+6,4*LH+4); ctx.clip();
  for(let i=0;i<m.note.length;i++){
    const n=m.note[i];
    if(n.g==="presa") continue;
    const x=HITX+(n.t-m.t)*VEL;
    if(x<HITX-14 || x>VW+8) continue;
    const cy=LY+n.p*LH+(LH>>1);
    ctx.fillStyle = n.g ? "#4a3a50" : PEZZI[n.p].col;
    ctx.fillRect(x-5,cy-5,11,11);
    ctx.fillStyle="#140f18"; ctx.fillRect(x-3,cy-3,7,7);
    if(!n.g){ ctx.fillStyle=PEZZI[n.p].col; ctx.fillRect(x-1,cy-1,3,3); }
  }
  ctx.restore();
  // linea di battuta
  ctx.fillStyle = m.linea>0 ? "#ffffff" : "#6b5675";
  ctx.fillRect(HITX-1,LY-3,3,4*LH+4);
  if(m.linea>0){ ctx.fillStyle="rgba(255,157,226,.5)"; ctx.fillRect(HITX-4,LY-3,9,4*LH+4); }
  // giudizio / conto alla rovescia
  ctx.font="bold 9px 'Courier New',monospace";
  if(m.fase==="esito"){
    ctx.fillStyle="#ff6a6a"; ctx.fillText("SOLO "+m.centri+"/24. NE SERVONO "+SOGLIA,6,104);
  } else if(m.t<LEADIN && m.conta>0){
    ctx.fillStyle="#ffd15a"; ctx.fillText(CONTO.slice(0,m.conta).join(" ")+"...",6,104);
  } else if(m.msgT>0){
    ctx.fillStyle=m.msgCol; ctx.fillText(m.msg,6,104);
  }
  // quanti ne servono ancora
  ctx.fillStyle="#2a2230"; ctx.fillRect(8,118,144,5);
  ctx.fillStyle="#ff9de2"; ctx.fillRect(8,118,144*m.centri/TOT,5);
  ctx.fillStyle="#ccff33"; ctx.fillRect(8+((144*SOGLIA/TOT)|0),115,1,11);
  ctx.font="bold 8px 'Courier New',monospace"; ctx.fillStyle="#8fa89a";
  ctx.fillText(m.fase==="esito" ? "A: si rifa'   B: esci" : "Colpisci a tempo  B: esci",6,132);
}
registerMinigame("batteria",{update:updateBatteria, draw:drawBatteria});

/* ---------- MARCHINO ---------- */
registerTalk("marchino", function(c, st){
  if(st===0){
    playScene([
      {lines:["MARCHINO: Marco Russo","per l'anagrafe.","Per Monzoro sono","solo due bacchette."]},
      {lines:["Cassa, rullante, tom","e charleston.","Quattro tasti,","un pezzo solo."]},
      {lines:["Ventiquattro colpi.","Diciotto dentro e","la cantina e' tua.","Conto io. Uno, due..."]}
    ], ()=>{ crew.marchino=1; doSave(); startBatteria(); });
    return;
  }
  if(st===1){
    playScene([
      {lines:["MARCHINO: Rimettiti","dietro i tamburi.","Il tempo non aspetta","e tu meno di tutti."]}
    ], startBatteria);
    return;
  }
  const e = EXT.marchino || (EXT.marchino={});
  const v = (e.visite|0) % 3; e.visite=(e.visite|0)+1; doSave();
  if(v===0){
    openDialog(["MARCHINO: Il rullante","suona ancora storto.","Ma da stanotte e'","colpa del muro umido."]);
  } else if(v===1){
    openDialog(["MARCHINO: "+(e.combo|0)+" colpi","di fila, quella volta.","Li ho contati io,","quindi valgono."]);
  } else {
    playScene([
      {lines:["MARCHINO: Bacchette","in mano, si rifa'.","Tanto la cantina resta","aperta fino all'alba."]}
    ], startBatteria);
  }
});

addStatLine(()=> (EXT.marchino && EXT.marchino.centri) ? "BATT. "+EXT.marchino.centri+"/24  COMBO "+(EXT.marchino.combo|0) : "");

})();
