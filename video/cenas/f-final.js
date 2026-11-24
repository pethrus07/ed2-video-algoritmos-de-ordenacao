"use strict";

// ------------------------------------------------------------------ O PROGRAMA RODANDO
// A imagem é a gravação de tela do Windows Terminal (etapa "gravar"): compilação, demonstração e testes
// rodando de verdade. A cena só escolhe qual instante da gravação mostrar e desenha, por cima, um guia de
// leitura. Cada trecho da gravação toca na velocidade real; entre um e outro a tela espera parada.
CENAS.terminal = {
  preparar(c, D) {
    const g = D.gravacao;
    this.g = g; this.trechos = c.gravacao.trechos; this.imagens = new Map(); this.atual = null;
    const esc = Math.min(1540 / g.largura, 800 / (g.altura - 3)), w = g.largura * esc, h = (g.altura - 3) * esc;
    this.palco = { x: (W - w) / 2, y: 218, w, h };
    const em = (nome, f = () => true) => g.eventos.find((e) => e.nome === nome && f(e));
    const pausa = (n) => em("pausa", (e) => e.n === n);
    const medida = (nome, algoritmo) => em(nome, (e) => e.algoritmo === algoritmo && e.n === 100000);
    this.mede = medida("mede", "bubble"); this.mediu = medida("mediu", "bubble");
    this.mediuInsertion = medida("mediu", "insertion"); this.mediuMerge = medida("mediu", "merge");
    const ultimo = g.eventos.filter((e) => e.nome === "terminou").pop();
    const faixaDe = (n, a, b) => Array.from({ length: b - a + 1 }, (_, k) => pausa(n).linha + a + k);
    const B = this.mede.linha; // a linha do Bubble Sort com 100.000 valores
    // por onde o olhar passa em cada trecho: linhas da sessão, na ordem em que a fala as percorre
    this.guia = {
      roda: faixaDe(1, -8, -2), ins: faixaDe(2, -10, -2), mer: faixaDe(3, -10, -2), c2: faixaDe(4, -8, -2),
      c3: [pausa(5).linha - 6, pausa(5).linha - 5, pausa(5).linha - 6, pausa(5).linha - 5, pausa(5).linha - 2],
      c4: [B - 8, B - 7, B - 6, B - 4, B - 3, B - 2, B],
      testes: [ultimo.linha - 1],
    };
    // quando a saída de cada trecho já está na tela (no tempo da cena)
    this.naTela = { roda: this.naCena(pausa(1).t), ins: this.naCena(pausa(2).t), mer: this.naCena(pausa(3).t), c2: this.naCena(pausa(4).t), c3: this.naCena(pausa(5).t), c4: c.q("c4") + 0.5, testes: this.naCena(ultimo.t) };
    this.ordem = ["compila", "roda", "ins", "mer", "c2", "c3", "c4", "pronto", "testes"];
    this.rotulos = { compila: "Compilação · javac", roda: "Cena 1 · Bubble Sort", ins: "Cena 1 · Insertion Sort", mer: "Cena 1 · Merge Sort", c2: "Cena 2 · casos de borda", c3: "Cena 3 · melhor e pior caso", c4: "Cena 4 · em escala", pronto: "Cena 4 · em escala", testes: "Testes automáticos" };
    this.cores = { roda: COR.ciano, ins: COR.fucsia, mer: COR.ambar, c2: COR.ciano, c3: COR.verde, c4: COR.ciano, testes: COR.verde };
    // a câmera se aproxima das linhas em que um comando é digitado: no topo (javac e java) e no pé (testes)
    const entrou = (fim) => this.naCena(em("enter", (e) => e.comando.endsWith(fim)).t);
    this.aproximacoes = [
      { t0: c.q("compila") - 0.5, t1: entrou("Demonstracao") + 0.1, z: 1.42, pe: 0 },
      { t0: c.q("testes") - 0.4, t1: c.dur + 5, z: 1.2, pe: 1 }, // 1,2: a linha mais larga da tabela ainda cabe inteira
    ];
    // durante a espera do Bubble Sort a janela encolhe para a esquerda e um painel mostra o que está acontecendo
    this.ladoDe = this.naCena(this.mede.t) + 2.2; this.ladoAte = this.naCena(this.mediu.t) + 2.8;
    this.mini = corridaBubble(Array.from({ length: 18 }, (_, i) => i + 1).sort((a, b) => ruido(a + 7) - ruido(b + 7)));
    this.comparacoes = this.mediu.comparacoes;
  },
  /** Instante da gravação que está na tela no tempo t da cena. */
  naGravacao(t) {
    let r = this.trechos[0].r0;
    for (const s of this.trechos) { if (t < s.t0) break; r = Math.min(s.r1, s.r0 + (t - s.t0)); }
    return r;
  },
  /** Tempo da cena em que o instante r da gravação aparece. */
  naCena(r) {
    const s = [...this.trechos].reverse().find((x) => r >= x.r0 - 1e-6 && r <= x.r1 + 1e-6);
    return s ? s.t0 + (r - s.r0) : Infinity;
  },
  quadroDe(r) {
    const q = this.g.quadros; let a = 0, b = q.length - 1;
    while (a < b) { const m = (a + b + 1) >> 1; if (q[m].t <= r + 1e-6) a = m; else b = m - 1; }
    return q[a];
  },
  /** A linha da sessão que está no topo da janela no instante r da gravação. */
  topoDaTela(r) {
    let escritas = 0;
    for (const e of this.g.eventos) { if (e.t > r) break; escritas = e.linha; }
    return Math.max(0, escritas - (this.g.linhas - 1));
  },
  async carregar(t) {
    const q = this.quadroDe(this.naGravacao(t));
    if (!this.imagens.has(q.arq)) {
      const img = new Image(); img.src = `${this.g.pasta}/${q.arq}`; await img.decode();
      this.imagens.set(q.arq, img);
      if (this.imagens.size > 8) this.imagens.delete(this.imagens.keys().next().value);
    }
    this.atual = this.imagens.get(q.arq);
  },
  /** Câmera: onde a janela fica na tela (x, y, w, h) e que pedaço da gravação aparece nela (sx, sy, sw, sh). */
  camera(t) {
    const g = this.g, P = this.palco, lado = E.io(fase(t, this.ladoDe, 0.9)) * (1 - E.io(fase(t, this.ladoAte, 0.9)));
    const w = lerp(P.w, P.w * 0.8, lado), h = lerp(P.h, P.h * 0.8, lado), x = lerp(P.x, 96, lado), y = P.y + (P.h - h) / 2;
    let z = 1, pe = 0;
    for (const a of this.aproximacoes) { const k = E.io(fase(t, a.t0, 0.8)) * (1 - E.io(fase(t, a.t1, 0.8))); if (k > 0.001) { z = 1 + (a.z - 1) * k; pe = a.pe; } }
    const sw = g.largura / z, sh = (g.altura - 3) / z;
    return { x, y, w, h, sx: 0, sy: 3 + pe * (g.altura - 3 - sh), sw, sh, lado };
  },
  /** Faixa de leitura sobre uma linha da sessão (pode ser fracionária, enquanto desliza de uma para outra). */
  faixa(ctx, cam, linha, r, cor, alfa) {
    const fila = linha - this.topoDaTela(r);
    if (alfa <= 0.01 || fila < -0.4 || fila > this.g.linhas - 0.6) return;
    const cel = this.g.celula, ey = cam.h / cam.sh, fy = cam.y + (cel.y + fila * cel.h - cam.sy) * ey, fh = cel.h * ey;
    if (fy < cam.y + 4 || fy + fh > cam.y + cam.h + 2) return;
    ctx.fillStyle = comAlfa(cor, 0.17 * alfa); caixa(ctx, cam.x + 6, fy - 1, cam.w - 30, fh + 2, 8); ctx.fill();
    ctx.fillStyle = comAlfa(cor, 0.95 * alfa); caixa(ctx, cam.x + 6, fy - 1, 5, fh + 2, 2.5); ctx.fill();
  },
  desenhar(ctx, t, c) {
    cabecalho(ctx, t, "Na prática", "O programa rodando", COR.verde);
    const g = this.g, r = this.naGravacao(t), cam = this.camera(t), { x, y, w, h } = cam;
    const entra = E.out5(fase(t, 1.15, 0.8));
    ctx.save();
    ctx.globalAlpha *= entra; ctx.translate(0, (1 - entra) * 46);
    // a janela gravada, com sombra e os cantos arredondados (a captura traz 2 px da janela de trás nas quinas)
    ctx.shadowColor = "rgba(0,0,0,.65)"; ctx.shadowBlur = 70; ctx.shadowOffsetY = 24;
    ctx.fillStyle = "#0c0c0c"; caixa(ctx, x, y, w, h, 12); ctx.fill();
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    if (this.atual) {
      ctx.save(); caixa(ctx, x, y, w, h, 12); ctx.clip();
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(this.atual, cam.sx, cam.sy, cam.sw, cam.sh, x, y, w, h);
      ctx.restore();
    }
    ctx.strokeStyle = "rgba(148,163,200,.38)"; ctx.lineWidth = 2; caixa(ctx, x, y, w, h, 12); ctx.stroke();

    // em que trecho a fala está
    let atual = null, iAtual = -1;
    this.ordem.forEach((nome, i) => { if (t >= c.q(nome)) { atual = nome; iAtual = i; } });
    const proximo = iAtual + 1 < this.ordem.length ? c.q(this.ordem[iAtual + 1]) : c.dur - 0.5;

    // guia de leitura: a faixa desce pelas linhas de que a fala está tratando
    const guia = atual && this.guia[atual];
    if (guia && atual !== "c4") {
      const ini = Math.max(c.q(atual) + 0.7, this.naTela[atual] + 0.35), fim = Math.max(ini + 1, proximo - 0.5);
      const k = fase(t, ini, fim - ini) * (guia.length - 1), i = Math.min(guia.length - 1, Math.floor(k)), j = Math.min(guia.length - 1, i + 1);
      const ultima = i === guia.length - 1 || (atual !== "c3" && j === guia.length - 1 && k - i > 0.5);
      this.faixa(ctx, cam, lerp(guia[i], guia[j], E.io(clamp((k - i) * 1.6 - 0.3))), r, ultima && atual !== "c2" ? COR.verde : this.cores[atual], visivel(t, ini, proximo - 0.15, 0.3) * (0.82 + 0.18 * Math.sin(t * 5)));
    }
    // cena 4: primeiro as linhas que saem na hora, depois a espera do Bubble Sort
    const tMede = this.naCena(this.mede.t), tMediu = this.naCena(this.mediu.t), esperando = r >= this.mede.t && r < this.mediu.t;
    if (atual === "c4" || atual === "pronto") {
      const B = this.mede.linha, rapidas = this.guia.c4.slice(0, 6);
      if (t < tMede + 2.4) {
        const ini = this.naTela.c4 + 0.3, k = fase(t, ini, 2.6) * (rapidas.length - 1), i = Math.floor(k), j = Math.min(rapidas.length - 1, i + 1);
        this.faixa(ctx, cam, lerp(rapidas[i], rapidas[j], E.io(clamp((k - i) * 1.6 - 0.3))), r, COR.ciano, visivel(t, ini, tMede + 2.4, 0.3));
      }
      this.faixa(ctx, cam, B, r, esperando ? COR.ambar : COR.verde, visivel(t, tMede + 2.2, tMediu + 3.2, 0.35) * (esperando ? 0.7 + 0.3 * Math.sin(t * 6) : 1));
      if (t >= tMediu) {
        const tI = this.naCena(this.mediuInsertion.t), tM = this.naCena(this.mediuMerge.t);
        this.faixa(ctx, cam, B + 1, r, COR.fucsia, visivel(t, tI, c.q("testes") - 0.2, 0.3));
        this.faixa(ctx, cam, B + 2, r, COR.ambar, visivel(t, tM + 0.25, c.q("testes") - 0.2, 0.3) * (0.8 + 0.2 * Math.sin(t * 5)));
      }
    }
    ctx.restore();

    // o painel da espera: o que o Bubble Sort está fazendo enquanto a linha dele não sai
    if (cam.lado > 0.01) {
      const px = 96 + this.palco.w * 0.8 + 34, pw = W - 96 - px, py = this.palco.y + 6, ph = this.palco.h - 12, a = cam.lado;
      const decorrido = clamp(r - this.mede.t, 0, this.mediu.t - this.mede.t), parte = decorrido / (this.mediu.t - this.mede.t), cor = esperando ? COR.ambar : COR.verde;
      ctx.save(); ctx.globalAlpha *= a; ctx.translate((1 - a) * 70, 0);
      ctx.fillStyle = "rgba(13,20,42,.94)"; caixa(ctx, px, py, pw, ph, 26); ctx.fill();
      ctx.strokeStyle = comAlfa(cor, 0.85); ctx.lineWidth = 2.5; ctx.stroke();
      texto(ctx, "DENTRO DO BUBBLE SORT", px + 34, py + 62, { tam: 23, peso: 600, cor, espaco: 3 });
      // 18 barras sendo ordenadas em laço: é isto, repetido quase cinco bilhões de vezes
      const q = this.mini.quadros[Math.floor(Math.max(0, t - this.ladoDe) * 26) % this.mini.quadros.length], nb = q.v.length, bw = (pw - 68) / nb;
      for (let s = 0; s < nb; s++) barra(ctx, px + 34 + s * bw + 2, py + 300, bw - 4, 26 + (q.v[s] / nb) * 170, q.v[s] / nb, esperando && q.ativos.includes(s) ? "ativa" : "certa", { brilho: 14 });
      texto(ctx, "comparar vizinhos e trocar", px + 34, py + 344, { tam: 25, cor: COR.fraco });
      texto(ctx, "comparações feitas", px + 34, py + 428, { tam: 25, cor: COR.fraco });
      texto(ctx, milhar(Math.round(this.comparacoes * parte)), px + 34, py + 492, { tam: Math.min(58, (pw - 68) / (13 * 0.56)), peso: 700, cor: COR.texto });
      texto(ctx, esperando ? "estimativa pelo tempo decorrido" : "contagem final do programa", px + 34, py + 528, { tam: 21, cor: COR.apagado });
      ctx.fillStyle = "rgba(148,163,200,.16)"; caixa(ctx, px + 34, py + 556, pw - 68, 14, 7); ctx.fill();
      ctx.fillStyle = cor; caixa(ctx, px + 34, py + 556, Math.max(14, (pw - 68) * parte), 14, 7); ctx.fill();
      // o relógio corre com o tempo da própria gravação: é a espera real
      texto(ctx, decimal(decorrido, 1) + " s", px + 34, py + ph - 76, { tam: 96, peso: 700, mono: true, cor, brilho: esperando ? 14 + 10 * Math.sin(t * 6) : 22, espaco: -3 });
      texto(ctx, esperando ? "tempo real, sem corte" : "terminou", px + 36, py + ph - 34, { tam: 25, cor: COR.fraco });
      ctx.restore();
    }

    // etiqueta do trecho, acima da janela
    if (atual) {
      const s = this.rotulos[atual], a = E.out(fase(t, c.q(atual), 0.4)), lw = largura(ctx, s, { tam: 28, peso: 600 }) + 60, ex = this.palco.x + this.palco.w, ey = this.palco.y;
      ctx.save(); ctx.globalAlpha *= entra;
      ctx.fillStyle = "rgba(10,16,34,.94)"; caixa(ctx, ex - lw, ey - 68 + (1 - a) * 8, lw, 54, 27); ctx.fill();
      ctx.strokeStyle = COR.verde; ctx.lineWidth = 2.5; ctx.stroke();
      texto(ctx, s, ex - lw / 2, ey - 40 + (1 - a) * 8, { tam: 28, peso: 600, alinha: "center", base: "middle", cor: COR.verde, alfa: 0.35 + 0.65 * a });
      ctx.restore();
    }
    texto(ctx, "Gravação de tela do Windows Terminal · execução real, na velocidade real · só as esperas entre os comandos acompanham a narração", W / 2, this.palco.y + this.palco.h + 36, { tam: 21, cor: COR.apagado, alinha: "center", alfa: entra });
    vinheta(ctx, t, ">_", "Na prática", COR.verde);
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
    const y0 = 330, alto = 128, recuo = E.io(fase(t, qR - 0.3, 0.6));
    ctx.save(); ctx.translate(0, -recuo * 20); ctx.globalAlpha *= lerp(1, 0.14, recuo) * E.out(fase(t, qT - 0.2, 0.5));
    colunas.forEach(([nome, x]) => texto(ctx, nome.toUpperCase(), x, y0 - 24, { tam: 22, peso: 600, cor: COR.fraco, espaco: 2.5 }));
    ctx.fillStyle = COR.borda; ctx.fillRect(120, y0, W - 240, 2);
    // realce da coluna de que a fala está tratando, com uma luz que desce por ela
    const realce = (col, cor, t0, t1, n = 1) => {
      const a = visivel(t, t0, t1, 0.35);
      if (a <= 0.01) return;
      const x = colunas[col][1] - 22, w = colunas[col + n - 1][1] + colunas[col + n - 1][2] - colunas[col][1], yb = y0 - 64, hb = alto * 3 + 88;
      ctx.fillStyle = comAlfa(cor, 0.1 * a); caixa(ctx, x, yb, w, hb, 18); ctx.fill();
      ctx.strokeStyle = comAlfa(cor, 0.8 * a); ctx.lineWidth = 2.5; ctx.stroke();
      ctx.save(); caixa(ctx, x, yb, w, hb, 18); ctx.clip();
      const ly = yb - 160 + ((t - t0) * 300) % (hb + 320), lg = ctx.createLinearGradient(0, ly, 0, ly + 160);
      lg.addColorStop(0, comAlfa(cor, 0)); lg.addColorStop(0.5, comAlfa(cor, 0.32 * a)); lg.addColorStop(1, comAlfa(cor, 0));
      ctx.fillStyle = lg; ctx.fillRect(x, ly, w, 160); ctx.restore();
    };
    realce(2, COR.rosa, qT + 1.6, qMe - 0.1, 2);
    realce(1, COR.verde, qMe, qM - 0.1);
    realce(1, COR.ambar, qM + 0.3, qM + 3.0, 3);
    realce(4, COR.rosa, qM + 3.1, qE - 0.1);
    realce(5, COR.verde, qE, qR - 0.4);
    linhas.forEach((l, i) => {
      const a = E.out(fase(t, l.t0, 0.5)), y = y0 + i * alto + (1 - a) * 24;
      if (a <= 0.01) return;
      ctx.save(); ctx.globalAlpha *= a;
      ctx.fillStyle = l.cor; caixa(ctx, 120, y + 40, 8, 48 + 6 * Math.sin(t * 2.4 + i), 4); ctx.fill();
      texto(ctx, l.nome, 148, y + 80, { tam: 42, peso: 650 });
      l.celulas.forEach((s, j) => {
        const ruim = s === "O(n²)", bom = s === "O(n)" && j === 0, cor = j === 4 ? COR.verde : ruim ? COR.rosa : bom ? COR.verde : j === 3 && s === "O(n)" ? COR.rosa : COR.texto;
        // cada célula entra quando a fala chega nela, com um pequeno salto
        const quando = j === 0 && i < 2 ? qMe + i * 0.3 : j === 4 ? qE + i * 0.25 : l.t0 + 0.25 + j * 0.18, k = E.volta(fase(t, quando, 0.45));
        texto(ctx, s, colunas[j + 1][1], y + 80 + (1 - clamp(k)) * 16, { tam: j < 4 ? 36 : 40, mono: j < 4, peso: 600, cor, alfa: clamp(k) });
      });
      ctx.fillStyle = COR.linha; ctx.fillRect(120, y + alto, W - 240, 2);
      ctx.restore();
    });
    ctx.restore();
    // estabilidade: dois setes continuam na ordem em que chegaram (a ordenação se repete em laço)
    const aE = visivel(t, qE + 0.6, qR - 0.4, 0.4);
    if (aE > 0.01) {
      ctx.save(); ctx.globalAlpha *= aE;
      const ciclo = ((t - qE - 1.0) % 3.2 + 3.2) % 3.2, k = t < qE + 1.0 ? 0 : E.io(clamp(ciclo / 1.1)) * (1 - E.io(clamp((ciclo - 2.6) / 0.6))), lado = 92, base = 800;
      const itens = [{ v: 7, r: "A", de: 0, para: 1, f: 0.85 }, { v: 2, r: "", de: 1, para: 0, f: 0.15 }, { v: 7, r: "B", de: 2, para: 2, f: 0.85 }];
      texto(ctx, "valores iguais mantêm a ordem de chegada", 560, base + 46, { tam: 38, cor: COR.texto });
      texto(ctx, "o 7 que chegou primeiro (A) continua antes do outro (B)", 560, base + 94, { tam: 28, cor: COR.fraco });
      itens.forEach((it) => {
        const x = 130 + lerp(it.de, it.para, k) * (lado + 16), sobe = it.de !== it.para ? Math.sin(k * Math.PI) * (it.v === 7 ? 52 : 0) : 0;
        ladrilho(ctx, x, base - sobe, lado, it.v, it.f, k > 0.02 && k < 0.98 && it.de !== it.para ? "ativo" : "pronto");
        if (it.r) texto(ctx, it.r, x + lado - 8, base - sobe - 12, { tam: 32, peso: 700, cor: COR.verde, alinha: "right" });
      });
      ctx.restore();
    }
    // no mundo real: TimSort
    const aR = visivel(t, qR, Infinity, 0.5);
    if (aR > 0.01) {
      ctx.save(); ctx.globalAlpha *= aR;
      ctx.fillStyle = "rgba(9,14,30,.985)"; caixa(ctx, 200, 340, W - 400, 560, 30); ctx.fill();
      ctx.strokeStyle = COR.indigo; ctx.lineWidth = 2.5; ctx.stroke();
      texto(ctx, "NO JAVA DE VERDADE", 270, 425, { tam: 24, peso: 600, cor: COR.indigo, espaco: 3 });
      texto(ctx, "Arrays.sort de objetos usa o TimSort", 270, 510, { tam: 66, peso: 650, espaco: -1 });
      const pecas = [["Merge Sort", "nos trechos grandes", COR.ambar, 270], ["+", "", COR.fraco, 835], ["Insertion Sort", "nos trechos pequenos", COR.fucsia, 930]];
      pecas.forEach(([nome, sub, cor, x], i) => {
        const a = E.volta(fase(t, qR + 2.4 + i * 0.5, 0.5));
        ctx.save(); ctx.globalAlpha *= clamp(a);
        if (nome === "+") { texto(ctx, "+", x, 735, { tam: 84, peso: 600, cor }); ctx.restore(); return; }
        const w = 520, yb = 610 + (1 - clamp(a)) * 30;
        ctx.fillStyle = comAlfa(cor, 0.14); caixa(ctx, x, yb, w, 200, 24); ctx.fill();
        ctx.strokeStyle = cor; ctx.lineWidth = 3; ctx.stroke();
        brilhoVarre(ctx, t, x, yb, w, 200, { periodo: 2.8, atraso: i * 0.7, forca: 0.16, raio: 24 });
        texto(ctx, nome, x + 36, yb + 86, { tam: 50, peso: 650, cor });
        texto(ctx, sub, x + 36, yb + 140, { tam: 30, cor: COR.fraco });
        for (let b = 0; b < 8; b++) {
          const ciclo = ((t - qR) * 0.55 + i * 0.4) % 2, kk = E.io(clamp(ciclo < 1 ? ciclo : 2 - ciclo));
          barra(ctx, x + 372 + lerp([5, 2, 7, 0, 3, 6, 1, 4][b], b, kk) * 16, yb + 176, 11, 22 + b * 9, b / 7, "certa");
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
