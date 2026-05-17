$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$ExtensionDist = Join-Path $RepoRoot "apps\extension\dist"
$ManifestPath = Join-Path $ExtensionDist "manifest.json"
$ProfileDir = Join-Path $RepoRoot ".chrome-extension-profile"

if (-not (Test-Path -LiteralPath $ManifestPath)) {
  Push-Location $RepoRoot
  try {
    pnpm --filter "@acorus/extension" build
  } finally {
    Pop-Location
  }
}

$ChromeCandidates = @(@(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
) | Where-Object { $_ -and (Test-Path -LiteralPath $_) })

$PathChrome = Get-Command chrome.exe -ErrorAction SilentlyContinue
if ($PathChrome?.Source -and (Test-Path -LiteralPath $PathChrome.Source)) {
  $ChromeCandidates = @($PathChrome.Source) + $ChromeCandidates
}

$PathEdge = Get-Command msedge.exe -ErrorAction SilentlyContinue
if ($PathEdge?.Source -and (Test-Path -LiteralPath $PathEdge.Source)) {
  $ChromeCandidates += $PathEdge.Source
}

if ($ChromeCandidates.Count -eq 0) {
  throw "Google Chrome was not found. Install Chrome or load apps\extension\dist manually from chrome://extensions."
}

New-Item -ItemType Directory -Force -Path $ProfileDir | Out-Null

$Chrome = (Resolve-Path -LiteralPath $ChromeCandidates[0]).Path
$Args = @(
  "--user-data-dir=$ProfileDir",
  "--disable-extensions-except=$ExtensionDist",
  "--load-extension=$ExtensionDist",
  "--no-first-run",
  "--new-window",
  "chrome://extensions/"
)

Start-Process -FilePath $Chrome -ArgumentList $Args
Write-Host "Acorus extension loaded from $ExtensionDist"
