# Narração · Algoritmos de Ordenação

Trabalho de Estruturas de Dados 2 (Unipê, Prof. Ed) · Pedro Oliveira e Izaias Terto

São 13 trechos. Grave **um áudio por trecho**, na ordem, e mande com o número no nome (01, 02 ...).

- Fale no seu ritmo normal, como se explicasse para um colega. Não precisa decorar: pode ler.
- Errou? Pare, respire e repita a frase inteira. O trecho ruim é cortado depois.
- Lugar silencioso, celular a um palmo da boca, sem ventilador ligado perto.
- "n ao quadrado" e "n log n" se leem assim mesmo. "Unipê" com a tônica no "pê".

## 01 · Abertura

Toda vez que você pede uma lista de preços do menor para o maior, ou olha um ranking, tem um algoritmo de ordenação trabalhando.

Eu sou o Izaias Terto e, junto com o Pedro Oliveira, apresento este trabalho de Estruturas de Dados 2, da Unipê, com o professor Ed.

Vamos ver três algoritmos: o Bubble Sort, o Insertion Sort e o Merge Sort.

E descobrir por que um deles chega a ser milhares de vezes mais rápido que os outros.

_80 palavras, perto de 33 segundos._

## 02 · Por que ordenar

Por que ordenar importa tanto? Porque dado ordenado é dado fácil de achar.

Em uma lista bagunçada, para encontrar um valor é preciso olhar um por um.

Em uma lista ordenada, dá para abrir no meio e descartar metade a cada passo.

Com um milhão de itens, são vinte passos em vez de um milhão.

Só que ordenar tem um custo. E esse custo depende muito do algoritmo escolhido.

_69 palavras, perto de 29 segundos._

## 03 · Bubble Sort

O primeiro é o Bubble Sort, o mais simples dos três.

A ideia é percorrer a lista comparando cada par de vizinhos. Se o da esquerda for maior, os dois trocam de lugar.

No fim da primeira passada, o maior valor foi empurrado até a última posição, como uma bolha que sobe.

Depois é só repetir. A cada passada, mais um valor chega ao lugar definitivo, e a parte que falta ordenar fica menor.

Quando uma passada inteira termina sem nenhuma troca, a lista está ordenada e o algoritmo para.

_90 palavras, perto de 38 segundos._

## 04 · Bubble Sort no código

No código, são dois laços.

O de fora conta as passadas.

O de dentro percorre os vizinhos, e vai só até onde ainda não está ordenado.

Esta é a comparação entre os dois vizinhos.

E esta é a troca, usando uma variável auxiliar.

A variável trocou é uma otimização. Se a passada termina sem troca, o laço de fora é interrompido.

O problema do Bubble Sort é a quantidade de comparações. Para n elementos, são perto de n ao quadrado dividido por dois.

Dobrou a lista, quadruplicou o trabalho.

_89 palavras, perto de 37 segundos._

## 05 · Insertion Sort

O segundo é o Insertion Sort. É o jeito que muita gente arruma cartas na mão.

Você pega uma carta nova e vai comparando com as que já estão arrumadas, da direita para a esquerda.

As maiores abrem espaço, cada uma andando uma casa para a direita.

E a carta nova se encaixa no lugar certo.

A parte da esquerda está sempre ordenada, e cresce uma carta por vez.

Se a lista já estiver quase ordenada, quase ninguém precisa andar, e o algoritmo termina muito rápido. Esse é o ponto forte dele.

_92 palavras, perto de 38 segundos._

## 06 · Insertion Sort no código

No código, o laço de fora escolhe o elemento da vez, que chamamos de chave.

A chave é guardada em uma variável, porque a posição dela vai ser sobrescrita.

O laço de dentro anda para a esquerda enquanto encontrar valores maiores que a chave.

E copia cada um deles uma casa para a direita.

Quando o laço para, a posição que ficou vaga é o lugar da chave.

No pior caso, com a lista invertida, o custo também é n ao quadrado.

Mas no melhor caso, com a lista já ordenada, é só n.

_94 palavras, perto de 39 segundos._

## 07 · Merge Sort

O terceiro muda de estratégia. O Merge Sort usa a ideia de dividir para conquistar.

Ele corta a lista ao meio. Depois corta cada metade ao meio de novo, e continua até sobrar pedaços de um elemento só.

E uma lista de um elemento já está ordenada.

Agora vem a volta. Duas listas ordenadas podem ser juntadas em uma só de um jeito muito barato: basta comparar o primeiro de cada uma e levar o menor.

Juntando de dois em dois, de baixo para cima, a lista inteira volta ordenada.

Repare na forma. Para oito elementos, são só três níveis de divisão. Para um milhão, são vinte. E em cada nível, cada elemento é visitado uma vez.

_117 palavras, perto de 49 segundos._

## 08 · Merge Sort no código

O código tem duas funções. A primeira é a recursiva.

Se o trecho tem um elemento ou nenhum, não há o que fazer. É o caso base, que faz a recursão parar.

Senão, ela calcula o meio.

Chama a si mesma para a metade esquerda e para a metade direita.

E depois intercala as duas.

A segunda função é a intercalação. Ela usa um vetor auxiliar.

Compara o primeiro de cada metade, copia o menor e avança.

Quando uma metade acaba, copia o que sobrou da outra.

E no fim devolve tudo para o vetor original.

O custo é n vezes log de n, em qualquer caso. O preço é a memória extra do vetor auxiliar.

_116 palavras, perto de 48 segundos._

## 09 · A corrida

Hora de colocar os três para correr, com a mesma lista de 64 valores.

Cada comparação conta como um passo.

O Merge Sort termina primeiro, com folga.

O Insertion Sort chega depois.

E o Bubble Sort ainda está empurrando bolhas.

No placar: 309 comparações para o Merge Sort, 1.020 para o Insertion Sort e 1.950 para o Bubble Sort.

_59 palavras, perto de 25 segundos._

## 10 · Em escala

Com 64 valores a diferença já aparece. Com cem mil, ela vira um abismo.

Medimos no nosso programa. Para ordenar cem mil números, o Bubble Sort fez quase cinco bilhões de comparações.

O Insertion Sort, dois bilhões e meio.

E o Merge Sort, um milhão e meio.

São mais de três mil vezes menos trabalho.

No relógio, o Bubble Sort levou mais de dez segundos. O Merge Sort, cerca de um centésimo de segundo.

É a diferença entre crescer com n ao quadrado e crescer com n log n.

_89 palavras, perto de 37 segundos._

## 11 · O programa rodando

Agora o programa rodando.

Este é o código Java do nosso repositório, executado no terminal.

Primeiro ele ordena um vetor de oito valores e mostra cada etapa dos três algoritmos.

Depois vêm os casos de borda: vetor vazio, de um elemento, com repetidos, com negativos. Os três algoritmos têm de concordar.

Aqui, o melhor e o pior caso com mil valores. Com a lista já ordenada, o Bubble e o Insertion fazem só 999 comparações. Com a lista invertida, quase quinhentas mil.

E a medição em escala, de onde saíram os números que você acabou de ver.

Por fim, os testes. Cada algoritmo é comparado com a ordenação do próprio Java em dois mil vetores sorteados.

_116 palavras, perto de 48 segundos._

## 12 · Comparação

Resumindo.

O Bubble Sort e o Insertion Sort custam n ao quadrado no caso médio e no pior caso, mas não gastam memória extra.

No melhor caso, com a lista já ordenada, os dois caem para n.

O Merge Sort custa n log n sempre, mas precisa de um vetor auxiliar do tamanho da lista.

Os três são estáveis: valores iguais mantêm a ordem em que chegaram.

E no mundo real? A ordenação de objetos do Java usa o TimSort, que é justamente uma mistura dos dois: Merge Sort nos trechos grandes e Insertion Sort nos pequenos.

_97 palavras, perto de 40 segundos._

## 13 · Fecho

Para levar.

Algoritmo simples não é sinônimo de algoritmo ruim. Mas, quando os dados crescem, a estratégia importa mais que a máquina.

Dividir para conquistar transforma n ao quadrado em n log n.

O código, os testes e a animação deste vídeo estão no nosso repositório no GitHub. O link está na descrição.

Obrigado por assistir!

_56 palavras, perto de 23 segundos._

