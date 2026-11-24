# -*- coding: utf-8 -*-
"""Gera a narração de PRÉVIA com uma voz sintética local (Kokoro), só para acertar o tempo da animação.

    python voz_previa.py <pasta com os .txt> <pasta de saída>

Um .wav por .txt. Roda na máquina, sem mandar o texto para nenhum serviço.
A prévia não vai para o vídeo final: o enunciado exige a voz de um aluno.
"""
import os
import sys

import numpy as np
import soundfile as sf
from kokoro import KPipeline


def main():
    entrada, saida = sys.argv[1], sys.argv[2]
    os.makedirs(saida, exist_ok=True)
    pipe = KPipeline(lang_code="p", repo_id="hexgrad/Kokoro-82M")
    for nome in sorted(f for f in os.listdir(entrada) if f.endswith(".txt")):
        destino = os.path.join(saida, nome[:-4] + ".wav")
        origem = os.path.join(entrada, nome)
        if os.path.exists(destino) and os.path.getmtime(destino) >= os.path.getmtime(origem):
            continue
        with open(origem, encoding="utf-8") as f:
            texto = f.read().strip()
        pedacos = [audio for _, _, audio in pipe(texto, voice="pm_alex", speed=0.8)]
        onda = np.concatenate([p.numpy() if hasattr(p, "numpy") else p for p in pedacos])
        sf.write(destino, onda, 24000)
        print(f"{nome}: {len(onda) / 24000:.1f} s", flush=True)


if __name__ == "__main__":
    main()
