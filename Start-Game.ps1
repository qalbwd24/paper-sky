param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new()
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) { throw '未找到 Node.js。也可以直接用 Edge 打开此文件夹的 index.html。' }
$gamePort = $null
foreach ($candidate in 8768..8778) {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:$candidate/index.html" -TimeoutSec 1 -UseBasicParsing
        if ($response.Content.Contains('风过纸翼')) { $gamePort = $candidate; break }
    } catch {
        $listener = Get-NetTCPConnection -LocalPort $candidate -State Listen -ErrorAction SilentlyContinue
        if (-not $listener) {
            $previewPath = Join-Path $PSScriptRoot 'preview.cjs'
            Start-Process -FilePath $nodeCommand.Source -ArgumentList @(('"' + $previewPath + '"'), [string]$candidate) -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
            for ($attempt = 0; $attempt -lt 30; $attempt++) {
                Start-Sleep -Milliseconds 100
                try {
                    $ready = Invoke-WebRequest -Uri "http://127.0.0.1:$candidate/index.html" -TimeoutSec 1 -UseBasicParsing
                    if ($ready.Content.Contains('风过纸翼')) { $gamePort = $candidate; break }
                } catch { }
            }
            if ($gamePort) { break }
        }
    }
}
if (-not $gamePort) { throw '本地预览未能启动。可以直接用 Edge 打开 index.html，或检查 8768–8778 端口是否被占用。' }
$gameUrl = "http://127.0.0.1:$gamePort/"
Write-Output $gameUrl
if (-not $NoBrowser) { Start-Process $gameUrl }
