#!/usr/bin/env bash
# ==============================================================================
#  SISTEMA DE INVENTÁRIO - INSTALADOR TURNKEY (LINUX)
#  Prepara e inicializa todo o ecossistema Docker do zero ou atualiza
#  servidores já em execução mantendo 100% dos dados intactos.
# ==============================================================================

set -e

# Cores para o terminal
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # Sem Cor

echo ""
echo -e "${CYAN}==================================================================${NC}"
echo -e "${BOLD}${CYAN}   SISTEMA DE INVENTÁRIO CORPORATIVO - INSTALADOR / ATUALIZADOR${NC}"
echo -e "${CYAN}==================================================================${NC}"
echo -e " Este assistente configura o servidor e inicializa todos os"
echo -e " serviços em containers Docker de forma automatizada e segura."
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
# 1. Checagem de Pré-requisitos
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[1/6] Verificando pré-requisitos do sistema...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}[X] Docker não foi encontrado neste servidor!${NC}"
    echo "    Para instalar o Docker no Linux, execute:"
    echo "    curl -fsSL https://get.docker.com | sh"
    echo "    sudo usermod -aG docker \$USER"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}[X] O serviço do Docker não está rodando ou seu usuário não tem permissão.${NC}"
    echo "    Tente rodar com: sudo ./setup.sh"
    exit 1
fi

# Suporte tanto para 'docker compose' (v2) quanto 'docker-compose' (v1)
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    echo -e "${RED}[X] Plugin 'docker compose' não encontrado!${NC}"
    echo "    Instale via: sudo apt-get install docker-compose-plugin (ou equivalente)."
    exit 1
fi

echo -e "${GREEN}[✓] Docker e Docker Compose operacionais.${NC}"
echo ""

# ------------------------------------------------------------------------------
# Funções Utilitárias Compartilhadas
# ------------------------------------------------------------------------------

# Carrega variáveis do .env de maneira segura e tolerante a espaços/aspas
load_env_config() {
    if [ -f ".env" ]; then
        ENV_SERVER_HOST=$(grep -E '^\s*SERVER_HOST\s*=' .env | head -n 1 | cut -d '=' -f2- | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["'"'"']//' -e 's/["'"'"']$//')
        ENV_PORT_HTTPS=$(grep -E '^\s*PORT_HTTPS\s*=' .env | head -n 1 | cut -d '=' -f2- | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["'"'"']//' -e 's/["'"'"']$//')
        ENV_PORT_HTTP=$(grep -E '^\s*PORT_HTTP\s*=' .env | head -n 1 | cut -d '=' -f2- | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["'"'"']//' -e 's/["'"'"']$//')
        ENV_PORT_MESHCENTRAL=$(grep -E '^\s*PORT_MESHCENTRAL\s*=' .env | head -n 1 | cut -d '=' -f2- | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["'"'"']//' -e 's/["'"'"']$//')
        ENV_POSTGRES_DB=$(grep -E '^\s*POSTGRES_DB\s*=' .env | head -n 1 | cut -d '=' -f2- | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["'"'"']//' -e 's/["'"'"']$//')
        ENV_POSTGRES_USER=$(grep -E '^\s*POSTGRES_USER\s*=' .env | head -n 1 | cut -d '=' -f2- | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["'"'"']//' -e 's/["'"'"']$//')
        ENV_POSTGRES_PASSWORD=$(grep -E '^\s*POSTGRES_PASSWORD\s*=' .env | head -n 1 | cut -d '=' -f2- | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["'"'"']//' -e 's/["'"'"']$//')
        ENV_JWT_SECRET=$(grep -E '^\s*JWT_SECRET_KEY\s*=' .env | head -n 1 | cut -d '=' -f2- | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["'"'"']//' -e 's/["'"'"']$//')

        [ -n "$ENV_SERVER_HOST" ] && SERVER_HOST="$ENV_SERVER_HOST"
        [ -n "$ENV_PORT_HTTPS" ] && PORT_HTTPS="$ENV_PORT_HTTPS"
        [ -n "$ENV_PORT_HTTP" ] && PORT_HTTP="$ENV_PORT_HTTP"
        [ -n "$ENV_PORT_MESHCENTRAL" ] && PORT_MESHCENTRAL="$ENV_PORT_MESHCENTRAL"
        [ -n "$ENV_POSTGRES_DB" ] && POSTGRES_DB="$ENV_POSTGRES_DB"
        [ -n "$ENV_POSTGRES_USER" ] && POSTGRES_USER="$ENV_POSTGRES_USER"
        [ -n "$ENV_POSTGRES_PASSWORD" ] && POSTGRES_PASSWORD="$ENV_POSTGRES_PASSWORD"
        [ -n "$ENV_JWT_SECRET" ] && JWT_SECRET="$ENV_JWT_SECRET"
    fi

    SERVER_HOST=${SERVER_HOST:-"localhost"}
    PORT_HTTPS=${PORT_HTTPS:-443}
    PORT_HTTP=${PORT_HTTP:-80}
    PORT_MESHCENTRAL=${PORT_MESHCENTRAL:-4443}
    POSTGRES_DB=${POSTGRES_DB:-"giassi_inventory"}
    POSTGRES_USER=${POSTGRES_USER:-"giassi_app"}
}

# Retorna a URL completa do painel web respeitando portas alternativas
get_panel_url() {
    local host="${SERVER_HOST:-localhost}"
    local port="${PORT_HTTPS:-443}"
    if [ "$port" = "443" ]; then
        echo "https://${host}"
    else
        echo "https://${host}:${port}"
    fi
}

# Função reutilizável para compilação garantida do frontend (Node 20+ local ou container)
compile_frontend() {
    echo -e "${YELLOW}[*] Compilando painel frontend...${NC}"

    local CA_VOLUME=""
    if [ -f "/etc/ssl/certs/ca-certificates.crt" ]; then
        CA_VOLUME="-v /etc/ssl/certs/ca-certificates.crt:/etc/ssl/certs/ca-certificates.crt:ro -e NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt"
    fi

    local NODE_BIN=""
    local NPM_BIN=""

    # 1. Checa se o comando node padrão é >= 20
    if command -v node &> /dev/null; then
        local VER
        VER=$(node -v 2>/dev/null | tr -d 'v' | cut -d. -f1 || echo "0")
        if [ "$VER" -ge 20 ] 2>/dev/null; then
            NODE_BIN=$(command -v node)
            NPM_BIN=$(command -v npm 2>/dev/null || echo "npm")
        fi
    fi

    # 2. Se executando com sudo e o node do root for < 20, verifica se o usuário chamador possui Node 20+ (ex: via NVM)
    if [ -z "$NODE_BIN" ] && [ -n "$SUDO_USER" ] && [ "$SUDO_USER" != "root" ]; then
        local USER_HOME
        USER_HOME=$(getent passwd "$SUDO_USER" 2>/dev/null | cut -d: -f6)
        if [ -d "$USER_HOME/.nvm/versions/node" ]; then
            local CANDIDATE
            CANDIDATE=$(find "$USER_HOME/.nvm/versions/node" -maxdepth 2 -name "node" 2>/dev/null | sort -V | tail -n 1)
            if [ -n "$CANDIDATE" ] && [ -x "$CANDIDATE" ]; then
                local C_VER
                C_VER=$("$CANDIDATE" -v 2>/dev/null | tr -d 'v' | cut -d. -f1 || echo "0")
                if [ "$C_VER" -ge 20 ] 2>/dev/null; then
                    NODE_BIN="$CANDIDATE"
                    NPM_BIN="$(dirname "$CANDIDATE")/npm"
                    echo " [*] Detectado Node.js local v$("$NODE_BIN" -v) no perfil do usuário $SUDO_USER."
                fi
            fi
        fi
    fi

    local COMPILED=false

    # O Vite exige Node.js 20+.
    if [ -n "$NODE_BIN" ] && [ -x "$NODE_BIN" ] && [ -f "frontend/package.json" ]; then
        echo " [*] Usando Node.js local do servidor (v$("$NODE_BIN" -v))..."
        local ORIG_PATH="$PATH"
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

        local BUILD_SCRIPT='
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
        echo "    O firewall corporativo está interceptando o download de pacotes NPM."
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
}

# Sincroniza configurações dinâmicas de host e portas no MeshCentral e agentes
sync_meshcentral_host() {
    echo " [*] Sincronizando endereço do servidor nos módulos de Acesso Remoto (${SERVER_HOST:-localhost}:${PORT_MESHCENTRAL:-4443})..."
    if [ ! -f "meshcentral/config.json" ] && [ -f "meshcentral/config.json.example" ]; then
        echo " [*] Inicializando meshcentral/config.json a partir do modelo de exemplo..."
        cp "meshcentral/config.json.example" "meshcentral/config.json"
    fi

    if command -v python3 &>/dev/null; then
        python3 meshcentral/configure_host.py "${SERVER_HOST:-localhost}" "${PORT_MESHCENTRAL:-4443}" 2>/dev/null || true
    elif command -v node &>/dev/null; then
        node meshcentral/configure_host.js "${SERVER_HOST:-localhost}" "${PORT_MESHCENTRAL:-4443}" 2>/dev/null || true
    fi
}

# Aguarda PostgreSQL estar saudável para conexões
wait_for_postgres() {
    echo " [*] Aguardando o banco de dados PostgreSQL estar operacional..."
    local MAX_ATTEMPTS=30
    local ATTEMPT=0
    until $DOCKER_COMPOSE exec -T postgres pg_isready -U "${POSTGRES_USER:-giassi_app}" -d "${POSTGRES_DB:-giassi_inventory}" &>/dev/null || \
          $DOCKER_COMPOSE exec -T postgres pg_isready &>/dev/null; do
        ATTEMPT=$((ATTEMPT + 1))
        if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
            echo -e "${RED}[X] Tempo limite esgotado esperando o PostgreSQL responder na porta 5432.${NC}"
            $DOCKER_COMPOSE logs --tail 20 postgres
            exit 1
        fi
        sleep 1
    done
    echo -e "${GREEN}[✓] PostgreSQL operacional.${NC}"
}

# Aplica migrações Alembic, sincroniza perfis e recarrega Nginx
apply_database_migrations_and_roles() {
    echo " [*] Aplicando migrações estruturais do banco de dados (Alembic)..."
    if ! $DOCKER_COMPOSE exec -T backend alembic upgrade head; then
        echo -e "${RED}[X] Erro ao aplicar migrações Alembic no banco de dados.${NC}"
        exit 1
    fi

    echo " [*] Sincronizando perfis do sistema (Operador Matriz) e permissões..."
    $DOCKER_COMPOSE exec -T backend python -m app.seeds.seed_turnkey --sync-roles 2>/dev/null || \
    $DOCKER_COMPOSE exec -T backend python -m app.seeds.sync_roles 2>/dev/null || true

    echo " [*] Sincronizando grupos e permissões restritas no MeshCentral..."
    $DOCKER_COMPOSE exec -T meshcentral node /opt/meshcentral/ensure_permissions.js 2>/dev/null || true
    $DOCKER_COMPOSE restart meshcentral 2>/dev/null || true

    echo " [*] Aguardando inicialização do serviço MeshCentral (porta 4430)..."
    local MAX_ATTEMPTS=20
    local ATTEMPT=0
    until $DOCKER_COMPOSE exec -T meshcentral netstat -tuln 2>/dev/null | grep -q ":4430" || [ $ATTEMPT -ge $MAX_ATTEMPTS ]; do
        ATTEMPT=$((ATTEMPT + 1))
        sleep 1
    done

    echo " [*] Recarregando proxy Nginx..."
    $DOCKER_COMPOSE exec -T nginx nginx -s reload 2>/dev/null || true
}

# Exibe o sumário final completo de conclusão
show_completion_summary() {
    local title="$1"
    local URL_PAINEL
    URL_PAINEL=$(get_panel_url)

    echo ""
    echo -e "${CYAN}==================================================================${NC}"
    echo -e "${BOLD}${GREEN}   ${title} 🚀${NC}"
    echo -e "${CYAN}==================================================================${NC}"
    echo -e " ${BOLD}Painel de Acesso:${NC}     ${GREEN}${URL_PAINEL}${NC}"
    if [ -n "$ADMIN_USER" ]; then
        echo -e " ${BOLD}Usuário Admin:${NC}        ${YELLOW}${ADMIN_USER}${NC}"
    fi
    if [ -n "$COMPANY_NAME" ]; then
        echo -e " ${BOLD}Empresa:${NC}              ${CYAN}${COMPANY_NAME}${NC}"
    fi
    echo -e " ${BOLD}Porta HTTPS:${NC}          ${CYAN}${PORT_HTTPS:-443}${NC}"
    echo -e " ${BOLD}Porta HTTP:${NC}           ${CYAN}${PORT_HTTP:-80}${NC}"
    echo -e " ${BOLD}Porta MeshCentral:${NC}    ${CYAN}${PORT_MESHCENTRAL:-4443}${NC}"
    echo -e " ${BOLD}Banco de Dados:${NC}       ${GREEN}100% preservado com novas tabelas e perfis.${NC}"
    if [ -d ".git" ]; then
        local LAST_COMMIT
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
    echo -e " ${YELLOW}[i] Dica de Certificado SSL:${NC}"
    echo -e "     Caso deseje usar o certificado oficial da sua empresa, basta"
    echo -e "     substituir os arquivos em: ${BOLD}./nginx/certs/giassi.crt${NC} e ${BOLD}.key${NC}"
    echo -e "     e rodar: ${BOLD}$DOCKER_COMPOSE exec -T nginx nginx -s reload${NC}"
    echo -e "${CYAN}==================================================================${NC}"
    echo ""
}

# ------------------------------------------------------------------------------
# 2. Detecção de Instalação Existente (Modo Upgrade Seguro vs Nova Instalação)
# ------------------------------------------------------------------------------
if [ -f ".env" ]; then
    echo -e "${CYAN}------------------------------------------------------------------${NC}"
    echo -e "${YELLOW}[!] Foi detectado um arquivo de configuração '.env' pré-existente!${NC}"
    echo -e "    1) ${BOLD}Modo Atualização Segura (Recomendado)${NC}"
    echo -e "       - Mantém todas as credenciais, usuários e máquinas intactos."
    echo -e "       - Atualiza o banco com as novas funcionalidades e migrações."
    echo -e "       - Recompila o frontend e reinicia os containers com segurança."
    echo -e "    2) ${BOLD}Reconfigurar Parâmetros / Nova Instalação${NC}"
    echo -e "       - Permite alterar credenciais, portas e configurações."
    echo -e "${CYAN}------------------------------------------------------------------${NC}"
    read -p " Escolha uma opção [1/2, padrão=1]: " SETUP_CHOICE
    SETUP_CHOICE=${SETUP_CHOICE:-"1"}

    if [ "$SETUP_CHOICE" = "1" ]; then
        echo ""
        echo -e "${GREEN}[✓] Iniciando Atualização Segura (sem perda de dados)...${NC}"

        load_env_config
        sync_meshcentral_host
        compile_frontend

        echo -e "${YELLOW}[*] Atualizando e iniciando containers Docker...${NC}"
        if ! $DOCKER_COMPOSE up -d --build; then
            echo ""
            echo -e "${RED}==================================================================${NC}"
            echo -e "${BOLD}${RED}[X] FALHA NA RECONSTRUÇÃO DOS CONTAINERS DOCKER${NC}"
            echo -e "${RED}==================================================================${NC}"
            echo " Diagnóstico do erro:"
            echo ""
            echo -e " 1) ${BOLD}Erro de Certificado SSL / Firewall DPI (x509: certificate signed by unknown authority):${NC}"
            echo "    O Docker não conseguiu validar o certificado SSL ao consultar o Docker Hub."
            echo "    Causa: O firewall corporativo (DPI / Inspeção SSL) está interceptando HTTPS."
            echo ""
            echo -e "    ${BOLD}Como resolver:${NC}"
            echo "    - Certifique-se de que a CA do firewall está em: /usr/local/share/ca-certificates/<nome>.crt"
            echo "    - Execute:"
            echo "      sudo ./check-firewall.sh --fix-ca"
            echo "    - Em seguida, execute o ./setup.sh novamente."
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

        wait_for_postgres
        apply_database_migrations_and_roles
        show_completion_summary "SISTEMA ATUALIZADO COM SUCESSO!"
        exit 0
    fi
fi

# ------------------------------------------------------------------------------
# 3. Perguntas Interativas de Configuração (Modo Nova Instalação ou Reconfiguração)
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[2/6] Coleta de parâmetros da instalação:${NC}"
echo "------------------------------------------------------------------"

# Pré-carrega valores existentes do .env (se houver) como defaults
load_env_config

# Detecta IP primário da máquina
HOST_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$HOST_IP" ]; then
    HOST_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7}')
fi
if [ -z "$HOST_IP" ]; then
    HOST_IP="127.0.0.1"
fi

DEFAULT_HOST="${ENV_SERVER_HOST:-$HOST_IP}"

# Nome da Empresa
read -p " Nome da empresa [Giassi Supermercados]: " INPUT_COMPANY_NAME
COMPANY_NAME=${INPUT_COMPANY_NAME:-"Giassi Supermercados"}

# Slug da Empresa
DEFAULT_SLUG=$(echo "$COMPANY_NAME" | tr '[:upper:]' '[:lower:]' | tr -cd '[:alnum:]')
[ -z "$DEFAULT_SLUG" ] && DEFAULT_SLUG="giassi"
read -p " Identificador curto / slug da empresa [$DEFAULT_SLUG]: " INPUT_COMPANY_SLUG
COMPANY_SLUG=${INPUT_COMPANY_SLUG:-"$DEFAULT_SLUG"}

# IP ou DNS do Servidor
read -p " IP ou DNS de acesso ao servidor [$DEFAULT_HOST]: " INPUT_SERVER_HOST
SERVER_HOST=${INPUT_SERVER_HOST:-"$DEFAULT_HOST"}

# Portas Web
DEFAULT_PORT_HTTPS="${ENV_PORT_HTTPS:-443}"
read -p " Porta HTTPS [$DEFAULT_PORT_HTTPS]: " INPUT_PORT_HTTPS
PORT_HTTPS=${INPUT_PORT_HTTPS:-"$DEFAULT_PORT_HTTPS"}

DEFAULT_PORT_HTTP="${ENV_PORT_HTTP:-80}"
read -p " Porta HTTP [$DEFAULT_PORT_HTTP]: " INPUT_PORT_HTTP
PORT_HTTP=${INPUT_PORT_HTTP:-"$DEFAULT_PORT_HTTP"}

DEFAULT_PORT_MESHCENTRAL="${ENV_PORT_MESHCENTRAL:-4443}"
read -p " Porta MeshCentral [$DEFAULT_PORT_MESHCENTRAL]: " INPUT_PORT_MESHCENTRAL
PORT_MESHCENTRAL=${INPUT_PORT_MESHCENTRAL:-"$DEFAULT_PORT_MESHCENTRAL"}

# Banco de Dados
DEFAULT_DB="${ENV_POSTGRES_DB:-${COMPANY_SLUG}_inventory}"
read -p " Nome do banco de dados [$DEFAULT_DB]: " INPUT_POSTGRES_DB
POSTGRES_DB=${INPUT_POSTGRES_DB:-"$DEFAULT_DB"}

DEFAULT_USER="${ENV_POSTGRES_USER:-${COMPANY_SLUG}_app}"
read -p " Usuário do banco de dados [$DEFAULT_USER]: " INPUT_POSTGRES_USER
POSTGRES_USER=${INPUT_POSTGRES_USER:-"$DEFAULT_USER"}

# Senha do Banco (preserva senha existente se houver)
SUGGESTED_DB_PASS="${ENV_POSTGRES_PASSWORD:-$(openssl rand -hex 8 2>/dev/null || date +%s | sha256sum | head -c 16)}"
read -p " Senha do banco de dados [$SUGGESTED_DB_PASS]: " INPUT_POSTGRES_PASS
POSTGRES_PASSWORD=${INPUT_POSTGRES_PASS:-"$SUGGESTED_DB_PASS"}

# Usuário Admin
read -p " Usuário administrador do sistema [admin]: " INPUT_ADMIN_USER
ADMIN_USER=${INPUT_ADMIN_USER:-"admin"}

read -p " Nome completo do administrador [Administrador do Sistema]: " INPUT_ADMIN_FULLNAME
ADMIN_FULLNAME=${INPUT_ADMIN_FULLNAME:-"Administrador do Sistema"}

read -p " E-mail do administrador [admin@${COMPANY_SLUG}.com.br]: " INPUT_ADMIN_EMAIL
ADMIN_EMAIL=${INPUT_ADMIN_EMAIL:-"admin@${COMPANY_SLUG}.com.br"}

# Senha do Admin (com máscara)
while true; do
    echo -n " Digite a senha do usuário admin inicial: "
    read -s ADMIN_PASSWORD
    echo ""
    if [ ${#ADMIN_PASSWORD} -lt 6 ]; then
        echo -e "${RED} [!] A senha deve conter pelo menos 6 caracteres.${NC}"
        continue
    fi
    echo -n " Confirme a senha do admin: "
    read -s ADMIN_PASSWORD_CONFIRM
    echo ""
    if [ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ]; then
        echo -e "${RED} [!] As senhas não coincidem. Tente novamente.${NC}"
    else
        break
    fi
done

# Filiais padrão
read -p " Criar lista padrão de filiais (Lojas 01 a 30, Combos, Matriz)? [S/n]: " INPUT_DEFAULT_SITES
INPUT_DEFAULT_SITES=${INPUT_DEFAULT_SITES:-"S"}
if [[ "$INPUT_DEFAULT_SITES" =~ ^[Nn] ]]; then
    CREATE_SITES_FLAG="--no-default-sites"
else
    CREATE_SITES_FLAG=""
fi

echo ""
# ------------------------------------------------------------------------------
# 4. Geração do Arquivo .env e Configurações de Segurança
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[3/6] Gerando variáveis de ambiente (.env) e chaves JWT...${NC}"

# Chave secreta de 256 bits criptográfica (preserva existente se houver)
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || date +%s%N | sha256sum | head -c 64)
fi

cat <<EOF > .env
POSTGRES_DB=${POSTGRES_DB}
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_PORT=5432
JWT_SECRET_KEY=${JWT_SECRET}
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440
SERVER_HOST=${SERVER_HOST}
PORT_HTTP=${PORT_HTTP}
PORT_HTTPS=${PORT_HTTPS}
PORT_MESHCENTRAL=${PORT_MESHCENTRAL}
EOF

echo -e "${GREEN}[✓] Arquivo .env gerado com sucesso.${NC}"

sync_meshcentral_host

# ------------------------------------------------------------------------------
# 5. Compilação do Frontend
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[4/6] Compilando painel frontend...${NC}"
compile_frontend

# ------------------------------------------------------------------------------
# 6. Inicialização dos Containers e Migrações
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[5/6] Construindo e iniciando containers Docker...${NC}"

# Detecta se existe volume antigo de banco de dados
if docker volume ls -q 2>/dev/null | grep -E "postgres_data" &>/dev/null; then
    echo -e "${YELLOW} [!] Foi detectado um volume de banco de dados pré-existente.${NC}"
    echo -e "${RED} [ATENÇÃO] Recriar o banco do zero apagará todas as máquinas e dados coletados!${NC}"
    read -p "     Deseja realmente APAGAR o banco de dados existente? [s/N]: " RESET_DB
    RESET_DB=${RESET_DB:-"N"}
    if [[ "$RESET_DB" =~ ^[Ss] ]]; then
        echo " [*] Resetando banco para instalação limpa..."
        $DOCKER_COMPOSE down -v --remove-orphans 2>/dev/null || true
    else
        echo " [*] Preservando volume de banco de dados existente..."
        $DOCKER_COMPOSE down --remove-orphans 2>/dev/null || true
    fi
else
    $DOCKER_COMPOSE down --remove-orphans 2>/dev/null || true
fi

if ! $DOCKER_COMPOSE up -d --build; then
    echo ""
    echo -e "${RED}==================================================================${NC}"
    echo -e "${BOLD}${RED}[X] FALHA NA CONSTRUÇÃO DOS CONTAINERS DOCKER${NC}"
    echo -e "${RED}==================================================================${NC}"
    echo " Diagnóstico do erro:"
    echo ""
    echo -e " 1) ${BOLD}Erro de Certificado SSL / Firewall DPI (x509: certificate signed by unknown authority):${NC}"
    echo "    O Docker não conseguiu validar o certificado SSL ao consultar o Docker Hub."
    echo "    Causa: O firewall corporativo (DPI / Inspeção SSL) está interceptando HTTPS."
    echo ""
    echo -e "    ${BOLD}Como resolver:${NC}"
    echo "    - Certifique-se de que a CA do firewall está em: /usr/local/share/ca-certificates/<nome>.crt"
    echo "    - Execute:"
    echo "      sudo ./check-firewall.sh --fix-ca"
    echo "    - Em seguida, execute o ./setup.sh novamente."
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

wait_for_postgres

echo " [*] Executando migrações estruturais do banco (Alembic)..."
$DOCKER_COMPOSE exec -T backend alembic upgrade head

echo " [*] Criando empresa, perfis e usuário administrador inicial..."
$DOCKER_COMPOSE exec -T backend python -m app.seeds.seed_turnkey \
    --company-name "$COMPANY_NAME" \
    --company-slug "$COMPANY_SLUG" \
    --admin-username "$ADMIN_USER" \
    --admin-fullname "$ADMIN_FULLNAME" \
    --admin-email "$ADMIN_EMAIL" \
    --admin-password "$ADMIN_PASSWORD" \
    $CREATE_SITES_FLAG

echo " [*] Sincronizando perfis do sistema (Operador Matriz) e permissões..."
$DOCKER_COMPOSE exec -T backend python -m app.seeds.seed_turnkey --sync-roles 2>/dev/null || \
$DOCKER_COMPOSE exec -T backend python -m app.seeds.sync_roles 2>/dev/null || true
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
$DOCKER_COMPOSE exec -T nginx nginx -s reload 2>/dev/null || true

# ------------------------------------------------------------------------------
# 7. Conclusão e Resumo da Instalação
# ------------------------------------------------------------------------------
show_completion_summary "INSTALAÇÃO CONCLUÍDA COM SUCESSO!"
exit 0
