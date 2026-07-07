$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Test-PortListening {
    param([int]$Port)

    return $null -ne (netstat -ano | Select-String "127\.0\.0\.1:$Port\s+.*LISTENING")
}

function Wait-ForPort {
    param(
        [int]$Port,
        [string]$Name,
        [int]$TimeoutSeconds = 20
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-PortListening -Port $Port) {
            Write-Host "$Name is ready on 127.0.0.1:$Port"
            return
        }

        Start-Sleep -Milliseconds 500
    }

    throw "$Name did not start listening on 127.0.0.1:$Port within $TimeoutSeconds seconds."
}

function Start-OmegaService {
    param(
        [string]$Name,
        [int]$Port,
        [string]$WorkingDirectory,
        [string]$FilePath,
        [string[]]$ArgumentList,
        [string]$StdOutLog,
        [string]$StdErrLog
    )

    if (Test-PortListening -Port $Port) {
        Write-Host "$Name is already running on 127.0.0.1:$Port"
        return
    }

    if (-not (Test-Path -LiteralPath $FilePath)) {
        throw "$Name executable not found: $FilePath"
    }

    Remove-Item -LiteralPath $StdOutLog -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $StdErrLog -ErrorAction SilentlyContinue

    $process = Start-Process `
        -FilePath $FilePath `
        -ArgumentList $ArgumentList `
        -WorkingDirectory $WorkingDirectory `
        -WindowStyle Hidden `
        -RedirectStandardOutput $StdOutLog `
        -RedirectStandardError $StdErrLog `
        -PassThru

    Write-Host "Started $Name (PID $($process.Id))"

    try {
        Wait-ForPort -Port $Port -Name $Name
    }
    catch {
        if ($process.HasExited) {
            Write-Host "$Name exited with code $($process.ExitCode)"
        }

        if (Test-Path -LiteralPath $StdErrLog) {
            $errorLines = Get-Content -LiteralPath $StdErrLog -Tail 20
            if ($errorLines) {
                Write-Host "$Name stderr:"
                $errorLines | ForEach-Object { Write-Host $_ }
            }
        }

        throw
    }
}

$apiDir = Join-Path $root "apps\api"
$frontendDir = Join-Path $root "apps\frontend"

Start-OmegaService `
    -Name "Omega API" `
    -Port 8007 `
    -WorkingDirectory $apiDir `
    -FilePath (Join-Path $apiDir ".venv\Scripts\python.exe") `
    -ArgumentList @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8007") `
    -StdOutLog (Join-Path $apiDir "omega-api.out.log") `
    -StdErrLog (Join-Path $apiDir "omega-api.err.log")

Start-OmegaService `
    -Name "Omega Frontend" `
    -Port 3007 `
    -WorkingDirectory $frontendDir `
    -FilePath "C:\Program Files\nodejs\npm.cmd" `
    -ArgumentList @(
        "run",
        "dev",
        "--",
        "--config",
        "vite.run.config.ts"
    ) `
    -StdOutLog (Join-Path $frontendDir "omega-frontend.out.log") `
    -StdErrLog (Join-Path $frontendDir "omega-frontend.err.log")

Write-Host "Omega is available at http://127.0.0.1:3007 and http://127.0.0.1:8007"
