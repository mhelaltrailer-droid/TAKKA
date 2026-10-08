# Sync local dart_defines.json from admin/.env (never commit the output file).
$ErrorActionPreference = "Stop"

$mobileRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$adminEnv = Join-Path $mobileRoot "..\admin\.env"
$outFile = Join-Path $mobileRoot "dart_defines.json"

if (-not (Test-Path $adminEnv)) {
  throw "Missing admin/.env at $adminEnv"
}

$envMap = @{}
Get-Content $adminEnv | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { return }
  $i = $line.IndexOf("=")
  $k = $line.Substring(0, $i).Trim()
  $v = $line.Substring($i + 1).Trim().Trim('"').Trim("'")
  $envMap[$k] = $v
}

$pk = $envMap["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"]
if (-not $pk) { throw "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY missing in admin/.env" }

$defines = [ordered]@{
  CLERK_PUBLISHABLE_KEY = $pk
  TAKKA_API_BASE_URL    = "https://takka-app.onrender.com"
  PUSHER_KEY            = $envMap["NEXT_PUBLIC_PUSHER_KEY"]
  PUSHER_CLUSTER        = $(if ($envMap["NEXT_PUBLIC_PUSHER_CLUSTER"]) { $envMap["NEXT_PUBLIC_PUSHER_CLUSTER"] } else { "eu" })
}

$defines | ConvertTo-Json | Set-Content -Encoding utf8 $outFile
Write-Host "Wrote $outFile"
Write-Host ("CLERK key length: " + $pk.Length)
Write-Host ("API: " + $defines.TAKKA_API_BASE_URL)
