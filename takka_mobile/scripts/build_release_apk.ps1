# Always build release APK with Clerk / API dart-defines.
# Usage (from repo):  powershell -File takka_mobile/scripts/build_release_apk.ps1
$ErrorActionPreference = "Stop"

$mobileRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $mobileRoot

$defines = Join-Path $mobileRoot "dart_defines.json"
if (-not (Test-Path $defines)) {
  Write-Host "dart_defines.json missing — syncing from admin/.env ..."
  & (Join-Path $PSScriptRoot "sync_dart_defines.ps1")
}

if (-not (Test-Path $defines)) {
  throw "dart_defines.json still missing. Copy dart_defines.example.json and fill secrets."
}

$raw = Get-Content $defines -Raw | ConvertFrom-Json
if (-not $raw.CLERK_PUBLISHABLE_KEY -or $raw.CLERK_PUBLISHABLE_KEY -match "replace_me") {
  throw "CLERK_PUBLISHABLE_KEY is empty/placeholder in dart_defines.json"
}

Write-Host "Building release APK with dart_defines.json ..."
flutter build apk --release --dart-define-from-file=dart_defines.json
if ($LASTEXITCODE -ne 0) { throw "flutter build apk failed" }

$src = Join-Path $mobileRoot "build\app\outputs\flutter-apk\app-release.apk"
$stamp = Get-Date -Format "d-M-yyyy"
$destName = "$stamp-release.apk"
$dest = Join-Path $mobileRoot "build\app\outputs\flutter-apk\$destName"
Copy-Item -Force $src $dest

$pathFile = Join-Path $mobileRoot "LATEST_APK_PATH.txt"
Set-Content -Path $pathFile -Value $dest -NoNewline

Write-Host ""
Write-Host "APK ready:"
Write-Host $dest
Write-Host "Path written to LATEST_APK_PATH.txt"
