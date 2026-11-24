"use strict";

/**
 * Desenha o Bubble Sort em um instante do traço ({k, p}: evento em curso e o quanto ele andou).
 * geo = {x, w, base, alto, rotulos, selo}: caixa onde as barras vivem.
 */
function desenharBubble(ctx, traco, valores, { k, p, parado }, geo, t) {
  const n = traco.n, estado = traco.antes[Math.min(k, traco.antes.length - 1)], ev = parado ? null : traco.eventos[k];
  const passo = geo.w / n, bw = passo * 0.72, vmax = Math.max(...valores);
  const xDe = (slot) => geo.x + slot * passo + (passo - bw) / 2;
  const hDe = (id) => geo.alto * (0.16 + 0.84 * (valores[id] / vmax));
  const itens = [];
  for (let slot = 0; slot < n; slot++) {
    const id = estado.ordem[slot];
    const item = { id, x: xDe(slot), y: 0, estado: estado.certos[id] ? "certa" : "normal", brilho: 0, frente: false };
    if (ev && ev.tipo === "cmp" && (slot === ev.a || slot === ev.b)) { item.estado = "ativa"; item.y = -Math.sin(Math.min(1, p * 2) * Math.PI / 2) * 14 * (1 - E.in(fase(p, 0.8, 0.2))); item.frente = true; }
    if (ev && ev.tipo === "troca") {
      if (slot === ev.a) { item.x = lerp(xDe(ev.a), xDe(ev.b), E.io(p)); item.y = -Math.sin(p * Math.PI) * (geo.arco ?? 90); item.estado = "ativa"; item.frente = true; }
      if (slot === ev.b) { item.x = lerp(xDe(ev.b), xDe(ev.a), E.io(p)); item.estado = "ativa"; }
    }
    if (ev && ev.tipo === "trava" && slot === ev.slot) { item.estado = "certa"; item.brilho = 60 * Math.sin(p * Math.PI); }
    if (ev && ev.tipo === "travaTudo" && !estado.certos[id]) { const kk = fase(p, slot / n * 0.5, 0.4); if (kk > 0) { item.estado = "certa"; item.brilho = 50 * Math.sin(kk * Math.PI); item.y = -Math.sin(kk * Math.PI) * 26; } }
    itens.push(item);
  }
  // faixa da parte que ainda falta ordenar
  const falta = estado.certos.filter((x) => !x).length;
  if (geo.faixa && falta > 1 && ev && ev.tipo !== "travaTudo") {
    ctx.fillStyle = "rgba(148,163,200,.07)"; caixa(ctx, geo.x - 6, geo.base - geo.alto - 70, falta * passo + 12, geo.alto + 96, 22); ctx.fill();
  }
  for (const item of itens.sort((a, b) => a.frente - b.frente)) {
    barra(ctx, item.x, geo.base + item.y, bw, hDe(item.id), valores[item.id] / vmax, item.estado, { rotulo: geo.rotulos ? valores[item.id] : null, brilho: item.brilho || undefined });
  }
  // bolhas que sobem quando um valor chega ao lugar definitivo
  if (geo.bolhas && t != null) {
    traco.eventos.forEach((e, i) => {
      if (e.tipo !== "trava") return;
      const dt = t - geo.relogio.inicio(i);
      if (dt < 0 || dt > 1.8) return;
      const id = traco.antes[i].ordem[e.slot], bx = xDe(e.slot) + bw / 2, topo = geo.base - hDe(id);
      for (let b = 0; b < 9; b++) {
        const r0 = ruido(i * 31 + b), kk = clamp(dt / (1.1 + r0 * 0.7));
        const y = topo - 30 - kk * (140 + r0 * 150), x = bx + (r0 - 0.5) * 90 + Math.sin(dt * 5 + b) * 10;
        ctx.strokeStyle = corValor(valores[id] / vmax, 1.15, (1 - kk) * 0.85); ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(x, y, 6 + r0 * 13, 0, 7); ctx.stroke();
      }
    });
  }
  if (geo.selo && ev && ev.tipo === "cmp") {
    const a = estado.ordem[ev.a], b = estado.ordem[ev.b];
    seloComparacao(ctx, (xDe(ev.a) + xDe(ev.b) + bw) / 2, geo.base - geo.alto - 110, valores[a], valores[b], ev.maior, p);
  }
  return estado;
}

// ------------------------------------------------------------------ BUBBLE SORT: A IDEIA
CENAS.bubbleIdeia = {
  preparar(c, D) {
    this.v = D.vetor8; this.traco = tracoBubble(this.v);
    const ev = this.traco.eventos, travas = ev.map((e, i) => (e.tipo === "trava" ? i : -1)).filter((i) => i >= 0);
    const fimPassada1 = travas[0] + 1, inicioUltima = travas[travas.length - 2] + 1;
    this.relogio = relogioDeEventos(ev, [
      { de: 0, ate: fimPassada1, t0: c.q("regra") + 0.3, t1: c.q("passada") + 1.4 },
      { de: fimPassada1, ate: inicioUltima, t0: c.q("repete") + 0.2, t1: c.q("fim") - 0.3 },
      { de: inicioUltima, ate: ev.length, t0: c.q("fim") + 0.2, t1: c.dur - 1.3 },
    ]);
  },
  desenhar(ctx, t, c) {
    cabecalho(ctx, t, "Algoritmo 1", "Bubble Sort", COR.ciano);
    const geo = { x: 250, w: 1180, base: 850, alto: 430, rotulos: true, selo: true, faixa: true, bolhas: true, arco: 110, relogio: this.relogio };
    const estado = desenharBubble(ctx, this.traco, this.v, this.relogio(t), geo, t);
    // painel de contadores
    const a = visivel(t, c.q("regra"), Infinity, 0.5);
    ctx.save(); ctx.globalAlpha *= a;
    ctx.fillStyle = "rgba(13,20,42,.8)"; caixa(ctx, 1500, 330, 300, 430, 26); ctx.fill();
    ctx.strokeStyle = COR.borda; ctx.lineWidth = 2; ctx.stroke();
    contador(ctx, 1540, 430, estado.passada + (estado.certos.every(Boolean) ? 0 : 1), "passada", { cor: COR.ciano });
    contador(ctx, 1540, 560, estado.comps, "comparações");
    contador(ctx, 1540, 690, estado.trocas, "trocas", { cor: COR.ambar });
    ctx.restore();
    legendaPorTempo(ctx, t, [
      [c.q("regra") + 0.2, "Compara cada par de vizinhos. Se estão fora de ordem, troca."],
      [c.q("passada"), "Fim da passada: o maior chegou ao lugar dele."],
      [c.q("repete"), "A cada passada, a parte por ordenar fica menor."],
      [c.q("fim"), "Passada sem nenhuma troca: está ordenado."],
    ], { fim: c.dur - 0.4 });
    vinheta(ctx, t, "1", "Bubble Sort", COR.ciano);
  },
};

// ------------------------------------------------------------------ BUBBLE SORT: O CÓDIGO
CENAS.bubbleCodigo = {
  preparar(c, D) {
    this.linhas = D.codigo.bubble.split("\n");
    this.focos = resolverFocos("bubble", this.linhas, [
      { t: 0 },
      { t: c.q("externo"), de: "for (int passada" },
      { t: c.q("interno"), de: "for (int j = 0" },
      { t: c.q("compara"), de: "if (maior(v[j], v[j + 1]))" },
      { t: c.q("troca"), de: "int aux = v[j];", ate: "v[j + 1] = aux;", cor: COR.ambar },
      { t: c.q("flag"), de: "if (!trocou) {", ate: "}", cor: COR.verde },
      { t: c.q("custo") },
    ]);
    this.linhaDoEvento = { cmp: linhaDe(this.linhas, "if (maior("), troca: linhaDe(this.linhas, "v[j] = v[j + 1];"), fimPassada: linhaDe(this.linhas, "if (!trocou)"), fim: this.linhas.length - 1 };
    this.v = D.vetor8; this.traco = tracoBubble(this.v);
    this.relogio = relogioDeEventos(this.traco.eventos, [{ de: 0, ate: this.traco.eventos.length, t0: c.q("externo") - 0.6, t1: c.q("custo") - 0.4 }]);
  },
  desenhar(ctx, t, c) {
    cabecalho(ctx, t, "Bubble Sort", "No código: dois laços", COR.ciano);
    const qCusto = c.q("custo"), qDobro = c.q("dobro");
    const rel = this.relogio(t), ev = rel.parado ? null : this.traco.eventos[rel.k];
    const aViz = visivel(t, 0.5, qCusto - 0.2, 0.5);
    painelCodigo(ctx, t, 100, 236, 1170, 720, "Ordenacao.java", this.linhas, this.focos, { execucao: aViz > 0.5 && ev ? this.linhaDoEvento[ev.linha] : -1 });
    // à direita: o mesmo algoritmo rodando
    if (aViz > 0.01) {
      ctx.save(); ctx.globalAlpha *= aViz;
      texto(ctx, "rodando agora", 1330, 300, { tam: 24, cor: COR.fraco, espaco: 2 });
      const estado = desenharBubble(ctx, this.traco, this.v, rel, { x: 1320, w: 480, base: 760, alto: 330, rotulos: true, arco: 60, faixa: true }, t);
      contador(ctx, 1330, 860, estado.comps, "comparações", { tam: 52 });
      contador(ctx, 1600, 860, estado.trocas, "trocas", { tam: 52, cor: COR.ambar });
      ctx.restore();
    }
    // o custo: o triângulo de comparações, para 8 e para 16 elementos
    const aC = visivel(t, qCusto, Infinity, 0.5);
    if (aC > 0.01) {
      ctx.save(); ctx.globalAlpha *= aC;
      const triangulo = (x, y, n, lado, t0, cor) => {
        let feitos = 0; const total = (n * (n - 1)) / 2, mostra = Math.floor(fase(t, t0, 1.6) * total);
        // depois de cheio, a luz refaz o caminho do algoritmo: uma comparação por vez, passada por passada
        const luz = mostra >= total ? ((t - t0 - 1.6) * (total / 2.6)) % total : -1;
        for (let passada = 0; passada < n - 1; passada++) for (let j = 0; j < n - 1 - passada; j++) {
          if (feitos >= mostra) return total;
          const perto = luz < 0 ? 0 : clamp(1 - Math.abs(feitos - luz) / (total * 0.09));
          ctx.fillStyle = perto > 0 ? mistura(cor, COR.branco, perto * 0.85) : cor;
          caixa(ctx, x + j * lado, y + passada * lado, lado - 4, lado - 4, 4); ctx.fill();
          feitos++;
        }
        return total;
      };
      texto(ctx, "comparações no pior caso", 1320, 300, { tam: 24, cor: COR.fraco, espaco: 2 });
      triangulo(1320, 340, 8, 28, qCusto + 0.3, COR.ciano);
      texto(ctx, "8 elementos", 1320, 580, { tam: 26, cor: COR.fraco });
      texto(ctx, String(contando(28, fase(t, qCusto + 0.3, 1.6))), 1320, 640, { tam: 60, peso: 650, cor: COR.ciano });
      const a16 = visivel(t, qDobro - 0.3, Infinity, 0.4);
      ctx.globalAlpha *= a16;
      triangulo(1560, 340, 16, 15.5, qDobro - 0.1, COR.fucsia);
      texto(ctx, "16 elementos", 1560, 610, { tam: 26, cor: COR.fraco });
      texto(ctx, String(contando(120, fase(t, qDobro - 0.1, 1.6))), 1560, 670, { tam: 60, peso: 650, cor: COR.fucsia });
      ctx.restore();
      const aF = visivel(t, qCusto + 1.2, Infinity, 0.5);
      texto(ctx, "n (n − 1) / 2", 1320, 800, { tam: 58, peso: 600, mono: true, alfa: aF });
      texto(ctx, "cresce com n²", 1320, 860, { tam: 34, cor: COR.ambar, alfa: aF });
      legenda(ctx, "Dobrou a lista, quadruplicou o trabalho.", visivel(t, qDobro, c.dur - 0.4, 0.3), { cor: COR.fucsia, y: 1012, tam: 32 });
    }
  },
};
