# Omega Document Creator — one-command local validation
# Runs: DB migrations → backend pytest → frontend tsc → frontend vitest
# Requires: PowerShell, Python venv at apps/api/.venv, Node modules at apps/frontend/node_modules

param(
    [switch]$SkipFrontend,
    [switch]$SkipBackend
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot

Write-Host "=== Omega Validation ===" -ForegroundColor Cyan

# ── Backend ────────────────────────────────────────────
if (-not $SkipBackend) {
    Write-Host "`n[1/4] Running DB migrations..." -ForegroundColor Yellow
    $env:PYTHONPATH = Join-Path $RepoRoot "apps\api"
    & "$RepoRoot\apps\api\.venv\Scripts\python.exe" -m app.migrate --force
    if ($LASTEXITCODE -ne 0) { throw "Migrations failed" }
    Write-Host "  Migrations OK" -ForegroundColor Green

    Write-Host "`n[2/4] Running backend tests (pytest)..." -ForegroundColor Yellow
    $env:DATABASE_URL = $env:DATABASE_URL ?? "postgresql://omega:omega@localhost:5432/omega"
    & "$RepoRoot\apps\api\.venv\Scripts\python.exe" -m pytest "$RepoRoot\apps\api\tests" -v
    if ($LASTEXITCODE -ne 0) { throw "Backend tests failed" }
    Write-Host "  Backend tests OK" -ForegroundColor Green
}

# ── Frontend ───────────────────────────────────────────
if (-not $SkipFrontend) {
    Push-Location "$RepoRoot\apps\frontend"

    Write-Host "`n[3/4] Running TypeScript check..." -ForegroundColor Yellow
    & .\node_modules\.bin\tsc.cmd --noEmit --project tsconfig.app.json 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "TypeScript check failed" }
    Write-Host "  TypeScript OK" -ForegroundColor Green

    Write-Host "`n[4/4] Running frontend tests (vitest)..." -ForegroundColor Yellow
    & .\node_modules\.bin\vitest.cmd run 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "Vitest failed" }
    Write-Host "  Vitest OK" -ForegroundColor Green

    Pop-Location
}

Write-Host "`n=== Validation complete ===" -ForegroundColor Cyan