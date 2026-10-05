# Always build release App Bundle with Clerk / API dart-defines.
# Usage:  powershell -File takka_mobile/scripts/build_release_aab.ps1
$ErrorActionPreference = "Stop"

$mobileRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $mobileRoot

$defines = Join-Path $mobileRoot "dart_defines.json"
if (-not (Test-Path $defines)) {
  Write-Host "dart_defines.json missing - syncing from admin/.env ..."
  & (Join-Path $PSScriptRoot "sync_dart_defines.ps1")
}

$raw = Get-Content $defines -Raw | ConvertFrom-Json
if (-not $raw.CLERK_PUBLISHABLE_KEY -or $raw.CLERK_PUBLISHABLE_KEY -match "replace_me") {
  throw "CLERK_PUBLISHABLE_KEY is empty/placeholder in dart_defines.json"
}

Write-Host "Building release AAB with dart_defines.json ..."
flutter build appbundle --release --dart-define-from-file=dart_defines.json
if ($LASTEXITCODE -ne 0) { throw "flutter build appbundle failed" }

$src = Join-Path $mobileRoot "build\app\outputs\bundle\release\app-release.aab"
$stamp = Get-Date -Format "d-M-yyyy"
$destName = "$stamp-release.aab"
$destDir = Join-Path $mobileRoot "build\app\outputs\bundle\release"
$dest = Join-Path $destDir $destName
Copy-Item -Force $src $dest

$pathFile = Join-Path $mobileRoot "LATEST_AAB_PATH.txt"
Set-Content -Path $pathFile -Value $dest -NoNewline

Write-Host ""
Write-Host "AAB ready:"
Write-Host $dest
Write-Host "Path written to LATEST_AAB_PATH.txt"
