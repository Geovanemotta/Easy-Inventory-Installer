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

# ------------------------------------------------------------------------------
# 0. Verificação e Adaptação para Certificados de Firewall Corporativo (DPI/SSL)
# ------------------------------------------------------------------------------
check_corporate_ca() {
    local need_ca_update=false
    if [ -d "/usr/local/share/ca-certificates" ]; then
        for f in /usr/local/share/ca-certificates/*.cer /usr/local/share/ca-certificates/*.pem; do
            if [ -f "$f" ]; then
                local base="${f%.*}"
                if [ ! -f "${base}.crt" ]; then
                    echo " [*] Detectado certificado corporativo sem extensão .crt: $(basename "$f")"
                    echo "     Convertendo para .crt para que o Linux e o Docker o reconheçam..."
                    cp "$f" "${base}.crt" 2>/dev/null || true
                    need_ca_update=true
                fi
            fi
        done
    fi

    if [ "$need_ca_update" = true ]; then
        echo " [*] Atualizando base de certificados do sistema..."
        update-ca-certificates 2>/dev/null || true
        if systemctl is-active docker &>/dev/null; then
            echo " [*] Reiniciando serviço do Docker para carregar a CA corporativa..."
            systemctl restart docker 2>/dev/null || true
        fi
        echo -e "${GREEN}[✓] Certificados corporativos configurados no sistema e no Docker.${NC}"
    fi

    if [ -f "/etc/ssl/certs/ca-certificates.crt" ]; then
        export NODE_EXTRA_CA_CERTS="/etc/ssl/certs/ca-certificates.crt"
    fi
}

check_corporate_ca

# ------------------------------------------------------------------------------
# 1. Checagem do Docker Compose
# ------------------------------------------------------------------------------
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    echo -e "${RED}[X] Docker Compose não encontrado!${NC}"
    echo "    Instale o plugin via: sudo apt-get install docker-compose-plugin"
    exit 1
fi

# ------------------------------------------------------------------------------
# 2. Puxa atualizações do Git (se for repositório git)
# ------------------------------------------------------------------------------
if [ -d ".git" ]; then
    echo -e "${YELLOW}[1/5] Baixando novidades do repositório Git...${NC}"
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
    echo " [*] Branch atual: $CURRENT_BRANCH"

    if ! git fetch origin "$CURRENT_BRANCH" || ! git pull origin "$CURRENT_BRANCH"; then
        echo ""
        echo -e "${RED}==================================================================${NC}"
        echo -e "${BOLD}${RED}[X] FALHA AO ATUALIZAR CÓDIGO DO REPOSITÓRIO GIT${NC}"
        echo -e "${RED}==================================================================${NC}"
        echo " Possíveis causas e como resolver:"
        echo " 1) Bloqueio no Firewall: Certifique-se de que o domínio 'github.com' (porta 443 TCP) está liberado."
        echo " 2) Erro de SSL: Se o firewall faz inspeção SSL, garanta que a CA corporativa está instalada."
        echo " 3) Alterações locais conflitantes: Execute 'git status' para verificar."
        echo -e "${RED}==================================================================${NC}"
        exit 1
    fi
    echo -e "${GREEN}[✓] Código-fonte atualizado para a versão mais recente.${NC}"
else
    echo -e "${YELLOW}[1/5] Diretório não é um clone git. Pulando 'git pull'.${NC}"
fi

# ------------------------------------------------------------------------------
# 3. Recompilar o Frontend (React / Vite)
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[2/5] Compilando painel frontend...${NC}"

CA_VOLUME=""
if [ -f "/etc/ssl/certs/ca-certificates.crt" ]; then
    CA_VOLUME="-v /etc/ssl/certs/ca-certificates.crt:/etc/ssl/certs/ca-certificates.crt:ro -e NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt"
fi

NODE_VER="0"
if command -v node &> /dev/null; then
    NODE_VER=$(node -v 2>/dev/null | tr -d 'v' | cut -d. -f1 || echo "0")
fi

COMPILED=false

# O Vite 8 / Rolldown exige Node.js 20+. Se o Node local for anterior (ex: Node 18 ao rodar com sudo),
# usa direto o container isolado node:20-alpine para evitar avisos EBADENGINE e SyntaxError: styleText
if [ "$NODE_VER" -ge 20 ] 2>/dev/null && [ -f "frontend/package.json" ]; then
    echo " [*] Usando Node.js local do servidor (v$(node -v))..."
    if (cd frontend && npm install --no-audit --no-fund && npm run build); then
        COMPILED=true
    else
        echo -e "${YELLOW} [!] Compilação local falhou. Tentando via container Node.js 20...${NC}"
    fi
elif [ "$NODE_VER" -gt 0 ] 2>/dev/null; then
    echo " [i] Node.js local do sistema (v$(node -v 2>/dev/null)) é inferior ao exigido pelo Vite 8 (Node 20+)."
    echo "     Usando container isolado 'node:20-alpine' para compilação garantida..."
fi

# Se não compilou localmente, compila via container node:20-alpine com a CA do firewall montada
if [ "$COMPILED" = false ]; then
    echo " [*] Compilando via container Node.js 20..."
    if docker run --rm -v "$(pwd)/frontend:/app" $CA_VOLUME -w /app node:20-alpine sh -c "npm install --no-audit --no-fund && npm run build"; then
        COMPILED=true
    fi
fi

if [ "$COMPILED" = false ]; then
    echo ""
    echo -e "${RED}==================================================================${NC}"
    echo -e "${BOLD}${RED}[X] FALHA NA COMPILAÇÃO DO FRONTEND${NC}"
    echo -e "${RED}==================================================================${NC}"
    echo " Possíveis causas e como resolver:"
    echo ""
    echo -e " 1) ${BOLD}Erro de Certificado SSL (SELF_SIGNED_CERT_IN_CHAIN):${NC}"
    echo "    O firewall está interceptando o download de pacotes NPM (registry.npmjs.org)."
    echo "    Execute: sudo ./check-firewall.sh --fix-ca para habilitar a CA corporativa."
    echo ""
    echo -e " 2) ${BOLD}Bloqueio de Firewall no repositório NPM:${NC}"
    echo "    Certifique-se de que 'registry.npmjs.org' (porta 443 TCP) está liberado."
    echo ""
    echo -e " 3) ${BOLD}Versão do Node.js:${NC}"
    echo "    O Vite 8 exige Node.js 20+. O instalador tentou usar o container 'node:20-alpine'."
    echo "    Verifique se o Docker consegue baixar imagens do Docker Hub."
    echo -e "${RED}==================================================================${NC}"
    exit 1
fi

echo -e "${GREEN}[✓] Frontend compilado com sucesso em ./frontend/dist!${NC}"

# ------------------------------------------------------------------------------
# 4. Reconstrução e reinicialização dos containers (sem tocar em volumes)
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[3/5] Reconstruindo imagens Docker e aplicando alterações...${NC}"

if ! $DOCKER_COMPOSE up -d --build; then
    echo ""
    echo -e "${RED}==================================================================${NC}"
    echo -e "${BOLD}${RED}[X] FALHA NA RECONSTRUÇÃO DOS CONTAINERS DOCKER${NC}"
    echo -e "${RED}==================================================================${NC}"
    echo " Diagnóstico do erro:"
    echo ""
    echo -e " 1) ${BOLD}Erro de Certificado SSL (x509: certificate signed by unknown authority):${NC}"
    echo "    O Docker não conseguiu validar o certificado SSL ao consultar o Docker Hub."
    echo "    Causa: O firewall corporativo (DPI / Inspeção SSL) está interceptando HTTPS."
    echo ""
    echo -e "    ${BOLD}Como resolver:${NC}"
    echo "    - Certifique-se de que a CA do firewall está em: /usr/local/share/ca-certificates/<nome>.crt"
    echo "    - Execute:"
    echo "      sudo ./check-firewall.sh --fix-ca"
    echo "    - Em seguida, execute o ./update.sh novamente."
    echo ""
    echo -e " 2) ${BOLD}Bloqueio de Firewall nos Registros do Docker Hub:${NC}"
    echo "    Solicite à equipe de segurança a liberação das seguintes portas/domínios:"
    echo "    - registry-1.docker.io (porta 443 TCP)"
    echo "    - auth.docker.io (porta 443 TCP)"
    echo "    - production.cloudflare.docker.com (porta 443 TCP)"
    echo ""
    echo -e " Dica: Execute ${CYAN}./check-firewall.sh${NC} para auditar o status das regras e certificados."
    echo -e "${RED}==================================================================${NC}"
    exit 1
fi

# ------------------------------------------------------------------------------
# 5. Aguardar PostgreSQL estar pronto antes de rodar migrações
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[4/5] Aguardando o banco de dados PostgreSQL estar operacional...${NC}"
MAX_ATTEMPTS=30
ATTEMPT=0
until $DOCKER_COMPOSE exec -T postgres pg_isready &>/dev/null; do
    ATTEMPT=$((ATTEMPT + 1))
    if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
        echo -e "${RED}[X] Tempo limite esgotado esperando o PostgreSQL responder na porta 5432.${NC}"
        echo " Logs recentes do container PostgreSQL:"
        $DOCKER_COMPOSE logs --tail 20 postgres
        exit 1
    fi
    sleep 1
done
echo -e "${GREEN}[✓] PostgreSQL pronto para conexões.${NC}"

# ------------------------------------------------------------------------------
# 6. Executar migrações estruturais do banco de dados (Alembic) e sincronizar perfis
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[5/5] Aplicando novas migrações e sincronizando perfis no banco...${NC}"

if ! $DOCKER_COMPOSE exec -T backend alembic upgrade head; then
    echo -e "${RED}[X] Erro ao aplicar migrações Alembic no banco de dados.${NC}"
    exit 1
fi

$DOCKER_COMPOSE exec -T backend python -m app.seeds.seed_turnkey --sync-roles 2>/dev/null || \
$DOCKER_COMPOSE exec -T backend python -m app.seeds.sync_roles 2>/dev/null || true

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
