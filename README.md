# Algoritmos de Ordenação

Trabalho em vídeo de Estruturas de Dados 2, Unipê, Prof. Ed (2026.2).

| | |
|---|---|
| Tema | Algoritmos de Ordenação: Bubble Sort, Insertion Sort e Merge Sort (recursivo) |
| Dupla | Pedro Oliveira e Izaias Terto |
| Vídeo | LINK_DO_VIDEO |
| Linguagem | Java 17, sem biblioteca externa |

## O que é

Três algoritmos que resolvem o mesmo problema, colocar uma lista em ordem crescente, com
estratégias diferentes:

- **Bubble Sort** compara cada par de vizinhos e troca os que estão fora de ordem. A cada passada o
  maior valor da parte não ordenada chega ao lugar dele.
- **Insertion Sort** mantém a parte da esquerda sempre ordenada e encaixa nela um elemento por vez,
  como quem arruma cartas na mão.
- **Merge Sort** divide a lista ao meio, ordena cada metade com ele mesmo (recursão) e intercala as
  duas metades ordenadas.

O vídeo mostra a ideia de cada um em animação, percorre o código, coloca os três para correr com
a mesma lista e mede a diferença com 100.000 valores.

## Como compilar e executar

É preciso ter o JDK 17 ou mais novo (`java -version` para conferir).

No Windows (PowerShell), dentro da pasta do repositório:

```powershell
.\executar.ps1                        # a demonstração do vídeo, cena por cena
.\executar.ps1 demonstracao --cena 3  # só uma cena (de 1 a 4)
.\executar.ps1 testes                 # testes automáticos
```

No Linux ou no macOS:

```sh
./executar.sh                         # a demonstração do vídeo, cena por cena
./executar.sh demonstracao --cena 3
./executar.sh testes
```

Sem os scripts, os dois comandos são estes:

```sh
javac -encoding UTF-8 -d out src/*.java
java -cp out Demonstracao
```

No terminal do Windows, se os acentos saírem trocados, rode `chcp 65001` antes. O `executar.ps1`
já faz esse ajuste.

## O que tem aqui

```
src/
  Ordenacao.java      os três algoritmos, com a contagem de comparações
  Demonstracao.java   as quatro cenas que aparecem no vídeo
  Testes.java         testes, incluindo a comparação com o Arrays.sort do Java
  Terminal.java       saída em UTF-8
video/
  roteiro.mjs         as 13 cenas do vídeo, com a fala de cada uma
  NARRACAO.md         o texto da narração, trecho por trecho
  cena.html           a página que desenha os quadros
  motor/, cenas/      a animação, escrita em JavaScript puro sobre <canvas>
  construir.mjs       a linha de produção: dados, áudio, sincronia e render
  ferramentas/        voz de prévia e transcrição com tempos (Python)
executar.ps1, executar.sh
```

## As quatro cenas da demonstração

| Cena | O que mostra |
|---|---|
| 1 | O mesmo vetor de 8 valores ordenado pelos três, etapa por etapa |
| 2 | Casos de borda: vazio, um elemento, repetidos, negativos, já ordenado, invertido |
| 3 | Melhor e pior caso: comparações para ordenar 1.000 valores |
| 4 | Em escala: 1.000, 10.000 e 100.000 valores, com comparações e tempo |

A cena 3 imprime a tabela que resume o comportamento de cada um:

```
                      já ordenado      aleatório      invertido
  Bubble Sort                 999        497.730        499.500
  Insertion Sort              999        250.858        499.500
  Merge Sort                5.044          8.707          4.932

  n - 1 = 999      n(n - 1)/2 = 499.500      n log2 n = 9.966
```

E a cena 4, com 100.000 valores, dá a medida da diferença:

| Algoritmo | Comparações | Tempo nesta máquina |
|---|---|---|
| Bubble Sort | 4.999.834.079 | de 11 a 14 s |
| Insertion Sort | 2.504.337.312 | de 1 a 2 s |
| Merge Sort | 1.536.426 | de 10 a 20 ms |

Os valores são sorteados com semente fixa, então o número de comparações se repete em qualquer
máquina. O tempo muda de uma máquina para outra. Antes de medir, a cena 4 roda os três algoritmos
algumas vezes sem contar o tempo, para a JVM terminar de compilar o código (aquecimento).

## Complexidade

| Algoritmo | Melhor caso | Caso médio | Pior caso | Memória extra | Estável |
|---|---|---|---|---|---|
| Bubble Sort | O(n) | O(n²) | O(n²) | O(1) | sim |
| Insertion Sort | O(n) | O(n²) | O(n²) | O(1) | sim |
| Merge Sort | O(n log n) | O(n log n) | O(n log n) | O(n) | sim |

- O melhor caso do Bubble Sort só é O(n) por causa da variável `trocou`: se uma passada termina
  sem troca, o algoritmo para. Sem ela, seriam sempre n(n − 1)/2 comparações.
- O Insertion Sort é o mais rápido dos três quando a lista já está quase ordenada, porque quase
  nenhum elemento precisa andar.
- O Merge Sort paga a velocidade com memória: precisa de um vetor auxiliar do tamanho da lista.
- Os três são estáveis porque a comparação é estritamente "maior": dois valores iguais nunca
  trocam de ordem entre si. No Merge Sort isso depende de levar o da esquerda em caso de empate.

Na prática, a ordenação de objetos do Java (`Arrays.sort(Object[])` e `Collections.sort`) usa o
TimSort, que combina os dois: Merge Sort nos trechos grandes e Insertion Sort nos pequenos.

## Decisões da implementação

- **Toda comparação passa por `maior(a, b)`.** A função devolve `a > b` e soma um no contador. É o
  que permite comparar os algoritmos por um número que não depende da máquina.
- **O vetor auxiliar do Merge Sort é criado uma vez** e reaproveitado por todas as chamadas, em vez
  de um vetor novo a cada intercalação.
- **`meio = inicio + (fim - inicio) / 2`** em vez de `(inicio + fim) / 2`, que estoura o `int` em
  vetores muito grandes.
- **As chamadas `mostrar(...)`** existem só para a cena 1 imprimir cada etapa. Elas não fazem parte
  dos algoritmos e não aparecem nos trechos de código do vídeo.

## Testes

`Testes.java` faz 42 verificações. Para cada algoritmo: 11 casos de borda (vazio, um elemento,
repetidos, negativos, extremos do `int`...) e 2.000 vetores sorteados comparados com o
`Arrays.sort` do Java. Além disso confere o número exato de comparações do melhor e do pior caso
(n − 1 e n(n − 1)/2) e o limite de n · ⌈log₂ n⌉ do Merge Sort.

## Como o vídeo foi feito

A animação é código: cada quadro é desenhado por uma função do tempo, em JavaScript sobre
`<canvas>`, e gravado por um navegador automatizado. Nada ali foi digitado duas vezes:

- os trechos de código que aparecem na tela são lidos de `src/Ordenacao.java`;
- o vetor da corrida e as contagens vêm de `java Demonstracao --dados`;
- a saída do terminal é a do programa de verdade, capturada linha por linha, e os números do
  gráfico em escala são lidos dessa mesma execução;
- os três algoritmos foram reescritos em JavaScript para a animação, e a produção para se o
  número de comparações deles for diferente do que o Java mediu;
- a animação acompanha a narração: o áudio é transcrito com o instante de cada palavra, e cada
  ponto de sincronia do roteiro é ligado ao momento em que a frase é dita.

Para refazer (Node 20, ffmpeg e Playwright; a transcrição usa faster-whisper):

```sh
node video/construir.mjs tudo
```

Os áudios da narração ficam em `video/narracao/`, um por cena, fora do repositório. Sem eles a
produção usa uma voz sintética local só para medir o tempo.
