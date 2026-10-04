# ==============================================================================
#  SISTEMA DE INVENTÁRIO - INSTALADOR TURNKEY (WINDOWS / POWERSHELL)
#  Prepara e inicializa todo o ecossistema Docker do zero em um servidor Windows.
# ==============================================================================

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   SISTEMA DE INVENTÁRIO CORPORATIVO - INSTALADOR TURNKEY" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " Este assistente irá configurar o servidor e inicializar todos"
Write-Host " os serviços em containers Docker de forma 100% automatizada."
Write-Host ""

# 1. Checagem de Pré-requisitos
Write-Host "[1/6] Verificando pré-requisitos do sistema..." -ForegroundColor Yellow

$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerCmd) {
    Write-Host "[X] Docker não foi encontrado neste sistema!" -ForegroundColor Red
    Write-Host "    Instale o Docker Desktop antes de continuar."
    exit 1
}

try {
    docker info > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[X] O serviço do Docker não está rodando. Inicie o Docker Desktop." -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "[X] Falha ao comunicar com o daemon do Docker." -ForegroundColor Red
    exit 1
}

Write-Host "[✓] Docker operacional." -ForegroundColor Green
Write-Host ""

# 2. Perguntas Interativas
Write-Host "[2/6] Coleta de parâmetros da instalação:" -ForegroundColor Yellow
Write-Host "------------------------------------------------------------------"

# Detecta IP local
$hostIp = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi*", "Ethernet*" -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notmatch '^169\.254\.' -and $_.IPAddress -notmatch '^127\.' } | Select-Object -ExpandProperty IPAddress -First 1)
if (-not $hostIp) { $hostIp = "127.0.0.1" }

$companyName = Read-Host " Nome da empresa [Giassi Supermercados]"
if (-not $companyName) { $companyName = "Giassi Supermercados" }

$defaultSlug = ($companyName.ToLower() -replace '[^a-z0-9]', '')
if (-not $defaultSlug) { $defaultSlug = "giassi" }
$companySlug = Read-Host " Identificador curto / slug da empresa [$defaultSlug]"
if (-not $companySlug) { $companySlug = $defaultSlug }

$serverHost = Read-Host " IP ou DNS de acesso ao servidor [$hostIp]"
if (-not $serverHost) { $serverHost = $hostIp }

$portHttps = Read-Host " Porta HTTPS [443]"
if (-not $portHttps) { $portHttps = "443" }

$portHttp = Read-Host " Porta HTTP [80]"
if (-not $portHttp) { $portHttp = "80" }

$dbName = Read-Host " Nome do banco de dados [${companySlug}_inventory]"
if (-not $dbName) { $dbName = "${companySlug}_inventory" }

$dbUser = Read-Host " Usuário do banco de dados [${companySlug}_app]"
if (-not $dbUser) { $dbUser = "${companySlug}_app" }

$suggestedPass = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 14 | ForEach-Object { [char]$_ })
$dbPass = Read-Host " Senha do banco de dados [$suggestedPass]"
if (-not $dbPass) { $dbPass = $suggestedPass }

$adminUser = Read-Host " Usuário administrador do sistema [admin]"
if (-not $adminUser) { $adminUser = "admin" }

$adminFullname = Read-Host " Nome completo do administrador [Administrador do Sistema]"
if (-not $adminFullname) { $adminFullname = "Administrador do Sistema" }

$adminEmail = Read-Host " E-mail do administrador [admin@${companySlug}.com.br]"
if (-not $adminEmail) { $adminEmail = "admin@${companySlug}.com.br" }

$adminPass = ""
while ($true) {
    $secPass = Read-Host -Prompt " Digite a senha do usuário admin inicial" -AsSecureString
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secPass)
    $plain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    if ($plain.Length -lt 6) {
        Write-Host " [!] A senha deve conter pelo menos 6 caracteres." -ForegroundColor Red
        continue
    }
    $secPassConfirm = Read-Host -Prompt " Confirme a senha do admin" -AsSecureString
    $bstr2 = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secPassConfirm)
    $plain2 = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr2)
    if ($plain -ne $plain2) {
        Write-Host " [!] As senhas não coincidem. Tente novamente." -ForegroundColor Red
    }
    else {
        $adminPass = $plain
        break
    }
}

$defaultSitesInput = Read-Host " Criar lista padrão de filiais (Lojas 01 a 30, Combos, Matriz)? [S/n]"
$noSitesFlag = ""
if ($defaultSitesInput -match '^[Nn]') {
    $noSitesFlag = "--no-default-sites"
}

Write-Host ""
# 3. Geração do .env
Write-Host "[3/6] Gerando variáveis de ambiente (.env) e chaves JWT..." -ForegroundColor Yellow

$jwtBytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($jwtBytes)
$jwtSecret = ($jwtBytes | ForEach-Object { "{0:x2}" -f $_ }) -join ''

$envContent = @"
POSTGRES_DB=$dbName
POSTGRES_USER=$dbUser
POSTGRES_PASSWORD=$dbPass
POSTGRES_PORT=5432
JWT_SECRET_KEY=$jwtSecret
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440
SERVER_HOST=$serverHost
PORT_HTTP=$portHttp
PORT_HTTPS=$portHttps
"@

Set-Content -Path ".env" -Value $envContent -Encoding utf8
Write-Host "[✓] Arquivo .env gerado com sucesso." -ForegroundColor Green

# 4. Frontend Build
Write-Host "[4/6] Verificando compilação do painel frontend..." -ForegroundColor Yellow
if (-not (Test-Path "frontend/dist/index.html")) {
    Write-Host " [*] Compilando arquivos do frontend via container Node.js isolado..."
    docker run --rm -v "${PWD}/frontend:/app" -w /app node:20-alpine sh -c "npm install && npm run build"
    Write-Host "[✓] Frontend compilado em ./frontend/dist!" -ForegroundColor Green
}
else {
    Write-Host "[✓] Frontend já compilado anteriormente." -ForegroundColor Green
}

# 5. Inicialização dos Containers
Write-Host "[5/6] Construindo e iniciando containers Docker..." -ForegroundColor Yellow

$existingVol = docker volume ls -q 2>$null | Select-String "postgres_data"
if ($existingVol) {
    Write-Host " [!] Foi detectado um volume de banco de dados pré-existente." -ForegroundColor Yellow
    Write-Host "     Para garantir que as novas credenciais sejam aplicadas com sucesso:"
    $resetDb = Read-Host "     Deseja recriar o banco de dados do zero? [S/n]"
    if (-not $resetDb -or $resetDb -notmatch '^[Nn]') {
        Write-Host " [*] Resetando banco para instalação limpa..."
        docker compose down -v 2>$null
    }
    else {
        docker compose down 2>$null
    }
}
else {
    docker compose down 2>$null
}

docker compose up -d --build

Write-Host " [*] Aguardando o banco de dados PostgreSQL ficar pronto para conexões..."
$attempts = 0
while ($attempts -lt 30) {
    docker compose exec -T postgres pg_isready -U $dbUser -d $dbName > $null 2>&1
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep -Seconds 1
    $attempts++
}
Write-Host "[✓] Banco de dados PostgreSQL online." -ForegroundColor Green

Write-Host " [*] Executando migrações estruturais do banco (Alembic)..."
docker compose exec -T backend alembic upgrade head

Write-Host " [*] Criando empresa, perfis e usuário administrador inicial..."
if ($noSitesFlag) {
    docker compose exec -T backend python -m app.seeds.seed_turnkey --company-name "$companyName" --company-slug "$companySlug" --admin-username "$adminUser" --admin-fullname "$adminFullname" --admin-email "$adminEmail" --admin-password "$adminPass" --no-default-sites
}
else {
    docker compose exec -T backend python -m app.seeds.seed_turnkey --company-name "$companyName" --company-slug "$companySlug" --admin-username "$adminUser" --admin-fullname "$adminFullname" --admin-email "$adminEmail" --admin-password "$adminPass"
}

# 6. Conclusão
Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   INSTALAÇÃO CONCLUÍDA COM SUCESSO! 🚀" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Cyan

$urlPainel = if ($portHttps -eq 443) { "https://${serverHost}" } else { "https://${serverHost}:${portHttps}" }

Write-Host " Painel de Acesso:     $urlPainel" -ForegroundColor Green
Write-Host " Usuário Admin:        $adminUser" -ForegroundColor Yellow
Write-Host " Empresa:              $companyName" -ForegroundColor Cyan
Write-Host "------------------------------------------------------------------"
Write-Host " Comandos para instalar os agentes nas máquinas:"
Write-Host ""
Write-Host " • Windows (PowerShell como Administrador):"
Write-Host "   irm $urlPainel/api/v1/agent/windows | iex" -ForegroundColor Cyan
Write-Host ""
Write-Host " • Linux (Terminal / Bash como Root):"
Write-Host "   curl -sSL $urlPainel/api/v1/agent/linux | sudo bash" -ForegroundColor Cyan
Write-Host "------------------------------------------------------------------"
Write-Host " [i] Dica de Certificado SSL:" -ForegroundColor Yellow
Write-Host "     Um certificado auto-assinado válido por 10 anos foi gerado."
Write-Host "     Para usar o certificado da sua empresa, coloque os arquivos"
Write-Host "     'giassi.crt' e 'giassi.key' na pasta './nginx/certs/'"
Write-Host "     e execute: docker exec giassi-nginx nginx -s reload"
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""
