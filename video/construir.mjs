// Linha de produção do vídeo. Cada etapa lê o que a anterior deixou em video/trabalho/.
//
//   node video/construir.mjs gravar     grava a janela do Windows Terminal compilando e rodando os programas (1 minuto)
//   node video/construir.mjs dados      compila o Java e guarda os números, o código e os dados da gravação
//   node video/construir.mjs falas      escreve o texto de cada cena para o narrador (video/NARRACAO.md)
//   node video/construir.mjs audio      prepara o áudio de cada cena (o real, se existir; senão uma prévia sintética)
//   node video/construir.mjs importar <pasta>  recebe os áudios do narrador e descobre a cena de cada um
//   node video/construir.mjs palavras   transcreve cada áudio com o instante de cada palavra (sincronia)
//   node video/construir.mjs tempo      monta a linha do tempo a partir da duração de cada áudio
//   node video/construir.mjs amostra 12.5,40   grava quadros desses instantes em trabalho/amostras/
//   node video/construir.mjs amostra marcas    um quadro logo depois de cada ponto de sincronia
//   node video/construir.mjs legendas   escreve as legendas (.srt) com os tempos da voz
//   node video/construir.mjs render     renderiza o vídeo inteiro (trabalho/video.mp4)
//   node video/construir.mjs tudo       todas as etapas, na ordem (menos gravar, que usa a tela)
//
// FPS=60 e QUADRO=png dão o render final: 60 quadros por segundo, sem a perda do JPEG entre o navegador e o ffmpeg.
//
// Áudio real: um arquivo por cena em video/narracao/, com o número da cena no começo do nome
// (01.ogg, 02.ogg ...). Qualquer formato que o ffmpeg leia serve. Sem o arquivo, a cena usa a prévia.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CENAS, TITULO, DUPLA, NARRADOR, REPOSITORIO, falaLimpa } from "./roteiro.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, "..");
const TRAB = path.join(AQUI, "trabalho");
const FPS = Number(process.env.FPS || 30), EM_PNG = process.env.QUADRO === "png", ATRASO = 0.5, CAUDA = 0.85; // a fala começa meio segundo depois da cena e a cena dura um pouco além dela
const num = (i) => String(i + 1).padStart(2, "0");
const ler = (arq) => JSON.parse(fs.readFileSync(path.join(TRAB, arq), "utf8"));
const gravar = (arq, obj) => { fs.mkdirSync(path.dirname(path.join(TRAB, arq)), { recursive: true }); fs.writeFileSync(path.join(TRAB, arq), JSON.stringify(obj, null, 1), "utf8"); };
function rodar(cmd, args, opcoes = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 28, ...opcoes });
  if (r.status !== 0) throw new Error(`${cmd} ${args.slice(0, 4).join(" ")} falhou:\n${(r.stderr || r.stdout || "").slice(-1500)}`);
  return r.stdout;
}
const duracaoDe = (arq) => parseFloat(rodar("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", arq]));

// ------------------------------------------------------------------ dados

function extrairMetodo(fonte, assinatura) {
  const linhas = fonte.split(/\r?\n/), inicio = linhas.findIndex((l) => l.trim().startsWith(assinatura));
  if (inicio < 0) throw new Error("assinatura não encontrada no Java: " + assinatura);
  const recuo = linhas[inicio].length - linhas[inicio].trimStart().length;
  const fim = linhas.findIndex((l, i) => i > inicio && l.startsWith(" ".repeat(recuo) + "}") && l.trimEnd().length === recuo + 1);
  // saem só as chamadas de mostrar(), que existem para o terminal e não fazem parte do algoritmo
  return linhas.slice(inicio, fim + 1).map((l) => l.slice(recuo).trimEnd()).filter((l) => !l.trim().startsWith("mostrar(")).join("\n");
}

async function etapaDados() {
  const fontes = fs.readdirSync(path.join(RAIZ, "src")).filter((f) => f.endsWith(".java")).map((f) => path.join(RAIZ, "src", f));
  rodar("javac", ["-encoding", "UTF-8", "-d", path.join(RAIZ, "out"), ...fontes]);
  const d = { titulo: TITULO, dupla: DUPLA, narrador: NARRADOR, repositorio: REPOSITORIO, comparacoes8: {}, comparacoes64: {}, escala: {}, casos: {} };
  for (const linha of rodar("java", ["-cp", path.join(RAIZ, "out"), "Demonstracao", "--dados"]).split(/\r?\n/)) {
    const [chave, valor] = linha.split("=");
    if (!valor) continue;
    const p = chave.split(".");
    if (p[0] === "vetor8" || p[0] === "vetor64") d[p[0]] = valor.split(",").map(Number);
    else if (p[0] === "comparacoes8" || p[0] === "comparacoes64") d[p[0]][p[1]] = Number(valor);
    else if (p[0] === "escala") ((d.escala[p[1]] ??= {})[p[2]] ??= {})[p[3]] = Number(valor);
    else if (p[0] === "casos") (d.casos[p[1]] ??= {})[p[2]] = Number(valor);
  }
  const java = fs.readFileSync(path.join(RAIZ, "src", "Ordenacao.java"), "utf8");
  d.codigo = {
    bubble: extrairMetodo(java, "public static void bubbleSort(int[] v)"),
    insertion: extrairMetodo(java, "public static void insertionSort(int[] v)"),
    mergeSort: extrairMetodo(java, "private static void mergeSort(int[] v, int[] aux,"),
    intercalar: extrairMetodo(java, "private static void intercalar(int[] v, int[] aux,"),
  };
  // A sessão do terminal é a gravação de verdade (etapa gravar). Os números em escala do gráfico saem
  // dela: o gráfico e o terminal do vídeo mostram a MESMA execução.
  const g = lerGravacao();
  if (!g) throw new Error("falta a gravação do terminal: rode `node video/construir.mjs gravar`");
  for (const e of g.eventos.filter((x) => x.nome === "mediu")) (d.escala[e.n] ??= {})[e.algoritmo] = { comparacoes: e.comparacoes, ms: e.ms };
  if (!d.escala[100000] || Object.keys(d.escala[100000]).length !== 3) throw new Error("a gravação do terminal não tem a medição em escala (cena 4)");
  const saidaDe = (fim) => g.comandos.find((c) => c.comando.endsWith(fim)).linhas.map((l) => l.texto);
  d.passadas8 = saidaDe("Demonstracao").filter((l) => /^\s+passada \d/.test(l)).length;
  d.testes = saidaDe("Testes").filter(Boolean).pop() || "";
  d.gravacao = { pasta: "trabalho/terminal/quadros", largura: g.largura, altura: g.altura, celula: g.celula, colunas: g.colunas,
    linhas: g.eventos.find((e) => e.nome === "tamanho").linhas, quadros: g.quadros, eventos: g.eventos };
  // a fala só pode dizer número que o programa mediu
  const falhas = CENAS.flatMap((c) => (c.confere ? c.confere(d) : []).filter(([ok]) => !ok).map(([, oque]) => `${c.id}: ${oque}`));
  gravar("dados.json", d);
  console.log(`dados: vetor8 [${d.vetor8}], corrida ${JSON.stringify(d.comparacoes64)}, 100 mil: bubble ${d.escala[100000].bubble.ms} ms, merge ${d.escala[100000].merge.ms} ms`);
  console.log(`terminal: gravação com ${g.quadros.length} quadros; ${d.passadas8} passadas no vetor de 8; testes: ${d.testes}`);
  if (falhas.length) throw new Error("a fala não bate com o que o programa mediu:\n  " + falhas.join("\n  "));
}

// ------------------------------------------------------------------ gravação do terminal

const PASTA_TERMINAL = path.join(TRAB, "terminal");
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
/** Lê um quadro como tons de cinza (um byte por ponto), opcionalmente reduzido. */
function cinza(arq, divisor = 1) {
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", arq, "-vf", `scale=iw/${divisor}:ih/${divisor}:flags=area,format=gray`, "-f", "rawvideo", "-"], { maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error("não consegui ler o quadro " + arq);
  return r.stdout;
}

/**
 * Grava a execução real: abre uma janela do Windows Terminal, o ffmpeg grava só essa janela e, dentro dela,
 * video/ferramentas/sessao.mjs compila e roda os programas. Sai daqui a gravação quadro a quadro e o
 * registro do instante de cada acontecimento, já no relógio da gravação.
 */
async function etapaGravar() {
  const titulo = "ED2 Ordenacao", registro = path.join(PASTA_TERMINAL, "sessao.json"), bruto = path.join(PASTA_TERMINAL, "sessao.mkv"), quadros = path.join(PASTA_TERMINAL, "quadros");
  // a gravação anterior fica guardada ao lado, para o caso de esta não sair boa
  const anterior = PASTA_TERMINAL + "-anterior";
  if (fs.existsSync(path.join(PASTA_TERMINAL, "gravacao.json"))) { fs.rmSync(anterior, { recursive: true, force: true }); fs.renameSync(PASTA_TERMINAL, anterior); }
  fs.rmSync(PASTA_TERMINAL, { recursive: true, force: true }); fs.mkdirSync(quadros, { recursive: true });
  // Letra grande (o enunciado pede código legível até no celular): 82 colunas por 20 linhas.
  // Em monitor comum (100%) a letra vem de um perfil temporário do Windows Terminal, corpo 24, criado aqui e
  // apagado no fim. Em monitor de alta densidade (250%) o corpo padrão já dá mais de 40 pontos por linha:
  // CORPO=0 grava com o perfil padrão, sem perfil temporário.
  const colunas = Number(process.env.COLUNAS || 82), linhas = Number(process.env.LINHAS || 20), perfil = "ED2 Gravacao";
  const corpo = Number(process.env.CORPO ?? 24), comPerfil = corpo > 0;
  const pastaPerfil = path.join(process.env.LOCALAPPDATA, "Microsoft", "Windows Terminal", "Fragments", "ed2-video");
  if (comPerfil) {
    fs.mkdirSync(pastaPerfil, { recursive: true });
    fs.writeFileSync(path.join(pastaPerfil, "perfil.json"), JSON.stringify({ profiles: [{ guid: "{2f6d0c1e-8a4b-5c37-9e21-ed2000000001}", name: perfil, commandline: "cmd.exe",
      font: { face: "Cascadia Mono", size: corpo }, colorScheme: "Campbell", padding: "14", cursorShape: "bar" }] }, null, 1), "utf8");
  }
  // O Windows Terminal só desenha a janela enquanto ela está visível: ela fica sempre por cima durante a
  // gravação (POSICAO escolhe o canto, em pontos físicos da tela) e o teclado volta para a janela anterior.
  const apoio = spawn("pwsh", ["-NoProfile", "-File", path.join(AQUI, "ferramentas", "janela.ps1"), "-Titulo", titulo], { stdio: ["ignore", "pipe", "inherit"] });
  let dito = ""; apoio.stdout.on("data", (b) => (dito += b));
  for (let i = 0; i < 100 && !dito.includes("pronto"); i++) await espera(100);
  // O Windows Terminal calcula o tamanho inicial da janela pela letra do perfil padrão (corpo 12), e não pela
  // do perfil pedido: para caberem 82x20 em corpo 24 é preciso pedir 175x41 (medido com SONDA=1).
  spawn("wt.exe", ["-w", "new", "--pos", process.env.POSICAO || "0,0", "--size", comPerfil ? process.env.PEDIDO || "175,41" : `${colunas},${linhas}`, "new-tab", ...(comPerfil ? ["-p", perfil] : ["--colorScheme", "Campbell"]), "--title", titulo, "--suppressApplicationTitle",
    "-d", RAIZ, "node", path.join(AQUI, "ferramentas", "sessao.mjs"), registro, RAIZ, ...(process.env.SONDA ? ["sonda"] : [])], { detached: true, stdio: "ignore" }).unref();
  for (let i = 0; i < 150 && !/retangulo=/.test(dito) && !/não apareceu/.test(dito); i++) await espera(50);
  const medida = (nome) => { const m = new RegExp(nome + "=(-?\\d+),(-?\\d+),(\\d+),(\\d+)").exec(dito); if (!m) throw new Error("a janela do terminal não apareceu: " + dito.trim()); return m.slice(1).map(Number); };
  const [mx, my, mw, mh] = medida("monitor"), [jx, jy, jw, jh] = medida("retangulo");
  // qual saída de vídeo é esse monitor: a que tem o mesmo tamanho
  let saidaDeVideo = -1;
  for (let k = 0; k < 4 && saidaDeVideo < 0; k++) {
    const sonda = spawnSync("ffmpeg", ["-hide_banner", "-f", "lavfi", "-i", `ddagrab=output_idx=${k}:draw_mouse=0`, "-frames:v", "1", "-f", "null", "-"], { encoding: "utf8" }).stderr || "";
    if (new RegExp(`\\b${mw}x${mh}\\b`).test(sonda)) saidaDeVideo = k;
  }
  if (saidaDeVideo < 0) throw new Error(`não achei a saída de vídeo do monitor de ${mw}x${mh}`);
  const par = (n) => n - (n % 2);
  const ff = spawn("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", `ddagrab=output_idx=${saidaDeVideo}:offset_x=${jx - mx}:offset_y=${jy - my}:video_size=${par(jw)}x${par(jh)}:framerate=30:draw_mouse=0`,
    "-vf", "hwdownload,format=bgra", "-c:v", "libx264rgb", "-preset", "ultrafast", "-qp", "0", bruto], { stdio: ["pipe", "inherit", "pipe"] });
  let erroFf = ""; ff.stderr.on("data", (b) => (erroFf += b));
  const acabou = new Promise((r) => ff.on("close", r));
  const limite = Date.now() + 240000;
  while (!fs.existsSync(registro) && Date.now() < limite && ff.exitCode == null) { process.stdout.write(`\rgravar: sessão em curso (${Math.round((Date.now() - (limite - 240000)) / 1000)} s)   `); await espera(500); }
  await espera(900);
  if (ff.exitCode == null) { ff.stdin.write("q"); ff.stdin.end(); }
  await acabou;
  fs.rmSync(pastaPerfil, { recursive: true, force: true });
  await limparPerfilTemporario();
  processarGravacao({ colunas, linhas, erroFf, monitor: `${mw}x${mh} (saída ${saidaDeVideo})` });
}

/**
 * Da gravação bruta para o que a animação usa: só os quadros em que a tela mudou, cada um com o seu
 * instante, a medida da letra e o registro de eventos no relógio da gravação. Confere também se a
 * gravação presta. `node video/construir.mjs processar-gravacao` refaz esta parte sem gravar de novo.
 */
function processarGravacao({ colunas = Number(process.env.COLUNAS || 82), linhas = Number(process.env.LINHAS || 20), erroFf = "", monitor = "?" } = {}) {
  const registro = path.join(PASTA_TERMINAL, "sessao.json"), bruto = path.join(PASTA_TERMINAL, "sessao.mkv"), quadros = path.join(PASTA_TERMINAL, "quadros");
  if (!fs.existsSync(registro)) throw new Error("a sessão do terminal não terminou. ffmpeg: " + erroFf.slice(-600));
  const sessao = JSON.parse(fs.readFileSync(registro, "utf8"));
  if (sessao.erro) throw new Error("a sessão do terminal falhou: " + sessao.erro);
  if (!fs.existsSync(bruto) || fs.statSync(bruto).size < 50000) throw new Error("a gravação da janela não saiu. ffmpeg: " + erroFf.slice(-600));

  // só os quadros em que a tela mudou, cada um com o seu instante
  fs.rmSync(quadros, { recursive: true, force: true }); fs.mkdirSync(quadros, { recursive: true });
  const info = spawnSync("ffmpeg", ["-y", "-hide_banner", "-i", bruto, "-vf", "mpdecimate,showinfo", "-fps_mode", "vfr", "-q:v", "2", path.join(quadros, "%05d.jpg")], { encoding: "utf8", maxBuffer: 1 << 28 }).stderr;
  const tempos = [...info.matchAll(/pts_time:([\d.]+)/g)].map((m) => Number(m[1])), arquivos = fs.readdirSync(quadros).sort();
  if (!arquivos.length || arquivos.length !== tempos.length) throw new Error(`quadros (${arquivos.length}) e instantes (${tempos.length}) não batem`);
  const [largura, altura] = rodar("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", bruto]).trim().split(",").map(Number);

  // o sinal de sincronia: a faixa clara de 80 colunas na primeira linha. Dá o instante zero e o tamanho da célula.
  let sinal = -1;
  for (let i = 0; i < arquivos.length && tempos[i] < 15; i++) {
    const g = cinza(path.join(quadros, arquivos[i]), 4);
    let claros = 0; for (let k = 0; k < g.length; k++) if (g[k] > 170) claros++;
    if (claros > g.length * 0.006 && claros < g.length * 0.2) { sinal = i; break; }
  }
  if (sinal < 0) throw new Error("não achei o sinal de sincronia na gravação");
  const tamanho = sessao.eventos.find((e) => e.nome === "tamanho"), desvio = tempos[sinal] - sessao.eventos.find((e) => e.nome === "sinal").t;
  const g = cinza(path.join(quadros, arquivos[sinal])), porLinha = new Array(altura).fill(0), porColuna = new Array(largura).fill(0);
  for (let y = 0; y < altura; y++) for (let x = 0; x < largura; x++) if (g[y * largura + x] > 170) { porLinha[y]++; porColuna[x]++; }
  const cheias = porLinha.map((n, y) => (n > largura * 0.5 ? y : -1)).filter((y) => y >= 0), y0 = cheias[0], y1 = cheias[cheias.length - 1];
  const colunasClaras = porColuna.map((n, x) => (n > (y1 - y0 + 1) * 0.6 ? x : -1)).filter((x) => x >= 0), x0 = colunasClaras[0], x1 = colunasClaras[colunasClaras.length - 1];
  const celula = { x: x0, y: y0, w: (x1 - x0 + 1) / 80, h: y1 - y0 + 1 };
  if (!Number.isFinite(celula.w) || !Number.isFinite(celula.h)) throw new Error("não consegui medir a letra do terminal pelo sinal de sincronia: algo cobriu a janela");
  if (process.env.SONDA) { console.log(`\rsonda: janela de ${largura}x${altura} px no monitor de ${monitor}; o terminal diz ${tamanho.colunas}x${tamanho.linhas}; célula de ${celula.w.toFixed(1)}x${celula.h} px; ${arquivos.length} quadros distintos em ${tempos[tempos.length - 1].toFixed(1)} s`); return; }

  if (tamanho.colunas !== colunas || tamanho.linhas !== linhas) throw new Error(`a janela abriu com ${tamanho.colunas}x${tamanho.linhas}, e o esperado era ${colunas}x${linhas}`);
  // a tela tem de ter rolado: um clique na janela cria uma seleção e o terminal para de acompanhar a saída
  const noInstante = (t) => { let k = 0; for (let i = 0; i < tempos.length; i++) if (tempos[i] <= t) k = i; return cinza(path.join(quadros, arquivos[k]), 8); };
  const a = noInstante(sessao.eventos.find((e) => e.nome === "pausa").t + desvio + 0.4), b = cinza(path.join(quadros, arquivos[arquivos.length - 1]), 8);
  let diferenca = 0; for (let k = 0; k < a.length; k++) diferenca += Math.abs(a[k] - b[k]);
  if (diferenca / a.length < 1.5) throw new Error("a janela do terminal não rolou até o fim da sessão (alguém clicou nela durante a gravação?): grave de novo");
  if (arquivos.length > 900) throw new Error(`a área gravada teve movimento demais (${arquivos.length} quadros distintos): outra janela ficou por cima do terminal`);
  const gravacao = {
    largura, altura, celula, colunas, linhas,
    quadros: arquivos.map((arq, i) => ({ t: +tempos[i].toFixed(3), arq })),
    eventos: sessao.eventos.map((e) => ({ ...e, t: +(e.t + desvio).toFixed(3) })),
    comandos: sessao.comandos.map((c) => ({ comando: c.comando, linhas: c.linhas.map((l) => ({ t: +(l.t + desvio).toFixed(3), texto: l.texto })) })),
  };
  gravar(path.join("terminal", "gravacao.json"), gravacao);
  const mediu = gravacao.eventos.filter((e) => e.nome === "mediu" && e.n === 100000).map((e) => `${e.algoritmo} ${e.ms} ms`).join(", ");
  console.log(`\rgravar: janela de ${largura}x${altura}, célula de ${celula.w.toFixed(1)}x${celula.h} px, ${linhas} linhas; ${arquivos.length} quadros distintos em ${tempos[tempos.length - 1].toFixed(1)} s; 100 mil: ${mediu}`);
}
/**
 * O Windows Terminal anota em settings.json e em state.json todo perfil que encontra. Depois da gravação,
 * tira de lá a anotação do perfil temporário, para a configuração da pessoa ficar como estava.
 */
async function limparPerfilTemporario() {
  const aberto = () => (spawnSync("tasklist", ["/FI", "IMAGENAME eq WindowsTerminal.exe", "/NH"], { encoding: "utf8" }).stdout || "").includes("WindowsTerminal.exe");
  for (let i = 0; i < 48 && aberto(); i++) await espera(250);
  if (aberto()) { console.log("\naviso: o Windows Terminal continua aberto; o perfil temporário \"ED2 Gravacao\" ficou anotado em settings.json (rode `node video/construir.mjs limpar-perfil` com ele fechado)"); return; }
  const base = path.join(process.env.LOCALAPPDATA, "Packages", "Microsoft.WindowsTerminal_8wekyb3d8bbwe", "LocalState");
  for (const [arq, padrao] of [["settings.json", /,\s*\{\s*"guid"\s*:\s*"\{2f6d0c1e-8a4b-5c37-9e21-ed2000000001\}"[^{}]*\}/], ["state.json", /,\s*"\{2f6d0c1e-8a4b-5c37-9e21-ed2000000001\}"/]]) {
    const caminho = path.join(base, arq);
    if (!fs.existsSync(caminho)) continue;
    const antes = fs.readFileSync(caminho, "utf8"), depois = antes.replace(padrao, "");
    if (depois !== antes) fs.writeFileSync(caminho, depois, "utf8");
  }
}
const lerGravacao = () => (fs.existsSync(path.join(PASTA_TERMINAL, "gravacao.json")) ? ler(path.join("terminal", "gravacao.json")) : null);

// ------------------------------------------------------------------ falas

function etapaFalas() {
  let md = `# Narração · ${TITULO}\n\nTrabalho de Estruturas de Dados 2 (Unipê, Prof. Ed) · ${DUPLA}\n\n` +
    `São ${CENAS.length} trechos. Grave **um áudio por trecho**, na ordem, e mande com o número no nome (01, 02 ...).\n\n` +
    `- Fale no seu ritmo normal, como se explicasse para um colega. Não precisa decorar: pode ler.\n` +
    `- Errou? Pare, respire e repita a frase inteira. O trecho ruim é cortado depois.\n` +
    `- Lugar silencioso, celular a um palmo da boca, sem ventilador ligado perto.\n` +
    `- "n ao quadrado" e "n log n" se leem assim mesmo. "Unipê" com a tônica no "pê".\n\n`;
  CENAS.forEach((c, i) => {
    const limpa = falaLimpa(c.fala), palavras = limpa.split(" ").length;
    fs.mkdirSync(path.join(TRAB, "falas"), { recursive: true });
    fs.writeFileSync(path.join(TRAB, "falas", `${num(i)}-${c.id}.txt`), limpa, "utf8");
    md += `## ${num(i)} · ${c.capitulo}\n\n` + c.fala.replace(/\{\{\w+\}\}\s*/g, "").split("\n").map((l) => l.trim()).filter(Boolean).join("\n\n") + `\n\n_${palavras} palavras, perto de ${Math.round(palavras / 2.4)} segundos._\n\n`;
  });
  fs.writeFileSync(path.join(AQUI, "NARRACAO.md"), md, "utf8");
  const total = CENAS.reduce((s, c) => s + falaLimpa(c.fala).split(" ").length, 0);
  console.log(`falas: ${CENAS.length} trechos, ${total} palavras (perto de ${(total / 2.4 / 60).toFixed(1)} min de fala)`);
}

// ------------------------------------------------------------------ áudio

const venv = (nome) => path.join(os.homedir(), ".venvs", nome, "Scripts", "python.exe");

function etapaAudio() {
  const reais = fs.existsSync(path.join(AQUI, "narracao")) ? fs.readdirSync(path.join(AQUI, "narracao")) : [];
  fs.mkdirSync(path.join(TRAB, "audio"), { recursive: true });
  const real = CENAS.map((c, i) => reais.find((f) => f.startsWith(num(i)) && !f.endsWith(".txt")));
  if (real.some((r) => !r)) {
    // prévia com voz sintética LOCAL (Kokoro): o texto não sai da máquina
    const py = process.env.PYTHON_TTS || venv("tts");
    if (!fs.existsSync(py)) throw new Error("sem voz local para a prévia (esperava " + py + "). Grave os áudios em video/narracao/ ou defina PYTHON_TTS.");
    process.stdout.write(rodar(py, [path.join(AQUI, "ferramentas", "voz_previa.py"), path.join(TRAB, "falas"), path.join(TRAB, "previa")], { env: { ...process.env, HF_HUB_OFFLINE: "1", PYTHONIOENCODING: "utf-8" } }));
  }
  CENAS.forEach((c, i) => {
    const fonte = real[i] ? path.join(AQUI, "narracao", real[i]) : path.join(TRAB, "previa", `${num(i)}-${c.id}.wav`);
    // 48 kHz, mono, sem o silêncio das pontas (cada cena já tem a própria folga)
    rodar("ffmpeg", ["-y", "-v", "error", "-i", fonte, "-af",
      "highpass=f=70,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12,areverse",
      "-ar", "48000", "-ac", "1", path.join(TRAB, "audio", `${num(i)}-${c.id}.wav`)]);
  });
  gravar("origem-do-audio.json", real.map((r) => (r ? "real" : "prévia")));
  console.log(`áudio: ${real.filter(Boolean).length} cenas com narração real, ${real.filter((r) => !r).length} com prévia sintética`);
}

/** Transcreve cada áudio com o instante de cada palavra, para a animação acompanhar a fala. */
function etapaPalavras() {
  const py = process.env.PYTHON_WHISPER || venv("faster-whisper");
  if (!fs.existsSync(py)) { console.log("palavras: sem faster-whisper; as marcas ficam pela posição no texto"); return; }
  process.stdout.write(rodar(py, [path.join(AQUI, "ferramentas", "palavras.py"), path.join(TRAB, "audio"), path.join(TRAB, "palavras")], { env: { ...process.env, PYTHONIOENCODING: "utf-8" } }));
}

// ------------------------------------------------------------------ tempo

const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/** Instante de cada marca dentro do áudio: pela transcrição com tempos, se houver; senão pela posição no texto. */
function marcasDaCena(c, i, duracaoAudio) {
  const partes = c.fala.split(/\{\{(\w+)\}\}/), marcas = {}, tempos = {}, cortes = {}, total = falaLimpa(c.fala).length;
  const arqPalavras = path.join(TRAB, "palavras", `${num(i)}-${c.id}.json`);
  const palavras = fs.existsSync(arqPalavras) ? JSON.parse(fs.readFileSync(arqPalavras, "utf8")) : null;
  let antes = "", pelaVoz = 0;
  for (let p = 0; p < partes.length; p++) {
    if (p % 2 === 0) { antes += partes[p]; continue; }
    const estimado = (falaLimpa(antes).length / total) * duracaoAudio;
    let t = estimado;
    if (palavras) {
      const alvo = semAcento(partes[p + 1] || "").split(" ").slice(0, 4);
      let melhor = null;
      palavras.forEach((w, k) => {
        if (Math.abs(w.ini - estimado) > 7) return;
        let iguais = 0;
        for (let x = 0; x < alvo.length; x++) if (palavras[k + x] && semAcento(palavras[k + x].texto) === alvo[x]) iguais++;
        const nota = iguais - Math.abs(w.ini - estimado) * 0.08;
        if (iguais >= Math.min(2, alvo.length) && (!melhor || nota > melhor.nota)) melhor = { nota, t: w.ini, k };
      });
      if (melhor) { t = melhor.t; pelaVoz++; }
      // onde o áudio pode ser cortado antes desta marca: no meio do silêncio que a antecede
      cortes[partes[p]] = melhor && melhor.k > 0 ? +((palavras[melhor.k - 1].fim + melhor.t) / 2).toFixed(3) : Math.max(0, +(t - 0.08).toFixed(3));
    } else cortes[partes[p]] = Math.max(0, +(t - 0.08).toFixed(3));
    tempos[partes[p]] = +t.toFixed(3);
    marcas[partes[p]] = +(ATRASO + t).toFixed(3);
  }
  return { marcas, tempos, cortes, pelaVoz, total: Object.keys(marcas).length };
}

/**
 * Encaixa a fala de uma cena na gravação do terminal. A fala é cortada em peças, uma por marca; cada peça
 * com bloco dispara um trecho da gravação (que toca na velocidade real) e só começa depois que o trecho
 * anterior terminou; peça com espera só começa quando aquele instante da gravação já apareceu. Se a fala
 * for mais curta que a execução, ela faz uma pausa; se for mais longa, a tela espera parada, como quem
 * ainda não apertou Enter.
 */
function encaixarGravacao(c, m, dAudio) {
  const g = lerGravacao();
  if (!g) throw new Error("falta a gravação do terminal: rode `node video/construir.mjs gravar`");
  const { blocos, esperas } = c.gravacao(g), nomes = Object.keys(m.tempos).sort((a, b) => m.tempos[a] - m.tempos[b]);
  for (const nome of [...Object.keys(blocos), ...Object.keys(esperas)]) if (!nomes.includes(nome)) throw new Error(`cena ${c.id}: a gravação usa a marca "${nome}", que não está na fala`);
  const pecas = [{ de: 0, ate: dAudio, ini: ATRASO }], marcas = {}, trechos = [];
  let fimDoBloco = 0;
  const naCena = (r) => {
    const s = [...trechos].reverse().find((x) => r >= x.r0 - 1e-6 && r <= x.r1 + 1e-6);
    if (!s) throw new Error(`cena ${c.id}: a espera cai fora dos trechos da gravação`);
    return s.t0 + (r - s.r0);
  };
  nomes.forEach((nome) => {
    const anterior = pecas[pecas.length - 1], corte = Math.max(anterior.de + 0.05, m.cortes[nome]), palavra = Math.max(corte, m.tempos[nome]);
    let ini = anterior.ini + (corte - anterior.de); // sem espera, a fala segue contínua
    if (blocos[nome]) ini = Math.max(ini, fimDoBloco + 0.15 - (palavra - corte));
    if (esperas[nome] != null) ini = Math.max(ini, naCena(esperas[nome]) - (palavra - corte) - 0.05);
    anterior.ate = +corte.toFixed(3);
    pecas.push({ de: +corte.toFixed(3), ate: dAudio, ini: +ini.toFixed(3) });
    marcas[nome] = +(ini + (palavra - corte)).toFixed(3);
    if (blocos[nome]) { const [r0, r1] = blocos[nome]; trechos.push({ t0: marcas[nome], r0: +r0.toFixed(3), r1: +r1.toFixed(3) }); fimDoBloco = marcas[nome] + (r1 - r0); }
  });
  const ultima = pecas[pecas.length - 1];
  return { pecas, marcas, durFala: Math.max(ultima.ini + (ultima.ate - ultima.de), fimDoBloco + 0.4), gravacao: { trechos } };
}

function etapaTempo() {
  let ini = 0, pelaVoz = 0, totalMarcas = 0;
  const cenas = CENAS.map((c, i) => {
    const audio = path.join(TRAB, "audio", `${num(i)}-${c.id}.wav`);
    // sem áudio ainda (primeiros testes), estima pela quantidade de palavras
    const dAudio = fs.existsSync(audio) ? duracaoDe(audio) : falaLimpa(c.fala).split(" ").length / 2.4;
    const m = marcasDaCena(c, i, dAudio); pelaVoz += m.pelaVoz; totalMarcas += m.total;
    let pecas = [{ de: 0, ate: +dAudio.toFixed(3), ini: ATRASO }], marcas = m.marcas, durFala = ATRASO + dAudio, gravacao = null;
    if (c.gravacao) ({ pecas, marcas, durFala, gravacao } = encaixarGravacao(c, m, +dAudio.toFixed(3)));
    const dur = Math.ceil((durFala + CAUDA) * FPS) / FPS;
    const cena = { id: c.id, capitulo: c.capitulo, ini: +ini.toFixed(4), dur: +dur.toFixed(4), audio: fs.existsSync(audio) ? audio : null, inicioDaFala: +(ini + ATRASO).toFixed(4), marcas, pecas, ...(gravacao ? { gravacao } : {}) };
    const pausas = pecas.slice(1).map((p, k) => p.ini - (pecas[k].ini + pecas[k].ate - pecas[k].de)).filter((x) => x > 0.2);
    if (pausas.length) console.log(`  ${c.id}: a fala espera a gravação ${pausas.length} vez(es): ${pausas.map((x) => x.toFixed(1) + " s").join(", ")}`);
    ini += dur;
    return cena;
  });
  gravar("timeline.json", { fps: FPS, duracao: +ini.toFixed(4), cenas });
  const mm = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  console.log(`tempo: ${mm(ini)} no total; ${pelaVoz} de ${totalMarcas} marcas sincronizadas pela voz, o resto pela posição no texto`);
  cenas.forEach((c) => console.log(`  ${mm(c.ini)}  ${c.capitulo}  (${c.dur.toFixed(1)} s)`));
  if (ini < 360 || ini > 900) console.log("ATENÇÃO: o enunciado pede entre 6 e 15 minutos.");
}

// ------------------------------------------------------------------ navegador

function acharPlaywright() {
  for (const base of [RAIZ, process.env.PLAYWRIGHT, path.join(os.homedir(), "Projetos", "esteira-qa")].filter(Boolean)) {
    if (fs.existsSync(path.join(base, "node_modules", "playwright"))) return createRequire(path.join(base, "package.json"))("playwright");
  }
  throw new Error("Playwright não encontrado. Rode `npm i playwright` aqui ou defina PLAYWRIGHT com a pasta de um projeto que o tenha.");
}
async function abrirPagina(chromium) {
  const navegador = await chromium.launch({ args: ["--allow-file-access-from-files", "--force-color-profile=srgb"] });
  const pagina = await navegador.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const erros = [];
  pagina.on("pageerror", (e) => erros.push("erro na página: " + e.message));
  await pagina.goto(pathToFileURL(path.join(AQUI, "cena.html")).href);
  const doMotor = await pagina.evaluate(([tl, d]) => init(tl, d), [ler("timeline.json"), ler("dados.json")]);
  await pagina.evaluate(() => document.fonts.ready);
  if (erros.length || doMotor.length) { await navegador.close(); throw new Error("a animação acusou problema:\n  " + [...erros, ...doMotor].join("\n  ")); }
  return { navegador, pagina, erros };
}

async function etapaAmostra(arg) {
  const tl = ler("timeline.json"), { chromium } = acharPlaywright(), { navegador, pagina, erros } = await abrirPagina(chromium);
  let instantes;
  if (arg === "marcas") instantes = tl.cenas.flatMap((c) => [c.ini + 1.2, ...Object.values(c.marcas).map((m) => c.ini + m + 1.3), c.ini + c.dur - 0.9]);
  else if (arg && arg.startsWith("cena:")) { const c = tl.cenas.find((x) => x.id === arg.slice(5)); const n = 8; instantes = Array.from({ length: n }, (_, k) => c.ini + ((k + 0.5) / n) * c.dur); }
  else instantes = (arg || "1").split(",").map(Number);
  const pasta = path.join(TRAB, "amostras"); fs.rmSync(pasta, { recursive: true, force: true }); fs.mkdirSync(pasta, { recursive: true });
  for (const t of instantes) {
    await pagina.evaluate((x) => preparar(x).then(() => render(x)), t);
    await pagina.screenshot({ path: path.join(pasta, `t${t.toFixed(2).padStart(7, "0")}.png`) });
  }
  const acusados = await pagina.evaluate(() => window.ERROS);
  await navegador.close();
  console.log(`amostras: ${instantes.length} quadros em ${pasta}`);
  if (erros.length || acusados.length) throw new Error([...erros, ...acusados].join("\n"));
}

/** Título e descrição para o YouTube, com os capítulos nos tempos da linha do tempo atual. */
function etapaYoutube() {
  const tl = ler("timeline.json"), mm = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  // o YouTube corta o título em 100 caracteres: o modelo completo do professor abre a descrição
  const curto = `Trabalho de Estruturas de Dados 2 - Unipê - Prof. Ed - Ordenação - ${DUPLA}`;
  const completo = `Trabalho de Estruturas de Dados 2 - Unipê - Prof. Ed - ${TITULO} (Bubble, Insertion e Merge Sort) - ${DUPLA}`;
  if (curto.length > 100) throw new Error(`título com ${curto.length} caracteres: o YouTube aceita até 100`);
  const texto = `TÍTULO (${curto.length} caracteres)\n${curto}\n\nDESCRIÇÃO\n${completo}\n\n` +
    `Três algoritmos de ordenação explicados em animação: a ideia de cada um, o código em Java comentado, uma corrida com a mesma lista, a medição com 100.000 valores e a gravação do programa compilando e rodando no terminal.\n\n` +
    `Código, testes e a animação: https://${REPOSITORIO}\n\n` +
    tl.cenas.map((c) => `${mm(c.ini)} ${c.capitulo}`).join("\n") + `\n\nNarração: ${NARRADOR}. Animação e código: ${DUPLA}.\n`;
  fs.writeFileSync(path.join(TRAB, "youtube.txt"), texto, "utf8");
  console.log(`youtube: ${path.join(TRAB, "youtube.txt")}`);
}

/** Miniatura para o YouTube (1280x720): a capa, com o título grande e os três algoritmos. */
async function etapaMiniatura() {
  const { chromium } = acharPlaywright(), { navegador, pagina } = await abrirPagina(chromium);
  const cheio = path.join(TRAB, "miniatura-1080.png"), saida = path.join(TRAB, "miniatura.png");
  await pagina.evaluate(() => miniatura()); // a capa tem desenho próprio (cenas/a-abertura.js)
  await pagina.screenshot({ path: cheio });
  await navegador.close();
  rodar("ffmpeg", ["-y", "-v", "error", "-i", cheio, "-vf", "scale=1280:720:flags=lanczos", saida]);
  fs.rmSync(cheio);
  console.log(`miniatura: ${saida}`);
}

// ------------------------------------------------------------------ trilha e render

function etapaTrilha() {
  const tl = ler("timeline.json"), comAudio = tl.cenas.filter((c) => c.audio);
  if (!comAudio.length) throw new Error("nenhuma cena tem áudio: rode a etapa audio antes");
  const entradas = comAudio.flatMap((c) => ["-i", c.audio]), partes = [], nomes = [];
  comAudio.forEach((c, i) => {
    if (c.pecas.length === 1) { partes.push(`[${i}:a]adelay=${Math.round((c.ini + c.pecas[0].ini) * 1000)}:all=1[a${i}_0]`); nomes.push(`[a${i}_0]`); return; }
    partes.push(`[${i}:a]asplit=${c.pecas.length}${c.pecas.map((_, k) => `[s${i}_${k}]`).join("")}`);
    c.pecas.forEach((p, k) => {
      const d = p.ate - p.de; // cada peça entra e sai com um fade de centésimos, para o corte não estalar
      partes.push(`[s${i}_${k}]atrim=start=${p.de.toFixed(3)}:end=${p.ate.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:d=0.015,afade=t=out:st=${Math.max(0, d - 0.02).toFixed(3)}:d=0.02,adelay=${Math.round((c.ini + p.ini) * 1000)}:all=1[a${i}_${k}]`);
      nomes.push(`[a${i}_${k}]`);
    });
  });
  const filtro = partes.join(";") + `;${nomes.join("")}amix=inputs=${nomes.length}:normalize=0,apad=whole_dur=${tl.duracao}[m]`;
  const bruta = path.join(TRAB, "narracao-bruta.wav"), voz = path.join(TRAB, "narracao-voz.wav"), final = path.join(TRAB, "narracao.wav");
  rodar("ffmpeg", ["-y", "-v", "error", ...entradas, "-filter_complex", filtro, "-map", "[m]", "-t", String(tl.duracao), "-ar", "48000", "-ac", "1", bruta]);
  // nivelamento em duas passadas: mede primeiro e aplica um ganho só, sem "bombear" o começo das frases
  const medida = spawnSync("ffmpeg", ["-hide_banner", "-i", bruta, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const abre = medida.lastIndexOf("{"), m = JSON.parse(medida.slice(abre, medida.indexOf("}", abre) + 1));
  rodar("ffmpeg", ["-y", "-v", "error", "-i", bruta, "-af",
    `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`,
    "-ar", "48000", "-ac", "2", voz]);
  // Fundo sonoro: acordes longos gerados aqui mesmo, 22 LU abaixo da voz, mais um sopro na troca de cena.
  // SEM_FUNDO=1 deixa só a voz.
  const py = process.env.PYTHON_TTS || venv("tts");
  if (process.env.SEM_FUNDO || !fs.existsSync(py)) { fs.copyFileSync(voz, final); console.log(`trilha: ${final} (voz nivelada em -16 LUFS, sem fundo sonoro)`); return; }
  const fundo = path.join(TRAB, "fundo.wav"), ABAIXO_DA_VOZ = Number(process.env.FUNDO_LU || 22);
  process.stdout.write(rodar(py, [path.join(AQUI, "ferramentas", "fundo_sonoro.py"), String(tl.duracao), JSON.stringify(tl.cenas.map((c) => c.ini)), fundo], { env: { ...process.env, PYTHONIOENCODING: "utf-8" } }));
  const lido = spawnSync("ffmpeg", ["-hide_banner", "-i", fundo, "-af", "loudnorm=print_format=json", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const abreF = lido.lastIndexOf("{"), doFundo = Number(JSON.parse(lido.slice(abreF, lido.indexOf("}", abreF) + 1)).input_i), ganho = -16 - ABAIXO_DA_VOZ - doFundo;
  rodar("ffmpeg", ["-y", "-v", "error", "-i", voz, "-i", fundo, "-filter_complex", `[1:a]volume=${ganho.toFixed(2)}dB[f];[0:a][f]amix=inputs=2:normalize=0,alimiter=limit=0.84:level=false[m]`, "-map", "[m]", "-t", String(tl.duracao), "-ar", "48000", "-ac", "2", final]);
  console.log(`trilha: ${final} (voz em -16 LUFS; fundo sonoro em ${(-16 - ABAIXO_DA_VOZ).toFixed(0)} LUFS, ${ABAIXO_DA_VOZ} LU abaixo da voz)`);
}

async function etapaRender() {
  const tl = ler("timeline.json"), { chromium } = acharPlaywright();
  const total = Math.round(tl.duracao * FPS), trabalhadores = Math.max(2, Math.min(8, os.cpus().length - 2));
  const porParte = Math.ceil(total / trabalhadores), t0 = Date.now();
  // PARTES=6,7 refaz só essas partes e reaproveita as outras (vale quando a mudança não mexeu na linha do tempo)
  const so = process.env.PARTES ? process.env.PARTES.split(",").map(Number) : null;
  const pasta = path.join(TRAB, "partes"); if (!so) fs.rmSync(pasta, { recursive: true, force: true }); fs.mkdirSync(pasta, { recursive: true });
  let feitos = 0;
  const relogio = setInterval(() => process.stdout.write(`\rrender: ${feitos}/${total} quadros (${Math.round((Date.now() - t0) / 1000)} s)   `), 2000);
  await Promise.all(Array.from({ length: trabalhadores }, async (_, w) => {
    const de = w * porParte, ate = Math.min(total, de + porParte);
    if (de >= ate || (so && !so.includes(w))) return;
    const { navegador, pagina } = await abrirPagina(chromium);
    // Saída no padrão que o YouTube espera: BT.709, faixa limitada. O JPEG chega em BT.601 de faixa cheia e o
    // PNG em RGB; sem a conversão declarada aqui o vídeo saía marcado errado e as cores mudavam no envio.
    const conversao = (EM_PNG ? "scale=out_color_matrix=bt709:out_range=tv" : "scale=in_range=pc:in_color_matrix=bt601:out_color_matrix=bt709:out_range=tv") + ":flags=accurate_rnd+full_chroma_int,format=yuv420p,setparams=range=tv:colorspace=bt709:color_primaries=bt709:color_trc=bt709";
    const ff = spawn("ffmpeg", ["-y", "-v", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", EM_PNG ? "png" : "mjpeg", "-i", "-", "-vf", conversao,
      "-c:v", "libx264", "-preset", process.env.PRESET || "medium", "-crf", process.env.CRF || "15", "-profile:v", "high", "-r", String(FPS), "-g", String(FPS * 2),
      "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
      path.join(pasta, `p${String(w).padStart(2, "0")}.mp4`)], { stdio: ["pipe", "inherit", "inherit"] });
    for (let q = de; q < ate; q++) {
      await pagina.evaluate((x) => preparar(x).then(() => render(x)), q / FPS);
      const quadro = await pagina.screenshot(EM_PNG ? { type: "png" } : { type: "jpeg", quality: 97 });
      if (!ff.stdin.write(quadro)) await new Promise((r) => ff.stdin.once("drain", r));
      feitos++;
    }
    ff.stdin.end(); await new Promise((r) => ff.on("close", r));
    await navegador.close();
  }));
  clearInterval(relogio);
  const lista = path.join(pasta, "lista.txt");
  fs.writeFileSync(lista, fs.readdirSync(pasta).filter((f) => f.endsWith(".mp4")).sort().map((f) => `file '${path.join(pasta, f).replace(/\\/g, "/")}'`).join("\n"));
  const capitulos = path.join(TRAB, "capitulos.txt");
  fs.writeFileSync(capitulos, [";FFMETADATA1", ...tl.cenas.flatMap((c) => ["[CHAPTER]", "TIMEBASE=1/1000", `START=${Math.round(c.ini * 1000)}`, `END=${Math.round((c.ini + c.dur) * 1000)}`, `title=${c.capitulo}`])].join("\n"), "utf8");
  const saida = path.join(TRAB, "video.mp4");
  rodar("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lista, "-i", path.join(TRAB, "narracao.wav"), "-i", capitulos,
    "-map", "0:v", "-map", "1:a", "-map_chapters", "2", "-t", tl.duracao.toFixed(3), "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
    "-movflags", "+faststart", "-metadata", `title=${TITULO} · Estruturas de Dados 2 · Unipê`, "-metadata", `artist=${DUPLA}`, saida]);
  console.log(`\nrender: ${saida} (${(fs.statSync(saida).size / 1e6).toFixed(0)} MB, ${duracaoDe(saida).toFixed(1)} s) em ${Math.round((Date.now() - t0) / 1000)} s com ${trabalhadores} navegadores`);
}

// ------------------------------------------------------------------ importar a narração

/**
 * Recebe uma pasta com os áudios do narrador (nomes quaisquer, como os do WhatsApp), descobre pelo
 * que foi dito a qual cena cada um pertence e copia para video/narracao/ com o número da cena.
 * Se houver dois áudios da mesma cena, fica o mais novo.
 */
function etapaImportar(pasta) {
  if (!pasta || !fs.existsSync(pasta)) throw new Error("diga a pasta dos áudios: node video/construir.mjs importar <pasta>");
  const py = process.env.PYTHON_WHISPER || venv("faster-whisper");
  const tmp = path.join(TRAB, "importar"); fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
  const arquivos = fs.readdirSync(pasta).filter((f) => /\.(ogg|opus|m4a|mp3|wav|aac|mp4|webm)$/i.test(f)).sort((a, b) => fs.statSync(path.join(pasta, a)).mtimeMs - fs.statSync(path.join(pasta, b)).mtimeMs);
  if (!arquivos.length) throw new Error("nenhum áudio encontrado em " + pasta);
  arquivos.forEach((f, i) => rodar("ffmpeg", ["-y", "-v", "error", "-i", path.join(pasta, f), "-ar", "16000", "-ac", "1", path.join(tmp, `a${String(i).padStart(3, "0")}.wav`)]));
  rodar(py, [path.join(AQUI, "ferramentas", "palavras.py"), tmp, tmp], { env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
  const vocabulario = CENAS.map((c) => new Set(semAcento(falaLimpa(c.fala)).split(" ")));
  const destino = path.join(AQUI, "narracao"); fs.mkdirSync(destino, { recursive: true });
  const escolhido = {};
  arquivos.forEach((f, i) => {
    const ditas = new Set(JSON.parse(fs.readFileSync(path.join(tmp, `a${String(i).padStart(3, "0")}.json`), "utf8")).map((w) => semAcento(w.texto)).filter(Boolean));
    const notas = vocabulario.map((v) => [...v].filter((w) => ditas.has(w)).length / new Set([...v, ...ditas]).size);
    const melhor = notas.indexOf(Math.max(...notas));
    const dur = duracaoDe(path.join(pasta, f));
    if (notas[melhor] < 0.45) { console.log(`  ?? ${f} (${dur.toFixed(0)} s): não parece nenhum trecho do roteiro (melhor: ${num(melhor)}, ${Math.round(notas[melhor] * 100)}%)`); return; }
    escolhido[melhor] = { arquivo: f, nota: notas[melhor], dur };
  });
  for (const antigo of fs.readdirSync(destino)) if (Object.keys(escolhido).some((i) => antigo.startsWith(num(+i)))) fs.rmSync(path.join(destino, antigo));
  CENAS.forEach((c, i) => {
    const e = escolhido[i];
    if (!e) { console.log(`  -- ${num(i)} ${c.capitulo}: FALTA`); return; }
    fs.copyFileSync(path.join(pasta, e.arquivo), path.join(destino, `${num(i)}-${c.id}${path.extname(e.arquivo).toLowerCase()}`));
    console.log(`  ok ${num(i)} ${c.capitulo}: ${e.arquivo} (${e.dur.toFixed(0)} s, ${Math.round(e.nota * 100)}% do texto)`);
  });
  console.log(`importar: ${Object.keys(escolhido).length} de ${CENAS.length} cenas com narração real`);
}

// ------------------------------------------------------------------ legendas

/** Legendas (.srt) com o texto do roteiro e os tempos tirados da voz. Servem para subir no YouTube. */
function etapaLegendas() {
  const tl = ler("timeline.json"), blocos = [];
  CENAS.forEach((c, i) => {
    const cena = tl.cenas[i], arq = path.join(TRAB, "palavras", `${num(i)}-${c.id}.json`);
    if (!fs.existsSync(arq)) throw new Error("legendas precisam da etapa palavras");
    const palavras = JSON.parse(fs.readFileSync(arq, "utf8")), fimDoAudio = palavras.length ? palavras[palavras.length - 1].fim : cena.dur;
    // frases do roteiro; as longas são partidas na vírgula mais perto do meio
    const frases = falaLimpa(c.fala).split(/(?<=[.!?])\s+/).flatMap((f) => {
      if (f.length <= 88) return [f];
      const virgulas = [...f.matchAll(/[,:;] /g)].map((m) => m.index + 1);
      if (!virgulas.length) return [f];
      const corte = virgulas.reduce((a, b) => (Math.abs(b - f.length / 2) < Math.abs(a - f.length / 2) ? b : a));
      return [f.slice(0, corte).trim(), f.slice(corte).trim()];
    });
    let cursor = 0;
    const inicios = frases.map((f) => {
      const alvo = semAcento(f).split(" ").slice(0, 3);
      for (let k = cursor; k < palavras.length; k++) {
        if (alvo.every((w, x) => palavras[k + x] && semAcento(palavras[k + x].texto) === w) || (alvo.length > 1 && semAcento(palavras[k].texto) === alvo[0] && palavras[k + 1] && semAcento(palavras[k + 1].texto) === alvo[1])) { cursor = k + 1; return palavras[k].ini; }
      }
      return null;
    });
    // frase que a transcrição não achou fica entre as vizinhas, na proporção do tamanho
    for (let f = 0; f < frases.length; f++) {
      if (inicios[f] != null) continue;
      const antes = f > 0 ? inicios[f - 1] : 0;
      let depois = f + 1; while (depois < frases.length && inicios[depois] == null) depois++;
      const fim = depois < frases.length ? inicios[depois] : fimDoAudio;
      inicios[f] = antes + (fim - antes) * (f > 0 ? frases[f - 1].length / (frases[f - 1].length + frases[f].length) : 0);
    }
    // do tempo do áudio para o tempo do vídeo: a cena pode ter a fala em peças, com esperas entre elas
    const noVideo = (tAudio) => { const p = [...cena.pecas].reverse().find((x) => tAudio >= x.de - 1e-6) || cena.pecas[0]; return cena.ini + p.ini + (tAudio - p.de); };
    frases.forEach((texto, f) => {
      const ini = noVideo(inicios[f]), fimNoAudio = f + 1 < frases.length ? inicios[f + 1] : fimDoAudio + 0.25;
      blocos.push({ ini, fim: Math.min(noVideo(fimNoAudio), ini + (fimNoAudio - inicios[f]) + 0.25), texto });
    });
  });
  const hora = (s) => { const ms = Math.round(s * 1000), p = (n, d = 2) => String(n).padStart(d, "0"); return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; };
  // duas linhas por legenda, quebradas perto do meio
  const duasLinhas = (t) => { if (t.length <= 44) return t; const meio = t.lastIndexOf(" ", Math.floor(t.length / 2) + 6); return t.slice(0, meio) + "\n" + t.slice(meio + 1); };
  fs.writeFileSync(path.join(TRAB, "legendas.srt"), blocos.map((b, i) => `${i + 1}\n${hora(b.ini)} --> ${hora(Math.max(b.ini + 0.6, b.fim - 0.05))}\n${duasLinhas(b.texto)}\n`).join("\n"), "utf8");
  console.log(`legendas: ${blocos.length} blocos em ${path.join(TRAB, "legendas.srt")}`);
}

// ------------------------------------------------------------------ comando

const etapa = process.argv[2] || "tudo";
const etapas = { dados: etapaDados, falas: etapaFalas, audio: etapaAudio, palavras: etapaPalavras, tempo: etapaTempo, trilha: etapaTrilha, legendas: etapaLegendas, render: etapaRender };
try {
  if (etapa === "amostra") await etapaAmostra(process.argv[3]);
  else if (etapa === "gravar") await etapaGravar();
  else if (etapa === "limpar-perfil") await limparPerfilTemporario();
  else if (etapa === "processar-gravacao") processarGravacao();
  else if (etapa === "importar") etapaImportar(process.argv[3]);
  else if (etapa === "miniatura") await etapaMiniatura();
  else if (etapa === "youtube") etapaYoutube();
  else if (etapa === "tudo") for (const e of ["dados", "falas", "audio", "palavras", "tempo", "trilha", "legendas", "render"]) await etapas[e]();
  else if (etapas[etapa]) await etapas[etapa]();
  else throw new Error("etapa desconhecida: " + etapa);
} catch (e) { console.error("\nPAROU: " + e.message); process.exit(1); }
