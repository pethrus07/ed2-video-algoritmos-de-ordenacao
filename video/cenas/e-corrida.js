"use strict";

// ------------------------------------------------------------------ A CORRIDA
// Três raias, o mesmo vetor de 64 valores. O relógio da corrida é o número de comparações.
CENAS.corrida = {
  preparar(c, D) {
    const v = D.vetor64;
    this.vmax = Math.max(...v);
    this.raias = [
      { nome: "Bubble Sort", chave: "bubble", cor: COR.ciano, ...corridaBubble(v) },
      { nome: "Insertion Sort", chave: "insertion", cor: COR.fucsia, ...corridaInsertion(v) },
      { nome: "Merge Sort", chave: "merge", cor: COR.ambar, ...corridaMerge(v) },
    ];
    for (const r of this.raias) if (r.comps !== D.comparacoes64[r.chave]) window.ERROS.push(`corrida, ${r.nome}: a animação fez ${r.comps} comparações e o Java mediu ${D.comparacoes64[r.chave]}`);
    const [b, i, m] = this.raias.map((r) => r.comps);
    // o passo da corrida em cada instante: a chegada de cada um coincide com a fala
    this.pontos = [[c.q("larga") + 0.4, 0], [c.q("merge") + 0.9, m], [c.q("insertion") + 0.9, i], [c.q("placar") - 0.6, b]];
    this.ordemChegada = this.raias.slice().sort((x, y) => x.comps - y.comps);
  },
  passo(t) {
    const p = this.pontos;
    if (t <= p[0][0]) return 0;
    for (let k = 1; k < p.length; k++) if (t < p[k][0]) return lerp(p[k - 1][1], p[k][1], (t - p[k - 1][0]) / (p[k][0] - p[k - 1][0]));
    return p[p.length - 1][1];
  },
  desenhar(ctx, t, c) {
    cabecalho(ctx, t, "A corrida", "Os três, com a mesma lista de 64 valores", COR.verde);
    const passo = this.passo(t), qP = c.q("placar"), aRaias = 1 - 0.9 * E.io(fase(t, qP, 0.5));
    const n = 64, x0 = 470, largura0 = 1330, bw = largura0 / n;
    this.raias.forEach((r, i) => {
      const y = 262 + i * 232, alto = 176, base = y + alto + 14;
      const feito = passo >= r.comps, k = Math.min(r.quadros.length - 1, feito ? r.quadros.length - 1 : Math.floor(passo)), q = r.quadros[k];
      const entrada = E.out(fase(t, 0.3 + i * 0.15, 0.5));
      ctx.save(); ctx.globalAlpha *= entrada * aRaias;
      ctx.fillStyle = "rgba(13,20,42,.6)"; caixa(ctx, 110, y - 6, W - 220, alto + 40, 22); ctx.fill();
      ctx.strokeStyle = feito ? comAlfa(r.cor, 0.9) : COR.linha; ctx.lineWidth = feito ? 3 : 2; ctx.stroke();
      texto(ctx, r.nome, 142, y + 54, { tam: 38, peso: 650, cor: r.cor });
      texto(ctx, milhar(Math.min(r.comps, Math.floor(passo))), 142, y + 126, { tam: 62, peso: 650 });
      texto(ctx, "comparações", 142, y + 160, { tam: 22, cor: COR.fraco });
      // em que instante esta raia terminou, para a onda de chegada
      const tFim = feito ? this.instanteDe(r.comps) : Infinity, onda = t - tFim;
      for (let s = 0; s < n; s++) {
        const valor = q.v[s], ativo = !feito && q.ativos.includes(s);
        let sobe = 0, estado = feito || s >= n - q.prontos ? "certa" : ativo ? "ativa" : "normal";
        if (feito && onda < 1.4) { const kk = fase(onda, s / n * 0.7, 0.5); sobe = Math.sin(kk * Math.PI) * 22; }
        if (passo === 0) sobe = (Math.sin(t * 3.4 - s * 0.35) + 1) * 5; // à espera da largada
        if (feito && onda >= 1.4) sobe = (Math.sin(t * 2.4 - s * 0.3) + 1) * 3.5; // já chegou: fica ondulando
        barra(ctx, x0 + s * bw + 1.5, base - sobe, bw - 3, alto * (0.08 + 0.92 * valor / this.vmax), valor / this.vmax, estado, { brilho: ativo ? 18 : 0 });
      }
      if (feito) {
        const lugar = this.ordemChegada.indexOf(r) + 1, a = E.volta(fase(onda, 0.1, 0.5));
        ctx.save(); ctx.globalAlpha *= clamp(a);
        ctx.fillStyle = r.cor; caixa(ctx, 340, y + 86, 92, 50, 25); ctx.fill();
        texto(ctx, `${lugar}º`, 386, y + 113, { tam: 30, peso: 700, alinha: "center", base: "middle", cor: "rgba(6,10,22,.95)" });
        ctx.restore();
      }
      ctx.restore();
    });
    // placar final
    const aP = visivel(t, qP, Infinity, 0.5);
    if (aP > 0.01) {
      ctx.save(); ctx.globalAlpha *= aP;
      ctx.fillStyle = "rgba(9,14,30,.985)"; caixa(ctx, 250, 300, W - 500, 560, 30); ctx.fill();
      ctx.strokeStyle = COR.borda; ctx.lineWidth = 2; ctx.stroke();
      texto(ctx, "COMPARAÇÕES PARA ORDENAR 64 VALORES", 320, 380, { tam: 24, peso: 600, cor: COR.fraco, espaco: 3 });
      const max = this.raias[0].comps;
      this.ordemChegada.forEach((r, i) => {
        const y = 440 + i * 130, k = E.out5(fase(t, qP + 0.4 + i * 0.9, 1.0));
        texto(ctx, r.nome, 320, y + 40, { tam: 36, peso: 600 });
        const g = ctx.createLinearGradient(640, 0, 640 + 800, 0); g.addColorStop(0, comAlfa(r.cor, 0.55)); g.addColorStop(1, r.cor);
        const wBarra = Math.max(6, (r.comps / max) * 780 * k);
        ctx.fillStyle = g; caixa(ctx, 640, y + 6, wBarra, 46, 12); ctx.fill();
        // reflexo que atravessa a barra
        ctx.save(); caixa(ctx, 640, y + 6, wBarra, 46, 12); ctx.clip();
        const rx = 640 + ((t * 320 + i * 170) % (800 + 260)) - 130, rg = ctx.createLinearGradient(rx, 0, rx + 130, 0);
        rg.addColorStop(0, "rgba(255,255,255,0)"); rg.addColorStop(0.5, "rgba(255,255,255,.42)"); rg.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = rg; ctx.fillRect(rx, y + 6, 130, 46); ctx.restore();
        texto(ctx, milhar(r.comps * k), 640 + (r.comps / max) * 780 * k + 20, y + 44, { tam: 44, peso: 650, cor: r.cor });
      });
      ctx.restore();
    }
    legendaPorTempo(ctx, t, [[c.q("larga"), "Cada comparação conta como um passo."]], { fim: c.q("merge") + 0.6, y: 1000, tam: 30 });
  },
  /** Instante em que a corrida chega ao passo dado. */
  instanteDe(passoAlvo) {
    const p = this.pontos;
    for (let k = 1; k < p.length; k++) if (passoAlvo <= p[k][1]) return lerp(p[k - 1][0], p[k][0], (passoAlvo - p[k - 1][1]) / (p[k][1] - p[k - 1][1] || 1));
    return p[p.length - 1][0];
  },
};

// ------------------------------------------------------------------ EM ESCALA
// 100.000 valores: as barras do gráfico usam os números medidos pelo programa Java.
CENAS.escala = {
  preparar(c, D) {
    const e = D.escala[100000];
    this.linhas = [
      { nome: "Bubble Sort", cor: COR.ciano, comps: e.bubble.comparacoes, ms: e.bubble.ms },
      { nome: "Insertion Sort", cor: COR.fucsia, comps: e.insertion.comparacoes, ms: e.insertion.ms },
      { nome: "Merge Sort", cor: COR.ambar, comps: e.merge.comparacoes, ms: e.merge.ms },
    ];
    this.vezes = Math.floor(e.bubble.comparacoes / e.merge.comparacoes);
  },
  desenhar(ctx, t, c) {
    cabecalho(ctx, t, "Em escala", "100.000 valores", COR.rosa);
    const qG = c.q("grafico"), qI = c.q("insertion"), qM = c.q("merge"), qV = c.q("vezes"), qT = c.q("tempo"), qC = c.q("curvas");
    const entra = [qG + 1.6, qI + 0.2, qM + 0.2], x0 = 520, cheio = 1100;
    const aGraf = visivel(t, qG, qC - 0.2, 0.5), emTempo = E.io(fase(t, qT, 0.8));
    const tempo = (ms) => (ms >= 1000 ? decimal(ms / 1000, 1) + " s" : decimal(ms, 1) + " ms");
    if (aGraf > 0.01) {
      ctx.save(); ctx.globalAlpha *= aGraf;
      texto(ctx, emTempo < 0.5 ? "COMPARAÇÕES" : "TEMPO NESTA MÁQUINA", x0, 300, { tam: 24, peso: 600, cor: COR.fraco, espaco: 3, alfa: Math.abs(emTempo - 0.5) * 2 });
      this.linhas.forEach((l, i) => {
        const y = 350 + i * 150, k = E.out5(fase(t, entra[i], 1.5)), a = E.out(fase(t, entra[i] - 0.2, 0.4));
        const fracComps = l.comps / this.linhas[0].comps, fracMs = l.ms / this.linhas[0].ms, frac = lerp(fracComps, fracMs, emTempo);
        ctx.save(); ctx.globalAlpha *= a;
        texto(ctx, l.nome, 120, y + 56, { tam: 42, peso: 650, cor: l.cor });
        const w = Math.max(5, cheio * frac * k), g = ctx.createLinearGradient(x0, 0, x0 + cheio, 0);
        g.addColorStop(0, comAlfa(l.cor, 0.5)); g.addColorStop(1, l.cor);
        ctx.shadowColor = comAlfa(l.cor, 0.5); ctx.shadowBlur = 30; ctx.fillStyle = g; caixa(ctx, x0, y + 12, w, 66, 14); ctx.fill(); ctx.shadowBlur = 0;
        const rotulo = emTempo < 0.5 ? milhar(l.comps * k) : tempo(l.ms);
        const dentro = w > 560;
        texto(ctx, rotulo, dentro ? x0 + w - 24 : x0 + w + 24, y + 62, { tam: 46, peso: 650, alinha: dentro ? "right" : "left", cor: dentro ? "rgba(6,10,22,.92)" : l.cor, alfa: Math.abs(emTempo - 0.5) * 2 });
        ctx.restore();
      });
      // quantas vezes menos
      const aV = visivel(t, qV, qT - 0.2, 0.4), kV = E.volta(fase(t, qV, 0.6));
      if (aV > 0.01) {
        texto(ctx, milhar(contando(this.vezes, fase(t, qV, 1.2))) + "×", 1560, 760 + (1 - clamp(kV)) * 30, { tam: 150, peso: 700, cor: COR.ambar, alinha: "center", alfa: aV, brilho: 50, espaco: -4 });
        texto(ctx, "menos comparações", 1560, 830, { tam: 34, cor: COR.fraco, alinha: "center", alfa: aV });
      }
      ctx.restore();
    }
    // as duas curvas
    const aC = visivel(t, qC, Infinity, 0.5);
    if (aC > 0.01) {
      ctx.save(); ctx.globalAlpha *= aC;
      const gx = 240, gy = 880, gw = 1100, gh = 560, nMax = 100000, yMax = (nMax * (nMax - 1)) / 2;
      ctx.strokeStyle = COR.borda; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(gx, gy - gh - 20); ctx.lineTo(gx, gy); ctx.lineTo(gx + gw + 20, gy); ctx.stroke();
      texto(ctx, "comparações", gx - 20, gy - gh - 34, { tam: 24, cor: COR.fraco });
      texto(ctx, "tamanho da lista (n)", gx + gw / 2, gy + 92, { tam: 24, cor: COR.fraco, alinha: "center" });
      for (const [valor, rotulo] of [[25000, "25 mil"], [50000, "50 mil"], [75000, "75 mil"], [100000, "100 mil"]]) {
        const x = gx + (valor / nMax) * gw;
        ctx.strokeStyle = "rgba(148,163,200,.1)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy - gh); ctx.stroke();
        texto(ctx, rotulo, x, gy + 44, { tam: 22, cor: COR.apagado, alinha: "center" });
      }
      const curva = (fy, cor, k, grosso) => {
        ctx.strokeStyle = cor; ctx.lineWidth = grosso; ctx.lineCap = "round"; ctx.shadowColor = cor; ctx.shadowBlur = 22; ctx.beginPath();
        const ate = Math.max(1, Math.floor(200 * k));
        for (let s = 0; s <= ate; s++) { const nn = (s / 200) * nMax, x = gx + (s / 200) * gw, y = gy - (fy(nn) / yMax) * gh; if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        ctx.stroke(); ctx.shadowBlur = 0;
        const nn = (ate / 200) * nMax; return [gx + (ate / 200) * gw, gy - (fy(nn) / yMax) * gh];
      };
      const k1 = E.io(fase(t, qC + 0.3, 1.8)), k2 = E.io(fase(t, qC + 1.4, 1.8));
      const [ax, ay] = curva((nn) => (nn * (nn - 1)) / 2, COR.ciano, k1, 7);
      const [bx, by] = curva((nn) => (nn > 1 ? nn * Math.log2(nn) : 0), COR.ambar, k2, 7);
      texto(ctx, "n²", Math.min(ax + 24, gx + gw + 30), ay + 10, { tam: 70, peso: 650, cor: COR.ciano, alfa: clamp(k1 * 2) });
      texto(ctx, "n log n", bx + 24, by - 14, { tam: 60, peso: 650, cor: COR.ambar, alfa: clamp(k2 * 2) });
      texto(ctx, "Bubble Sort", 1480, 400, { tam: 34, cor: COR.ciano, alfa: clamp(k1 * 2) });
      texto(ctx, "Insertion Sort", 1480, 450, { tam: 34, cor: COR.fucsia, alfa: clamp(k1 * 2) });
      texto(ctx, "crescem com n²", 1480, 500, { tam: 28, cor: COR.fraco, alfa: clamp(k1 * 2) });
      texto(ctx, "Merge Sort", 1480, 760, { tam: 34, cor: COR.ambar, alfa: clamp(k2 * 2) });
      texto(ctx, "cresce com n log n", 1480, 810, { tam: 28, cor: COR.fraco, alfa: clamp(k2 * 2) });
      ctx.restore();
    }
    // antes do gráfico: a frase de abertura
    const aF = visivel(t, 0.4, qG - 0.1, 0.4);
    texto(ctx, "Com 64 valores, a diferença aparece.", W / 2, 500, { tam: 72, peso: 650, alinha: "center", alfa: aF, espaco: -1 });
    texto(ctx, "Com cem mil, vira um abismo.", W / 2, 610, { tam: 72, peso: 650, alinha: "center", cor: COR.rosa, alfa: visivel(t, 2.4, qG - 0.1, 0.4), espaco: -1 });
  },
};
