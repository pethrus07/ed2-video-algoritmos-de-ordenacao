# -*- coding: utf-8 -*-
"""Transcreve cada áudio com o instante de cada palavra (faster-whisper, local).

    python palavras.py <pasta com os .wav> <pasta de saída>

Um .json por áudio: [{"texto": "palavra", "ini": 1.23, "fim": 1.51}, ...].
A linha de produção usa esses instantes para sincronizar a animação com a fala.
"""
import json
import os
import sys

# No Windows, as bibliotecas da GPU instaladas pelo pip ficam em site-packages/nvidia/*/bin e o
# sistema não as encontra sozinho: sem isto a transcrição cai com "cublas64_12.dll is not found".
for base in sys.path:
    nvidia = os.path.join(base, "nvidia")
    if os.path.isdir(nvidia):
        for pacote in os.listdir(nvidia):
            pasta = os.path.join(nvidia, pacote, "bin")
            if os.path.isdir(pasta):
                os.add_dll_directory(pasta)
                os.environ["PATH"] = pasta + os.pathsep + os.environ["PATH"]

from faster_whisper import WhisperModel  # noqa: E402


def transcrever(modelo, arquivo):
    segmentos, _ = modelo.transcribe(arquivo, language="pt", word_timestamps=True, vad_filter=False)
    return [{"texto": p.word.strip(), "ini": round(p.start, 3), "fim": round(p.end, 3)} for s in segmentos for p in s.words]


def main():
    entrada, saida = sys.argv[1], sys.argv[2]
    os.makedirs(saida, exist_ok=True)
    # WHISPER=cpu roda no processador: mais lento, mas não disputa a placa de vídeo com outro programa
    if os.environ.get("WHISPER", "").lower() == "cpu":
        modelo, onde = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8"), "CPU"
    else:
        modelo, onde = WhisperModel("large-v3-turbo", device="cuda", compute_type="float16"), "GPU"
    for nome in sorted(f for f in os.listdir(entrada) if f.endswith(".wav")):
        destino = os.path.join(saida, nome[:-4] + ".json")
        origem = os.path.join(entrada, nome)
        if os.path.exists(destino) and os.path.getmtime(destino) >= os.path.getmtime(origem):
            continue
        try:
            palavras = transcrever(modelo, origem)
        except RuntimeError:
            if onde == "CPU":
                raise
            # a GPU recusou (biblioteca ausente ou memória): segue no processador, mais devagar
            modelo, onde = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8"), "CPU"
            palavras = transcrever(modelo, origem)
        with open(destino, "w", encoding="utf-8") as f:
            json.dump(palavras, f, ensure_ascii=False)
        print(f"{nome}: {len(palavras)} palavras ({onde})", flush=True)


if __name__ == "__main__":
    main()
