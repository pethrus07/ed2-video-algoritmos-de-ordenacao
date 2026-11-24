"use strict";
// Motor do vídeo: recebe a linha do tempo e os dados, e desenha o quadro de qualquer instante.
//   init(linhaDoTempo, dados)   prepara as cenas
//   render(t)                   desenha o quadro do segundo t
// Cada cena se registra em CENAS com {preparar(c, D), desenhar(ctx, t, c)}; t é o tempo dentro da cena.

const CENAS = {};
let TL = null, D = null, ctx = null;
window.ERROS = window.ERROS || [];

function init(linhaDoTempo, dados) {
  TL = linhaDoTempo; D = dados;
  ctx = document.getElementById("tela").getContext("2d");
  for (const c of TL.cenas) {
    // c.q("nome") devolve o instante (dentro da cena) em que a fala chega naquele ponto
    c.q = (nome) => {
      if (!(nome in c.marcas)) { window.ERROS.push(`cena ${c.id}: marca "${nome}" não existe no roteiro`); return c.dur * 0.5; }
      return c.marcas[nome];
    };
    if (!CENAS[c.id]) { window.ERROS.push(`cena sem desenho: ${c.id}`); continue; }
    CENAS[c.id].preparar?.(c, D);
  }
  return window.ERROS;
}

function render(t) {
  t = clamp(t, 0, TL.duracao - 1e-4);
  const c = TL.cenas.find((x) => t >= x.ini && t < x.ini + x.dur) || TL.cenas[TL.cenas.length - 1];
  const local = t - c.ini;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.shadowColor = "transparent"; ctx.letterSpacing = "0px";
  fundo(ctx, t);
  // cada cena entra e sai com um fade curto sobre o fundo, que nunca para
  const entrada = c === TL.cenas[0] ? 1 : E.out(fase(local, 0, 0.4));
  const saida = c === TL.cenas[TL.cenas.length - 1] ? 1 : 1 - E.in(fase(local, c.dur - 0.32, 0.32));
  ctx.save(); ctx.globalAlpha = entrada * saida;
  if (CENAS[c.id]) CENAS[c.id].desenhar(ctx, local, c);
  ctx.restore();
  hud(ctx, t, c);
}

/** Moldura fixa: identificação do trabalho no canto e a barra de progresso com um tique por capítulo. */
function hud(ctx, t, c) {
  if (c.id !== "abertura" && c.id !== "fecho") {
    texto(ctx, "Estruturas de Dados 2 · Unipê · Prof. Ed", W - 120, 122, { tam: 21, cor: COR.apagado, alinha: "right", espaco: 1.5 });
  }
  const y = H - 10;
  ctx.fillStyle = "rgba(148,163,200,.14)"; ctx.fillRect(0, y, W, 10);
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, COR.ciano); g.addColorStop(0.5, COR.indigo); g.addColorStop(1, COR.fucsia);
  ctx.fillStyle = g; ctx.fillRect(0, y, W * (t / TL.duracao), 10);
  ctx.fillStyle = "rgba(7,11,22,.9)";
  for (const x of TL.cenas.slice(1)) ctx.fillRect(W * (x.ini / TL.duracao) - 2, y, 4, 10);
}
