#!/usr/bin/env sh
# Compila e roda no Linux ou no macOS.
#   ./executar.sh                  demonstração do vídeo, cena por cena (de 1 a 4)
#   ./executar.sh demonstracao --cena 3
#   ./executar.sh testes           testes automáticos
set -e
raiz="$(cd "$(dirname "$0")" && pwd)"
programa="${1:-demonstracao}"
[ $# -gt 0 ] && shift
case "$programa" in
  demonstracao) classe=Demonstracao ;;
  testes) classe=Testes ;;
  *) echo "use: demonstracao ou testes" >&2; exit 2 ;;
esac
javac -encoding UTF-8 -d "$raiz/out" "$raiz"/src/*.java
java -cp "$raiz/out" "$classe" "$@"
