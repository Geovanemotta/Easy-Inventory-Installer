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
    Write-Host "[1/4] Baixando novidades do repositório Git..." -ForegroundColor Yellow
    $currentBranch = (git rev-parse --abbrev-ref HEAD 2>$null)
    if (-not $currentBranch) { $currentBranch = "main" }
    Write-Host " [*] Branch atual: $currentBranch"
    git fetch origin $currentBranch
    git pull origin $currentBranch
    Write-Host "[✓] Código-fonte atualizado para o commit mais recente." -ForegroundColor Green
} else {
    Write-Host "[1/4] Diretório não é um clone git. Pulando 'git pull'." -ForegroundColor Yellow
}

# 2. Recompilar o Frontend
Write-Host "[2/4] Compilando painel frontend via container Node.js..." -ForegroundColor Yellow
docker run --rm -v "${PWD}/frontend:/app" -w /app node:20-alpine sh -c "npm install && npm run build"
Write-Host "[✓] Frontend recompilado com sucesso." -ForegroundColor Green

# 3. Reconstrução e reinicialização dos containers
Write-Host "[3/4] Reconstruindo imagens Docker e aplicando alterações..." -ForegroundColor Yellow
docker compose up -d --build

# 4. Executar migrações pendentes no banco de dados (Alembic)
Write-Host "[4/4] Verificando e aplicando novas migrações no banco (Alembic)..." -ForegroundColor Yellow
docker compose exec -T backend alembic upgrade head
Write-Host "[✓] Banco de dados estruturalmente atualizado." -ForegroundColor Green

# Limpeza de imagens órfãs antigas
docker image prune -f > $null 2>&1

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   SISTEMA ATUALIZADO COM SUCESSO! 🚀" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Cyan
if (Test-Path ".git") {
    $lastCommit = git log -1 --pretty=format:"%h - %s (%cr)"
    Write-Host " Versão instalada: $lastCommit" -ForegroundColor Cyan
}
Write-Host " Status dos serviços:"
docker compose ps
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""
