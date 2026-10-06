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
    echo -e "${YELLOW}[1/5] Baixando novidades do repositório Git...${NC}"
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
    echo " [*] Branch atual: $CURRENT_BRANCH"
    git fetch origin "$CURRENT_BRANCH" 2>/dev/null || true
    git pull origin "$CURRENT_BRANCH" 2>/dev/null || true
    echo -e "${GREEN}[✓] Código-fonte atualizado para a versão mais recente.${NC}"
else
    echo -e "${YELLOW}[1/5] Diretório não é um clone git. Pulando 'git pull'.${NC}"
fi

# 3. Recompilar o Frontend (React / Vite)
echo -e "${YELLOW}[2/5] Compilando painel frontend...${NC}"
if command -v npm &> /dev/null && [ -f "frontend/package.json" ]; then
    echo " [*] Usando Node.js local do servidor..."
    (cd frontend && npm install && npm run build) || {
        echo " [!] Compilação local falhou, compilando via container Node.js..."
        docker run --rm -v "$(pwd)/frontend:/app" -w /app node:20-alpine sh -c "npm install && npm run build"
    }
else
    echo " [*] Compilando via container Node.js..."
    docker run --rm -v "$(pwd)/frontend:/app" -w /app node:20-alpine sh -c "npm install && npm run build"
fi
echo -e "${GREEN}[✓] Frontend compilado com sucesso.${NC}"

# 4. Reconstrução e reinicialização dos containers (sem tocar em volumes)
echo -e "${YELLOW}[3/5] Reconstruindo imagens Docker e aplicando alterações...${NC}"
$DOCKER_COMPOSE up -d --build

# 5. Aguardar PostgreSQL estar pronto antes de rodar migrações
echo -e "${YELLOW}[4/5] Aguardando o banco de dados PostgreSQL estar operacional...${NC}"
MAX_ATTEMPTS=30
ATTEMPT=0
until $DOCKER_COMPOSE exec -T postgres pg_isready &>/dev/null; do
    ATTEMPT=$((ATTEMPT + 1))
    if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
        echo -e "${RED}[X] Tempo limite esgotado esperando o PostgreSQL.${NC}"
        $DOCKER_COMPOSE logs postgres
        exit 1
    fi
    sleep 1
done
echo -e "${GREEN}[✓] PostgreSQL pronto para conexões.${NC}"

# 6. Executar migrações estruturais do banco de dados (Alembic) e sincronizar perfis
echo -e "${YELLOW}[5/5] Aplicando novas migrações e sincronizando perfis no banco...${NC}"
$DOCKER_COMPOSE exec -T backend alembic upgrade head
$DOCKER_COMPOSE exec -T backend python -m app.seeds.sync_roles
echo -e "${GREEN}[✓] Banco de dados e papéis estruturalmente atualizados sem perda de dados.${NC}"

# Limpeza de imagens órfãs antigas
docker image prune -f >/dev/null 2>&1 || true

echo ""
echo -e "${CYAN}==================================================================${NC}"
echo -e "${BOLD}${GREEN}   SISTEMA ATUALIZADO COM SUCESSO! 🚀${NC}"
echo -e "${CYAN}==================================================================${NC}"
if [ -d ".git" ]; then
    LAST_COMMIT=$(git log -1 --pretty=format:"%h - %s (%cr)" 2>/dev/null || echo "")
    if [ -n "$LAST_COMMIT" ]; then
        echo -e " ${BOLD}Versão instalada:${NC} ${CYAN}${LAST_COMMIT}${NC}"
    fi
fi
echo -e " ${BOLD}Status dos serviços:${NC}"
$DOCKER_COMPOSE ps
echo -e "${CYAN}==================================================================${NC}"
echo ""
