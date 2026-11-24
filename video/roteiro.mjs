// Roteiro do vídeo: uma entrada por cena, com a fala e os pontos de sincronia.
//
// {{nome}} dentro da fala marca o instante em que a animação reage (uma troca de foco, um número
// que entra). O marcador não é lido: some do texto que vai para o narrador. O instante de cada um é
// tirado do próprio áudio (ver construir.mjs).
//
// `confere` guarda o que a fala afirma em números. Se o programa Java medir outra coisa, a
// construção para: a fala nunca fica dizendo um número que o programa não produziu.

export const TITULO = "Algoritmos de Ordenação";
export const DUPLA = "Pedro Oliveira e Izaias Terto";
export const NARRADOR = "Izaias Terto";
export const REPOSITORIO = "github.com/pethrus07/ed2-video-algoritmos-de-ordenacao";

export const CENAS = [
  {
    id: "abertura", capitulo: "Abertura",
    fala: `Toda vez que você pede uma lista de preços do menor para o maior, {{ranking}} ou olha um ranking, {{algoritmo}} tem um algoritmo de ordenação trabalhando.
{{titulo}} Eu sou o Izaias Terto e, junto com o Pedro Oliveira, apresento este trabalho de Estruturas de Dados 2, da Unipê, com o professor Ed.
{{tres}} Vamos ver três algoritmos: o Bubble Sort, o Insertion Sort e o Merge Sort.
{{pergunta}} E descobrir por que um deles termina em milésimos de segundo o que outro leva segundos para fazer.`,
    confere: (d) => [
      [d.escala[100000].bubble.ms >= 2000, "a abertura diz que um deles leva segundos"],
      [d.escala[100000].merge.ms < 200, "a abertura diz que outro termina em milésimos de segundo"],
    ],
  },
  {
    id: "porque", capitulo: "Por que ordenar",
    fala: `Por que ordenar importa tanto? Porque dado ordenado é dado fácil de achar.
{{busca}} Em uma lista bagunçada, para encontrar um valor é preciso olhar um por um.
{{binaria}} Em uma lista ordenada, dá para abrir no meio e descartar metade a cada passo.
{{numeros}} Com um milhão de itens, são vinte passos em vez de um milhão.
{{custo}} Só que ordenar tem um custo. E esse custo depende muito do algoritmo escolhido.`,
  },
  {
    id: "bubbleIdeia", capitulo: "Bubble Sort",
    fala: `O primeiro é o Bubble Sort, o mais simples dos três.
{{regra}} A ideia é percorrer a lista comparando cada par de vizinhos. Se o da esquerda for maior, os dois trocam de lugar.
{{passada}} No fim da primeira passada, o maior valor foi empurrado até a última posição, como uma bolha que sobe.
{{repete}} Depois é só repetir. A cada passada, mais um valor chega ao lugar definitivo, e a parte que falta ordenar fica menor.
{{fim}} Quando uma passada inteira termina sem nenhuma troca, a lista está ordenada e o algoritmo para.`,
  },
  {
    id: "bubbleCodigo", capitulo: "Bubble Sort no código",
    fala: `No código, são dois laços.
{{externo}} O de fora conta as passadas.
{{interno}} O de dentro percorre os vizinhos, e vai só até onde ainda não está ordenado.
{{compara}} Esta é a comparação entre os dois vizinhos.
{{troca}} E esta é a troca, usando uma variável auxiliar.
{{flag}} A variável trocou é uma otimização. Se a passada termina sem troca, o laço de fora é interrompido.
{{custo}} O problema do Bubble Sort é a quantidade de comparações. Para n elementos, são perto de n ao quadrado dividido por dois.
{{dobro}} Dobrou a lista, quadruplicou o trabalho.`,
  },
  {
    id: "insertionIdeia", capitulo: "Insertion Sort",
    fala: `O segundo é o Insertion Sort. É o jeito que muita gente arruma cartas na mão.
{{cartas}} Você pega uma carta nova e vai comparando com as que já estão arrumadas, da direita para a esquerda.
{{desloca}} As maiores abrem espaço, cada uma andando uma casa para a direita.
{{encaixa}} E a carta nova se encaixa no lugar certo.
{{parte}} A parte da esquerda está sempre ordenada, e cresce uma carta por vez.
{{quase}} Se a lista já estiver quase ordenada, quase ninguém precisa andar, e o algoritmo termina muito rápido. Esse é o ponto forte dele.`,
  },
  {
    id: "insertionCodigo", capitulo: "Insertion Sort no código",
    fala: `No código, o laço de fora escolhe o elemento da vez, que chamamos de chave.
{{chave}} A chave é guardada em uma variável, porque a posição dela vai ser sobrescrita.
{{while}} O laço de dentro anda para a esquerda enquanto encontrar valores maiores que a chave.
{{desloca}} E copia cada um deles uma casa para a direita.
{{encaixa}} Quando o laço para, a posição que ficou vaga é o lugar da chave.
{{custo}} No pior caso, com a lista invertida, o custo também é n ao quadrado.
{{melhor}} Mas no melhor caso, com a lista já ordenada, é só n.`,
  },
  {
    id: "mergeIdeia", capitulo: "Merge Sort",
    fala: `O terceiro muda de estratégia. O Merge Sort usa a ideia de dividir para conquistar.
{{divide}} Ele corta a lista ao meio. Depois corta cada metade ao meio de novo, e continua até sobrar pedaços de um elemento só.
{{um}} E uma lista de um elemento já está ordenada.
{{intercala}} Agora vem a volta. Duas listas ordenadas podem ser juntadas em uma só de um jeito muito barato: basta comparar o primeiro de cada uma e levar o menor.
{{sobe}} Juntando de dois em dois, de baixo para cima, a lista inteira volta ordenada.
{{niveis}} Repare na forma. Para oito elementos, são só três níveis de divisão. {{milhao}} Para um milhão, são vinte. {{visita}} E em cada nível, cada elemento é visitado uma vez.`,
  },
  {
    id: "mergeCodigo", capitulo: "Merge Sort no código",
    fala: `O código tem duas funções. A primeira é a recursiva.
{{base}} Se o trecho tem um elemento ou nenhum, não há o que fazer. É o caso base, que faz a recursão parar.
{{meio}} Senão, ela calcula o meio.
{{chamadas}} Chama a si mesma para a metade esquerda e para a metade direita.
{{junta}} E depois intercala as duas.
{{intercalar}} A segunda função é a intercalação. Ela usa um vetor auxiliar.
{{laco}} Compara o primeiro de cada metade, copia o menor e avança.
{{resto}} Quando uma metade acaba, copia o que sobrou da outra.
{{copia}} E no fim devolve tudo para o vetor original.
{{custo}} O custo é n vezes log de n, em qualquer caso. O preço é a memória extra do vetor auxiliar.`,
  },
  {
    id: "corrida", capitulo: "A corrida",
    fala: `Hora de colocar os três para correr, com a mesma lista de 64 valores.
{{larga}} Cada comparação conta como um passo.
{{merge}} O Merge Sort termina primeiro, com folga.
{{insertion}} O Insertion Sort chega depois.
{{bubble}} E o Bubble Sort ainda está empurrando bolhas.
{{placar}} No placar: 309 comparações para o Merge Sort, 1.020 para o Insertion Sort e 1.950 para o Bubble Sort.`,
    confere: (d) => [
      [d.comparacoes64.merge === 309, "a fala diz 309 comparações do Merge Sort na corrida"],
      [d.comparacoes64.insertion === 1020, "a fala diz 1.020 comparações do Insertion Sort na corrida"],
      [d.comparacoes64.bubble === 1950, "a fala diz 1.950 comparações do Bubble Sort na corrida"],
    ],
  },
  {
    id: "escala", capitulo: "Em escala",
    fala: `Com 64 valores a diferença já aparece. Com cem mil, ela vira um abismo.
{{grafico}} Medimos no nosso programa. Para ordenar cem mil números, o Bubble Sort fez quase cinco bilhões de comparações.
{{insertion}} O Insertion Sort, dois bilhões e meio.
{{merge}} E o Merge Sort, um milhão e meio.
{{vezes}} São mais de três mil vezes menos trabalho.
{{tempo}} No relógio, o Bubble Sort levou segundos. O Merge Sort, milésimos de segundo.
{{curvas}} É a diferença entre crescer com n ao quadrado e crescer com n log n.`,
    confere: (d) => {
      const e = d.escala[100000];
      return [
        [e.bubble.comparacoes > 4.9e9 && e.bubble.comparacoes < 5e9, "a fala diz quase cinco bilhões de comparações do Bubble Sort"],
        [Math.abs(e.insertion.comparacoes - 2.5e9) < 0.1e9, "a fala diz dois bilhões e meio do Insertion Sort"],
        [Math.abs(e.merge.comparacoes - 1.5e6) < 0.1e6, "a fala diz um milhão e meio do Merge Sort"],
        [e.bubble.comparacoes / e.merge.comparacoes > 3000, "a fala diz mais de três mil vezes"],
        // o tempo muda com a máquina e até com a temperatura dela: a fala só afirma a ordem de grandeza
        [e.bubble.ms >= 2000, "a fala diz que o Bubble Sort levou segundos"],
        [e.merge.ms < 200, "a fala diz que o Merge Sort levou milésimos de segundo"],
      ];
    },
  },
  {
    id: "terminal", capitulo: "O programa rodando",
    fala: `Agora, na prática. Esta é a gravação do nosso terminal.
{{compila}} Primeiro compilamos o código com o javac.
{{roda}} E rodamos a demonstração. Ela começa com o mesmo vetor de oito valores dos exemplos. O Bubble Sort mostra o vetor ao fim de cada passada: foram cinco passadas e 25 comparações.
{{ins}} O Insertion Sort mostra cada encaixe, e resolve com 18.
{{mer}} E o Merge Sort mostra cada intercalação, com 17 comparações.
{{c2}} Depois vêm os casos de borda: vetor vazio, de um elemento, com repetidos, com negativos. Os três algoritmos têm de devolver a mesma resposta.
{{c3}} Aqui, o melhor e o pior caso com mil valores. Com a lista já ordenada, o Bubble e o Insertion fazem só 999 comparações. Com a lista invertida, quase quinhentas mil.
{{c4}} Por último, a medição em escala. Com mil e com dez mil valores, a resposta sai na hora. Com cem mil, repare: o programa parou na linha do Bubble Sort. Neste momento ele está fazendo quase cinco bilhões de comparações. É o n ao quadrado acontecendo de verdade.
{{pronto}} Pronto. O Insertion Sort vem logo depois, e o Merge Sort termina tão rápido que nem dá para ver.
{{testes}} Para fechar, os testes automáticos. Cada algoritmo é comparado com a ordenação do próprio Java em dois mil vetores sorteados. Quarenta e duas verificações, nenhuma falha.`,
    confere: (d) => [
      [d.comparacoes8.bubble === 25 && d.passadas8 === 5, "a fala diz cinco passadas e 25 comparações do Bubble Sort no vetor de oito"],
      [d.comparacoes8.insertion === 18, "a fala diz 18 comparações do Insertion Sort no vetor de oito"],
      [d.comparacoes8.merge === 17, "a fala diz 17 comparações do Merge Sort no vetor de oito"],
      [d.casos.bubble.ordenado === 999 && d.casos.insertion.ordenado === 999, "a fala diz 999 comparações com a lista já ordenada"],
      [d.casos.bubble.invertido > 490000 && d.casos.bubble.invertido < 500000, "a fala diz quase quinhentas mil com a lista invertida"],
      [d.escala[100000].bubble.comparacoes > 4.9e9 && d.escala[100000].bubble.comparacoes < 5e9, "a fala diz quase cinco bilhões de comparações"],
      [d.escala[100000].merge.ms < 200, "a fala diz que o Merge Sort termina tão rápido que nem dá para ver"],
      [d.testes === "42 verificações, 0 falhas", "a fala diz quarenta e duas verificações, nenhuma falha"],
    ],
    /**
     * Como a fala se encaixa na gravação do terminal. Cada marca com `blocos` dispara um trecho da gravação,
     * que toca na velocidade real; cada marca com `esperas` só começa a ser dita depois que aquele instante
     * da gravação apareceu. Entre um trecho e outro a imagem fica parada no último quadro, como quem espera
     * para apertar Enter.
     */
    gravacao: (g) => {
      const em = (nome, filtro = () => true, ordem = 0) => {
        const e = g.eventos.filter((x) => x.nome === nome && filtro(x))[ordem];
        if (!e) throw new Error(`a gravação do terminal não tem o evento "${nome}" (${ordem})`);
        return e.t;
      };
      const pausa = (n) => em("pausa", (e) => e.n === n), segue = (n) => em("segue", (e) => e.n === n);
      const javac = (e) => e.comando.startsWith("javac"), demo = (e) => e.comando.endsWith("Demonstracao"), testes = (e) => e.comando.endsWith("Testes");
      return {
        blocos: {
          compila: [em("digita", javac) - 0.3, em("terminou", javac) + 0.3],
          roda: [em("digita", demo) - 0.3, pausa(1) + 0.3],
          ins: [segue(1) - 0.05, pausa(2) + 0.3],
          mer: [segue(2) - 0.05, pausa(3) + 0.3],
          c2: [segue(3) - 0.05, pausa(4) + 0.3],
          c3: [segue(4) - 0.05, pausa(5) + 0.3],
          c4: [segue(5) - 0.05, em("terminou", demo) + 0.3],
          testes: [em("digita", testes) - 0.3, em("fim") + 0.5],
        },
        esperas: { pronto: em("mediu", (e) => e.algoritmo === "bubble" && e.n === 100000) },
      };
    },
  },
  {
    id: "resumo", capitulo: "Comparação",
    fala: `Resumindo.
{{tabela}} O Bubble Sort e o Insertion Sort custam n ao quadrado no caso médio e no pior caso, mas não gastam memória extra.
{{melhor}} No melhor caso, com a lista já ordenada, os dois caem para n.
{{merge}} O Merge Sort custa n log n sempre, mas precisa de um vetor auxiliar do tamanho da lista.
{{estavel}} Os três são estáveis: valores iguais mantêm a ordem em que chegaram.
{{real}} E no mundo real? A ordenação de objetos do Java usa o TimSort, que é justamente uma mistura dos dois: Merge Sort nos trechos grandes e Insertion Sort nos pequenos.`,
  },
  {
    id: "fecho", capitulo: "Fecho",
    fala: `Para levar.
{{um}} Algoritmo simples não é sinônimo de algoritmo ruim. Mas, quando os dados crescem, a estratégia importa mais que a máquina.
{{dois}} Dividir para conquistar transforma n ao quadrado em n log n.
{{repo}} O código, os testes e a animação deste vídeo estão no nosso repositório no GitHub. O link está na descrição.
{{obrigado}} Obrigado por assistir!`,
  },
];

/** Texto que o narrador lê: sem os marcadores e com um espaço só entre as palavras. */
export const falaLimpa = (fala) => fala.replace(/\{\{\w+\}\}\s*/g, "").replace(/\s+/g, " ").trim();
