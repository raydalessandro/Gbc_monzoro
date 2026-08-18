/* ---------- MODULO: JAMBO (i sette rigori) ---------- */
(function(){
  const MODE = "rigori";
  const JC = "#2ee6c0";           // maglia di Jambo
  const TOT = 7, NEED = 4;
  /* barra: 0..100. Oltre FUORI il tiro esce, entro PREC e' pulito,
     entro INCR e' l'angolino che non si prende. */
  const FUORI = 24, PREC = 12, INCR = 4;

  addCrew("jambo", {name:"JAMBO", col:"#2ee6c0", cm:{R:"A",B:"G"}, x:37, y:28, home:"Porta del campetto"});

  /* memoria lunga: Jambo si ricorda dove tiri, anche fra una notte e l'altra */
  const EX = EXT.jambo || (EXT.jambo = {});
  if(!EX.z || EX.z.length!==6) EX.z=[0,0,0,0,0,0];
  EX.best = EX.best|0; EX.said = EX.said|0; EX.par = EX.par|0;

  /* ---- geometria della porta ---- */
  const GX0=22, GX1=138, GY0=28, GY1=86;
  const COLX=[44,80,116], ROWY=[44,72], SPOTY=93;
  const CN=["SX","CENTRO","DX"], RN=["ALTO","BASSO"];
  const zone=(c,r)=>r*3+c;

  let st=null;

  /* ---------- la testa di Jambo ---------- */
  function scegliTuffo(){
    const w=[1,1,1,1,1,1];
    // quello che hai gia' fatto stanotte pesa tanto
    st.hist.forEach(z=>{
      w[z]+=2.2;
      const c=z%3; w[c]+=0.9; w[c+3]+=0.9;
    });
    // l'ultimo tiro pesa il doppio: ripetersi e' un lusso
    if(st.hist.length){
      const z=st.hist[st.hist.length-1], c=z%3;
      w[z]+=2.6; w[c]+=1.0; w[c+3]+=1.0;
    }
    // memoria delle notti precedenti, a voce piu' bassa
    const tot=EX.z.reduce((a,b)=>a+b,0);
    if(tot>4) for(let i=0;i<6;i++) w[i]+=EX.z[i]/tot*3.2;
    // un portiere si tuffa piu' volentieri in basso
    for(let i=0;i<3;i++) w[i]*=0.85;
    let pick;
    if(Math.random()<0.15){                     // ogni tanto va d'istinto
      pick=Math.random()*6|0;
    } else {
      const sum=w.reduce((a,b)=>a+b,0);
      let r=Math.random()*sum; pick=5;
      for(let i=0;i<6;i++){ r-=w[i]; if(r<=0){ pick=i; break; } }
    }
    st.jcol=pick%3; st.jrow=pick/3|0;
    // piu' sei avanti, piu' ti vende una finta
    const pf=Math.min(0.55, 0.30+0.08*st.gol);
    st.finta=Math.random()<pf;
    if(st.finta) st.lean = st.jcol===1 ? (Math.random()<0.5?0:2) : (st.jcol===0?2:0);
    else st.lean = st.jcol;
  }

  /* ---------- esito del tiro ---------- */
  function esito(){
    const d=Math.abs(st.bar-50), c=st.col, r=st.row;
    if(d>FUORI) return {kind:"fuori", txt:d>36?"FUORI DI PARECCHIO":"A LATO DI UN NIENTE"};
    if(r===0 && d>PREC) return {kind:"alto", txt:"ALTO SOPRA LA TRAVERSA"};
    const molle = (d>PREC);                       // solo sui tiri bassi
    const sameC = (st.jcol===c), sameZ = sameC && (st.jrow===r);
    const incrocio = (r===0 && d<=INCR);
    if(sameZ && !incrocio) return {kind:"parata", txt:"PARATA! LO SAPEVA."};
    if(sameC && molle)     return {kind:"parata", txt:"TROPPO MOLLE: PRESA!"};
    return {kind:"gol", txt: incrocio?"GOL! SOTTO L'INCROCIO"
      : sameC?"GOL! LA SFIORA E BASTA"
      : molle?"GOL! MA CHE BRIVIDO":"GOL! SPIAZZATO SECCO"};
  }

  function nuovoTiro(){
    st.phase="aim"; st.t=0; st.at=0; st.res=null;
    st.bar=0; st.dir=1;
    scegliTuffo();
  }
  function start(){
    st={tiri:0, gol:0, hist:[], col:1, row:1, msg:"", esiti:[],
        jcol:1, jrow:1, lean:1, finta:false, bar:0, dir:1, t:0, at:0, phase:"aim", res:null};
    nuovoTiro(); mode=MODE; sfx.a();
  }

  function vittoria(){
    const g=st.gol; st=null;
    if(g>EX.best) EX.best=g;
    crew.jambo=2; respect+=60; doSave(); sfx.win();
    playScene([
      {lines:["JAMBO: Quattro gol.","Il campo era molle,","i guanti bagnati e","il pallone sgonfio."]},
      {lines:["Poi quello sotto","l'incrocio non lo","prendeva nessuno.","Nemmeno io da fermo."]},
      {lines:["Va bene, hai vinto.","Ti porto al Mericco.","JAMBO E' PRONTO! ✔"]}
    ]);
  }

  /* ---------- UPDATE ---------- */
  function update(){
    if(!st){ mode="map"; return; }
    if(bPressed){ mode="map"; st=null; sfx.b(); return; }
    const p=st.phase;

    if(p==="aim"){
      st.t++;
      if(dirTapped==="left" && st.col>0){ st.col--; sfx.b(); }
      if(dirTapped==="right" && st.col<2){ st.col++; sfx.b(); }
      if(dirTapped==="up" && st.row>0){ st.row--; sfx.b(); }
      if(dirTapped==="down" && st.row<1){ st.row++; sfx.b(); }
      if(aPressed){ st.phase="power"; st.t=0; st.bar=0; st.dir=1; sfx.pad(2); }
      return;
    }

    if(p==="power"){
      st.t++;
      st.bar += st.dir*(3.4+st.tiri*0.15);
      if(st.bar>=100||st.bar<=0){ st.dir*=-1; st.bar=Math.max(0,Math.min(100,st.bar)); }
      if(aPressed){
        const r=esito();
        st.res=r; st.phase="shoot"; st.at=0;
        st.hist.push(zone(st.col,st.row));
        EX.z[zone(st.col,st.row)]++;
        beep(210,.06,0,.12,"square");
      }
      return;
    }

    if(p==="shoot"){
      st.at++;
      if(st.at===30){
        const r=st.res;
        st.tiri++; st.esiti.push(r.kind);
        if(r.kind==="gol"){ st.gol++; sfx.hit(); beep(1240,.09,.08,.1); }
        else if(r.kind==="parata"){ EX.par++; sfx.miss(); beep(300,.1,.1,.09,"square"); }
        else sfx.miss();
        st.msg=r.txt; st.phase="result"; st.at=0;
      }
      return;
    }

    if(p==="result"){
      st.at++;
      if(st.at>46 || aPressed){
        if(st.tiri>=TOT){
          if(st.gol>=NEED){ vittoria(); return; }
          if(st.gol>EX.best) EX.best=st.gol;
          st.phase="over"; st.msg="SOLO "+st.gol+" GOL SU 7."; doSave();
        } else nuovoTiro();
      }
      return;
    }

    if(p==="over" && aPressed){
      st.tiri=0; st.gol=0; st.esiti=[]; st.hist=[]; st.msg="";
      nuovoTiro(); sfx.a();
    }
  }

  /* ---------- DISEGNO ---------- */
  function keeper(){
    if(st.phase==="over") return {x:80, y:74, ang:0, arm:9};   // allarga le braccia
    if(st.phase==="aim"||st.phase==="power"){
      const tell = (st.phase==="power") || st.t>42;
      if(!tell) return {x:80+Math.sin(st.t/11)*2, y:74, ang:0, arm:6};
      const l=st.lean-1, b=Math.sin(st.t/5)*0.7;
      return {x:80+l*5+b*l, y:74+(l===0?2:0), ang:l*0.16, arm:l===0?9:6};
    }
    const u=Math.min(1, st.at/20), e=u*(2-u);
    return {x:80+(COLX[st.jcol]-80)*e, y:74+((st.jrow===0?46:70)-74)*e,
            ang:(st.jcol-1)*1.2*e, arm:6+5*e};
  }
  function drawKeeper(k){
    ctx.save(); ctx.translate(k.x, k.y); if(k.ang) ctx.rotate(k.ang);
    ctx.fillStyle="#1c6f60"; ctx.fillRect(-4,4,3,9); ctx.fillRect(1,4,3,9);
    ctx.fillStyle="#0e1210"; ctx.fillRect(-4,12,3,2); ctx.fillRect(1,12,3,2);
    const a=Math.round(k.arm);
    ctx.fillStyle=JC; ctx.fillRect(-5-a,-6,a,3); ctx.fillRect(5,-6,a,3);
    ctx.fillStyle="#ffd15a"; ctx.fillRect(-8-a,-7,3,4); ctx.fillRect(5+a,-7,3,4);
    ctx.fillStyle=JC; ctx.fillRect(-5,-6,10,11);
    ctx.fillStyle="#0e1210"; ctx.fillRect(-5,-6,10,1); ctx.fillRect(-1,-5,2,9);
    ctx.fillStyle="#e8c090"; ctx.fillRect(-3,-13,6,6);
    ctx.fillStyle="#0e1210"; ctx.fillRect(-3,-14,6,2);
    ctx.restore();
  }
  function target(){
    const cx=COLX[st.col], cy=ROWY[st.row], k=st.res.kind;
    if(k==="fuori") return [st.bar>50?152:8, cy+4];
    if(k==="alto")  return [cx, 14];
    const q=Math.max(0,(Math.abs(st.bar-50)-10))/24;
    return [cx+(80-cx)*q*0.55, cy+(72-cy)*q*0.4];
  }
  function ballPos(){
    let u=Math.min(1, st.at/28);
    if(st.res.kind==="parata") u=Math.min(u,0.78);
    const [tx,ty]=target();
    return [80+(tx-80)*u, SPOTY+(ty-SPOTY)*u - Math.sin(u*Math.PI)*5, 4.5-2*u];
  }
  function drawBall(x,y,r){
    ctx.fillStyle="#e8e4d8"; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="#0e1210"; ctx.lineWidth=1; ctx.stroke();
    if(r>2.6){ ctx.fillStyle="#3a4038"; ctx.fillRect(x-1,y-1,2,2); }
  }

  function draw(){
    if(!st) return;
    ctx.fillStyle="#10151c"; ctx.fillRect(0,0,VW,VH);
    // prato
    ctx.fillStyle="#1e3a22"; ctx.fillRect(0,78,VW,66);
    ctx.fillStyle="#26402a"; ctx.fillRect(0,88,VW,6);
    ctx.fillStyle="#3a5c40"; ctx.fillRect(0,86,VW,1);
    ctx.fillStyle="#2e4a32"; ctx.fillRect(0,96,VW,2);
    // rete
    ctx.fillStyle="#161d26"; ctx.fillRect(GX0,GY0,GX1-GX0,GY1-GY0);
    ctx.fillStyle="#2c3b46";
    for(let x=GX0+4;x<GX1;x+=6) ctx.fillRect(x,GY0+2,1,GY1-GY0-2);
    for(let y=GY0+4;y<GY1;y+=6) ctx.fillRect(GX0+2,y,GX1-GX0-4,1);
    // pali
    ctx.fillStyle="#e8e4d8";
    ctx.fillRect(GX0,GY0,3,GY1-GY0); ctx.fillRect(GX1-3,GY0,3,GY1-GY0);
    ctx.fillRect(GX0,GY0,GX1-GX0,3);
    ctx.fillStyle="#9aa0aa"; ctx.fillRect(GX0,GY0+2,GX1-GX0,1);

    // mirino
    if(st.phase==="aim"||st.phase==="power"){
      const x0=[25,62,99][st.col], x1=[62,99,135][st.col];
      const y0=st.row===0?31:58, y1=st.row===0?58:86;
      const on=(Math.floor(tick/8)%2)===0 || st.phase==="power";
      ctx.strokeStyle=on?"#ffd15a":"#7a6a2a"; ctx.lineWidth=1;
      ctx.strokeRect(x0+1.5,y0+1.5,x1-x0-3,y1-y0-3);
      ctx.fillStyle=on?"#ffd15a":"#7a6a2a";
      const cx=(x0+x1)/2, cy=(y0+y1)/2;
      ctx.fillRect(cx-4,cy,9,1); ctx.fillRect(cx,cy-4,1,9);
    }
    // la rete che si gonfia
    if(st.phase==="result" && st.res.kind==="gol"){
      const [tx,ty]=target(), w=tick%8;
      ctx.strokeStyle="rgba(204,255,51,.55)"; ctx.lineWidth=1;
      for(let i=0;i<3;i++){
        ctx.beginPath(); ctx.arc(tx,ty,4+i*4+w,0,Math.PI*2); ctx.stroke();
      }
    }

    drawKeeper(keeper());
    if(st.phase==="shoot"||st.phase==="result"){
      const b=ballPos(); drawBall(b[0],b[1],Math.max(2.2,b[2]));
    } else if(st.phase!=="over") drawBall(80,SPOTY,4.5);

    // testata
    ctx.font="bold 8px 'Courier New',monospace"; ctx.textBaseline="top";
    ctx.fillStyle="rgba(14,18,16,.8)"; ctx.fillRect(0,0,VW,26);
    ctx.fillStyle=JC; ctx.fillText("SETTE RIGORI A JAMBO",6,3);
    ctx.fillStyle="#8fa89a";
    ctx.fillText("TIRI "+st.tiri+"/"+TOT+"  GOL "+st.gol+"/"+NEED,6,14);
    for(let i=0;i<TOT;i++){
      const e=st.esiti[i];
      ctx.fillStyle = e==="gol"?"#ccff33":(e==="parata"?JC:(e?"#6a4a4a":"#3a4038"));
      ctx.fillRect(104+i*8,15,6,6);
      ctx.strokeStyle="#0e1210"; ctx.lineWidth=1; ctx.strokeRect(104.5+i*8,15.5,5,5);
    }

    // striscia bassa
    ctx.fillStyle="rgba(14,18,16,.88)"; ctx.fillRect(0,98,VW,46);
    ctx.fillStyle="#e8e4d8";
    if(st.phase==="aim"){
      ctx.fillText("ANGOLO: "+RN[st.row]+" "+CN[st.col],6,101);
      ctx.fillStyle="#8fa89a"; ctx.fillText("Croce: mira  A: carica",6,113);
      ctx.fillStyle="#6f8078"; ctx.fillText("Occhio a come si piazza",6,123);
    } else if(st.phase==="power"){
      ctx.fillText("POTENZA: "+RN[st.row]+" "+CN[st.col],6,101);
      barra();
    } else if(st.phase==="shoot"){
      ctx.fillStyle="#8fa89a"; ctx.fillText("PARTITO...",6,101);
      barra();
    } else if(st.phase==="over"){
      ctx.fillStyle="#ffd15a"; ctx.fillText(st.msg||"",6,101);
      ctx.fillStyle="#8fa89a"; ctx.fillText("Ne servono "+NEED+". A: RIPROVA",6,115);
    } else {
      ctx.fillStyle = st.res.kind==="gol" ? "#ccff33"
        : (st.res.kind==="parata" ? JC : "#ff7a33");
      ctx.fillText(st.msg||"",6,101);
      barra();
    }
    ctx.fillStyle="#6f8078";
    ctx.fillText(st.phase==="power"?"A: ferma  B: esci":"A: avanti  B: esci",6,133);
  }

  function barra(){
    const bx=8, bw=144, by=114, hh=10;
    const solo = (st.row===0);            // in alto vale solo la parte centrale
    const seg=(a,b,c)=>{ ctx.fillStyle=c; ctx.fillRect(bx+bw*(50-a)/100,by,bw*(a+b)/100,hh); };
    ctx.fillStyle="#2a2f36"; ctx.fillRect(bx,by,bw,hh);
    seg(FUORI,FUORI, solo?"#4a2f2a":"#1f6a45");
    seg(PREC,PREC,"#2ebd77");
    seg(INCR,INCR,"#ccff33");
    ctx.fillStyle="#ffffff"; ctx.fillRect(bx+bw*st.bar/100-1,by-3,3,hh+6);
    ctx.strokeStyle="#0e1210"; ctx.lineWidth=2; ctx.strokeRect(bx,by,bw,hh);
  }

  registerMinigame(MODE, {update:update, draw:draw});

  /* ---------- DIALOGHI ---------- */
  const DOPO=[
    ["JAMBO: Su sette tiri","tre parate. Fai tu","la media. A me","risulta che vinco."],
    ["JAMBO: Il palo e' un","compagno di squadra.","Ingrato, muto, ma","sempre al suo posto."],
    ["JAMBO: Se li ritiri","adesso non ne passa","mezzo. Fidati.","...o forse no."]
  ];
  registerTalk("jambo", function(c, s){
    if(s>=2){
      const i=EX.said%DOPO.length; EX.said++; doSave();
      openDialog(DOPO[i]); return;
    }
    if(s===1){
      playScene([
        {lines:["JAMBO: Ancora tu.","La porta e' sempre","quella. Anche i","miei riflessi."]},
        {lines:["Sette tiri, quattro","gol. Mira, carica,","e non fare sempre","la stessa cosa."]}
      ], start);
      return;
    }
    playScene([
      {lines:["JAMBO: Sono il","portiere. Il ruolo","dove gli errori","hanno il tuo nome."]},
      {lines:["Vuoi che venga al","Mericco? Battimi.","Sette rigori, me ne","devi fare quattro."]},
      {lines:["Croce per l'angolo,","A per caricare, A","per fermare la barra.","Alto e' bello ma..."]},
      {lines:["...perdona poco.","E occhio: mi vedi","piazzare i piedi","un attimo prima."]}
    ], ()=>{ crew.jambo=1; doSave(); start(); });
  });

  addStatLine(()=>(EX.best||EX.par)?("RIGORI "+EX.best+"/7  PARATE "+EX.par):null);
})();
