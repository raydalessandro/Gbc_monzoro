/* ---------- MODULO: SIMO ----------
   Il playground dietro i campi. Simo ti fa chiudere le barre, ma la parola
   non la dici: la scegli tirando a canestro. Tre canestri, tre parole che
   rimano tutte fra loro, una sola che sta in piedi. Se sbagli mira, la barra
   la chiudi lo stesso — con la parola sbagliata. */
(function(){

  addCrew("simo", {name:"SIMO", col:"#e8a33d", cm:{R:"O",B:"W"}, x:19, y:30,
                   home:"Playground dei campi"});

  /* Le tre opzioni rimano fra loro: quello che scegli non e' il suono,
     e' il senso. Come da Luchino, ma qui passa dal polso. */
  const BARRE_SIMO = [
    {l:["La palla gira sul ferro,","resta su e poi..."],      o:["cade","evade","invade"],        ok:0},
    {l:["A Monzoro si gioca anche","col campo pieno di..."],  o:["nozze","pozze","bozze"],        ok:1},
    {l:["Non conta quanto salti,","conta dove..."],           o:["sotterri","atterri","afferri"], ok:1},
    {l:["Il canestro sta fermo,","sei tu che devi..."],       o:["nevicare","sognare","cambiare"],ok:2},
    {l:["Se sbagli l'ultimo tiro","la notte non ti..."],      o:["perdona","telefona","ragiona"],ok:0}
  ];

  const NEED = 4;                 // barre da chiudere su 5
  const TIRI = 2;                 // tiri a disposizione per barra
  const G = 0.20;                 // gravita'
  const OX = 18, OY = 104;        // da dove parte la palla
  const RIM_Y = 72, RIM_W = 7;    // altezza dei ferri e mezza larghezza
  const CANESTRI = [56, 92, 128]; // ascisse dei tre canestri
  /* Arco ristretto apposta: sotto i 56 gradi il canestro 1 e' fisicamente
     irraggiungibile, e mezza corsa della mira sarebbe stata sprecata. Dentro
     56-74 gradi tutti e tre restano in gioco, con tre fasce di spinta separate:
     scegliere il canestro e' scegliere la spinta. */
  const A_MIN = 56, A_MAX = 74;   // arco della mira, in gradi
  const V_MIN = 3.2, V_MAX = 6.8; // spinta

  let S = null;

  function nuovaBarra(i){
    S.i = i; S.fase = "mira"; S.osc = 0; S.tiri = TIRI; S.msg = "";
    S.palla = null; S.scia = [];
  }
  function apri(){
    S = {i:0, chiuse:0, esiti:[], fase:"mira", osc:0, tiri:TIRI, msg:"",
         palla:null, scia:[], ang:45, pot:0.5};
    nuovaBarra(0);
    mode = "canestro"; sfx.a();
  }

  function tira(){
    const r = S.ang * Math.PI / 180, v = V_MIN + S.pot * (V_MAX - V_MIN);
    S.palla = {x:OX, y:OY, vx:Math.cos(r)*v, vy:-Math.sin(r)*v, t:0};
    S.scia = [];
    S.fase = "volo";
    beep(320, .06, 0, .09, "square");
  }

  /* la palla e' entrata in un canestro? passaggio verso il basso dentro il ferro */
  function canestroColpito(p0, p1){
    if (p1.y < p0.y) return -1;                       // sta ancora salendo
    if (!(p0.y <= RIM_Y && p1.y >= RIM_Y)) return -1; // non attraversa il ferro
    const k = (RIM_Y - p0.y) / ((p1.y - p0.y) || 1);
    const x = p0.x + (p1.x - p0.x) * k;
    for (let i = 0; i < 3; i++)
      if (Math.abs(x - CANESTRI[i]) <= RIM_W) return i;
    return -1;
  }

  function esito(kind){
    const b = BARRE_SIMO[S.i];
    if (kind === "giusto"){
      S.chiuse++; S.esiti[S.i] = 2; sfx.win();
      S.msg = "RIMA CHIUSA: " + b.o[b.ok].toUpperCase();
      S.fase = "esito";
    } else if (kind === "sbagliato"){
      S.esiti[S.i] = 1; sfx.miss();
      S.msg = "CANESTRO. RIMA NO.";
      S.fase = "esito";
    } else {
      S.tiri--;
      if (S.tiri > 0){
        sfx.b(); S.msg = "FERRO. RESTA UN TIRO."; S.fase = "esito2";
      } else {
        S.esiti[S.i] = 0; sfx.miss();
        S.msg = "NIENTE. BARRA APERTA.";
        S.fase = "esito";
      }
    }
  }

  function avanti(){
    if (S.i >= BARRE_SIMO.length - 1){
      if (S.chiuse >= NEED) return vinto();
      S.fase = "fallita";
      return;
    }
    nuovaBarra(S.i + 1);
  }

  function vinto(){
    const c = S.chiuse;
    mode = "map"; S = null;
    EXT.simo = EXT.simo || {};
    EXT.simo.best = Math.max(EXT.simo.best | 0, c);
    crew.simo = 2; respect += 75; doSave(); sfx.win();
    playScene([
      {lines:["SIMO: Visto? La rima","non la scegli con la","testa. La scegli con","il polso."]},
      {lines:[c >= 5 ? "Cinque su cinque." : "Quattro su cinque.",
              c >= 5 ? "Non ti ho insegnato" : "L'altra la lasciamo",
              c >= 5 ? "niente, sapevi gia'" : "aperta: tanto il ferro",
              c >= 5 ? "tutto." : "e' ancora li'."]},
      {lines:["Al Mericco ci arrivo","quando chiude il","campo. Cioe' mai.","SIMO E' PRONTO!"]}
    ]);
  }

  registerMinigame("canestro", {
    update: function(){
      if (!S) { mode = "map"; return; }
      if (bPressed){ mode = "map"; S = null; sfx.b(); return; }

      if (S.fase === "mira"){
        S.osc += 0.035;
        S.ang = A_MIN + (A_MAX - A_MIN) * (0.5 - 0.5 * Math.cos(S.osc));
        if (aPressed){ S.fase = "forza"; S.osc = 0; sfx.b(); }
        return;
      }
      if (S.fase === "forza"){
        S.osc += 0.045;
        S.pot = 0.5 - 0.5 * Math.cos(S.osc);
        if (aPressed) tira();
        return;
      }
      if (S.fase === "volo"){
        const p = S.palla, prev = {x:p.x, y:p.y};
        p.x += p.vx; p.y += p.vy; p.vy += G; p.t++;
        S.scia.push({x:p.x, y:p.y});
        if (S.scia.length > 26) S.scia.shift();
        const c = canestroColpito(prev, p);
        if (c >= 0){
          const b = BARRE_SIMO[S.i];
          esito(c === b.ok ? "giusto" : "sbagliato");
          return;
        }
        if (p.y > 118 || p.x > VW + 8 || p.t > 240) esito("fuori");
        return;
      }
      if (S.fase === "esito2"){        // solo un ferro: si ritira la stessa barra
        if (aPressed){ S.fase = "mira"; S.osc = 0; S.palla = null; S.scia = []; S.msg = ""; }
        return;
      }
      if (S.fase === "esito"){
        if (aPressed) avanti();
        return;
      }
      if (S.fase === "fallita"){
        if (aPressed) apri();
        return;
      }
    },

    draw: function(){
      ctx.fillStyle = "#131a22"; ctx.fillRect(0, 0, VW, VH);
      if (!S) return;
      const b = BARRE_SIMO[S.i];
      ctx.textBaseline = "top";

      if (S.fase === "fallita"){
        ctx.fillStyle = "#e8a33d"; ctx.font = "bold 9px 'Courier New',monospace";
        ctx.fillText("BARRE CHIUSE " + S.chiuse + "/5", 8, 40);
        ctx.fillStyle = "#e8e4d8"; ctx.font = "bold 8px 'Courier New',monospace";
        ctx.fillText("Ne servono " + NEED + ".", 8, 58);
        ctx.fillText("Il campo e' aperto,", 8, 70);
        ctx.fillText("il ferro pure.", 8, 80);
        ctx.fillStyle = "#8fa89a";
        ctx.fillText("A: si ricomincia  B: esco", 8, 132);
        return;
      }

      /* la barra da chiudere */
      ctx.fillStyle = "#e8e4d8"; ctx.font = "bold 8px 'Courier New',monospace";
      ctx.fillText("«" + b.l[0], 6, 3);
      ctx.fillText(b.l[1] + "»", 6, 13);

      /* le tre parole, numerate come i canestri */
      ctx.font = "bold 7px 'Courier New',monospace";
      let lx = 6;
      for (let i = 0; i < 3; i++){
        ctx.fillStyle = "#e8a33d"; ctx.fillText(String(i + 1), lx, 24);
        ctx.fillStyle = "#8fa89a"; ctx.fillText(b.o[i], lx + 6, 24);
        lx += 12 + b.o[i].length * 4.3;
      }

      /* campo */
      ctx.fillStyle = "#2a2f38"; ctx.fillRect(0, 112, VW, VH - 112);
      ctx.fillStyle = "#3a4150"; ctx.fillRect(0, 112, VW, 1);

      /* i tre canestri */
      for (let i = 0; i < 3; i++){
        const x = CANESTRI[i];
        ctx.fillStyle = "#4a5160"; ctx.fillRect(x - 1, 36, 2, RIM_Y - 36);   // palo
        ctx.fillStyle = "#5b6474"; ctx.fillRect(x - 9, 40, 18, 14);          // tabellone
        ctx.fillStyle = "#e8a33d"; ctx.font = "bold 9px 'Courier New',monospace";
        ctx.fillText(String(i + 1), x - 3, 42);
        ctx.fillStyle = "#ff7a33";                                            // ferro
        ctx.fillRect(x - RIM_W, RIM_Y, RIM_W * 2, 2);
        ctx.fillStyle = "#cfd6e0";                                            // retina
        for (let k = -2; k <= 2; k++) ctx.fillRect(x + k * 3, RIM_Y + 2, 1, 5);
      }

      /* il tiratore */
      ctx.fillStyle = "#e8c090"; ctx.fillRect(OX - 3, 96, 6, 5);
      ctx.fillStyle = "#e8e4d8"; ctx.fillRect(OX - 4, 101, 8, 8);
      ctx.fillStyle = "#3a4038"; ctx.fillRect(OX - 4, 109, 3, 4);
      ctx.fillStyle = "#3a4038"; ctx.fillRect(OX + 1, 109, 3, 4);

      /* mira */
      if (S.fase === "mira"){
        const r = S.ang * Math.PI / 180;
        ctx.strokeStyle = "#ffd15a"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(OX, OY);
        ctx.lineTo(OX + Math.cos(r) * 26, OY - Math.sin(r) * 26); ctx.stroke();
        ctx.fillStyle = "#ffd15a";
        ctx.fillRect(OX + Math.cos(r) * 26 - 1, OY - Math.sin(r) * 26 - 1, 3, 3);
      }
      /* forza */
      if (S.fase === "forza"){
        const r = S.ang * Math.PI / 180;
        ctx.strokeStyle = "#5b6474"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(OX, OY);
        ctx.lineTo(OX + Math.cos(r) * 26, OY - Math.sin(r) * 26); ctx.stroke();
        ctx.fillStyle = "#2a2f38"; ctx.fillRect(6, 120, 100, 6);
        ctx.fillStyle = "#ccff33"; ctx.fillRect(6, 120, 100 * S.pot, 6);
        ctx.strokeStyle = "#0e1210"; ctx.strokeRect(6, 120, 100, 6);
      }

      /* palla e scia */
      if (S.palla){
        ctx.fillStyle = "rgba(255,122,51,.35)";
        for (let i = 0; i < S.scia.length; i += 3)
          ctx.fillRect(S.scia[i].x - 1, S.scia[i].y - 1, 2, 2);
        ctx.fillStyle = "#ff7a33";
        ctx.beginPath(); ctx.arc(S.palla.x, S.palla.y, 3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#7a3a12"; ctx.lineWidth = 1; ctx.stroke();
      }

      /* Avanzamento in basso a destra: in alto la prima riga della barra arriva
         fino a ~126px e ci sbatteva contro. I tiri stanno accanto alla seconda
         riga, che e' sempre corta. */
      ctx.font = "bold 7px 'Courier New',monospace";
      for (let i = 0; i < BARRE_SIMO.length; i++){
        const e = S.esiti[i];
        ctx.fillStyle = e === 2 ? "#ccff33" : e === 1 ? "#ff596a" : e === 0 ? "#5a6660" : "#3a4150";
        ctx.fillRect(122 + i * 7, 134, 5, 5);
      }
      ctx.fillStyle = "#8fa89a";
      ctx.fillText("TIRI " + S.tiri, 128, 13);

      /* messaggi e comandi */
      ctx.font = "bold 8px 'Courier New',monospace";
      if (S.msg){
        ctx.fillStyle = S.esiti[S.i] === 2 ? "#ccff33"
                      : S.esiti[S.i] === 1 ? "#ff596a" : "#ffd15a";
        ctx.fillText(S.msg, 6, 120);
      }
      ctx.fillStyle = "#8fa89a"; ctx.font = "bold 7px 'Courier New',monospace";
      const cmd = S.fase === "mira"  ? "A: fissa l'arco   B: esco"
                : S.fase === "forza" ? "A: tira            B: esco"
                : S.fase === "volo"  ? ""
                : "A: avanti          B: esco";
      ctx.fillText(cmd, 6, 134);
    }
  });

  registerTalk("simo", function(c, st){
    if (st === 0){
      playScene([
        {lines:["SIMO: Il campo e'","storto e il ferro e'","piegato. Per questo","qui non sbaglia nessuno."]},
        {lines:["Ti do una barra a","meta'. Le tre parole","rimano tutte: quella","giusta e' una sola."]},
        {lines:["E non me la dici.","Me la tiri. Canestro","uno, due o tre.","Quattro su cinque."]}
      ], apri);
      return;
    }
    const e = EXT.simo || {};
    const giri = (e.chiac | 0);
    EXT.simo = e; e.chiac = giri + 1; doSave();
    if (giri % 3 === 0)
      openDialog(["SIMO: Da qui il","canestro sembra","piccolo. Da vicino","e' peggio."]);
    else if (giri % 3 === 1)
      openDialog(["SIMO: Le rime buone","entrano pulite.","Le altre girano sul","ferro e ti guardano."]);
    else
      playScene([
        {lines:["SIMO: Un altro giro?","Le barre le so a","memoria, ma il ferro","no."]}
      ], apri);
  });

  addStatLine(function(){
    const e = EXT.simo;
    if (!e) return "";
    return "CANESTRO " + (e.best | 0) + "/5";
  });

})();
