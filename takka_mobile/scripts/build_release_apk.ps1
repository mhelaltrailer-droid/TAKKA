# Release APKs with Clerk / API dart-defines.
# Split-per-ABI (arm64-v8a, armeabi-v7a), optional x86_64, and a universal APK
# unless -NoUniversal is passed.
#
# Usage:
#   powershell -File takka_mobile/scripts/build_release_apk.ps1
#   powershell -File takka_mobile/scripts/build_release_apk.ps1 -NoUniversal
#   powershell -File takka_mobile/scripts/build_release_apk.ps1 -IncludeX86_64
param(
  [switch]$NoUniversal,
  [switch]$IncludeX86_64
)

$ErrorActionPreference = "Stop"

$mobileRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $mobileRoot

$defines = Join-Path $mobileRoot "dart_defines.json"
if (-not (Test-Path $defines)) {
  Write-Host "dart_defines.json missing - syncing from admin/.env ..."
  & (Join-Path $PSScriptRoot "sync_dart_defines.ps1")
}

if (-not (Test-Path $defines)) {
  throw "dart_defines.json still missing. Copy dart_defines.example.json and fill secrets."
}

function Test-PlaceholderValue([string]$Value) {
  if (-not $Value) { return $true }
  $lower = $Value.ToLowerInvariant()
  foreach ($snippet in @(
      "replace_me", "changeme", "placeholder", "your_clerk", "your_key", "pk_test_replace"
    )) {
    if ($lower.Contains($snippet)) { return $true }
  }
  if ($lower -in @("todo", "xxx", "none", "null")) { return $true }
  return $false
}

$raw = Get-Content $defines -Raw | ConvertFrom-Json
$clerk = [string]$raw.CLERK_PUBLISHABLE_KEY
if ((Test-PlaceholderValue $clerk) -or (
    -not $clerk.StartsWith("pk_test_") -and -not $clerk.StartsWith("pk_live_")
  )) {
  throw "CLERK_PUBLISHABLE_KEY is missing, a placeholder, or not a Clerk publishable key (pk_test_ / pk_live_)."
}
$pusher = [string]$raw.PUSHER_KEY
if (Test-PlaceholderValue $pusher) {
  throw "PUSHER_KEY is missing or a placeholder in dart_defines.json"
}
$api = [string]$raw.TAKKA_API_BASE_URL
if ((Test-PlaceholderValue $api) -or (
    -not $api.StartsWith("https://") -and -not $api.StartsWith("http://")
  )) {
  throw "TAKKA_API_BASE_URL must be an http(s) URL and not a placeholder."
}

$versionLine = (Select-String -Path (Join-Path $mobileRoot "pubspec.yaml") -Pattern '^version:\s*(\S+)' | Select-Object -First 1).Matches.Groups[1].Value
if ($versionLine -notmatch '^(\d+\.\d+\.\d+)\+(\d+)$') {
  throw "pubspec.yaml version must look like 1.2.3+4 (found: $versionLine)."
}
$versionName = $Matches[1]
$versionCode = $Matches[2]
$fileVersion = "$versionName-$versionCode"

$platforms = "android-arm,android-arm64"
if ($IncludeX86_64) {
  $platforms = "$platforms,android-x64"
}

$outDir = Join-Path $mobileRoot "build\app\outputs\flutter-apk"
$distDir = Join-Path $outDir "dist"
New-Item -ItemType Directory -Force -Path $distDir | Out-Null

function Copy-ReleaseApk([string]$SourceName, [string]$DestName) {
  $src = Join-Path $outDir $SourceName
  if (-not (Test-Path $src)) {
    throw "Expected APK was not produced: $src"
  }
  $dest = Join-Path $distDir $DestName
  Copy-Item -Force $src $dest
  return $dest
}

Write-Host "Building split release APKs ($platforms) for $versionName+$versionCode ..."
flutter build apk --release `
  --build-name $versionName `
  --build-number $versionCode `
  --split-per-abi `
  --target-platform $platforms `
  --dart-define-from-file=dart_defines.json
if ($LASTEXITCODE -ne 0) { throw "flutter build apk --split-per-abi failed" }

$arm64 = Copy-ReleaseApk "app-arm64-v8a-release.apk" "takka-$fileVersion-arm64-v8a.apk"
$v7a = Copy-ReleaseApk "app-armeabi-v7a-release.apk" "takka-$fileVersion-armeabi-v7a.apk"
$recommended = $arm64
Write-Host $arm64
Write-Host $v7a

if ($IncludeX86_64) {
  $x64 = Copy-ReleaseApk "app-x86_64-release.apk" "takka-$fileVersion-x86_64.apk"
  Write-Host $x64
}

if (-not $NoUniversal) {
  Write-Host "Building universal release APK ..."
  flutter build apk --release `
    --build-name $versionName `
    --build-number $versionCode `
    --target-platform $platforms `
    --dart-define-from-file=dart_defines.json
  if ($LASTEXITCODE -ne 0) { throw "flutter build apk (universal) failed" }
  $universal = Copy-ReleaseApk "app-release.apk" "takka-$fileVersion-universal.apk"
  $recommended = $universal
  Write-Host $universal
}

$pathFile = Join-Path $mobileRoot "LATEST_APK_PATH.txt"
Set-Content -Path $pathFile -Value $recommended -NoNewline

Write-Host ""
Write-Host "APKs ready in:"
Write-Host $distDir
Write-Host "Recommended path written to LATEST_APK_PATH.txt:"
Write-Host $recommended
