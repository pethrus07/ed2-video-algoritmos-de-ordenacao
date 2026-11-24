"use strict";

// ------------------------------------------------------------------ O PROGRAMA RODANDO
// A saída é a do programa de verdade, capturada linha por linha pela etapa "dados". Aqui ela é só reexibida.
CENAS.terminal = {
  preparar(c, D) {
    const [demo, testes] = D.terminal, linhas = [], blocos = [];
    const abre = (marca) => blocos.push({ marca, de: linhas.length });
    abre("cmd"); linhas.push({ texto: "PS> " + demo.comando, comando: true });
    let cena = 0;
    for (const l of demo.linhas) {
      const m = /^CENA (\d)/.exec(l.texto);
      if (m) {
        // o título de cada cena tem três linhas: a régua de cima já entrou, então o bloco começa nela
        const inicio = linhas.length - 1;
        cena = +m[1]; blocos.push({ marca: "c" + cena, de: Math.max(inicio, blocos[blocos.length - 1].de + 1) });
      }
      linhas.push({ texto: l.texto, titulo: /^CENA \d|^=+$/.test(l.texto) });
    }
    abre("testes"); linhas.push({ texto: "" }); linhas.push({ texto: "PS> " + testes.comando, comando: true });
    for (const l of testes.linhas) linhas.push({ texto: l.texto, bom: /0 falhas/.test(l.texto) });
    blocos.forEach((b, i) => { b.ate = i + 1 < blocos.length ? blocos[i + 1].de : linhas.length; b.t0 = c.q(b.marca) + 0.25; });
    blocos.forEach((b, i) => { b.t1 = i + 1 < blocos.length ? blocos[i + 1].t0 - 0.3 : Math.min(c.dur - 2.2, b.t0 + 2.4); });
    // peso de cada linha = quantas letras tem: linha longa demora mais, linha vazia passa rápido
    blocos.forEach((b) => { b.acumulado = [0]; for (let i = b.de; i < b.ate; i++) b.acumulado.push(b.acumulado[b.acumulado.length - 1] + 5 + linhas[i].texto.length); });
    this.linhas = linhas; this.blocos = blocos;
    this.rotulos = { cmd: "", c1: "Cena 1 · passo a passo", c2: "Cena 2 · casos de borda", c3: "Cena 3 · melhor e pior caso", c4: "Cena 4 · em escala", testes: "Testes automáticos" };
  },
  /** Quantas linhas já apareceram no instante t (pode ser fracionário: a última está "sendo escrita"). */
  visiveis(t) {
    let n = 0;
    for (const b of this.blocos) {
      if (t < b.t0) break;
      const alvo = clamp((t - b.t0) / (b.t1 - b.t0)) * b.acumulado[b.acumulado.length - 1];
      let i = 0; while (i < b.ate - b.de - 1 && b.acumulado[i + 1] <= alvo) i++;
      n = b.de + i + clamp((alvo - b.acumulado[i]) / (b.acumulado[i + 1] - b.acumulado[i]));
    }
    return n;
  },
  desenhar(ctx, t, c) {
    cabecalho(ctx, t, "Na prática", "O programa rodando", COR.verde);
    const x = 120, y = 232, w = W - 240, h = 736, tam = 25, passo = tam * 1.44, cabem = Math.floor((h - 58 - 40) / passo);
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 60; ctx.shadowOffsetY = 20;
    ctx.fillStyle = "#060a16"; caixa(ctx, x, y, w, h, 22); ctx.fill();
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.strokeStyle = COR.borda; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#0e1630"; ctx.beginPath(); ctx.roundRect(x, y, w, 58, [22, 22, 0, 0]); ctx.fill();
    ["#fb7185", "#fbbf24", "#34d399"].forEach((cor, i) => { ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(x + 34 + i * 26, y + 29, 7.5, 0, 7); ctx.fill(); });
    texto(ctx, "PowerShell · ed2-video-algoritmos-de-ordenacao", x + w / 2, y + 30, { tam: 22, cor: COR.fraco, alinha: "center", base: "middle", mono: true });

    const n = this.visiveis(t), inteiras = Math.floor(n), rola = Math.max(0, n - cabem);
    ctx.beginPath(); ctx.rect(x, y + 60, w, h - 62); ctx.clip();
    for (let i = Math.max(0, Math.floor(rola) - 1); i < Math.min(this.linhas.length, inteiras + 1); i++) {
      const l = this.linhas[i], yl = y + 58 + 36 + (i - rola) * passo;
      let s = l.texto;
      if (i === inteiras) s = s.slice(0, Math.floor(s.length * (n - inteiras))); // a linha que está sendo escrita
      const cor = l.comando ? COR.ciano : l.titulo ? COR.ambar : l.bom ? COR.verde : "#d5def7";
      texto(ctx, s, x + 40, yl, { tam, mono: true, cor, peso: l.comando || l.bom ? 600 : 450, brilho: l.bom ? 14 + 12 * Math.sin(t * 5) : 0 });
    }
    const some = ctx.createLinearGradient(0, y + 58, 0, y + 58 + 56);
    some.addColorStop(0, "#060a16"); some.addColorStop(1, "rgba(6,10,22,0)");
    ctx.fillStyle = some; ctx.fillRect(x + 2, y + 58, w - 4, 56);
    // cursor
    if (Math.floor(t * 2) % 2 === 0) {
      const i = Math.min(inteiras, this.linhas.length - 1), l = this.linhas[i], escrito = i === inteiras ? Math.floor(l.texto.length * (n - inteiras)) : l.texto.length;
      ctx.fillStyle = COR.texto; ctx.fillRect(x + 40 + escrito * tam * 0.602 + 4, y + 58 + 36 + (i - rola) * passo - tam * 0.8, 12, tam);
    }
    ctx.restore();
    // etiqueta do trecho que está na tela
    let atual = "";
    for (const b of this.blocos) if (t >= b.t0) atual = this.rotulos[b.marca];
    if (atual) {
      const lw = largura(ctx, atual, { tam: 28, peso: 600 }) + 56;
      ctx.fillStyle = "rgba(10,16,34,.94)"; caixa(ctx, x + w - lw - 28, y + 84, lw, 56, 28); ctx.fill();
      ctx.strokeStyle = COR.verde; ctx.lineWidth = 2.5; ctx.stroke();
      texto(ctx, atual, x + w - lw / 2 - 28, y + 113, { tam: 28, peso: 600, alinha: "center", base: "middle", cor: COR.verde });
    }
    texto(ctx, "saída gravada da execução real de .\\executar.ps1, sem edição", x, y + h + 44, { tam: 24, cor: COR.apagado });
  },
};

// ------------------------------------------------------------------ COMPARAÇÃO
CENAS.resumo = {
  desenhar(ctx, t, c) {
    cabecalho(ctx, t, "Comparação", "Qual usar?", COR.indigo);
    const qT = c.q("tabela"), qMe = c.q("melhor"), qM = c.q("merge"), qE = c.q("estavel"), qR = c.q("real");
    const colunas = [["algoritmo", 120, 330], ["melhor caso", 470, 250], ["caso médio", 740, 250], ["pior caso", 1010, 250], ["memória extra", 1280, 280], ["estável", 1590, 210]];
    const linhas = [
      { nome: "Bubble Sort", cor: COR.ciano, celulas: ["O(n)", "O(n²)", "O(n²)", "O(1)", "sim"], t0: qT + 0.2 },
      { nome: "Insertion Sort", cor: COR.fucsia, celulas: ["O(n)", "O(n²)", "O(n²)", "O(1)", "sim"], t0: qT + 0.9 },
      { nome: "Merge Sort", cor: COR.ambar, celulas: ["O(n log n)", "O(n log n)", "O(n log n)", "O(n)", "sim"], t0: qM },
    ];
    const y0 = 300, alto = 112, aTab = visivel(t, qT - 0.2, qR - 0.3, 0.5), recuo = E.io(fase(t, qR - 0.3, 0.6));
    ctx.save(); ctx.translate(0, -recuo * 20); ctx.globalAlpha *= lerp(1, 0.14, recuo) * E.out(fase(t, qT - 0.2, 0.5));
    colunas.forEach(([nome, x]) => texto(ctx, nome.toUpperCase(), x, y0 - 22, { tam: 21, peso: 600, cor: COR.fraco, espaco: 2.5 }));
    ctx.fillStyle = COR.borda; ctx.fillRect(120, y0, W - 240, 2);
    // realce da coluna em destaque
    const realce = (col, cor, t0, t1) => {
      const a = visivel(t, t0, t1, 0.35);
      if (a <= 0.01) return;
      const [, x, w] = colunas[col];
      ctx.fillStyle = comAlfa(cor, 0.1 * a); caixa(ctx, x - 22, y0 - 62, w, alto * 3 + 84, 18); ctx.fill();
      ctx.strokeStyle = comAlfa(cor, 0.75 * a); ctx.lineWidth = 2.5; ctx.stroke();
    };
    realce(1, COR.verde, qMe, qM - 0.1);
    realce(4, COR.rosa, qM + 1.6, qE - 0.1);
    realce(5, COR.verde, qE, qR - 0.4);
    linhas.forEach((l, i) => {
      const a = E.out(fase(t, l.t0, 0.5)), y = y0 + i * alto + (1 - a) * 24;
      if (a <= 0.01) return;
      ctx.save(); ctx.globalAlpha *= a;
      ctx.fillStyle = l.cor; caixa(ctx, 120, y + 36, 8, 44, 4); ctx.fill();
      texto(ctx, l.nome, 148, y + 72, { tam: 38, peso: 650 });
      l.celulas.forEach((s, j) => {
        const ruim = s === "O(n²)", bom = s === "O(n)" && j === 0, cor = j === 4 ? COR.verde : ruim ? COR.rosa : bom ? COR.verde : j === 3 && s === "O(n)" ? COR.rosa : COR.texto;
        const aparece = j === 0 && i < 2 ? E.out(fase(t, qMe + i * 0.3, 0.4)) : j === 4 ? E.out(fase(t, qE + i * 0.25, 0.4)) : 1;
        texto(ctx, s, colunas[j + 1][1], y + 72, { tam: 36, mono: j < 4, peso: 600, cor, alfa: aparece });
      });
      ctx.fillStyle = COR.linha; ctx.fillRect(120, y + alto, W - 240, 2);
      ctx.restore();
    });
    ctx.restore();
    // estabilidade: dois setes continuam na ordem em que chegaram
    const aE = visivel(t, qE + 0.6, qR - 0.4, 0.4);
    if (aE > 0.01) {
      ctx.save(); ctx.globalAlpha *= aE;
      const k = E.io(fase(t, qE + 1.3, 1.1)), lado = 82, base = 730;
      const itens = [{ v: 7, r: "A", de: 0, para: 1, f: 0.85 }, { v: 2, r: "", de: 1, para: 0, f: 0.15 }, { v: 7, r: "B", de: 2, para: 2, f: 0.85 }];
      texto(ctx, "valores iguais mantêm a ordem de chegada", 560, base + 54, { tam: 34, cor: COR.fraco });
      itens.forEach((it) => {
        const x = 130 + lerp(it.de, it.para, k) * (lado + 14), sobe = it.de !== it.para ? Math.sin(k * Math.PI) * (it.v === 7 ? 46 : 0) : 0;
        ladrilho(ctx, x, base - sobe, lado, it.v, it.f, "pronto");
        if (it.r) texto(ctx, it.r, x + lado - 8, base - sobe - 10, { tam: 28, peso: 700, cor: COR.verde, alinha: "right" });
      });
      ctx.restore();
    }
    // no mundo real: TimSort
    const aR = visivel(t, qR, Infinity, 0.5);
    if (aR > 0.01) {
      ctx.save(); ctx.globalAlpha *= aR;
      ctx.fillStyle = "rgba(9,14,30,.985)"; caixa(ctx, 200, 370, W - 400, 500, 30); ctx.fill();
      ctx.strokeStyle = COR.indigo; ctx.lineWidth = 2.5; ctx.stroke();
      texto(ctx, "NO JAVA DE VERDADE", 270, 450, { tam: 24, peso: 600, cor: COR.indigo, espaco: 3 });
      texto(ctx, "Arrays.sort de objetos usa o TimSort", 270, 530, { tam: 62, peso: 650, espaco: -1 });
      const pecas = [["Merge Sort", "nos trechos grandes", COR.ambar, 270], ["+", "", COR.fraco, 800], ["Insertion Sort", "nos trechos pequenos", COR.fucsia, 900]];
      pecas.forEach(([nome, sub, cor, x], i) => {
        const a = E.volta(fase(t, qR + 2.4 + i * 0.5, 0.5));
        ctx.save(); ctx.globalAlpha *= clamp(a);
        if (nome === "+") { texto(ctx, "+", x, 720, { tam: 80, peso: 600, cor }); ctx.restore(); return; }
        const w = 480;
        ctx.fillStyle = comAlfa(cor, 0.14); caixa(ctx, x, 620, w, 170, 24); ctx.fill();
        ctx.strokeStyle = cor; ctx.lineWidth = 3; ctx.stroke();
        texto(ctx, nome, x + 36, 700, { tam: 48, peso: 650, cor });
        texto(ctx, sub, x + 36, 750, { tam: 28, cor: COR.fraco });
        for (let b = 0; b < 8; b++) {
          const ciclo = ((t - qR) * 0.55 + i * 0.4) % 2, kk = E.io(clamp(ciclo < 1 ? ciclo : 2 - ciclo));
          barra(ctx, x + 350 + lerp([5, 2, 7, 0, 3, 6, 1, 4][b], b, kk) * 14, 690, 10, 16 + b * 5, b / 7, "certa");
        }
        ctx.restore();
      });
      ctx.restore();
    }
  },
};

// ------------------------------------------------------------------ FECHO
CENAS.fecho = {
  desenhar(ctx, t, c) {
    const qU = c.q("um"), qD = c.q("dois"), qR = c.q("repo"), qO = c.q("obrigado");
    // as barras da abertura, agora arrumadas, respirando no fundo
    const n = 72, passo = (W - 240) / n;
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1), h = 110 + f * 330 + Math.sin(t * 1.6 - i * 0.22) * 16;
      ctx.save(); ctx.globalAlpha *= 0.5 + 0.35 * E.io(fase(t, qO, 0.8));
      barra(ctx, 120 + i * passo + 3, 1010, passo - 6, h, f, "certa");
      ctx.restore();
    }
    const veu = ctx.createLinearGradient(0, 0, 0, H);
    veu.addColorStop(0, "rgba(7,11,22,.94)"); veu.addColorStop(0.6, "rgba(7,11,22,.6)"); veu.addColorStop(1, "rgba(7,11,22,0)");
    ctx.fillStyle = veu; ctx.fillRect(0, 0, W, H);

    const aIdeias = visivel(t, 0.3, qR - 0.2, 0.5);
    texto(ctx, "PARA LEVAR", 120, 200, { tam: 26, peso: 600, cor: COR.ciano, espaco: 5, alfa: aIdeias });
    const a1 = visivel(t, qU, qR - 0.2, 0.5), a2 = visivel(t, qD, qR - 0.2, 0.5);
    texto(ctx, "1", 120, 350 + (1 - a1) * 20, { tam: 90, peso: 700, cor: COR.ciano, alfa: a1 });
    texto(ctx, "Quando os dados crescem, a estratégia", 230, 320 + (1 - a1) * 20, { tam: 62, peso: 650, alfa: a1, espaco: -1 });
    texto(ctx, "importa mais que a máquina.", 230, 396 + (1 - a1) * 20, { tam: 62, peso: 650, alfa: a1, espaco: -1 });
    texto(ctx, "2", 120, 570 + (1 - a2) * 20, { tam: 90, peso: 700, cor: COR.ambar, alfa: a2 });
    texto(ctx, "Dividir para conquistar transforma", 230, 540 + (1 - a2) * 20, { tam: 62, peso: 650, alfa: a2, espaco: -1 });
    texto(ctx, "n² em n log n.", 230, 616 + (1 - a2) * 20, { tam: 62, peso: 650, alfa: a2, espaco: -1, cor: COR.ambar });

    const aR = visivel(t, qR, Infinity, 0.5);
    if (aR > 0.01) {
      texto(ctx, "CÓDIGO, TESTES E ANIMAÇÃO", 120, 260, { tam: 26, peso: 600, cor: COR.ciano, espaco: 5, alfa: aR });
      texto(ctx, D.repositorio, 120, 360, { tam: Math.min(58, (W - 240) / (D.repositorio.length * 0.602)), peso: 600, mono: true, alfa: aR, cor: COR.texto });
      texto(ctx, "link na descrição", 120, 420, { tam: 32, cor: COR.fraco, alfa: aR });
      const aO = visivel(t, qO, Infinity, 0.5);
      texto(ctx, "Obrigado!", 120, 610 + (1 - aO) * 24, { tam: 130, peso: 700, alfa: aO, espaco: -4 });
      texto(ctx, D.dupla + " · Estruturas de Dados 2 · Unipê · Prof. Ed", 120, 690, { tam: 32, cor: COR.fraco, alfa: aO });
    }
  },
};
