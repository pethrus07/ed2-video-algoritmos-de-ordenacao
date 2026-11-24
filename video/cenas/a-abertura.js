"use strict";

// ------------------------------------------------------------------ ABERTURA
// 72 barras bagunçadas tremem no fundo; quando o título entra, elas se arrumam em uma onda e viram um degradê.
CENAS.abertura = {
  preparar(c) {
    const n = 72;
    this.n = n;
    this.ordemInicial = Array.from({ length: n }, (_, i) => i).sort((a, b) => ruido(a + 3) - ruido(b + 3)); // slot -> valor
    this.slotDe = []; this.ordemInicial.forEach((valor, slot) => (this.slotDe[valor] = slot));
  },
  desenhar(ctx, t, c) {
    const n = this.n, qT = c.q("titulo"), qTres = c.q("tres"), qP = c.q("pergunta");
    const base = 1010, larguraUtil = W - 240, passo = larguraUtil / n, bw = passo - 6;
    // a ordenação varre da esquerda para a direita durante 2,4 s, começando um pouco antes do título
    for (let valor = 0; valor < n; valor++) {
      const f = valor / (n - 1);
      const atraso = qT - 0.5 + f * 1.5;
      const k = E.io(fase(t, atraso, 1.1));
      const slot = lerp(this.slotDe[valor], valor, k);
      const tremor = (1 - k) * Math.sin(t * 2.2 + valor * 1.7) * 14;
      const salto = Math.sin(k * Math.PI) * 120;
      const h = 150 + f * 430 + tremor;
      const x = 120 + slot * passo + 3;
      const escuro = lerp(0.42, 0.9, k) * (1 - 0.55 * E.io(fase(t, qTres - 0.2, 0.9)));
      ctx.save(); ctx.globalAlpha *= escuro;
      barra(ctx, x, base - salto * 0.25, bw, h, f, k > 0.98 ? "certa" : "normal", { brilho: k > 0.98 ? 18 : 0 });
      ctx.restore();
    }
    // véu para o texto ficar legível sobre as barras
    const veu = ctx.createLinearGradient(0, 0, 0, H);
    veu.addColorStop(0, "rgba(7,11,22,.92)"); veu.addColorStop(0.55, "rgba(7,11,22,.55)"); veu.addColorStop(1, "rgba(7,11,22,0)");
    ctx.fillStyle = veu; ctx.fillRect(0, 0, W, H);

    // frase de entrada, antes do título
    const aFrase = visivel(t, 0.4, qT - 0.2, 0.5);
    texto(ctx, "Do menor para o maior.", 120, 420, { tam: 92, peso: 650, espaco: -2, alfa: aFrase });
    texto(ctx, "Alguém teve de ordenar.", 120, 530, { tam: 92, peso: 650, espaco: -2, cor: COR.fraco, alfa: visivel(t, 1.5, qT - 0.2, 0.5) });

    // título
    const aT = visivel(t, qT, qTres - 0.15, 0.6), sobe = (1 - E.out(fase(t, qT, 0.7))) * 40;
    ctx.save(); ctx.globalAlpha *= aT;
    ctx.fillStyle = COR.ciano; caixa(ctx, 120, 250 + sobe, 56, 7, 4); ctx.fill();
    texto(ctx, "TRABALHO DE ESTRUTURAS DE DADOS 2 · UNIPÊ · PROF. ED", 196, 262 + sobe, { tam: 26, peso: 600, cor: COR.ciano, espaco: 4.5 });
    texto(ctx, "Algoritmos", 112, 420 + sobe, { tam: 150, peso: 700, espaco: -5 });
    const g = ctx.createLinearGradient(120, 0, 1100, 0);
    g.addColorStop(0, COR.ciano); g.addColorStop(0.5, COR.indigo); g.addColorStop(1, COR.fucsia);
    ctx.save(); ctx.font = `700 150px ${FONTE}`; ctx.letterSpacing = "-5px"; ctx.fillStyle = g; ctx.fillText("de Ordenação", 112, 570 + sobe); ctx.restore();
    const aN = E.out(fase(t, qT + 0.9, 0.6));
    texto(ctx, "DUPLA", 120, 680, { tam: 22, peso: 600, cor: COR.fraco, espaco: 4, alfa: aN });
    texto(ctx, D.dupla, 120, 728, { tam: 44, peso: 550, alfa: aN });
    ctx.restore();

    // os três algoritmos
    const nomes = [["Bubble Sort", "troca vizinhos", COR.ciano], ["Insertion Sort", "encaixa um por vez", COR.fucsia], ["Merge Sort", "divide e intercala", COR.ambar]];
    const aC = visivel(t, qTres, Infinity, 0.5);
    if (aC > 0.01) {
      texto(ctx, "Três algoritmos", 120, 250, { tam: 72, peso: 650, espaco: -1.5, alfa: aC });
      nomes.forEach(([nome, sub, cor], i) => {
        const k = E.volta(fase(t, qTres + 0.35 + i * 0.75, 0.6)), a = clamp(k);
        const x = 120 + i * 572, y = 330 + (1 - a) * 60, w = 532, h = 300;
        ctx.save(); ctx.globalAlpha *= a * aC;
        ctx.shadowColor = comAlfa(cor, 0.35); ctx.shadowBlur = 60;
        ctx.fillStyle = "rgba(13,20,42,.92)"; caixa(ctx, x, y, w, h, 28); ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = comAlfa(cor, 0.85); ctx.lineWidth = 3; ctx.stroke();
        texto(ctx, String(i + 1), x + 40, y + 96, { tam: 80, peso: 700, cor });
        texto(ctx, nome, x + 40, y + 190, { tam: 56, peso: 650, espaco: -1 });
        texto(ctx, sub, x + 40, y + 244, { tam: 30, cor: COR.fraco });
        // miniatura animada: 9 barrinhas que se arrumam em laço
        for (let b = 0; b < 9; b++) {
          const ciclo = ((t - qTres) * 0.5 + i * 0.3) % 2, kk = E.io(clamp(ciclo < 1 ? ciclo : 2 - ciclo));
          const alvo = lerp([3, 7, 1, 5, 0, 8, 2, 6, 4][(b + i * 3) % 9], b, kk);
          barra(ctx, x + 330 + alvo * 19, y + 106, 13, 22 + b * 6.5, b / 8, "certa");
        }
        ctx.restore();
      });
      const aPerg = visivel(t, qP, Infinity, 0.5);
      texto(ctx, "Um deles chega a ser milhares de vezes mais rápido.", 120, 740, { tam: 46, peso: 500, cor: COR.texto, alfa: aPerg * aC });
    }
  },
};

// ------------------------------------------------------------------ POR QUE ORDENAR
// A mesma fileira de 32 casas, primeiro bagunçada (busca um por um), depois ordenada (busca pela metade).
CENAS.porque = {
  preparar(c) {
    const n = 32;
    this.n = n; this.alvo = 23;
    this.bagunca = Array.from({ length: n }, (_, i) => i).sort((a, b) => ruido(a + 41) - ruido(b + 41));
    this.posAlvo = this.bagunca.indexOf(this.alvo);
    // passos da busca binária até o alvo
    this.passosBin = []; let lo = 0, hi = n - 1;
    while (lo <= hi) { const m = (lo + hi) >> 1; this.passosBin.push({ lo, hi, m }); if (m === this.alvo) break; if (m < this.alvo) lo = m + 1; else hi = m - 1; }
  },
  desenhar(ctx, t, c) {
    const n = this.n, qB = c.q("busca"), qBin = c.q("binaria"), qN = c.q("numeros"), qC = c.q("custo");
    cabecalho(ctx, t, "Por que ordenar", "Dado ordenado é dado fácil de achar");
    const passo = (W - 240) / n, lado = passo - 10;
    const fileira = (y, valores, estadoDe, rotulo, a) => {
      ctx.save(); ctx.globalAlpha *= a;
      texto(ctx, rotulo, 120, y - 28, { tam: 28, cor: COR.fraco });
      valores.forEach((valor, i) => {
        const e = estadoDe(i, valor), x = 120 + i * passo + 5;
        ctx.save(); ctx.globalAlpha *= e.alfa ?? 1;
        if (e.brilho) { ctx.shadowColor = corValor(valor / (n - 1), 1, 0.9); ctx.shadowBlur = 30; }
        ctx.fillStyle = corValor(valor / (n - 1), e.claro ? 1 : 0.5); caixa(ctx, x, y - (e.sobe || 0), lado, lado, 9); ctx.fill();
        if (e.brilho) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.stroke(); }
        ctx.restore();
        texto(ctx, String(valor + 1), x + lado / 2, y + lado / 2 + 1 - (e.sobe || 0), { tam: 19, peso: 650, alinha: "center", base: "middle", cor: "rgba(6,10,22,.9)", alfa: e.alfa ?? 1 });
      });
      ctx.restore();
    };
    // 1. lista bagunçada: varre um por um até achar
    const durVarre = Math.max(1.5, qBin - qB - 0.9), kVarre = fase(t, qB + 0.4, durVarre);
    const olhando = Math.min(this.posAlvo, Math.floor(kVarre * (this.posAlvo + 1)));
    const aBag = visivel(t, 0.5, qN - 0.3, 0.5);
    fileira(360, this.bagunca, (i, valor) => {
      if (t < qB + 0.4) return { claro: true };
      if (i === olhando) return { claro: true, brilho: true, sobe: 12 };
      if (i < olhando) return { alfa: 0.3 };
      return { claro: kVarre >= 1 ? valor === this.alvo : true };
    }, "lista bagunçada: procurar o 24", aBag);
    contador(ctx, 120, 520, t < qB + 0.4 ? 0 : olhando + 1, olhando === 0 && t >= qB + 0.4 ? "casa olhada" : "casas olhadas", { cor: COR.rosa, alfa: aBag * visivel(t, qB, Infinity, 0.4) });

    // 2. lista ordenada: metade por metade
    const aOrd = visivel(t, qBin - 0.2, qN - 0.3, 0.5);
    const durBin = Math.max(1.5, qN - qBin - 1.0), nb = this.passosBin.length;
    const kb = fase(t, qBin + 0.6, durBin), ib = Math.min(nb - 1, Math.floor(kb * nb)), pb = this.passosBin[ib];
    fileira(700, Array.from({ length: n }, (_, i) => i), (i) => {
      if (t < qBin + 0.6) return { claro: true };
      if (i === pb.m) return { claro: true, brilho: true, sobe: 12 };
      if (i < pb.lo || i > pb.hi) return { alfa: 0.16 };
      return { claro: true };
    }, "lista ordenada: procurar o 24", aOrd);
    contador(ctx, 120, 860, t < qBin + 0.6 ? 0 : ib + 1, ib === 0 && t >= qBin + 0.6 ? "casa olhada" : "casas olhadas", { cor: COR.verde, alfa: aOrd * visivel(t, qBin, Infinity, 0.4) });

    // 3. os números grandes
    const aN = visivel(t, qN, qC - 0.25, 0.5);
    if (aN > 0.01) {
      const k = fase(t, qN + 0.2, 1.6);
      texto(ctx, "1.000.000 de itens", W / 2, 400, { tam: 46, cor: COR.fraco, alinha: "center", alfa: aN });
      texto(ctx, milhar(contando(1000000, k)), W / 2 - 80, 620, { tam: 170, peso: 700, alinha: "right", cor: COR.rosa, alfa: aN, espaco: -4 });
      texto(ctx, "passos", W / 2 - 80, 690, { tam: 34, cor: COR.fraco, alinha: "right", alfa: aN });
      texto(ctx, "contra", W / 2 + 40, 600, { tam: 40, cor: COR.apagado, alinha: "center", alfa: aN });
      const a20 = E.volta(fase(t, qN + 1.3, 0.6));
      texto(ctx, "20", W / 2 + 180, 620, { tam: 170 * clamp(a20, 0, 1.15), peso: 700, cor: COR.verde, alfa: aN * clamp(a20), brilho: 40, espaco: -4 });
      texto(ctx, "passos", W / 2 + 180, 690, { tam: 34, cor: COR.fraco, alfa: aN * clamp(a20) });
    }
    // 4. mas ordenar custa
    const aC = visivel(t, qC, Infinity, 0.5);
    if (aC > 0.01) {
      texto(ctx, "Ordenar tem um custo.", W / 2, 500, { tam: 104, peso: 650, alinha: "center", alfa: aC, espaco: -2 });
      texto(ctx, "E ele depende do algoritmo.", W / 2, 610, { tam: 60, peso: 500, alinha: "center", cor: COR.fraco, alfa: visivel(t, qC + 1.1, Infinity, 0.5) });
    }
  },
};
