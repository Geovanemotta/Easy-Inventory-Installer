# ==========================================================
# IMPORTADOR AUTOMÁTICO DE CERTIFICADO PFX (WINDOWS)
# Converte .pfx para server.crt e server.key e recarrega o Nginx
# ==========================================================

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$PfxPath,

    [Parameter()]
    [string]$Password = ""
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$KeyOut = Join-Path $ScriptDir "server.key"
$CrtOut = Join-Path $ScriptDir "server.crt"

if (-not (Test-Path $PfxPath)) {
    Write-Error "Arquivo PFX não encontrado: $PfxPath"
    exit 1
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " IMPORTAÇÃO DE CERTIFICADO CORPORATIVO " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "[*] Origem: $PfxPath"
Write-Host "[*] Destino da Chave: $KeyOut"
Write-Host "[*] Destino do Certificado: $CrtOut"

# Executa conversão via OpenSSL
$passArg = if ($Password) { "-passin pass:$Password" } else { "" }

Write-Host "[1/3] Extraindo chave privada..." -ForegroundColor Yellow
$cmdKey = "openssl pkcs12 -in `"$PfxPath`" -nocerts -out `"$KeyOut`" -nodes $passArg"
Invoke-Expression $cmdKey

if (-not (Test-Path $KeyOut)) {
    Write-Error "Falha ao extrair chave privada. Verifique a senha do PFX."
    exit 1
}

Write-Host "[2/3] Extraindo certificado público e cadeias..." -ForegroundColor Yellow
$cmdCrt = "openssl pkcs12 -in `"$PfxPath`" -clcerts -nokeys -out `"$CrtOut`" $passArg"
Invoke-Expression $cmdCrt

if (-not (Test-Path $CrtOut)) {
    Write-Error "Falha ao extrair certificado."
    exit 1
}

Write-Host "[3/3] Validando e recarregando Nginx no container zenithmap-nginx..." -ForegroundColor Yellow
try {
    docker exec zenithmap-nginx nginx -t
    docker exec zenithmap-nginx nginx -s reload
    Write-Host "[+] SUCESSO: Certificado aplicado no Nginx!" -ForegroundColor Green
    $runningMesh = docker ps --format '{{.Names}}' | Select-String "zenithmap-meshcentral"
    if ($runningMesh) {
        Write-Host "[*] Reiniciando MeshCentral para carregar o novo certificado..." -ForegroundColor Yellow
        docker restart zenithmap-meshcentral
        Write-Host "[+] SUCESSO: MeshCentral atualizado com o novo certificado!" -ForegroundColor Green
    }
}
catch {
    Write-Warning "Containers não estão rodando no momento. Os certificados serão usados na próxima inicialização."
}
