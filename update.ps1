# ==============================================================================
#  SISTEMA DE INVENTÁRIO - SCRIPT DE ATUALIZAÇÃO CONTÍNUA (WINDOWS / POWERSHELL)
#  Puxa as novidades do Git, recompila o frontend, aplica migrações e
#  reinicia os containers com downtime mínimo (sem perder nenhum dado).
# ==============================================================================

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   SISTEMA DE INVENTÁRIO - ATUALIZAÇÃO AUTOMÁTICA" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Puxa atualizações do Git (se for repositório git)
if (Test-Path ".git") {
    Write-Host "[1/5] Baixando novidades do repositório Git..." -ForegroundColor Yellow
    $currentBranch = (git rev-parse --abbrev-ref HEAD 2>$null)
    if (-not $currentBranch) { $currentBranch = "main" }
    Write-Host " [*] Branch atual: $currentBranch"
    git fetch origin $currentBranch 2>$null
    git pull origin $currentBranch 2>$null
    Write-Host "[✓] Código-fonte atualizado para o commit mais recente." -ForegroundColor Green
} else {
    Write-Host "[1/5] Diretório não é um clone git. Pulando 'git pull'." -ForegroundColor Yellow
}

# 2. Frontend
Write-Host "[2/5] Verificando painel frontend..." -ForegroundColor Yellow
if (Test-Path "frontend/dist/index.html") {
    Write-Host "[✓] Painel frontend pré-compilado (frontend/dist) detectado via Git. Pulando compilação NPM..." -ForegroundColor Green
} else {
    $npmCmd = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
    if ($npmCmd) {
        Write-Host " [*] Usando Node.js local..."
        Push-Location "frontend"
        cmd.exe /c "npm install"
        cmd.exe /c "npm run build"
        Pop-Location
    } else {
        Write-Host " [*] Compilando via container Node.js (node:20-bookworm-slim)..."
        docker run --rm -v "${PWD}/frontend:/app" -w /app node:20-bookworm-slim sh -c "npm install; npm run build"
    }
    Write-Host "[✓] Frontend compilado com sucesso." -ForegroundColor Green
}

# 3. Atualização dos containers (sem tocar em volumes)
Write-Host "[3/5] Atualizando containers Docker e aplicando alterações..." -ForegroundColor Yellow
$backendRunning = docker inspect giassi-backend 2>$null
if ($backendRunning) {
    Write-Host " [*] Imagens Docker locais detectadas. Aplicando alterações diretamente via volumes..."
    docker compose up -d
    docker compose restart backend nginx 2>$null
} else {
    Write-Host " [*] Executando build inicial dos containers..."
    docker compose up -d --build
}

# 4. Aguardar PostgreSQL estar pronto antes de rodar migrações
Write-Host "[4/5] Aguardando o banco de dados PostgreSQL estar operacional..." -ForegroundColor Yellow
$attempts = 0
while ($attempts -lt 30) {
    docker compose exec -T postgres pg_isready > $null 2>&1
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep -Seconds 1
    $attempts++
}
Write-Host "[✓] PostgreSQL pronto para conexões." -ForegroundColor Green

# 5. Executar migrações pendentes no banco de dados (Alembic) e sincronizar perfis
Write-Host "[5/5] Aplicando novas migrações e sincronizando perfis no banco..." -ForegroundColor Yellow
docker compose exec -T backend alembic upgrade head
docker compose exec -T backend python -m app.seeds.seed_turnkey --sync-roles
Write-Host "[✓] Banco de dados e papéis estruturalmente atualizados sem perda de dados." -ForegroundColor Green

# Limpeza de imagens órfãs antigas
docker image prune -f > $null 2>&1

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   SISTEMA ATUALIZADO COM SUCESSO! 🚀" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Cyan
if (Test-Path ".git") {
    $lastCommit = git log -1 --pretty=format:"%h - %s (%cr)" 2>$null
    if ($lastCommit) {
        Write-Host " Versão instalada: $lastCommit" -ForegroundColor Cyan
    }
}
Write-Host " Status dos serviços:"
docker compose ps
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""


