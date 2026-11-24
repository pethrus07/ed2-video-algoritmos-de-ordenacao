// Linha de produção do vídeo. Cada etapa lê o que a anterior deixou em video/trabalho/.
//
//   node video/construir.mjs dados      compila o Java, roda e guarda os números, o código e a saída do terminal
//   node video/construir.mjs falas      escreve o texto de cada cena para o narrador (video/NARRACAO.md)
//   node video/construir.mjs audio      prepara o áudio de cada cena (o real, se existir; senão uma prévia sintética)
//   node video/construir.mjs importar <pasta>  recebe os áudios do narrador e descobre a cena de cada um
//   node video/construir.mjs palavras   transcreve cada áudio com o instante de cada palavra (sincronia)
//   node video/construir.mjs tempo      monta a linha do tempo a partir da duração de cada áudio
//   node video/construir.mjs amostra 12.5,40   grava quadros desses instantes em trabalho/amostras/
//   node video/construir.mjs amostra marcas    um quadro logo depois de cada ponto de sincronia
//   node video/construir.mjs legendas   escreve as legendas (.srt) com os tempos da voz
//   node video/construir.mjs render     renderiza o vídeo inteiro (trabalho/video.mp4)
//   node video/construir.mjs tudo       todas as etapas, na ordem
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
const FPS = Number(process.env.FPS || 30), ATRASO = 0.5, CAUDA = 0.85; // a fala começa meio segundo depois da cena e a cena dura um pouco além dela
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
    mergeSort: extrairMetodo(java, "private static void mergeSort(int[] v, int[] aux, int inicio, int fim)"),
    intercalar: extrairMetodo(java, "private static void intercalar(int[] v, int[] aux,"),
  };
  // a sessão do terminal: o programa de verdade, com o instante em que cada linha saiu
  // os números em escala saem da MESMA execução que aparece no terminal do vídeo (cena 4 do programa)
  const naEscala = /^\s+(Bubble|Insertion|Merge) Sort\s+([\d.]+)\s+([\d.]+)\s+([\d.,]+) ms\s*$/;
  const lerEscala = (linhas) => {
    const escala = {};
    for (const { texto } of linhas) {
      const m = naEscala.exec(texto);
      if (m) (escala[m[2].replace(/\./g, "")] ??= {})[m[1].toLowerCase()] = { comparacoes: Number(m[3].replace(/\./g, "")), ms: Number(m[4].replace(/\./g, "").replace(",", ".")) };
    }
    if (!escala[100000] || Object.keys(escala[100000]).length !== 3) throw new Error("não achei na saída do programa a tabela em escala (cena 4)");
    return escala;
  };
  // O tempo de relógio depende do que mais a máquina está fazendo. O programa roda três vezes e
  // fica a execução mais rápida, inteira: o terminal e o gráfico do vídeo mostram essa mesma execução.
  let melhor = null;
  for (let rodada = 0; rodada < 3; rodada++) {
    const linhas = await capturar("Demonstracao", ["--sem-pausa"]), escala = lerEscala(linhas);
    if (!melhor || escala[100000].bubble.ms < melhor.escala[100000].bubble.ms) melhor = { linhas, escala };
  }
  d.escala = melhor.escala;
  d.terminal = [{ comando: ".\\executar.ps1", linhas: melhor.linhas }, { comando: ".\\executar.ps1 testes", linhas: await capturar("Testes", []) }];
  // a fala só pode dizer número que o programa mediu
  const falhas = CENAS.flatMap((c) => (c.confere ? c.confere(d) : []).filter(([ok]) => !ok).map(([, oque]) => `${c.id}: ${oque}`));
  gravar("dados.json", d);
  console.log(`dados: vetor8 [${d.vetor8}], corrida ${JSON.stringify(d.comparacoes64)}, 100 mil: bubble ${d.escala[100000].bubble.ms} ms, merge ${d.escala[100000].merge.ms} ms`);
  console.log(`terminal: ${d.terminal.map((s) => s.linhas.length + " linhas").join(" + ")}`);
  if (falhas.length) throw new Error("a fala não bate com o que o programa mediu:\n  " + falhas.join("\n  "));
}

function capturar(classe, args) {
  return new Promise((resolve, reject) => {
    const linhas = [], t0 = Date.now(), p = spawn("java", ["-cp", path.join(RAIZ, "out"), classe, ...args]);
    let resto = "";
    p.stdout.on("data", (b) => {
      resto += b.toString("utf8");
      const partes = resto.split(/\r?\n/); resto = partes.pop();
      for (const texto of partes) linhas.push({ t: (Date.now() - t0) / 1000, texto });
    });
    p.on("close", (codigo) => (codigo === 0 ? resolve(linhas) : reject(new Error(`${classe} saiu com código ${codigo}`))));
  });
}

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
  const partes = c.fala.split(/\{\{(\w+)\}\}/), marcas = {}, total = falaLimpa(c.fala).length;
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
        if (iguais >= Math.min(2, alvo.length) && (!melhor || nota > melhor.nota)) melhor = { nota, t: w.ini };
      });
      if (melhor) { t = melhor.t; pelaVoz++; }
    }
    marcas[partes[p]] = +(ATRASO + t).toFixed(3);
  }
  return { marcas, pelaVoz, total: Object.keys(marcas).length };
}

function etapaTempo() {
  let ini = 0, pelaVoz = 0, totalMarcas = 0;
  const cenas = CENAS.map((c, i) => {
    const audio = path.join(TRAB, "audio", `${num(i)}-${c.id}.wav`);
    // sem áudio ainda (primeiros testes), estima pela quantidade de palavras
    const dAudio = fs.existsSync(audio) ? duracaoDe(audio) : falaLimpa(c.fala).split(" ").length / 2.4;
    const m = marcasDaCena(c, i, dAudio); pelaVoz += m.pelaVoz; totalMarcas += m.total;
    const dur = Math.ceil((ATRASO + dAudio + CAUDA) * FPS) / FPS;
    const cena = { id: c.id, capitulo: c.capitulo, ini: +ini.toFixed(4), dur: +dur.toFixed(4), audio: fs.existsSync(audio) ? audio : null, inicioDaFala: +(ini + ATRASO).toFixed(4), marcas: m.marcas };
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
    await pagina.evaluate((x) => render(x), t);
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
    `Três algoritmos de ordenação explicados em animação: a ideia de cada um, o código em Java, uma corrida com a mesma lista e a medição com 100.000 valores.\n\n` +
    `Código, testes e a animação: https://${REPOSITORIO}\n\n` +
    tl.cenas.map((c) => `${mm(c.ini)} ${c.capitulo}`).join("\n") + `\n\nNarração: ${NARRADOR}. Animação e código: ${DUPLA}.\n`;
  fs.writeFileSync(path.join(TRAB, "youtube.txt"), texto, "utf8");
  console.log(`youtube: ${path.join(TRAB, "youtube.txt")}`);
}

/** Miniatura para o YouTube (1280x720): o quadro da abertura com o título já assentado. */
async function etapaMiniatura() {
  const tl = ler("timeline.json"), { chromium } = acharPlaywright(), { navegador, pagina } = await abrirPagina(chromium);
  const abertura = tl.cenas[0], cheio = path.join(TRAB, "miniatura-1080.png"), saida = path.join(TRAB, "miniatura.png");
  await pagina.evaluate((x) => render(x), abertura.ini + abertura.marcas.titulo + 3.2);
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
  const entradas = comAudio.flatMap((c) => ["-i", c.audio]);
  const filtro = comAudio.map((c, i) => `[${i}:a]adelay=${Math.round(c.inicioDaFala * 1000)}:all=1[a${i}]`).join(";") +
    `;${comAudio.map((_, i) => `[a${i}]`).join("")}amix=inputs=${comAudio.length}:normalize=0,apad=whole_dur=${tl.duracao}[m]`;
  const bruta = path.join(TRAB, "narracao-bruta.wav"), final = path.join(TRAB, "narracao.wav");
  rodar("ffmpeg", ["-y", "-v", "error", ...entradas, "-filter_complex", filtro, "-map", "[m]", "-t", String(tl.duracao), "-ar", "48000", "-ac", "1", bruta]);
  // nivelamento em duas passadas: mede primeiro e aplica um ganho só, sem "bombear" o começo das frases
  const medida = spawnSync("ffmpeg", ["-hide_banner", "-i", bruta, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const abre = medida.lastIndexOf("{"), m = JSON.parse(medida.slice(abre, medida.indexOf("}", abre) + 1));
  rodar("ffmpeg", ["-y", "-v", "error", "-i", bruta, "-af",
    `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`,
    "-ar", "48000", "-ac", "2", final]);
  console.log(`trilha: ${final} (entrada em ${m.input_i} LUFS, saída nivelada em -16)`);
}

async function etapaRender() {
  const tl = ler("timeline.json"), { chromium } = acharPlaywright();
  const total = Math.round(tl.duracao * FPS), trabalhadores = Math.max(2, Math.min(8, os.cpus().length - 2));
  const porParte = Math.ceil(total / trabalhadores), t0 = Date.now();
  const pasta = path.join(TRAB, "partes"); fs.rmSync(pasta, { recursive: true, force: true }); fs.mkdirSync(pasta, { recursive: true });
  let feitos = 0;
  const relogio = setInterval(() => process.stdout.write(`\rrender: ${feitos}/${total} quadros (${Math.round((Date.now() - t0) / 1000)} s)   `), 2000);
  await Promise.all(Array.from({ length: trabalhadores }, async (_, w) => {
    const de = w * porParte, ate = Math.min(total, de + porParte);
    if (de >= ate) return;
    const { navegador, pagina } = await abrirPagina(chromium);
    const ff = spawn("ffmpeg", ["-y", "-v", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
      "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-profile:v", "high", "-r", String(FPS), "-g", String(FPS * 2),
      path.join(pasta, `p${String(w).padStart(2, "0")}.mp4`)], { stdio: ["pipe", "inherit", "inherit"] });
    for (let q = de; q < ate; q++) {
      await pagina.evaluate((x) => render(x), q / FPS);
      const quadro = await pagina.screenshot({ type: "jpeg", quality: 96 });
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
    frases.forEach((texto, f) => blocos.push({ ini: cena.inicioDaFala + inicios[f], fim: cena.inicioDaFala + (f + 1 < frases.length ? inicios[f + 1] : fimDoAudio + 0.25), texto }));
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
  else if (etapa === "importar") etapaImportar(process.argv[3]);
  else if (etapa === "miniatura") await etapaMiniatura();
  else if (etapa === "youtube") etapaYoutube();
  else if (etapa === "tudo") for (const e of ["dados", "falas", "audio", "palavras", "tempo", "trilha", "legendas", "render"]) await etapas[e]();
  else if (etapas[etapa]) await etapas[etapa]();
  else throw new Error("etapa desconhecida: " + etapa);
} catch (e) { console.error("\nPAROU: " + e.message); process.exit(1); }
