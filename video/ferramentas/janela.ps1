# Apoio da gravação do terminal. O Windows Terminal só desenha a janela enquanto ela está visível, então:
#
#   1. guarda qual janela estava em uso e escreve "pronto";
#   2. espera a janela com o título pedido aparecer;
#   3. deixa essa janela sempre por cima, sem ativá-la, e devolve o teclado à janela anterior;
#   4. escreve onde a janela ficou (em pontos físicos) e em qual monitor, para o ffmpeg gravar só aquele retângulo.
param([Parameter(Mandatory)][string]$Titulo, [int]$EsperaSegundos = 15)
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Janela {
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
    [StructLayout(LayoutKind.Sequential)] public struct MONITORINFO { public int cb; public RECT monitor; public RECT trabalho; public int flags; }
    [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr contexto);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr FindWindow(string classe, string titulo);
    [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr depois, int x, int y, int cx, int cy, uint flags);
    [DllImport("user32.dll")] public static extern IntPtr MonitorFromWindow(IntPtr h, uint flags);
    [DllImport("user32.dll")] public static extern bool GetMonitorInfo(IntPtr monitor, ref MONITORINFO info);
    [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h, int atributo, out RECT r, int tamanho);
}
"@
# por monitor (v2): as medidas saem em pontos físicos, que é como o ffmpeg enxerga a tela
[void][Janela]::SetProcessDpiAwarenessContext([IntPtr](-4))
$anterior = [Janela]::GetForegroundWindow()
"pronto"
[Console]::Out.Flush()
$limite = (Get-Date).AddSeconds($EsperaSegundos)
$janela = [IntPtr]::Zero
while ((Get-Date) -lt $limite -and $janela -eq [IntPtr]::Zero) { $janela = [Janela]::FindWindow([NullString]::Value, $Titulo); if ($janela -eq [IntPtr]::Zero) { Start-Sleep -Milliseconds 40 } }
if ($janela -eq [IntPtr]::Zero) { "janela não apareceu"; exit 1 }
# HWND_TOPMOST = -1; SWP_NOSIZE (1) | SWP_NOMOVE (2) | SWP_NOACTIVATE (0x10)
[void][Janela]::SetWindowPos($janela, [IntPtr](-1), 0, 0, 0, 0, 0x13)
if ($anterior -ne [IntPtr]::Zero) { [void][Janela]::SetForegroundWindow($anterior) }
Start-Sleep -Milliseconds 700   # a janela termina de assentar no tamanho final
$r = New-Object Janela+RECT
[void][Janela]::DwmGetWindowAttribute($janela, 9, [ref]$r, 16)   # 9 = borda visível da janela
$info = New-Object Janela+MONITORINFO
$info.cb = [System.Runtime.InteropServices.Marshal]::SizeOf($info)
[void][Janela]::GetMonitorInfo([Janela]::MonitorFromWindow($janela, 2), [ref]$info)
"monitor=$($info.monitor.L),$($info.monitor.T),$($info.monitor.R - $info.monitor.L),$($info.monitor.B - $info.monitor.T)"
"retangulo=$($r.L),$($r.T),$($r.R - $r.L),$($r.B - $r.T)"
[Console]::Out.Flush()
