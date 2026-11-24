"use strict";

// ------------------------------------------------------------------ MERGE SORT: A IDEIA
// A árvore clássica: a lista desce se dividindo até sobrar um elemento por pedaço, e sobe intercalando.
CENAS.mergeIdeia = {
  preparar(c, D) {
    const v = D.vetor8, n = v.length;
    this.v = v; this.n = n; this.vmax = Math.max(...v); this.lado = 92;
    const nos = []; (function anda(no) { nos.push(no); if (no.esq) { anda(no.esq); anda(no.dir); } })(arvoreMerge(0, n - 1));
    this.nos = nos; this.niveis = Math.max(...nos.map((x) => x.nivel)) + 1;
    const folga = [0, 70, 44, 26], lado = this.lado, vao = 8;
    this.x = (L, s) => {
      let extra = 0, total = 0;
      for (let l = 1; l <= L; l++) { extra += folga[l] * Math.floor(s / (n >> l)); total += folga[l] * ((1 << l) - 1); }
      return 790 - (n * lado + (n - 1) * vao + total) / 2 + s * (lado + vao) + extra;
    };
    this.y = (L) => 262 + L * 170;

    // a volta: nível por nível, de baixo para cima, intercalando os pares
    const linhas = Array.from({ length: this.niveis }, (_, L) => v.map((valor) => ({ v: valor, tipo: L === this.niveis - 1 ? "pronto" : "copia" })));
    const eventos = [], antes = []; let comps = 0;
    const foto = () => antes.push({ linhas: linhas.map((l) => l.map((x) => (x ? { ...x } : null))), comps });
    for (let L = this.niveis - 2; L >= 0; L--) {
      for (const no of nos.filter((x) => x.nivel === L && x.esq)) {
        foto(); eventos.push({ tipo: "limpa", no, d: 0.55 });
        for (let s = no.inicio; s <= no.fim; s++) linhas[L][s] = null;
        const esq = linhas[L + 1].slice(no.inicio, no.meio + 1).map((x) => x.v), dir = linhas[L + 1].slice(no.meio + 1, no.fim + 1).map((x) => x.v);
        for (const passo of intercalarAnotado(esq, dir).passos) {
          if (passo.tipo === "cmp") {
            foto(); eventos.push({ tipo: "cmp", no, a: no.inicio + passo.i, b: no.meio + 1 + passo.j, pegaDireita: passo.pegaDireita, d: 1 }); comps++;
          } else {
            const origem = passo.lado === "esq" ? no.inicio + passo.indice : no.meio + 1 + passo.indice, destino = no.inicio + passo.para;
            foto(); eventos.push({ tipo: "leva", no, origem, destino, valor: linhas[L + 1][origem].v, d: passo.sobra ? 0.7 : 0.95 });
            linhas[L][destino] = { v: linhas[L + 1][origem].v, tipo: "pronto" }; linhas[L + 1][origem] = null;
          }
        }
      }
    }
    foto();
    if (comps !== D.comparacoes8.merge) window.ERROS.push(`merge: a animação fez ${comps} comparações e o Java mediu ${D.comparacoes8.merge}`);
    this.eventos = eventos; this.antes = antes;
    const fimPrimeiro = eventos.findIndex((e, i) => i > 0 && e.tipo === "limpa");
    this.relogio = relogioDeEventos(eventos, [
      { de: 0, ate: fimPrimeiro, t0: c.q("intercala") + 2.2, t1: c.q("sobe") - 0.2 },
      { de: fimPrimeiro, ate: eventos.length, t0: c.q("sobe") + 0.1, t1: c.q("niveis") - 0.6 },
    ]);
  },
  desenhar(ctx, t, c) {
    cabecalho(ctx, t, "Algoritmo 3", "Merge Sort: dividir para conquistar", COR.ambar);
    const lado = this.lado, n = this.n, f = (valor) => valor / this.vmax;
    const qD = c.q("divide"), qU = c.q("um"), qN = c.q("niveis");
    const durCorte = (qU - qD - 0.4) / 3, corte = (l) => E.io(fase(t, qD + 0.2 + l * durCorte, durCorte * 0.85)); // corte l: do nível l para o l + 1
    const dividindo = t < c.q("intercala") + 2.2;
    const rel = this.relogio(t), { k, p } = rel, foto = this.antes[Math.min(k, this.antes.length - 1)], ev = dividindo || rel.parado ? null : this.eventos[k];

    // ligações entre cada pedaço e as duas metades dele
    for (const no of this.nos) {
      if (!no.esq) continue;
      const a = corte(no.nivel) * 0.5;
      if (a <= 0.01) continue;
      const centro = (x) => (this.x(x.nivel, x.inicio) + this.x(x.nivel, x.fim) + lado) / 2;
      ctx.strokeStyle = `rgba(148,163,200,${a * 0.45})`; ctx.lineWidth = 2.5;
      for (const filho of [no.esq, no.dir]) {
        ctx.beginPath(); ctx.moveTo(centro(no), this.y(no.nivel) + lado + 8);
        ctx.lineTo(centro(filho), this.y(filho.nivel) - 8); ctx.stroke();
      }
    }
    // ladrilhos
    for (let L = 0; L < this.niveis; L++) {
      const entrou = L === 0 ? 1 : corte(L - 1);
      if (entrou <= 0.001) continue;
      for (let s = 0; s < n; s++) {
        const x = L === 0 ? this.x(0, s) : lerp(this.x(L - 1, s), this.x(L, s), entrou), y = L === 0 ? this.y(0) : lerp(this.y(L - 1), this.y(L), entrou);
        if (dividindo) {
          const chegada = L === 0 ? E.volta(fase(t, 0.5 + s * 0.09, 0.45)) : 1;
          const copia = L < this.niveis - 1 ? corte(L) : 0; // depois de dividido, o de cima vira cópia esmaecida
          const pulso = L === this.niveis - 1 ? Math.sin(fase(t, qU + s * 0.08, 1.1) * Math.PI) : 0;
          ctx.save(); ctx.globalAlpha *= clamp(chegada) * entrou;
          ladrilho(ctx, x, y - pulso * 14 - (1 - clamp(chegada)) * 30, lado, this.v[s], f(this.v[s]), copia > 0.5 ? "copia" : "pronto", { brilhoCopia: lerp(1, 0.36, clamp((copia - 0.5) * 2)), brilho: pulso * 40 });
          ctx.restore();
          continue;
        }
        const celula = foto.linhas[L][s];
        let tipo = celula ? celula.tipo : "vago", valor = celula ? celula.v : null, sobe = 0, alfa = 1;
        if (ev && ev.tipo === "limpa" && L === ev.no.nivel && s >= ev.no.inicio && s <= ev.no.fim) alfa = 1 - E.io(p);
        if (ev && ev.tipo === "cmp" && L === ev.no.nivel + 1 && (s === ev.a || s === ev.b)) { tipo = "ativo"; sobe = Math.sin(Math.min(1, p * 2) * Math.PI / 2) * 12; }
        if (ev && ev.tipo === "leva" && L === ev.no.nivel + 1 && s === ev.origem) { tipo = "vago"; valor = null; }
        if (alfa < 1) ladrilho(ctx, x, y, lado, null, 0, "vago");
        ladrilho(ctx, x, y - sobe, lado, valor, valor == null ? 0 : f(valor), tipo, { alfa });
      }
    }
    // o ladrilho em viagem e o selo da comparação
    if (ev && ev.tipo === "leva") {
      const L = ev.no.nivel, q = E.io(p);
      const x = lerp(this.x(L + 1, ev.origem), this.x(L, ev.destino), q), y = lerp(this.y(L + 1), this.y(L), q) - Math.sin(q * Math.PI) * 26;
      ladrilho(ctx, x, y, lado, ev.valor, f(ev.valor), "ativo");
    }
    if (ev && ev.tipo === "cmp") {
      const L = ev.no.nivel + 1, va = foto.linhas[L][ev.a].v, vb = foto.linhas[L][ev.b].v, cx = (this.x(L, ev.a) + this.x(L, ev.b) + lado) / 2;
      const a = E.out(clamp(p * 3)) * (1 - E.in(fase(p, 0.88, 0.12))), s = `menor: ${Math.min(va, vb)}`, w = largura(ctx, s, { tam: 30, peso: 650 }) + 56;
      ctx.save(); ctx.globalAlpha *= a;
      ctx.fillStyle = "rgba(10,16,34,.94)"; caixa(ctx, cx - w / 2, this.y(L) + lado + 14, w, 54, 27); ctx.fill();
      ctx.strokeStyle = COR.verde; ctx.lineWidth = 2.5; ctx.stroke();
      texto(ctx, s, cx, this.y(L) + lado + 43, { tam: 30, peso: 650, alinha: "center", base: "middle", cor: COR.verde });
      ctx.restore();
    }
    // os níveis: quantos são e quanto custa cada um
    const aN = visivel(t, qN, Infinity, 0.5);
    if (aN > 0.01) {
      const x = 1470, qMi = c.q("milhao"), qVi = c.q("visita");
      // cada nível passa uma vez por todos: uma luz varre os oito elementos de um nível, depois os do outro
      for (let L = 1; L <= 3; L++) for (let s = 0; s < n; s++) {
        const ciclo = ((t - qVi) % 4.4 + 4.4) % 4.4, pos = t < qVi ? -9 : ((ciclo - (L - 1) * 1.3) / 1.1) * n;
        const perto = clamp(1 - Math.abs(pos - s - 0.5) / 1.5), passou = pos > s + 0.5 && pos < n + 30;
        ctx.save(); ctx.globalAlpha *= aN * lerp(0.22, 1, Math.max(perto, passou ? 0.6 : 0));
        ladrilho(ctx, this.x(L, s), this.y(L) - perto * 12, lado, this.v[s], f(this.v[s]), perto > 0.45 ? "ativo" : "pronto");
        ctx.restore();
      }
      ctx.save(); ctx.globalAlpha *= aN;
      ctx.strokeStyle = COR.ambar; ctx.lineWidth = 4; ctx.beginPath();
      ctx.moveTo(x - 30, this.y(0) + lado / 2); ctx.lineTo(x, this.y(0) + lado / 2); ctx.lineTo(x, this.y(3) + lado / 2); ctx.lineTo(x - 30, this.y(3) + lado / 2); ctx.stroke();
      for (let L = 0; L < 3; L++) texto(ctx, `divisão ${L + 1}`, x + 22, (this.y(L) + this.y(L + 1)) / 2 + lado / 2 + 8, { tam: 26, cor: COR.fraco });
      ctx.restore();
      texto(ctx, "3 níveis", 1470, 250, { tam: 60, peso: 650, cor: COR.ambar, alfa: aN });
      // de 8 a um milhão: a lista dobra de tamanho e ganha um nível só de cada vez
      const a2 = visivel(t, qMi, Infinity, 0.5), niveis = 3 + Math.round(17 * E.io(fase(t, qMi + 0.15, 2.4)));
      texto(ctx, milhar(2 ** niveis) + " elementos", 1470, 880, { tam: 30, cor: COR.fraco, alfa: a2 });
      texto(ctx, niveis + " níveis", 1470, 946, { tam: 58, peso: 650, cor: COR.ambar, alfa: a2 });
      ctx.save(); ctx.globalAlpha *= a2;
      for (let i = 0; i < niveis; i++) { ctx.fillStyle = comAlfa(COR.ambar, 0.3 + 0.65 * (i / 19)); caixa(ctx, 1786, 944 - i * 9.5, 44, 6.5, 3); ctx.fill(); }
      ctx.restore();
      const aVi = visivel(t, qVi, Infinity, 0.4);
      texto(ctx, "em cada nível: 8 visitas", 1470, 300, { tam: 28, cor: COR.fraco, alfa: aVi });
    }
    contador(ctx, 120, 940, dividindo ? 0 : foto.comps, "comparações", { alfa: visivel(t, c.q("intercala") + 1.5, qN - 0.2, 0.4), tam: 56 });
    legendaPorTempo(ctx, t, [
      [qD + 0.2, "Corta ao meio, e de novo, e de novo."],
      [qU, "Um elemento sozinho já está ordenado."],
      [c.q("intercala"), "Compara o primeiro de cada lado e leva o menor."],
      [c.q("sobe"), "De dois em dois, de baixo para cima."],
      [qN, "Poucos níveis, e cada nível passa uma vez por todos."],
    ], { fim: c.dur - 0.4, y: 990, tam: 32 });
    vinheta(ctx, t, "3", "Merge Sort", COR.ambar);
  },
};

// ------------------------------------------------------------------ MERGE SORT: O CÓDIGO
// Parte A: a função recursiva, com a árvore de chamadas acendendo na ordem real (em profundidade).
// Parte B: a intercalação, com os três índices andando.
CENAS.mergeCodigo = {
  preparar(c, D) {
    const qI = c.q("intercalar");
    // ---- parte A
    this.linhasA = D.codigo.mergeSort.split("\n");
    this.focosA = resolverFocos("mergeSort", this.linhasA, [
      { t: 0 },
      { t: 0.9, de: "private static void mergeSort", ate: "int inicio, int fim) {", cor: COR.ambar },
      { t: c.q("base"), de: "if (inicio >= fim) {", ate: "}", cor: COR.verde },
      { t: c.q("meio"), de: "int meio" },
      { t: c.q("chamadas"), de: "mergeSort(v, aux, inicio, meio);", ate: "mergeSort(v, aux, meio + 1, fim);", cor: COR.ambar },
      { t: c.q("junta"), de: "intercalar(v, aux, inicio, meio, fim);", cor: COR.fucsia },
    ]);
    const raiz = arvoreMerge(0, D.vetor8.length - 1), nos = [], evA = [], antesA = [];
    const pilha = [], feitos = new Set();
    const fotoA = () => antesA.push({ pilha: pilha.slice(), feitos: new Set(feitos) });
    (function visita(no) {
      nos.push(no);
      fotoA(); evA.push({ tipo: "chama", no, d: 1 }); pilha.push(no);
      if (!no.esq) { fotoA(); evA.push({ tipo: "base", no, d: 0.9 }); pilha.pop(); feitos.add(no); return; }
      visita(no.esq); visita(no.dir);
      fotoA(); evA.push({ tipo: "intercala", no, d: 1.3 }); pilha.pop(); feitos.add(no);
    })(raiz);
    fotoA();
    this.nos = nos; this.evA = evA; this.antesA = antesA;
    this.relogioA = relogioDeEventos(evA, [{ de: 0, ate: evA.length, t0: c.q("base") - 1.0, t1: qI - 0.7 }]);
    const lA = this.linhasA;
    this.linhaA = { chama: 0, base: linhaDe(lA, "return;"), intercala: linhaDe(lA, "intercalar(") };

    // ---- parte B
    this.linhasB = D.codigo.intercalar.split("\n");
    this.focosB = resolverFocos("intercalar", this.linhasB, [
      { t: 0 },
      { t: qI + 0.5, de: "private static void intercalar", ate: "int inicio, int meio, int fim) {", cor: COR.fucsia },
      { t: c.q("laco"), de: "while (i <= meio && j <= fim) {", ate: "aux[k++] = v[i++];" },
      { t: c.q("resto"), de: "while (i <= meio) {", ate: "aux[k++] = v[j++];", cor: COR.ambar },
      { t: c.q("copia"), de: "for (k = inicio; k <= fim; k++) {", ate: "v[k] = aux[k];", cor: COR.verde },
      { t: c.q("custo"), manter: true },
    ]);
    const v = D.vetor8, meio = v.length / 2;
    this.esq = v.slice(0, meio).sort((a, b) => a - b); this.dir = v.slice(meio).sort((a, b) => a - b);
    this.vmax = Math.max(...v);
    const evB = [], antesB = [], cima = this.esq.concat(this.dir), baixo = new Array(v.length).fill(null);
    let i = 0, j = 0, kk = 0;
    const fotoB = () => antesB.push({ cima: cima.slice(), baixo: baixo.slice(), i, j, k: kk });
    const lB = this.linhasB, lSe = linhaDe(lB, "if (maior(v[i], v[j]))"), lDir = linhaDe(lB, "aux[k++] = v[j++];"), lEsq = linhaDe(lB, "aux[k++] = v[i++];");
    const lSobraEsq = lB.findIndex((l, n) => n > linhaDe(lB, "while (i <= meio) {") && l.includes("aux[k++] = v[i++];"));
    const lSobraDir = lB.findIndex((l, n) => n > linhaDe(lB, "while (j <= fim) {") && l.includes("aux[k++] = v[j++];"));
    let primeiraSobra = -1;
    for (const passo of intercalarAnotado(this.esq, this.dir).passos) {
      if (passo.tipo === "cmp") { fotoB(); evB.push({ tipo: "cmp", a: passo.i, b: meio + passo.j, linha: lSe, d: 1 }); continue; }
      const origem = passo.lado === "esq" ? passo.indice : meio + passo.indice;
      if (passo.sobra && primeiraSobra < 0) primeiraSobra = evB.length;
      fotoB(); evB.push({ tipo: "leva", origem, destino: passo.para, valor: cima[origem], d: 0.9, linha: passo.sobra ? (passo.lado === "esq" ? lSobraEsq : lSobraDir) : passo.lado === "esq" ? lEsq : lDir });
      baixo[passo.para] = cima[origem]; cima[origem] = null; kk++;
      if (passo.lado === "esq") i++; else j++;
    }
    const iCopia = evB.length;
    fotoB(); evB.push({ tipo: "copia", d: 1, linha: linhaDe(lB, "v[k] = aux[k];") });
    for (let s = 0; s < v.length; s++) { cima[s] = baixo[s]; baixo[s] = null; }
    fotoB();
    this.evB = evB; this.antesB = antesB; this.meio = meio;
    if (primeiraSobra < 0) primeiraSobra = iCopia;
    this.relogioB = relogioDeEventos(evB, [
      { de: 0, ate: primeiraSobra, t0: c.q("laco") + 0.3, t1: c.q("resto") - 0.2 },
      { de: primeiraSobra, ate: iCopia, t0: c.q("resto") + 0.3, t1: c.q("copia") - 0.3 },
      { de: iCopia, ate: evB.length, t0: c.q("copia") + 0.3, t1: c.q("copia") + 1.9 },
    ]);
  },

  desenhar(ctx, t, c) {
    const qI = c.q("intercalar");
    cabecalho(ctx, t, "Merge Sort", t < qI ? "No código: a função recursiva" : "No código: a intercalação", COR.ambar);
    const aA = visivel(t, 0.3, qI - 0.1, 0.45), aB = visivel(t, qI + 0.15, Infinity, 0.45);
    if (aA > 0.01) this.parteA(ctx, t, c, aA);
    if (aB > 0.01) this.parteB(ctx, t, c, aB);
  },

  parteA(ctx, t, c, a) {
    const relA = this.relogioA(t), { k, p } = relA, ev = relA.parado ? null : this.evA[k], foto = this.antesA[Math.min(k, this.antesA.length - 1)];
    painelCodigo(ctx, t, 100, 236, 1150, 660, "Ordenacao.java", this.linhasA, this.focosA, { alfa: a, execucao: ev && t > c.q("base") - 1.0 ? this.linhaA[ev.tipo] : -1 });
    ctx.save(); ctx.globalAlpha *= a;
    texto(ctx, "chamadas para 8 elementos", 1300, 300, { tam: 24, cor: COR.fraco, espaco: 2 });
    const n = 8, largura0 = 520, x0 = 1290;
    const cx = (no) => x0 + ((no.inicio + no.fim + 1) / 2 / n) * largura0, cy = (no) => 370 + no.nivel * 118;
    for (const no of this.nos) {
      if (!no.esq) continue;
      for (const filho of [no.esq, no.dir]) {
        const usado = foto.feitos.has(filho) || foto.pilha.includes(filho) || (ev && ev.no === filho);
        ctx.strokeStyle = `rgba(148,163,200,${usado ? 0.5 : 0.16})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx(no), cy(no) + 22); ctx.lineTo(cx(filho), cy(filho) - 22); ctx.stroke();
      }
    }
    for (const no of this.nos) {
      const feito = foto.feitos.has(no), naPilha = foto.pilha.includes(no), agora = ev && ev.no === no;
      const folha = !no.esq, w = folha ? 46 : 46 + (3 - no.nivel) * 30, h = 44, x = cx(no) - w / 2, y = cy(no) - h / 2;
      let cor = "rgba(148,163,200,.18)", preenche = "rgba(13,20,42,.9)", corTexto = COR.apagado, brilho = 0;
      if (naPilha) { cor = COR.ambar; corTexto = COR.texto; }
      if (feito) { cor = COR.verde; preenche = comAlfa(COR.verde, 0.2); corTexto = COR.texto; }
      if (agora) { brilho = 26 * Math.sin(p * Math.PI); cor = ev.tipo === "chama" ? COR.ambar : ev.tipo === "base" ? COR.verde : COR.fucsia; corTexto = COR.texto; }
      ctx.save();
      if (brilho) { ctx.shadowColor = cor; ctx.shadowBlur = brilho; }
      ctx.fillStyle = preenche; caixa(ctx, x, y, w, h, 22); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = cor; ctx.lineWidth = agora || naPilha ? 3 : 2; ctx.stroke();
      texto(ctx, folha ? String(no.inicio) : `${no.inicio}–${no.fim}`, cx(no), cy(no) + 1, { tam: 22, peso: 600, alinha: "center", base: "middle", cor: corTexto, mono: true });
      ctx.restore();
    }
    const oque = !ev || t < c.q("base") - 1.0 ? "" : ev.tipo === "chama" ? `chama mergeSort(${ev.no.inicio}, ${ev.no.fim})` : ev.tipo === "base" ? "caso base: volta" : `intercala ${ev.no.inicio} a ${ev.no.fim}`;
    texto(ctx, oque, 1300, 830, { tam: 30, mono: true, cor: !ev ? COR.fraco : ev.tipo === "chama" ? COR.ambar : ev.tipo === "base" ? COR.verde : COR.fucsia });
    contador(ctx, 1300, 930, foto.pilha.length, "chamadas na pilha agora", { tam: 52, cor: COR.ambar });
    ctx.restore();
    texto(ctx, "os números da árvore são posições do vetor: de 0 a 7", 100, 944, { tam: 24, cor: COR.apagado, alfa: a });
  },

  parteB(ctx, t, c, a) {
    const relB = this.relogioB(t), { k, p } = relB, ev = relB.parado ? null : this.evB[k], foto = this.antesB[Math.min(k, this.antesB.length - 1)];
    const rodando = t >= c.q("laco") + 0.3;
    painelCodigo(ctx, t, 100, 226, 1150, 790, "Ordenacao.java", this.linhasB, this.focosB, { alfa: a, entrelinha: 1.36, execucao: rodando && ev && t < c.q("custo") ? ev.linha : -1 });
    ctx.save(); ctx.globalAlpha *= a;
    const lado = 52, vao = 6, x0 = 1300, folga = 22, f = (valor) => valor / this.vmax;
    const x = (s) => x0 + s * (lado + vao) + (s >= this.meio ? folga : 0), yCima = 380, yBaixo = 590;
    texto(ctx, "v", x0, yCima - 22, { tam: 26, mono: true, cor: COR.fraco });
    texto(ctx, "metade esquerda", x0 + 38, yCima - 22, { tam: 22, cor: COR.apagado });
    texto(ctx, "metade direita", x(this.meio) + 4, yCima - 22, { tam: 22, cor: COR.apagado });
    texto(ctx, "aux", x0, yBaixo - 22, { tam: 26, mono: true, cor: COR.fraco });
    const copiando = ev && ev.tipo === "copia";
    for (let s = 0; s < this.esq.length + this.dir.length; s++) {
      let cima = foto.cima[s], baixo = foto.baixo[s], tipoCima = "pronto";
      if (ev && ev.tipo === "cmp" && (s === ev.a || s === ev.b)) tipoCima = "ativo";
      if (ev && ev.tipo === "leva" && s === ev.origem) cima = null;
      ladrilho(ctx, x(s), yCima, lado, null, 0, "vago");
      // o vetor auxiliar é montado casa por casa, quando a fala o apresenta
      const kAux = E.volta(fase(t, c.q("intercalar") + 1.3 + s * 0.16, 0.4));
      ladrilho(ctx, x(s), yBaixo + (1 - clamp(kAux)) * 26, lado, null, 0, "vago", { alfa: clamp(kAux) });
      // antes de rodar e depois de pronto, uma onda passa pelo vetor
      const onda = k >= this.evB.length || !rodando ? Math.sin(t * 3 - s * 0.6) * 7 : 0;
      if (cima != null) ladrilho(ctx, x(s), yCima - onda, lado, cima, f(cima), tipoCima);
      if (baixo != null && !copiando) ladrilho(ctx, x(s), yBaixo, lado, baixo, f(baixo), "pronto");
      if (copiando && baixo != null) { const q = E.io(fase(p, s * 0.07, 0.45)); ladrilho(ctx, x(s), lerp(yBaixo, yCima, q), lado, baixo, f(baixo), q > 0 && q < 1 ? "ativo" : "pronto"); }
    }
    if (ev && ev.tipo === "leva") {
      const q = E.io(p);
      ladrilho(ctx, lerp(x(ev.origem), x(ev.destino), q), lerp(yCima, yBaixo, q), lado, ev.valor, f(ev.valor), "ativo");
    }
    // os três índices
    if (rodando && !copiando && k < this.evB.length) {
      const iAgora = foto.i + (ev && ev.tipo === "leva" && ev.origem < this.meio ? E.io(p) : 0), jAgora = foto.j + (ev && ev.tipo === "leva" && ev.origem >= this.meio ? E.io(p) : 0);
      const kAgora = foto.k + (ev && ev.tipo === "leva" ? E.io(p) : 0);
      const posI = (v) => x0 + v * (lado + vao) + lado / 2, posJ = (v) => x0 + (this.meio + v) * (lado + vao) + folga + lado / 2;
      const desenhaSeta = (sx, y, nome, cor, paraCima) => {
        ctx.fillStyle = cor; ctx.beginPath();
        if (paraCima) { ctx.moveTo(sx, y); ctx.lineTo(sx - 11, y + 16); ctx.lineTo(sx + 11, y + 16); } else { ctx.moveTo(sx, y); ctx.lineTo(sx - 11, y - 16); ctx.lineTo(sx + 11, y - 16); }
        ctx.fill();
        texto(ctx, nome, sx, paraCima ? y + 46 : y - 26, { tam: 26, mono: true, peso: 650, cor, alinha: "center" });
      };
      if (foto.i < this.esq.length || iAgora < this.esq.length) desenhaSeta(posI(Math.min(iAgora, this.esq.length - 0.001)), yCima + lado + 10, "i", COR.ciano, true);
      if (foto.j < this.dir.length || jAgora < this.dir.length) desenhaSeta(posJ(Math.min(jAgora, this.dir.length - 0.001)), yCima + lado + 10, "j", COR.fucsia, true);
      const kx = x0 + Math.min(kAgora, 7) * (lado + vao) + (Math.min(kAgora, 7) >= this.meio ? folga : 0) + lado / 2;
      desenhaSeta(kx, yBaixo + lado + 10, "k", COR.ambar, true);
    }
    ctx.restore();
    // o custo
    const aC = visivel(t, c.q("custo"), Infinity, 0.5);
    if (aC > 0.01) {
      texto(ctx, "n · log₂ n", 1300, 800, { tam: 84, peso: 650, mono: true, cor: COR.ambar, alfa: aC * a, brilho: 24 + 22 * Math.sin(t * 2.6) });
      texto(ctx, "comparações, em qualquer caso", 1300, 852, { tam: 28, cor: COR.fraco, alfa: aC * a });
      const a2 = visivel(t, c.q("custo") + 2.6, Infinity, 0.5);
      texto(ctx, "+ n de memória extra (o vetor aux)", 1300, 920, { tam: 30, cor: COR.rosa, alfa: a2 * a });
    }
  },
};
