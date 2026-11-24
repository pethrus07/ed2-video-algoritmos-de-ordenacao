"use strict";

/** Uma carta de baralho: fundo claro, número grande na cor do valor. */
function carta(ctx, x, y, w, h, valor, f, o = {}) {
  ctx.save(); ctx.globalAlpha *= o.alfa ?? 1;
  ctx.shadowColor = o.ativa ? corValor(f, 1, 0.9) : "rgba(0,0,0,.55)"; ctx.shadowBlur = o.ativa ? 46 : 26; ctx.shadowOffsetY = o.ativa ? 0 : 12;
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#dfe6fa");
  ctx.fillStyle = g; caixa(ctx, x, y, w, h, w * 0.12); ctx.fill();
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  if (o.ativa) { ctx.strokeStyle = corValor(f, 0.95); ctx.lineWidth = 6; ctx.stroke(); }
  const cor = corValor(f, 0.74);
  texto(ctx, String(valor), x + w / 2, y + h * 0.56, { tam: h * 0.46, peso: 700, alinha: "center", base: "middle", cor });
  texto(ctx, String(valor), x + w * 0.13, y + h * 0.17, { tam: h * 0.13, peso: 700, cor });
  ctx.fillStyle = corValor(f, 0.95); caixa(ctx, x + w * 0.14, y + h - h * 0.11, w * 0.72, h * 0.035, 4); ctx.fill();
  if (o.apagada) { ctx.fillStyle = `rgba(7,11,22,${o.apagada})`; caixa(ctx, x, y, w, h, w * 0.12); ctx.fill(); }
  ctx.restore();
}

/**
 * Desenha o Insertion Sort em um instante do traço, como cartas ou como barras.
 * geo = {tipo, x, w, y|base, alto, erguer, selo, faixa, rotulos}
 */
function desenharInsertion(ctx, traco, valores, { k, p, parado }, geo) {
  const n = traco.n, estado = traco.antes[Math.min(k, traco.antes.length - 1)], ev = parado ? null : traco.eventos[k];
  const vmax = Math.max(...valores), cartas = geo.tipo === "cartas";
  const passo = geo.w / n, lw = cartas ? passo - 22 : passo * 0.72;
  const xDe = (slot) => geo.x + slot * passo + (passo - lw) / 2;
  const hDe = (id) => (cartas ? geo.alto : geo.alto * (0.16 + 0.84 * (valores[id] / vmax)));
  const erguer = geo.erguer;
  const desenha = (id, x, sobe, o) => {
    const f = valores[id] / vmax;
    if (cartas) carta(ctx, x, geo.y - sobe, lw, geo.alto, valores[id], f, o);
    else barra(ctx, x, geo.base - sobe, lw, hDe(id), f, o.ativa ? "chave" : o.apagada ? "normal" : "certa", { rotulo: geo.rotulos ? valores[id] : null });
  };
  // quantas casas da esquerda já formam a parte ordenada (a vaga da chave conta)
  const emMaos = estado.chave != null || (ev && ev.tipo === "pega");
  const ordenadas = estado.prontos + (emMaos ? 1 : 0);
  if (geo.faixa) {
    const fx = geo.x + 4, fw = ordenadas * passo - 8, fy = cartas ? geo.y + geo.alto + 22 : geo.base + 16;
    ctx.fillStyle = comAlfa(COR.verde, 0.9); caixa(ctx, fx, fy, fw, 7, 4); ctx.fill();
    texto(ctx, "parte ordenada", fx + 2, fy + 44, { tam: cartas ? 28 : 22, cor: COR.verde });
  }
  // cartas que estão na fila
  for (let slot = 0; slot < n; slot++) {
    const id = estado.ordem[slot];
    if (id == null) continue;
    if (ev && ev.tipo === "pega" && slot === ev.i) continue; // é a chave subindo, desenhada depois
    let x = xDe(slot), sobe = 0, ativa = false;
    if (ev && ev.tipo === "desloca" && slot === ev.j) { x = lerp(xDe(ev.j), xDe(ev.j + 1), E.io(p)); ativa = true; }
    if (ev && ev.tipo === "cmp" && slot === ev.j) { ativa = true; sobe = Math.sin(Math.min(1, p * 2) * Math.PI / 2) * (cartas ? 18 : 10) * (1 - E.in(fase(p, 0.8, 0.2))); }
    desenha(id, x, sobe, { ativa, apagada: slot >= ordenadas ? (cartas ? 0.42 : 1) : 0 });
  }
  // a chave, fora da fila
  let chave = estado.chave, cx = estado.buraco != null ? xDe(estado.buraco) : 0, sobe = erguer;
  if (ev && ev.tipo === "pega") { chave = estado.ordem[ev.i]; cx = xDe(ev.i); sobe = erguer * E.io(p); }
  if (ev && ev.tipo === "desloca") cx = lerp(xDe(ev.j + 1), xDe(ev.j), E.io(p));
  if (ev && ev.tipo === "solta") { cx = xDe(ev.pos); sobe = erguer * (1 - E.io(p)); }
  if (chave != null) {
    desenha(chave, cx, sobe, { ativa: true });
    if (geo.selo && ev && ev.tipo === "cmp") {
      const topo = cartas ? geo.y - sobe - 56 : geo.base - sobe - hDe(chave) - 96;
      seloComparacao(ctx, clamp(cx + lw / 2, 330, W - 330), topo, valores[estado.ordem[ev.j]], valores[chave], ev.maior, p, ["anda", "para"]);
    }
  }
  return estado;
}

// ------------------------------------------------------------------ INSERTION SORT: A IDEIA
CENAS.insertionIdeia = {
  preparar(c, D) {
    this.v = D.vetor8; this.traco = tracoInsertion(this.v);
    if (this.traco.comps !== D.comparacoes8.insertion) window.ERROS.push(`insertion: a animação fez ${this.traco.comps} comparações e o Java mediu ${D.comparacoes8.insertion}`);
    const ev = this.traco.eventos, pegas = ev.map((e, i) => (e.tipo === "pega" ? i : -1)).filter((i) => i >= 0);
    const i1 = pegas[0], i2 = pegas[1], desloca1 = ev.findIndex((e, i) => i > i1 && e.tipo === "desloca"), solta1 = ev.findIndex((e, i) => i > i1 && e.tipo === "solta");
    this.relogio = relogioDeEventos(ev, [
      { de: i1, ate: desloca1, t0: c.q("cartas") + 0.3, t1: c.q("desloca") },
      { de: desloca1, ate: solta1, t0: c.q("desloca") + 0.2, t1: c.q("encaixa") - 0.1 },
      { de: solta1, ate: i2, t0: c.q("encaixa"), t1: c.q("encaixa") + 1.1 },
      { de: i2, ate: ev.length, t0: c.q("parte"), t1: c.q("quase") - 0.5 },
    ]);
    // segunda mão: quase ordenada, para mostrar o melhor caso do algoritmo
    this.v2 = [1, 2, 3, 5, 4, 7, 8, 9]; this.traco2 = tracoInsertion(this.v2);
    this.relogio2 = relogioDeEventos(this.traco2.eventos, [{ de: 0, ate: this.traco2.eventos.length, t0: c.q("quase") + 1.0, t1: c.dur - 1.6 }]);
  },
  desenhar(ctx, t, c) {
    cabecalho(ctx, t, "Algoritmo 2", "Insertion Sort", COR.fucsia);
    const qQ = c.q("quase"), geo = { tipo: "cartas", x: 262, w: 1396, y: 520, alto: 214, erguer: 196, selo: true, faixa: true };
    const a1 = visivel(t, 0.5, qQ + 0.2, 0.5), a2 = visivel(t, qQ + 0.4, Infinity, 0.5);
    let estado = null, segunda = false;
    if (a1 > 0.01) { ctx.save(); ctx.globalAlpha *= a1; estado = desenharInsertion(ctx, this.traco, this.v, this.relogio(t), geo); ctx.restore(); }
    if (a2 > 0.01) { ctx.save(); ctx.globalAlpha *= a2; estado = desenharInsertion(ctx, this.traco2, this.v2, this.relogio2(t), geo); ctx.restore(); segunda = true; }
    if (estado) {
      const a = visivel(t, c.q("cartas"), Infinity, 0.5);
      contador(ctx, 1210, 880, estado.comps, "comparações", { alfa: a });
      contador(ctx, 1480, 880, estado.movs, "cartas que andaram", { cor: COR.ambar, alfa: a });
      if (segunda) texto(ctx, "uma mão quase ordenada", 262, 280, { tam: 34, cor: COR.fraco, alfa: a2 });
    }
    legendaPorTempo(ctx, t, [
      [c.q("cartas") + 0.2, "Pega a próxima carta e compara, da direita para a esquerda."],
      [c.q("desloca"), "As maiores andam uma casa para a direita."],
      [c.q("encaixa"), "A carta entra na vaga que sobrou."],
      [c.q("parte"), "A parte ordenada cresce uma carta por vez."],
      [qQ + 0.4, "Lista quase ordenada: quase ninguém anda."],
    ], { fim: c.dur - 0.4, y: 990, tam: 32 });
    vinheta(ctx, t, "2", "Insertion Sort", COR.fucsia);
  },
};

// ------------------------------------------------------------------ INSERTION SORT: O CÓDIGO
CENAS.insertionCodigo = {
  preparar(c, D) {
    this.linhas = D.codigo.insertion.split("\n");
    this.focos = resolverFocos("insertion", this.linhas, [
      { t: 0 },
      { t: 0.9, de: "for (int i = 1" },
      { t: c.q("chave"), de: "int chave = v[i];", cor: COR.fucsia },
      { t: c.q("while"), de: "while (j >= 0 && maior(v[j], chave))" },
      { t: c.q("desloca"), de: "v[j + 1] = v[j];", ate: "j--;", cor: COR.ambar },
      { t: c.q("encaixa"), de: "v[j + 1] = chave;", cor: COR.verde },
      { t: c.q("custo") },
    ]);
    const l = this.linhas;
    this.linhaDoEvento = { chave: linhaDe(l, "int chave"), while: linhaDe(l, "while ("), desloca: linhaDe(l, "v[j + 1] = v[j];"), solta: linhaDe(l, "v[j + 1] = chave;") };
    this.v = D.vetor8; this.traco = tracoInsertion(this.v);
    this.relogio = relogioDeEventos(this.traco.eventos, [{ de: 0, ate: this.traco.eventos.length, t0: 1.2, t1: c.q("custo") - 0.5 }]);
    this.casos = D.casos.insertion;
  },
  desenhar(ctx, t, c) {
    cabecalho(ctx, t, "Insertion Sort", "No código: a chave e a vaga", COR.fucsia);
    const qC = c.q("custo"), qM = c.q("melhor"), rel = this.relogio(t), ev = rel.parado ? null : this.traco.eventos[rel.k];
    const aViz = visivel(t, 0.5, qC - 0.2, 0.5);
    painelCodigo(ctx, t, 100, 236, 1170, 620, "Ordenacao.java", this.linhas, this.focos, { execucao: aViz > 0.5 && ev ? this.linhaDoEvento[ev.linha] : -1 });
    if (aViz > 0.01) {
      ctx.save(); ctx.globalAlpha *= aViz;
      texto(ctx, "rodando agora", 1330, 300, { tam: 24, cor: COR.fraco, espaco: 2 });
      const estado = desenharInsertion(ctx, this.traco, this.v, rel, { tipo: "barras", x: 1320, w: 480, base: 720, alto: 280, erguer: 70, rotulos: true, faixa: true });
      contador(ctx, 1330, 860, estado.comps, "comparações", { tam: 52 });
      contador(ctx, 1600, 860, estado.movs, "deslocamentos", { tam: 52, cor: COR.ambar });
      ctx.restore();
    }
    // pior e melhor caso, com os números que o programa mediu para 1.000 valores
    const escada = (x, y, subindo, cor, a) => {
      for (let b = 0; b < 10; b++) { const h = 22 + (subindo ? b : 9 - b) * 15 + Math.sin(t * 3.2 - b * 0.7) * 7; ctx.fillStyle = comAlfa(cor, a); caixa(ctx, x + b * 26, y - h, 19, h, 5); ctx.fill(); }
    };
    const aP = visivel(t, qC, Infinity, 0.5), aM = visivel(t, qM, Infinity, 0.5);
    if (aP > 0.01) {
      texto(ctx, "1.000 valores", 1320, 300, { tam: 24, cor: COR.fraco, espaco: 2, alfa: aP });
      escada(1320, 480, false, COR.rosa, aP);
      texto(ctx, "lista invertida", 1620, 400, { tam: 30, cor: COR.fraco, alfa: aP });
      texto(ctx, milhar(contando(this.casos.invertido, fase(t, qC + 0.2, 1.5))), 1320, 570, { tam: 76, peso: 650, cor: COR.rosa, alfa: aP });
      texto(ctx, "comparações · n(n − 1)/2", 1320, 614, { tam: 26, cor: COR.fraco, alfa: aP });
      escada(1320, 800, true, COR.verde, aM);
      texto(ctx, "lista já ordenada", 1620, 720, { tam: 30, cor: COR.fraco, alfa: aM });
      texto(ctx, milhar(contando(this.casos.ordenado, fase(t, qM + 0.2, 1.2))), 1320, 890, { tam: 76, peso: 650, cor: COR.verde, alfa: aM });
      texto(ctx, "comparações · n − 1", 1320, 934, { tam: 26, cor: COR.fraco, alfa: aM });
    }
  },
};
