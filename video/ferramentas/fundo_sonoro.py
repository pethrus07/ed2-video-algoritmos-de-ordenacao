"""Fundo sonoro do vídeo, gerado aqui mesmo (sem arquivo de terceiros, sem licença para conferir).

Uma cama de acordes longos, bem lenta e sem melodia, para ficar por baixo da narração, e um sopro curto
na troca de cada cena. É síntese simples: senoides com poucos harmônicos e ruído filtrado.

    python fundo_sonoro.py <duracao em segundos> <json com o inicio de cada cena> <saida.wav>

O volume final é decidido na mixagem (construir.mjs), que deixa o fundo 20 LU abaixo da voz.
"""
import json
import sys

import numpy as np
import soundfile as sf

duracao, cenas, saida = float(sys.argv[1]), json.loads(sys.argv[2]), sys.argv[3]
TAXA = 48000
n = int(duracao * TAXA)
sorteio = np.random.default_rng(7)  # semente fixa: o fundo sai igual a cada geração

# quatro acordes abertos em lá menor / dó maior (Hz), 9 segundos cada, emendados com fusão longa
ACORDES = [
    [110.00, 164.81, 246.94, 261.63, 392.00],  # lám9
    [87.31, 130.81, 220.00, 329.63],           # fá maior com sétima
    [130.81, 196.00, 246.94, 329.63],          # dó maior com sétima
    [98.00, 146.83, 246.94, 329.63],           # sol com sexta
]
PASSO, FUSAO = 9.0, 3.5
esq, dir_ = np.zeros(n), np.zeros(n)
for k in range(int(duracao / PASSO) + 2):
    ini = int((k * PASSO - FUSAO / 2) * TAXA)
    tamanho = int((PASSO + FUSAO) * TAXA)
    a, b = max(0, ini), min(n, ini + tamanho)
    if a >= b:
        continue
    t = (np.arange(a, b) - ini) / TAXA
    # entra e sai em meia onda de cosseno: não há ataque para competir com a fala
    envoltoria = np.clip(np.minimum(t / FUSAO, (PASSO + FUSAO - t) / FUSAO), 0, 1)
    envoltoria = 0.5 - 0.5 * np.cos(np.pi * envoltoria)
    for i, f in enumerate(ACORDES[k % len(ACORDES)]):
        f *= 2  # uma oitava acima: a energia fica entre 170 e 800 Hz, onde caixa de celular ainda reproduz
        forca = (0.6, 1.0, 0.9, 0.8, 0.5)[i]  # a nota mais grave é a mais fraca, para o fundo não embolar a voz
        for desvio, lado in ((-0.0016, 0.28), (0.0016, 0.72)):  # duas vozes levemente desafinadas, uma de cada lado
            fase = 2 * np.pi * f * (1 + desvio) * t + sorteio.uniform(0, 2 * np.pi)
            onda = np.sin(fase) + 0.16 * np.sin(2 * fase) + 0.05 * np.sin(3 * fase)
            esq[a:b] += onda * envoltoria * forca * (1 - lado)
            dir_[a:b] += onda * envoltoria * forca * lado
# respiração lenta do conjunto
tempo = np.arange(n) / TAXA
respira = 1 + 0.14 * np.sin(2 * np.pi * 0.06 * tempo)
esq *= respira
dir_ *= respira

# sopro na troca de cena: ruído com os agudos e os graves cortados, subindo e sumindo em menos de um segundo
def sopro(tamanho):
    ruido = sorteio.standard_normal(tamanho)
    espectro = np.fft.rfft(ruido)
    freq = np.fft.rfftfreq(tamanho, 1 / TAXA)
    espectro *= np.exp(-((np.log2(np.maximum(freq, 1) / 1400)) ** 2) / (2 * 0.9 ** 2))  # sino em torno de 1,4 kHz
    som = np.fft.irfft(espectro, tamanho)
    t = np.arange(tamanho) / tamanho
    return som / np.max(np.abs(som)) * np.sin(np.pi * t) ** 2 * (1 - t) ** 0.6

pico_cama = max(np.max(np.abs(esq)), np.max(np.abs(dir_)), 1e-9)
for inicio in cenas[1:]:
    tamanho = int(0.9 * TAXA)
    a = int((inicio - 0.35) * TAXA)
    if a < 0 or a + tamanho > n:
        continue
    s = sopro(tamanho) * pico_cama * 0.5
    esq[a:a + tamanho] += s * 0.9
    dir_[a:a + tamanho] += s * 1.1

som = np.stack([esq, dir_], axis=1)
som /= np.max(np.abs(som)) * 2  # pico em -6 dB; o volume de verdade é dado na mixagem
entrada, final = int(2.0 * TAXA), int(3.0 * TAXA)
som[:entrada] *= np.linspace(0, 1, entrada)[:, None] ** 2
som[-final:] *= np.linspace(1, 0, final)[:, None] ** 2
sf.write(saida, som.astype(np.float32), TAXA, subtype="PCM_16")
print(f"fundo sonoro: {duracao:.1f} s, {len(cenas) - 1} trocas de cena")
