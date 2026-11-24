/**
 * Três algoritmos de ordenação para vetores de inteiros, em ordem crescente.
 *
 *   Bubble Sort     compara vizinhos e troca os que estão fora de ordem
 *   Insertion Sort  encaixa cada elemento na parte já ordenada
 *   Merge Sort      divide ao meio, ordena cada metade e intercala (recursivo)
 *
 * Toda comparação entre elementos passa por maior(a, b), que também conta quantas foram feitas.
 * É esse número que usamos para comparar os algoritmos, porque ele não depende da máquina.
 *
 * Os três são estáveis: a comparação é estritamente "maior", então dois valores iguais nunca
 * trocam de ordem entre si.
 */
public class Ordenacao {

    private static long comparacoes;
    private static Observador observador;

    /** Recebe o vetor ao fim de cada etapa de um algoritmo. Serve só para a demonstração. */
    public interface Observador {
        void etapa(int[] v, String descricao);
    }

    public static void observar(Observador novo) {
        observador = novo;
    }

    public static void zerarComparacoes() {
        comparacoes = 0;
    }

    public static long comparacoes() {
        return comparacoes;
    }

    /** Compara dois elementos e conta a comparação. */
    private static boolean maior(int a, int b) {
        comparacoes++;
        return a > b;
    }

    // ------------------------------------------------------------------ BUBBLE SORT

    /*
     * A cada passada, o maior valor da parte não ordenada é empurrado até o fim dela.
     * Por isso o laço de dentro encolhe: depois de p passadas, os p últimos já estão no lugar.
     * Se uma passada termina sem troca, o vetor está ordenado e o algoritmo para.
     */
    public static void bubbleSort(int[] v) {
        for (int passada = 0; passada < v.length - 1; passada++) {
            boolean trocou = false;
            for (int j = 0; j < v.length - 1 - passada; j++) {
                if (maior(v[j], v[j + 1])) {
                    int aux = v[j];
                    v[j] = v[j + 1];
                    v[j + 1] = aux;
                    trocou = true;
                }
            }
            mostrar(v, "passada " + (passada + 1));
            if (!trocou) {
                break;
            }
        }
    }

    // ------------------------------------------------------------------ INSERTION SORT

    /*
     * A parte à esquerda de i está sempre ordenada. O elemento da vez (a chave) é guardado,
     * os maiores que ele andam uma casa para a direita e a chave entra na vaga que sobrou.
     */
    public static void insertionSort(int[] v) {
        for (int i = 1; i < v.length; i++) {
            int chave = v[i];
            int j = i - 1;
            while (j >= 0 && maior(v[j], chave)) {
                v[j + 1] = v[j];
                j--;
            }
            v[j + 1] = chave;
            mostrar(v, "encaixou o " + chave);
        }
    }

    // ------------------------------------------------------------------ MERGE SORT

    /** O vetor auxiliar é criado uma vez só e reaproveitado por todas as chamadas. */
    public static void mergeSort(int[] v) {
        int[] aux = new int[v.length];
        mergeSort(v, aux, 0, v.length - 1);
    }

    /*
     * Dividir para conquistar: ordena cada metade com o próprio mergeSort e depois intercala.
     * O caso base é o trecho de um elemento (ou vazio), que já está ordenado.
     */
    private static void mergeSort(int[] v, int[] aux, int inicio, int fim) {
        if (inicio >= fim) {
            return;
        }
        int meio = inicio + (fim - inicio) / 2;
        mergeSort(v, aux, inicio, meio);
        mergeSort(v, aux, meio + 1, fim);
        intercalar(v, aux, inicio, meio, fim);
    }

    /*
     * Junta v[inicio..meio] e v[meio+1..fim], que já estão ordenados, em um trecho só.
     * Em caso de empate leva o da esquerda: é isso que mantém a ordenação estável.
     */
    private static void intercalar(int[] v, int[] aux,
                                   int inicio, int meio, int fim) {
        int i = inicio;
        int j = meio + 1;
        int k = inicio;
        while (i <= meio && j <= fim) {
            if (maior(v[i], v[j])) {
                aux[k++] = v[j++];
            } else {
                aux[k++] = v[i++];
            }
        }
        while (i <= meio) {
            aux[k++] = v[i++];
        }
        while (j <= fim) {
            aux[k++] = v[j++];
        }
        for (k = inicio; k <= fim; k++) {
            v[k] = aux[k];
        }
        mostrar(v, "intercalou " + inicio + " a " + fim);
    }

    private static void mostrar(int[] v, String descricao) {
        if (observador != null) {
            observador.etapa(v, descricao);
        }
    }
}
