// Gera o PDF da narração para o narrador ler no celular: letra grande, um trecho por bloco.
//   node video/ferramentas/narracao_pdf.mjs [saida.pdf]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { CENAS, TITULO, DUPLA, falaLimpa } from "../roteiro.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const saida = process.argv[2] || path.join(AQUI, "..", "trabalho", "Narracao.pdf");
const base = [path.join(AQUI, "..", ".."), process.env.PLAYWRIGHT, path.join(os.homedir(), "Projetos", "esteira-qa")].filter(Boolean).find((b) => fs.existsSync(path.join(b, "node_modules", "playwright")));
const { chromium } = createRequire(path.join(base, "package.json"))("playwright");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const trechos = CENAS.map((c, i) => {
  const frases = c.fala.replace(/\{\{\w+\}\}\s*/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  const palavras = falaLimpa(c.fala).split(" ").length;
  return `<section><h2><b>${String(i + 1).padStart(2, "0")}</b>${esc(c.capitulo)}<span>~${Math.round(palavras / 2.4)} s</span></h2>${frases.map((f) => `<p>${esc(f)}</p>`).join("")}</section>`;
}).join("");

const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><style>
  @page { size: 148mm 210mm; margin: 14mm 13mm; }
  body { font-family: "Segoe UI", system-ui, sans-serif; color: #111827; font-size: 14.5pt; line-height: 1.5; }
  h1 { font-size: 22pt; margin: 0 0 2mm; letter-spacing: -.3pt; }
  .sub { color: #6b7280; font-size: 11pt; margin-bottom: 6mm; }
  .como { background: #f3f4f6; border-radius: 4mm; padding: 5mm 6mm; font-size: 12pt; line-height: 1.45; }
  .como li { margin: 1.5mm 0; }
  section { break-inside: avoid; margin-top: 8mm; }
  section:nth-of-type(n+1) { break-before: page; }
  h2 { font-size: 13pt; margin: 0 0 3mm; display: flex; align-items: baseline; gap: 3mm; color: #374151; border-bottom: .4mm solid #e5e7eb; padding-bottom: 2mm; }
  h2 b { background: #111827; color: #fff; border-radius: 2mm; padding: .5mm 2.4mm; font-size: 12pt; }
  h2 span { margin-left: auto; color: #9ca3af; font-weight: 400; font-size: 10.5pt; }
  p { margin: 0 0 4mm; }
</style>
<h1>Narração · ${esc(TITULO)}</h1>
<div class="sub">Estruturas de Dados 2 · Unipê · Prof. Ed · ${esc(DUPLA)}</div>
<div class="como"><b>Como gravar</b><ul>
  <li>São ${CENAS.length} trechos. Um áudio para cada trecho, na ordem, pelo próprio WhatsApp.</li>
  <li>Não precisa dizer o número do trecho: é só ler o texto.</li>
  <li>Ritmo normal, como se explicasse para um colega. Pode ler.</li>
  <li>Errou? Pare, respire e repita a frase inteira.</li>
  <li>Lugar silencioso, celular a um palmo da boca, sem ventilador perto.</li>
  <li>"n ao quadrado" e "n log n" se leem assim mesmo.</li>
</ul></div>
${trechos}</html>`;

const navegador = await chromium.launch();
const pagina = await navegador.newPage();
await pagina.setContent(html);
fs.mkdirSync(path.dirname(saida), { recursive: true });
await pagina.pdf({ path: saida, preferCSSPageSize: true, printBackground: true });
await navegador.close();
console.log(`narração: ${saida} (${CENAS.length} trechos)`);
