import java.util.Arrays;
import java.util.Random;
import java.util.function.Consumer;

/**
 * Testes dos três algoritmos, sem biblioteca externa.
 *
 *   java Testes
 *
 * Sai com código 1 se algum falhar. A parte principal sorteia milhares de vetores e compara o
 * resultado de cada algoritmo com o do Arrays.sort do Java.
 */
public class Testes {

    private static int feitos;
    private static int falhas;

    private record Algoritmo(String nome, Consumer<int[]> ordenar) {
    }

    private static final Algoritmo[] ALGORITMOS = {
        new Algoritmo("bubble", Ordenacao::bubbleSort),
        new Algoritmo("insertion", Ordenacao::insertionSort),
        new Algoritmo("merge", Ordenacao::mergeSort),
    };

    public static void main(String[] args) {
        for (Algoritmo a : ALGORITMOS) {
            casosDeBorda(a);
            contraOJava(a);
        }
        contagemNosCasosConhecidos();
        mergeNaoPassaDoLimite();
        observadorRecebeAsEtapas();

        Terminal.saida.println(feitos + " verificações, " + falhas + " falhas");
        if (falhas > 0) {
            System.exit(1);
        }
    }

    private static void casosDeBorda(Algoritmo a) {
        confere(a, "vazio", new int[] {});
        confere(a, "um elemento", new int[] {7});
        confere(a, "dois em ordem", new int[] {1, 2});
        confere(a, "dois invertidos", new int[] {2, 1});
        confere(a, "todos iguais", new int[] {4, 4, 4, 4});
        confere(a, "com repetidos", new int[] {3, 1, 3, 2, 1, 3});
        confere(a, "com negativos", new int[] {0, -5, 4, -1, -5});
        confere(a, "já ordenado", new int[] {1, 2, 3, 4, 5, 6});
        confere(a, "invertido", new int[] {6, 5, 4, 3, 2, 1});
        confere(a, "tamanho ímpar", new int[] {9, 1, 8, 2, 7});
        confere(a, "extremos do int", new int[] {Integer.MAX_VALUE, 0, Integer.MIN_VALUE, -1, 1});
    }

    /** 2.000 vetores sorteados, de tamanho 0 a 200 e com muitos repetidos. */
    private static void contraOJava(Algoritmo a) {
        Random sorteio = new Random(2026);
        boolean igual = true;
        for (int rodada = 0; rodada < 2000 && igual; rodada++) {
            int[] v = new int[sorteio.nextInt(201)];
            for (int i = 0; i < v.length; i++) {
                v[i] = sorteio.nextInt(101) - 50;
            }
            int[] esperado = v.clone();
            Arrays.sort(esperado);
            a.ordenar().accept(v);
            igual = Arrays.equals(v, esperado);
        }
        registra(a.nome() + ": 2.000 vetores sorteados iguais ao Arrays.sort", igual);
    }

    /** Para n = 1000 os números de comparações do melhor e do pior caso são conhecidos de antemão. */
    private static void contagemNosCasosConhecidos() {
        final int n = 1000;
        int[] ordenado = new int[n];
        int[] invertido = new int[n];
        for (int i = 0; i < n; i++) {
            ordenado[i] = i;
            invertido[i] = n - i;
        }
        registra("bubble, já ordenado: n - 1 comparações", conta(ALGORITMOS[0], ordenado) == n - 1);
        registra("bubble, invertido: n(n - 1)/2 comparações", conta(ALGORITMOS[0], invertido) == (long) n * (n - 1) / 2);
        registra("insertion, já ordenado: n - 1 comparações", conta(ALGORITMOS[1], ordenado) == n - 1);
        registra("insertion, invertido: n(n - 1)/2 comparações", conta(ALGORITMOS[1], invertido) == (long) n * (n - 1) / 2);
    }

    /** O merge sort nunca faz mais que n * teto(log2 n) comparações, seja qual for a entrada. */
    private static void mergeNaoPassaDoLimite() {
        Random sorteio = new Random(7);
        boolean dentro = true;
        for (int n : new int[] {2, 3, 16, 100, 1000, 4096}) {
            int[] v = new int[n];
            for (int i = 0; i < n; i++) {
                v[i] = sorteio.nextInt();
            }
            long limite = (long) n * (long) Math.ceil(Math.log(n) / Math.log(2));
            dentro &= conta(ALGORITMOS[2], v) <= limite;
        }
        registra("merge: comparações dentro de n * teto(log2 n)", dentro);
    }

    private static void observadorRecebeAsEtapas() {
        int[] etapas = {0};
        Ordenacao.observar((v, descricao) -> etapas[0]++);
        Ordenacao.insertionSort(new int[] {3, 1, 2});
        Ordenacao.observar(null);
        registra("observador: uma etapa por elemento encaixado", etapas[0] == 2);
    }

    // ------------------------------------------------------------------ APOIO

    private static long conta(Algoritmo a, int[] valores) {
        int[] v = valores.clone();
        Ordenacao.zerarComparacoes();
        a.ordenar().accept(v);
        return Ordenacao.comparacoes();
    }

    private static void confere(Algoritmo a, String caso, int[] entrada) {
        int[] esperado = entrada.clone();
        Arrays.sort(esperado);
        int[] v = entrada.clone();
        a.ordenar().accept(v);
        registra(a.nome() + ": " + caso, Arrays.equals(v, esperado));
    }

    private static void registra(String nome, boolean passou) {
        feitos++;
        if (!passou) {
            falhas++;
            Terminal.saida.println("FALHOU: " + nome);
        }
    }
}
