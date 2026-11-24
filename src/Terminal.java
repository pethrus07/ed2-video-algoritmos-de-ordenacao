import java.io.FileDescriptor;
import java.io.FileOutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.util.Scanner;

/**
 * Entrada e saída do terminal em UTF-8.
 *
 * No Windows o Java 17 escreve no terminal com a codificação antiga do sistema e os acentos
 * saem trocados. Aqui a saída é sempre UTF-8; os scripts de execução ajustam o terminal.
 */
public final class Terminal {

    public static final PrintStream saida =
            new PrintStream(new FileOutputStream(FileDescriptor.out), true, StandardCharsets.UTF_8);

    public static final Scanner entrada = new Scanner(System.in, StandardCharsets.UTF_8);

    private Terminal() {
    }
}
