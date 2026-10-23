param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new()
$gameUrl = 'http://127.0.0.1:8770/chase/'
$healthUrl = $gameUrl + 'api/health'
$healthy = $false
try { $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2; $healthy = $health.ok -and $health.version -eq 'paper-chase-online-7' } catch { }
if (-not $healthy) {
    if (Get-NetTCPConnection -LocalPort 8770 -State Listen -ErrorAction SilentlyContinue) { throw '8770 端口已被占用或游戏仍为旧版本，请关闭旧的本地联机服务后重试。' }
    $nodeCommand = Get-Command node -ErrorAction Stop
    $serverDirectory = Join-Path $PSScriptRoot 'online'
    $serverPath = Join-Path $serverDirectory 'server.cjs'
    Start-Process -FilePath $nodeCommand.Source -ArgumentList ('"' + $serverPath + '"') -WorkingDirectory $serverDirectory -WindowStyle Hidden
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Milliseconds 200
        try { $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 1; if ($health.ok -and $health.version -eq 'paper-chase-online-7') { $healthy = $true; break } } catch { }
    }
}
if (-not $healthy) { throw '本地联机服务未能启动，请检查 online/server.cjs。' }
Write-Output $gameUrl
if (-not $NoBrowser) { Start-Process $gameUrl }
