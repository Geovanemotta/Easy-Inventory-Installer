<#
.SYNOPSIS
    Instalador Silencioso do Agente MeshCentral para Windows (Grupo Giassi)
.DESCRIPTION
    Instala o agente MeshCentral como Serviço do Windows nativo (NT AUTHORITY\SYSTEM),
    habilitando acesso à tela em tempo real, suporte ao UAC (Secure Desktop) sem tela preta
    e conexões de saída diretas para o servidor interno.
#>

[CmdletBinding()]
param(
    [string]$ServerHost = "localhost",
    [int]$ServerPort = 4443,
    [string]$MeshGroup = "Giassi"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   INSTALADOR DO AGENTE MESHCENTRAL - GRUPO GIASSI TI    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Checagem de Privilégios de Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "Este script precisa ser executado como Administrador para registrar o serviço do Windows."
    exit 1
}

# 2. Verificar se o serviço já existe e está em execução
$existingService = Get-Service -Name "Mesh Agent" -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "[OK] O serviço 'Mesh Agent' já está instalado no sistema (Status: $($existingService.Status))." -ForegroundColor Green
    if ($existingService.Status -ne 'Running') {
        Write-Host "[>] Iniciando serviço..." -ForegroundColor Yellow
        Start-Service -Name "Mesh Agent"
    }
    Write-Host "[CONCLUÍDO] Máquina pronta para acesso remoto." -ForegroundColor Green
    exit 0
}

# 3. Diretório de Instalação Padrão
$targetDir = "C:\Program Files\Mesh Agent"
if (-not (Test-Path $targetDir)) {
    New-Item -Path $targetDir -ItemType Directory -Force | Out-Null
}

$agentExePath = Join-Path $targetDir "MeshAgent.exe"

# 4. Caso o instalador já exista na pasta local ou de rede
$localInstaller = Join-Path $PSScriptRoot "MeshAgent.exe"
if (Test-Path $localInstaller) {
    Write-Host "[+] Copiando instalador local para $targetDir..." -ForegroundColor Yellow
    Copy-Item -Path $localInstaller -Destination $agentExePath -Force
} else {
    # Tenta baixar do servidor MeshCentral corporativo
    $downloadUrl = "https://${ServerHost}:${ServerPort}/meshagents?id=16"
    Write-Host "[+] Baixando agente do servidor: $downloadUrl..." -ForegroundColor Yellow
    try {
        [System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12 -bor [System.Net.SecurityProtocolType]::Tls13
        Invoke-WebRequest -Uri $downloadUrl -OutFile $agentExePath -UseBasicParsing -TimeoutSec 30
    } catch {
        Write-Warning "Não foi possível baixar automaticamente via URL ($($_.Exception.Message))."
        Write-Host "Por favor, coloque o executável 'MeshAgent.exe' (gerado no painel do MeshCentral) na mesma pasta deste script." -ForegroundColor Yellow
        exit 1
    }
}

# 5. Executar instalação como Serviço do Windows
Write-Host "[+] Registrando serviço do sistema..." -ForegroundColor Yellow
try {
    Start-Process -FilePath $agentExePath -ArgumentList "-install" -Wait -NoNewWindow
    Start-Sleep -Seconds 3

    $installedService = Get-Service -Name "Mesh Agent" -ErrorAction SilentlyContinue
    if ($installedService) {
        Write-Host "[SUCESSO] Agente MeshCentral instalado e registrado como serviço do Windows com sucesso!" -ForegroundColor Green
        Write-Host "         - UAC habilitado (sem tela preta)" -ForegroundColor Green
        Write-Host "         - Inicialização automática com o Windows" -ForegroundColor Green
    } else {
        Write-Warning "Comando de instalação concluído, mas o serviço ainda não foi detectado. Verifique os logs em $targetDir."
    }
} catch {
    Write-Error "Falha ao instalar o MeshAgent: $($_.Exception.Message)"
    exit 1
}
