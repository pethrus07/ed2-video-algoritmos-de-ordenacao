# Tira de um processo o "freio de energia" do Windows 11.
#
# O Windows reduz a velocidade de programas cuja janela não está em foco. Na gravação do terminal a janela
# fica sem foco de propósito (para não roubar o teclado de quem está usando a máquina), e com isso o programa
# medido rodava a quase metade da velocidade. Este script avisa o Windows para não frear aquele processo.
#
#   pwsh -File sem-freio.ps1 <id do processo>
param([Parameter(Mandatory)][int]$Id)
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Freio {
    [StructLayout(LayoutKind.Sequential)] public struct Estado { public uint Versao, Controle, Valor; }
    [DllImport("kernel32.dll", SetLastError = true)] public static extern IntPtr OpenProcess(uint acesso, bool herda, int id);
    [DllImport("kernel32.dll", SetLastError = true)] public static extern bool SetProcessInformation(IntPtr processo, int classe, ref Estado estado, int tamanho);
    [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);
}
"@
$processo = [Freio]::OpenProcess(0x0200, $false, $Id)   # PROCESS_SET_INFORMATION
if ($processo -eq [IntPtr]::Zero) { exit 1 }
# ProcessPowerThrottling = 4; controle = velocidade de execução (1), valor = 0 (sem freio)
$estado = New-Object Freio+Estado; $estado.Versao = 1; $estado.Controle = 1; $estado.Valor = 0
$ok = [Freio]::SetProcessInformation($processo, 4, [ref]$estado, 12)
[void][Freio]::CloseHandle($processo)
if (-not $ok) { exit 2 }
