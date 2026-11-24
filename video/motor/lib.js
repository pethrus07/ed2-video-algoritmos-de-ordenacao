"use strict";
// Biblioteca de desenho do vídeo. Tudo é função pura do tempo: render(t) desenha o quadro do instante t,
// sem estado guardado entre quadros. É isso que permite renderizar quadro a quadro, em qualquer ordem.

const W = 1920, H = 1080;
const FONTE = '"Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif';
const MONO = '"Cascadia Mono", Consolas, "Courier New", monospace';

const COR = {
  fundo: "#070b16", fundo2: "#0d1326", painel: "#101830", borda: "#243049", linha: "#1b2540",
  texto: "#eef2ff", fraco: "#93a0bd", apagado: "#5b6784",
  ciano: "#22d3ee", indigo: "#818cf8", fucsia: "#e879f9", rosa: "#fb7185", ambar: "#fbbf24",
  verde: "#34d399", vermelho: "#f87171", branco: "#ffffff",
};

// ------------------------------------------------------------------ números e tempo

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
/** Progresso de 0 a 1 de um trecho que começa em `ini` e dura `dur` segundos. */
const fase = (t, ini, dur) => clamp((t - ini) / (dur || 1e-6));
const E = {
  io: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  out: (k) => 1 - Math.pow(1 - k, 3),
  out5: (k) => 1 - Math.pow(1 - k, 5),
  in: (k) => k * k * k,
  volta: (k) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
  mola: (k) => (k === 0 || k === 1 ? k : Math.pow(2, -9 * k) * Math.sin((k * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
};
/** Aparece em `ini` (com duração `d`) e some em `fim`, se houver. Devolve a opacidade. */
const visivel = (t, ini, fim = Infinity, d = 0.45) => E.out(fase(t, ini, d)) * (1 - E.in(fase(t, fim - d, d)));
const milhar = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const decimal = (n, casas = 1) => n.toFixed(casas).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
/** Ruído determinístico de 0 a 1 para uma semente inteira (sem Math.random: o quadro tem de se repetir). */
const ruido = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ------------------------------------------------------------------ cores

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const RAMPA = [COR.ciano, COR.indigo, COR.fucsia, COR.rosa, COR.ambar].map(hex);
/** Cor de um valor na rampa (f de 0 a 1). Depois de ordenado, o conjunto vira um degradê contínuo. */
function corValor(f, brilho = 1, alfa = 1) {
  const x = clamp(f) * (RAMPA.length - 1), i = Math.min(RAMPA.length - 2, Math.floor(x)), k = x - i;
  const c = [0, 1, 2].map((j) => Math.round(clamp(lerp(RAMPA[i][j], RAMPA[i + 1][j], k) * brilho, 0, 255)));
  return `rgba(${c[0]},${c[1]},${c[2]},${alfa})`;
}
function mistura(a, b, k, alfa = 1) {
  const x = hex(a), y = hex(b);
  return `rgba(${[0, 1, 2].map((j) => Math.round(lerp(x[j], y[j], k))).join(",")},${alfa})`;
}
const comAlfa = (h, alfa) => { const c = hex(h); return `rgba(${c[0]},${c[1]},${c[2]},${alfa})`; };

// ------------------------------------------------------------------ formas e texto

function caixa(ctx, x, y, w, h, r = 16) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
}
function texto(ctx, s, x, y, o = {}) {
  ctx.save();
  ctx.font = `${o.italico ? "italic " : ""}${o.peso || 500} ${o.tam || 40}px ${o.mono ? MONO : FONTE}`;
  ctx.fillStyle = o.cor || COR.texto; ctx.textAlign = o.alinha || "left"; ctx.textBaseline = o.base || "alphabetic";
  ctx.globalAlpha *= o.alfa ?? 1;
  if (o.espaco) ctx.letterSpacing = o.espaco + "px";
  if (o.brilho) { ctx.shadowColor = o.sombra || o.cor || COR.texto; ctx.shadowBlur = o.brilho; }
  ctx.fillText(s, x, y);
  ctx.restore();
}
function largura(ctx, s, o = {}) {
  ctx.save(); ctx.font = `${o.peso || 500} ${o.tam || 40}px ${o.mono ? MONO : FONTE}`;
  if (o.espaco) ctx.letterSpacing = o.espaco + "px";
  const w = ctx.measureText(s).width; ctx.restore(); return w;
}
/** Texto em várias linhas, quebrado na largura máxima. Devolve a altura ocupada. */
function paragrafo(ctx, s, x, y, larguraMax, o = {}) {
  const palavras = s.split(" "), linhas = []; let atual = "";
  for (const p of palavras) {
    const teste = atual ? atual + " " + p : p;
    if (largura(ctx, teste, o) > larguraMax && atual) { linhas.push(atual); atual = p; } else atual = teste;
  }
  if (atual) linhas.push(atual);
  const passo = (o.tam || 40) * (o.entrelinha || 1.32);
  linhas.forEach((l, i) => texto(ctx, l, x, y + i * passo, o));
  return linhas.length * passo;
}
/** Número que conta até o valor final conforme o progresso k. */
const contando = (valor, k) => Math.round(valor * E.out5(clamp(k)));

/** Cabeçalho da cena: rótulo pequeno em cima e título grande, com entrada suave. */
function cabecalho(ctx, t, rotulo, titulo, cor = COR.ciano) {
  const a = E.out(fase(t, 0.1, 0.5)), dx = (1 - a) * -30;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = cor; caixa(ctx, 120 + dx, 108, 44, 6, 3); ctx.fill();
  texto(ctx, rotulo.toUpperCase(), 178 + dx, 118, { tam: 23, peso: 600, cor, espaco: 4 });
  texto(ctx, titulo, 118 + dx, 186, { tam: 62, peso: 650, espaco: -1 });
  ctx.restore();
}

/** Frase curta no rodapé, em pílula. `a` é a opacidade. */
function legenda(ctx, s, a = 1, o = {}) {
  if (a <= 0.01 || !s) return;
  const tam = o.tam || 36, lw = largura(ctx, s, { tam, peso: 500 }), w = lw + 76, h = tam + 44;
  const x = (W - w) / 2, y = (o.y || 968) - h / 2 + (1 - a) * 18;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = "rgba(10,16,34,.82)"; caixa(ctx, x, y, w, h, h / 2); ctx.fill();
  ctx.strokeStyle = comAlfa(o.cor || COR.borda, 0.9); ctx.lineWidth = 2; ctx.stroke();
  texto(ctx, s, W / 2, y + h / 2 + 2, { tam, peso: 500, alinha: "center", base: "middle", cor: o.corTexto || COR.texto });
  ctx.restore();
}
/** Escolhe a legenda do momento em uma lista [[inicio, texto], ...] e faz a troca com fade. */
function legendaPorTempo(ctx, t, lista, o = {}) {
  let i = -1;
  for (let k = 0; k < lista.length; k++) if (t >= lista[k][0]) i = k;
  if (i < 0) return;
  const fim = i + 1 < lista.length ? lista[i + 1][0] : (o.fim ?? Infinity);
  legenda(ctx, lista[i][1], visivel(t, lista[i][0], fim, 0.3), o);
}

/** Etiqueta com número grande e nome pequeno (contadores). */
function contador(ctx, x, y, valor, nome, o = {}) {
  texto(ctx, typeof valor === "number" ? milhar(valor) : valor, x, y, { tam: o.tam || 64, peso: 650, cor: o.cor || COR.texto, alinha: o.alinha || "left", mono: false, alfa: o.alfa });
  texto(ctx, nome, x, y + 36, { tam: 24, cor: COR.fraco, alinha: o.alinha || "left", alfa: o.alfa });
}

// ------------------------------------------------------------------ fundo

/** Fundo vivo: degradê escuro, três manchas de luz que se movem devagar e uma malha de pontos. */
function fundo(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, COR.fundo2); g.addColorStop(1, COR.fundo);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const manchas = [[COR.indigo, 0.2, 0.3, 0.13, 760], [COR.ciano, 0.8, 0.75, 0.09, 680], [COR.fucsia, 0.65, 0.15, 0.07, 560]];
  manchas.forEach(([cor, fx, fy, a, r], i) => {
    const x = W * fx + Math.sin(t * 0.11 + i * 2.1) * 170, y = H * fy + Math.cos(t * 0.09 + i * 1.7) * 120;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, comAlfa(cor, a)); rg.addColorStop(1, comAlfa(cor, 0));
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  });
  ctx.fillStyle = "rgba(148,163,200,.085)";
  const desloc = (t * 9) % 48;
  for (let y = -48 + desloc; y < H + 48; y += 48) for (let x = 24; x < W; x += 48) ctx.fillRect(x, y, 2, 2);
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.42)");
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

// ------------------------------------------------------------------ barras

/**
 * Desenha uma barra com topo arredondado. `f` (0 a 1) define a cor na rampa; `estado` muda o acabamento:
 * "normal" (meio apagada), "ativa" (clara, com brilho), "certa" (cor cheia), "chave" (contorno branco).
 */
function barra(ctx, x, base, w, h, f, estado = "normal", o = {}) {
  const brilho = estado === "normal" ? 0.62 : estado === "apagada" ? 0.32 : 1;
  ctx.save();
  ctx.globalAlpha *= o.alfa ?? 1;
  if (estado === "ativa" || estado === "chave") { ctx.shadowColor = corValor(f, 1, 0.9); ctx.shadowBlur = o.brilho ?? 34; }
  if (estado === "certa" && o.brilho) { ctx.shadowColor = corValor(f, 1, 0.55); ctx.shadowBlur = o.brilho; }
  const g = ctx.createLinearGradient(0, base - h, 0, base);
  g.addColorStop(0, corValor(f, brilho * 1.12)); g.addColorStop(1, corValor(f, brilho * 0.72));
  ctx.fillStyle = g; caixa(ctx, x, base - h, w, h, Math.min(w / 2.6, 12)); ctx.fill();
  ctx.shadowBlur = 0;
  if (estado === "ativa" || estado === "chave") { ctx.strokeStyle = "rgba(255,255,255,.95)"; ctx.lineWidth = Math.max(2, Math.min(4, w / 12)); ctx.stroke(); }
  if (o.rotulo != null && w >= 44) {
    texto(ctx, String(o.rotulo), x + w / 2, base - h - 16, { tam: Math.min(34, w * 0.42), peso: 650, alinha: "center", cor: estado === "normal" ? COR.fraco : COR.texto });
  }
  ctx.restore();
}

// ------------------------------------------------------------------ painel de código

const PALAVRAS = /\b(public|private|static|void|boolean|int|long|for|while|if|else|return|break|new|true|false)\b/;
/** Quebra uma linha de Java em pedaços coloridos. */
function colorir(linha) {
  const pedacos = [], iComentario = linha.indexOf("//");
  const codigo = iComentario >= 0 ? linha.slice(0, iComentario) : linha;
  const re = /(\b(?:public|private|static|void|boolean|int|long|for|while|if|else|return|break|new|true|false)\b)|(\b\d+\b)|(\b[a-zA-Z_]\w*(?=\())|([^\w]+|\w+)/g;
  let m;
  while ((m = re.exec(codigo))) {
    pedacos.push({ s: m[0], cor: m[1] ? "#7dd3fc" : m[2] ? "#fda4af" : m[3] ? "#fde68a" : "#dbe4ff" });
  }
  if (iComentario >= 0) pedacos.push({ s: linha.slice(iComentario), cor: "#7180a0", italico: true });
  return pedacos;
}

/**
 * Painel de código. `focos` é a lista [{t, i, j}]: a partir do instante t, as linhas i..j ficam acesas.
 * A faixa de destaque desliza de um foco para o outro.
 */
function painelCodigo(ctx, t, x, y, w, h, arquivo, linhas, focos, o = {}) {
  const a = o.alfa ?? 1;
  if (a <= 0.01) return;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18;
  ctx.fillStyle = "#0a1022"; caixa(ctx, x, y, w, h, 22); ctx.fill();
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = COR.borda; ctx.lineWidth = 2; ctx.stroke();
  // barra de título
  ctx.fillStyle = "#0e1630"; ctx.beginPath(); ctx.roundRect(x, y, w, 58, [22, 22, 0, 0]); ctx.fill();
  ["#fb7185", "#fbbf24", "#34d399"].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + 34 + i * 26, y + 29, 7.5, 0, 7); ctx.fill(); });
  texto(ctx, arquivo, x + w / 2, y + 30, { tam: 22, cor: COR.fraco, alinha: "center", base: "middle", mono: true });

  const colunas = Math.max(...linhas.map((l) => l.length), 10);
  const topo = y + 58 + 26, util = h - 58 - 52;
  const entrelinha = o.entrelinha || 1.5;
  const tam = Math.min(o.tamMax || 34, util / linhas.length / entrelinha, (w - 150) / (colunas * 0.602));
  const passo = tam * entrelinha, x0 = x + 104;

  // foco atual e anterior, com transição
  let k = -1;
  for (let n = 0; n < focos.length; n++) if (t >= focos[n].t) k = n;
  const atual = k >= 0 ? focos[k] : null, anterior = k > 0 ? focos[k - 1] : null;
  const p = atual ? E.io(fase(t, atual.t, 0.42)) : 0;
  const temFoco = atual && atual.i >= 0;
  if (temFoco) {
    const de = anterior && anterior.i >= 0 ? anterior : atual;
    const yi = lerp(de.i, atual.i, p), yj = lerp(de.j, atual.j, p);
    const fy = topo + yi * passo - 6, fh = (yj - yi + 1) * passo + 4;
    const cor = atual.cor || COR.ciano;
    ctx.fillStyle = comAlfa(cor, 0.13 * (anterior && anterior.i >= 0 ? 1 : p)); caixa(ctx, x + 14, fy, w - 28, fh, 12); ctx.fill();
    ctx.fillStyle = comAlfa(cor, anterior && anterior.i >= 0 ? 1 : p); caixa(ctx, x + 14, fy, 6, fh, 3); ctx.fill();
  }
  linhas.forEach((linha, n) => {
    const yl = topo + n * passo + tam * 0.78;
    let acesa = 1;
    if (temFoco) {
      const dentroAtual = n >= atual.i && n <= atual.j, dentroAntes = anterior && anterior.i >= 0 && n >= anterior.i && n <= anterior.j;
      acesa = lerp(dentroAntes || !anterior || anterior.i < 0 ? 1 : 0.36, dentroAtual ? 1 : 0.36, p);
    }
    texto(ctx, String(n + 1).padStart(2, " "), x + 34, yl, { tam: tam * 0.78, mono: true, cor: COR.apagado, alfa: 0.75 * acesa });
    let cx = x0;
    for (const pedaco of colorir(linha)) {
      texto(ctx, pedaco.s, cx, yl, { tam, mono: true, cor: pedaco.cor, alfa: acesa, italico: pedaco.italico, peso: 450 });
      cx += pedaco.s.length * tam * 0.602;
    }
  });
  // bolinha de execução: mostra em que linha o algoritmo da direita está agora
  if (o.execucao != null && o.execucao >= 0) {
    const ye = topo + o.execucao * passo + passo / 2 - 4;
    ctx.fillStyle = COR.ambar; ctx.shadowColor = COR.ambar; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(x + 84, ye, 6, 0, 7); ctx.fill();
  }
  ctx.restore();
}
/** Converte focos descritos por trechos de texto ({t, de, ate}) em índices de linha. Erro se o trecho sumiu. */
function resolverFocos(nome, linhas, focos) {
  let cursor = 0;
  return focos.map((f) => {
    if (!f.de) return { t: f.t, i: -1, j: -1 };
    const i = linhas.findIndex((l, n) => n >= (f.doInicio ? 0 : cursor) && l.includes(f.de));
    const j = f.ate ? linhas.findIndex((l, n) => n >= i && l.includes(f.ate)) : i;
    if (i < 0 || j < 0) { (window.ERROS = window.ERROS || []).push(`${nome}: trecho de código não encontrado (${f.de} … ${f.ate || ""})`); return { t: f.t, i: -1, j: -1 }; }
    cursor = i + 1;
    return { t: f.t, i, j, cor: f.cor };
  });
}
const linhaDe = (linhas, trecho) => linhas.findIndex((l) => l.includes(trecho));

// ------------------------------------------------------------------ eventos no tempo

/**
 * Liga uma lista de eventos ao relógio. `trechos` = [{de, ate, t0, t1}]: os eventos de `de` até `ate`
 * (sem incluir `ate`) acontecem entre t0 e t1, cada um com duração proporcional ao seu peso `d`.
 * Devolve uma função t -> {k, p}: índice do evento em curso e o quanto ele já andou (0 a 1).
 */
function relogioDeEventos(eventos, trechos) {
  trechos.forEach((s, i) => {
    // trecho sem tempo (a fala passou rápido demais por ali) ou fora de ordem estragaria a animação em silêncio
    if (s.t1 - s.t0 < 0.4 || (i > 0 && s.t0 < trechos[i - 1].t1 - 1e-6)) (window.ERROS = window.ERROS || []).push(`relógio: trecho ${i} com tempo inválido (${s.t0.toFixed(2)} a ${s.t1.toFixed(2)} s, eventos ${s.de} a ${s.ate})`);
  });
  const partes = trechos.map((s) => {
    const acumulado = [0];
    for (let k = s.de; k < s.ate; k++) acumulado.push(acumulado[acumulado.length - 1] + (eventos[k].d || 1));
    return { ...s, acumulado, total: acumulado[acumulado.length - 1] || 1 };
  });
  const relogio = (t) => {
    let fim = { k: partes.length ? partes[0].de : 0, p: 0 };
    for (const s of partes) {
      if (t < s.t0) return fim;
      if (t >= s.t1) { fim = { k: s.ate, p: 0 }; continue; }
      const alvo = ((t - s.t0) / (s.t1 - s.t0)) * s.total;
      let a = 0, b = s.acumulado.length - 2;
      while (a < b) { const m = (a + b + 1) >> 1; if (s.acumulado[m] <= alvo) a = m; else b = m - 1; }
      return { k: s.de + a, p: clamp((alvo - s.acumulado[a]) / ((eventos[s.de + a].d) || 1)) };
    }
    return fim;
  };
  /** Instante em que o evento k começa (ou Infinity, se ele não está em nenhum trecho). */
  relogio.inicio = (k) => {
    for (const s of partes) if (k >= s.de && k < s.ate) return s.t0 + (s.acumulado[k - s.de] / s.total) * (s.t1 - s.t0);
    return Infinity;
  };
  return relogio;
}

/** Selo flutuante com a comparação em curso ("5 > 2"), com a cor do resultado. */
function seloComparacao(ctx, cx, y, a, b, maior, p, rotulos = ["troca", "fica"]) {
  const s = `${a} > ${b}`, w = largura(ctx, s, { tam: 34, peso: 650 }) + 150;
  const k = E.out(clamp(p * 3)), cor = p < 0.45 ? COR.texto : maior ? COR.ambar : COR.verde;
  ctx.save(); ctx.globalAlpha *= k * (1 - E.in(fase(p, 0.88, 0.12)));
  ctx.fillStyle = "rgba(10,16,34,.92)"; caixa(ctx, cx - w / 2, y - 34 - (1 - k) * 10, w, 68, 34); ctx.fill();
  ctx.strokeStyle = comAlfa(p < 0.45 ? COR.borda : maior ? COR.ambar : COR.verde, 1); ctx.lineWidth = 2.5; ctx.stroke();
  texto(ctx, s, cx - w / 2 + 32, y + 12 - (1 - k) * 10, { tam: 34, peso: 650 });
  if (p >= 0.45) texto(ctx, maior ? rotulos[0] : rotulos[1], cx + w / 2 - 30, y + 11 - (1 - k) * 10, { tam: 28, peso: 600, cor, alinha: "right" });
  ctx.restore();
}

/** Ladrilho quadrado com o número dentro. tipo: "pronto" (cor cheia), "copia" (esmaecido), "ativo" (contorno branco) ou "vago". */
function ladrilho(ctx, x, y, lado, valor, f, tipo = "pronto", o = {}) {
  ctx.save(); ctx.globalAlpha *= o.alfa ?? 1;
  const r = lado * 0.2;
  if (tipo === "vago" || valor == null) {
    ctx.strokeStyle = "rgba(148,163,200,.22)"; ctx.lineWidth = 2; ctx.setLineDash([7, 7]); caixa(ctx, x + 1, y + 1, lado - 2, lado - 2, r); ctx.stroke();
    ctx.restore(); return;
  }
  const brilho = tipo === "copia" ? (o.brilhoCopia ?? 0.36) : 1;
  if (tipo === "ativo") { ctx.shadowColor = corValor(f, 1, 0.95); ctx.shadowBlur = 36; }
  if (tipo === "pronto" && o.brilho) { ctx.shadowColor = corValor(f, 1, 0.6); ctx.shadowBlur = o.brilho; }
  const g = ctx.createLinearGradient(0, y, 0, y + lado);
  g.addColorStop(0, corValor(f, brilho * 1.1)); g.addColorStop(1, corValor(f, brilho * 0.78));
  ctx.fillStyle = g; caixa(ctx, x, y, lado, lado, r); ctx.fill();
  ctx.shadowBlur = 0;
  if (tipo === "ativo") { ctx.strokeStyle = "#fff"; ctx.lineWidth = Math.max(3, lado * 0.045); ctx.stroke(); }
  texto(ctx, String(valor), x + lado / 2, y + lado / 2 + lado * 0.03, { tam: lado * 0.48, peso: 700, alinha: "center", base: "middle", cor: tipo === "copia" ? "rgba(238,242,255,.5)" : "rgba(6,10,22,.92)" });
  ctx.restore();
}
