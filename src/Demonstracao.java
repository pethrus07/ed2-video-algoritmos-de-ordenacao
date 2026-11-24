import java.util.Arrays;
import java.util.Locale;
import java.util.Random;
import java.util.function.Consumer;

/**
 * Demonstração roteirizada, a mesma que aparece no vídeo.
 *
 *   java Demonstracao              roda as quatro cenas, com pausa entre elas
 *   java Demonstracao --sem-pausa  roda tudo de uma vez
 *   java Demonstracao --cena 3     roda só a cena 3
 *   java Demonstracao --dados      imprime os números usados na animação, um por linha
 */
public class Demonstracao {

    private static final Locale BRASIL = Locale.forLanguageTag("pt-BR");
    private static final int[] VETOR_PEQUENO = {5, 2, 8, 1, 9, 3, 7, 4};
    private static boolean comPausa = true;

    private record Algoritmo(String nome, Consumer<int[]> ordenar) {
    }

    private static final Algoritmo[] ALGORITMOS = {
        new Algoritmo("Bubble Sort", Ordenacao::bubbleSort),
        new Algoritmo("Insertion Sort", Ordenacao::insertionSort),
        new Algoritmo("Merge Sort", Ordenacao::mergeSort),
    };

    public static void main(String[] args) {
        int soACena = 0;
        for (int i = 0; i < args.length; i++) {
            if (args[i].equals("--sem-pausa")) {
                comPausa = false;
            } else if (args[i].equals("--cena") && i + 1 < args.length) {
                soACena = Integer.parseInt(args[++i]);
            } else if (args[i].equals("--dados")) {
                dadosParaAAnimacao();
                return;
            }
        }
        Runnable[] cenas = {
            Demonstracao::cenaPassoAPasso,
            Demonstracao::cenaCasosDeBorda,
            Demonstracao::cenaMelhorEPiorCaso,
            Demonstracao::cenaEmEscala,
        };
        for (int n = 1; n <= cenas.length; n++) {
            if (soACena == 0 || soACena == n) {
                cenas[n - 1].run();
                if (soACena == 0 && n < cenas.length) {
                    pausa();
                }
            }
        }
    }

    // ------------------------------------------------------------------ CENA 1

    private static void cenaPassoAPasso() {
        titulo(1, "O mesmo vetor de 8 valores, passo a passo nos três algoritmos");
        for (Algoritmo algoritmo : ALGORITMOS) {
            int[] v = VETOR_PEQUENO.clone();
            diga(algoritmo.nome());
            diga("  início             " + Arrays.toString(v));
            Ordenacao.zerarComparacoes();
            Ordenacao.observar((vetor, descricao) -> diga(String.format("  %-18s %s", descricao, Arrays.toString(vetor))));
            algoritmo.ordenar().accept(v);
            Ordenacao.observar(null);
            diga("  comparações: " + Ordenacao.comparacoes());
            diga("");
        }
    }

    // ------------------------------------------------------------------ CENA 2

    private static void cenaCasosDeBorda() {
        titulo(2, "Casos de borda: os três têm de devolver a mesma resposta");
        String[] nomes = {"vazio", "um elemento", "dois invertidos", "com repetidos", "com negativos", "já ordenado", "invertido"};
        int[][] casos = {{}, {7}, {2, 1}, {3, 1, 3, 2, 1, 3}, {0, -5, 4, -1, -5}, {1, 2, 3, 4, 5}, {5, 4, 3, 2, 1}};
        for (int c = 0; c < casos.length; c++) {
            String resultado = null;
            boolean iguais = true;
            for (Algoritmo algoritmo : ALGORITMOS) {
                int[] v = casos[c].clone();
                algoritmo.ordenar().accept(v);
                String texto = Arrays.toString(v);
                iguais &= resultado == null || resultado.equals(texto);
                resultado = texto;
            }
            diga(String.format("  %-16s %-22s -> %-22s %s", nomes[c], Arrays.toString(casos[c]), resultado,
                    iguais ? "os três concordam" : "DIVERGIRAM"));
        }
    }

    // ------------------------------------------------------------------ CENA 3

    private static void cenaMelhorEPiorCaso() {
        final int n = 1000;
        titulo(3, "Melhor e pior caso: comparações para ordenar " + n + " valores");
        int[] ordenado = new int[n];
        int[] invertido = new int[n];
        for (int i = 0; i < n; i++) {
            ordenado[i] = i + 1;
            invertido[i] = n - i;
        }
        int[] aleatorio = sortear(n, 42);

        diga(String.format("  %-16s %14s %14s %14s", "", "já ordenado", "aleatório", "invertido"));
        for (Algoritmo algoritmo : ALGORITMOS) {
            diga(String.format(BRASIL, "  %-16s %,14d %,14d %,14d", algoritmo.nome(),
                    contar(algoritmo, ordenado), contar(algoritmo, aleatorio), contar(algoritmo, invertido)));
        }
        diga("");
        diga("  n - 1 = " + (n - 1) + String.format(BRASIL, "      n(n - 1)/2 = %,d      n log2 n = %,d",
                n * (n - 1) / 2, Math.round(n * Math.log(n) / Math.log(2))));
    }

    // ------------------------------------------------------------------ CENA 4

    private static void cenaEmEscala() {
        titulo(4, "Em escala: os mesmos valores sorteados para os três");
        // Aquecimento: a JVM compila o código enquanto ele roda, e as primeiras execuções saem mais
        // lentas. Sem isto, o primeiro algoritmo medido pagaria esse custo no lugar dos outros.
        for (int rodada = 0; rodada < 30; rodada++) {
            for (Algoritmo algoritmo : ALGORITMOS) {
                algoritmo.ordenar().accept(sortear(2000, rodada));
            }
        }
        diga(String.format("  %-16s %10s %18s %14s", "", "n", "comparações", "tempo"));
        for (int n : new int[] {1000, 10000, 100000}) {
            int[] valores = sortear(n, 42);
            for (Algoritmo algoritmo : ALGORITMOS) {
                int[] v = valores.clone();
                Ordenacao.zerarComparacoes();
                long inicio = System.nanoTime();
                algoritmo.ordenar().accept(v);
                double ms = (System.nanoTime() - inicio) / 1e6;
                diga(String.format(BRASIL, "  %-16s %,10d %,18d %11.1f ms", algoritmo.nome(), n, Ordenacao.comparacoes(), ms));
            }
            diga("");
        }
        diga("  O tempo muda de máquina para máquina. O número de comparações não.");
    }

    // ------------------------------------------------------------------ DADOS DA ANIMAÇÃO

    /*
     * A animação do vídeo não tem número digitado à mão: saem daqui, em linhas "chave=valor", os
     * vetores e as contagens. O vetor de 64 valores da corrida é o mesmo que a animação usa.
     */
    private static void dadosParaAAnimacao() {
        Terminal.saida.println("vetor8=" + junta(VETOR_PEQUENO));
        for (Algoritmo algoritmo : ALGORITMOS) {
            Terminal.saida.println("comparacoes8." + chave(algoritmo) + "=" + contar(algoritmo, VETOR_PEQUENO));
        }
        int[] corrida = sortear(64, 7);
        Terminal.saida.println("vetor64=" + junta(corrida));
        for (Algoritmo algoritmo : ALGORITMOS) {
            Terminal.saida.println("comparacoes64." + chave(algoritmo) + "=" + contar(algoritmo, corrida));
        }
        final int mil = 1000;
        int[] ordenado = new int[mil];
        int[] invertido = new int[mil];
        for (int i = 0; i < mil; i++) {
            ordenado[i] = i + 1;
            invertido[i] = mil - i;
        }
        for (Algoritmo algoritmo : ALGORITMOS) {
            Terminal.saida.println("casos." + chave(algoritmo) + ".ordenado=" + contar(algoritmo, ordenado));
            Terminal.saida.println("casos." + chave(algoritmo) + ".invertido=" + contar(algoritmo, invertido));
        }
        // Os números da cena 4 (comparações e tempo em escala) não saem daqui: a animação lê a própria
        // saída da cena 4, para o gráfico e o terminal do vídeo mostrarem a mesma execução.
    }

    private static String chave(Algoritmo algoritmo) {
        return algoritmo.nome().split(" ")[0].toLowerCase(Locale.ROOT);
    }

    private static String junta(int[] v) {
        return Arrays.toString(v).replaceAll("[\\[\\] ]", "");
    }

    // ------------------------------------------------------------------ APOIO

    private static long contar(Algoritmo algoritmo, int[] valores) {
        int[] v = valores.clone();
        Ordenacao.zerarComparacoes();
        algoritmo.ordenar().accept(v);
        return Ordenacao.comparacoes();
    }

    /** n valores de 1 a n, sem repetição, embaralhados com semente fixa: o resultado se repete. */
    private static int[] sortear(int n, long semente) {
        int[] v = new int[n];
        for (int i = 0; i < n; i++) {
            v[i] = i + 1;
        }
        Random sorteio = new Random(semente);
        for (int i = n - 1; i > 0; i--) {
            int j = sorteio.nextInt(i + 1);
            int aux = v[i];
            v[i] = v[j];
            v[j] = aux;
        }
        return v;
    }

    private static void titulo(int numero, String texto) {
        diga("");
        diga("=".repeat(78));
        diga("CENA " + numero + " | " + texto);
        diga("=".repeat(78));
        diga("");
    }

    private static void pausa() {
        if (!comPausa) {
            return;
        }
        diga("");
        Terminal.saida.print("[Enter para a próxima cena] ");
        if (Terminal.entrada.hasNextLine()) {
            Terminal.entrada.nextLine();
        }
    }

    private static void diga(String frase) {
        Terminal.saida.println(frase);
    }
}
