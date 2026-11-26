# -*- coding: utf-8 -*-
"""Descobre que parte de cada áudio recebido corresponde a cada cena do roteiro.

    python alinhar.py <pasta com a000.json, a001.json ...> <roteiro.json>

O narrador pode mandar um áudio por cena, um áudio só com tudo ou qualquer divisão no meio do caminho.
Cada transcrição (com o instante de cada palavra) é alinhada com o texto inteiro do roteiro; onde três ou
mais palavras seguidas batem, aquele pedaço do áudio fica ancorado na cena. A fronteira entre uma cena e a
seguinte, dentro do mesmo áudio, é a maior pausa entre a última âncora de uma e a primeira da outra.

Escreve na saída um JSON: {"cenas": [{"palavras": n}], "segmentos": [...], "arquivos": [...]}.
"""
import difflib
import json
import os
import re
import sys
import unicodedata
from collections import Counter


def norma(palavra):
    sem = "".join(c for c in unicodedata.normalize("NFD", palavra) if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", sem.lower())


def main():
    pasta, arq_roteiro = sys.argv[1], sys.argv[2]
    with open(arq_roteiro, encoding="utf-8") as f:
        cenas = json.load(f)
    texto, cena_de = [], []
    for k, c in enumerate(cenas):
        for palavra in c["texto"].split():
            n = norma(palavra)
            if n:
                texto.append(n)
                cena_de.append(k)
    tamanho = Counter(cena_de)
    segmentos, arquivos = [], []
    nomes = sorted(f for f in os.listdir(pasta) if re.fullmatch(r"a\d+\.json", f))
    for ordem, nome in enumerate(nomes):
        with open(os.path.join(pasta, nome), encoding="utf-8") as f:
            palavras = [w for w in json.load(f) if norma(w["texto"])]
        ditas = [norma(w["texto"]) for w in palavras]
        cena_da, pos_da = [-1] * len(ditas), [-1] * len(ditas)
        if len(ditas) >= 4:
            casador = difflib.SequenceMatcher(None, texto, ditas, autojunk=False)
            for a, b, n in casador.get_matching_blocks():
                if n >= 3:
                    for x in range(n):
                        cena_da[b + x], pos_da[b + x] = cena_de[a + x], a + x
        ancoradas = Counter(c for c in cena_da if c >= 0)
        # cena com meia dúzia de palavras batendo por acaso não conta
        validas = {c for c, n in ancoradas.items() if n >= max(6, 0.12 * tamanho[c])}
        trechos = []  # [cena, primeira palavra ancorada, última]
        for i, c in enumerate(cena_da):
            if c not in validas:
                continue
            if trechos and trechos[-1][0] == c:
                trechos[-1][2] = i
            else:
                trechos.append([c, i, i])
        cortes = [0.0]
        for r in range(len(trechos) - 1):
            melhor, instante = -1.0, None
            for i in range(trechos[r][2], trechos[r + 1][1]):
                pausa = palavras[i + 1]["ini"] - palavras[i]["fim"]
                if pausa > melhor:
                    melhor, instante = pausa, (palavras[i]["fim"] + palavras[i + 1]["ini"]) / 2
            cortes.append(instante)
        cortes.append(None)  # o último trecho vai até o fim do arquivo
        for r, (c, i0, i1) in enumerate(trechos):
            posicoes = [pos_da[i] for i in range(i0, i1 + 1) if cena_da[i] == c]
            segmentos.append({"ordem": ordem, "cena": c, "de": round(cortes[r], 3), "ate": None if cortes[r + 1] is None else round(cortes[r + 1], 3),
                              "s0": min(posicoes), "s1": max(posicoes), "ancoradas": len(set(posicoes))})
        arquivos.append({"ordem": ordem, "palavras": len(ditas), "ancoradas": sum(n for c, n in ancoradas.items() if c in validas), "cenas": sorted(validas)})
    json.dump({"cenas": [{"palavras": tamanho[k]} for k in range(len(cenas))], "segmentos": segmentos, "arquivos": arquivos}, sys.stdout)


if __name__ == "__main__":
    main()
