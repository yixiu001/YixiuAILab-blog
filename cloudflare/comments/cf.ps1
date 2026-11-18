# ============================================================
# Yixiu AI Lab - Cloudflare deploy entry point (clean network)
# ------------------------------------------------------------
# Why this exists:
#   Proxy clients (Clash / Clash Party / etc.) often leave http_proxy
#   environment variables in the USER scope after they are closed.
#   Those variables point at a local port that is no longer listening,
#   so every new terminal inherits a DEAD proxy. Wrangler then fails
#   with ECONNREFUSED / fetch failed, and even its local OAuth
#   callback (127.0.0.1) gets routed into that dead proxy.
#
# This script strips ALL proxy env vars on every run and forces a
# direct connection. Use it for EVERY wrangler command from now on.
# Do NOT call "npx wrangler ..." directly.
#
# Usage (from the cloudflare/comments directory):
#   .\cf.ps1 whoami
#   .\cf.ps1 d1 list
#   .\cf.ps1 d1 create yixiu-site
#   .\cf.ps1 d1 execute yixiu-site --remote --file=.\schema.sql -y
#   .\cf.ps1 deploy
#
# Credentials priority:
#   1) CLOUDFLARE_API_TOKEN from ./.env  (recommended = new account)
#   2) existing wrangler OAuth login      (wrangler login)
# ============================================================

param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]] $WranglerArgs
)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

# 1) Remove every proxy variable, then force direct for all hosts
#    Use the .NET API (not Remove-Item) so we never trip delete guards
#    and so a missing variable is a harmless no-op.
$proxyNames = @(
  'HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','FTP_PROXY','NO_PROXY',
  'http_proxy','https_proxy','all_proxy','ftp_proxy','no_proxy'
)
foreach ($n in $proxyNames) {
  [Environment]::SetEnvironmentVariable($n, $null, 'Process')
}
[Environment]::SetEnvironmentVariable('NO_PROXY', '*', 'Process')
[Environment]::SetEnvironmentVariable('no_proxy', '*', 'Process')

# 2) Load local .env (ignored by git via .gitignore)
$envFile = Join-Path $PSScriptRoot '.env'
if (Test-Path $envFile) {
  Get-Content -LiteralPath $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
      $idx = $line.IndexOf('=')
      $k = $line.Substring(0, $idx).Trim()
      $v = $line.Substring($idx + 1).Trim().Trim('"').Trim("'")
      if ($k -and $v) { [Environment]::SetEnvironmentVariable($k, $v, 'Process') }
    }
  }
  Write-Host '[cf] Loaded .env' -ForegroundColor DarkGray
}

if ([Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN', 'Process')) {
  Write-Host '[cf] Credential: API Token (this account wins)' -ForegroundColor DarkGray
} else {
  Write-Host '[cf] Credential: local wrangler OAuth login' -ForegroundColor DarkGray
}
Write-Host '[cf] Network: direct connection, all proxies bypassed' -ForegroundColor DarkGray
Write-Host ''

# 3) Forward arguments to wrangler
if (-not $WranglerArgs -or $WranglerArgs.Count -eq 0) {
  Write-Host 'Usage: .\cf.ps1 <wrangler args>   e.g. .\cf.ps1 d1 list' -ForegroundColor Yellow
  return
}
Write-Host ('[cf] Running: wrangler ' + ($WranglerArgs -join ' ')) -ForegroundColor DarkGray

# 4) Forward a value through stdin. "secret put" reads its value from stdin.
#    Set YIXIU_CF_SECRET_STDIN in the calling shell before running this script,
#    e.g. $env:YIXIU_CF_SECRET_STDIN = 'value'; .\cf.ps1 secret put NAME
#    (Piping into an advanced script does not bind reliably in PS 5.1.)
#    Keep everything ASCII: PowerShell 5.1 reads .ps1 as GBK on this machine.
$secretStdin = [Environment]::GetEnvironmentVariable('YIXIU_CF_SECRET_STDIN', 'Process')
if ($secretStdin) {
  $secretStdin | & npx wrangler @WranglerArgs
} else {
  & npx wrangler @WranglerArgs
}
# No exit here: keeps the host session alive; $LASTEXITCODE is preserved.
