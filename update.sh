#!/usr/bin/env bash
# ==============================================================================
#  SISTEMA DE INVENTÁRIO - SCRIPT DE ATUALIZAÇÃO CONTÍNUA (UPDATE)
#  Puxa as novidades do Git, recompila o frontend, aplica migrações e
#  reinicia os containers com downtime mínimo (sem perder nenhum dado).
# ==============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${CYAN}==================================================================${NC}"
echo -e "${BOLD}${CYAN}   SISTEMA DE INVENTÁRIO - ATUALIZAÇÃO AUTOMÁTICA${NC}"
echo -e "${CYAN}==================================================================${NC}"
echo ""

# 1. Checagem do Docker Compose
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    echo -e "${RED}[X] Docker Compose não encontrado!${NC}"
    exit 1
fi

# 2. Puxa atualizações do Git (se for repositório git)
if [ -d ".git" ]; then
    echo -e "${YELLOW}[1/4] Baixando novidades do repositório Git...${NC}"
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
    echo " [*] Branch atual: $CURRENT_BRANCH"
    git fetch origin "$CURRENT_BRANCH"
    git pull origin "$CURRENT_BRANCH"
    echo -e "${GREEN}[✓] Código-fonte atualizado para o commit mais recente.${NC}"
else
    echo -e "${YELLOW}[1/4] Diretório não é um clone git. Pulando 'git pull'.${NC}"
fi

# 3. Recompilar o Frontend (React / Vite)
echo -e "${YELLOW}[2/4] Compilando painel frontend via container Node.js...${NC}"
docker run --rm \
    -v "$(pwd)/frontend:/app" \
    -w /app \
    node:20-alpine \
    sh -c "npm install && npm run build"
echo -e "${GREEN}[✓] Frontend recompilado com sucesso.${NC}"

# 4. Reconstrução e reinicialização dos containers
echo -e "${YELLOW}[3/4] Reconstruindo imagens Docker e aplicando alterações...${NC}"
$DOCKER_COMPOSE up -d --build

# 5. Executar migrações pendentes no banco de dados (Alembic)
echo -e "${YELLOW}[4/4] Verificando e aplicando novas migrações no banco (Alembic)...${NC}"
$DOCKER_COMPOSE exec -T backend alembic upgrade head
echo -e "${GREEN}[✓] Banco de dados estruturalmente atualizado.${NC}"

# Limpeza de imagens órfãs antigas
docker image prune -f >/dev/null 2>&1 || true

echo ""
echo -e "${CYAN}==================================================================${NC}"
echo -e "${BOLD}${GREEN}   SISTEMA ATUALIZADO COM SUCESSO! 🚀${NC}"
echo -e "${CYAN}==================================================================${NC}"
if [ -d ".git" ]; then
    LAST_COMMIT=$(git log -1 --pretty=format:"%h - %s (%cr)")
    echo -e " ${BOLD}Versão instalada:${NC} ${CYAN}${LAST_COMMIT}${NC}"
fi
echo -e " ${BOLD}Status dos serviços:${NC}"
$DOCKER_COMPOSE ps
echo -e "${CYAN}==================================================================${NC}"
echo ""
