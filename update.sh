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

SKIP_GIT_PULL=false

for arg in "$@"; do
    case "$arg" in
        --no-pull|--skip-pull)
            SKIP_GIT_PULL=true
            ;;
        --help|-h)
            echo ""
            echo -e "${BOLD}Uso:${NC} $0 [opções]"
            echo ""
            echo -e "  ${CYAN}--no-pull, --skip-pull${NC}  Recompila frontend, aplica migrações e atualiza containers sem executar 'git pull'"
            echo -e "  ${CYAN}--help, -h${NC}              Exibe esta ajuda"
            echo ""
            exit 0
            ;;
    esac
done

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
# 1. Checagem do Docker e Docker Compose
# ------------------------------------------------------------------------------
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[X] Docker não foi encontrado neste servidor!${NC}"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}[X] O serviço do Docker não está rodando ou seu usuário não tem permissão.${NC}"
    echo "    Tente rodar com: sudo ./update.sh"
    exit 1
fi

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
# Evita erro de 'dubious ownership' ao rodar com sudo
git config --global --add safe.directory "$PWD" 2>/dev/null || true

if [ "$SKIP_GIT_PULL" = true ]; then
    echo -e "${YELLOW}[1/5] Opção --no-pull ativada. Pulando 'git pull'.${NC}"
elif [ -d ".git" ]; then
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
        echo " 3) Alterações locais não commitadas: Execute 'git status' para verificar."
        echo "    Para rodar a atualização sem git pull, use: ./update.sh --no-pull"
        echo -e "${RED}==================================================================${NC}"
        exit 1
    fi
    echo -e "${GREEN}[✓] Código-fonte atualizado para a versão mais recente.${NC}"
else
    echo -e "${YELLOW}[1/5] Diretório não é um clone git. Pulando 'git pull'.${NC}"
fi

# ------------------------------------------------------------------------------
# 3. Carregamento do .env e Sincronização de Host/Portas
# ------------------------------------------------------------------------------
load_env_config() {
    if [ -f ".env" ]; then
        ENV_SERVER_HOST=$(grep -E '^\s*SERVER_HOST\s*=' .env | head -n 1 | cut -d '=' -f2- | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["'"'"']//' -e 's/["'"'"']$//')
        ENV_PORT_HTTPS=$(grep -E '^\s*PORT_HTTPS\s*=' .env | head -n 1 | cut -d '=' -f2- | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["'"'"']//' -e 's/["'"'"']$//')
        ENV_PORT_HTTP=$(grep -E '^\s*PORT_HTTP\s*=' .env | head -n 1 | cut -d '=' -f2- | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["'"'"']//' -e 's/["'"'"']$//')
        ENV_PORT_MESHCENTRAL=$(grep -E '^\s*PORT_MESHCENTRAL\s*=' .env | head -n 1 | cut -d '=' -f2- | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["'"'"']//' -e 's/["'"'"']$//')
        ENV_POSTGRES_DB=$(grep -E '^\s*POSTGRES_DB\s*=' .env | head -n 1 | cut -d '=' -f2- | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["'"'"']//' -e 's/["'"'"']$//')
        ENV_POSTGRES_USER=$(grep -E '^\s*POSTGRES_USER\s*=' .env | head -n 1 | cut -d '=' -f2- | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["'"'"']//' -e 's/["'"'"']$//')

        [ -n "$ENV_SERVER_HOST" ] && SERVER_HOST="$ENV_SERVER_HOST"
        [ -n "$ENV_PORT_HTTPS" ] && PORT_HTTPS="$ENV_PORT_HTTPS"
        [ -n "$ENV_PORT_HTTP" ] && PORT_HTTP="$ENV_PORT_HTTP"
        [ -n "$ENV_PORT_MESHCENTRAL" ] && PORT_MESHCENTRAL="$ENV_PORT_MESHCENTRAL"
        [ -n "$ENV_POSTGRES_DB" ] && POSTGRES_DB="$ENV_POSTGRES_DB"
        [ -n "$ENV_POSTGRES_USER" ] && POSTGRES_USER="$ENV_POSTGRES_USER"
    fi

    if [ -z "$SERVER_HOST" ]; then
        DETECTED_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
        if [ -z "$DETECTED_IP" ]; then
            DETECTED_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7}')
        fi
        SERVER_HOST=${DETECTED_IP:-"localhost"}
    fi

    PORT_HTTPS=${PORT_HTTPS:-443}
    PORT_HTTP=${PORT_HTTP:-80}
    PORT_MESHCENTRAL=${PORT_MESHCENTRAL:-4443}
    POSTGRES_DB=${POSTGRES_DB:-"giassi_inventory"}
    POSTGRES_USER=${POSTGRES_USER:-"giassi_app"}
}

load_env_config

echo " [*] Sincronizando endereço do servidor nos módulos de Acesso Remoto (${SERVER_HOST}:${PORT_MESHCENTRAL})..."
if [ ! -f "meshcentral/config.json" ] && [ -f "meshcentral/config.json.example" ]; then
    echo " [*] Inicializando meshcentral/config.json a partir do modelo de exemplo..."
    cp "meshcentral/config.json.example" "meshcentral/config.json"
fi

if command -v python3 &>/dev/null; then
    python3 meshcentral/configure_host.py "$SERVER_HOST" "$PORT_MESHCENTRAL" 2>/dev/null || true
elif command -v node &>/dev/null; then
    node meshcentral/configure_host.js "$SERVER_HOST" "$PORT_MESHCENTRAL" 2>/dev/null || true
fi

# --------------------------------------------------------------
# 4. Recompilar o Frontend (React / Vite)
# --------------------------------------------------------------
echo -e "${YELLOW}[2/5] Compilando painel frontend...${NC}"

CA_VOLUME=""
if [ -f "/etc/ssl/certs/ca-certificates.crt" ]; then
    CA_VOLUME="-v /etc/ssl/certs/ca-certificates.crt:/etc/ssl/certs/ca-certificates.crt:ro -e NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt"
fi

NODE_BIN=""
NPM_BIN=""

# 1. Checa se o comando node padrão é >= 20
if command -v node &> /dev/null; then
    VER=$(node -v 2>/dev/null | tr -d 'v' | cut -d. -f1 || echo "0")
    if [ "$VER" -ge 20 ] 2>/dev/null; then
        NODE_BIN=$(command -v node)
        NPM_BIN=$(command -v npm 2>/dev/null || echo "npm")
    fi
fi

# 2. Se executando com sudo e o node do root for < 20, verifica se o usuário chamador possui Node 20+ (ex: via NVM)
if [ -z "$NODE_BIN" ] && [ -n "$SUDO_USER" ] && [ "$SUDO_USER" != "root" ]; then
    USER_HOME=$(getent passwd "$SUDO_USER" 2>/dev/null | cut -d: -f6)
    if [ -d "$USER_HOME/.nvm/versions/node" ]; then
        CANDIDATE=$(find "$USER_HOME/.nvm/versions/node" -maxdepth 2 -name "node" 2>/dev/null | sort -V | tail -n 1)
        if [ -n "$CANDIDATE" ] && [ -x "$CANDIDATE" ]; then
            C_VER=$("$CANDIDATE" -v 2>/dev/null | tr -d 'v' | cut -d. -f1 || echo "0")
            if [ "$C_VER" -ge 20 ] 2>/dev/null; then
                NODE_BIN="$CANDIDATE"
                NPM_BIN="$(dirname "$CANDIDATE")/npm"
                echo " [*] Detectado Node.js local v$("$NODE_BIN" -v) no perfil do usuário $SUDO_USER."
            fi
        fi
    fi
fi

COMPILED=false

# O Vite exige Node.js 20+.
if [ -n "$NODE_BIN" ] && [ -x "$NODE_BIN" ] && [ -f "frontend/package.json" ]; then
    echo " [*] Usando Node.js local do servidor (v$("$NODE_BIN" -v))..."
    ORIG_PATH="$PATH"
    export PATH="$(dirname "$NODE_BIN"):$PATH"
    echo " -> [1/2] Instalando dependências NPM (pode levar ~1 min na 1ª vez)..."
    rm -rf frontend/node_modules/.*-* 2>/dev/null || true
    if ! (cd frontend && "$NPM_BIN" install --no-audit --no-fund); then
        echo -e "${YELLOW} [!] Falha no npm install local. Limpando node_modules e tentando novamente...${NC}"
        rm -rf frontend/node_modules
        (cd frontend && "$NPM_BIN" install --no-audit --no-fund) || true
    fi
    echo " -> [2/2] Gerando build de produção (tsc & vite build)..."
    if (cd frontend && "$NPM_BIN" run build); then
        COMPILED=true
    else
        echo -e "${YELLOW} [!] Compilação local falhou. Tentando via container Node.js 20...${NC}"
    fi
    export PATH="$ORIG_PATH"
elif command -v node &> /dev/null; then
    echo " [i] Node.js local do sistema (v$(node -v 2>/dev/null)) é anterior ao v20 (Vite requer Node 20+)."
    echo "     Usando container isolado 'node:20-bookworm-slim' (Debian/glibc) para compilação garantida..."
fi

# Se não compilou localmente, compila via container node:20-bookworm-slim com a CA do firewall montada
if [ "$COMPILED" = false ]; then
    echo " [*] Compilando via container Node.js 20 (node:20-bookworm-slim)..."
    rm -rf frontend/node_modules/.*-* 2>/dev/null || true

    BUILD_SCRIPT='
        set -e
        echo " -> [1/2] Instalando dependências NPM (pode levar ~1 min na 1ª vez)..."
        rm -rf /app/node_modules/.*-* 2>/dev/null || true
        if ! npm install --no-audit --no-fund; then
            echo " [!] Conflito ou resíduo em node_modules detectado. Limpando diretório e reinstalando do zero..."
            rm -rf /app/node_modules
            npm install --no-audit --no-fund
        fi
        echo " -> [2/2] Gerando build de produção (tsc & vite build)..."
        if ! npm run build; then
            echo " [!] Falha no build inicial. Tentando compilar após reset limpo de node_modules..."
            rm -rf /app/node_modules /app/dist
            npm install --no-audit --no-fund
            npm run build
        fi
    '

    if docker run --rm -v "$(pwd)/frontend:/app" $CA_VOLUME -w /app node:20-bookworm-slim sh -c "$BUILD_SCRIPT"; then
        COMPILED=true
    fi
fi

# Ajusta permissões dos arquivos gerados caso tenha rodado via sudo ou container root
if [ -n "$SUDO_USER" ]; then
    chown -R "$SUDO_USER":"$SUDO_USER" frontend/dist frontend/node_modules 2>/dev/null || true
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
    echo "    O Vite exige Node.js 20+. O instalador tentou usar o container 'node:20-bookworm-slim'."
    echo "    Verifique se o Docker consegue baixar imagens do Docker Hub."
    echo -e "${RED}==================================================================${NC}"
    exit 1
fi

echo -e "${GREEN}[✓] Frontend compilado com sucesso em ./frontend/dist!${NC}"

# ------------------------------------------------------------------------------
# 5. Reconstrução e reinicialização dos containers (sem tocar em volumes)
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
# 6. Aguardar PostgreSQL estar pronto antes de rodar migrações
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[4/5] Aguardando o banco de dados PostgreSQL estar operacional...${NC}"
MAX_ATTEMPTS=30
ATTEMPT=0
until $DOCKER_COMPOSE exec -T postgres pg_isready -U "${POSTGRES_USER:-giassi_app}" -d "${POSTGRES_DB:-giassi_inventory}" &>/dev/null || \
      $DOCKER_COMPOSE exec -T postgres pg_isready &>/dev/null; do
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
# 7. Executar migrações estruturais do banco (Alembic) e sincronizar perfis
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[5/5] Aplicando novas migrações e sincronizando perfis no banco...${NC}"

if ! $DOCKER_COMPOSE exec -T backend alembic upgrade head; then
    echo -e "${RED}[X] Erro ao aplicar migrações Alembic no banco de dados.${NC}"
    exit 1
fi

echo " [*] Sincronizando perfis do sistema (Operador Matriz) e permissões..."
$DOCKER_COMPOSE exec -T backend python -m app.seeds.seed_turnkey --sync-roles 2>/dev/null || \
$DOCKER_COMPOSE exec -T backend python -m app.seeds.sync_roles 2>/dev/null || true

# Sincronizar grupos e permissões restritas no MeshCentral (Operadores Matriz - rights: 8)
echo " [*] Sincronizando grupos e permissões restritas no MeshCentral..."
$DOCKER_COMPOSE exec -T meshcentral node /opt/meshcentral/ensure_permissions.js 2>/dev/null || true
$DOCKER_COMPOSE restart meshcentral 2>/dev/null || true

# Aguardar MeshCentral abrir a porta 4430 e sincronizar Nginx (evita 502 Bad Gateway)
echo " [*] Aguardando inicialização do serviço MeshCentral (porta 4430)..."
MAX_ATTEMPTS=20
ATTEMPT=0
until $DOCKER_COMPOSE exec -T meshcentral netstat -tuln 2>/dev/null | grep -q ":4430" || [ $ATTEMPT -ge $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    sleep 1
done

echo " [*] Recarregando proxy Nginx..."
$DOCKER_COMPOSE exec -T nginx nginx -s reload 2>/dev/null || true

echo -e "${GREEN}[✓] Banco de dados e papéis estruturalmente atualizados sem perda de dados.${NC}"

# Limpeza de imagens órfãs antigas
docker image prune -f >/dev/null 2>&1 || true

# ------------------------------------------------------------------------------
# 8. Conclusão e Resumo da Atualização
# ------------------------------------------------------------------------------
if [ "$PORT_HTTPS" = "443" ]; then
    URL_PAINEL="https://${SERVER_HOST}"
else
    URL_PAINEL="https://${SERVER_HOST}:${PORT_HTTPS}"
fi

echo ""
echo -e "${CYAN}==================================================================${NC}"
echo -e "${BOLD}${GREEN}   SISTEMA ATUALIZADO COM SUCESSO! 🚀${NC}"
echo -e "${CYAN}==================================================================${NC}"
echo -e " ${BOLD}Painel de Acesso:${NC}     ${GREEN}${URL_PAINEL}${NC}"
echo -e " ${BOLD}Porta HTTPS:${NC}          ${CYAN}${PORT_HTTPS:-443}${NC}"
echo -e " ${BOLD}Porta HTTP:${NC}           ${CYAN}${PORT_HTTP:-80}${NC}"
echo -e " ${BOLD}Porta MeshCentral:${NC}    ${CYAN}${PORT_MESHCENTRAL:-4443}${NC}"
echo -e " ${BOLD}Banco de Dados:${NC}       ${GREEN}100% preservado com novas tabelas e perfis.${NC}"

if [ -d ".git" ]; then
    LAST_COMMIT=$(git log -1 --pretty=format:"%h - %s (%cr)" 2>/dev/null || echo "")
    if [ -n "$LAST_COMMIT" ]; then
        echo -e " ${BOLD}Versão instalada:${NC}     ${CYAN}${LAST_COMMIT}${NC}"
    fi
fi

echo -e "------------------------------------------------------------------"
echo -e " ${BOLD}Comandos para instalar / atualizar os agentes nas máquinas:${NC}"
echo ""
echo -e " ${BOLD}• Windows (PowerShell como Administrador):${NC}"
echo -e "   ${CYAN}irm ${URL_PAINEL}/api/v1/agent/windows | iex${NC}"
echo ""
echo -e " ${BOLD}• Linux (Terminal / Bash como Root):${NC}"
echo -e "   ${CYAN}curl -sSL ${URL_PAINEL}/api/v1/agent/linux | sudo bash${NC}"
echo -e "------------------------------------------------------------------"
echo -e " ${BOLD}Status dos serviços Docker:${NC}"
$DOCKER_COMPOSE ps
echo -e "${CYAN}==================================================================${NC}"
echo ""
