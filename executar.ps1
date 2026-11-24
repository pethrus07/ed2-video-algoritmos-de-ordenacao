# Compila e roda no Windows (PowerShell).
#   .\executar.ps1                  demonstração do vídeo, cena por cena (de 1 a 4)
#   .\executar.ps1 demonstracao --cena 3
#   .\executar.ps1 testes           testes automáticos
param([string]$Programa = "demonstracao", [Parameter(ValueFromRemainingArguments)][string[]]$Resto)
$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $MyInvocation.MyCommand.Path
$classes = @{ demonstracao = "Demonstracao"; testes = "Testes" }
if (-not $classes.ContainsKey($Programa.ToLower())) { throw "use: demonstracao ou testes" }

# o programa escreve em UTF-8; sem isto os acentos saem trocados no terminal do Windows
[Console]::OutputEncoding = [Text.Encoding]::UTF8
[Console]::InputEncoding = [Text.Encoding]::UTF8

javac -encoding UTF-8 -d "$raiz\out" (Get-ChildItem "$raiz\src\*.java").FullName
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
java -cp "$raiz\out" $classes[$Programa.ToLower()] @Resto
exit $LASTEXITCODE
