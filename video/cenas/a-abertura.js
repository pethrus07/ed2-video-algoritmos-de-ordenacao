"use strict";

/** Cartão de lista (a loja, o ranking): moldura com título e uma pílula à direita. */
function cartaoLista(ctx, x, y, w, h, titulo, pilula, cor, a, aceso) {
  ctx.save(); ctx.globalAlpha *= a;
  ctx.shadowColor = comAlfa(cor, 0.25 + 0.3 * aceso); ctx.shadowBlur = 50 + 40 * aceso;
  ctx.fillStyle = "rgba(13,20,42,.94)"; caixa(ctx, x, y, w, h, 28); ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
  ctx.strokeStyle = comAlfa(cor, 0.45 + 0.5 * aceso); ctx.lineWidth = 2.5; ctx.stroke();
  texto(ctx, titulo, x + 40, y + 66, { tam: 34, peso: 650 });
  const lw = largura(ctx, pilula, { tam: 24, peso: 600 }) + 44;
  ctx.fillStyle = comAlfa(cor, 0.16 + 0.3 * aceso); caixa(ctx, x + w - lw - 36, y + 32, lw, 48, 24); ctx.fill();
  ctx.strokeStyle = comAlfa(cor, 0.9); ctx.lineWidth = 2; ctx.stroke();
  texto(ctx, pilula, x + w - 36 - lw / 2, y + 57, { tam: 24, peso: 600, cor, alinha: "center", base: "middle" });
  ctx.restore();
}

// ------------------------------------------------------------------ ABERTURA
// Primeiro o dia a dia: uma lista de preços e um ranking se arrumando. Depois o título, com 72 barras
// bagunçadas que se ordenam em onda e viram um degradê, e os três algoritmos do vídeo.
CENAS.abertura = {
  preparar(c) {
    const n = 72;
    this.n = n;
    this.ordemInicial = Array.from({ length: n }, (_, i) => i).sort((a, b) => ruido(a + 3) - ruido(b + 3)); // slot -> valor
    this.slotDe = []; this.ordemInicial.forEach((valor, slot) => (this.slotDe[valor] = slot));
    this.loja = [["Teclado", 149], ["Mouse", 59], ["Monitor", 899], ["Fone de ouvido", 89], ["Cadeira", 649]];
    this.ranking = [["Ana", 870], ["Bia", 940], ["Caio", 610], ["Davi", 990], ["Eva", 720]];
    const posicoes = (lista, crescente) => { const ordem = lista.map((_, i) => i).sort((a, b) => (crescente ? lista[a][1] - lista[b][1] : lista[b][1] - lista[a][1])); const pos = []; ordem.forEach((i, lugar) => (pos[i] = lugar)); return pos; };
    this.posLoja = posicoes(this.loja, true); this.posRanking = posicoes(this.ranking, false);
  },
  desenhar(ctx, t, c) {
    const n = this.n, qRank = c.q("ranking"), qAlg = c.q("algoritmo"), qT = c.q("titulo"), qTres = c.q("tres"), qP = c.q("pergunta");

    // ---- o dia a dia: preços e ranking
    const aDia = visivel(t, 0.15, qT - 0.25, 0.45);
    if (aDia > 0.01) {
      const tLoja = Math.max(1.5, qRank - 2.3), aceso = 0.5 + 0.5 * Math.sin((t - qAlg) * 4.2), brilha = t >= qAlg ? 0.35 + 0.3 * aceso : 0;
      const y0 = 250, alto = 560, passo = 86;
      // loja: ordenar por menor preço
      const kL = E.io(fase(t, tLoja, 1.3)), ativoL = clamp(fase(t, tLoja - 0.5, 0.4)) * (1 - 0.6 * fase(t, tLoja + 1.6, 0.6));
      const eL = E.out5(fase(t, 0.15, 0.7));
      ctx.save(); ctx.translate(-(1 - eL) * 80, 0);
      cartaoLista(ctx, 120, y0, 800, alto, "Resultado da busca", "ordenar: menor preço", COR.ciano, aDia * eL, Math.max(ativoL * 0.7, brilha));
      this.loja.forEach(([nome, preco], i) => {
        const pos = lerp(i, this.posLoja[i], kL), y = y0 + 112 + pos * passo, entra = E.out(fase(t, 0.5 + i * 0.12, 0.4));
        const mexendo = Math.sin(kL * Math.PI) * (this.posLoja[i] !== i ? 1 : 0), f = (this.posLoja[i] + 0.5) / 5;
        ctx.save(); ctx.globalAlpha *= aDia * entra * eL; ctx.translate(mexendo * (i % 2 ? 18 : -18), 0);
        ctx.fillStyle = `rgba(148,163,200,${0.07 + 0.1 * mexendo})`; caixa(ctx, 150, y, 740, 70, 16); ctx.fill();
        ctx.fillStyle = corValor(f, 1); caixa(ctx, 168, y + 13, 44, 44, 11); ctx.fill();
        texto(ctx, nome, 236, y + 47, { tam: 32, peso: 550 });
        texto(ctx, "R$ " + milhar(preco), 866, y + 48, { tam: 36, peso: 650, alinha: "right", cor: mistura(COR.texto, COR.ciano, kL) });
        ctx.restore();
      });
      ctx.restore();
      // ranking: do maior para o menor, com os lugares aparecendo
      const tRank = qRank + 0.15, kR = E.io(fase(t, tRank, 1.3)), ativoR = clamp(fase(t, tRank - 0.3, 0.4)) * (1 - 0.6 * fase(t, tRank + 1.6, 0.6));
      const eR = E.out5(fase(t, 0.45, 0.7));
      ctx.save(); ctx.translate((1 - eR) * 80, 0);
      cartaoLista(ctx, 1000, y0, 800, alto, "Ranking da turma", "maior pontuação", COR.ambar, aDia * eR, Math.max(ativoR * 0.7, brilha));
      this.ranking.forEach(([nome, pontos], i) => {
        const pos = lerp(i, this.posRanking[i], kR), y = y0 + 112 + pos * passo, entra = E.out(fase(t, 0.8 + i * 0.12, 0.4));
        const mexendo = Math.sin(kR * Math.PI) * (this.posRanking[i] !== i ? 1 : 0), lugar = this.posRanking[i] + 1;
        ctx.save(); ctx.globalAlpha *= aDia * entra * eR; ctx.translate(mexendo * (i % 2 ? -18 : 18), 0);
        ctx.fillStyle = `rgba(148,163,200,${0.07 + 0.1 * mexendo})`; caixa(ctx, 1030, y, 740, 70, 16); ctx.fill();
        // o lugar só aparece depois de ordenado
        const aLugar = E.volta(fase(t, tRank + 1.2 + (lugar - 1) * 0.14, 0.45));
        ctx.save(); ctx.globalAlpha *= clamp(aLugar);
        ctx.fillStyle = lugar <= 3 ? COR.ambar : "rgba(148,163,200,.25)"; ctx.beginPath(); ctx.arc(1070, y + 35, 23 * clamp(aLugar, 0, 1.1), 0, 7); ctx.fill();
        texto(ctx, String(lugar), 1070, y + 37, { tam: 26, peso: 700, alinha: "center", base: "middle", cor: lugar <= 3 ? "rgba(6,10,22,.95)" : COR.texto });
        ctx.restore();
        texto(ctx, nome, 1112, y + 47, { tam: 32, peso: 550 });
        const wBarra = 330 * (pontos / 1000) * E.out5(fase(t, 1.0 + i * 0.12, 0.8));
        const gb = ctx.createLinearGradient(1290, 0, 1620, 0); gb.addColorStop(0, comAlfa(COR.fucsia, 0.6)); gb.addColorStop(1, COR.ambar);
        ctx.fillStyle = gb; caixa(ctx, 1290, y + 24, wBarra, 22, 11); ctx.fill();
        texto(ctx, String(pontos), 1746, y + 48, { tam: 36, peso: 650, alinha: "right" });
        ctx.restore();
      });
      ctx.restore();
      // por trás das duas listas
      const aA = visivel(t, qAlg, qT - 0.25, 0.4), sobe = (1 - E.out(fase(t, qAlg, 0.5))) * 24;
      texto(ctx, "Por trás, um algoritmo de ordenação.", W / 2, 930 + sobe, { tam: 58, peso: 650, alinha: "center", alfa: aA * aDia, espaco: -1 });
    }

    // ---- as barras: entram bagunçadas com o título e se ordenam em onda
    const aBarras = E.out(fase(t, qT - 0.7, 0.7));
    if (aBarras > 0.01) {
      const base = 1010, larguraUtil = W - 240, passo = larguraUtil / n, bw = passo - 6;
      for (let valor = 0; valor < n; valor++) {
        const f = valor / (n - 1);
        const k = E.io(fase(t, qT + 0.2 + f * 1.5, 1.1));
        const slot = lerp(this.slotDe[valor], valor, k);
        const tremor = (1 - k) * Math.sin(t * 2.2 + valor * 1.7) * 14;
        const salto = Math.sin(k * Math.PI) * 120;
        const baixa = E.io(fase(t, qTres - 0.2, 0.9));
        const h = (150 + f * 430) * lerp(1, 0.52, baixa) + tremor + k * Math.sin(t * 2.1 - valor * 0.2) * 16;
        const x = 120 + slot * passo + 3;
        ctx.save(); ctx.globalAlpha *= aBarras * lerp(0.5, 0.92, k) * lerp(1, 0.5, baixa);
        barra(ctx, x, base - salto * 0.25, bw, h, f, k > 0.98 ? "certa" : "normal", { brilho: k > 0.98 ? 18 : 0 });
        ctx.restore();
      }
      const veu = ctx.createLinearGradient(0, 0, 0, H);
      veu.addColorStop(0, "rgba(7,11,22,.92)"); veu.addColorStop(0.55, "rgba(7,11,22,.5)"); veu.addColorStop(1, "rgba(7,11,22,0)");
      ctx.save(); ctx.globalAlpha *= aBarras; ctx.fillStyle = veu; ctx.fillRect(0, 0, W, H); ctx.restore();
    }

    // ---- título
    const aT = visivel(t, qT, qTres - 0.15, 0.6), sobe = (1 - E.out(fase(t, qT, 0.7))) * 40;
    if (aT > 0.01) {
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
    }

    // ---- os três algoritmos
    const nomes = [["Bubble Sort", "troca vizinhos", COR.ciano], ["Insertion Sort", "encaixa um por vez", COR.fucsia], ["Merge Sort", "divide e intercala", COR.ambar]];
    const aC = visivel(t, qTres, Infinity, 0.5);
    if (aC > 0.01) {
      texto(ctx, "Três algoritmos", 120, 250, { tam: 72, peso: 650, espaco: -1.5, alfa: aC });
      nomes.forEach(([nome, sub, cor], i) => {
        const k = E.volta(fase(t, qTres + 0.35 + i * 0.75, 0.6)), a = clamp(k);
        const x = 120 + i * 572, y = 330 + (1 - a) * 60, w = 532, h = 320;
        ctx.save(); ctx.globalAlpha *= a * aC;
        ctx.shadowColor = comAlfa(cor, 0.35); ctx.shadowBlur = 60;
        ctx.fillStyle = "rgba(13,20,42,.97)"; caixa(ctx, x, y, w, h, 28); ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = comAlfa(cor, 0.85); ctx.lineWidth = 3; ctx.stroke();
        texto(ctx, String(i + 1), x + 40, y + 100, { tam: 84, peso: 700, cor });
        texto(ctx, nome, x + 40, y + 204, { tam: 58, peso: 650, espaco: -1 });
        texto(ctx, sub, x + 40, y + 262, { tam: 32, cor: COR.fraco });
        // miniatura animada: 9 barrinhas que se arrumam em laço
        for (let b = 0; b < 9; b++) {
          const ciclo = ((t - qTres) * 0.5 + i * 0.3) % 2, kk = E.io(clamp(ciclo < 1 ? ciclo : 2 - ciclo));
          const alvo = lerp([3, 7, 1, 5, 0, 8, 2, 6, 4][(b + i * 3) % 9], b, kk);
          barra(ctx, x + 316 + alvo * 21, y + 116, 14, 26 + b * 7.5, b / 8, "certa");
        }
        ctx.restore();
      });
      const aPerg = visivel(t, qP, Infinity, 0.5) * aC;
      if (aPerg > 0.01) {
        const s1 = "Um deles termina em ", s2 = "milésimos", s3 = " o que outro leva ", s4 = "segundos", s5 = " para fazer.", o = { tam: 50, peso: 600 };
        const larguras = [s1, s2, s3, s4, s5].map((s) => largura(ctx, s, o)), total = larguras.reduce((a, b) => a + b, 0);
        let x = (W - total) / 2; const y = 778 + (1 - E.out(fase(t, qP, 0.5))) * 20;
        ctx.save(); ctx.globalAlpha *= aPerg;
        ctx.fillStyle = "rgba(9,14,30,.9)"; caixa(ctx, x - 44, y - 62, total + 88, 96, 48); ctx.fill();
        ctx.strokeStyle = COR.borda; ctx.lineWidth = 2; ctx.stroke();
        [[s1, COR.texto], [s2, COR.ambar], [s3, COR.texto], [s4, COR.ciano], [s5, COR.texto]].forEach(([s, cor], i) => { texto(ctx, s, x, y, { ...o, cor, brilho: i === 1 || i === 3 ? 10 + 8 * Math.sin(t * 4 + i) : 0 }); x += larguras[i]; });
        ctx.restore();
      }
    }
  },
};

/** Capa do vídeo (miniatura do YouTube): título grande, os três nomes e as barras já ordenadas. */
function miniatura() {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.shadowColor = "transparent"; ctx.letterSpacing = "0px";
  fundo(ctx, 7);
  const n = 34, x0 = 1010, passo = (W - 100 - x0) / n;
  for (let i = 0; i < n; i++) barra(ctx, x0 + i * passo + 3, 1010, passo - 7, 150 + Math.pow(i / (n - 1), 1.25) * 640, i / (n - 1), "certa", { brilho: 26 });
  ctx.fillStyle = COR.ciano; caixa(ctx, 104, 170, 64, 9, 5); ctx.fill();
  texto(ctx, "ESTRUTURAS DE DADOS 2 · UNIPÊ", 190, 186, { tam: 36, peso: 650, cor: COR.ciano, espaco: 5 });
  texto(ctx, "Algoritmos", 92, 400, { tam: 204, peso: 700, espaco: -7 });
  const g = ctx.createLinearGradient(100, 0, 1300, 0);
  g.addColorStop(0, COR.ciano); g.addColorStop(0.5, COR.indigo); g.addColorStop(1, COR.fucsia);
  ctx.save(); ctx.font = `700 204px ${FONTE}`; ctx.letterSpacing = "-7px"; ctx.fillStyle = g; ctx.shadowColor = "rgba(7,11,22,.9)"; ctx.shadowBlur = 40; ctx.fillText("de Ordenação", 92, 600); ctx.restore();
  let x = 104;
  for (const [nome, cor] of [["Bubble", COR.ciano], ["Insertion", COR.fucsia], ["Merge", COR.ambar]]) {
    const w = largura(ctx, nome, { tam: 60, peso: 700 }) + 76;
    ctx.fillStyle = "rgba(9,14,30,.92)"; caixa(ctx, x, 690, w, 108, 54); ctx.fill();
    ctx.strokeStyle = cor; ctx.lineWidth = 5; ctx.stroke();
    texto(ctx, nome, x + w / 2, 746, { tam: 60, peso: 700, cor, alinha: "center", base: "middle" });
    x += w + 26;
  }
  texto(ctx, D.dupla, 104, 912, { tam: 46, peso: 550, cor: COR.texto });
}

// ------------------------------------------------------------------ POR QUE ORDENAR
// A mesma fileira de 24 casas, primeiro bagunçada (busca um por um), depois ordenada (busca pela metade).
CENAS.porque = {
  preparar(c) {
    const n = 24;
    this.n = n; this.alvo = 13; // o valor 14, que a busca pela metade só acha no quinto passo
    const bagunca = Array.from({ length: n }, (_, i) => i).sort((a, b) => ruido(a + 41) - ruido(b + 41));
    const onde = bagunca.indexOf(this.alvo); [bagunca[onde], bagunca[17]] = [bagunca[17], bagunca[onde]]; // o alvo fica longe do começo
    this.bagunca = bagunca; this.posAlvo = 17;
    this.passosBin = []; let lo = 0, hi = n - 1;
    while (lo <= hi) { const m = (lo + hi) >> 1; this.passosBin.push({ lo, hi, m }); if (m === this.alvo) break; if (m < this.alvo) lo = m + 1; else hi = m - 1; }
  },
  desenhar(ctx, t, c) {
    const n = this.n, qB = c.q("busca"), qBin = c.q("binaria"), qN = c.q("numeros"), qC = c.q("custo");
    cabecalho(ctx, t, "Por que ordenar", "Dado ordenado é dado fácil de achar");
    const passo = (W - 240) / n, lado = passo - 12, some = E.io(fase(t, qN - 0.2, 0.7));
    const fileira = (y, valores, estadoDe, rotulo, a, contado, cor) => {
      ctx.save(); ctx.globalAlpha *= a;
      texto(ctx, rotulo, 120, y - 30, { tam: 32, cor: COR.fraco });
      if (contado != null) {
        texto(ctx, contado === 1 ? "casa olhada" : "casas olhadas", W - 120, y - 30, { tam: 28, cor: COR.fraco, alinha: "right" });
        texto(ctx, String(contado), W - 120 - largura(ctx, contado === 1 ? "casa olhada" : "casas olhadas", { tam: 28 }) - 16, y - 26, { tam: 54, peso: 700, cor, alinha: "right" });
      }
      valores.forEach((valor, i) => {
        const e = estadoDe(i, valor), x = 120 + i * passo + 6;
        ctx.save(); ctx.globalAlpha *= e.alfa ?? 1;
        if (e.brilho) { ctx.shadowColor = corValor(valor / (n - 1), 1, 0.9); ctx.shadowBlur = 34; }
        ctx.fillStyle = corValor(valor / (n - 1), e.claro ? 1 : 0.5); caixa(ctx, x, y - (e.sobe || 0), lado, lado, 12); ctx.fill();
        if (e.brilho) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 3.5; ctx.stroke(); }
        ctx.restore();
        texto(ctx, String(valor + 1), x + lado / 2, y + lado / 2 + 2 - (e.sobe || 0), { tam: 27, peso: 700, alinha: "center", base: "middle", cor: "rgba(6,10,22,.92)", alfa: e.alfa ?? 1 });
      });
      ctx.restore();
    };
    // as duas fileiras sobem e encolhem quando os números grandes entram
    const yA = lerp(360, 300, some), yB = lerp(640, 470, some), aFileiras = visivel(t, 0.5, qC - 0.25, 0.5);
    // 1. lista bagunçada: varre um por um até achar
    const durVarre = Math.max(1.5, qBin - qB - 0.9), kVarre = fase(t, qB + 0.4, durVarre);
    const olhando = Math.min(this.posAlvo, Math.floor(kVarre * (this.posAlvo + 1)));
    fileira(yA, this.bagunca, (i, valor) => {
      if (t < qB + 0.4) return { claro: true, sobe: Math.sin(t * 3 - i * 0.4) * 3 };
      if (i === olhando) return { claro: true, brilho: true, sobe: 14 };
      if (i < olhando) return { alfa: 0.3 };
      return { claro: kVarre >= 1 ? valor === this.alvo : true };
    }, "lista bagunçada: procurar o 14", aFileiras, t < qB ? null : t < qB + 0.4 ? 0 : olhando + 1, COR.rosa);

    // 2. lista ordenada: metade por metade
    const aOrd = visivel(t, qBin - 0.2, qC - 0.25, 0.5);
    const durBin = Math.max(1.5, qN - qBin - 1.0), nb = this.passosBin.length;
    const kb = fase(t, qBin + 0.6, durBin), ib = Math.min(nb - 1, Math.floor(kb * nb)), pb = this.passosBin[ib];
    fileira(yB, Array.from({ length: n }, (_, i) => i), (i) => {
      if (t < qBin + 0.6) return { claro: true };
      if (i === pb.m) return { claro: true, brilho: true, sobe: 14 };
      if (i < pb.lo || i > pb.hi) return { alfa: 0.16 };
      return { claro: true };
    }, "lista ordenada: procurar o 14", aOrd, t < qBin + 0.6 ? 0 : ib + 1, COR.verde);

    // 3. com um milhão de itens: as duas buscas lado a lado, em barras
    const aN = visivel(t, qN, qC - 0.25, 0.5);
    if (aN > 0.01) {
      const k = E.out5(fase(t, qN + 0.3, 2.2)), yb = 660, cheio = 1180;
      ctx.save(); ctx.globalAlpha *= aN;
      texto(ctx, "COM 1.000.000 DE ITENS", 120, yb - 8, { tam: 26, peso: 600, cor: COR.fraco, espaco: 3 });
      texto(ctx, "um por um", 120, yb + 86, { tam: 34, cor: COR.texto });
      const g1 = ctx.createLinearGradient(380, 0, 380 + cheio, 0); g1.addColorStop(0, comAlfa(COR.rosa, 0.5)); g1.addColorStop(1, COR.rosa);
      ctx.fillStyle = g1; caixa(ctx, 380, yb + 46, Math.max(8, cheio * k), 58, 14); ctx.fill();
      brilhoVarre(ctx, t, 380, yb + 46, Math.max(8, cheio * k), 58, { periodo: 2.2, forca: 0.35, raio: 14 });
      texto(ctx, milhar(contando(1000000, fase(t, qN + 0.3, 2.2))), 380 + cheio + 24, yb + 92, { tam: 54, peso: 700, cor: COR.rosa });
      const a20 = E.volta(fase(t, qN + 1.5, 0.6));
      ctx.save(); ctx.globalAlpha *= clamp(a20);
      texto(ctx, "pela metade", 120, yb + 216, { tam: 34, cor: COR.texto });
      ctx.fillStyle = COR.verde; ctx.shadowColor = COR.verde; ctx.shadowBlur = 18 + 14 * Math.sin(t * 5); caixa(ctx, 380, yb + 176, 8, 58, 4); ctx.fill(); ctx.shadowBlur = 0;
      texto(ctx, "20", 414, yb + 224, { tam: 62 * clamp(a20, 0, 1.12), peso: 700, cor: COR.verde, brilho: 26 });
      texto(ctx, "passos", 500, yb + 222, { tam: 34, cor: COR.fraco });
      ctx.restore();
      texto(ctx, "passos", 380 + cheio + 24, yb + 130, { tam: 26, cor: COR.fraco });
      ctx.restore();
    }
    // 4. mas ordenar custa: a fileira se embaralha e se arruma em laço, atrás da frase
    const aC = visivel(t, qC, Infinity, 0.5);
    if (aC > 0.01) {
      ctx.save(); aproximar(ctx, fase(t, qC, c.dur - qC), 0.04);
      const ciclo = ((t - qC) * 0.42) % 2, kk = E.io(clamp(ciclo < 1 ? ciclo * 1.25 : (2 - ciclo) * 1.25));
      for (let valor = 0; valor < n; valor++) {
        const slot = lerp(this.bagunca.indexOf(valor), valor, kk), salto = Math.sin(kk * Math.PI) * 26 * (valor % 2 ? 1 : -1);
        ladrilho(ctx, 120 + slot * passo + 6, 720 + salto, lado, valor + 1, valor / (n - 1), "pronto", { alfa: aC * 0.9 });
      }
      texto(ctx, "Ordenar tem um custo.", W / 2, 470, { tam: 112, peso: 650, alinha: "center", alfa: aC, espaco: -2 });
      texto(ctx, "E ele depende do algoritmo.", W / 2, 580, { tam: 62, peso: 500, alinha: "center", cor: COR.fraco, alfa: visivel(t, qC + 1.1, Infinity, 0.5) });
      ctx.restore();
    }
  },
};
