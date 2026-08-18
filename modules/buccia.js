/* ---------- MODULO: BUCCIA ----------
   Lo scienziato del paese. Prima ti esamina, poi ti carica addosso
   un esoscheletro autocostruito che va tarato parametro per parametro. */
(function(){

addCrew("buccia", {name:"BUCCIA", col:"#9ad8ff", cm:{R:"W",B:"A"}, x:18, y:13, home:"Capannone del Buccia"});

/* stato persistente del modulo */
function S(){
  if(!EXT.buccia) EXT.buccia={voto:0, tarato:false, tent:0, chiac:0, visto:false};
  return EXT.buccia;
}

/* ---------- L'ESAME ----------
   Domande vere, risposta giusta vera. Buccia non fa folklore. */
const NEED = 4;
const ESAME = [
  { q:"Il bicipite flette il gomito|reggendo un peso nella mano.|Che genere di leva e'?",
    o:["1o gen: fulcro in mezzo",
       "2o gen: carico in mezzo",
       "3o gen: forza in mezzo"], ok:2,
    e:"Fulcro al gomito, potenza del|bicipite in mezzo, carico alla|mano: leva di terzo genere.|Il muscolo tira molto piu' del|peso. Perdi forza, guadagni|escursione e velocita'." },
  { q:"Reggi una cassa a 20 cm dalla|spalla, poi la porti a 60 cm.|Il momento sulla spalla:",
    o:["Resta uguale",
       "Triplica",
       "Cala di un terzo"], ok:1,
    e:"Momento = forza per braccio.|Stessa cassa, braccio per tre:|momento per tre.|Ecco perche' il peso si porta|addosso e mai a braccia tese.|Lollo lo sa senza saperlo." },
  { q:"Nella corsa il tendine|d'Achille lavora|soprattutto come:",
    o:["Un motore che fa lavoro",
       "Una molla che restituisce",
       "Un cavo rigido"], ok:1,
    e:"Si allunga all'appoggio e|restituisce quasi il 90%|dell'energia allo stacco.|Il muscolo resta quasi fermo|e spende molto meno.|Il tendine e' un elastico serio." },
  { q:"Nel cammino normale, quanto|dura la fase di appoggio sul|totale del ciclo del passo?",
    o:["Circa il 40%",
       "Circa il 60%",
       "Circa l'80%"], ok:1,
    e:"Appoggio 60%, oscillazione 40%,|con due fasi di doppio appoggio|da circa il 10% l'una.|Nella corsa l'appoggio scende|sotto il 50% e il doppio|appoggio sparisce: c'e' il volo." },
  { q:"Nel cammino in piano la forza|di contatto al ginocchio vale|circa:",
    o:["Mezzo peso corporeo",
       "Un peso corporeo",
       "Tre pesi corporei"], ok:2,
    e:"Circa 2,5-3 volte il peso.|Non e' la gravita': sono i|muscoli che stabilizzano|l'articolazione a comprimerla.|Il carico vero e' quello che|non si vede." }
];

/* ---------- LA TARATURA ----------
   Quattro parametri del MONZ-1, lancetta che oscilla, finestra stretta. */
const TAR = [
  {n:"RIGIDEZZA GINOCCHIO", s:"K ginocchio", u:" Nm/rad", lo:170, hi:265, sp:1.7, w:13, d:0, ok:"BLOCCATA."},
  {n:"RITARDO CAVIGLIA",    s:"Ritardo cav", u:" ms",     lo:18,  hi:95,  sp:2.1, w:11, d:0, ok:"IN FASE."},
  {n:"GUADAGNO EMG",        s:"Guadagno EMG",u:" x",      lo:3,   hi:12,  sp:2.5, w:10, d:1, ok:"SEGNALE PULITO."},
  {n:"SOGLIA DI CARICO",    s:"Soglia tacco",u:" N",      lo:40,  hi:185, sp:2.9, w:9,  d:0, ok:"TACCO LETTO."}
];
const VITE = 3;

let G=null;

/* ---------- ESAME: logica ---------- */
function startEsame(){ G={i:0, sel:0, ok:0, phase:"q", giusta:false}; mode="buccia_esame"; sfx.a(); }

function esameSuperato(){
  const g=S();
  g.voto=G.ok; g.visto=true; G=null;
  mode="map"; crew.buccia=1; doSave(); sfx.win();
  const apertura = g.voto>=5
    ? ["BUCCIA: Cinque su","cinque. Non me lo","aspettavo, e a me","non piace stupirmi."]
    : ["BUCCIA: Quattro su","cinque. Ammissibile.","Non brillante.","Ammissibile."];
  playScene([
    {lines:apertura},
    {lines:["Allora te lo do.","Questo e' il MONZ-1:","esoscheletro attivo","ginocchio-caviglia."]},
    {lines:["L'ho fatto io, di","notte, in capannone.","Va tarato su di te.","Quattro parametri."]},
    {lines:["Sbagliare la taratura","significa farti male","in modo originale.","Quindi concentrati."]}
  ], startTaratura);
}

function updateEsame(){
  if(!G){ mode="map"; return; }
  if(bPressed){ mode="map"; G=null; sfx.b(); return; }
  if(G.phase==="q"){
    if(dirTapped==="up"&&G.sel>0){G.sel--;sfx.b();}
    if(dirTapped==="down"&&G.sel<2){G.sel++;sfx.b();}
    if(aPressed){
      G.giusta = (G.sel===ESAME[G.i].ok);
      if(G.giusta){ G.ok++; sfx.hit(); } else sfx.miss();
      G.phase="fb";
    }
    return;
  }
  if(G.phase==="fb"){
    if(aPressed){
      if(G.i>=ESAME.length-1){
        if(G.ok>=NEED){ esameSuperato(); return; }
        G.phase="ko"; sfx.miss();
      } else { G.i++; G.sel=0; G.phase="q"; sfx.a(); }
    }
    return;
  }
  if(G.phase==="ko" && aPressed){ G.i=0; G.sel=0; G.ok=0; G.phase="q"; sfx.a(); }
}

/* ---------- ESAME: disegno ---------- */
function testa(t){
  ctx.fillStyle="#0c141c"; ctx.fillRect(0,0,VW,VH);
  ctx.fillStyle="#9ad8ff"; ctx.font="bold 8px 'Courier New',monospace"; ctx.textBaseline="top";
  ctx.fillText(t,6,4);
  ctx.fillStyle="#25415a"; ctx.fillRect(0,25,VW,1);
}
function righe(txt,x,y,col,pass){
  ctx.fillStyle=col; ctx.font="bold 7px 'Courier New',monospace";
  txt.split("|").forEach((l,i)=>ctx.fillText(l,x,y+i*(pass||10)));
}
function drawEsame(){
  if(!G) return;
  testa("ESAME DI BIOMECCANICA");
  const q=ESAME[G.i];
  ctx.font="bold 8px 'Courier New',monospace";
  if(G.phase==="ko"){
    ctx.fillStyle="#ff596a"; ctx.fillText("BOCCIATO: "+G.ok+" SU 5",6,15);
    righe("BUCCIA: ne servivano|quattro. Il corpo umano non|fa sconti e io ancora meno.|La buona notizia e' che le|risposte te le ho appena|spiegate tutte. Rifallo.",
      6,40,"#cfe6f5");
    ctx.fillStyle="#8fa89a"; ctx.font="bold 8px 'Courier New',monospace";
    ctx.fillText("A: si ricomincia  B: esco",6,132);
    return;
  }
  ctx.fillStyle="#8fa89a";
  ctx.fillText("DOMANDA "+(G.i+1)+"/5   GIUSTE "+G.ok,6,15);
  if(G.phase==="q"){
    righe(q.q,6,32,"#e8e4d8");
    q.o.forEach((o,i)=>{
      const sel=(i===G.sel);
      if(sel){ ctx.fillStyle="#1b3348"; ctx.fillRect(4,70+i*16,152,13); }
      ctx.fillStyle = sel ? "#ffd15a" : "#8fa89a";
      ctx.font="bold 7px 'Courier New',monospace";
      ctx.fillText((sel?"> ":"  ")+o, 8, 73+i*16);
    });
    ctx.fillStyle="#8fa89a"; ctx.font="bold 8px 'Courier New',monospace";
    ctx.fillText("A: rispondi  B: esco",6,132);
    return;
  }
  ctx.font="bold 9px 'Courier New',monospace";
  ctx.fillStyle = G.giusta ? "#73dc63" : "#ff596a";
  ctx.fillText(G.giusta ? "ESATTO." : "NO. La risposta era:", 6, 32);
  if(!G.giusta){
    ctx.fillStyle="#ffd15a"; ctx.font="bold 7px 'Courier New',monospace";
    ctx.fillText(q.o[q.ok], 8, 44);
  }
  righe(q.e, 6, G.giusta?46:56, "#cfe6f5");
  ctx.fillStyle="#8fa89a"; ctx.font="bold 8px 'Courier New',monospace";
  ctx.fillText(G.i>=ESAME.length-1?"A: verdetto":"A: domanda dopo",6,132);
}

/* ---------- TARATURA: logica ---------- */
function nuovoBersaglio(){
  G.c = 20 + Math.random()*60;
  G.x = Math.random()*100;
  G.dir = Math.random()<0.5 ? -1 : 1;
}
function startTaratura(){
  G={p:0, x:0, c:50, dir:1, lives:VITE, msg:"", vals:[]};
  nuovoBersaglio();
  mode="buccia_tar"; sfx.a();
}
function tarataFinita(){
  const v=G.vals.slice(), g=S();
  g.tarato=true; g.vals=v; G=null;
  mode="map"; crew.buccia=2; respect+=70; doSave(); sfx.win();
  playScene([
    {lines:["BUCCIA: Tarato.","Rigidezza "+v[0]+" Nm/rad,","ritardo "+v[1]+" ms.","Ti sta addosso."]},
    {lines:["Il costo metabolico","del cammino ti scende","del 9%. In teoria.","In pratica non correre."]},
    {lines:["Il capannone chiude.","Vengo al Mericco col","prototipo e il quaderno.","BUCCIA E' PRONTO!"]}
  ]);
}
function updateTar(){
  if(!G){ mode="map"; return; }
  if(bPressed){ mode="map"; G=null; sfx.b(); return; }
  const t=TAR[G.p];
  G.x += G.dir*t.sp;
  if(G.x>=100){ G.x=100; G.dir=-1; }
  else if(G.x<=0){ G.x=0; G.dir=1; }
  if(aPressed){
    if(Math.abs(G.x-G.c)<=t.w){
      const val = t.lo + (t.hi-t.lo)*G.c/100;
      G.vals[G.p] = t.d ? val.toFixed(1) : String(Math.round(val));
      sfx.hit(); G.msg=t.ok; G.p++;
      if(G.p>=TAR.length){ tarataFinita(); return; }
      nuovoBersaglio();
    } else {
      sfx.miss(); G.lives--;
      if(G.lives<=0){
        G.p=0; G.vals=[]; G.lives=VITE; G.msg="TARATURA PERSA. DA CAPO.";
        S().tent++; doSave();
      } else G.msg="FUORI RANGE. Vite: "+G.lives;
      nuovoBersaglio();
    }
  }
}

/* ---------- TARATURA: disegno ---------- */
function drawTar(){
  if(!G) return;
  const t=TAR[G.p];
  testa("TARATURA DEL MONZ-1");
  ctx.fillStyle="#8fa89a"; ctx.font="bold 8px 'Courier New',monospace";
  ctx.fillText("PARAM "+(G.p+1)+"/4   VITE "+"●".repeat(G.lives),6,15);
  ctx.fillStyle="#9ad8ff";
  ctx.fillText(t.n,6,31);
  // la lancetta e la finestra buona
  const bx=10, bw=140, by=48;
  ctx.fillStyle="#22303c"; ctx.fillRect(bx,by,bw,14);
  ctx.fillStyle="#2ebd77"; ctx.fillRect(bx+bw*(G.c-t.w)/100, by, bw*2*t.w/100, 14);
  ctx.fillStyle="#0e1210";
  for(let i=1;i<4;i++) ctx.fillRect(bx+bw*i/4, by, 1, 14);
  ctx.fillStyle="#ffffff"; ctx.fillRect(bx+bw*G.x/100-1, by-4, 3, 22);
  ctx.strokeStyle="#0e1210"; ctx.lineWidth=2; ctx.strokeRect(bx,by,bw,14);
  // esito ultimo tentativo
  ctx.fillStyle = G.msg.indexOf("FUORI")===0||G.msg.indexOf("PERSA")>=0 ? "#ff596a" : "#73dc63";
  ctx.font="bold 8px 'Courier New',monospace";
  ctx.fillText(G.msg||"",6,74);
  // quadro dei parametri gia' bloccati
  ctx.fillStyle="#25415a"; ctx.fillRect(0,86,VW,1);
  ctx.font="bold 7px 'Courier New',monospace";
  TAR.forEach((p,i)=>{
    const fatto = G.vals[i]!==undefined;
    ctx.fillStyle = fatto ? "#cfe6f5" : (i===G.p ? "#ffd15a" : "#4f6470");
    ctx.fillText(p.s, 6, 92+i*9);
    ctx.fillText(fatto ? G.vals[i]+p.u : "- - -", 84, 92+i*9);
  });
  ctx.fillStyle="#8fa89a"; ctx.font="bold 8px 'Courier New',monospace";
  ctx.fillText("A: blocca  B: esco",6,132);
}

registerMinigame("buccia_esame", {update:updateEsame, draw:drawEsame});
registerMinigame("buccia_tar",   {update:updateTar,   draw:drawTar});

/* ---------- DIALOGHI ---------- */
const CHIACCHIERE = [
  ["BUCCIA: Il MONZ-1","registra tutto. Ieri","9.412 passi e tre","soste non giustificate."],
  ["BUCCIA: La caviglia","destra ti anticipa di","40 ms sulla sinistra.","Niente di grave. Brutto."],
  ["BUCCIA: Alle tre di","notte il tendine e' piu'","rigido. Non e' poesia,","e' viscoelasticita'."]
];

registerTalk("buccia", function(c, st){
  const g=S();
  if(st>=2){
    const k=(g.chiac|0)%CHIACCHIERE.length;
    g.chiac=(g.chiac|0)+1; doSave();
    openDialog(CHIACCHIERE[k]);
    return;
  }
  if(st===1){
    playScene([
      {lines:["BUCCIA: L'esame l'hai","passato. Il MONZ-1 e'","ancora grezzo e","grezzo non si indossa."]},
      {lines:["Quattro parametri.","Lancetta al centro","della finestra verde.","Tre errori e da capo."]}
    ], startTaratura);
    return;
  }
  if(g.visto){
    playScene([
      {lines:["BUCCIA: Riprendiamo","l'esame. Cinque","domande, quattro","giuste. Da capo."]}
    ], startEsame);
    return;
  }
  playScene([
    {lines:["BUCCIA: Sei l'Ottavo.","Ti ho visto arrivare","dal capannone. Appoggio","asimmetrico, si nota."]},
    {lines:["Qui dentro studio come","cammina la gente.","Monzoro e' piccola,","i passi sono tanti."]},
    {lines:["Ho un prototipo pronto","ma non lo consegno a","chi non sa cosa si","sta mettendo addosso."]},
    {lines:["Prima l'esame.","Cinque domande di","biomeccanica. Quattro","giuste, non tre."]}
  ], ()=>{ S().visto=true; doSave(); startEsame(); });
});

/* ---------- DIARIO ---------- */
addStatLine(function(){
  const g=EXT.buccia;
  if(!g) return null;
  if(crew.buccia>=2) return "MONZ-1 tarato  esame "+g.voto+"/5";
  if(crew.buccia===1) return "MONZ-1 grezzo, da tarare";
  return g.visto ? "MONZ-1 sotto esame" : null;
});

})();
