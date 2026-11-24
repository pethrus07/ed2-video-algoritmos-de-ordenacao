"use strict";
// Os três algoritmos reescritos em JavaScript, linha por linha iguais aos de src/Ordenacao.java, mas
// anotando cada comparação e cada movimento. A animação reproduz essas anotações.
// O número de comparações de cada traço é conferido contra o que o programa Java mediu (ver construir.mjs).

/**
 * Bubble Sort com identidade: cada elemento tem um id fixo, para a barra poder viajar pela tela.
 * Devolve {eventos, antes}: antes[k] é a situação imediatamente antes do evento k (antes[n] é o fim).
 */
function tracoBubble(valores) {
  const a = valores.map((v, id) => ({ id, v })), n = a.length, eventos = [], antes = [];
  const certos = new Array(n).fill(false);
  let comps = 0, trocas = 0, passada = 0;
  const foto = () => antes.push({ ordem: a.map((e) => e.id), certos: certos.slice(), comps, trocas, passada });
  for (passada = 0; passada < n - 1; passada++) {
    let trocou = false;
    for (let j = 0; j < n - 1 - passada; j++) {
      const maior = a[j].v > a[j + 1].v;
      foto(); eventos.push({ tipo: "cmp", a: j, b: j + 1, maior, d: 1, linha: "cmp" }); comps++;
      if (maior) {
        foto(); eventos.push({ tipo: "troca", a: j, b: j + 1, d: 1.15, linha: "troca" });
        [a[j], a[j + 1]] = [a[j + 1], a[j]]; trocas++; trocou = true;
      }
    }
    foto(); eventos.push({ tipo: "trava", slot: n - 1 - passada, d: 0.7, linha: "fimPassada" });
    certos[a[n - 1 - passada].id] = true;
    if (!trocou) { passada++; break; }
  }
  foto(); eventos.push({ tipo: "travaTudo", d: 1.2, linha: "fim" });
  certos.fill(true);
  foto();
  return { eventos, antes, n, comps };
}

/** Insertion Sort com identidade. A chave sai da fila (deixa um buraco) e volta no lugar certo. */
function tracoInsertion(valores) {
  const n = valores.length, eventos = [], antes = [];
  const ordem = valores.map((_, id) => id);
  let chave = null, buraco = null, prontos = 1, comps = 0, movs = 0;
  const foto = () => antes.push({ ordem: ordem.slice(), chave, buraco, prontos, comps, movs });
  for (let i = 1; i < n; i++) {
    foto(); eventos.push({ tipo: "pega", i, d: 0.9, linha: "chave" });
    chave = ordem[i]; ordem[i] = null; buraco = i;
    let j = i - 1;
    while (j >= 0) {
      const maior = valores[ordem[j]] > valores[chave];
      foto(); eventos.push({ tipo: "cmp", j, maior, d: 0.85, linha: "while" }); comps++;
      if (!maior) break;
      foto(); eventos.push({ tipo: "desloca", j, d: 0.8, linha: "desloca" });
      ordem[j + 1] = ordem[j]; ordem[j] = null; buraco = j; movs++; j--;
    }
    foto(); eventos.push({ tipo: "solta", pos: j + 1, d: 0.95, linha: "solta" });
    ordem[j + 1] = chave; chave = null; buraco = null; prontos = i + 1;
  }
  foto();
  return { eventos, antes, n, comps };
}

/** Árvore de chamadas do Merge Sort para n elementos: os mesmos cortes do Java (meio = inicio + (fim - inicio) / 2). */
function arvoreMerge(inicio, fim, nivel = 0) {
  const no = { inicio, fim, nivel };
  if (inicio < fim) {
    const meio = inicio + Math.floor((fim - inicio) / 2);
    no.meio = meio; no.esq = arvoreMerge(inicio, meio, nivel + 1); no.dir = arvoreMerge(meio + 1, fim, nivel + 1);
  }
  return no;
}

/** Intercala duas listas ordenadas anotando cada comparação. Devolve {saida, passos, comps}. */
function intercalarAnotado(esq, dir) {
  const saida = [], passos = []; let i = 0, j = 0, comps = 0;
  while (i < esq.length && j < dir.length) {
    comps++;
    const pegaDireita = esq[i] > dir[j];
    passos.push({ tipo: "cmp", i, j, pegaDireita });
    if (pegaDireita) { passos.push({ tipo: "leva", lado: "dir", indice: j, para: saida.length }); saida.push(dir[j++]); }
    else { passos.push({ tipo: "leva", lado: "esq", indice: i, para: saida.length }); saida.push(esq[i++]); }
  }
  while (i < esq.length) { passos.push({ tipo: "leva", lado: "esq", indice: i, para: saida.length, sobra: true }); saida.push(esq[i++]); }
  while (j < dir.length) { passos.push({ tipo: "leva", lado: "dir", indice: j, para: saida.length, sobra: true }); saida.push(dir[j++]); }
  return { saida, passos, comps };
}

// ------------------------------------------------------------------ corrida: um quadro por comparação

/** Cada função devolve {quadros: [{v, ativos, prontos}], comps}. quadros[k] é a tela depois de k comparações. */
function corridaBubble(valores) {
  const v = valores.slice(), n = v.length, quadros = [{ v: v.slice(), ativos: [], prontos: 0 }];
  for (let passada = 0; passada < n - 1; passada++) {
    let trocou = false;
    for (let j = 0; j < n - 1 - passada; j++) {
      if (v[j] > v[j + 1]) { [v[j], v[j + 1]] = [v[j + 1], v[j]]; trocou = true; }
      quadros.push({ v: v.slice(), ativos: [j, j + 1], prontos: passada });
    }
    if (!trocou) break;
  }
  quadros.push({ v: v.slice(), ativos: [], prontos: n });
  return { quadros, comps: quadros.length - 2 };
}
function corridaInsertion(valores) {
  const v = valores.slice(), n = v.length, quadros = [{ v: v.slice(), ativos: [], prontos: 0 }];
  for (let i = 1; i < n; i++) {
    const chave = v[i]; let j = i - 1;
    while (j >= 0) {
      const maior = v[j] > chave;
      if (maior) { v[j + 1] = v[j]; v[j] = chave; }
      quadros.push({ v: v.slice(), ativos: maior ? [j, j + 1] : [j, j + 1], prontos: 0, faixa: i });
      if (!maior) break;
      j--;
    }
  }
  quadros.push({ v: v.slice(), ativos: [], prontos: n });
  return { quadros, comps: quadros.length - 2 };
}
function corridaMerge(valores) {
  const v = valores.slice(), n = v.length, aux = new Array(n), quadros = [{ v: v.slice(), ativos: [], prontos: 0 }];
  (function ordena(inicio, fim) {
    if (inicio >= fim) return;
    const meio = inicio + Math.floor((fim - inicio) / 2);
    ordena(inicio, meio); ordena(meio + 1, fim);
    let i = inicio, j = meio + 1, k = inicio;
    const tela = () => {
      // o que já foi intercalado, seguido do que ainda falta de cada metade: sempre uma permutação
      const t = v.slice(); const trecho = aux.slice(inicio, k).concat(v.slice(i, meio + 1), v.slice(j, fim + 1));
      for (let x = 0; x < trecho.length; x++) t[inicio + x] = trecho[x];
      return t;
    };
    while (i <= meio && j <= fim) {
      if (v[i] > v[j]) aux[k++] = v[j++]; else aux[k++] = v[i++];
      quadros.push({ v: tela(), ativos: [k - 1, Math.min(fim, k + (meio - i + 1))], prontos: 0, faixa: [inicio, fim] });
    }
    while (i <= meio) aux[k++] = v[i++];
    while (j <= fim) aux[k++] = v[j++];
    for (k = inicio; k <= fim; k++) v[k] = aux[k];
    quadros[quadros.length - 1].v = v.slice();
  })(0, n - 1);
  quadros.push({ v: v.slice(), ativos: [], prontos: n });
  return { quadros, comps: quadros.length - 2 };
}
