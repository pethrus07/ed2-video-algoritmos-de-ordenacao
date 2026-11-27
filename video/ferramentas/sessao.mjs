// Sessão de terminal gravada para o vídeo. Roda DENTRO do Windows Terminal, enquanto o ffmpeg grava a janela.
//
// Mostra um prompt, digita cada comando e o executa de verdade: a compilação, a demonstração e os testes
// são os programas do repositório rodando, e o que aparece na tela é a saída deles, no tempo deles.
// Ao lado, guarda em JSON o instante de cada acontecimento (comando digitado, cena impressa, linha da
// medição...). É por esse registro que a narração do vídeo se encaixa na gravação.
//
//   node video/ferramentas/sessao.mjs <registro.json> <pasta do repositório>
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";

const [arquivoRegistro, raiz, modo] = process.argv.slice(2);
const t0 = performance.now(), agora = () => +((performance.now() - t0) / 1000).toFixed(3);
const eventos = [], comandos = [];
let linhasNaTela = 0; // quantas quebras de linha já foram para a tela (dá a posição do cursor)
const marca = (nome, extra = {}) => eventos.push({ t: agora(), nome, linha: linhasNaTela, ...extra });
const espera = (s) => new Promise((r) => setTimeout(r, s * 1000));
const escreve = (s) => { linhasNaTela += (String(s).match(/\n/g) || []).length; process.stdout.write(s); };
let semente = 11;
const sorteio = () => (semente = (semente * 16807) % 2147483647) / 2147483647; // ritmo de digitação que se repete
const PROMPT = "PS> ";

async function digita(comando) {
  escreve(PROMPT);
  await espera(0.9);
  marca("digita", { comando });
  const corte = comando.indexOf(" ") < 0 ? comando.length : comando.indexOf(" ");
  escreve("\x1b[93m");
  for (const letra of comando.slice(0, corte)) { escreve(letra); await espera(0.05 + sorteio() * 0.07); }
  escreve("\x1b[0m");
  for (const letra of comando.slice(corte)) { escreve(letra); await espera(0.035 + sorteio() * 0.06); }
  await espera(0.5);
  escreve("\r\n");
  marca("enter", { comando });
}

/** Executa o comando de verdade. A saída vai direto para a tela; daqui só se observa, para anotar os instantes. */
function executa(comando, aoVer) {
  const [programa, ...argumentos] = comando.split(" ");
  const registro = { comando, linhas: [] };
  comandos.push(registro);
  return new Promise((resolve, reject) => {
    const p = spawn(programa, argumentos, { cwd: raiz, stdio: ["pipe", "pipe", "inherit"] });
    // prioridade alta: a medição de tempo depende menos do que mais a máquina estiver fazendo na hora
    try { os.setPriority(p.pid, os.constants.priority.PRIORITY_HIGH); } catch { /* sem permissão: segue na prioridade normal */ }
    // e sem o freio que o Windows 11 põe em programa de janela sem foco (ver sem-freio.ps1)
    spawn("pwsh", ["-NoProfile", "-File", new URL("./sem-freio.ps1", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), String(p.pid)], { stdio: "ignore" });
    let resto = "";
    p.stdout.on("data", (bloco) => {
      escreve(bloco);
      resto += bloco.toString("utf8");
      const partes = resto.split(/\r?\n/);
      resto = partes.pop();
      for (const texto of partes) { registro.linhas.push({ t: agora(), texto }); aoVer?.({ linha: texto, p }); }
      if (resto) aoVer?.({ parcial: resto, p });
    });
    p.on("error", reject);
    p.on("close", (codigo) => { marca("terminou", { comando, codigo }); codigo === 0 ? resolve() : reject(new Error(`${comando} saiu com código ${codigo}`)); });
  });
}

const N = (s) => Number(s.replace(/\./g, ""));
/** Quantas linhas completas o comando em curso já escreveu: distingue uma pausa da seguinte, que têm o mesmo texto. */
const registroDe = () => comandos[comandos.length - 1].linhas.length;

try {
  // tela limpa e um sinal de sincronia: uma faixa clara que aparece e some. É por ela que se acha,
  // na gravação, o instante zero deste registro.
  escreve("\x1b[2J\x1b[3J\x1b[H\x1b[?25l");
  await espera(5);
  marca("tamanho", { colunas: process.stdout.columns, linhas: process.stdout.rows });
  marca("sinal");
  process.stdout.write("\x1b[7m" + " ".repeat(80) + "\x1b[0m");
  await espera(0.45);
  process.stdout.write("\r\x1b[2K\x1b[?25h");
  await espera(1.6);

  if (modo === "sonda") { // só confere a janela: tamanho, letra e sincronia
    escreve(`${process.stdout.columns} colunas por ${process.stdout.rows} linhas\r\n` + "0123456789".repeat(8) + "\r\n");
    await espera(1.2);
    fs.writeFileSync(arquivoRegistro, JSON.stringify({ eventos, comandos }, null, 1), "utf8");
    await espera(2.5);
    process.exit(0);
  }
  marca("inicio");
  await digita("javac -encoding UTF-8 -d out src/*.java");
  await executa("javac -encoding UTF-8 -d out src/*.java");
  await espera(0.6);

  await digita("java -cp out Demonstracao");
  let cena = 0, medindo = null, pausas = 0, pausaVista = "";
  await executa("java -cp out Demonstracao", ({ linha, parcial, p }) => {
    if (linha != null) {
      const titulo = /^CENA (\d)/.exec(linha);
      if (titulo) { cena = +titulo[1]; marca("cena", { n: cena }); }
      const medida = /^\s+(Bubble|Insertion|Merge) Sort\s+([\d.]+)\s+([\d.]+)\s+([\d.,]+) ms\s*$/.exec(linha);
      if (medida) { marca("mediu", { algoritmo: medida[1].toLowerCase(), n: N(medida[2]), comparacoes: N(medida[3]), ms: Number(medida[4].replace(/\./g, "").replace(",", ".")) }); medindo = null; }
      return;
    }
    const emCurso = /^\s+(Bubble|Insertion|Merge) Sort\s+([\d.]+) $/.exec(parcial);
    if (emCurso && medindo !== parcial) { medindo = parcial; marca("mede", { algoritmo: emCurso[1].toLowerCase(), n: N(emCurso[2]) }); }
    if (/\[Enter para [^\]]+\] $/.test(parcial) && pausaVista !== parcial + cena + registroDe(p)) {
      pausaVista = parcial + cena + registroDe(p);
      const ordem = ++pausas;
      marca("pausa", { n: ordem, cena });
      // o Enter de quem está apresentando: um instante para ler e segue
      setTimeout(() => { marca("segue", { n: ordem, cena }); escreve("\r\n"); p.stdin.write("\n"); }, 1300);
    }
  });
  await espera(0.9);

  await digita("java -cp out Testes");
  await executa("java -cp out Testes");
  await espera(0.4);
  escreve(PROMPT);
  marca("fim");
  await espera(1.5);
  fs.writeFileSync(arquivoRegistro, JSON.stringify({ eventos, comandos }, null, 1), "utf8");
  await espera(4); // a janela fica aberta até a gravação parar
} catch (erro) {
  fs.writeFileSync(arquivoRegistro, JSON.stringify({ erro: String(erro && erro.stack || erro), eventos, comandos }, null, 1), "utf8");
  await espera(2);
  process.exit(1);
}
